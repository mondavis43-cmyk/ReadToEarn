import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from '../hooks/useNavigate';
import { Check, Star, Zap, Bell, Trophy, ZapOff } from 'lucide-react';

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
    <div className={`min-h-screen ${bg} transition-colors duration-300 pb-20`}>
      {/* Hero */}
      <section className="pt-24 pb-16 px-4 text-center">
        <h1 className={`text-4xl md:text-6xl font-serif font-bold ${textPrimary} mb-6`}>
          Choose Your Path.
        </h1>
        <p className={`text-lg ${textMuted} max-w-2xl mx-auto leading-relaxed`}>
          Whether you’re a casual trivia fan or a competitive reader, 
          we have a place for you. Join the community and start earning for your insights.
        </p>
      </section>

      {/* Tiers */}
      <section className="px-4 max-w-5xl mx-auto grid md:grid-cols-2 gap-8 mb-24">
        
        {/* Standard Tier */}
        <div className={`rounded-2xl border ${cardBorder} ${cardBg} p-8 flex flex-col shadow-sm`}>
          <h2 className={`text-xl font-bold ${textPrimary} mb-2`}>Standard</h2>
          <div className="flex items-baseline gap-1 mb-8">
            <span className={`text-4xl font-serif font-bold ${textPrimary}`}>Free</span>
          </div>
          
          <ul className="space-y-5 mb-10 flex-1">
            <li className="flex gap-3 text-sm">
              <Check className="w-5 h-5 text-green-500 shrink-0" />
              <span className={textPrimary}>Daily Trivia Access (Earn Site Credits)</span>
            </li>
            <li className="flex gap-3 text-sm">
              <Check className="w-5 h-5 text-green-500 shrink-0" />
              <span className={textPrimary}>Enter Public Tournaments</span>
            </li>
            <li className="flex gap-3 text-sm">
              <Check className="w-5 h-5 text-green-500 shrink-0" />
              <span className={textPrimary}>Claim Public Book Bounties</span>
            </li>
            <li className="flex gap-3 text-sm italic">
              <ZapOff className="w-5 h-5 text-gray-400 shrink-0" />
              <span className={textMuted}>Standard Notification Timing</span>
            </li>
          </ul>

          <button 
            onClick={() => navigateTo('/signup')}
            className={`w-full py-3 rounded-xl font-bold border-2 ${isDark ? 'border-[#2a3f6f] text-white' : 'border-[#1B2A4A] text-[#1B2A4A]'} hover:bg-black/5 transition`}
          >
            Get Started
          </button>
        </div>

        {/* Upgraded Tier */}
        <div className={`relative rounded-2xl border-2 border-[#D4A843] ${cardBg} p-8 flex flex-col shadow-xl transform md:scale-105`}>
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#D4A843] text-[#1B2A4A] text-[10px] font-bold uppercase tracking-widest px-4 py-1 rounded-full">
            Most Popular
          </div>
          
          <h2 className={`text-xl font-bold ${textPrimary} mb-2 flex items-center gap-2`}>
            Member <Star className="w-4 h-4 fill-[#D4A843] text-[#D4A843]" />
          </h2>
          <div className="flex items-baseline gap-1 mb-8">
            <span className={`text-4xl font-serif font-bold ${textPrimary}`}>$4.99</span>
            <span className={textMuted}>/month</span>
          </div>
          
          <ul className="space-y-5 mb-10 flex-1">
            <li className="flex gap-3 text-sm font-bold">
              <Bell className="w-5 h-5 text-[#D4A843] shrink-0" />
              <span className={textPrimary}>Priority Queue: 30m early access to Bounties</span>
            </li>
            <li className="flex gap-3 text-sm">
              <Trophy className="w-5 h-5 text-[#D4A843] shrink-0" />
              <span className={textPrimary}>30% Off Tournament Entry Fees</span>
            </li>
            <li className="flex gap-3 text-sm">
              <Zap className="w-5 h-5 text-[#D4A843] shrink-0" />
              <span className={textPrimary}>Exclusive Member-Only Surveys</span>
            </li>
            <li className="flex gap-3 text-sm font-bold">
              <Check className="w-5 h-5 text-green-500 shrink-0" />
              <span className={textPrimary}>Completely Ad-Free Reading</span>
            </li>
          </ul>

          <button 
            onClick={() => navigateTo('/signup')}
            className="w-full py-4 rounded-xl font-bold bg-[#D4A843] text-[#1B2A4A] hover:bg-[#c49a38] transition shadow-lg shadow-[#D4A843]/20"
          >
            Upgrade Membership
          </button>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 max-w-2xl mx-auto">
        <h3 className={`text-2xl font-serif font-bold ${textPrimary} text-center mb-10`}>
          Everything you need to know
        </h3>
        <div className="space-y-4">
          {faqItems.map((item, i) => (
            <div key={i} className={`rounded-xl border ${cardBorder} ${cardBg} overflow-hidden`}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className={`w-full text-left px-5 py-4 flex justify-between items-center ${textPrimary} font-bold text-sm`}
              >
                {item.q}
                <span className="text-[#D4A843] text-xl">{openFaq === i ? '−' : '+'}</span>
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
