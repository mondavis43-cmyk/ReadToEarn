import { BookOpen, Users, Star, ArrowRight, ShieldCheck } from 'lucide-react';
import { useNavigate } from '../hooks/useNavigate';

export const Authors = () => {
  const { navigateTo } = useNavigate();

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <div className="max-w-3xl mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="font-serif text-4xl md:text-5xl text-white mb-4">
            Get Your Book Read.<br />Really Read.
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Read to Earn pays readers to finish books and prove it. As an indie author, that means real engagement — not just downloads that sit unopened.
          </p>
        </div>

        {/* Value props */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {[
            {
              icon: BookOpen,
              title: 'Proven Readership',
              desc: 'Readers only earn their reward after passing a 10-question quiz. No skimming, no shortcuts — just people who actually finished your book.',
            },
            {
              icon: Users,
              title: 'Built-in Audience',
              desc: 'Your book gets listed in our library and shown to active readers who are already motivated to read and earn.',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
              <Icon className="w-6 h-6 text-white mb-3" />
              <h3 className="text-white font-medium mb-2">{title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Pricing + why it's paid */}
        <div className="bg-[#1a1a1a] rounded-lg p-8 border border-gray-800 mb-16">
          <h2 className="font-serif text-2xl text-white mb-3">This is a paid service</h2>
          <p className="text-gray-400 text-sm leading-relaxed mb-4">
            Listing your book on Read to Earn requires a one-time submission fee. Here's why:
          </p>
          <ul className="space-y-3 mb-6">
            {[
              "Unlike bestsellers, indie books don't have ready-made quiz questions floating around online. We build them from scratch for every book.",
              "Without an existing fanbase or demand, readers won't request your books on their own. Only the popular releases they're already familiar with.",
              "Paying for this service means your book doesn't need to already be popular to get read. Readers will discover your book by featuring on the site.",
            ].map((point, i) => (
              <li key={i} className="flex gap-3 items-start">
                <span className="text-gray-500 mt-0.5">—</span>
                <p className="text-gray-400 text-sm leading-relaxed">{point}</p>
              </li>
            ))}
          </ul>
          <p className="text-gray-300 text-sm">
            The fee covers quiz creation and reader bounties. A 300-page book costs <span className="text-white font-medium">$2.55 per verified reader</span> who completes it.
          </p>
        </div>

        {/* Approval guarantee */}
        <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800 mb-16 flex gap-4 items-start">
          <ShieldCheck className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-white font-medium mb-1">Guaranteed approval</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Every book that's submitted and paid for is approved — no popularity requirements, no gatekeeping. The only exceptions are books with hateful content or AI-generated covers or writing.
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="mb-16">
          <h2 className="font-serif text-2xl text-white mb-6 text-center">How It Works</h2>
          <div className="space-y-4">
            {[
              { step: '1', title: 'Submit your book', desc: 'Fill out the form with your book details, page count, and genre. Upload or write your quiz questions.' },
              { step: '2', title: 'We review and list it', desc: 'Our team reviews your submission and adds it to the library, usually within a few days.' },
              { step: '3', title: 'Readers earn, you grow', desc: 'Readers complete your book, pass the quiz, and earn their bounty. You get verified reads and word-of-mouth.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-white text-black text-sm font-bold flex items-center justify-center flex-shrink-0">
                  {step}
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1">{title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial placeholder */}
        <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800 mb-12 text-center">
          <Star className="w-5 h-5 text-yellow-400 mx-auto mb-3" />
          <p className="text-gray-300 italic mb-3">
            "I've tried every book promotion platform out there. Read to Earn is the only one where I know people actually finished my book."
          </p>
          <p className="text-gray-500 text-sm">— Indie author, early access</p>
        </div>

        {/* CTA */}
        <div className="text-center">
          <h2 className="font-serif text-2xl text-white mb-3">Ready to get started?</h2>
          <p className="text-gray-400 mb-6">Submit your book and we'll be in touch within 48 hours.</p>
          <button
            onClick={() => navigateTo('/author-submit')}
            className="inline-flex items-center gap-2 bg-white text-black font-medium px-8 py-3 rounded-lg hover:bg-gray-200 transition"
          >
            Submit Your Book
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
