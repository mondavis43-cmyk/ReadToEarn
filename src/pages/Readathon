import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../hooks/useNavigate';
import { useTheme } from '../contexts/ThemeContext';
import { BookOpen, Trophy, ArrowLeft } from 'lucide-react';

interface Readathon {
  id: string;
  title: string;
  description: string;
  entry_fee: number;
  prize_pool: number;
  status: 'upcoming' | 'active' | 'completed';
  start_date: string;
  end_date: string;
}

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  total_pages: number;
}

export const ReadathonPage = () => {
  const { user } = useAuth();
  const { navigateTo } = useNavigate();
  const { isDark } = useTheme();

  const [readathons, setReadathons] = useState<Readathon[]>([]);
  const [selected, setSelected] = useState<Readathon | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isEntered, setIsEntered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [entering, setEntering] = useState(false);

  const bg = isDark ? 'bg-[#0f1623]' : 'bg-[#F5F0E8]';
  const cardBg = isDark ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20' : 'bg-white border-[#D4A843]/30';
  const textPrimary = isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]';
  const textMuted = isDark ? 'text-[#F5F0E8]/60' : 'text-[#1B2A4A]/60';

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('readathons')
        .select('*')
        .in('status', ['upcoming', 'active', 'completed'])
        .order('start_date', { ascending: false });
      if (data) {
        setReadathons(data);
        // Auto-select the active one if it exists
        const active = data.find((r: Readathon) => r.status === 'active');
        if (active) setSelected(active);
      }
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (!selected) return;
    loadLeaderboard(selected.id);
    if (user) checkEntry(selected.id);
  }, [selected, user]);

  const loadLeaderboard = async (readathonId: string) => {
    const { data } = await supabase
      .from('readathon_progress')
      .select('user_id, pages_logged, profiles(display_name)')
      .eq('readathon_id', readathonId);

    if (!data) return;

    // Sum pages per user
    const totals: Record<string, { display_name: string; pages: number }> = {};
    for (const row of data as any[]) {
      if (!totals[row.user_id]) {
        totals[row.user_id] = {
          display_name: row.profiles?.display_name ?? 'Reader',
          pages: 0,
        };
      }
      totals[row.user_id].pages += row.pages_logged ?? 0;
    }

    const sorted = Object.entries(totals)
      .sort((a, b) => b[1].pages - a[1].pages)
      .map(([user_id, val]) => ({
        user_id,
        display_name: val.display_name,
        total_pages: val.pages,
      }));

    setLeaderboard(sorted);
  };

  const checkEntry = async (readathonId: string) => {
    if (!user) return;
    const { data } = await supabase
      .from('readathon_entries')
      .select('id')
      .eq('readathon_id', readathonId)
      .eq('user_id', user.id)
      .maybeSingle();
    setIsEntered(!!data);
  };

  const handleEnter = () => {
    if (!selected || !user) { navigateTo('/signup'); return; }

    (window as any).__checkoutItem = {
      type: 'readathon_entry',
      label: `Readathon Entry -- ${selected.title}`,
      amount: Math.round(selected.entry_fee * 100),
      metadata: { readathon_id: selected.id },
    };

    (window as any).__pendingSubmission = {
      table: 'readathon_entries',
      data: {
        readathon_id: selected.id,
        user_id: user.id,
        paid_at: new Date().toISOString(),
        status: 'active',
      },
    };

    window.history.pushState({}, '', '/checkout');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const rankLabel = (i: number) => {
    if (i === 0) return '🥇';
    if (i === 1) return '🥈';
    if (i === 2) return '🥉';
    return `#${i + 1}`;
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${bg}`}>
        <div className="w-6 h-6 border-2 border-[#D4A843] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${bg}`}>
      {/* Header */}
      <div className={`border-b ${isDark ? 'border-[#1B2A4A] bg-[#0f1623]' : 'border-[#D4A843]/30 bg-[#F5F0E8]'}`}>
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigateTo('/competitions')} className={`${textMuted} hover:${textPrimary} transition`}>
            <ArrowLeft size={20} />
          </button>
          <h1 className={`font-serif text-xl font-bold ${textPrimary}`}>Readathons</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Readathon selector */}
        {readathons.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {readathons.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
                  selected?.id === r.id
                    ? 'bg-[#D4A843] text-[#1B2A4A] border-[#D4A843]'
                    : `${cardBg} ${textMuted} border-transparent`
                }`}
              >
                {r.title}
              </button>
            ))}
          </div>
        )}

        {selected ? (
          <>
            {/* Competition card */}
            <div className={`rounded-xl border p-6 ${cardBg}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen size={16} className="text-[#D4A843]" />
                    <span className={`text-xs font-semibold uppercase tracking-wide text-[#D4A843]`}>
                      {selected.status === 'active' ? 'Live Now' : selected.status === 'upcoming' ? 'Upcoming' : 'Ended'}
                    </span>
                  </div>
                  <h2 className={`font-serif text-2xl ${textPrimary}`}>{selected.title}</h2>
                  <p className={`text-sm mt-1 ${textMuted}`}>{selected.description}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-5">
                {[
                  { label: 'Entry Fee', value: `$${selected.entry_fee.toFixed(2)}` },
                  { label: 'Prize Pool', value: `$${selected.prize_pool.toFixed(2)}` },
                  { label: 'Ends', value: new Date(selected.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) },
                ].map((stat) => (
                  <div key={stat.label} className={`rounded-lg p-3 text-center ${isDark ? 'bg-[#0f1623]/60' : 'bg-[#F5F0E8]'}`}>
                    <p className="text-[#D4A843] font-bold text-lg">{stat.value}</p>
                    <p className={`text-xs ${textMuted}`}>{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Prize breakdown */}
              <div className={`rounded-lg p-4 mb-5 ${isDark ? 'bg-[#0f1623]/60' : 'bg-[#F5F0E8]'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${textMuted}`}>Prize Breakdown</p>
                <div className="space-y-1">
                  {[
                    { place: '🥇 1st Place', pct: '50%' },
                    { place: '🥈 2nd Place', pct: '30%' },
                    { place: '🥉 3rd Place', pct: '20%' },
                  ].map((row) => (
                    <div key={row.place} className="flex justify-between">
                      <span className={`text-sm ${textPrimary}`}>{row.place}</span>
                      <span className={`text-sm font-semibold text-[#D4A843]`}>
                        {row.pct} of ${(selected.prize_pool * 0.75).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                <p className={`text-xs mt-2 ${textMuted}`}>25% platform fee applied. Payouts within 5 business days of close.</p>
              </div>

              {/* How to win */}
              <div className={`rounded-lg p-4 mb-5 ${isDark ? 'bg-[#0f1623]/60' : 'bg-[#F5F0E8]'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${textMuted}`}>How to Win</p>
                <p className={`text-sm ${textPrimary}`}>
                  Read books from the library and pass their quizzes during the readathon window. Every page from a passed quiz counts toward your total. The reader with the most pages at close wins 1st place.
                </p>
              </div>

              {/* Entry button */}
              {selected.status === 'active' && (
                isEntered ? (
                  <div className="flex items-center gap-2 text-[#D4A843] text-sm font-semibold">
                    <span>✓</span> You're entered -- keep reading to climb the leaderboard!
                  </div>
                ) : (
                  <button
                    onClick={handleEnter}
                    disabled={entering}
                    className="w-full bg-[#D4A843] text-[#1B2A4A] font-semibold py-3 rounded-xl hover:bg-[#c49a3a] transition disabled:opacity-50"
                  >
                    {entering ? 'Processing...' : `Enter for $${selected.entry_fee.toFixed(2)}`}
                  </button>
                )
              )}

              {selected.status === 'upcoming' && (
                <p className={`text-sm text-center ${textMuted}`}>
                  Opens {new Date(selected.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                </p>
              )}
            </div>

            {/* Leaderboard */}
            {leaderboard.length > 0 && (
              <div className={`rounded-xl border p-5 ${cardBg}`}>
                <div className="flex items-center gap-2 mb-4">
                  <Trophy size={16} className="text-[#D4A843]" />
                  <h3 className={`font-serif text-lg ${textPrimary}`}>
                    {selected.status === 'completed' ? 'Final Results' : 'Live Standings'}
                  </h3>
                </div>
                <div className="space-y-2">
                  {leaderboard.slice(0, 10).map((entry, i) => (
                    <div
                      key={entry.user_id}
                      className={`flex items-center justify-between py-2 px-3 rounded-lg ${i < 3 ? 'bg-[#D4A843]/10' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-base w-6 text-center">{rankLabel(i)}</span>
                        <p className={`text-sm font-semibold ${textPrimary}`}>{entry.display_name}</p>
                      </div>
                      <p className={`text-sm font-bold text-[#D4A843]`}>
                        {entry.total_pages.toLocaleString()} pages
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className={`text-center py-16 ${textMuted}`}>
            <BookOpen size={32} className="mx-auto mb-3 opacity-40" />
            <p>No readathons running right now. Check back soon.</p>
          </div>
        )}
      </div>
    </div>
  );
};
