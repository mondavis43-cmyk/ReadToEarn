import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from '../hooks/useNavigate';
import { ClipboardList, MessageSquare, BookOpen, ArrowRight, Shield, DollarSign, Eye, AlertCircle } from 'lucide-react';

export const HowItWorks = () => {
  const { isDark, toggleTheme } = useTheme();
  const { navigateTo } = useNavigate();

  const textPrimary = isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]';
  const textMuted = isDark ? 'text-[#F5F0E8]/70' : 'text-[#1B2A4A]/70';
  const cardBg = isDark ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20' : 'bg-white border-[#D4A843]/30';
  const divider = isDark ? 'border-[#D4A843]/20' : 'border-[#D4A843]/30';

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#0f1623]' : 'bg-[#F5F0E8]'}`}>

      {/* Header */}
      <div className={`border-b transition-colors duration-300 ${isDark ? 'border-[#1B2A4A] bg-[#0f1623]' : 'border-[#D4A843]/30 bg-[#F5F0E8]'}`}>
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <button
            onClick={() => navigateTo('/')}
            className={`font-serif text-lg font-bold transition-colors ${isDark ? 'text-[#D4A843]' : 'text-[#1B2A4A]'}`}
          >
            Read to Earn
          </button>
          <button
            onClick={toggleTheme}
            className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
              isDark
                ? 'border-[#D4A843]/40 text-[#D4A843] hover:bg-[#D4A843]/10'
                : 'border-[#1B2A4A]/30 text-[#1B2A4A] hover:bg-[#1B2A4A]/10'
            }`}
          >
            {isDark ? '☀ Light' : '☾ Dark'}
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-16">

        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className={`font-serif text-4xl md:text-5xl mb-6 ${textPrimary}`}>
            How It Works
          </h1>
          <p className={`text-base max-w-2xl mx-auto leading-relaxed ${textMuted}`}>
            ReadToEarn is an author research marketplace. Authors pay for real reader feedback 
            through quick tasks, surveys, and panels. Readers get paid for their time. 
            Wide authors can also fund bounty pools for verified quiz passes.
          </p>
        </div>

        {/* For Readers */}
        <div className="mb-16">
          <h2 className={`font-serif text-3xl mb-8 ${textPrimary}`}>For Readers</h2>
          <div className="space-y-4">
            {[
              'Sign up for a free account. Verify your email and phone number (18+ only).',
              'Browse the Earn page for open Quick Tasks, Surveys, and Panels.',
              'Complete a task — vote on a cover, answer survey questions, or read a sample chapter and give feedback.',
              'Get paid per completed task. Earnings go to your account balance instantly.',
              'Cash out via bank transfer or Wise once you hit $10.',
              'Wide authors may also fund bounty pools where you can pass their book quiz and earn from the pool.',
            ].map((step, i) => (
              <div key={i} className={`rounded-xl border p-5 flex items-start gap-4 transition-colors ${cardBg}`}>
                <span className="text-[#D4A843] font-serif text-xl font-bold shrink-0 w-6 text-center">{i + 1}</span>
                <p className={`text-sm leading-relaxed ${textMuted}`}>{step}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Ways to Earn */}
        <div className="mb-16">
          <h2 className={`font-serif text-3xl mb-8 ${textPrimary}`}>Ways to Earn</h2>
          <div className="space-y-6">

            {/* Quick Tasks */}
            <div className={`rounded-xl border p-6 transition-colors ${cardBg}`}>
              <div className="flex items-center gap-3 mb-3">
                <ClipboardList className="text-[#D4A843] shrink-0" size={22} />
                <h3 className={`font-serif text-xl ${textPrimary}`}>Quick Tasks</h3>
                <span className={`text-xs ${textMuted} italic`}>— 1–3 minutes</span>
              </div>
              <p className={`text-sm mb-4 ${textMuted}`}>
                Fast gut-check decisions for authors. Vote on cover art, test a title, rate a blurb, or 
                compare hook options. Tasks are short, fill fast, and pay $0.35–$0.42 on completion.
              </p>
              <div className={`text-xs rounded-lg p-3 border-l-2 border-[#D4A843] ${isDark ? 'bg-[#1B2A4A]/60' : 'bg-[#F5F0E8]'}`}>
                <p className={`font-semibold mb-1 ${textPrimary}`}>Example</p>
                <p className={textMuted}>An author uploads two cover options. You pick your favorite and rate them. 30 seconds, $0.38. Done.</p>
              </div>
            </div>

            {/* Surveys */}
            <div className={`rounded-xl border p-6 transition-colors ${cardBg}`}>
              <div className="flex items-center gap-3 mb-3">
                <MessageSquare className="text-[#D4A843] shrink-0" size={22} />
                <h3 className={`font-serif text-xl ${textPrimary}`}>Surveys</h3>
                <span className={`text-xs ${textMuted} italic`}>— 5–15 minutes</span>
              </div>
              <p className={`text-sm mb-4 ${textMuted}`}>
                Deeper insight on packaging, positioning, and audience fit. Authors test blurbs, tropes, 
                hooks, comp titles, and concepts. $1.00 per survey.
              </p>
              <div className={`text-xs rounded-lg p-3 border-l-2 border-[#D4A843] ${isDark ? 'bg-[#1B2A4A]/60' : 'bg-[#F5F0E8]'}`}>
                <p className={`font-semibold mb-1 ${textPrimary}`}>Example</p>
                <p className={textMuted}>An author asks: "Which trope combo appeals to you more — enemies-to-lovers + forced proximity, or grumpy/sunshine + marriage of convenience?" You answer 10 questions, earn $1.00.</p>
              </div>
            </div>

            {/* Beta Panels */}
            <div className={`rounded-xl border p-6 transition-colors ${cardBg}`}>
              <div className="flex items-center gap-3 mb-3">
                <BookOpen className="text-[#D4A843] shrink-0" size={22} />
                <h3 className={`font-serif text-xl ${textPrimary}`}>Beta Reader Panels</h3>
                <span className={`text-xs ${textMuted} italic`}>— 15–20 minutes</span>
              </div>
              <p className={`text-sm mb-4 ${textMuted}`}>
                Authors upload the first chapter of their unpublished book. You read it, answer structured 
                questions, and optionally leave your email if you're interested in full beta reading off-platform. 
                $1.50 per panel.
              </p>
              <div className={`text-xs rounded-lg p-3 border-l-2 border-[#D4A843] ${isDark ? 'bg-[#1B2A4A]/60' : 'bg-[#F5F0E8]'}`}>
                <p className={`font-semibold mb-1 ${textPrimary}`}>Example</p>
                <p className={textMuted}>An author uploads their opening chapter. You read it, rate the hook, and answer 5 questions about pacing and character introduction. 15 minutes, $1.50.</p>
              </div>
            </div>

            {/* Sensitivity Panels */}
            <div className={`rounded-xl border p-6 transition-colors ${cardBg}`}>
              <div className="flex items-center gap-3 mb-3">
                <Eye className="text-[#D4A843] shrink-0" size={22} />
                <h3 className={`font-serif text-xl ${textPrimary}`}>Sensitivity Reader Panels</h3>
                <span className={`text-xs ${textMuted} italic`}>— 15–20 minutes</span>
              </div>
              <p className={`text-sm mb-4 ${textMuted}`}>
                Authors with diverse stories need readers from specific backgrounds. You read a sample 
                chapter and answer structured questions about representation, accuracy, and authenticity. 
                $10.00 per panel. Your lived experience is the qualification.
              </p>
              <div className={`text-xs rounded-lg p-3 border-l-2 border-[#D4A843] ${isDark ? 'bg-[#1B2A4A]/60' : 'bg-[#F5F0E8]'}`}>
                <p className={`font-semibold mb-1 ${textPrimary}`}>Example</p>
                <p className={textMuted}>An author writing a story with a Deaf protagonist wants feedback from Deaf readers. Qualified readers review a chapter and answer questions about authenticity. 15 minutes, $10.00.</p>
              </div>
            </div>

            {/* Bounties */}
            <div className={`rounded-xl border p-6 transition-colors ${cardBg}`}>
              <div className="flex items-center gap-3 mb-3">
                <DollarSign className="text-[#D4A843] shrink-0" size={22} />
                <h3 className={`font-serif text-xl ${textPrimary}`}>Author Bounties</h3>
                <span className={`text-xs ${textMuted} italic`}>— per quiz pass</span>
              </div>
              <p className={`text-sm mb-4 ${textMuted}`}>
                Wide authors fund a pool and pay per quiz pass. Read their book, take the 10-question quiz 
                in 8 minutes, and pass to earn.  When the pool runs dry, the quiz stays open for fun.
              </p>
              <div className={`text-xs rounded-lg p-3 border-l-2 border-[#D4A843] ${isDark ? 'bg-[#1B2A4A]/60' : 'bg-[#F5F0E8]'}`}>
                <p className={`font-semibold mb-1 ${textPrimary}`}>Example</p>
                <p className={textMuted}>An author funds a $50 bounty pool at $1 per pass. 40 readers can pass the quiz and earn $1 each. The platform keeps 20% ($10), readers earn $40 total.</p>
              </div>
            </div>

          </div>
        </div>

        {/* For Authors */}
        <div className="mb-16">
          <h2 className={`font-serif text-3xl mb-8 ${textPrimary}`}>For Authors</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className={`rounded-xl border p-6 transition-colors ${cardBg}`}>
              <ClipboardList className="text-[#D4A843] mb-3" size={22} />
              <h3 className={`font-serif text-lg mb-2 ${textPrimary}`}>Research Marketplace</h3>
              <p className={`text-sm ${textMuted}`}>
                Purchase Quick Tasks, Surveys, or Panels and get real reader feedback on your covers, 
                blurbs, hooks, concepts, and samples. Pricing starts at $14 for 25 task completions.
              </p>
            </div>
            <div className={`rounded-xl border p-6 transition-colors ${cardBg}`}>
              <BookOpen className="text-[#D4A843] mb-3" size={22} />
              <h3 className={`font-serif text-lg mb-2 ${textPrimary}`}>Listings + Quizzes</h3>
              <p className={`text-sm ${textMuted}`}>
                List your book in the library with an always-available quiz. Readers discover you while 
                browsing. Single listing: $7.
              </p>
            </div>
            <div className={`rounded-xl border p-6 transition-colors ${cardBg}`}>
              <DollarSign className="text-[#D4A843] mb-3" size={22} />
              <h3 className={`font-serif text-lg mb-2 ${textPrimary}`}>Bounties (Wide)</h3>
              <p className={`text-sm ${textMuted}`}>
                Fund a quiz-pass bounty pool. Readers earn when they pass your book quiz. You pay only 
                for results. Minimum $25 pool. 20% platform fee.
              </p>
            </div>
            <div className={`rounded-xl border p-6 transition-colors ${cardBg}`}>
              <Eye className="text-[#D4A843] mb-3" size={22} />
              <h3 className={`font-serif text-lg mb-2 ${textPrimary}`}>Sensitivity Panels</h3>
              <p className={`text-sm ${textMuted}`}>
                Need feedback from readers with specific lived experiences? Purchase a sensitivity panel 
                and get matched. Essential: $50 for 3 readers.
              </p>
            </div>
          </div>
        </div>

        {/* Payouts */}
        <div className="mb-16">
          <h2 className={`font-serif text-3xl mb-8 ${textPrimary}`}>Payouts</h2>
          <div className={`rounded-xl border p-6 transition-colors ${cardBg}`}>
            <DollarSign className="text-[#D4A843] mb-4" size={22} />
            <div className="space-y-3">
              <p className={`text-sm ${textMuted}`}>Get paid via <span className={textPrimary}>Wise, bank transfer</span>, or other approved methods.</p>
              <p className={`text-sm ${textMuted}`}>Minimum cashout: <span className={textPrimary}>$10</span>.</p>
              <p className={`text-sm ${textMuted}`}>If you earn <span className={textPrimary}>$600+ in a year</span>, we'll ask for tax info before releasing further payouts. You'll get notified at $500 and $550.</p>
              <p className={`text-sm ${textMuted}`}>18+ only. One account per person — verified by phone + email.</p>
            </div>
          </div>
        </div>

        {/* Fairness */}
        <div className="mb-16">
          <h2 className={`font-serif text-3xl mb-8 ${textPrimary}`}>Trust & Safety</h2>
          <div className={`rounded-xl border p-6 transition-colors ${cardBg}`}>
            <Shield className="text-[#D4A843] mb-4" size={22} />
            <div className="space-y-3">
              {[
                'One account per person — verified by phone number + email.',
                '18+ only. No exceptions.',
                'Multi-accounting is banned. Fraudulent earnings are forfeited.',
                'Quiz disputes: flag a question → reviewed by our team within 72 hours.',
                'Payouts paused until tax info is provided when near IRS thresholds.',
                'ReadToEarn is a research marketplace, not a paid Amazon review service.',
              ].map((rule, i) => (
                <div key={i} className="flex items-start gap-3">
                  <AlertCircle className="text-[#D4A843] shrink-0 mt-0.5" size={15} />
                  <p className={`text-sm ${textMuted}`}>{rule}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <h2 className={`font-serif text-3xl mb-3 ${textPrimary}`}>Ready to start earning?</h2>
          <p className={`text-sm mb-8 ${textMuted}`}>Create your free account and start earning today.</p>
          <button
            onClick={() => navigateTo('/signup')}
            className="inline-flex items-center gap-2 bg-[#D4A843] text-[#1B2A4A] font-semibold px-8 py-4 rounded-xl hover:bg-[#c49a3a] transition-colors text-lg"
          >
            Create Your Free Account <ArrowRight size={20} />
          </button>
        </div>

      </div>
    </div>
  );
};
