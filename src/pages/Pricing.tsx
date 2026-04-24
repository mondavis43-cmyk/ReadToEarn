import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from '../hooks/useNavigate';
import { Check, Star, Bell, Shield, Trophy, Zap, Mail, Users } from 'lucide-react';

interface FaqItem {
  q: string;
  a: string;
}

const faqItems: FaqItem[] = [
  {
    q: 'How do I earn rewards?',
    a: 'You can earn through Bounties and Tournaments. Bounties are specific tasks—like reading an indie title and passing a quiz—that pay out cash rewards. Tournaments are competitive events where top-performing readers split a prize pool.',
  },
  {
    q: 'What are Site Credits?',
    a: 'Credits are earned by passing Daily Trivia quizzes. You use these credits to enter Tournaments or unlock specific platform features without spending cash.',
  },
  {
    q: 'How does the Priority Queue work?',
    a: 'Bounties and Surveys often have limited spots. Upgraded members are notified of new opportunities 30 minutes before they go live to the general public, giving them the best chance to claim high-value spots.',
  },
  {
    q: 'Is there a minimum age to participate?',
    a: 'Readers 13 and older can participate with parental consent. Please note that for users under 18, rewards are issued as digital gift cards.',
  },
  {
    q: 'Why is there a timer on quizzes?',
    a: 'To ensure fairness and reward genuine reading, quizzes have an 8-minute limit. This rewards readers who know the material and prevents "search-as-you-go" tactics.',
  },
];

