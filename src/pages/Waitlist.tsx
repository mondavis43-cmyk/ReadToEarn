import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { BookOpen, DollarSign, Brain, ArrowRight } from 'lucide-react';

export const Waitlist = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: insertError } = await supabase
      .from('waitlist')
      .insert({ email });

    if (insertError) {
      if (insertError.code === '23505') {
        setError("You're already on the list!");
      } else {
        setError('Something went wrong. Try again.');
      }
      setLoading(false);
      return;
    }

    setSubmitted(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <h1 className="font-serif text-3xl text-white">Read to Earn</h1>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-4 py-20 w-full">
        {/* Hero */}
        <div className="text-center mb-20">
          <div className="inline-block bg-green-900/30 border border-green-900/50 text-green-400 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            Coming Soon
          </div>
          <h2 className="font-serif text-5xl text-white mb-6 leading-tight">
            Get paid to read<br />classic literature.
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Read books, take quizzes on them, and earn real money. No subscriptions, no gimmicks — just read and get paid.
          </p>
        </div>

        {/* How it works */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
            <div className="w-10 h-10 bg-green-900/30 rounded-lg flex items-center justify-center mb-4">
              <BookOpen className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-white font-semibold mb-2">1. Pick a book</h3>
            <p className="text-gray-400 text-sm">
              Browse our library of classic literature. Every book has a listed payout based on its page count.
            </p>
          </div>
          <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
            <div className="w-10 h-10 bg-green-900/30 rounded-lg flex items-center justify-center mb-4">
              <Brain className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-white font-semibold mb-2">2. Take the quiz</h3>
            <p className="text-gray-400 text-sm">
              Answer 10 questions about the book to prove you read it. Pass and the bounty is yours.
            </p>
          </div>
          <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
            <div className="w-10 h-10 bg-green-900/30 rounded-lg flex items-center justify-center mb-4">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-white font-semibold mb-2">3. Cash out</h3>
            <p className="text-gray-400 text-sm">
              Redeem your earnings via PayPal, Venmo, or gift cards from your favorite brands.
            </p>
          </div>
        </div>

        {/* Waitlist form */}
        <div className="max-w-md mx-auto text-center">
          <h3 className="font-serif text-2xl text-white mb-2">Get early access</h3>
          <p className="text-gray-400 text-sm mb-8">
            Want to be among the first to know when Read to Earn goes live? Drop your email and we'll let you know when you're in.
          </p>

          {submitted ? (
            <div className="bg-green-900/20 border border-green-900/50 rounded-lg p-6">
              <p className="text-green-400 font-medium">You're on the list!</p>
              <p className="text-gray-400 text-sm mt-1">We'll email you when Read to Earn goes live.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
              />
              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black font-medium py-3 rounded-lg hover:bg-gray-200 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Joining...' : (
                  <>
                    Notify me <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </main>

      <footer className="border-t border-gray-800 py-6 text-center">
        <p className="text-gray-600 text-sm">© 2026 Read to Earn. All rights reserved.</p>
      </footer>
    </div>
  );
};
