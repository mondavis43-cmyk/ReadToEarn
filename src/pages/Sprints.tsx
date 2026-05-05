import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../hooks/useNavigate';
import { useTheme } from '../contexts/ThemeContext';
import { Zap, Trophy, ArrowLeft } from 'lucide-react';

interface Sprint {
  id: string;
  title: string;
  description: string;
  book_id: string;
  book_title: string;
  book_author: string;
  entry_fee: number;
  prize_pool: number;
  status: 'upcoming' | 'active' | 'completed';
  start_date: string;
  end_date: string;
}

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  score: number;
  time_spent_ms: number;
}

export const Sprints = () => {
  const { user } = useAuth();
  const { navigateTo } = useNavigate();
  const { isDark } = useTheme();

  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selected, setSelected] = useState<Sprint | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isEntered, setIsEntered] = useState(false);
  const [loading, setLoading] = useState(true);

  const bg = isDark ? 'bg-[#0f1623]' : 'bg-[#F5F0E8]';
  const cardBg = isDark ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20' : 'bg-white border-[#D4A843]/30';
  const textPrimary = isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]';
  const textMuted = isDark ? 'text-[#F5F0E8]/60' : 'text-[#1B2A4A]/60';

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('sprints')
        .select('*')
        .in('status', ['upcoming', 'active', 'completed'])
        .order('start_date', { ascending: false });
      if (data) {
        setSprints(data);
        const active = data.find((s: Sprint) => s.status === 'active');
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

  const loadLeaderboard = async (sprintId: string) => {
    // Rank: highest score first, fastest time as tiebreaker
    const { data } = await supabase
      .from('sprint_entries')
      .select('user_id, score, time_spent_ms, profiles(display_name)')
      .eq('sprint_id', sprintId)
      .order('score', { ascending: false })
      .order('time_spent_ms', { ascending: true });

    if (data) {
      setLeaderboard(data.map((row: any) => ({
        user_id: row.user_id,
        display_name: row.profiles?.display_name ?? 'Reader',
        score: row.score ?? 0,
        time_spent_ms: row.time_spent_ms ?? 0,
      })));
    }
  };

  const checkEntry = async (sprintId: string) => {
    if (!user) return;
    const { data } = await supabase
      .from('sprint_entries')
      .select('id')
      .eq('sprint_id', sprintId)
      .eq('user_id', user.id)
      .maybeSingle();
    setIsEntered(!!data);
  };

  const handleEnter = () => {
    if (!selected || !user) { navigateTo('/signup'); return; }

    (window as any).__checkoutItem = {
      type: 'sprint_entry',
      label: `Sprint Entry -- ${selected.title}`,
      amount: Math.round(selected.entry_fee * 100),
      metadata: { sprint_id: selected.id },
    };

    (window as any).__pendingSubmission = {
      table: 'sprint_entries',
      data: {
        sprint_id: selected.id,
        user_id: user.id,
        paid_at: new Date().toISOString(),
        status: 'active',
        score: null,
        time_spent_ms: null,
      },
    };

    window.history.pushState({}, '', '/checkout');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleTakeQuiz = () => {
    if (!selected) return;
    navigateTo(`/quiz/${selected.book_id}?sprint_id=${selected.id}`);
  };

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
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
      <div className={`border-b ${isDark ? 'border-[#1B2A4A] bg-[#0f1623]' : 'border-[#D4A843]/30 bg-[#F5F0E8]'}`}>
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigateTo('/competitions')} className={`${textMuted} hover:${textPrimary} transition`}>
            <ArrowLeft size={20} />
          </button>
          <h1 className={`font-serif text-xl font-bold ${textPrimary}`}>Sprints</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {sprints.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {sprints.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelected(s)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
                  selected?.id === s.id
                    ? 'bg-[#D4A843] text-[#1B2A4A] border-[#D4A843]'
                    : `${cardBg} ${textMuted} border-transparent`
                }`}
              >
                {s.title}
              </button>
            ))}
          </div>
        )}

        {selected ? (
          <>
            <div className={`rounded-xl border p-6 ${cardBg}`}>
              <div className="flex items-center gap-2 mb-1">
                <Zap size={16} className="text-[#D4A843]" />
                <span className="text-xs font-semibold uppercase tracking-wide text-[#D4A843]">
                  {selected.status === 'active' ? 'Live Now' : selected.status === 'upcoming' ? 'Upcoming' : 'Ended'}
                </span>
              </div>
              <h2 className={`font-serif text-2xl mb-1 ${textPrimary}`}>{selected.title}</h2>
              <p className={`text-sm mb-4 ${textMuted}`}>{selected.description}</p>

              {/* Book */}
              <div className={`rounded-lg p-4 mb-4 ${isDark ? 'bg-[#0f1623]/60' : 'bg-[#F5F0E8]'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${textMuted}`}>This Sprint's Book</p>
                <p className={`text-sm font-semibold ${textPrimary}`}>{selected.book_title}</p>
                <p className={`text-xs ${textMuted}`}>by {selected.book_author}</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-4">
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

              {/* How to win */}
              <div className={`rounded-lg p-4 mb-5 ${isDark ? 'bg-[#0f1623]/60' : 'bg-[#F5F0E8]'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${textMuted}`}>How to Win</p>
                <p className={`text-sm ${textPrimary}`}>
                  Take the quiz for <strong>{selected.book_title}</strong>. The reader with the highest score and fastest completion time wins. Winner takes the entire prize pool (after 25% platform fee).
                </p>
              </div>

              {/* CTA */}
              {selected.status === 'active' && (
                isEntered ? (
                  <button
                    onClick={handleTakeQuiz}
                    className="w-full bg-[#D4A843] text-[#1B2A4A] font-semibold py-3 rounded-xl hover:bg-[#c49a3a] transition"
                  >
                    Take the Quiz
                  </button>
                ) : (
                  <button
                    onClick={handleEnter}
                    className="w-full bg-[#D4A843] text-[#1B2A4A] font-semibold py-3 rounded-xl hover:bg-[#c49a3a] transition"
                  >
                    Enter for ${selected.entry_fee.toFixed(2)}
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
                      <div className="text-right">
                        <p className={`text-sm font-bold text-[#D4A843]`}>{entry.score}/10</p>
                        <p className={`text-xs ${textMuted}`}>{formatTime(entry.time_spent_ms)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className={`text-center py-16 ${textMuted}`}>
            <Zap size={32} className="mx-auto mb-3 opacity-40" />
            <p>No sprints running right now. Check back soon.</p>
          </div>
        )}
      </div>
    </div>
  );
};
