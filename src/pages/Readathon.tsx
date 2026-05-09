import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../hooks/useNavigate';
import { useTheme } from '../contexts/ThemeContext';
import { BookOpen, ArrowLeft, Trophy, Users, AlertTriangle, Clock } from 'lucide-react';

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

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  total_pages: number;
}

const MIN_PRE_REG = 12;

export const Readathon = () => {
  const { user } = useAuth();
  const { navigateTo } = useNavigate();
  const { isDark } = useTheme();

  const [tab, setTab] = useState<'active' | 'upcoming' | 'past'>('active');
  const [readathons, setReadathons] = useState<Readathon[]>([]);
  const [selected, setSelected] = useState<Readathon | null>(null);
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
    fetchReadathons();
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

  const fetchReadathons = async () => {
    setLoading(true);
    const statusMap = { active: 'active', upcoming: 'upcoming', past: 'completed' };
    const { data } = await supabase
      .from('readathons')
      .select('*')
      .eq('status', statusMap[tab])
      .order('start_date', { ascending: true });

    const list = data ?? [];
    setReadathons(list);
    setSelected(list[0] ?? null);

    if (tab === 'upcoming' && list.length > 0) {
      const ids = list.map((r) => r.id);
      const { data: counts } = await supabase
        .from('readathon_pre_registrations')
        .select('readathon_id')
        .in('readathon_id', ids);

      const countMap: Record<string, number> = {};
      (counts ?? []).forEach((r) => {
        countMap[r.readathon_id] = (countMap[r.readathon_id] ?? 0) + 1;
      });
      setPreRegCounts(countMap);
    }

    setLoading(false);
  };

  const fetchPreRegs = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('readathon_pre_registrations')
      .select('readathon_id')
      .eq('user_id', userId);
    setPreRegged(new Set((data ?? []).map((r) => r.readathon_id)));
  };

  const checkEntry = async () => {
    if (!selected || !userId) return;
    const { data } = await supabase
      .from('readathon_entries')
      .select('id')
      .eq('readathon_id', selected.id)
      .eq('user_id', userId)
      .maybeSingle();
    setIsEntered(!!data);
  };

  const loadLeaderboard = async () => {
    if (!selected) return;
    const { data } = await supabase
      .from('readathon_progress')
      .select('user_id, pages_read, profiles(display_name)')
      .eq('readathon_id', selected.id);

    // Aggregate pages by user
    const totals: Record<string, { display_name: string; total_pages: number }> = {};
    (data ?? []).forEach((e: any) => {
      if (!totals[e.user_id]) {
        totals[e.user_id] = { display_name: e.profiles?.display_name ?? 'Anonymous', total_pages: 0 };
      }
      totals[e.user_id].total_pages += e.pages_read ?? 0;
    });

    setLeaderboard(
      Object.entries(totals)
        .map(([user_id, v]) => ({ user_id, ...v }))
        .sort((a, b) => b.total_pages - a.total_pages)
        .slice(0, 10)
    );
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

  const handleEnter = (readathon: Readathon) => {
    if (readathon.is_sponsored) {
      supabase.from('readathon_entries').insert({
        readathon_id: readathon.id,
        entry_fee_paid: 0,
        paid_at: new Date().toISOString(),
        status: 'active',
      }).then(() => navigateTo('/readathon'));
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

  const handleLateEnter = (readathon: Readathon) => {
    if (readathon.is_sponsored) {
      supabase.from('readathon_entries').insert({
        readathon_id: readathon.id,
        entry_fee_paid: 0,
        paid_at: new Date().toISOString(),
        status: 'active',
      }).then(() => navigateTo('/readathon'));
      return;
    }
    const lateFee = readathon.entry_fee * 2;
    sessionStorage.setItem('pendingSubmission', JSON.stringify({
      type: 'readathon_entry',
      readathon_id: readathon.id,
      entry_fee: lateFee,
      is_late: true,
    }));
    sessionStorage.setItem('checkoutItem', JSON.stringify({
      type: 'readathon_entry',
      label: `Read-A-Thon Entry (Late): ${readathon.title}`,
      amount: lateFee * 100,
      metadata: { readathon_id: readathon.id },
    }));
    navigateTo('/checkout');
  };

  const isWithin48HrWindow = (readathon: Readathon) => {
    const start = new Date(readathon.start_date).getTime();
    const now = Date.now();
    return now <= start + 48 * 60 * 60 * 1000;
  };

  const prizeBreakdown = (r: Readathon) => [
    { label: '1st Place', pct: r.first_place_pct },
    { label: '2nd Place', pct: r.second_place_pct },
    { label: '3rd Place', pct: r.third_place_pct },
  ];

  const rankLabel = (i: number) => ['🥇', '🥈', '🥉'][i] ?? `#${i + 1}`;

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
          <BookOpen size={20} className="text-[#D4A843]" />
          <h1 className={`text-lg font-bold ${textPrimary}`}>Read-A-Thon</h1>
        </div>
      </div>

      <div className="px-4 py-6 max-w-2xl mx-auto">
        <p className={`${textMuted} text-sm mb-6`}>
          A marathon, not a sprint. Read as many pages as possible across the competition window. Most pages wins.
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
        ) : readathons.length === 0 ? (
          <div className={`${cardBg} rounded-xl p-8 text-center ${textMuted}`}>
            No {tab} read-a-thons right now.
          </div>
        ) : (
          <div className="space-y-4">
            {readathons.map((r) => {
              const count = preRegCounts[r.id] ?? 0;
              const atRisk = tab === 'upcoming' && count < MIN_PRE_REG;
              const alreadyPreRegged = preRegged.has(r.id);
              const withinWindow = isWithin48HrWindow(r);

              return (
                <div
                  key={r.id}
                  className={`${cardBg} rounded-xl p-5 border ${border} cursor-pointer ${
                    selected?.id === r.id ? 'ring-2 ring-[#D4A843]' : ''
                  }`}
                  onClick={() => setSelected(r)}
                >
                  {/* Status + pre-reg count */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        r.status === 'active'
                          ? 'bg-green-500/20 text-green-400'
                          : r.status === 'upcoming'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {r.status === 'active' ? '🟢 Live' : r.status === 'upcoming' ? '🔵 Upcoming' : '⚫ Ended'}
                    </span>
                    {tab === 'upcoming' && (
                      <span className={`text-xs ${atRisk ? 'text-red-400' : 'text-green-400'} flex items-center gap-1`}>
                        {atRisk && <AlertTriangle size={12} />}
                        <Users size={12} />
                        {count} / {MIN_PRE_REG} min
                      </span>
                    )}
                  </div>

                  <h2 className={`font-bold ${textPrimary} mb-3`}>{r.title}</h2>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className={`${isDark ? 'bg-[#0f1623]' : 'bg-gray-50'} rounded-lg p-2 text-center`}>
                      <p className="text-xs text-[#D4A843] font-semibold">Entry</p>
                      <p className={`text-sm font-bold ${textPrimary}`}>${r.entry_fee}</p>
                    </div>
                    <div className={`${isDark ? 'bg-[#0f1623]' : 'bg-gray-50'} rounded-lg p-2 text-center`}>
                      <p className="text-xs text-[#D4A843] font-semibold">Prize Pool</p>
                      <p className={`text-sm font-bold ${textPrimary}`}>${r.prize_pool}</p>
                    </div>
                    <div className={`${isDark ? 'bg-[#0f1623]' : 'bg-gray-50'} rounded-lg p-2 text-center`}>
                      <p className="text-xs text-[#D4A843] font-semibold">
                        {tab === 'upcoming' ? 'Starts' : 'Ends'}
                      </p>
                      <p className={`text-sm font-bold ${textPrimary}`}>
                        {new Date(tab === 'upcoming' ? r.start_date : r.end_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Prize breakdown */}
                  <div className="flex gap-2 mb-4">
                    {prizeBreakdown(r).map((p) => (
                      <div key={p.label} className={`flex-1 ${isDark ? 'bg-[#0f1623]' : 'bg-gray-50'} rounded-lg p-2 text-center`}>
                        <p className={`text-xs ${textMuted}`}>{p.label}</p>
                        <p className={`text-sm font-bold ${textPrimary}`}>{p.pct}%</p>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  {tab === 'upcoming' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handlePreRegister(r.id); }}
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
                          onClick={(e) => { e.stopPropagation(); handleEnter(r); }}
                          className="w-full py-2 rounded-lg text-sm font-semibold bg-[#D4A843] text-white hover:bg-[#c49a3a]"
                        >
                          Enter Now — ${r.entry_fee}
                        </button>
                      ) : (
                        <div className="space-y-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleLateEnter(r); }}
                            className="w-full py-2 rounded-lg text-sm font-semibold bg-orange-500 text-white hover:bg-orange-600"
                          >
                            Enter Late — ${r.entry_fee * 2}
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
                      onClick={(e) => { e.stopPropagation(); navigateTo(`/library`); }}
                      className="w-full py-2 rounded-lg text-sm font-semibold bg-green-500 text-white hover:bg-green-600"
                    >
                      Go Read
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
              <li>When the read-a-thon goes live, you'll be notified to pay your entry fee</li>
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
                  <p className={`text-sm font-bold ${textPrimary}`}>{entry.total_pages} pages</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
