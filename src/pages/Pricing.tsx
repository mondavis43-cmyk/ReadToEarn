import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from '../hooks/useNavigate';
import { Check, Star, Zap, Bell, Trophy, Shield, Rocket, Sparkles } from 'lucide-react';

export function Pricing() {
  const { isDark } = useTheme();
  const { navigateTo } = useNavigate();

  const bg = isDark ? 'bg-[#0f1a2e]' : 'bg-[#F5F0E8]';
  const cardBg = isDark ? 'bg-[#1B2A4A]' : 'bg-white';
  const cardBorder = isDark ? 'border-[#2a3f6f]' : 'border-[#e2ddd6]';
  const textPrimary = isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]';
  const textMuted = isDark ? 'text-[#a0aec0]' : 'text-[#6b7280]';

  const goToCheckout = (plan: 'monthly' | 'annual') => {
    sessionStorage.setItem('checkoutItem', JSON.stringify({
      type: 'subscription',
      label: plan === 'monthly' ? 'Upgrade — Monthly ($4.99/mo)' : 'Upgrade — Annual ($49.90/yr)',
      amount: plan === 'monthly' ? 499 : 4990,
      metadata: { plan },
    }));
    navigateTo('/checkout');
  };

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300 pb-20`}>
      {/* Hero */}
      <section className="pt-24 pb-16 px-4 text-center">
        <h1 className={`text-4xl md:text-6xl font-serif font-bold ${textPrimary} mb-6`}>
          Membership Plans
        </h1>
        <p className={`text-lg ${textMuted} max-w-2xl mx-auto leading-relaxed`}>
          Whether you're a casual trivia fan or a competitive reader, 
          we have a place for you. Join the community and start earning for your insights.
        </p>
      </section>

      {/* Comparison Grid */}
      <section className="px-4 max-w-6xl mx-auto grid md:grid-cols-2 gap-8 items-stretch">
        
        {/* Standard Tier */}
        <div className={`rounded-2xl border ${cardBorder} ${cardBg} p-8 flex flex-col shadow-sm`}>
          <div className="mb-8">
            <h2 className={`text-2xl font-bold ${textPrimary} mb-1`}>Standard</h2>
            <p className={`text-sm ${textMuted}`}>Everything you need to start earning.</p>
          </div>
          
          <div className="flex items-baseline gap-1 mb-8">
            <span className={`text-4xl font-serif font-bold ${textPrimary}`}>Free</span>
          </div>
          
          <ul className="space-y-4 mb-10 flex-1">
            {[
              "Enter any competition",
              "Take quizzes and earn from the prize pool",
              "Access Author Bounties",
              "Complete Quick Tasks, Surveys, & Beta and Sensitivity Panels",
              "Cash out at $10 minimum",
              "Public leaderboard visibility",
              "Reader Dashboard with personal stats"
            ].map((feature) => (
              <li key={feature} className="flex gap-3 text-sm items-start">
                <Check className="w-5 h-5 text-green-500 shrink-0" />
                <span className={textPrimary}>{feature}</span>
              </li>
            ))}
          </ul>

          <button 
            onClick={() => navigateTo('/signup')}
            className={`w-full py-3 rounded-xl font-bold border-2 ${isDark ? 'border-[#2a3f6f] text-white' : 'border-[#1B2A4A] text-[#1B2A4A]'} hover:bg-black/5 transition`}
          >
            Get Started
          </button>
        </div>

        {/* Upgrade Tier */}
        <div className={`relative rounded-2xl border-2 border-[#D4A843] ${cardBg} p-8 flex flex-col shadow-xl`}>
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#D4A843] text-[#1B2A4A] text-[10px] font-bold uppercase tracking-widest px-4 py-1 rounded-full">
            Recommended
          </div>
          
          <div className="mb-8">
            <h2 className={`text-2xl font-bold ${textPrimary} mb-1 flex items-center gap-2`}>
              Upgrade <Sparkles className="w-5 h-5 text-[#D4A843]" />
            </h2>
            <p className={`text-sm ${textMuted}`}>Go ad-free, get in first, and earn more.</p>
          </div>

          <div className="mb-8">
            <div className="flex items-baseline gap-1">
              <span className={`text-4xl font-serif font-bold ${textPrimary}`}>$4.99</span>
              <span className={textMuted}>/month</span>
            </div>
            <p className="text-[#D4A843] text-sm font-bold mt-1">
              or $49.90/year (get 12 months, pay for 10)
            </p>
          </div>
          
          <ul className="space-y-4 mb-10 flex-1">
            <li className="flex gap-3 text-sm font-bold">
              <Rocket className="w-5 h-5 text-[#D4A843] shrink-0" />
              <span className={textPrimary}>Everything in Standard.</span>
            </li>
            {[
              "Ad-free experience",
              "Access to the Referral Program",
              "Priority queue. You're first notified when new earning options open. Slots are limited and fill fast.",
              "1 competition entry at 30% off every month.",
              "Subscriber-only giveaway every month. Free to enter, guaranteed prize pool regardless of entrant count. Three names are drawn and win cash prizes.",
              "Minimum cashout drops to $5.",

            ].map((feature) => (
              <li key={feature} className="flex gap-3 text-sm items-start">
                <Check className="w-5 h-5 text-[#D4A843] shrink-0" />
                <span className={textPrimary}>{feature}</span>
              </li>
            ))}
          </ul>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button 
              onClick={() => goToCheckout('monthly')}
              className="py-3 rounded-xl font-bold bg-[#D4A843] text-[#1B2A4A] hover:bg-[#c49a38] transition text-sm"
            >
              Subscribe Monthly — $4.99
            </button>
            <button 
              onClick={() => goToCheckout('annual')}
              className="py-3 rounded-xl font-bold bg-[#1B2A4A] text-white hover:bg-[#243660] border border-[#D4A843]/30 transition text-sm"
            >
              Go Annual — $49.90
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
