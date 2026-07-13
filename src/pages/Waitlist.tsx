import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { BookOpen, DollarSign, Brain, ArrowRight } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export const Waitlist = () => {
  const [email, setEmail] = useState('');
  const [betaEmail, setBetaEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [betaLoading, setBetaLoading] = useState(false);
  const [betaError, setBetaError] = useState('');
  const [hasAccess, setHasAccess] = useState(
    () => sessionStorage.getItem('beta_access') === 'true'
  );
  const { theme, toggleTheme } = useTheme();

  const handleBetaCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setBetaError('');
    setBetaLoading(true);

    const { data } = await supabase
      .from('beta_access')
      .select('email')
      .eq('email', betaEmail.toLowerCase().trim())
      .maybeSingle();

    if (data) {
      sessionStorage.setItem('beta_access', 'true');
      setHasAccess(true);
    } else {
      setBetaError("You're not on the beta list yet. Join the waitlist below.");
    }

    setBetaLoading(false);
  };

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

  // ── BETA ACCESS GRANTED ───────────────────────────────────────────────────
  if (hasAccess) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] dark:bg-[#0f0f0f] flex flex-col transition-colors duration-200">
        <header className="border-b border-[#1B2A4A]/10 dark:border-gray-800">
          <div className="max-w-5xl mx-auto px-4 py-6 flex justify-between items-center">
            <h1 className="font-serif text-3xl text-[#1B2A4A] dark:text-[#F5F0E8]">Read to Earn</h1>
            <button
              onClick={toggleTheme}
              className="text-[#1B2A4A]/50 dark:text-[#F5F0E8]/50 hover:text-[#1B2A4A] dark:hover:text-[#F5F0E8] transition"
              aria-label="Toggle dark mode"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="inline-block bg-[#D4A843]/20 border border-[#D4A843]/40 text-[#1B2A4A] dark:text-[#D4A843] text-sm font-medium px-4 py-1.5 rounded-full mb-6">
              Beta Access
            </div>
            <h2 className="font-serif text-4xl text-[#1B2A4A] dark:text-[#F5F0E8] mb-4">
              You're in.
            </h2>
            <p className="text-[#2C2C2C]/60 dark:text-gray-400 mb-8">
              Welcome to the Read to Earn beta. Head to the app to get started.
            </p>
            <button
              onClick={() => {
                window.history.pushState({}, '', '/');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="inline-flex items-center gap-2 bg-[#1B2A4A] hover:bg-[#142038] dark:bg-[#D4A843] dark:hover:bg-[#bf9538] dark:text-[#1B2A4A] text-[#F5F0E8] font-medium px-6 py-3 rounded-lg transition"
            >
              Go to app <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ── GATE: enter email to check beta access ────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F5F0E8] dark:bg-[#0f0f0f] flex flex-col transition-colors duration-200">

      {/* Header */}
      <header className="border-b border-[#1B2A4A]/10 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="font-serif text-3xl text-[#1B2A4A] dark:text-[#F5F0E8]">Read to Earn</h1>
          <button
            onClick={toggleTheme}
            className="text-[#1B2A4A]/50 dark:text-[#F5F0E8]/50 hover:text-[#1B2A4A] dark:hover:text-[#F5F0E8] transition"
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-4 py-20 w-full">

        {/* Hero */}
        <div className="text-center mb-20">
          <div className="inline-block bg-[#D4A843]/20 border border-[#D4A843]/40 text-[#1B2A4A] dark:text-[#D4A843] text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            Coming Soon
          </div>
          <h2 className="font-serif text-5xl text-[#1B2A4A] dark:text-[#F5F0E8] mb-6 leading-tight">
            Prove you read it.<br />Get paid for it.
          </h2>
          <p className="text-[#2C2C2C]/60 dark:text-gray-400 text-lg max-w-xl mx-auto">
            Read books, pass a 10-question quiz, and earn real money.
          </p>
        </div>

        {/* How it works */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-lg p-6 border border-[#e8e0d5] dark:border-gray-800">
            <div className="w-10 h-10 bg-[#D4A843]/15 dark:bg-[#D4A843]/10 rounded-lg flex items-center justify-center mb-4">
              <BookOpen className="w-5 h-5 text-[#D4A843]" />
            </div>
            <h3 className="text-[#1B2A4A] dark:text-[#F5F0E8] font-semibold mb-2">1. Pick a book</h3>
            <p className="text-[#2C2C2C]/60 dark:text-gray-400 text-sm">
              Browse our library of popular releases, indie titles, classic literature, and more. Books with active bounties or competitions show their payout upfront.
            </p>
          </div>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-lg p-6 border border-[#e8e0d5] dark:border-gray-800">
            <div className="w-10 h-10 bg-[#D4A843]/15 dark:bg-[#D4A843]/10 rounded-lg flex items-center justify-center mb-4">
              <Brain className="w-5 h-5 text-[#D4A843]" />
            </div>
            <h3 className="text-[#1B2A4A] dark:text-[#F5F0E8] font-semibold mb-2">2. Pass the quiz</h3>
            <p className="text-[#2C2C2C]/60 dark:text-gray-400 text-sm">
              Answer 10 questions in 8 minutes to prove you actually read it. Questions go deep. No skimming your way through.
            </p>
          </div>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-lg p-6 border border-[#e8e0d5] dark:border-gray-800">
            <div className="w-10 h-10 bg-[#D4A843]/15 dark:bg-[#D4A843]/10 rounded-lg flex items-center justify-center mb-4">
              <DollarSign className="w-5 h-5 text-[#D4A843]" />
            </div>
            <h3 className="text-[#1B2A4A] dark:text-[#F5F0E8] font-semibold mb-2">3. Cash out</h3>
            <p className="text-[#2C2C2C]/60 dark:text-gray-400 text-sm">
              Once you hit $10, redeem via bank transfer. No subscription required to start earning.
            </p>
          </div>
        </div>

        {/* Beta check + waitlist */}
        <div className="max-w-md mx-auto text-center">
          <h3 className="font-serif text-2xl text-[#1B2A4A] dark:text-[#F5F0E8] mb-2">Have beta access?</h3>
          <p className="text-[#2C2C2C]/60 dark:text-gray-400 text-sm mb-6">
            Enter your email to check if you've been approved.
          </p>

          <form onSubmit={handleBetaCheck} className="flex flex-col gap-3 mb-10">
            <input
              type="email"
              value={betaEmail}
              onChange={(e) => setBetaEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full px-4 py-3 bg-white dark:bg-[#1a1a1a] border border-[#e8e0d5] dark:border-gray-700 rounded-lg text-[#2C2C2C] dark:text-[#F5F0E8] placeholder-[#2C2C2C]/30 dark:placeholder-gray-600 focus:outline-none focus:border-[#1B2A4A] dark:focus:border-[#D4A843] transition"
            />
            {betaError && (
              <p className="text-red-500 dark:text-red-400 text-sm">{betaError}</p>
            )}
            <button
              type="submit"
              disabled={betaLoading}
              className="w-full bg-[#1B2A4A] hover:bg-[#142038] dark:bg-[#D4A843] dark:hover:bg-[#bf9538] dark:text-[#1B2A4A] text-[#F5F0E8] font-medium py-3 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {betaLoading ? 'Checking...' : (
                <>
                  Check access <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="border-t border-[#1B2A4A]/10 dark:border-gray-800 pt-10">
            <h3 className="font-serif text-2xl text-[#1B2A4A] dark:text-[#F5F0E8] mb-2">Not approved yet?</h3>
            <p className="text-[#2C2C2C]/60 dark:text-gray-400 text-sm mb-8">
              We're launching soon. Join the waitlist and we'll let you know the moment you can start earning.
            </p>

            {submitted ? (
              <div className="bg-[#D4A843]/10 border border-[#D4A843]/40 rounded-lg p-6">
                <p className="text-[#1B2A4A] dark:text-[#F5F0E8] font-medium">You're on the list!</p>
                <p className="text-[#2C2C2C]/60 dark:text-gray-400 text-sm mt-1">We'll email you when Read to Earn goes live.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full px-4 py-3 bg-white dark:bg-[#1a1a1a] border border-[#e8e0d5] dark:border-gray-700 rounded-lg text-[#2C2C2C] dark:text-[#F5F0E8] placeholder-[#2C2C2C]/30 dark:placeholder-gray-600 focus:outline-none focus:border-[#1B2A4A] dark:focus:border-[#D4A843] transition"
                />
                {error && (
                  <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1B2A4A]/60 hover:bg-[#142038]/60 dark:bg-[#D4A843]/60 dark:hover:bg-[#bf9538]/60 dark:text-[#1B2A4A] text-[#F5F0E8] font-medium py-3 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
        </div>
      </main>

      <footer className="border-t border-[#1B2A4A]/10 dark:border-gray-800 py-6 text-center">
        <p className="text-[#2C2C2C]/40 dark:text-gray-600 text-sm">© 2026 Read to Earn. All rights reserved.</p>
      </footer>
    </div>
  );
};
