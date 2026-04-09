import { BookOpen, Users, Star, ArrowRight, ShieldCheck } from 'lucide-react';
import { useNavigate } from '../hooks/useNavigate';
import { useTheme } from '../contexts/ThemeContext';

export const Authors = () => {
  const { navigateTo } = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#0f1623]' : 'bg-[#F5F0E8]'}`}>
      {/* Header with dark mode toggle */}
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
          <h1 className={`font-serif text-4xl md:text-5xl mb-4 transition-colors ${isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]'}`}>
            Get Your Book Read.<br />Really Read.
          </h1>
          <p className={`text-lg max-w-xl mx-auto transition-colors ${isDark ? 'text-[#F5F0E8]/70' : 'text-[#1B2A4A]/70'}`}>
            Read to Earn pays readers to finish books and prove it. For indie and small press authors, that means real engagement — not just downloads that sit unopened.
          </p>
        </div>

        {/* Value props */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {[
            {
              icon: BookOpen,
              title: 'Proven Readership',
              desc: 'Readers only earn their reward after passing a 10-question quiz. No skimming, no shortcuts. Just people who actually finished your book.',
            },
            {
              icon: Users,
              title: 'Built-in Audience',
              desc: 'Your book gets listed in our library and shown to active readers who are already motivated to read and earn.',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className={`rounded-lg p-6 border transition-colors ${
                isDark
                  ? 'bg-[#1B2A4A]/60 border-[#D4A843]/20'
                  : 'bg-white border-[#D4A843]/30'
              }`}
            >
              <Icon className={`w-6 h-6 mb-3 ${isDark ? 'text-[#D4A843]' : 'text-[#1B2A4A]'}`} />
              <h3 className={`font-medium mb-2 transition-colors ${isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]'}`}>{title}</h3>
              <p className={`text-sm leading-relaxed transition-colors ${isDark ? 'text-[#F5F0E8]/65' : 'text-[#1B2A4A]/65'}`}>{desc}</p>
            </div>
          ))}
        </div>

        {/* Pricing + why it's paid */}
        <div className={`rounded-lg p-8 border mb-16 transition-colors ${isDark ? 'bg-[#1B2A4A]/60 border-[#D4A843]/20' : 'bg-white border-[#D4A843]/30'}`}>
          <h2 className={`font-serif text-2xl mb-3 transition-colors ${isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]'}`}>
            This is a paid service
          </h2>
          <p className={`text-sm leading-relaxed mb-4 transition-colors ${isDark ? 'text-[#F5F0E8]/65' : 'text-[#1B2A4A]/65'}`}>
            Listing your book on Read to Earn requires a one-time listing fee. Here is why:
          </p>
          <ul className="space-y-3 mb-6">
            {[
              "Unlike bestsellers, indie books do not have ready-made quiz questions floating around online. Authors write their own questions, and our team reviews every submission to make sure they are fair and accurate.",
              "Without an existing fanbase or demand, readers will not seek out your book on their own. Only popular releases they already know get requested organically.",
              "Paying for a listing means your book does not need to already be popular to get read. Readers will discover it by browsing the library.",
            ].map((point, i) => (
              <li key={i} className="flex gap-3 items-start">
                <span className={`mt-0.5 transition-colors ${isDark ? 'text-[#D4A843]/60' : 'text-[#1B2A4A]/40'}`}>—</span>
                <p className={`text-sm leading-relaxed transition-colors ${isDark ? 'text-[#F5F0E8]/65' : 'text-[#1B2A4A]/65'}`}>{point}</p>
              </li>
            ))}
          </ul>

          {/* Pricing table */}
          <div className={`rounded-lg overflow-hidden border transition-colors ${isDark ? 'border-[#D4A843]/20' : 'border-[#1B2A4A]/10'}`}>
            <div className={`px-4 py-2 text-xs font-medium uppercase tracking-wide transition-colors ${isDark ? 'bg-[#D4A843]/10 text-[#D4A843]' : 'bg-[#1B2A4A]/5 text-[#1B2A4A]'}`}>
              Listing Bundles
            </div>
            {[
              { qty: '1 listing', price: '$45', savings: null },
              { qty: '3 listings', price: '$120', savings: 'Save $15' },
              { qty: '5 listings', price: '$185', savings: 'Save $40' },
              { qty: '10 listings', price: '$340', savings: 'Save $110' },
              { qty: '25 listings', price: '$750', savings: 'Save $375' },
            ].map(({ qty, price, savings }, i) => (
              <div
                key={i}
                className={`flex items-center justify-between px-4 py-3 text-sm transition-colors ${
                  i % 2 === 0
                    ? isDark ? 'bg-[#1B2A4A]/30' : 'bg-[#1B2A4A]/3'
                    : isDark ? 'bg-transparent' : 'bg-transparent'
                } ${isDark ? 'border-t border-[#D4A843]/10' : 'border-t border-[#1B2A4A]/5'}`}
              >
                <span className={`transition-colors ${isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]'}`}>{qty}</span>
                <div className="flex items-center gap-3">
                  {savings && (
                    <span className="text-xs text-[#D4A843] font-medium">{savings}</span>
                  )}
                  <span className={`font-medium transition-colors ${isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]'}`}>{price}</span>
                </div>
              </div>
            ))}
          </div>

          <p className={`text-sm mt-4 transition-colors ${isDark ? 'text-[#F5F0E8]/65' : 'text-[#1B2A4A]/65'}`}>
            Unused listings never expire. Buy a bundle now and use your credits whenever you are ready.
          </p>
        </div>

        {/* Approval guarantee */}
        <div className={`rounded-lg p-6 border mb-16 flex gap-4 items-start transition-colors ${isDark ? 'bg-[#1B2A4A]/60 border-[#D4A843]/20' : 'bg-white border-[#D4A843]/30'}`}>
          <ShieldCheck className="w-6 h-6 text-[#D4A843] flex-shrink-0 mt-0.5" />
          <div>
            <h3 className={`font-medium mb-1 transition-colors ${isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]'}`}>
              Guaranteed approval
            </h3>
            <p className={`text-sm leading-relaxed transition-colors ${isDark ? 'text-[#F5F0E8]/65' : 'text-[#1B2A4A]/65'}`}>
              Every book that is submitted and paid for is approved — no popularity requirements, no gatekeeping. The only exceptions are books with hateful content or AI-generated covers or writing.
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="mb-16">
          <h2 className={`font-serif text-2xl mb-6 text-center transition-colors ${isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]'}`}>
            How It Works
          </h2>
          <div className="space-y-4">
            {[
              {
                step: '1',
                title: 'Submit your book',
                desc: 'Fill out the form with your book details, page count, and genre. You will also write the 10 quiz questions — our team reviews them before your listing goes live.',
              },
              {
                step: '2',
                title: 'We review and list it',
                desc: 'Our team reviews your submission and quiz questions, then adds your book to the library. This usually takes a few business days.',
              },
              {
                step: '3',
                title: 'Readers earn, you grow',
                desc: 'Readers complete your book, pass the quiz, and earn their bounty. You get verified reads and genuine word-of-mouth.',
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-[#D4A843] text-[#1B2A4A] text-sm font-bold flex items-center justify-center flex-shrink-0">
                  {step}
                </div>
                <div>
                  <h3 className={`font-medium mb-1 transition-colors ${isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]'}`}>{title}</h3>
                  <p className={`text-sm leading-relaxed transition-colors ${isDark ? 'text-[#F5F0E8]/65' : 'text-[#1B2A4A]/65'}`}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial placeholder */}
        <div className={`rounded-lg p-6 border mb-12 text-center transition-colors ${isDark ? 'bg-[#1B2A4A]/60 border-[#D4A843]/20' : 'bg-white border-[#D4A843]/30'}`}>
          <Star className="w-5 h-5 text-[#D4A843] mx-auto mb-3" />
          <p className={`italic mb-3 transition-colors ${isDark ? 'text-[#F5F0E8]/80' : 'text-[#1B2A4A]/80'}`}>
            "I have tried every book promotion platform out there. Read to Earn is the only one where I know people actually finished my book."
          </p>
          <p className={`text-sm transition-colors ${isDark ? 'text-[#F5F0E8]/40' : 'text-[#1B2A4A]/40'}`}>
            — Indie author, early access
          </p>
        </div>

        {/* CTA */}
        <div className="text-center">
          <h2 className={`font-serif text-2xl mb-3 transition-colors ${isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]'}`}>
            Ready to get started?
          </h2>
          <p className={`mb-6 transition-colors ${isDark ? 'text-[#F5F0E8]/65' : 'text-[#1B2A4A]/65'}`}>
            Submit your book and we will have it reviewed within a few business days.
          </p>
          <button
            onClick={() => navigateTo('/author-submit')}
            className="inline-flex items-center gap-2 bg-[#D4A843] text-[#1B2A4A] font-medium px-8 py-3 rounded-lg hover:bg-[#D4A843]/85 transition"
          >
            Submit Your Book
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
