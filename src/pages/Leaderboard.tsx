import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from '../hooks/useNavigate';
import { Trophy, Zap, BookOpen, Crown, ArrowRight, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Format = 'sprint' | 'readathon' | 'elimination';
type Tab = 'live' | 'archived' | 'champions';

type LeaderboardEntry = {
  rank: number;
  user_id: string;
  display_name: string;
  username?: string | null;
  avatar_url?: string | null;
  // Sprint
  accuracy?: number;
  completion_time_seconds?: number;
  // Read-A-Thon
  pages_read?: number;
  books_completed?: number;
  // Elimination
  round_reached?: number;
  eliminated?: boolean;
  // Shared
  prize_amount?: number;
};

type Competition = {
  id: string;
  title: string;
  format: Format;
  book_title?: string;
  prize_pool: number;
  status: 'active' | 'completed';
  ends_at: string;
  starts_at: string;
};

type MonthlyChampion = {
  id: string;
  user_id: string;
  display_name: string;
  username?: string | null;
  avatar_url?: string | null;
  format: Format;
  competition_title: string;
  prize_won: number;
  month: string;
  book_title?: string;
};

const formatIcon = (format: Format, size = 14) => {
  if (format === 'sprint') return <Zap size={size} className="text-[#D4A843]" />;
  if (format === 'readathon') return <BookOpen size={size} className="text-[#D4A843]" />;
  return <Trophy size={size} className="text-[#D4A843]" />;
};

const formatLabel = (format: Format) => {
  if (format === 'sprint') return 'Sprint';
  if (format === 'readathon') return 'Read-A-Thon';
  return 'Elimination';
};

const rankMedal = (rank: number) => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
};

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// Returns @username if set, otherwise falls back to display_name
const resolveDisplayName = (username?: string | null, display_name?: string) => {
  if (username) return `@${username}`;
  return display_name || 'Anonymous';
};

