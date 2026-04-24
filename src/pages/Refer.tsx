import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Copy, Check, Gift, Lock } from 'lucide-react';

export const Refer = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();

  const [referralCode, setReferralCode]     = useState('');
  const [copied, setCopied]                 = useState(false);
  const [activeReferrals, setActiveReferrals] = useState(0);
  const [isPaidSubscriber, setIsPaidSubscriber] = useState(false);
  const [loading, setLoading]               = useState(true);

  useEffect(() => { loadReferralData(); }, [user]);

  const loadReferralData = async () => {
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('referral_code, is_paid')
      .eq('id', user.id)
      .single();

    if (!profile) { setLoading(false); return; }

    setIsPaidSubscriber(!!profile.is_paid);

    if (profile.referral_code) {
      setReferralCode(profile.referral_code);

      // Count referred users who are currently active paid subscribers
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .eq('referred_by', profile.referral_code)
        .eq('is_paid', true);

      setActiveReferrals(count ?? 0);
    }

    setLoading(false);
  };

  const referralLink = referralCode
    ? `${window.location.origin}?ref=${referralCode}`
    : '';

  // $0.50/month per active referred subscriber
  const monthlyEarnings = activeReferrals * 0.5;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Shared styles ──────────────────────────────────────────────────────────
  const bg       = isDark ? '#0f172a' : '#F5F0E8';
  const cardBg   = isDark ? '#1e293b' : '#ffffff';
  const cardBorder = isDark ? '#334155' : '#e2d9c8';
  const textPrimary   = isDark ? '#F5F0E8' : '#1B2A4A';
  const textSecondary = isDark ? '#94a3b8' : '#6b7280';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: bg }}>
        <div style={{ color: textPrimary }}>Loading...</div>
      </div>
    );
  }

  // ── Locked state (free users) ──────────────────────────────────────────────
  if (!isPaidSubscriber) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: bg }}>
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <Lock className="w-12 h-12 mx-auto mb-4" style={{ color: '#D4A843' }} />
            <h1 className="font-serif text-3xl mb-2" style={{ color: textPrimary }}>
              Refer a Friend
            </h1>
            <p style={{ color: textSecondary }}>
              The referral program is available to paid subscribers only.
            </p>
          </div>

          <div
            className="rounded-lg border p-8 text-center"
            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
          >
            <p className="text-sm mb-2" style={{ color: textSecondary }}>
              Upgrade to a paid plan to unlock your referral link and earn
            </p>
            <p className="text-2xl font-semibold mb-1" style={{ color: '#D4A843' }}>
              $0.50 / month
            </p>
            <p className="text-sm mb-6" style={{ color: textSecondary }}>
              for every friend who subscribes and stays active
            </p>
            <button
              onClick={() => window.location.href = '/subscribe'}
              className="px-6 py-3 rounded-lg text-sm font-semibold transition"
              style={{ backgroundColor: '#D4A843', color: '#1B2A4A' }}
            >
              Upgrade to Unlock
            </button>

            {/* Preview of what they get */}
            <div className="mt-8 text-left space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: textSecondary }}>
                How it works
              </p>
              {[
                'Get your unique referral link when you subscribe',
                'Share it — anyone who signs up with your link is tracked',
                'When they subscribe to a paid plan and stay active for 30 days, you earn $0.50/month',
                'You keep earning every month they stay subscribed',
                'No cap — refer as many people as you want',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div
                    className="w-5 h-5 rounded-full text-xs flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: 'rgba(212,168,67,0.15)', color: '#D4A843' }}
                  >
                    {i + 1}
                  </div>
                  <p className="text-sm" style={{ color: textSecondary }}>{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Active subscriber view ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ backgroundColor: bg }}>
      <div className="max-w-2xl mx-auto px-4 py-12">

        {/* Header */}
        <div className="mb-8 text-center">
          <Gift className="w-12 h-12 mx-auto mb-4" style={{ color: '#D4A843' }} />
          <h1 className="font-serif text-3xl mb-2" style={{ color: textPrimary }}>
            Refer a Friend
          </h1>
          <p style={{ color: textSecondary }}>
            Earn{' '}
            <span className="font-medium" style={{ color: '#D4A843' }}>$0.50/month</span>
            {' '}for every friend who subscribes and stays active.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div
            className="rounded-lg p-5 text-center border"
            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
          >
            <div className="text-3xl font-serif mb-1" style={{ color: textPrimary }}>
              {activeReferrals}
            </div>
            <div className="text-sm" style={{ color: textSecondary }}>
              active referred subscribers
            </div>
          </div>
          <div
            className="rounded-lg p-5 text-center border"
            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
          >
            <div className="text-3xl font-serif mb-1" style={{ color: '#D4A843' }}>
              ${monthlyEarnings.toFixed(2)}
            </div>
            <div className="text-sm" style={{ color: textSecondary }}>
              earned per month
            </div>
          </div>
        </div>

        {/* Referral link */}
        <div
          className="rounded-lg p-6 border mb-6"
          style={{ backgroundColor: cardBg, borderColor: cardBorder }}
        >
          <label className="block text-sm mb-3" style={{ color: textSecondary }}>
            Your referral link
          </label>
          <div className="flex gap-2">
            <div
              className="flex-1 rounded-lg px-4 py-2.5 text-sm font-mono truncate border"
              style={{
                backgroundColor: isDark ? '#0f172a' : '#F5F0E8',
                borderColor: isDark ? '#475569' : '#d1c9b8',
                color: textSecondary,
              }}
            >
              {referralLink}
            </div>
            <button
              onClick={copyLink}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg transition text-sm font-medium whitespace-nowrap"
              style={{ backgroundColor: '#1B2A4A', color: '#F5F0E8' }}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Payout rules */}
        <div
          className="rounded-lg p-6 border mb-6"
          style={{ backgroundColor: cardBg, borderColor: cardBorder }}
        >
          <h2 className="font-medium mb-4" style={{ color: textPrimary }}>
            Payout rules
          </h2>
          <div className="space-y-3">
            {[
              { label: 'Earnings per referral', value: '$0.50 / month' },
              { label: 'First payout trigger', value: 'Friend active for 30 days' },
              { label: 'Recurring', value: 'Every month friend renews' },
              { label: 'Stops when', value: 'Friend cancels their subscription' },
              { label: 'Fraud hold', value: '30-day review before first credit' },
              { label: 'Referral cap', value: 'None — refer as many as you want' },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex items-center justify-between py-2 px-3 rounded-lg"
                style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
              >
                <span className="text-sm" style={{ color: textSecondary }}>{label}</span>
                <span className="text-sm font-medium" style={{ color: textPrimary }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div
          className="rounded-lg p-6 border"
          style={{ backgroundColor: cardBg, borderColor: cardBorder }}
        >
          <h2 className="font-medium mb-4" style={{ color: textPrimary }}>
            How it works
          </h2>
          <div className="space-y-3">
            {[
              'Share your unique link with a friend',
              'They sign up using your link — their account is tagged to you',
              'When they subscribe to a paid plan and stay active for 30 days, your first $0.50 credit is applied',
              'You earn $0.50 every month they renew',
              'If they cancel, earnings from that referral stop',
              'No limit — refer as many friends as you want',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className="w-5 h-5 rounded-full text-xs flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: 'rgba(212,168,67,0.15)', color: '#D4A843' }}
                >
                  {i + 1}
                </div>
                <p className="text-sm" style={{ color: textSecondary }}>{step}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