export function Pricing() {
  const { isDark } = useTheme();
  const { navigateTo } = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const bg = isDark ? 'bg-[#0f1a2e]' : 'bg-[#F5F0E8]';
  const cardBg = isDark ? 'bg-[#1B2A4A]' : 'bg-white';
  const cardBorder = isDark ? 'border-[#2a3f6f]' : 'border-[#e2ddd6]';
  const textPrimary = isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]';
  const textMuted = isDark ? 'text-[#a0aec0]' : 'text-[#6b7280]';

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300 pb-24`}>
      {/* Hero Section */}
      <section className="pt-24 pb-12 px-4 text-center">
        <h1 className={`text-4xl md:text-5xl font-serif font-bold ${textPrimary} mb-4`}>
          Membership Plans
        </h1>
      </section>

      {/* Pricing Grid */}
      <section className="px-4 max-w-6xl mx-auto grid md:grid-cols-2 gap-8 items-start">
        
        {/* Standard Tier */}
        <div className={`rounded-2xl border ${cardBorder} ${cardBg} p-8 flex flex-col shadow-sm`}>
          <h2 className={`text-2xl font-bold ${textPrimary} mb-1`}>Standard</h2>
          <p className={`text-sm ${textMuted} mb-6`}>Everything you need to start earning.</p>
          
          <div className="flex items-baseline gap-1 mb-8">
            <span className={`text-4xl font-serif font-bold ${textPrimary}`}>Free</span>
          </div>
          
          <ul className="space-y-4 mb-10 flex-1">
            {[
              "Enter any competition",
              "Take quizzes and earn from the prize pool",
              "Access Author Bounties",
              "Complete Quick Tasks, Surveys & Beta Panels",
              "Daily Trivia ($0.10 site credit)",
              "Cash out at $10 minimum",
              "Public leaderboard visibility",
              "Reader Dashboard with personal stats"
            ].map((item, idx) => (
              <li key={idx} className="flex gap-3 text-sm">
                <Check className="w-5 h-5 text-green-500 shrink-0" />
                <span className={textPrimary}>{item}</span>
              </li>
            ))}
          </ul>

          <button 
            onClick={() => navigateTo('/signup')}
            className={`w-full py-4 rounded-xl font-bold border-2 ${isDark ? 'border-[#2a3f6f] text-white' : 'border-[#1B2A4A] text-[#1B2A4A]'} hover:bg-black/5 transition`}
          >
            Get Started
          </button>
        </div>

        {/* Upgrade Tier */}
        <div className={`relative rounded-2xl border-2 border-[#D4A843] ${cardBg} p-8 flex flex-col shadow-xl`}>
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#D4A843] text-[#1B2A4A] text-[10px] font-bold uppercase tracking-widest px-4 py-1 rounded-full">
            Recommended
          </div>
          
          <h2 className={`text-2xl font-bold ${textPrimary} mb-1 flex items-center gap-2`}>
            Upgrade <Star className="w-5 h-5 fill-[#D4A843] text-[#D4A843]" />
          </h2>
          <p className={`text-sm ${textMuted} mb-4`}>Go ad-free, get in first, and earn more.</p>
          
          <div className="mb-8">
            <div className="flex items-baseline gap-1">
              <span className={`text-4xl font-serif font-bold ${textPrimary}`}>$4.99</span>
              <span className={textMuted}>/month</span>
            </div>
            <p className="text-[#D4A843] text-sm font-semibold mt-1">
              or $49.90/year (get 12 months, pay for 10)
            </p>
          </div>
          
          <ul className="space-y-4 mb-10 flex-1">
            <li className="flex gap-3 text-sm font-bold">
              <Zap className="w-5 h-5 text-[#D4A843] shrink-0" />
              <span className={textPrimary}>Everything in Standard.</span>
            </li>
            <li className="flex gap-3 text-sm">
              <Shield className="w-5 h-5 text-[#D4A843] shrink-0" />
              <span className={textPrimary}>Ad-free experience</span>
            </li>
            <li className="flex gap-3 text-sm">
              <Users className="w-5 h-5 text-[#D4A843] shrink-0" />
              <span className={textPrimary}>Access to the Referral Program</span>
            </li>
            <li className="flex gap-3 text-sm">
              <Bell className="w-5 h-5 text-[#D4A843] shrink-0" />
              <span className={textPrimary}>Priority queue. You're first notified when new earning options open. Slots are limited and fill fast.</span>
            </li>
            <li className="flex gap-3 text-sm">
              <Trophy className="w-5 h-5 text-[#D4A843] shrink-0" />
              <span className={textPrimary}>Early competition registration — see upcoming tournaments before the general public.</span>
            </li>
            <li className="flex gap-3 text-sm">
              <Star className="w-5 h-5 text-[#D4A843] shrink-0" />
              <span className={textPrimary}>1 competition entry at 30% off every month.</span>
            </li>
            <li className="flex gap-3 text-sm">
              <Trophy className="w-5 h-5 text-[#D4A843] shrink-0" />
              <span className={textPrimary}>Subscriber-only competition every month. Free to enter, guaranteed prize pool regardless of entrant count. Top 3 win.</span>
            </li>
            <li className="flex gap-3 text-sm">
              <Check className="w-5 h-5 text-green-500 shrink-0" />
              <span className={textPrimary}>Cashout minimum drops to $5.</span>
            </li>
          </ul>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button 
              onClick={() => navigateTo('/checkout/monthly')}
              className="py-4 rounded-xl font-bold bg-[#D4A843] text-[#1B2A4A] hover:bg-[#c49a38] transition text-sm"
            >
              Subscribe Monthly — $4.99
            </button>
            <button 
              onClick={() => navigateTo('/checkout/annual')}
              className={`py-4 rounded-xl font-bold border-2 border-[#D4A843] ${textPrimary} hover:bg-[#D4A843]/10 transition text-sm`}
            >
              Go Annual — $49.90
            </button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 max-w-2xl mx-auto mt-20">
        <h3 className={`text-2xl font-serif font-bold ${textPrimary} text-center mb-10`}>
          Frequently Asked Questions
        </h3>
        <div className="space-y-4">
          {faqItems.map((item, i) => (
            <div key={i} className={`rounded-xl border ${cardBorder} ${cardBg} overflow-hidden`}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className={`w-full text-left px-5 py-4 flex justify-between items-center ${textPrimary} font-bold text-sm`}
              >
                {item.q}
                <span className="text-[#D4A843]">{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && (
                <div className={`px-5 pb-5 text-sm ${textMuted} leading-relaxed`}>
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
