import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Copy, Check, Gift } from 'lucide-react';

type Tier = 'casual' | 'avid' | 'voracious';

const REFERRAL_BONUS: Record<Tier, number> = {
  casual: 1,
  avid: 2,
  voracious: 3,
};

const TIER_LABELS: Record<Tier, string> = {
  casual: 'Casual Reader',
  avid: 'Avid Reader',
  voracious: 'Voracious Reader',
};

export const Refer = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [referralCode, setReferralCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [referralCount, setReferralCount] = useState(0);
  const [tier, setTier] = useState<Tier>('casual');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReferralData();
  }, [user]);

  const loadReferralData = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('referral_code, subscription_tier')
      .eq('id', user.id)
      .single();

    if (data?.referral_code) {
      setReferralCode(data.referral_code);
      setTier((data.subscription_tier as Tier) ?? 'casual');

      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .eq('referred_by', data.referral_code)
        .eq('referral_bonus_claimed', true);

      setReferralCount(count ?? 0);
    }
    setLoading(false);
  };

  const referralLink = `${window.location.origin}?ref=${referralCode}`;
  const bonusPerReferral = REFERRAL_BONUS[tier];
  const totalEarned = referralCount * bonusPerReferral;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: isDark ? '#0f172a' : '#F5F0E8' }}
      >
        <div style={{ color: isDark ? '#F5F0E8' : '#1B2A4A' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: isDark ? '#0f172a' : '#F5F0E8' }}
    >
      <div className="max-w-2xl mx-auto px-4 py-12">

        {/* Header */}
        <div className="mb-8 text-center">
          <Gift
            className="w-12 h-12 mx-auto mb-4"
            style={{ color: '#D4A843' }}
          />
          <h1
            className="font-serif text-3xl mb-2"
            style={{ color: isDark ? '#F5F0E8' : '#1B2A4A' }}
          >
            Refer a Friend
          </h1>
          <p style={{ color: isDark ? '#94a3b8' : '#4a5568' }}>
            As a{' '}
            <span
              className="font-medium"
              style={{ color: '#D4A843' }}
            >
              {TIER_LABELS[tier]}
            </span>
            , you earn{' '}
            <span
              className="font-medium"
              style={{ color: isDark ? '#F5F0E8' : '#1B2A4A' }}
            >
              ${bonusPerReferral}.00
            </span>{' '}
            for every friend who passes their first quiz.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div
            className="rounded-lg p-5 text-center border"
            style={{
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              borderColor: isDark ? '#334155' : '#e2d9c8',
            }}
          >
            <div
              className="text-3xl font-serif mb-1"
              style={{ color: isDark ? '#F5F0E8' : '#1B2A4A' }}
            >
              {referralCount}
            </div>
            <div
              className="text-sm"
              style={{ color: isDark ? '#64748b' : '#6b7280' }}
            >
              successful referrals
            </div>
          </div>
          <div
            className="rounded-lg p-5 text-center border"
            style={{
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              borderColor: isDark ? '#334155' : '#e2d9c8',
            }}
          >
            <div
              className="text-3xl font-serif mb-1"
              style={{ color: '#D4A843' }}
            >
              ${totalEarned.toFixed(2)}
            </div>
            <div
              className="text-sm"
              style={{ color: isDark ? '#64748b' : '#6b7280' }}
            >
              earned from referrals
            </div>
          </div>
        </div>

        {/* Referral link */}
        <div
          className="rounded-lg p-6 border mb-6"
          style={{
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            borderColor: isDark ? '#334155' : '#e2d9c8',
          }}
        >
          <label
            className="block text-sm mb-3"
            style={{ color: isDark ? '#94a3b8' : '#6b7280' }}
          >
            Your referral link
          </label>
          <div className="flex gap-2">
            <div
              className="flex-1 rounded-lg px-4 py-2.5 text-sm font-mono truncate border"
              style={{
                backgroundColor: isDark ? '#0f172a' : '#F5F0E8',
                borderColor: isDark ? '#475569' : '#d1c9b8',
                color: isDark ? '#94a3b8' : '#4a5568',
              }}
            >
              {referralLink}
            </div>
            <button
              onClick={copyLink}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg transition text-sm font-medium whitespace-nowrap"
              style={{
                backgroundColor: '#1B2A4A',
                color: '#F5F0E8',
              }}
            >
              {copied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Tier bonus breakdown */}
        <div
          className="rounded-lg p-6 border mb-6"
          style={{
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            borderColor: isDark ? '#334155' : '#e2d9c8',
          }}
        >
          <h2
            className="font-medium mb-4"
            style={{ color: isDark ? '#F5F0E8' : '#1B2A4A' }}
          >
            Referral bonuses by tier
          </h2>
          <div className="space-y-2">
            {(Object.entries(REFERRAL_BONUS) as [Tier, number][]).map(
              ([t, amount]) => (
                <div
                  key={t}
                  className="flex items-center justify-between py-2 px-3 rounded-lg"
                  style={{
                    backgroundColor:
                      t === tier
                        ? isDark
                          ? 'rgba(212,168,67,0.12)'
                          : 'rgba(212,168,67,0.1)'
                        : 'transparent',
                    border:
                      t === tier
                        ? '1px solid rgba(212,168,67,0.35)'
                        : '1px solid transparent',
                  }}
                >
                  <span
                    className="text-sm"
                    style={{ color: isDark ? '#cbd5e1' : '#4a5568' }}
                  >
                    {TIER_LABELS[t]}
                    {t === tier && (
                      <span
                        className="ml-2 text-xs font-medium px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: 'rgba(212,168,67,0.2)',
                          color: '#D4A843',
                        }}
                      >
                        your plan
                      </span>
                    )}
                  </span>
                  <span
                    className="font-medium text-sm"
                    style={{ color: '#D4A843' }}
                  >
                    ${amount}.00 / referral
                  </span>
                </div>
              )
            )}
          </div>
        </div>

        {/* How it works */}
        <div
          className="rounded-lg p-6 border"
          style={{
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            borderColor: isDark ? '#334155' : '#e2d9c8',
          }}
        >
          <h2
            className="font-medium mb-4"
            style={{ color: isDark ? '#F5F0E8' : '#1B2A4A' }}
          >
            How it works
          </h2>
          <div className="space-y-3">
            {[
              'Share your unique link with a friend',
              'They sign up using your link',
              `When they pass their first quiz, you earn $${bonusPerReferral}.00`,
              'No limit - refer as many friends as you want',
              'Referral earnings count toward your monthly cap',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className="w-5 h-5 rounded-full text-xs flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{
                    backgroundColor: 'rgba(212,168,67,0.15)',
                    color: '#D4A843',
                  }}
                >
                  {i + 1}
                </div>
                <p
                  className="text-sm"
                  style={{ color: isDark ? '#94a3b8' : '#6b7280' }}
                >
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
