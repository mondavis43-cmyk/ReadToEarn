import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../hooks/useNavigate';
import { useTheme } from '../contexts/ThemeContext';
import { Zap, ArrowLeft, Clock, Trophy, Users, AlertTriangle } from 'lucide-react';

interface Sprint {
  id: string;
  title: string;
  description: string;
  book_id: string;
  book_title: string;
  book_author: string;
  entry_fee: number;
  prize_pool: number;
  is_sponsored: boolean;
  status: 'upcoming' | 'active' | 'completed' | 'canceled';
  start_date: string;
  end_date: string;
}

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  score: number;
  time_ms: number;
}

const MIN_PRE_REG = 12;

export const Sprints = () => {
  const { user } = useAuth();
  const { navigateTo } = useNavigate();
  const { isDark } = useTheme();

  const [tab, setTab] = useState<'active' | 'upcoming' | 'past'>('active');
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selected, setSelected] = useState<Sprint | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isEntered, setIsEntered] = useState(false);
  const [preRegged, setPreRegged] = useState<Set<string>>(new Set());
  const [preRegCounts, setPreRegCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [preRegLoading, setPreRegLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const bg = isDark ? 'bg-[#0f1623]' : 'bg-[#F5F0E8]';
  const cardBg = isDark ? 'bg-[#1a2235]' : 'bg-white';
  const textPrimary = isDark ? 'text-white' : 'text-[#1B2A4A]';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const border = isDark ? 'border-gray-700' : 'border-gray-200';

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);
    };
    getUser();
  }, []);

  useEffect(() => {
    fetchSprints();
  }, [tab]);

  useEffect(() => {
    if (userId) fetchPreRegs();
  }, [userId]);

  useEffect(() => {
    if (selected) {
      checkEntry();
      if (tab === 'active') loadLeaderboard();
    }
  }, [selected]);

  const fetchSprints = async () => {
    setLoading(true);
    const statusMap = { active: 'active', upcoming: 'upcoming', past: 'completed' };
    const { data } = await supabase
      .from('sprints')
      .select('*')
      .eq('status', statusMap[tab])
      .order('start_date', { ascending: true });

    const list = data ?? [];
    setSprints(list);
    setSelected(list[0] ?? null);

    // fetch pre-reg counts for upcoming
    if (tab === 'upcoming' && list.length > 0) {
      const ids = list.map((s) => s.id);
      const { data: counts } = await supabase
        .from('sprint_pre_registrations')
        .select('sprint_id')
        .in('sprint_id', ids);

      const countMap: Record<string, number> = {};
      (counts ?? []).forEach((r) => {
        countMap[r.sprint_id] = (countMap[r.sprint_id] ?? 0) + 1;
      });
      setPreRegCounts(countMap);
    }

    setLoading(false);
  };

  const fetchPreRegs = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('sprint_pre_registrations')
      .select('sprint_id')
      .eq('user_id', userId);
    setPreRegged(new Set((data ?? []).map((r) => r.sprint_id)));
  };

  const checkEntry = async () => {
    if (!selected || !userId) return;
    const { data } = await supabase
      .from('sprint_entries')
      .select('id')
      .eq('sprint_id', selected.id)
      .eq('user_id', userId)
      .maybeSingle();
    setIsEntered(!!data);
  };

  const loadLeaderboard = async () => {
    if (!selected) return;
    const { data } = await supabase
      .from('sprint_entries')
      .select('user_id, score, time_ms, profiles(display_name)')
      .eq('sprint_id', selected.id)
      .order('score', { ascending: false })
      .order('time_ms', { ascending: true })
      .limit(10);
    setLeaderboard(
      (data ?? []).map((e: any) => ({
        user_id: e.user_id,
        display_name: e.profiles?.display_name ?? 'Anonymous',
        score: e.score,
        time_ms: e.time_ms,
      }))
    );
  };

  const handlePreRegister = async (sprintId: string) => {
    if (!userId || preRegged.has(sprintId)) return;
    setPreRegLoading(true);
    const { error } = await supabase
      .from('sprint_pre_registrations')
      .insert({ user_id: userId, sprint_id: sprintId, converted: false });
    if (!error) {
      setPreRegged((prev) => new Set([...prev, sprintId]));
      setPreRegCounts((prev) => ({ ...prev, [sprintId]: (prev[sprintId] ?? 0) + 1 }));
    }
    setPreRegLoading(false);
  };

  const handleEnter = (sprint: Sprint) => {
    if (sprint.is_sponsored) {
      supabase.from('sprint_entries').insert({
        sprint_id: sprint.id,
        entry_fee_paid: 0,
        paid_at: new Date().toISOString(),
        status: 'active',
      }).then(() => navigateTo('/sprints'));
      return;
    }
    // Check if within 48hr window (active status = window is open)
    // Late fee applies if notified_at + 48hrs has passed -- handled server-side
    // For now, pass entry_fee; Edge Function determines if late fee applies
    sessionStorage.setItem('pendingSubmission', JSON.stringify({
      type: 'sprint_entry',
      sprint_id: sprint.id,
      entry_fee: sprint.entry_fee,
    }));
    sessionStorage.setItem('checkoutItem', JSON.stringify({
      type: 'sprint_entry',
      label: `Sprint Entry: ${sprint.title}`,
      amount: sprint.entry_fee * 100,
      metadata: { sprint_id: sprint.id },
    }));
    navigateTo('/checkout');
  };

  const handleLateEnter = (sprint: Sprint) => {
    if (sprint.is_sponsored) {
      supabase.from('sprint_entries').insert({
        sprint_id: sprint.id,
        entry_fee_paid: 0,
        paid_at: new Date().toISOString(),
        status: 'active',
      }).then(() => navigateTo('/sprints'));
      return;
    }
    const lateFee = sprint.entry_fee * 2;
    sessionStorage.setItem('pendingSubmission', JSON.stringify({
      type: 'sprint_entry',
      sprint_id: sprint.id,
      entry_fee: lateFee,
      is_late: true,
    }));
    sessionStorage.setItem('checkoutItem', JSON.stringify({
      type: 'sprint_entry',
      label: `Sprint Entry (Late): ${sprint.title}`,
      amount: lateFee * 100,
      metadata: { sprint_id: sprint.id },
    }));
    navigateTo('/checkout');
  };

  const formatTime = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const rankLabel = (i: number) => ['🥇', '🥈', '🥉'][i] ?? `#${i + 1}`;

  const isWithin48HrWindow = (sprint: Sprint) => {
    // Active sprint within 48hrs of start_date = normal entry fee
    const start = new Date(sprint.start_date).getTime();
    const now = Date.now();
    return now <= start + 48 * 60 * 60 * 1000;
  };

  const tabClass = (t: string) =>
    `px-4 py-2 rounded-full text-sm font-medium transition-colors ${
      tab === t
        ? 'bg-[#D4A843] text-white'
        : isDark
        ? 'text-gray-400 hover:text-white'
        : 'text-gray-500 hover:text-[#1B2A4A]'
    }`;

  return (
    <div className={`min-h-screen ${bg} pb-20`}>
      {/* Header */}
      <div className={`${cardBg} border-b ${border} px-4 py-4 flex items-center gap-3`}>
        <button onClick={() => navigateTo('/home')} className={`${textMuted} hover:${textPrimary}`}>
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <Zap size={20} className="text-[#D4A843]" />
          <h1 className={`text-lg font-bold ${textPrimary}`}>Sprints</h1>
        </div>
      </div>

      {/* Hero */}
      <div className="px-4 py-6 max-w-2xl mx-auto">
        <p className={`${textMuted} text-sm mb-6`}>
          Race against the clock. 10 questions, 8 minutes. Ranked by accuracy first, speed second.
        </p>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['active', 'upcoming', 'past'] as const).map((t) => (
            <button key={t} className={tabClass(t)} onClick={() => setTab(t)}>
              {t === 'active' ? 'Active' : t === 'upcoming' ? 'Upcoming' : 'Past Results'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className={`${cardBg} rounded-xl h-40 animate-pulse`} />
            ))}
          </div>
        ) : sprints.length === 0 ? (
          <div className={`${cardBg} rounded-xl p-8 text-center ${textMuted}`}>
            No {tab} sprints right now.
          </div>
        ) : (
          <div className="space-y-4">
            {sprints.map((sprint) => {
              const count = preRegCounts[sprint.id] ?? 0;
              const atRisk = tab === 'upcoming' && count < MIN_PRE_REG;
              const alreadyPreRegged = preRegged.has(sprint.id);
              const withinWindow = isWithin48HrWindow(sprint);

              return (
                <div
                  key={sprint.id}
                  className={`${cardBg} rounded-xl p-5 border ${border} cursor-pointer ${
                    selected?.id === sprint.id ? 'ring-2 ring-[#D4A843]' : ''
                  }`}
                  onClick={() => setSelected(sprint)}
                >
                  {/* Status badge */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        sprint.status === 'active'
                          ? 'bg-green-500/20 text-green-400'
                          : sprint.status === 'upcoming'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {sprint.status === 'active' ? '🟢 Live' : sprint.status === 'upcoming' ? '🔵 Upcoming' : '⚫ Ended'}
                    </span>
                    {tab === 'upcoming' && (
                      <span className={`text-xs ${atRisk ? 'text-red-400' : 'text-green-400'} flex items-center gap-1`}>
                        {atRisk && <AlertTriangle size={12} />}
                        <Users size={12} />
                        {count} / {MIN_PRE_REG} min
                      </span>
                    )}
                  </div>

                  <h2 className={`font-bold ${textPrimary} mb-1`}>{sprint.title}</h2>
                  {sprint.book_title && (
                    <p className={`text-sm ${textMuted} mb-3`}>
                      {sprint.book_title} {sprint.book_author && `· ${sprint.book_author}`}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className={`${isDark ? 'bg-[#0f1623]' : 'bg-gray-50'} rounded-lg p-2 text-center`}>
                      <p className="text-xs text-[#D4A843] font-semibold">Entry</p>
                      <p className={`text-sm font-bold ${textPrimary}`}>${sprint.entry_fee}</p>
                    </div>
                    <div className={`${isDark ? 'bg-[#0f1623]' : 'bg-gray-50'} rounded-lg p-2 text-center`}>
                      <p className="text-xs text-[#D4A843] font-semibold">Prize Pool</p>
                      <p className={`text-sm font-bold ${textPrimary}`}>${sprint.prize_pool}</p>
                    </div>
                    <div className={`${isDark ? 'bg-[#0f1623]' : 'bg-gray-50'} rounded-lg p-2 text-center`}>
                      <p className="text-xs text-[#D4A843] font-semibold">
                        {tab === 'upcoming' ? 'Starts' : 'Ends'}
                      </p>
                      <p className={`text-sm font-bold ${textPrimary}`}>
                        {new Date(tab === 'upcoming' ? sprint.start_date : sprint.end_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* CTA */}
                  {tab === 'upcoming' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handlePreRegister(sprint.id); }}
                      disabled={alreadyPreRegged || preRegLoading}
                      className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${
                        alreadyPreRegged
                          ? 'bg-green-500/20 text-green-400 cursor-default'
                          : 'bg-[#D4A843] text-white hover:bg-[#c49a3a]'
                      }`}
                    >
                      {alreadyPreRegged ? '✓ Pre-Registered' : 'Pre-Register (Free)'}
                    </button>
                  )}

                  {tab === 'active' && !isEntered && (
                    <div className="space-y-2">
                      {withinWindow ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEnter(sprint); }}
                          className="w-full py-2 rounded-lg text-sm font-semibold bg-[#D4A843] text-white hover:bg-[#c49a3a]"
                        >
                          Enter Now — ${sprint.entry_fee}
                        </button>
                      ) : (
                        <div className="space-y-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleLateEnter(sprint); }}
                            className="w-full py-2 rounded-lg text-sm font-semibold bg-orange-500 text-white hover:bg-orange-600"
                          >
                            Enter Late — ${sprint.entry_fee * 2}
                          </button>
                          <p className={`text-xs text-center ${textMuted}`}>
                            48hr window passed · late fee applies
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {tab === 'active' && isEntered && (
                    <button
                      onClick={(e) => { e.stopPropagation(); navigateTo(`/quiz/${sprint.book_id}?sprint=${sprint.id}`); }}
                      className="w-full py-2 rounded-lg text-sm font-semibold bg-green-500 text-white hover:bg-green-600"
                    >
                      Take Quiz
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pre-reg info box */}
        {tab === 'upcoming' && (
          <div className={`mt-6 ${isDark ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'} border rounded-xl p-4`}>
            <p className={`text-sm font-semibold ${textPrimary} mb-1`}>How Pre-Registration Works</p>
            <ul className={`text-xs ${textMuted} space-y-1 list-disc list-inside`}>
              <li>Free to pre-register — no payment required</li>
              <li>Minimum 12 pre-registrants needed to run</li>
              <li>When the sprint goes live, you'll be notified to pay your entry fee</li>
              <li>48-hour window to pay after launch — late entries pay double the entry fee</li>
            </ul>
          </div>
        )}

        {/* Leaderboard */}
        {tab === 'active' && selected && leaderboard.length > 0 && (
          <div className={`mt-6 ${cardBg} rounded-xl p-4 border ${border}`}>
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={16} className="text-[#D4A843]" />
              <h3 className={`font-bold ${textPrimary}`}>Leaderboard</h3>
              <span className={`text-xs ${textMuted} ml-auto flex items-center gap-1`}>
                <Clock size={12} /> updates every 30s
              </span>
            </div>
            <div className="space-y-2">
              {leaderboard.map((entry, i) => (
                <div
                  key={entry.user_id}
                  className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                    entry.user_id === userId
                      ? 'bg-[#D4A843]/20 border border-[#D4A843]/40'
                      : isDark ? 'bg-[#0f1623]' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm w-6">{rankLabel(i)}</span>
                    <span className={`text-sm ${textPrimary}`}>{entry.display_name}</span>
                    {entry.user_id === userId && <span className="text-xs text-[#D4A843]">you</span>}
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${textPrimary}`}>{entry.score}/10</p>
                    <p className={`text-xs ${textMuted}`}>{formatTime(entry.time_ms)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
