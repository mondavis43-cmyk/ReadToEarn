import { useTheme } from '../contexts/ThemeContext';
import { FEATURES } from '../config/features';
import { useNavigate } from '../hooks/useNavigate';
import { Zap, BookOpen, Trophy, ArrowRight, Shield, DollarSign, BarChart2, AlertCircle } from 'lucide-react';

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
            Here's Exactly How It Works
          </h1>
          <p className={`text-base max-w-2xl mx-auto leading-relaxed ${textMuted}`}>
            ReadToEarn is a reading competition platform where your knowledge of books becomes your competitive edge. Whether you read the book last week or last year, the quiz is the only thing that counts. Every dollar in the prize pool comes from reader entry fees or authors who want their books read. We keep our cut and you earn yours — no gimmicks.
          </p>
        </div>

        {/* The Basics */}
        <div className="mb-16">
          <h2 className={`font-serif text-3xl mb-8 ${textPrimary}`}>The Basics</h2>
          <div className="space-y-4">
            {[
              'A book (or books) is announced for an upcoming competition.',
              'A registration window opens. Pre-register for free to express your interest and get notified when it goes live.',
              'When the competition opens, you have 48 hours to pay your entry fee before it launches.',
              'You take the 10-question quiz during the competition window. You have 8 minutes. Auto-submits when time is up.',
              'Scores are ranked. Top performer(s) earn from the prize pool.',
              'Winners are reviewed within 24–48 hours, then prizes are released.',
            ].map((step, i) => (
              <div key={i} className={`rounded-xl border p-5 flex items-start gap-4 transition-colors ${cardBg}`}>
                <span className="text-[#D4A843] font-serif text-xl font-bold shrink-0 w-6 text-center">{i + 1}</span>
                <p className={`text-sm leading-relaxed ${textMuted}`}>{step}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Three Formats */}
        <div className="mb-16">
          <h2 className={`font-serif text-3xl mb-8 ${textPrimary}`}>The Three Formats</h2>
          <div className="space-y-6">

            {/* Sprint */}
            <div className={`rounded-xl border p-6 transition-colors ${cardBg}`}>
              <div className="flex items-center gap-3 mb-3">
                <Zap className="text-[#D4A843] shrink-0" size={22} />
                <h3 className={`font-serif text-xl ${textPrimary}`}>The Sprint</h3>
                <span className={`text-xs ${textMuted} italic`}>— "A Race to the Finish Line"</span>
              </div>
              <p className={`text-sm mb-4 ${textMuted}`}>
                One book. One quiz. Score + speed decide the winner. One question answered wrong can knock you down the leaderboard. If it's a tie on score, whoever submitted faster wins.
              </p>
              <div className={`text-xs rounded-lg p-3 mb-4 ${isDark ? 'bg-[#D4A843]/10' : 'bg-[#D4A843]/10'}`}>
                <p className="text-[#D4A843] font-semibold mb-1">Scoring</p>
                <p className={textMuted}>Accuracy first. Speed second. Same score + same time = prize split.</p>
              </div>
              <div className={`text-xs rounded-lg p-3 border-l-2 border-[#D4A843] ${isDark ? 'bg-[#1B2A4A]/60' : 'bg-[#F5F0E8]'}`}>
                <p className={`font-semibold mb-1 ${textPrimary}`}>Example</p>
                <p className={textMuted}>"October Thriller Sprint — Gone Girl. Opens Friday, October 4th at 7:00 PM. Entry fee: $5." You get 10/10 in 4:12. Your opponent gets 10/10 in 3:55. They place ahead of you. That's the game.</p>
              </div>
              <p className={`text-xs mt-3 ${textMuted}`}>Duration: 24–72 hours</p>
            </div>

            {/* Read-A-Thon */}
            <div className={`rounded-xl border p-6 transition-colors ${cardBg}`}>
              <div className="flex items-center gap-3 mb-3">
                <BookOpen className="text-[#D4A843] shrink-0" size={22} />
                <h3 className={`font-serif text-xl ${textPrimary}`}>The Read-A-Thon</h3>
                <span className={`text-xs ${textMuted} italic`}>— "Book Bingo"</span>
              </div>
              <p className={`text-sm mb-4 ${textMuted}`}>
                A 4×4 bingo card of books organized by genre — one genre per row, four books per row. Pass the quiz on a book to complete that square. Complete all four books in a row to score a Bingo. The first three players to score a Bingo win from the prize pool. You don't need to read all 16 books — just one full row.
              </p>
              <div className={`text-xs rounded-lg p-3 mb-4 ${isDark ? 'bg-[#D4A843]/10' : 'bg-[#D4A843]/10'}`}>
                <p className="text-[#D4A843] font-semibold mb-1">Scoring</p>
                <p className={textMuted}>First to complete a full row scores a Bingo. 1st Bingo takes 50%, 2nd takes 30%, 3rd takes 20%. Ties broken by who completed the row fastest.</p>
              </div>
              <div className={`text-xs rounded-lg p-3 border-l-2 border-[#D4A843] ${isDark ? 'bg-[#1B2A4A]/60' : 'bg-[#F5F0E8]'}`}>
                <p className={`font-semibold mb-1 ${textPrimary}`}>Example</p>
                <p className={textMuted}>"October Book Bingo" — 4×4 card. Row 1: Fantasy. Row 2: Mystery. Row 3: Thriller. Row 4: Romance. Entry fee: $7. You focus on the Mystery row — pass all four quizzes before anyone else completes a full row. You score the 1st Bingo and take 50% of the prize pool.</p>
              </div>
              <p className={`text-xs mt-3 ${textMuted}`}>Duration: A weekend to a full week</p>
            </div>

            {/* Elimination */}
            {FEATURES.elimination && <div className={`rounded-xl border p-6 transition-colors ${cardBg}`}>
              <div className="flex items-center gap-3 mb-3">
                <Trophy className="text-[#D4A843] shrink-0" size={22} />
                <h3 className={`font-serif text-xl ${textPrimary}`}>The Elimination Bracket</h3>
                <span className={`text-xs ${textMuted} italic`}>— "A Spelling Bee for Readers"</span>
              </div>
              <p className={`text-sm mb-4 ${textMuted}`}>
                Multiple rounds. Each round, you need to hit a higher score to survive. Miss the threshold and you're out. Last readers standing compete in a final harder quiz. Each round uses a different book. Finals use a 20-question Master Quiz.
              </p>
              <div className={`text-xs rounded-lg p-3 mb-4 ${isDark ? 'bg-[#D4A843]/10' : 'bg-[#D4A843]/10'}`}>
                <p className="text-[#D4A843] font-semibold mb-1">Scoring</p>
                <p className={textMuted}>Pass/Fail per round. Finals ranked by score. Same finals score = that place split.</p>
              </div>
              <div className={`text-xs rounded-lg p-3 border-l-2 border-[#D4A843] ${isDark ? 'bg-[#1B2A4A]/60' : 'bg-[#F5F0E8]'}`}>
                <p className={`font-semibold mb-1 ${textPrimary}`}>Example</p>
                <p className={textMuted}>Round 1 — 80 enter. Read Book A. Need 8/10 to advance. 55 pass. Round 2 — 55 survivors. Read Book B. Need 9/10. 20 pass. Finals — 20 survivors take the Master Quiz. Highest score wins. 2nd & 3rd place earn smaller payouts.</p>
              </div>
              <p className={`text-xs mt-3 ${textMuted}`}>Duration: 1–2 weeks across rounds</p>
            </div>}

          </div>
        </div>

        {/* Prize Pool */}
        <div className="mb-16">
          <h2 className={`font-serif text-3xl mb-8 ${textPrimary}`}>The Prize Pool</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className={`rounded-xl border p-6 transition-colors ${cardBg}`}>
              <DollarSign className="text-[#D4A843] mb-3" size={22} />
              <h3 className={`font-serif text-lg mb-2 ${textPrimary}`}>Reader-Funded</h3>
              <p className={`text-sm ${textMuted}`}>75% of all entry fees go to winners. ReadToEarn keeps 25%.</p>
            </div>
            <div className={`rounded-xl border p-6 transition-colors ${cardBg}`}>
              <BookOpen className="text-[#D4A843] mb-3" size={22} />
              <h3 className={`font-serif text-lg mb-2 ${textPrimary}`}>Author-Sponsored</h3>
              <p className={`text-sm ${textMuted}`}>Authors pay a flat fee to fund the prize pool. Free to enter for readers.</p>
            </div>
          </div>
          <div className={`rounded-xl border p-5 transition-colors ${cardBg}`}>
            <p className={`text-sm ${textMuted}`}>
              Pre-registration is free. No payment until the competition officially launches. If a competition is canceled due to low demand, you pay nothing.
            </p>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="mb-16">
          <h2 className={`font-serif text-3xl mb-8 ${textPrimary}`}>The Leaderboard</h2>
          <div className="space-y-3">
            {[
              { label: 'Sprint', desc: 'Live leaderboard updates every ~60 seconds during the active competition window.' },
              ...(FEATURES.readathon ? [{ label: 'Read-A-Thon', desc: 'Live bingo leaderboard shows who has scored Bingos and how many squares each player has completed. Updates every ~60 seconds.' }] : []),
              ...(FEATURES.elimination ? [{ label: 'Elimination Bracket', desc: 'Live "Survived / Eliminated" status per round. Rankings shown in the final round only.' }] : []),
              { label: 'After Competition Closes', desc: 'Leaderboard freezes and stays visible for 7–14 days. Then archived in the Winners Archive.' },
            ].map(({ label, desc }) => (
              <div key={label} className={`rounded-xl border p-5 transition-colors ${cardBg}`}>
                <p className={`text-sm font-semibold mb-1 ${textPrimary}`}>{label}</p>
                <p className={`text-sm ${textMuted}`}>{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Payouts */}
        <div className="mb-16">
          <h2 className={`font-serif text-3xl mb-8 ${textPrimary}`}>Payouts</h2>
          <div className={`rounded-xl border p-6 transition-colors ${cardBg}`}>
            <BarChart2 className="text-[#D4A843] mb-4" size={22} />
            <div className="space-y-3">
              <p className={`text-sm ${textMuted}`}>Get paid via <span className={textPrimary}>PayPal, Venmo, Wise (international)</span>, or gift cards via <span className={textPrimary}>Giftogram</span>.</p>
              <p className={`text-sm ${textMuted}`}>Minimum cashout: <span className={textPrimary}>$10</span>.</p>
              <p className={`text-sm ${textMuted}`}>If you earn <span className={textPrimary}>$599+ in a year</span>, we'll ask for tax info before releasing further payouts. You'll get notified at $500 and $550.</p>
              <p className={`text-sm ${textMuted}`}>Ages 13–17: <span className={textPrimary}>gift cards only</span>.</p>
            </div>
          </div>
        </div>

        {/* Fairness */}
        <div className="mb-16">
          <h2 className={`font-serif text-3xl mb-8 ${textPrimary}`}>Fairness & Rules</h2>
          <div className={`rounded-xl border p-6 transition-colors ${cardBg}`}>
            <Shield className="text-[#D4A843] mb-4" size={22} />
            <div className="space-y-3">
              {[
                'One account per person — verified by phone number + email.',
                '8-minute quiz timer with auto-submit to limit cheating.',
                'Technical failures are reviewed case-by-case within 72 hours.',
                'Quiz disputes: flag a question → reviewed by our team → retroactive credit issued if valid.',
                'Fraudulent earnings are forfeited. Legitimate earnings prior to a ban are paid out after a 30-day review.',
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
          <h2 className={`font-serif text-3xl mb-3 ${textPrimary}`}>Ready to compete?</h2>
          <p className={`text-sm mb-8 ${textMuted}`}>Create your free account and pre-register for the next competition.</p>
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