export const Leaderboard = () => {
  const { isDark, toggleTheme } = useTheme();
  const { navigateTo } = useNavigate();

  const textPrimary = isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]';
  const textMuted = isDark ? 'text-[#F5F0E8]/70' : 'text-[#1B2A4A]/70';
  const cardBg = isDark ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20' : 'bg-white border-[#D4A843]/30';
  const rowBg = isDark ? 'bg-[#1B2A4A]/20' : 'bg-[#F5F0E8]/60';

  const [tab, setTab] = useState<Tab>('live');
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [champions, setChampions] = useState<MonthlyChampion[]>([]);
  const [loadingComps, setLoadingComps] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoadingComps(true);
      setSelectedId(null);
      setEntries([]);

      if (tab === 'champions') {
        const { data } = await supabase
          .from('monthly_champions')
          .select('*')
          .order('month', { ascending: false })
          .limit(50);
        setChampions(data ?? []);
        setLoadingComps(false);
        return;
      }

      const status = tab === 'live' ? 'active' : 'completed';
      const { data } = await supabase
        .from('competitions')
        .select('id, title, format, book_title, prize_pool, status, starts_at, ends_at')
        .eq('status', status)
        .order('starts_at', { ascending: false })
        .limit(20);

      const list = data ?? [];
      setCompetitions(list);
      if (list.length > 0) setSelectedId(list[0].id);
      setLoadingComps(false);
    };
    load();
  }, [tab]);

  useEffect(() => {
    if (!selectedId) return;
    const selected = competitions.find((c) => c.id === selectedId);
    if (!selected) return;
    loadEntries(selectedId, selected.format);
  }, [selectedId]);

  const loadEntries = async (competitionId: string, format: Format) => {
    setLoadingEntries(true);
    const { data } = await supabase
      .from('competition_leaderboard')
      .select('*')
      .eq('competition_id', competitionId)
      .order('rank', { ascending: true })
      .limit(50);
    setEntries(data ?? []);
    setLoadingEntries(false);
  };

  const selectedComp = competitions.find((c) => c.id === selectedId) ?? null;

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      tab === t
        ? 'bg-[#D4A843] text-[#1B2A4A]'
        : isDark
        ? 'text-[#F5F0E8]/60 hover:text-[#F5F0E8]'
        : 'text-[#1B2A4A]/60 hover:text-[#1B2A4A]'
    }`;

  const compTabClass = (id: string) =>
    `w-full text-left px-4 py-3 rounded-xl border transition-colors ${
      selectedId === id
        ? 'border-[#D4A843] bg-[#D4A843]/10'
        : isDark
        ? 'border-[#D4A843]/10 hover:border-[#D4A843]/30'
        : 'border-[#1B2A4A]/10 hover:border-[#1B2A4A]/20'
    }`;

  const prizeForRank = (rank: number, format: Format, pool: number) => {
    if (format === 'sprint') return rank === 1 ? pool : null;
    if (rank === 1) return pool * 0.5;
    if (rank === 2) return pool * 0.3;
    if (rank === 3) return pool * 0.2;
    return null;
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#0f1623]' : 'bg-[#F5F0E8]'}`}>

      {/* Header */}
      <div className={`border-b transition-colors duration-300 ${isDark ? 'border-[#1B2A4A] bg-[#0f1623]' : 'border-[#D4A843]/30 bg-[#F5F0E8]'}`}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <button
            onClick={() => navigateTo('/')}
            className={`font-serif text-lg font-bold transition-colors ${isDark ? 'text-[#D4A843]' : 'text-[#1B2A4A]'}`}
          >
            Read to Earn
          </button>
          <button
            onClick={toggleTheme}
            className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
              isDark
                ? 'border-[#D4A843]/40 text-[#D4A843] hover:bg-[#D4A843]/10'
                : 'border-[#1B2A4A]/30 text-[#1B2A4A] hover:bg-[#1B2A4A]/10'
            }`}
          >
            {isDark ? '☀ Light' : '☾ Dark'}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-16">

        {/* Hero */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <Crown size={36} className="text-[#D4A843]" />
          </div>
          <h1 className={`font-serif text-4xl md:text-5xl mb-4 ${textPrimary}`}>Leaderboard</h1>
          <p className={`text-base max-w-md mx-auto ${textMuted}`}>
            Live standings, archived results, and monthly champions across all competition formats.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <button className={tabClass('live')} onClick={() => setTab('live')}>🟢 Live</button>
          <button className={tabClass('archived')} onClick={() => setTab('archived')}>Archived</button>
          <button className={tabClass('champions')} onClick={() => setTab('champions')}>🏆 Monthly Champions</button>
        </div>

        {/* Monthly Champions View */}
        {tab === 'champions' && (
          loadingComps ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={`rounded-xl border p-5 animate-pulse ${cardBg}`}>
                  <div className={`h-4 w-1/3 rounded mb-2 ${isDark ? 'bg-[#D4A843]/10' : 'bg-[#1B2A4A]/10'}`} />
                  <div className={`h-3 w-1/2 rounded ${isDark ? 'bg-[#D4A843]/10' : 'bg-[#1B2A4A]/10'}`} />
                </div>
              ))}
            </div>
          ) : champions.length === 0 ? (
            <div className={`rounded-xl border p-10 text-center ${cardBg}`}>
              <p className={`text-sm ${textMuted}`}>No champions yet. Check back after the first competition closes.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {champions.map((c) => (
                <div key={c.id} className={`rounded-xl border p-5 flex items-center gap-4 ${cardBg}`}>
                  <div className="text-2xl">🥇</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {formatIcon(c.format)}
                      <span className="text-xs font-semibold text-[#D4A843] uppercase tracking-wide">
                        {formatLabel(c.format)}
                      </span>
                      <span className={`text-xs ${textMuted}`}>· {c.month}</span>
                    </div>
                    <p className={`font-serif text-base truncate ${textPrimary}`}>
                      {resolveDisplayName(c.username, c.display_name)}
                    </p>
                    {c.competition_title && (
                      <p className={`text-xs truncate ${textMuted}`}>
                        {c.competition_title}{c.book_title ? ` — ${c.book_title}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[#D4A843] font-bold text-lg">${c.prize_won.toFixed(2)}</p>
                    <p className={`text-xs ${textMuted}`}>won</p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Live / Archived View */}
        {(tab === 'live' || tab === 'archived') && (
          loadingComps ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className={`rounded-xl border p-5 animate-pulse ${cardBg}`}>
                  <div className={`h-4 w-1/3 rounded mb-2 ${isDark ? 'bg-[#D4A843]/10' : 'bg-[#1B2A4A]/10'}`} />
                  <div className={`h-3 w-1/2 rounded ${isDark ? 'bg-[#D4A843]/10' : 'bg-[#1B2A4A]/10'}`} />
                </div>
              ))}
            </div>
          ) : competitions.length === 0 ? (
            <div className={`rounded-xl border p-10 text-center ${cardBg}`}>
              <p className={`text-sm ${textMuted}`}>
                {tab === 'live' ? 'No active competitions right now.' : 'No archived competitions yet.'}
              </p>
              {tab === 'live' && (
                <button
                  onClick={() => navigateTo('/competitions')}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#D4A843] hover:underline"
                >
                  Browse upcoming <ArrowRight size={14} />
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* Competition selector */}
              <div className="md:col-span-1 space-y-2">
                <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${textMuted}`}>
                  {tab === 'live' ? 'Active Competitions' : 'Past Competitions'}
                </p>
                {competitions.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={compTabClass(c.id)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {formatIcon(c.format)}
                      <span className="text-xs font-semibold text-[#D4A843] uppercase tracking-wide">
                        {formatLabel(c.format)}
                      </span>
                    </div>
                    <p className={`text-sm font-medium truncate ${textPrimary}`}>{c.title}</p>
                    {c.book_title && (
                      <p className={`text-xs truncate ${textMuted}`}>{c.book_title}</p>
                    )}
                    <div className="flex items-center gap-1 mt-1.5">
                      <Clock size={11} className="text-[#D4A843]" />
                      <span className={`text-xs ${textMuted}`}>
                        {tab === 'live'
                          ? `Ends ${new Date(c.ends_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                          : `Ended ${new Date(c.ends_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Leaderboard table */}
              <div className="md:col-span-2">
                {selectedComp && (
                  <div className={`rounded-xl border overflow-hidden ${cardBg}`}>

                    {/* Competition header */}
                    <div className="px-5 py-4 border-b border-[#D4A843]/20">
                      <div className="flex items-center gap-2 mb-1">
                        {formatIcon(selectedComp.format, 16)}
                        <span className="text-xs font-semibold text-[#D4A843] uppercase tracking-wide">
                          {formatLabel(selectedComp.format)}
                        </span>
                        {tab === 'live' && (
                          <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/30 text-green-400">
                            Live
                          </span>
                        )}
                      </div>
                      <p className={`font-serif text-lg ${textPrimary}`}>{selectedComp.title}</p>
                      {selectedComp.book_title && (
                        <p className={`text-xs ${textMuted}`}>{selectedComp.book_title}</p>
                      )}
                      <div className="flex gap-4 mt-2">
                        <span className={`text-xs ${textMuted}`}>
                          Prize pool: <span className="text-[#D4A843] font-semibold">${selectedComp.prize_pool.toFixed(2)}</span>
                        </span>
                        {selectedComp.format === 'sprint' && (
                          <span className={`text-xs ${textMuted}`}>Winner takes all</span>
                        )}
                        {(selectedComp.format === 'readathon' || selectedComp.format === 'elimination') && (
                          <span className={`text-xs ${textMuted}`}>Top 3 split 50/30/20</span>
                        )}
                      </div>
                    </div>

                    {/* Ranking explanation */}
                    <div className={`px-5 py-2.5 text-xs border-b border-[#D4A843]/10 ${textMuted}`}>
                      {selectedComp.format === 'sprint' && 'Ranked by accuracy, then speed'}
                      {selectedComp.format === 'readathon' && 'Ranked by total pages from passed quizzes'}
                      {selectedComp.format === 'elimination' && 'Ranked by round reached — finals determine winner'}
                    </div>

                    {/* Entries */}
                    {loadingEntries ? (
                      <div className="p-6 space-y-3">
                        {[1, 2, 3, 4, 5].map(i => (
                          <div key={i} className={`h-10 rounded-lg animate-pulse ${isDark ? 'bg-[#D4A843]/10' : 'bg-[#1B2A4A]/10'}`} />
                        ))}
                      </div>
                    ) : entries.length === 0 ? (
                      <div className="p-10 text-center">
                        <p className={`text-sm ${textMuted}`}>
                          {tab === 'live' ? 'No entries yet. Be the first!' : 'No leaderboard data available.'}
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-[#D4A843]/10">
                        {entries.map((entry) => {
                          const isCurrentUser = entry.user_id === currentUserId;
                          const prize = prizeForRank(entry.rank, selectedComp.format, selectedComp.prize_pool);
                          const isPrizePosition = prize !== null;
                          const name = resolveDisplayName(entry.username, entry.display_name);

                          return (
                            <div
                              key={entry.user_id}
                              className={`px-5 py-3.5 flex items-center gap-3 transition-colors ${
                                isCurrentUser
                                  ? isDark ? 'bg-[#D4A843]/10' : 'bg-[#D4A843]/5'
                                  : ''
                              }`}
                            >
                              {/* Rank */}
                              <div className="w-8 text-center shrink-0">
                                <span className={`text-sm font-bold ${entry.rank <= 3 ? 'text-lg' : textMuted}`}>
                                  {rankMedal(entry.rank)}
                                </span>
                              </div>

                              {/* Name */}
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium truncate ${isCurrentUser ? 'text-[#D4A843]' : textPrimary}`}>
                                  {name}
                                  {isCurrentUser && <span className="ml-1.5 text-xs font-normal opacity-60">(you)</span>}
                                </p>

                                {/* Format-specific stat */}
                                {selectedComp.format === 'sprint' && entry.accuracy !== undefined && (
                                  <p className={`text-xs ${textMuted}`}>
                                    {entry.accuracy}% accuracy
                                    {entry.completion_time_seconds !== undefined && ` · ${formatTime(entry.completion_time_seconds)}`}
                                  </p>
                                )}
                                {selectedComp.format === 'readathon' && entry.pages_read !== undefined && (
                                  <p className={`text-xs ${textMuted}`}>
                                    {entry.pages_read.toLocaleString()} pages
                                    {entry.books_completed !== undefined && ` · ${entry.books_completed} book${entry.books_completed !== 1 ? 's' : ''}`}
                                  </p>
                                )}
                                {selectedComp.format === 'elimination' && (
                                  <p className={`text-xs ${textMuted}`}>
                                    {entry.eliminated
                                      ? `Eliminated — Round ${entry.round_reached}`
                                      : entry.rank === 1
                                      ? 'Champion'
                                      : `Round ${entry.round_reached}`}
                                  </p>
                                )}
                              </div>

                              {/* Prize */}
                              {isPrizePosition && (
                                <div className="text-right shrink-0">
                                  <p className="text-[#D4A843] font-bold text-sm">${prize!.toFixed(2)}</p>
                                  <p className={`text-xs ${textMuted}`}>{tab === 'live' ? 'if current' : 'won'}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Footer note for live */}
                    {tab === 'live' && entries.length > 0 && (
                      <div className={`px-5 py-3 border-t border-[#D4A843]/10 text-xs ${textMuted}`}>
                        Standings update in real time. Prize amounts shown are based on current rankings.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        )}

      </div>
    </div>
  );
};
