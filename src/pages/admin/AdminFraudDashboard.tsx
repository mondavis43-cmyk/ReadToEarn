import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { AlertTriangle, Users, Zap, Clock } from 'lucide-react';

interface FlaggedUser {
  user_id: string;
  email: string;
  flag_reasons: string[];
  flagged_at: string;
  total_earned: number;
  cashout_requested: boolean;
}

interface SharedIPGroup {
  ip_address: string;
  user_count: number;
  users: { user_id: string; email: string; attempted_at: string }[];
}

interface SuspiciousAttempt {
  id: string;
  user_id: string;
  email: string;
  book_id: string;
  score: number;
  passed: boolean;
  attempted_at: string;
  ip_address: string;
}

interface NewAccountCashout {
  user_id: string;
  email: string;
  account_age_days: number;
  cashout_amount: number;
  requested_at: string;
}

export function AdminFraudDashboard() {
  const [flaggedUsers, setFlaggedUsers] = useState<FlaggedUser[]>([]);
  const [sharedIPs, setSharedIPs] = useState<SharedIPGroup[]>([]);
  const [suspiciousAttempts, setSuspiciousAttempts] = useState<SuspiciousAttempt[]>([]);
  const [newAccountCashouts, setNewAccountCashouts] = useState<NewAccountCashout[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'flagged' | 'ips' | 'speed' | 'cashouts'>('flagged');

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    await Promise.all([
      loadFlaggedUsers(),
      loadSharedIPs(),
      loadSuspiciousAttempts(),
      loadNewAccountCashouts(),
    ]);
    setLoading(false);
  }

  async function loadFlaggedUsers() {
    // Users with flagged payout_logs entries
    const { data } = await supabase
      .from('payout_logs')
      .select('user_id, status, reason, created_at, amount, profiles(email, available_balance)')
      .eq('status', 'flagged')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!data) return;

    // Group by user
    const grouped: Record<string, FlaggedUser> = {};
    for (const row of data) {
      const profile = row.profiles as any;
      if (!grouped[row.user_id]) {
        grouped[row.user_id] = {
          user_id: row.user_id,
          email: profile?.email ?? 'unknown',
          flag_reasons: [],
          flagged_at: row.created_at,
          total_earned: 0,
          cashout_requested: false,
        };
      }
      if (row.reason && !grouped[row.user_id].flag_reasons.includes(row.reason)) {
        grouped[row.user_id].flag_reasons.push(row.reason);
      }
      grouped[row.user_id].total_earned += row.amount ?? 0;
    }

    // Check cashout requests
    const userIds = Object.keys(grouped);
    if (userIds.length > 0) {
      const { data: cashouts } = await supabase
        .from('cashout_requests')
        .select('user_id')
        .in('user_id', userIds);
      if (cashouts) {
        for (const c of cashouts) {
          if (grouped[c.user_id]) grouped[c.user_id].cashout_requested = true;
        }
      }
    }

    setFlaggedUsers(Object.values(grouped).sort((a, b) =>
      new Date(b.flagged_at).getTime() - new Date(a.flagged_at).getTime()
    ));
  }

  async function loadSharedIPs() {
    // Find IPs with 3+ distinct users in last 7 days
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const { data } = await supabase
      .from('quiz_attempts')
      .select('ip_address, user_id, attempted_at, profiles(email)')
      .neq('ip_address', 'unknown')
      .gte('attempted_at', since)
      .order('attempted_at', { ascending: false });

    if (!data) return;

    const ipMap: Record<string, { user_id: string; email: string; attempted_at: string }[]> = {};
    for (const row of data) {
      if (!row.ip_address) continue;
      if (!ipMap[row.ip_address]) ipMap[row.ip_address] = [];
      const profile = row.profiles as any;
      const existing = ipMap[row.ip_address].find(u => u.user_id === row.user_id);
      if (!existing) {
        ipMap[row.ip_address].push({
          user_id: row.user_id,
          email: profile?.email ?? 'unknown',
          attempted_at: row.attempted_at,
        });
      }
    }

    const groups: SharedIPGroup[] = Object.entries(ipMap)
      .filter(([, users]) => users.length >= 3)
      .map(([ip, users]) => ({ ip_address: ip, user_count: users.length, users }))
      .sort((a, b) => b.user_count - a.user_count);

    setSharedIPs(groups);
  }

  async function loadSuspiciousAttempts() {
    // Perfect score passed attempts -- we flag by checking payout_logs reason
    const { data } = await supabase
      .from('payout_logs')
      .select('user_id, created_at, profiles(email)')
      .in('reason', ['suspicious_speed', 'suspicious_speed_and_shared_ip'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (!data) return;

    // Get their quiz attempts
    const userIds = [...new Set(data.map(r => r.user_id))];
    if (userIds.length === 0) return;

    const { data: attempts } = await supabase
      .from('quiz_attempts')
      .select('id, user_id, book_id, score, passed, attempted_at, ip_address, profiles(email)')
      .in('user_id', userIds)
      .eq('passed', true)
      .order('attempted_at', { ascending: false })
      .limit(100);

    if (!attempts) return;

    setSuspiciousAttempts(attempts.map(a => ({
      id: a.id,
      user_id: a.user_id,
      email: (a.profiles as any)?.email ?? 'unknown',
      book_id: a.book_id,
      score: a.score,
      passed: a.passed,
      attempted_at: a.attempted_at,
      ip_address: a.ip_address ?? 'unknown',
    })));
  }

  async function loadNewAccountCashouts() {
    // Cashout requests from accounts under 7 days old
    const { data } = await supabase
      .from('cashout_requests')
      .select('user_id, amount, created_at, profiles(email, created_at)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!data) return;

    const results: NewAccountCashout[] = [];
    for (const row of data) {
      const profile = row.profiles as any;
      if (!profile?.created_at) continue;
      const accountAgeDays = Math.floor(
        (new Date(row.created_at).getTime() - new Date(profile.created_at).getTime()) / 86_400_000
      );
      if (accountAgeDays < 7) {
        results.push({
          user_id: row.user_id,
          email: profile.email ?? 'unknown',
          account_age_days: accountAgeDays,
          cashout_amount: row.amount,
          requested_at: row.created_at,
        });
      }
    }
    setNewAccountCashouts(results);
  }

  async function clearFlag(userId: string) {
    await supabase
      .from('profiles')
      .update({ requires_tax_review: false })
      .eq('id', userId);
    await loadFlaggedUsers();
  }

  const tabs = [
    { key: 'flagged', label: 'Flagged Users', icon: AlertTriangle, count: flaggedUsers.length },
    { key: 'ips', label: 'Shared IPs', icon: Users, count: sharedIPs.length },
    { key: 'speed', label: 'Speed Flags', icon: Zap, count: suspiciousAttempts.length },
    { key: 'cashouts', label: 'New Acct Cashouts', icon: Clock, count: newAccountCashouts.length },
  ] as const;

  const inputClass = 'bg-[#1B2A4A] border border-[#D4A843]/30 rounded px-3 py-2 text-[#F5F0E8] text-sm';

  return (
    <div className="min-h-screen bg-[#0D1B2A] text-[#F5F0E8] p-6">
      <h1 className="text-2xl font-bold text-[#D4A843] mb-6">Fraud Dashboard</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === key
                ? 'bg-[#D4A843] text-[#0D1B2A]'
                : 'bg-[#1B2A4A] text-[#F5F0E8] hover:bg-[#1B2A4A]/80'
            }`}
          >
            <Icon size={14} />
            {label}
            {count > 0 && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                activeTab === key ? 'bg-[#0D1B2A] text-[#D4A843]' : 'bg-red-500 text-white'
              }`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-[#F5F0E8]/50 text-center py-12">Loading...</div>
      ) : (
        <>
          {/* Flagged Users */}
          {activeTab === 'flagged' && (
            <div className="space-y-3">
              {flaggedUsers.length === 0 && (
                <p className="text-[#F5F0E8]/50 text-center py-12">No flagged users.</p>
              )}
              {flaggedUsers.map(u => (
                <div key={u.user_id} className="bg-[#1B2A4A] rounded-lg p-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-[#F5F0E8]">{u.email}</p>
                    <p className="text-xs text-[#F5F0E8]/50 mt-0.5">
                      Flagged {new Date(u.flagged_at).toLocaleDateString()} &middot; Earned ${u.total_earned.toFixed(2)}
                      {u.cashout_requested && (
                        <span className="ml-2 text-red-400 font-semibold">⚠ Cashout requested</span>
                      )}
                    </p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {u.flag_reasons.map(r => (
                        <span key={r} className="bg-red-500/20 text-red-300 text-xs px-2 py-0.5 rounded-full">
                          {r.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => clearFlag(u.user_id)}
                    className="text-xs bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded shrink-0"
                  >
                    Clear Flag
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Shared IPs */}
          {activeTab === 'ips' && (
            <div className="space-y-4">
              {sharedIPs.length === 0 && (
                <p className="text-[#F5F0E8]/50 text-center py-12">No shared IPs detected in the last 7 days.</p>
              )}
              {sharedIPs.map(group => (
                <div key={group.ip_address} className="bg-[#1B2A4A] rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-mono text-[#D4A843] text-sm">{group.ip_address}</span>
                    <span className="bg-red-500/20 text-red-300 text-xs px-2 py-0.5 rounded-full">
                      {group.user_count} accounts
                    </span>
                  </div>
                  <div className="space-y-1">
                    {group.users.map(u => (
                      <div key={u.user_id} className="flex justify-between text-sm text-[#F5F0E8]/70">
                        <span>{u.email}</span>
                        <span className="text-xs text-[#F5F0E8]/40">
                          {new Date(u.attempted_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Speed Flags */}
          {activeTab === 'speed' && (
            <div className="space-y-3">
              {suspiciousAttempts.length === 0 && (
                <p className="text-[#F5F0E8]/50 text-center py-12">No suspicious speed patterns detected.</p>
              )}
              {suspiciousAttempts.map(a => (
                <div key={a.id} className="bg-[#1B2A4A] rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-[#F5F0E8]">{a.email}</p>
                      <p className="text-xs text-[#F5F0E8]/50 mt-0.5">
                        Score: {a.score}/10 &middot; {new Date(a.attempted_at).toLocaleString()}
                      </p>
                      <p className="text-xs text-[#F5F0E8]/40 font-mono mt-0.5">IP: {a.ip_address}</p>
                    </div>
                    <span className="bg-yellow-500/20 text-yellow-300 text-xs px-2 py-0.5 rounded-full shrink-0">
                      Perfect + Fast
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* New Account Cashouts */}
          {activeTab === 'cashouts' && (
            <div className="space-y-3">
              {newAccountCashouts.length === 0 && (
                <p className="text-[#F5F0E8]/50 text-center py-12">No cashout requests from new accounts.</p>
              )}
              {newAccountCashouts.map(c => (
                <div key={c.user_id} className="bg-[#1B2A4A] rounded-lg p-4 flex justify-between items-start">
                  <div>
                    <p className="font-medium text-[#F5F0E8]">{c.email}</p>
                    <p className="text-xs text-[#F5F0E8]/50 mt-0.5">
                      Account age: <span className="text-red-400 font-semibold">{c.account_age_days} days</span>
                      &middot; Requesting ${c.cashout_amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-[#F5F0E8]/40 mt-0.5">
                      {new Date(c.requested_at).toLocaleString()}
                    </p>
                  </div>
                  <span className="bg-red-500/20 text-red-300 text-xs px-2 py-0.5 rounded-full shrink-0">
                    New Account
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
