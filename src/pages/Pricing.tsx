import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Link } from 'react-router-dom';

interface TierFeature {
  label: string;
  value: string;
}

interface Tier {
  id: string;
  name: string;
  price: string;
  period: string;
  monthlyEarningCap: string;
  tagline: string;
  highlight: boolean;
  badge: string | null;
  features: TierFeature[];
  cta: string;
  ctaType: 'primary' | 'secondary';
}

interface FaqItem {
  q: string;
  a: string;
}

const tiers: Tier[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    monthlyEarningCap: '$5',
    tagline: 'Start earning just by reading',
    highlight: false,
    badge: null,
    features: [
      { label: 'Earnings per quiz', value: '$0.50' },
      { label: 'Monthly earning cap', value: '$5' },
      { label: 'Minimum cash-out', value: '$10' },
      { label: 'Quiz retakes', value: 'None' },
      { label: 'Competition access', value: 'None' },
      { label: 'Sponsored books', value: 'No' },
      { label: 'Surveys', value: 'No' },
      { label: 'Referral bonus', value: 'None' },
      { label: 'Streak bonuses', value: 'No' },
      { label: 'Ads', value: 'Yes' },
      { label: 'Reading Dashboard', value: 'No' },
    ],
    cta: 'Get Started Free',
    ctaType: 'secondary',
  },
  {
    id: 'casual',
    name: 'Casual Reader',
    price: '$5.99',
    period: 'per month',
    monthlyEarningCap: '$20',
    tagline: 'More books, more earnings',
    highlight: false,
    badge: null,
    features: [
      { label: 'Earnings per quiz', value: '$0.65' },
      { label: 'Monthly earning cap', value: '$20' },
      { label: 'Minimum cash-out', value: '$10' },
      { label: 'Quiz retakes', value: '1 per month' },
      { label: 'Competition access', value: 'Paid entry' },
      { label: 'Sponsored books', value: 'Yes' },
      { label: 'Surveys', value: 'Yes' },
      { label: 'Referral bonus', value: '$1 per signup' },
      { label: 'Streak bonuses', value: 'No' },
      { label: 'Ads', value: 'Reduced' },
      { label: 'Reading Dashboard', value: 'Yes' },
    ],
    cta: 'Start Casual',
    ctaType: 'secondary',
  },
  {
    id: 'avid',
    name: 'Avid Reader',
    price: '$10.99',
    period: 'per month',
    monthlyEarningCap: '$55',
    tagline: 'Our most popular plan',
    highlight: true,
    badge: 'Most Popular',
    features: [
      { label: 'Earnings per quiz', value: '$0.80' },
      { label: 'Monthly earning cap', value: '$55' },
      { label: 'Minimum cash-out', value: '$10' },
      { label: 'Quiz retakes', value: '2 per month' },
      { label: 'Competition access', value: '1 free entry/month' },
      { label: 'Sponsored books', value: 'Yes' },
      { label: 'Surveys', value: 'Yes' },
      { label: 'Referral bonus', value: '$2 per signup' },
      { label: 'Streak bonuses', value: '+$0.10 at 7 and 30 days' },
      { label: 'Ads', value: 'Ad-free' },
      { label: 'Reading Dashboard', value: 'Yes' },
    ],
    cta: 'Go Avid',
    ctaType: 'primary',
  },
  {
    id: 'voracious',
    name: 'Voracious Reader',
    price: '$24.99',
    period: 'per month',
    monthlyEarningCap: '$120',
    tagline: 'Maximum earnings, maximum perks',
    highlight: false,
    badge: 'Best Value',
    features: [
      { label: 'Earnings per quiz', value: '$0.95' },
      { label: 'Monthly earning cap', value: '$120' },
      { label: 'Minimum cash-out', value: '$10' },
      { label: 'Quiz retakes', value: '3 per month' },
      { label: 'Competition access', value: 'Free entry to all monthly' },
      { label: 'Sponsored books', value: 'Early access' },
      { label: 'Surveys', value: 'Yes' },
      { label: 'Referral bonus', value: '$3 per signup' },
      { label: 'Streak bonuses', value: '+$0.10 at 7 and 30 days' },
      { label: 'Ads', value: 'Ad-free' },
      { label: 'Reading Dashboard', value: 'Yes' },
      { label: 'Book request channel', value: 'Direct feedback line' },
    ],
    cta: 'Go Voracious',
    ctaType: 'secondary',
  },
  {
    id: 'lifetime',
    name: 'Lifetime',
    price: '$249',
    period: 'one-time',
    monthlyEarningCap: '$120',
    tagline: 'Pay once, earn forever',
    highlight: false,
    badge: 'Limited - 300 Spots',
    features: [
      { label: 'Earnings per quiz', value: '$0.95' },
      { label: 'Monthly earning cap', value: '$120' },
      { label: 'Minimum cash-out', value: '$10' },
      { label: 'Quiz retakes', value: '3 per month' },
      { label: 'Competition access', value: 'Free entry to all monthly' },
      { label: 'Sponsored books', value: 'Early access' },
      { label: 'Surveys', value: 'Yes' },
      { label: 'Referral bonus', value: '$3 per signup' },
      { label: 'Streak bonuses', value: '+$0.10 at 7 and 30 days' },
      { label: 'Ads', value: 'Ad-free' },
      { label: 'Reading Dashboard', value: 'Yes' },
      { label: 'Book request channel', value: 'Direct feedback line' },
      { label: 'No monthly fees', value: 'Ever' },
    ],
    cta: 'Claim Lifetime Access',
    ctaType: 'secondary',
  },
];

