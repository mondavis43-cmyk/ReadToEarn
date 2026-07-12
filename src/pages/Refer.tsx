import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Copy, Check, Gift, Lock, Users, Wallet } from 'lucide-react';

const PLANS = [
  {
    key: 'monthly',
    label: 'Monthly',
    price: 4.99,
    cents: 499,
    period: '/month',
    description: 'Billed monthly. Cancel anytime.',
  },
  {
    key: 'annual',
    label: 'Annual',
    price: 49.90,
    cents: 4990,
    period: '/year',
    description: 'Billed once a year. Save ~17%.',
    badge: 'Best Value',
  },
];

export const Refer = () => {
  const { user }   = useAuth();
  const { isDark } = useTheme();

  const [referralCode, setReferralCode]         = useState('');
  const [copied, setCopied]                     = useState(false);
  const [activeReferrals, setActiveReferrals]   = useState(0);
  const [isPaidSubscriber, setIsPaidSubscriber] = useState(false);
  const [loading, setLoading]                   = useState(true);
  const [selectedPlan, setSelectedPlan]         = useState(PLANS[0]);
  const [referredUsers, setReferredUsers]       = useState<any[]>([]);
  const [totalEarned, setTotalEarned]           = useState(0);
  const [availableBalance, setAvailableBalance] = useState(0);

  useEffect(() => { loadReferralData(); }, [user]);

  const loadReferralData = async () => {
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('referral_code, is_upgraded, available_balance')
      .eq('id', user.id)
      .single();

    if (!profile) { setLoading(false); return; }

    setIsPaidSubscriber(!!profile.is_upgraded);
    setAvailableBalance(profile.available_balance ?? 0);

    if (profile.referral_code) {
      setReferralCode(profile.referral_code);

      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .eq('referred_by', profile.referral_code)
        .eq('is_upgraded', true);

      setActiveReferrals(count ?? 0);

      const { data: referred } = await supabase
        .from('profiles')
        .select('email, is_upgraded, created_at')
        .eq('referred_by', profile.referral_code);

      setReferredUsers(referred ?? []);

      const { data: calcs } = await supabase
        .from('referral_calculations')
        .select('amount')
        .eq('referrer_id', user.id);

      const earned = calcs?.reduce((sum, c) => sum + (c.amount || 0), 0) ?? 0;
      setTotalEarned(earned);
    }

    setLoading(false);
  };

  const referralLink = referralCode
    ? `${window.location.origin}?ref=${referralCode}`
    : '';

  const monthlyProjected = activeReferrals * 0.5;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpgrade = () => {
    sessionStorage.setItem('checkoutItem', JSON.stringify({
      type:   'subscription',
      label:  `RTE ${selectedPlan.label} Subscription`,
      amount: selectedPlan.cents,
      metadata: {
        plan:    selectedPlan.key,
        user_id: user?.id,
      },
    }));

    sessionStorage.setItem('pendingSubmission', JSON.stringify({
      table: 'profiles',
      data: {
        id:          user?.id,
        is_upgraded: true,
        plan:        selectedPlan.key,
      },
      upsert: true,
    }));

    window.history.pushState({}, '', '/checkout');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  // theme tokens
  const textPrimary = isDark ? 'text-[#F5F0E8]'    : 'text-[#1B2A4A]';
  const textMuted   = isDark ? 'text-[#F5F0E8]/70' : 'text-[#1B2A4A]/70';
  const cardBg      = isDark
    ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20'
    : 'bg-white border-[#D4A843]/30';
  const bg          = isDark ? 'bg-[#0f1623]' : 'bg-[#F5F0E8]';
  const divider     = isDark ? 'border-[#F5F0E8]/10' : 'border-[#1B2A4A]/10';

  // ── COMING SOON GATE ─────────────────────────────────────────────────────────
const FEATURE_HIDDEN = false;

if (FEATURE_HIDDEN) {
  return (
    <div className={`min-h-screen ${bg} flex items-center justify-center transition-colors duration-300`}>
      <div className="max-w-md mx-auto px-4 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[#D4A843]/15 flex items-center justify-center">
            <Gift className="text-[#D4A843] w-7 h-7" />
          </div>
        </div>
        <h1 className={`font-serif text-4xl mb-3 ${textPrimary}`}>Refer a Friend</h1>
        <p className={`text-sm ${textMuted}`}>
          Our referral program is coming soon. Refer friends and earn $0.50/month
          for every active subscriber you bring in — no cap.
        </p>
        <p className={`text-xs mt-4 ${textMuted}`}>Stay tuned.</p>
      </div>
    </div>
  );
}

  if (loading) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center`}>
        <p className={`text-sm ${textMuted}`}>Loading...</p>
      </div>
    );
  }

  // ── LOCKED STATE ─────────────────────────────────────────────────────────────
  if (!isPaidSubscriber) {
    return (
      <div className={`min-h-screen ${bg} transition-colors duration-300`}>
        <div className="max-w-2xl mx-auto px-4 py-16">

          {/* Title */}
          <div className="text-center mb-10">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-[#D4A843]/15 flex items-center justify-center">
                <Lock className="text-[#D4A843] w-7 h-7" />
              </div>
            </div>
            <h1 className={`font-serif text-4xl mb-3 ${textPrimary}`}>Refer a Friend</h1>
            <p className={`text-sm ${textMuted}`}>
              The referral program is available to paid subscribers only.
              Upgrade to unlock your referral link and earn $0.50/month per active referral.
            </p>
          </div>

          {/* Plan picker */}
          <div className={`rounded-xl border p-6 mb-6 ${cardBg}`}>
            <h2 className={`font-serif text-xl mb-4 ${textPrimary}`}>Choose a Plan</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {PLANS.map(plan => (
                <button
                  key={plan.key}
                  type="button"
                  onClick={() => setSelectedPlan(plan)}
                  className={`relative p-5 rounded-xl border text-left transition-colors ${
                    selectedPlan.key === plan.key
                      ? 'border-[#D4A843] bg-[#D4A843]/10'
                      : isDark
                        ? 'border-[#F5F0E8]/10 hover:border-[#D4A843]/40'
                        : 'border-[#1B2A4A]/10 hover:border-[#D4A843]/40'
                  }`}
                >
                  {plan.badge && (
                    <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wide bg-[#D4A843] text-[#1B2A4A] px-2 py-0.5 rounded-full">
                      {plan.badge}
                    </span>
                  )}
                  <p className={`font-bold text-lg ${textPrimary}`}>
                    ${plan.price.toFixed(2)}
                    <span className={`text-sm font-normal ml-1 ${textMuted}`}>{plan.period}</span>
                  </p>
                  <p className={`text-sm font-semibold mt-0.5 ${textPrimary}`}>{plan.label}</p>
                  <p className={`text-xs mt-1 ${textMuted}`}>{plan.description}</p>
                </button>
              ))}
            </div>

            <button
              onClick={handleUpgrade}
              className="w-full bg-[#D4A843] text-[#1B2A4A] font-semibold py-4 rounded-xl hover:bg-[#c49a3a] transition text-base"
            >
              Upgrade to Unlock — ${selectedPlan.price.toFixed(2)}{selectedPlan.period}
            </button>
            <p className={`text-xs text-center mt-3 ${textMuted}`}>
              Secure checkout. Your referral dashboard unlocks immediately after payment.
            </p>
          </div>

          {/* How it works preview */}
          <div className={`rounded-xl border p-6 ${cardBg}`}>
            <h2 className={`font-serif text-xl mb-4 ${textPrimary}`}>How It Works</h2>
            <ol className="space-y-3">
              {[
                'Upgrade to a paid subscription to unlock your unique referral link.',
                'Share your link with friends, readers, and your community.',
                'When someone signs up and subscribes using your link, you earn $0.50/month.',
                'Earnings are recurring — as long as they stay subscribed, you keep earning.',
                'Payouts are processed monthly to your connected account.',
                'No cap on referrals. The more you refer, the more you earn.',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#D4A843]/20 text-[#D4A843] text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <p className={`text-sm ${textMuted}`}>{step}</p>
                </li>
              ))}
            </ol>
          </div>

        </div>
      </div>
    );
  }

  // ── ACTIVE SUBSCRIBER VIEW ────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300`}>
      <div className="max-w-2xl mx-auto px-4 py-12">

        {/* Title */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <Gift className="text-[#D4A843] w-6 h-6" />
            <h1 className={`font-serif text-4xl ${textPrimary}`}>Refer a Friend</h1>
          </div>
          <p className={`text-sm ${textMuted}`}>
            Earn $0.50/month for every active subscriber you refer. No cap.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Active Referrals', value: activeReferrals, icon: Users },
            { label: 'Total Earned', value: `$${totalEarned.toFixed(2)}`, icon: Gift },
            { label: 'In Your Balance', value: `$${availableBalance.toFixed(2)}`, icon: Wallet },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className={`rounded-xl border p-4 ${cardBg}`}>
              <Icon className="text-[#D4A843] w-5 h-5 mb-2" />
              <p className={`text-xs uppercase tracking-wide font-semibold mb-1 ${textMuted}`}>{label}</p>
              <p className={`font-serif text-2xl font-bold ${textPrimary}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Referral link */}
        <div className={`rounded-xl border p-6 mb-6 ${cardBg}`}>
          <h2 className={`font-serif text-xl mb-4 ${textPrimary}`}>Your Referral Link</h2>
          <div className={`flex items-center gap-2 rounded-lg border px-4 py-3 ${
            isDark ? 'bg-[#0f1623] border-[#F5F0E8]/10' : 'bg-[#F5F0E8] border-[#1B2A4A]/10'
          }`}>
            <p className={`flex-1 text-sm truncate ${textMuted}`}>{referralLink}</p>
            <button
              onClick={copyLink}
              className="flex-shrink-0 flex items-center gap-1.5 text-[#D4A843] text-sm font-semibold hover:opacity-80 transition-opacity"
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className={`text-xs mt-3 ${textMuted}`}>
            Projected monthly: <strong className={textPrimary}>${monthlyProjected.toFixed(2)}</strong> if all referrals stay subscribed
          </p>
        </div>

        {/* Referred Users */}
        {referredUsers.length > 0 && (
          <div className={`rounded-xl border p-6 mb-6 ${cardBg}`}>
            <h2 className={`font-serif text-xl mb-4 ${textPrimary}`}>People You Referred</h2>
            <div className="space-y-2">
              {referredUsers.map((ref: { email: string; is_upgraded: boolean }, i: number) => (
                <div key={i} className={`flex justify-between items-center py-2 ${i < referredUsers.length - 1 ? `border-b ${divider}` : ''}`}>
                  <span className={`text-sm ${textMuted}`}>{ref.email}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${ref.is_upgraded ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                    {ref.is_upgraded ? 'Active' : 'Signed Up'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payout rules */}
        <div className={`rounded-xl border p-6 mb-6 ${cardBg}`}>
          <h2 className={`font-serif text-xl mb-4 ${textPrimary}`}>Payout Rules</h2>
          <div className="space-y-3">
            {[
              ['Earnings',     '$0.50/month per active referred subscriber — added to your ReadToEarn balance'],
              ['Trigger',      'Referral must sign up and become a paid subscriber'],
              ['Recurring',    'Earnings continue each month they stay subscribed'],
              ['Cancellation', 'Earnings stop if the referred user cancels'],
              ['Payout',       'Cash out via PayPal or Wise like normal earnings'],
              ['Cap',          'No cap — refer as many as you want'],
            ].map(([rule, detail], i) => (
              <div
                key={rule}
                className={`flex justify-between items-start gap-4 py-2 ${
                  i < 5 ? `border-b ${divider}` : ''
                }`}
              >
                <span className={`text-sm font-semibold flex-shrink-0 ${textPrimary}`}>{rule}</span>
                <span className={`text-sm text-right ${textMuted}`}>{detail}</span>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className={`rounded-xl border p-6 ${cardBg}`}>
          <h2 className={`font-serif text-xl mb-4 ${textPrimary}`}>How It Works</h2>
          <ol className="space-y-3">
            {[
              'Share your unique referral link with friends and your community.',
              'When someone clicks your link, their signup is tracked to you.',
              'Once they become a paid subscriber, you start earning $0.50/month.',
              'Earnings are recurring — as long as they stay subscribed, you keep earning.',
              'Payouts are processed monthly to your connected account.',
              'No cap on referrals. The more you refer, the more you earn.',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#D4A843]/20 text-[#D4A843] text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <p className={`text-sm ${textMuted}`}>{step}</p>
              </li>
            ))}
          </ol>
        </div>

      </div>
    </div>
  );
};
