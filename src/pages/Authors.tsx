import { BookOpen, Users, Star, ArrowRight, ShieldCheck, Zap, Trophy, ClipboardList, MessageSquare, Eye, HelpCircle, Pin, Gift } from 'lucide-react';
import { useNavigate } from '../hooks/useNavigate';
import { useTheme } from '../contexts/ThemeContext';

export const Authors = () => {
  const { navigateTo } = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  const textPrimary = isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]';
  const textMuted = isDark ? 'text-[#F5F0E8]/70' : 'text-[#1B2A4A]/70';
  const cardBg = isDark ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20' : 'bg-white border-[#D4A843]/30';

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
          <h1 className={`font-serif text-4xl md:text-5xl mb-4 transition-colors ${textPrimary}`}>
            Get Your Book Read.<br />Really Read.
          </h1>
          <p className={`text-lg max-w-xl mx-auto transition-colors ${textMuted}`}>
            Real readers. Verified completions. No bots, no fake reviews — just people who actually finished your book.
          </p>
        </div>

        {/* Value Props */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-16">
          <div className={`rounded-xl border p-6 transition-colors ${cardBg}`}>
            <Users className="text-[#D4A843] mb-3" size={22} />
            <h3 className={`font-serif text-lg mb-1 ${textPrimary}`}>Proven Readership</h3>
            <p className={`text-sm ${textMuted}`}>Every reader passes a quiz to prove they finished. You get verified reads, not page clicks.</p>
          </div>
          <div className={`rounded-xl border p-6 transition-colors ${cardBg}`}>
            <BookOpen className="text-[#D4A843] mb-3" size={22} />
            <h3 className={`font-serif text-lg mb-1 ${textPrimary}`}>Built-in Audience</h3>
            <p className={`text-sm ${textMuted}`}>Our readers are here to read. They're motivated, engaged, and looking for their next book.</p>
          </div>
        </div>

        {/* List Your Book */}
        <div className="mb-16">
          <h2 className={`font-serif text-3xl mb-2 ${textPrimary}`}>List Your Book</h2>
          <p className={`text-sm mb-8 ${textMuted}`}>
            Get your book in front of readers who are actively looking for something to read and earn from.
          </p>

          <div className="space-y-3">
            {[
              { label: 'Single', price: '$7', desc: '1 book listing' },
              { label: 'Trilogy', price: '$18', desc: '3 books' },
              { label: 'Series', price: '$30', desc: '5 books' },
              { label: 'Catalog', price: '$50', desc: '10 books' },
              { label: 'Imprint', price: '$100', desc: '25 books' },
            ].map(({ label, price, desc }) => (
              <div
                key={label}
                className={`rounded-xl border p-5 flex items-center justify-between transition-colors ${cardBg}`}
              >
                <div>
                  <span className={`font-semibold ${textPrimary}`}>{label}</span>
                  <span className={`text-sm ml-2 ${textMuted}`}>{desc}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[#D4A843] font-semibold">{price}</span>
                  <button
                    onClick={() => navigateTo('/author-submit')}
                    className="inline-flex items-center gap-1 text-sm text-[#D4A843] hover:underline"
                  >
                    Submit <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* More Ways to Grow */}
        <div className="mb-16">
          <h2 className={`font-serif text-3xl mb-2 ${textPrimary}`}>More Ways to Grow</h2>
          <p className={`text-sm mb-8 ${textMuted}`}>
            Beyond listings, we offer tools to drive immediate readership, gather feedback, and launch with momentum.
          </p>

          <div className="space-y-4">

            {/* Bounties */}
            <div className={`rounded-xl border p-6 transition-colors ${cardBg}`}>
              <div className="flex items-start gap-4">
                <Zap className="text-[#D4A843] mt-0.5 shrink-0" size={22} />
                <div className="flex-1">
                  <h3 className={`font-serif text-lg mb-1 ${textPrimary}`}>Author Bounties</h3>
                  <p className={`text-sm ${textMuted}`}>
                    Set a reader pool ($25–$500+) and guarantee a wave of verified readers right now. You only pay when readers pass the quiz. Platform keeps 20%, readers earn 80%.
                  </p>
                  <p className="text-xs mt-2 font-medium text-[#D4A843]">From $25 — pay per verified read</p>
                  <button onClick={() => navigateTo('/author-bounty')} className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#D4A843] hover:underline">
                    Set up a bounty <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Sponsored Competitions */}
            <div className={`rounded-xl border p-6 transition-colors ${cardBg}`}>
              <div className="flex items-start gap-4">
                <Trophy className="text-[#D4A843] mt-0.5 shrink-0" size={22} />
                <div className="flex-1">
                  <h3 className={`font-serif text-lg mb-1 ${textPrimary}`}>Sponsor a Competition</h3>
                  <p className={`text-sm ${textMuted}`}>
                    Fund a reading competition around your book. Readers compete, you get visibility. Platform keeps 25%, the rest goes to the prize pool.
                  </p>
                  <p className="text-xs mt-2 font-medium text-[#D4A843]">Spark $60 · Boost $120 · Spotlight $250 · Grand $500+</p>
                  <button onClick={() => navigateTo('/author-competition')} className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#D4A843] hover:underline">
                    Sponsor a competition <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Tasks */}
            <div className={`rounded-xl border p-6 transition-colors ${cardBg}`}>
              <div className="flex items-start gap-4">
                <ClipboardList className="text-[#D4A843] mt-0.5 shrink-0" size={22} />
                <div className="flex-1">
                  <h3 className={`font-serif text-lg mb-1 ${textPrimary}`}>Quick Tasks</h3>
                  <p className={`text-sm ${textMuted}`}>
                    Cover voting, title testing, blurb testing. Get real reader opinions before you launch. Fast turnaround, honest feedback.
                  </p>
                  <p className="text-xs mt-2 font-medium text-[#D4A843]">Sample $14 (25 readers) · Standard $24 (50) · Wide $42 (100)</p>
                  <button onClick={() => navigateTo('/author-quick-tasks')} className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#D4A843] hover:underline">
                    Submit a quick task <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Feedback Surveys */}
            <div className={`rounded-xl border p-6 transition-colors ${cardBg}`}>
              <div className="flex items-start gap-4">
                <MessageSquare className="text-[#D4A843] mt-0.5 shrink-0" size={22} />
                <div className="flex-1">
                  <h3 className={`font-serif text-lg mb-1 ${textPrimary}`}>Reader Feedback Surveys</h3>
                  <p className={`text-sm ${textMuted}`}>
                    Collect detailed reader feedback on your manuscript or published work. Great for understanding what's landing and what isn't.
                  </p>
                  <p className="text-xs mt-2 font-medium text-[#D4A843]">10 readers $18 · 25 readers $40 · 50 readers $70 · 100 readers $125</p>
                  <button onClick={() => navigateTo('/author-survey')} className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#D4A843] hover:underline">
                    Request a survey <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Beta Readers */}
            <div className={`rounded-xl border p-6 transition-colors ${cardBg}`}>
              <div className="flex items-start gap-4">
                <BookOpen className="text-[#D4A843] mt-0.5 shrink-0" size={22} />
                <div className="flex-1">
                  <h3 className={`font-serif text-lg mb-1 ${textPrimary}`}>Beta Reader Acquisition</h3>
                  <p className={`text-sm ${textMuted}`}>
                    Get early readers for your first chapter. A panel of motivated readers gives you pre-launch feedback before you commit to a full release.
                  </p>
                  <p className="text-xs mt-2 font-medium text-[#D4A843]">Starter $28 (10) · Standard $60 (25) · Extended $110 (50) · Pro $200 (100)</p>
                  <button onClick={() => navigateTo('/author-beta-readers')} className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#D4A843] hover:underline">
                    Find beta readers <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Sensitivity Readers */}
            <div className={`rounded-xl border p-6 transition-colors ${cardBg}`}>
              <div className="flex items-start gap-4">
                <Eye className="text-[#D4A843] mt-0.5 shrink-0" size={22} />
                <div className="flex-1">
                  <h3 className={`font-serif text-lg mb-1 ${textPrimary}`}>Sensitivity Readers</h3>
                  <p className={`text-sm ${textMuted}`}>
                    Professional sensitivity reading for diverse representation. Single, dual, or triple reader packages available.
                  </p>
                  <p className="text-xs mt-2 font-medium text-[#D4A843]">Single $50 · Dual $100 · Triple $150</p>
                  <button onClick={() => navigateTo('/author-sensitivity-readers')} className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#D4A843] hover:underline">
                    Request sensitivity readers <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* FREE AUTHOR TOOLS */}
        <div className="mb-16">
          <h2 className={`font-serif text-3xl mb-2 ${textPrimary}`}>Free Author Tools</h2>
          <p className={`text-sm mb-8 ${textMuted}`}>
            No payment required. These tools are available to every author on the platform.
          </p>

          <div className="space-y-4">

            {/* Author AMA */}
            <div className={`rounded-xl border p-6 transition-colors ${cardBg}`}>
              <div className="flex items-start gap-4">
                <HelpCircle className="text-[#D4A843] mt-0.5 shrink-0" size={22} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`font-serif text-lg ${textPrimary}`}>Author AMA</h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#D4A843]/15 text-[#D4A843] border border-[#D4A843]/30">
                      Free
                    </span>
                  </div>
                  <p className={`text-sm ${textMuted}`}>
                    Host a Reddit-style Q&A directly on the platform. Readers submit questions, you answer. Free promotion, direct access to your audience, no social media drama.
                  </p>
                </div>
              </div>
            </div>

            {/* Bulletin Board */}
            <div className={`rounded-xl border p-6 transition-colors ${cardBg}`}>
              <div className="flex items-start gap-4">
                <Pin className="text-[#D4A843] mt-0.5 shrink-0" size={22} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`font-serif text-lg ${textPrimary}`}>Bulletin Board</h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#D4A843]/15 text-[#D4A843] border border-[#D4A843]/30">
                      Free
                    </span>
                  </div>
                  <p className={`text-sm ${textMuted}`}>
                    Post your new release or upcoming book on our reader bulletin board. Includes cover, one-line blurb, genre, release date, and your link.
                  </p>
                  <button
                    onClick={() => navigateTo('/bulletin-submit')}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#D4A843] hover:underline"
                  >
                    Post to bulletin board <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Author Ambassador */}
            <div className={`rounded-xl border p-6 transition-colors ${cardBg}`}>
              <div className="flex items-start gap-4">
                <Gift className="text-[#D4A843] mt-0.5 shrink-0" size={22} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`font-serif text-lg ${textPrimary}`}>Author Ambassador Program</h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#D4A843]/15 text-[#D4A843] border border-[#D4A843]/30">
                      Free
                    </span>
                  </div>
                  <p className={`text-sm ${textMuted}`}>
                    Refer another author who buys a listing and earn 25% of their first listing fee. Share your referral link, they sign up and pay, you get credited automatically.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Approval Guarantee */}
        <div className={`rounded-xl border p-6 mb-16 transition-colors ${cardBg}`}>
          <div className="flex items-start gap-4">
            <ShieldCheck className="text-[#D4A843] mt-0.5 shrink-0" size={24} />
            <div>
              <h3 className={`font-serif text-xl mb-2 ${textPrimary}`}>Guaranteed Approval</h3>
              <p className={`text-sm ${textMuted}`}>
                No gatekeeping. No rejection based on genre, sales rank, or publisher status. If you submit a complete listing with valid quiz questions, your book gets listed. Period.
              </p>
            </div>
          </div>
        </div>

        {/* Testimonial */}
        <div className={`rounded-xl border p-6 mb-16 transition-colors ${cardBg}`}>
          <Star className="text-[#D4A843] mb-3" size={20} />
          <p className={`text-sm italic mb-3 ${textMuted}`}>
            "I've tried newsletter swaps, ARC services, BookTok ads. Nothing gave me the kind of verified, engaged readers that Read to Earn did. These people actually finished my book."
          </p>
          <p className={`text-xs font-medium ${textPrimary}`}>— Indie author, Romance</p>
        </div>

        {/* CTA */}
        <div className="text-center">
          <h2 className={`font-serif text-3xl mb-3 ${textPrimary}`}>Ready to get started?</h2>
          <p className={`text-sm mb-8 ${textMuted}`}>
            Submit your book today. We'll have it live within a few days of payment confirmation.
          </p>
          <button
            onClick={() => navigateTo('/author-submit')}
            className="inline-flex items-center gap-2 bg-[#D4A843] text-[#1B2A4A] font-semibold px-8 py-4 rounded-xl hover:bg-[#c49a3a] transition-colors text-lg"
          >
            Submit Your Book <ArrowRight size={20} />
          </button>
        </div>

      </div>
    </div>
  );
};