const annualNote =
  'All paid plans available annually - pay for 10 months, get 12. Rate locked for life.';

const faqItems: FaqItem[] = [
  {
    q: 'Do referral and survey earnings count toward my monthly cap?',
    a: 'Yes. All earnings including referrals and surveys count toward your monthly cap.',
  },
  {
    q: 'When do I need to provide my SSN?',
    a: 'If you earn $600 or more in a calendar year, you will need to provide your SSN for a 1099. You will receive warnings at $500 and $550.',
  },
  {
    q: 'Can users under 18 participate?',
    a: 'Yes, users 13 and older may participate with parental consent. Earnings for users under 18 are issued as gift cards only.',
  },
  {
    q: 'What is the minimum cash-out amount?',
    a: '$10 across all tiers.',
  },
  {
    q: 'How do quizzes work?',
    a: 'Each quiz has 10 questions with an 8-minute timer. You earn your tier rate for each quiz you pass.',
  },
];

const earningsBreakdown = [
  { tier: 'Free', rate: '$0.50', cap: '$5' },
  { tier: 'Casual', rate: '$0.65', cap: '$20' },
  { tier: 'Avid', rate: '$0.80', cap: '$55' },
  { tier: 'Voracious', rate: '$0.95', cap: '$120' },
];

export default function Pricing() {
  const { isDark } = useTheme();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const bg = isDark ? 'bg-[#0f1a2e]' : 'bg-[#F5F0E8]';
  const cardBg = isDark ? 'bg-[#1B2A4A]' : 'bg-white';
  const cardBorder = isDark ? 'border-[#2a3f6f]' : 'border-[#e2ddd6]';
  const textPrimary = isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]';
  const textMuted = isDark ? 'text-[#a0aec0]' : 'text-[#6b7280]';
  const divider = isDark ? 'border-[#2a3f6f]' : 'border-[#e2ddd6]';
  const highlightCard = isDark
    ? 'bg-[#1B2A4A] border-[#D4A843] ring-2 ring-[#D4A843]'
    : 'bg-white border-[#D4A843] ring-2 ring-[#D4A843]';

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300`}>
      {/* Hero */}
      <section className="pt-20 pb-12 px-4 text-center">
        <span className="inline-block bg-[#D4A843]/10 text-[#D4A843] text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-4">
          Membership Plans
        </span>
        <h1 className={`text-4xl md:text-5xl font-bold ${textPrimary} mb-4`}>
          Read. Quiz. Earn.
        </h1>
        <p className={`text-lg ${textMuted} max-w-xl mx-auto mb-3`}>
          Choose the plan that fits how you read. Every tier earns real money -
          higher tiers earn more per quiz with bigger monthly caps.
        </p>
        <p className={`text-sm ${textMuted}`}>{annualNote}</p>
      </section>

      {/* Tier Cards */}
      <section className="px-4 pb-16 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`relative rounded-2xl border p-6 flex flex-col transition-all duration-200 hover:shadow-xl ${
                tier.highlight
                  ? highlightCard
                  : `${cardBg} ${cardBorder} border`
              }`}
            >
              {tier.badge && (
                <span
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${
                    tier.highlight
                      ? 'bg-[#D4A843] text-[#1B2A4A]'
                      : 'bg-[#1B2A4A] text-[#D4A843] border border-[#D4A843]'
                  }`}
                >
                  {tier.badge}
                </span>
              )}

              <div className="mb-5 mt-2">
                <h2 className={`text-lg font-bold ${textPrimary} mb-1`}>
                  {tier.name}
                </h2>
                <p className={`text-xs ${textMuted} mb-3`}>{tier.tagline}</p>
                <div className="flex items-end gap-1">
                  <span className={`text-3xl font-extrabold ${textPrimary}`}>
                    {tier.price}
                  </span>
                  <span className={`text-sm ${textMuted} mb-1`}>
                    /{tier.period}
                  </span>
                </div>
                <p className="text-[#D4A843] text-xs font-semibold mt-1">
                  Up to {tier.monthlyEarningCap}/month
                </p>
              </div>

              <hr className={`border-t ${divider} mb-5`} />

              <ul className="flex-1 space-y-2.5 mb-6">
                {tier.features.map((f) => (
                  <li key={f.label} className="flex justify-between gap-2">
                    <span className={`text-xs ${textMuted}`}>{f.label}</span>
                    <span className={`text-xs font-semibold ${textPrimary} text-right`}>
                      {f.value}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                to="/signup"
                className={`block text-center text-sm font-bold py-2.5 px-4 rounded-xl transition-all duration-200 ${
                  tier.ctaType === 'primary'
                    ? 'bg-[#D4A843] text-[#1B2A4A] hover:bg-[#c49a38]'
                    : isDark
                    ? 'bg-[#2a3f6f] text-[#F5F0E8] hover:bg-[#344f8a]'
                    : 'bg-[#1B2A4A] text-[#F5F0E8] hover:bg-[#243660]'
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Earnings Breakdown */}
      <section className="px-4 pb-16 max-w-3xl mx-auto text-center">
        <div className={`rounded-2xl border ${cardBorder} ${cardBg} p-8`}>
          <h3 className={`text-xl font-bold ${textPrimary} mb-3`}>
            How earnings work
          </h3>
          <p className={`text-sm ${textMuted} leading-relaxed mb-4`}>
            You earn money for every book quiz you pass. Your tier determines
            your per-quiz rate and your monthly earning ceiling. Referral
            bonuses, survey completions, and streak bonuses all count toward
            your monthly cap. Once you hit your cap, earnings resume the
            following month.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            {earningsBreakdown.map((row) => (
              <div
                key={row.tier}
                className={`rounded-xl p-4 ${isDark ? 'bg-[#0f1a2e]' : 'bg-[#F5F0E8]'}`}
              >
                <p className={`text-xs ${textMuted} mb-1`}>{row.tier}</p>
                <p className="text-lg font-bold text-[#D4A843]">{row.rate}</p>
                <p className={`text-xs ${textMuted}`}>per quiz</p>
                <p className={`text-xs font-semibold ${textPrimary} mt-1`}>
                  {row.cap} cap
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 pb-20 max-w-2xl mx-auto">
        <h3 className={`text-2xl font-bold ${textPrimary} text-center mb-8`}>
          Common questions
        </h3>
        <div className="space-y-3">
          {faqItems.map((item, i) => (
            <div
              key={i}
              className={`rounded-xl border ${cardBorder} ${cardBg} overflow-hidden`}
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className={`w-full text-left px-5 py-4 flex justify-between items-center ${textPrimary} font-semibold text-sm`}
              >
                {item.q}
                <span className="text-[#D4A843] text-lg ml-4">
                  {openFaq === i ? '-' : '+'}
                </span>
              </button>
              {openFaq === i && (
                <div className={`px-5 pb-4 text-sm ${textMuted} leading-relaxed`}>
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-4 pb-20 text-center">
        <p className={`text-sm ${textMuted} mb-4`}>
          Not sure which plan is right for you? Start free - no credit card
          required.
        </p>
        <Link
          to="/signup"
          className="inline-block bg-[#D4A843] text-[#1B2A4A] font-bold px-8 py-3 rounded-xl hover:bg-[#c49a38] transition-colors duration-200"
        >
          Create Free Account
        </Link>
      </section>
    </div>
  );
}
