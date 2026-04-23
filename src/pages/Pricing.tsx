import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from '../hooks/useNavigate';
import { Check, Star, Zap, Shield, Trophy } from 'lucide-react';

interface FaqItem {
  q: string;
  a: string;
}

const faqItems: FaqItem[] = [
  {
    q: 'How do I actually earn money?',
    a: 'There are two ways: Bounties and Tournaments. Bounties are first-come, first-served tasks (like reading a specific indie book). Tournaments are weekend events where the top-scoring readers split a prize pool. Daily Trivia earns you "Site Credits" which you use to enter these events.',
  },
  {
    q: 'Why is there a review period?',
    a: 'To keep the platform sustainable and fair, every bounty claim is manually reviewed to ensure quiz integrity. Reviews typically take 24-48 hours.',
  },
  {
    q: 'What does the $4.99 Upgrade actually do?',
    a: 'It gives you "Priority Queue" status (faster reviews), 30% off Tournament entry fees, access to "High-Stakes" bounties, and removes all third-party ads.',
  },
  {
    q: 'Is there a limit on how much I can earn?',
    a: 'No more monthly caps! You can earn as much as there are available bounties and tournament prizes. We moved to this model to reward the most accurate and active readers.',
  },
  {
    q: 'How does the 8-minute timer work?',
    a: 'Every quiz has a strict 8-minute timer. This ensures readers have actually read the book rather than searching for answers in real-time.',
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
      <section className="pt-20 pb-12 px-4 text-center">
        <h1 className={`text-4xl md:text-6xl font-serif font-bold ${textPrimary} mb-4`}>
          One Membership. <br/>Unlimited Potential.
        </h1>
        <p className={`text-lg ${textMuted} max-w-2xl mx-auto`}>
          We've removed earning caps. Now, your income is based on your skill, speed, and accuracy. 
          Upgrade to get the tools you need to stay ahead of the competition.
        </p>
      </section>

      {/* Main Pricing Toggle */}
      <section className="px-4 max-w-5xl mx-auto grid md:grid-cols-2 gap-8 mb-20">
        
        {/* Standard Tier */}
        <div className={`rounded-2xl border ${cardBorder} ${cardBg} p-8 flex flex-col shadow-sm`}>
          <h2 className={`text-xl font-bold ${textPrimary} mb-2`}>Standard</h2>
          <div className="flex items-baseline gap-1 mb-6">
            <span className={`text-4xl font-serif font-bold ${textPrimary}`}>$0</span>
            <span className={textMuted}>/forever</span>
          </div>
          
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex gap-3 text-sm">
              <Check className="w-5 h-5 text-green-500 shrink-0" />
              <span className={textPrimary}>Access to Daily Trivia (Earn Credits)</span>
            </li>
            <li className="flex gap-3 text-sm">
              <Check className="w-5 h-5 text-green-500 shrink-0" />
              <span className={textPrimary}>Enter Public Tournaments</span>
            </li>
            <li className="flex gap-3 text-sm">
              <Check className="w-5 h-5 text-green-500 shrink-0" />
              <span className={textPrimary}>Claim Public Book Bounties</span>
            </li>
            <li className="flex gap-3 text-sm opacity-50">
              <span className="w-5 h-5" />
              <span className={textMuted}>Standard Review Queue (48h+)</span>
            </li>
          </ul>

          <button 
            onClick={() => navigateTo('/signup')}
            className={`w-full py-3 rounded-xl font-bold border-2 ${isDark ? 'border-[#2a3f6f] text-white' : 'border-[#1B2A4A] text-[#1B2A4A]'} hover:bg-black/5 transition`}
          >
            Stay Standard
          </button>
        </div>

        {/* Upgraded Tier */}
        <div className={`relative rounded-2xl border-2 border-[#D4A843] ${cardBg} p-8 flex flex-col shadow-xl transform md:scale-105`}>
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#D4A843] text-[#1B2A4A] text-[10px] font-bold uppercase tracking-widest px-4 py-1 rounded-full">
            Recommended
          </div>
          
          <h2 className={`text-xl font-bold ${textPrimary} mb-2 flex items-center gap-2`}>
            Upgraded <Star className="w-4 h-4 fill-[#D4A843] text-[#D4A843]" />
          </h2>
          <div className="flex items-baseline gap-1 mb-6">
            <span className={`text-4xl font-serif font-bold ${textPrimary}`}>$4.99</span>
            <span className={textMuted}>/month</span>
          </div>
          
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex gap-3 text-sm font-bold">
              <Zap className="w-5 h-5 text-[#D4A843] shrink-0" />
              <span className={textPrimary}>Priority Review Queue (Skip the line)</span>
            </li>
            <li className="flex gap-3 text-sm">
              <Trophy className="w-5 h-5 text-[#D4A843] shrink-0" />
              <span className={textPrimary}>30% Discount on Tournament Entries</span>
            </li>
            <li className="flex gap-3 text-sm">
              <Shield className="w-5 h-5 text-[#D4A843] shrink-0" />
              <span className={textPrimary}>Exclusive "Member-Only" Bounties</span>
            </li>
            <li className="flex gap-3 text-sm font-bold">
              <Check className="w-5 h-5 text-green-500 shrink-0" />
              <span className={textPrimary}>100% Ad-Free Experience</span>
            </li>
          </ul>

          <button 
            onClick={() => navigateTo('/signup')}
            className="w-full py-4 rounded-xl font-bold bg-[#D4A843] text-[#1B2A4A] hover:bg-[#c49a38] transition shadow-lg shadow-[#D4A843]/20"
          >
            Upgrade Now
          </button>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 max-w-2xl mx-auto">
        <h3 className={`text-2xl font-serif font-bold ${textPrimary} text-center mb-8`}>
          Frequently Asked Questions
        </h3>
        <div className="space-y-3">
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
                <div className={`px-5 pb-4 text-sm ${textMuted} leading-relaxed`}>
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
