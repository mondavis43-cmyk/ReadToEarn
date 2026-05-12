import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from '../hooks/useNavigate';
import { Trophy, Users, DollarSign, Clock, AlertTriangle, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Competition = {
  id: string;
  title: string;
  type: 'elimination';
  book_title?: string;
  book_author?: string;
  entry_fee: number;
  prize_pool: number;
  status: 'upcoming' | 'active' | 'completed' | 'canceled';
  is_sponsored: boolean;
  start_date: string;
  end_date: string;
  pre_registration_count?: number;
};

type Tab = 'active' | 'upcoming' | 'past';

const MIN_PRE_REG = 12;

export const Elimination = () => {
  const { isDark } = useTheme();
  const { navigateTo } = useNavigate();

  const [tab, setTab] = useState<Tab>('active');
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [sponsored, setSponsored] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [preRegged, setPreRegged] = useState<Set<string>>(new Set());
  const [preRegCounts, setPreRegCounts] = useState<Record<string, number>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [preRegLoading, setPreRegLoading] = useState(false);
  const [entered, setEntered] = useState<Set<string>>(new Set());

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
    fetchCompetitions();
    if (userId) fetchEntered();
  }, [tab]);

  useEffect(() => {
    if (userId) { fetchPreRegs(); fetchEntered(); }
  }, [userId]);

  const fetchCompetitions = async () => {
    setLoading(true);
    const statusMap = { active: 'active', upcoming: 'upcoming', past: 'completed' };

    const { data } = await supabase
      .from('competitions')
      .select('*')
      .eq('type', 'Elimination Bracket')
      .eq('status', statusMap[tab])
      .eq('is_sponsored', false)
      .order('start_date', { ascending: true });

    const { data: sponsoredData } = await supabase
      .from('competitions')
      .select('*')
      .eq('type', 'Elimination Bracket')
      .eq('status', statusMap[tab])
      .eq('is_sponsored', true)
      .order('start_date', { ascending: true });

    const list = data ?? [];
    const sponsoredList = sponsoredData ?? [];

    setCompetitions(list);
    setSponsored(sponsoredList);

    // Fetch pre-reg counts for upcoming
    if (tab === 'upcoming') {
      const allIds = [...list, ...sponsoredList].map((c) => c.id);
      if (allIds.length > 0) {
        const { data: counts } = await supabase
          .from('elimination_pre_registrations')
          .select('competition_id')
          .in('competition_id', allIds);

        const countMap: Record<string, number> = {};
        (counts ?? []).forEach((r) => {
          countMap[r.competition_id] = (countMap[r.competition_id] ?? 0) + 1;
        });
        setPreRegCounts(countMap);
      }
    }

    setLoading(false);
  };

  const fetchPreRegs = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('elimination_pre_registrations')
      .select('competition_id')
      .eq('user_id', userId);
    setPreRegged(new Set((data ?? []).map((r) => r.competition_id)));
  };

  const fetchEntered = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('competition_entries')
      .select('competition_id')
      .eq('user_id', userId);
    setEntered(new Set((data ?? []).map((r) => r.competition_id)));
  };

  const handlePreRegister = async (competitionId: string) => {
    if (!userId || preRegged.has(competitionId)) return;
    setPreRegLoading(true);
    const { error } = await supabase
      .from('elimination_pre_registrations')
      .insert({ user_id: userId, competition_id: competitionId, converted: false });
    if (!error) {
      setPreRegged((prev) => new Set([...prev, competitionId]));
      setPreRegCounts((prev) => ({
        ...prev,
        [competitionId]: (prev[competitionId] ?? 0) + 1,
      }));
    }
    setPreRegLoading(false);
  };

  const handleEnter = (competition: Competition) => {
    if (competition.is_sponsored) {
      supabase.from('competition_entries').insert({
        competition_id: competition.id,
        entry_fee_paid: 0,
        is_late_entry: false,
        paid_at: new Date().toISOString(),
        status: 'active',
      }).then(() => navigateTo(`/elimination`));
      return;
    }
    sessionStorage.setItem('pendingSubmission', JSON.stringify({
      type: 'competition_entry',
      competition_id: competition.id,
      entry_fee: competition.entry_fee,
    }));
    sessionStorage.setItem('checkoutItem', JSON.stringify({
      type: 'competition_entry',
      label: `Elimination Entry: ${competition.title}`,
      amount: competition.entry_fee * 100,
      metadata: { competition_id: competition.id },
    }));
    navigateTo('/checkout');
  };

  const handleLateEnter = (competition: Competition) => {
    if (competition.is_sponsored) {
      supabase.from('competition_entries').insert({
        competition_id: competition.id,
        entry_fee_paid: 0,
        is_late_entry: true,
        paid_at: new Date().toISOString(),
        status: 'active',
      }).then(() => navigateTo(`/elimination`));
      return;
    }
    const lateFee = competition.entry_fee * 2;
    sessionStorage.setItem('pendingSubmission', JSON.stringify({
      type: 'competition_entry',
      competition_id: competition.id,
      entry_fee: lateFee,
      is_late: true,
    }));
    sessionStorage.setItem('checkoutItem', JSON.stringify({
      type: 'competition_entry',
      label: `Elimination Entry (Late): ${competition.title}`,
      amount: lateFee * 100,
      metadata: { competition_id: competition.id },
    }));
    navigateTo('/checkout');
  };

  const isWithin48HrWindow = (competition: Competition) => {
    const start = new Date(competition.start_date).getTime();
    const now = Date.now();
    return now <= start + 24 * 60 * 60 * 1000;
  };

  const tabClass = (t: Tab) =>
    `px-4 py-2 rounded-full text-sm font-medium transition-colors ${
      tab === t
        ? 'bg-[#D4A843] text-white'
        : isDark
        ? 'text-gray-400 hover:text-white'
        : 'text-gray-500 hover:text-[#1B2A4A]'
    }`;

  const renderCard = (competition: Competition) => {
    const count = preRegCounts[competition.id] ?? 0;
    const atRisk = tab === 'upcoming' && count < MIN_PRE_REG;
    const alreadyPreRegged = preRegged.has(competition.id);
    const alreadyEntered = entered.has(competition.id);
    const withinWindow = isWithin48HrWindow(competition);

    return (
      <div
        key={competition.id}
        className={`${cardBg} rounded-xl p-5 border ${border}`}
      >
        {/* Status + pre-reg count */}
        <div className="flex items-center justify-between mb-3">
          <span
            className={`text-xs font-semibold px-2 py-1 rounded-full ${
              competition.status === 'active'
                ? 'bg-green-500/20 text-green-400'
                : competition.status === 'upcoming'
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-gray-500/20 text-gray-400'
            }`}
          >
            {competition.status === 'active'
              ? '🟢 Live'
              : competition.status === 'upcoming'
              ? '🔵 Upcoming'
              : '⚫ Ended'}
          </span>
          {tab === 'upcoming' && (
            <span
              className={`text-xs flex items-center gap-1 ${
                atRisk ? 'text-red-400' : 'text-green-400'
              }`}
            >
              {atRisk && <AlertTriangle size={12} />}
              <Users size={12} />
              {count} / {MIN_PRE_REG} min
            </span>
          )}
          {competition.is_sponsored && (
            <span className="text-xs bg-[#D4A843]/20 text-[#D4A843] px-2 py-1 rounded-full font-semibold">
              Sponsored
            </span>
          )}
        </div>

        <h2 className={`font-bold ${textPrimary} mb-1`}>{competition.title}</h2>
        {competition.book_title && (
          <p className={`text-sm ${textMuted} mb-3`}>
            {competition.book_title}
            {competition.book_author && ` · ${competition.book_author}`}
          </p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className={`${isDark ? 'bg-[#0f1623]' : 'bg-gray-50'} rounded-lg p-2 text-center`}>
            <p className="text-xs text-[#D4A843] font-semibold">Entry</p>
            <p className={`text-sm font-bold ${textPrimary}`}>
              {competition.entry_fee === 0 ? 'Free' : `$${competition.entry_fee}`}
            </p>
          </div>
          <div className={`${isDark ? 'bg-[#0f1623]' : 'bg-gray-50'} rounded-lg p-2 text-center`}>
            <p className="text-xs text-[#D4A843] font-semibold">Prize Pool</p>
            <p className={`text-sm font-bold ${textPrimary}`}>${competition.prize_pool}</p>
          </div>
          <div className={`${isDark ? 'bg-[#0f1623]' : 'bg-gray-50'} rounded-lg p-2 text-center`}>
            <p className="text-xs text-[#D4A843] font-semibold">
              {tab === 'upcoming' ? 'Starts' : tab === 'active' ? 'Ends' : 'Ended'}
            </p>
            <p className={`text-sm font-bold ${textPrimary}`}>
              {new Date(
                tab === 'upcoming' ? competition.start_date : competition.end_date
              ).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Prize split */}
        <div className="flex gap-2 mb-4">
          {[
            { label: '1st', pct: '50%' },
            { label: '2nd', pct: '30%' },
            { label: '3rd', pct: '20%' },
          ].map((p) => (
            <div
              key={p.label}
              className={`flex-1 ${isDark ? 'bg-[#0f1623]' : 'bg-gray-50'} rounded-lg p-2 text-center`}
            >
              <p className={`text-xs ${textMuted}`}>{p.label}</p>
              <p className={`text-sm font-bold ${textPrimary}`}>{p.pct}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        {tab === 'upcoming' && (
          <button
            onClick={() => handlePreRegister(competition.id)}
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

        {tab === 'active' && (
          <div className="space-y-2">
            {alreadyEntered ? (
              <div className="w-full py-2 rounded-lg text-sm font-semibold bg-green-500/20 text-green-400 text-center">
                ✓ Entered
              </div>
            ) : withinWindow ? (
              <button
                onClick={() => handleEnter(competition)}
                className="w-full py-2 rounded-lg text-sm font-semibold bg-[#D4A843] text-white hover:bg-[#c49a3a]"
              >
                Enter Now — ${competition.entry_fee}
              </button>
            ) : (
              <div className="space-y-1">
                <button
                  onClick={() => handleLateEnter(competition)}
                  className="w-full py-2 rounded-lg text-sm font-semibold bg-orange-500 text-white hover:bg-orange-600"
                >
                  Enter Late — ${competition.entry_fee * 2}
                </button>
                <p className={`text-xs text-center ${textMuted}`}>
                  24hr window passed · late fee applies
                </p>
              </div>
            )}
          </div>
        )}

        {tab === 'past' && (
          <button
            onClick={() => navigateTo(`/competition/${competition.id}`)}
            className={`w-full py-2 rounded-lg text-sm font-semibold border ${border} ${textMuted} hover:${textPrimary}`}
          >
            View Results
          </button>
        )}
      </div>
    );
  };

  return (
    <div className={`min-h-screen ${bg} pb-20`}>
      {/* Header */}
      <div className={`${cardBg} border-b ${border} px-4 py-4 flex items-center gap-3`}>
        <button onClick={() => navigateTo('/home')} className={`${textMuted} hover:${textPrimary}`}>
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <Trophy size={20} className="text-[#D4A843]" />
          <h1 className={`text-lg font-bold ${textPrimary}`}>Elimination Bracket</h1>
        </div>
      </div>

      <div className="px-4 py-6 max-w-2xl mx-auto">
        <p className={`${textMuted} text-sm mb-6`}>
          Survive every round. Progressive difficulty, elimination-based. Last reader standing takes the prize.
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
              <div key={i} className={`${cardBg} rounded-xl h-48 animate-pulse`} />
            ))}
          </div>
        ) : competitions.length === 0 && sponsored.length === 0 ? (
          <div className={`${cardBg} rounded-xl p-8 text-center ${textMuted}`}>
            No {tab} elimination brackets right now.
          </div>
        ) : (
          <div className="space-y-4">
            {competitions.map(renderCard)}
          </div>
        )}

        {/* Pre-reg info box */}
        {tab === 'upcoming' && (
          <div
            className={`mt-6 border rounded-xl p-4 ${
              isDark
                ? 'bg-blue-900/20 border-blue-700'
                : 'bg-blue-50 border-blue-200'
            }`}
          >
            <p className={`text-sm font-semibold ${textPrimary} mb-1`}>
              How Pre-Registration Works
            </p>
            <ul className={`text-xs ${textMuted} space-y-1 list-disc list-inside`}>
              <li>Free to pre-register — no payment required</li>
              <li>Minimum 12 pre-registrants needed to run the bracket</li>
              <li>Once confirmed, dates are locked — no changes after threshold is met</li>
              <li>When the bracket goes live, you'll be notified to pay your entry fee</li>
              <li>48-hour window to pay after launch — late entries pay double the entry fee</li>
            </ul>
          </div>
        )}

        {/* Sponsored section */}
        {sponsored.length > 0 && (
          <div className="mt-8">
            <h2 className={`text-sm font-semibold ${textMuted} uppercase tracking-wide mb-4`}>
              Author-Sponsored Brackets
            </h2>
            <div className="space-y-4">{sponsored.map(renderCard)}</div>
          </div>
        )}
      </div>
    </div>
  );
};
