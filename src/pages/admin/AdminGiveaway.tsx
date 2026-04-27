import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { Trophy, Users, DollarSign, Gift, AlertCircle } from 'lucide-react';

interface GiveawayResult {
  giveaway_id: string;
  subscriber_count: number;
  total_revenue: number;
  prize_pool: number;
  first_winner: string;
  first_prize: number;
  second_winner: string;
  second_prize: number;
  third_winner: string;
  third_prize: number;
}

interface WinnerProfile {
  id: string;
  email: string;
  username: string | null;
}

export function AdminGiveaway() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);
  const [running, setRunning]   = useState(false);
  const [result, setResult]     = useState<GiveawayResult | null>(null);
  const [winners, setWinners]   = useState<Record<string, WinnerProfile>>({});
  const [error, setError]       = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const textPrimary = isDark ? 'text-[#F5F0E8]'    : 'text-[#1B2A4A]';
  const textMuted   = isDark ? 'text-[#F5F0E8]/60' : 'text-[#1B2A4A]/60';
  const card        = isDark ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20' : 'bg-white border-[#D4A843]/30';

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_upgraded', true)
      .then(({ count }) => setSubscriberCount(count ?? 0));
  }, []);

  const fetchWinnerProfiles = async (res: GiveawayResult) => {
    const ids = [res.first_winner, res.second_winner, res.third_winner];
    const { data } = await supabase
      .from('profiles')
      .select('id, email, username')
      .in('id', ids);
    if (data) {
      const map: Record<string, WinnerProfile> = {};
      data.forEach(p => { map[p.id] = p; });
      setWinners(map);
    }
  };

  const runGiveaway = async () => {
    setRunning(true);
    setError(null);
    setResult(null);

    const { data, error: rpcError } = await supabase
      .rpc('run_subscriber_giveaway');

    if (rpcError) {
      setError(rpcError.message);
      setRunning(false);
      return;
    }

    setResult(data as GiveawayResult);
    await fetchWinnerProfiles(data as GiveawayResult);
    setRunning(false);
    setConfirmed(false);
  };

  const prizePool    = subscriberCount ? Math.round(subscriberCount * 4.99 * 0.30 * 100) / 100 : 0;
  const totalRevenue = subscriberCount ? Math.round(subscriberCount * 4.99 * 100) / 100 : 0;

  const PLACE_LABELS = ['🥇 1st Place', '🥈 2nd Place', '🥉 3rd Place'];
  const PLACE_KEYS: ('first' | 'second' | 'third')[] = ['first', 'second', 'third'];
  const PLACE_PCT = ['50%', '30%', '20%'];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h2 className={`text-xl font-semibold ${textPrimary}`}>Subscriber Giveaway</h2>
        <p className={`text-sm mt-1 ${textMuted}`}>Monthly cash prize draw for all active subscribers.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: <Users size={18} />,       label: 'Active Subscribers', value: subscriberCount ?? '...' },
          { icon: <DollarSign size={18} />,  label: 'Monthly Revenue',    value: subscriberCount !== null ? `$${totalRevenue.toFixed(2)}` : '...' },
          { icon: <Gift size={18} />,        label: 'Prize Pool (30%)',   value: subscriberCount !== null ? `$${prizePool.toFixed(2)}` : '...' },
        ].map(({ icon, label, value }) => (
          <div key={label} className={`rounded-xl border p-4 flex items-center gap-3 ${card}`}>
            <div className="text-[#D4A843]">{icon}</div>
            <div>
              <p className={`text-xs ${textMuted}`}>{label}</p>
              <p className={`text-lg font-bold ${textPrimary}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Prize breakdown */}
      <div className={`rounded-xl border p-4 ${card}`}>
        <p className={`text-sm font-semibold mb-3 ${textPrimary}`}>Prize Breakdown</p>
        <div className="space-y-2">
          {PLACE_LABELS.map((label, i) => {
            const pct = [0.50, 0.30, 0.20][i];
            const amt = Math.round(prizePool * pct * 100) / 100;
            return (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className={textMuted}>{label} ({PLACE_PCT[i]})</span>
                <span className={`font-semibold ${textPrimary}`}>
                  {subscriberCount !== null ? `$${amt.toFixed(2)}` : '...'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Warning + confirm */}
      {!result && (
        <div className={`rounded-xl border p-4 space-y-4 ${card}`}>
          <div className="flex gap-2 items-start">
            <AlertCircle size={16} className="text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className={`text-sm ${textMuted}`}>
              Running the giveaway is <strong>irreversible</strong>. Winners will be drawn randomly from all
              active subscribers, their balances credited immediately, and in-app + email notifications sent.
              This should only be run once per month.
            </p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={e => setConfirmed(e.target.checked)}
              className="w-4 h-4 accent-[#D4A843]"
            />
            <span className={`text-sm ${textPrimary}`}>I confirm I want to run this month's giveaway</span>
          </label>

          <button
            onClick={runGiveaway}
            disabled={!confirmed || running || (subscriberCount !== null && subscriberCount < 3)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#D4A843] text-[#1B2A4A] hover:bg-[#c49a35] transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trophy size={15} />
            {running ? 'Drawing winners...' : 'Run Monthly Giveaway'}
          </button>

          {subscriberCount !== null && subscriberCount < 3 && (
            <p className="text-xs text-red-400">Need at least 3 subscribers to run the draw.</p>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className={`rounded-xl border p-5 space-y-4 ${card}`}>
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-[#D4A843]" />
            <p className={`font-semibold ${textPrimary}`}>Giveaway Complete!</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PLACE_KEYS.map((place, i) => {
              const winnerId = result[`${place}_winner` as keyof GiveawayResult] as string;
              const prize    = result[`${place}_prize`  as keyof GiveawayResult] as number;
              const profile  = winners[winnerId];
              return (
                <div key={place} className={`rounded-lg border p-3 ${card}`}>
                  <p className="text-lg mb-1">{PLACE_LABELS[i]}</p>
                  <p className={`text-sm font-semibold ${textPrimary}`}>
                    {profile?.username || profile?.email || winnerId}
                  </p>
                  <p className="text-[#D4A843] font-bold text-base mt-1">${prize.toFixed(2)}</p>
                </div>
              );
            })}
          </div>

          <div className={`text-xs ${textMuted} space-y-1`}>
            <p>{result.subscriber_count} subscribers · ${result.total_revenue.toFixed(2)} revenue · ${result.prize_pool.toFixed(2)} prize pool</p>
            <p>Balances credited. Winners notified via in-app notification and email.</p>
          </div>

          <button
            onClick={() => { setResult(null); setWinners({}); setConfirmed(false); }}
            className={`text-xs underline ${textMuted}`}
          >
            Run another draw
          </button>
        </div>
      )}
    </div>
  );
}
