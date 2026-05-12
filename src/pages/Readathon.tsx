import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from '../hooks/useNavigate';
import { useTheme } from '../contexts/ThemeContext';
import { BookOpen, ArrowLeft, Trophy, CheckCircle2, Circle, Users, AlertTriangle } from 'lucide-react';

interface Readathon {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  entry_fee: number;
  prize_pool: number;
  first_place_pct: number;
  second_place_pct: number;
  third_place_pct: number;
  is_sponsored: boolean;
  status: 'upcoming' | 'active' | 'completed' | 'canceled';
}

interface Square {
  id: string;
  row_index: number;
  col_index: number;
  genre: string;
  subgenre: string;
  book_id: string;
  books: { title: string; author: string };
}

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  bingo_count: number;
  completed_at: string;
}

const MIN_PRE_REG = 12;

const GENRE_COLORS = [
  'from-purple-500/20 to-purple-600/10 border-purple-500/30',
  'from-blue-500/20 to-blue-600/10 border-blue-500/30',
  'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
  'from-rose-500/20 to-rose-600/10 border-rose-500/30',
];

export const Readathon = () => {
  const { navigateTo } = useNavigate();
  const { isDark } = useTheme();

  const [tab, setTab] = useState<'active' | 'upcoming' | 'past'>('active');
  const [readathon, setReadathon] = useState<Readathon | null>(null);
  const [upcomingList, setUpcomingList] = useState<Readathon[]>([]);
  const [pastList, setPastList] = useState<Readathon[]>([]);
  const [squares, setSquares] = useState<Square[]>([]);
  const [completedSquareIds, setCompletedSquareIds] = useState<Set<string>>(new Set());
  const [completedRowIndexes, setCompletedRowIndexes] = useState<Set<number>>(new Set());
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isEntered, setIsEntered] = useState(false);
  const [preRegged, setPreRegged] = useState<Set<string>>(new Set());
  const [preRegCounts, setPreRegCounts] = useState<Record<string, number>>({});
  const [preRegLoading, setPreRegLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const bg = isDark ? 'bg-[#0f1623]' : 'bg-[#F5F0E8]';
  const cardBg = isDark ? 'bg-[#1a2235]' : 'bg-white';
  const textPrimary = isDark ? 'text-white' : 'text-[#1B2A4A]';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const border = isDark ? 'border-gray-700' : 'border-gray-200';

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      setUserId(uid);
      await loadReadathon(uid);
      await loadUpcomingPast(uid);
    };
    init();
  }, []);

  useEffect(() => {
    if (tab !== 'active') loadUpcomingPast(userId);
  }, [tab]);

  const loadReadathon = async (uid: string | null) => {
    setLoading(true);

    const { data: active } = await supabase
      .from('readathons')
      .select('*')
      .eq('status', 'active')
      .maybeSingle();

    if (!active) {
      setLoading(false);
      return;
    }
    setReadathon(active);

    const { data: sq } = await supabase
      .from('readathon_squares')
      .select('id, row_index, col_index, genre, subgenre, book_id, books(title, author)')
      .eq('readathon_id', active.id)
      .order('row_index')
      .order('col_index');

    setSquares((sq ?? []) as Square[]);

    if (uid) {
      const { data: entry } = await supabase
        .from('readathon_entries')
        .select('id')
        .eq('readathon_id', active.id)
        .eq('user_id', uid)
        .maybeSingle();
      setIsEntered(!!entry);

      const { data: completions } = await supabase
        .from('readathon_completions')
        .select('square_id')
        .eq('readathon_id', active.id)
        .eq('user_id', uid);
      setCompletedSquareIds(new Set((completions ?? []).map((c: { square_id: string }) => c.square_id)));

      const { data: bingos } = await supabase
        .from('readathon_bingos')
        .select('row_index')
        .eq('readathon_id', active.id)
        .eq('user_id', uid);
      setCompletedRowIndexes(new Set((bingos ?? []).map((b: { row_index: number }) => b.row_index)));
    }

    await loadLeaderboard(active.id);
    setLoading(false);
  };

  const loadLeaderboard = async (readathonId: string) => {
    const { data: bingos } = await supabase
      .from('readathon_bingos')
      .select('user_id, row_index, created_at, profiles(display_name)')
      .eq('readathon_id', readathonId)
      .order('created_at', { ascending: true });

    const totals: Record<string, { display_name: string; bingo_count: number; completed_at: string }> = {};
    (bingos ?? []).forEach((b: any) => {
      if (!totals[b.user_id]) {
        totals[b.user_id] = {
          display_name: b.profiles?.display_name ?? 'Anonymous',
          bingo_count: 0,
          completed_at: b.created_at,
        };
      }
      totals[b.user_id].bingo_count += 1;
    });

    setLeaderboard(
      Object.entries(totals)
        .map(([user_id, v]) => ({ user_id, ...v }))
        .sort((a, b) => b.bingo_count - a.bingo_count || a.completed_at.localeCompare(b.completed_at))
        .slice(0, 10)
    );
  };

  const loadUpcomingPast = async (uid: string | null) => {
    const { data: upcoming } = await supabase
      .from('readathons')
      .select('*')
      .eq('status', 'upcoming')
      .order('start_date', { ascending: true });
    setUpcomingList(upcoming ?? []);

    const { data: past } = await supabase
      .from('readathons')
      .select('*')
      .eq('status', 'completed')
      .order('end_date', { ascending: false });
    setPastList(past ?? []);

    const allIds = [...(upcoming ?? []), ...(past ?? [])].map((r) => r.id);
    if (allIds.length > 0) {
      const { data: counts } = await supabase
        .from('readathon_pre_registrations')
        .select('readathon_id')
        .in('readathon_id', allIds);
      const countMap: Record<string, number> = {};
      (counts ?? []).forEach((r: { readathon_id: string }) => {
        countMap[r.readathon_id] = (countMap[r.readathon_id] ?? 0) + 1;
      });
      setPreRegCounts(countMap);
    }

    if (uid) {
      const { data: regs } = await supabase
        .from('readathon_pre_registrations')
        .select('readathon_id')
        .eq('user_id', uid);
      setPreRegged(new Set((regs ?? []).map((r: { readathon_id: string }) => r.readathon_id)));
    }
  };

  const handlePreRegister = async (readathonId: string) => {
    if (!userId || preRegged.has(readathonId)) return;
    setPreRegLoading(true);
    const { error } = await supabase
      .from('readathon_pre_registrations')
      .insert({ user_id: userId, readathon_id: readathonId, converted: false });
    if (!error) {
      setPreRegged((prev) => new Set([...prev, readathonId]));
      setPreRegCounts((prev) => ({ ...prev, [readathonId]: (prev[readathonId] ?? 0) + 1 }));
    }
    setPreRegLoading(false);
  };

  const handleEnter = () => {
    if (!readathon) return;
    if (readathon.is_sponsored) {
      supabase.from('readathon_entries').insert({
        readathon_id: readathon.id,
        entry_fee_paid: 0,
        paid_at: new Date().toISOString(),
      }).then(() => loadReadathon(userId));
      return;
    }
    sessionStorage.setItem('pendingSubmission', JSON.stringify({
      type: 'readathon_entry',
      readathon_id: readathon.id,
      entry_fee: readathon.entry_fee,
    }));
    sessionStorage.setItem('checkoutItem', JSON.stringify({
      type: 'readathon_entry',
      label: `Read-A-Thon Entry: ${readathon.title}`,
      amount: readathon.entry_fee * 100,
      metadata: { readathon_id: readathon.id },
    }));
    navigateTo('/checkout');
  };

  const handleLateEnter = (r: Readathon) => {
    if (r.is_sponsored) {
      supabase.from('readathon_entries').insert({
        readathon_id: r.id, entry_fee_paid: 0, paid_at: new Date().toISOString(),
      }).then(() => loadReadathon(userId));
      return;
    }
    const lateFee = r.entry_fee * 2;
    sessionStorage.setItem('pendingSubmission', JSON.stringify({
      type: 'readathon_entry', readathon_id: r.id, entry_fee: lateFee, is_late: true,
    }));
    sessionStorage.setItem('checkoutItem', JSON.stringify({
      type: 'readathon_entry',
      label: `Read-A-Thon Entry (Late): ${r.title}`,
      amount: lateFee * 100,
      metadata: { readathon_id: r.id },
    }));
    navigateTo('/checkout');
  };

  const isWithin48HrWindow = (r: Readathon) =>
    Date.now() <= new Date(r.start_date).getTime() + 24 * 60 * 60 * 1000;

  const tabClass = (t: string) =>
    `px-4 py-2 rounded-full text-sm font-medium transition-colors ${
      tab === t ? 'bg-[#D4A843] text-white' : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-[#1B2A4A]'
    }`;

  // Group squares into rows (0–3)
  const rows = [0, 1, 2, 3].map((rowIdx) =>
    squares.filter((s) => s.row_index === rowIdx).sort((a, b) => a.col_index - b.col_index)
  );

  const genreForRow = (rowIdx: number) => rows[rowIdx]?.[0]?.genre ?? `Row ${rowIdx + 1}`;

  const rankLabel = (i: number) => ['🥇', '🥈', '🥉'][i] ?? `#${i + 1}`;

  if (loading) {
    return (
      <div className={`min-h-screen ${bg} pb-20`}>
        <div className={`${cardBg} border-b ${border} px-4 py-4 flex items-center gap-3`}>
          <button onClick={() => navigateTo('/home')} className={textMuted}><ArrowLeft size={20} /></button>
          <BookOpen size={20} className="text-[#D4A843]" />
          <h1 className={`text-lg font-bold ${textPrimary}`}>Read-A-Thon</h1>
        </div>
        <div className="px-4 py-6 max-w-2xl mx-auto space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className={`${cardBg} rounded-xl h-28 animate-pulse`} />)}
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg} pb-20`}>
      {/* Header */}
      <div className={`${cardBg} border-b ${border} px-4 py-4 flex items-center gap-3`}>
        <button onClick={() => navigateTo('/home')} className={`${textMuted} hover:${textPrimary}`}>
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <BookOpen size={20} className="text-[#D4A843]" />
          <h1 className={`text-lg font-bold ${textPrimary}`}>Read-A-Thon</h1>
        </div>
        {readathon && (
          <span className="ml-auto text-xs font-semibold px-2 py-1 rounded-full bg-green-500/20 text-green-400">
            🟢 Live
          </span>
        )}
      </div>

      <div className="px-4 py-6 max-w-2xl mx-auto space-y-6">
        {/* Tabs */}
        <div className="flex gap-2">
          {(['active', 'upcoming', 'past'] as const).map((t) => (
            <button key={t} className={tabClass(t)} onClick={() => setTab(t)}>
              {t === 'active' ? 'Active' : t === 'upcoming' ? 'Upcoming' : 'Past Results'}
            </button>
          ))}
        </div>
        {/* ── ACTIVE TAB ── */}
        {tab === 'active' && !readathon && (
          <div className={`${cardBg} rounded-xl p-8 text-center ${textMuted}`}>
            No active Read-A-Thon right now. Check back soon!
          </div>
        )}

        {tab === 'active' && readathon && (
        <>
        {/* Info card */}
        <div className={`${cardBg} rounded-xl p-4 border ${border}`}>
          <h2 className={`font-bold ${textPrimary} mb-1`}>{readathon.title}</h2>
          <p className={`text-sm ${textMuted} mb-3`}>{readathon.description}</p>
          <div className="grid grid-cols-3 gap-2">
            <div className={`${isDark ? 'bg-[#0f1623]' : 'bg-gray-50'} rounded-lg p-2 text-center`}>
              <p className="text-xs text-[#D4A843] font-semibold">Entry</p>
              <p className={`text-sm font-bold ${textPrimary}`}>${readathon.entry_fee}</p>
            </div>
            <div className={`${isDark ? 'bg-[#0f1623]' : 'bg-gray-50'} rounded-lg p-2 text-center`}>
              <p className="text-xs text-[#D4A843] font-semibold">Prize Pool</p>
              <p className={`text-sm font-bold ${textPrimary}`}>${readathon.prize_pool}</p>
            </div>
            <div className={`${isDark ? 'bg-[#0f1623]' : 'bg-gray-50'} rounded-lg p-2 text-center`}>
              <p className="text-xs text-[#D4A843] font-semibold">Ends</p>
              <p className={`text-sm font-bold ${textPrimary}`}>
                {new Date(readathon.end_date).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            {[
              { label: '1st', pct: readathon.first_place_pct },
              { label: '2nd', pct: readathon.second_place_pct },
              { label: '3rd', pct: readathon.third_place_pct },
            ].map((p) => (
              <div key={p.label} className={`flex-1 ${isDark ? 'bg-[#0f1623]' : 'bg-gray-50'} rounded-lg p-2 text-center`}>
                <p className={`text-xs ${textMuted}`}>{p.label}</p>
                <p className={`text-sm font-bold ${textPrimary}`}>{p.pct}%</p>
              </div>
            ))}
          </div>
        </div>

        {/* Enter CTA */}
        {!userId && (
          <button
            onClick={() => navigateTo('/login')}
            className="w-full py-3 rounded-xl text-sm font-bold bg-[#D4A843] text-white hover:bg-[#c49a3a] transition-colors"
          >
            Sign in to Enter
          </button>
        )}
        {!isEntered && userId && (
          isWithin48HrWindow(readathon) ? (
            <button
              onClick={handleEnter}
              className="w-full py-3 rounded-xl text-sm font-bold bg-[#D4A843] text-white hover:bg-[#c49a3a] transition-colors"
            >
              Enter Now — ${readathon.entry_fee}
            </button>
          ) : (
            <div className="space-y-1">
              <button
                onClick={() => handleLateEnter(readathon)}
                className="w-full py-3 rounded-xl text-sm font-bold bg-orange-500 text-white hover:bg-orange-600 transition-colors"
              >
                Enter Late — ${readathon.entry_fee * 2}
              </button>
              <p className={`text-xs text-center ${textMuted}`}>24hr window passed · late fee applies</p>
            </div>
          )
        )}
        {isEntered && (
          <div className="flex items-center gap-2 justify-center text-green-400 text-sm font-semibold py-2">
            <CheckCircle2 size={16} /> You're entered — complete rows to win!
          </div>
        )}

        {/* How to play */}
        <div className={`${isDark ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'} border rounded-xl p-4`}>
          <p className={`text-sm font-semibold ${textPrimary} mb-2`}>How to Play</p>
          <ul className={`text-xs ${textMuted} space-y-1 list-disc list-inside`}>
            <li>Each row is a genre with 4 books (one per subgenre)</li>
            <li>Pass the quiz (8/10) on a book to complete that square</li>
            <li>Complete all 4 squares in a row to score a <strong>Bingo</strong></li>
            <li>First to bingo wins — ties broken by who completed faster</li>
            <li>Prize pool split: 50% / 30% / 20% for the first 3 bingos</li>
          </ul>
        </div>

        {/* Bingo Card */}
        {squares.length > 0 && (
          <div className="space-y-4">
            <h3 className={`font-bold ${textPrimary}`}>Your Bingo Card</h3>
            {rows.map((row, rowIdx) => {
              if (row.length === 0) return null;
              const rowDone = completedRowIndexes.has(rowIdx);
              const colorClass = GENRE_COLORS[rowIdx % GENRE_COLORS.length];
              return (
                <div
                  key={rowIdx}
                  className={`rounded-xl border bg-gradient-to-br ${colorClass} p-4 ${
                    rowDone ? 'ring-2 ring-[#D4A843]' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs font-bold uppercase tracking-wide ${textPrimary}`}>
                      {genreForRow(rowIdx)}
                    </span>
                    {rowDone && (
                      <span className="text-xs font-bold text-[#D4A843] flex items-center gap-1">
                        <Trophy size={12} /> BINGO!
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {row.map((sq) => {
                      const done = completedSquareIds.has(sq.id);
                      return (
                        <div
                          key={sq.id}
                          onClick={() => isEntered && navigateTo(`/quiz/${sq.book_id}`)}
                          className={`rounded-lg p-2 text-center border transition-all ${
                            done
                              ? 'bg-[#D4A843]/30 border-[#D4A843] cursor-default'
                              : isEntered
                              ? `${isDark ? 'bg-[#0f1623]/60' : 'bg-white/70'} border-transparent hover:border-[#D4A843]/50 cursor-pointer`
                              : `${isDark ? 'bg-[#0f1623]/40' : 'bg-white/50'} border-transparent cursor-default opacity-60`
                          }`}
                        >
                          {done ? (
                            <CheckCircle2 size={16} className="text-[#D4A843] mx-auto mb-1" />
                          ) : (
                            <Circle size={16} className={`${textMuted} mx-auto mb-1`} />
                          )}
                          <p className={`text-xs font-semibold leading-tight ${textPrimary} line-clamp-2`}>
                            {sq.books?.title ?? '—'}
                          </p>
                          <p className={`text-xs ${textMuted} mt-0.5 truncate`}>{sq.subgenre}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <div className={`${cardBg} rounded-xl p-4 border ${border}`}>
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={16} className="text-[#D4A843]" />
              <h3 className={`font-bold ${textPrimary}`}>Bingo Leaderboard</h3>
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
                  <span className={`text-sm font-bold ${textPrimary}`}>
                    {entry.bingo_count} {entry.bingo_count === 1 ? 'bingo' : 'bingos'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        </> /* end active tab */
        )}

        {/* ── UPCOMING TAB ── */}
        {tab === 'upcoming' && (
          <>
            {upcomingList.length === 0 ? (
              <div className={`${cardBg} rounded-xl p-8 text-center ${textMuted}`}>No upcoming Read-A-Thons right now.</div>
            ) : (
              <div className="space-y-4">
                {upcomingList.map((r) => {
                  const count = preRegCounts[r.id] ?? 0;
                  const atRisk = count < MIN_PRE_REG;
                  const alreadyPreRegged = preRegged.has(r.id);
                  return (
                    <div key={r.id} className={`${cardBg} rounded-xl p-5 border ${border}`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-500/20 text-blue-400">🔵 Upcoming</span>
                        <span className={`text-xs ${atRisk ? 'text-red-400' : 'text-green-400'} flex items-center gap-1`}>
                          {atRisk && <AlertTriangle size={12} />}<Users size={12} />{count} / {MIN_PRE_REG} min
                        </span>
                      </div>
                      <h2 className={`font-bold ${textPrimary} mb-3`}>{r.title}</h2>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className={`${isDark ? 'bg-[#0f1623]' : 'bg-gray-50'} rounded-lg p-2 text-center`}>
                          <p className="text-xs text-[#D4A843] font-semibold">Entry</p>
                          <p className={`text-sm font-bold ${textPrimary}`}>${r.entry_fee}</p>
                        </div>
                        <div className={`${isDark ? 'bg-[#0f1623]' : 'bg-gray-50'} rounded-lg p-2 text-center`}>
                          <p className="text-xs text-[#D4A843] font-semibold">Prize Pool</p>
                          <p className={`text-sm font-bold ${textPrimary}`}>${r.prize_pool}</p>
                        </div>
                        <div className={`${isDark ? 'bg-[#0f1623]' : 'bg-gray-50'} rounded-lg p-2 text-center`}>
                          <p className="text-xs text-[#D4A843] font-semibold">Starts</p>
                          <p className={`text-sm font-bold ${textPrimary}`}>{new Date(r.start_date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handlePreRegister(r.id)}
                        disabled={alreadyPreRegged || preRegLoading}
                        className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${
                          alreadyPreRegged ? 'bg-green-500/20 text-green-400 cursor-default' : 'bg-[#D4A843] text-white hover:bg-[#c49a3a]'
                        }`}
                      >
                        {alreadyPreRegged ? '✓ Pre-Registered' : 'Pre-Register (Free)'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <div className={`${isDark ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'} border rounded-xl p-4`}>
              <p className={`text-sm font-semibold ${textPrimary} mb-1`}>How Pre-Registration Works</p>
              <ul className={`text-xs ${textMuted} space-y-1 list-disc list-inside`}>
                <li>Free to pre-register — no payment required</li>
                <li>Minimum 12 pre-registrants needed to run</li>
                <li>When the Read-A-Thon goes live, you'll be notified to pay your entry fee</li>
                <li>48-hour window to pay after launch — late entries pay double the entry fee</li>
              </ul>
            </div>
          </>
        )}

        {/* ── PAST TAB ── */}
        {tab === 'past' && (
          pastList.length === 0 ? (
            <div className={`${cardBg} rounded-xl p-8 text-center ${textMuted}`}>No past Read-A-Thons yet.</div>
          ) : (
            <div className="space-y-4">
              {pastList.map((r) => (
                <div key={r.id} className={`${cardBg} rounded-xl p-5 border ${border}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-500/20 text-gray-400">⚫ Ended</span>
                    <span className={`text-xs ${textMuted}`}>Ended {new Date(r.end_date).toLocaleDateString()}</span>
                  </div>
                  <h2 className={`font-bold ${textPrimary} mb-1`}>{r.title}</h2>
                  <div className="flex gap-2 mt-2">
                    {[{ label: '1st', pct: r.first_place_pct }, { label: '2nd', pct: r.second_place_pct }, { label: '3rd', pct: r.third_place_pct }].map((p) => (
                      <div key={p.label} className={`flex-1 ${isDark ? 'bg-[#0f1623]' : 'bg-gray-50'} rounded-lg p-2 text-center`}>
                        <p className={`text-xs ${textMuted}`}>{p.label}</p>
                        <p className={`text-sm font-bold ${textPrimary}`}>{p.pct}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};
