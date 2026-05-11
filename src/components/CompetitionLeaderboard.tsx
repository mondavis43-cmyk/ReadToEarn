import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Trophy, Clock } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface LeaderboardEntry {
  user_id: string;
  display_name: string | null;
  score: number;
  time_spent_ms?: number;
  bingo_count?: number;
  squares_completed?: number;
  round?: number;
  passed?: boolean;
}

interface Props {
  competitionId: string;
  format: 'sprint' | 'readathon' | 'elimination';
  status: 'active' | 'completed';
}

export const CompetitionLeaderboard = ({ competitionId, format, status }: Props) => {
  const { isDark } = useTheme();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [prizePool, setPrizePool] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const cardBg = isDark ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20' : 'bg-white border-[#D4A843]/30';
  const textPrimary = isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]';
  const textMuted = isDark ? 'text-[#F5F0E8]/60' : 'text-[#1B2A4A]/60';

  useEffect(() => {
    load();
    if (status === 'active') {
      const interval = setInterval(load, 30000);
      return () => clearInterval(interval);
    }
  }, [competitionId, format, status]);

  const load = async () => {
    setLoading(true);

    // Fetch prize pool
    const { data: comp } = await supabase
      .from('competitions')
      .select('prize_pool')
      .eq('id', competitionId)
      .single();
    if (comp) setPrizePool(comp.prize_pool ?? 0);

    if (format === 'elimination') {
      const { data } = await supabase
        .from('elimination_progress')
        .select('user_id, round, score, passed, profiles(display_name)')
        .eq('competition_id', competitionId)
        .order('round', { ascending: false })
        .order('score', { ascending: false });

      if (data) {
        const seen = new Set<string>();
        const deduped = data.filter((row: any) => {
          if (seen.has(row.user_id)) return false;
          seen.add(row.user_id);
          return true;
        });
        setEntries(deduped.map((row: any) => ({
          user_id: row.user_id,
          display_name: row.profiles?.display_name ?? 'Reader',
          score: row.score,
          round: row.round,
          passed: row.passed,
        })));
      }

    } else if (format === 'sprint') {
      const { data } = await supabase
        .from('competition_entries')
        .select('user_id, score, time_spent_ms, profiles(display_name)')
        .eq('competition_id', competitionId)
        .order('score', { ascending: false })
        .order('time_spent_ms', { ascending: true });

      if (data) {
        setEntries(data.map((row: any) => ({
          user_id: row.user_id,
          display_name: row.profiles?.display_name ?? 'Reader',
          score: row.score ?? 0,
          time_spent_ms: row.time_spent_ms,
        })));
      }

    } else if (format === 'readathon') {
      const [{ data: bingos }, { data: completions }] = await Promise.all([
        supabase.from('readathon_bingos').select('user_id, profiles(display_name)').eq('readathon_id', competitionId),
        supabase.from('readathon_completions').select('user_id').eq('readathon_id', competitionId),
      ]);

      const totals: Record<string, { display_name: string; bingo_count: number; squares_completed: number }> = {};
      for (const row of (bingos ?? []) as any[]) {
        if (!totals[row.user_id]) totals[row.user_id] = { display_name: row.profiles?.display_name ?? 'Reader', bingo_count: 0, squares_completed: 0 };
        totals[row.user_id].bingo_count += 1;
      }
      for (const row of (completions ?? []) as any[]) {
        if (!totals[row.user_id]) totals[row.user_id] = { display_name: 'Reader', bingo_count: 0, squares_completed: 0 };
        totals[row.user_id].squares_completed += 1;
      }

      const sorted = Object.entries(totals)
        .sort(([, a], [, b]) => b.bingo_count !== a.bingo_count ? b.bingo_count - a.bingo_count : b.squares_completed - a.squares_completed)
        .map(([user_id, val]) => ({
          user_id,
          display_name: val.display_name,
          score: val.bingo_count,
          bingo_count: val.bingo_count,
          squares_completed: val.squares_completed,
        }));
      setEntries(sorted);
    }

    setLastUpdated(new Date());
    setLoading(false);
  };

  const rankLabel = (i: number) => {
    if (i === 0) return '🥇';
    if (i === 1) return '🥈';
    if (i === 2) return '🥉';
    return `#${i + 1}`;
  };

  const formatTime = (ms?: number) => {
    if (!ms) return '--';
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const subLabel = (entry: LeaderboardEntry) => {
    if (format === 'sprint') return `Score: ${entry.score}/10 · Time: ${formatTime(entry.time_spent_ms)}`;
    if (format === 'readathon') return `${entry.bingo_count ?? 0} ${(entry.bingo_count ?? 0) === 1 ? 'Bingo' : 'Bingos'} · ${entry.squares_completed ?? 0} square${(entry.squares_completed ?? 0) !== 1 ? 's' : ''}`;
    if (format === 'elimination') return `Round ${entry.round} · ${entry.passed ? 'Advanced' : 'Eliminated'}`;
    return '';
  };

  const getPrize = (rank: number): string => {
    if (prizePool <= 0) return '';
    if (format === 'sprint') return rank === 0 ? `$${prizePool.toFixed(2)}` : '';
    const splits: Record<number, number> = { 0: 0.5, 1: 0.3, 2: 0.2 };
    const pct = splits[rank];
    return pct ? `$${(prizePool * pct).toFixed(2)}` : '';
  };

  if (loading) return (
    <div className={`rounded-xl border p-5 mb-6 animate-pulse ${cardBg}`}>
      <div className="h-5 w-32 bg-gray-700/40 rounded mb-4" />
      {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-gray-700/40 rounded-lg mb-2" />)}
    </div>
  );

  if (entries.length === 0) return (
    <div className={`rounded-xl border p-5 mb-6 ${cardBg}`}>
      <div className="flex items-center gap-2 mb-2">
        <Trophy size={16} className="text-[#D4A843]" />
        <h3 className={`font-serif text-lg ${textPrimary}`}>
          {status === 'completed' ? 'Final Results' : 'Live Standings'}
        </h3>
      </div>
      <p className={`text-sm ${textMuted}`}>No submissions yet. Be the first on the board.</p>
    </div>
  );

  return (
    <div className={`rounded-xl border p-5 mb-6 ${cardBg}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-[#D4A843]" />
          <h3 className={`font-serif text-lg ${textPrimary}`}>
            {status === 'completed' ? 'Final Results' : 'Live Standings'}
          </h3>
          {status === 'active' && (
            <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full">
              Live
            </span>
          )}
        </div>
        {lastUpdated && status === 'active' && (
          <div className={`flex items-center gap-1 text-xs ${textMuted}`}>
            <Clock size={11} />
            {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>

      {/* Prize pool */}
      {prizePool > 0 && (
        <div className="bg-[#D4A843]/10 border border-[#D4A843]/20 rounded-lg p-3 mb-4 flex items-center justify-between">
          <span className={`text-sm ${textMuted}`}>Prize Pool</span>
          <span className="text-[#D4A843] font-bold">${prizePool.toFixed(2)}</span>
        </div>
      )}

      {/* Entries */}
      <div className="space-y-2">
        {entries.slice(0, 10).map((entry, i) => {
          const prize = getPrize(i);
          return (
            <div
              key={entry.user_id}
              className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                i < 3 ? 'bg-[#D4A843]/10' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-base w-6 text-center">{rankLabel(i)}</span>
                <div>
                  <p className={`text-sm font-semibold ${textPrimary}`}>{entry.display_name}</p>
                  <p className={`text-xs ${textMuted}`}>{subLabel(entry)}</p>
                </div>
              </div>
              {prize && (
                <span className="text-xs font-bold text-[#D4A843] bg-[#D4A843]/10 px-2 py-0.5 rounded-full">
                  {prize}
                </span>
              )}
            </div>
          );
        })}
        {entries.length > 10 && (
          <p className={`text-xs text-center pt-1 ${textMuted}`}>
            + {entries.length - 10} more participants
          </p>
        )}
      </div>

      {/* Winner banner */}
      {status === 'completed' && entries.length > 0 && (
        <div className="mt-4 bg-[#D4A843]/10 border border-[#D4A843]/30 rounded-lg p-3 text-center">
          <p className="text-[#D4A843] font-bold text-sm">
            🏆 {entries[0].display_name} wins {getPrize(0)}
          </p>
          {format !== 'sprint' && entries[1] && (
            <p className={`text-xs mt-1 ${textMuted}`}>
              2nd: {entries[1].display_name} {getPrize(1) && `(${getPrize(1)})`}
              {entries[2] && ` · 3rd: ${entries[2].display_name} ${getPrize(2) ? `(${getPrize(2)})` : ''}`}
            </p>
          )}
        </div>
      )}

      {status === 'active' && (
        <p className={`text-xs text-center mt-3 ${textMuted}`}>Updates every 30 seconds</p>
      )}
    </div>
  );
};
