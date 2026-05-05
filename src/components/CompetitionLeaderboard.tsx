import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Trophy } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface LeaderboardEntry {
  user_id: string;
  display_name: string | null;
  score: number;
  time_spent_ms?: number;   // sprint only
  pages_read?: number;       // readathon only
  round?: number;            // elimination only
  passed?: boolean;          // elimination only
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

  const cardBg = isDark ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20' : 'bg-white border-[#D4A843]/30';
  const textPrimary = isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]';
  const textMuted = isDark ? 'text-[#F5F0E8]/60' : 'text-[#1B2A4A]/60';

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      if (format === 'elimination') {
        // Rank by highest round reached, then by score within that round
        const { data } = await supabase
          .from('elimination_progress')
          .select('user_id, round, score, passed, profiles(display_name)')
          .eq('competition_id', competitionId)
          .order('round', { ascending: false })
          .order('score', { ascending: false });

        if (data) {
          // Deduplicate: keep each user's best (highest) round entry
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
        // Rank by highest score first, then fastest time (lowest ms) as tiebreaker
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
        // Rank by most pages read from passed quizzes
        const { data } = await supabase
          .from('readathon_progress')
          .select('user_id, pages_logged, profiles(display_name)')
          .eq('competition_id', competitionId);

        if (data) {
          // Sum pages per user
          const totals: Record<string, { display_name: string; pages: number }> = {};
          for (const row of data as any[]) {
            if (!totals[row.user_id]) {
              totals[row.user_id] = { display_name: row.profiles?.display_name ?? 'Reader', pages: 0 };
            }
            totals[row.user_id].pages += row.pages_logged ?? 0;
          }
          const sorted = Object.entries(totals)
            .sort((a, b) => b[1].pages - a[1].pages)
            .map(([user_id, val]) => ({
              user_id,
              display_name: val.display_name,
              score: val.pages,
              pages_read: val.pages,
            }));
          setEntries(sorted);
        }
      }

      setLoading(false);
    };

    load();
  }, [competitionId, format]);

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

  const subLabel = (entry: LeaderboardEntry, i: number) => {
    if (format === 'sprint') return `Score: ${entry.score}/10 · Time: ${formatTime(entry.time_spent_ms)}`;
    if (format === 'readathon') return `${entry.pages_read?.toLocaleString()} pages read`;
    if (format === 'elimination') return `Round ${entry.round} · ${entry.passed ? 'Advanced' : 'Eliminated'}`;
    return '';
  };

  if (loading) return null;
  if (entries.length === 0) return null;

  return (
    <div className={`rounded-xl border p-5 mb-6 ${cardBg}`}>
      <div className="flex items-center gap-2 mb-4">
        <Trophy size={16} className="text-[#D4A843]" />
        <h3 className={`font-serif text-lg ${textPrimary}`}>
          {status === 'completed' ? 'Final Results' : 'Live Standings'}
        </h3>
      </div>
      <div className="space-y-2">
        {entries.slice(0, 10).map((entry, i) => (
          <div
            key={entry.user_id}
            className={`flex items-center justify-between py-2 px-3 rounded-lg ${
              i < 3 ? 'bg-[#D4A843]/10' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-base w-6 text-center">{rankLabel(i)}</span>
              <div>
                <p className={`text-sm font-semibold ${textPrimary}`}>
                  {entry.display_name}
                </p>
                <p className={`text-xs ${textMuted}`}>{subLabel(entry, i)}</p>
              </div>
            </div>
          </div>
        ))}
        {entries.length > 10 && (
          <p className={`text-xs text-center pt-1 ${textMuted}`}>
            + {entries.length - 10} more participants
          </p>
        )}
      </div>
    </div>
  );
};
