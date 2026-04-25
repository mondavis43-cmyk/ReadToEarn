import { useState } from 'react';
import { useNavigate } from '../hooks/useNavigate';
import { useTheme } from '../contexts/ThemeContext';
import { CheckCircle, Zap } from 'lucide-react';

const BOUNTY_POOLS = [
  { size: 25, platform: 5, readerPool: 20, label: '$25 Pool', example: '20 readers at $1 each' },
  { size: 50, platform: 10, readerPool: 40, label: '$50 Pool', example: '40 readers at $1 each' },
  { size: 100, platform: 20, readerPool: 80, label: '$100 Pool', example: '80 readers at $1 each' },
  { size: 200, platform: 40, readerPool: 160, label: '$200 Pool', example: '160 readers at $1 each' },
  { size: 500, platform: 100, readerPool: 400, label: '$500 Pool', example: '400 readers at $1 — big launch push' },
];

const PER_PASS_OPTIONS = [0.25, 0.50, 0.75, 1.00, 1.50, 2.00];

// Pool size in dollars -> amount in cents
const POOL_CENTS: Record<number, number> = {
  25: 2500,
  50: 5000,
  100: 10000,
  200: 20000,
  500: 50000,
};

export const AuthorBounty = () => {
  const { navigateTo } = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [authorName, setAuthorName] = useState('');
  const [email, setEmail] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [selectedPool, setSelectedPool] = useState(BOUNTY_POOLS[0]);
  const [perPass, setPerPass] = useState(PER_PASS_OPTIONS[1]);

  const textPrimary = isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]';
  const textMuted = isDark ? 'text-[#F5F0E8]/70' : 'text-[#1B2A4A]/70';
  const cardBg = isDark ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20' : 'bg-white border-[#D4A843]/30';
  const inputClass = `w-full px-4 py-3 rounded-lg border text-sm transition focus:outline-none ${
    isDark
      ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20 text-[#F5F0E8] focus:border-[#D4A843]/60 placeholder:text-[#F5F0E8]/30'
      : 'bg-white border-[#1B2A4A]/20 text-[#1B2A4A] focus:border-[#D4A843] placeholder:text-[#1B2A4A]/30'
  }`;

  const estimatedReaders = Math.floor(selectedPool.readerPool / perPass);

  const isFormValid = () => authorName && email && bookTitle;

  const handleCheckout = () => {
    if (!isFormValid()) {
      setError('Please fill out all required fields.');
      return;
    }
    setError('');

    (window as any).__checkoutItem = {
      type: 'bounty',
      label: `Author Bounty — ${selectedPool.label} for "${bookTitle}"`,
      amount: POOL_CENTS[selectedPool.size],
      metadata: {
        pool_size: selectedPool.size,
        per_pass: perPass,
      },
    };

    (window as any).__pendingSubmission = {
      table: 'author_bounty_submissions',
      data: {
        author_name: authorName,
        email,
        book_title: bookTitle,
        pool_size: selectedPool.size,
        platform_fee: selectedPool.platform,
        reader_pool: selectedPool.readerPool,
        per_pass_amount: perPass,
        estimated_readers: estimatedReaders,
        status: 'active',
      },
    };

    window.history.pushState({}, '', '/checkout');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#0f1623]' : 'bg-[#F5F0E8]'}`}>

      {/* Header */}
      <div className={`border-b transition-colors duration-300 ${isDark ? 'border-[#1B2A4A] bg-[#0f1623]' : 'border-[#D4A843]/30 bg-[#F5F0E8]'}`}>
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <button
            onClick={() => navigateTo('/authors')}
            className={`font-serif text-lg font-bold transition-colors ${isDark ? 'text-[#D4A843]' : 'text-[#1B2A4A]'}`}
          >
            ← Authors
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

      <div className="max-w-2xl mx-auto px-4 py-16">

        {/* Hero */}
        <div className="text-center mb-12">
          <Zap className="text-[#D4A843] mx-auto mb-4" size={36} />
          <h1 className={`font-serif text-4xl mb-3 ${textPrimary}`}>Author Bounties</h1>
          <p className={`text-lg max-w-lg mx-auto ${textMuted}`}>
            Set a reader pool and guarantee a wave of verified readers right now. You only pay when readers pass the quiz.
          </p>
        </div>

        {/* How it works */}
        <div className={`rounded-xl border p-6 mb-10 ${cardBg}`}>
          <h2 className={`font-serif text-xl mb-4 ${textPrimary}`}>How Bounties Work</h2>
          <div className="space-y-3">
            {[
              { step: '1', text: 'You set a pool size and a per-pass payout amount.' },
              { step: '2', text: 'Readers see your book is offering a bounty and are motivated to read and pass the quiz.' },
              { step: '3', text: 'Every reader who passes earns their payout from the pool. When the pool runs out, the bounty closes.' },
              { step: '4', text: 'Platform keeps 20%. 80% goes directly to readers who finish.' },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#D4A843] text-[#1B2A4A] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {item.step}
                </div>
                <p className={`text-sm ${textMuted}`}>{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pool Picker */}
        <div className="mb-8">
          <h2 className={`font-serif text-2xl mb-2 ${textPrimary}`}>Choose Your Pool Size</h2>
          <p className={`text-sm mb-6 ${textMuted}`}>80% goes to readers. 20% is the platform fee.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {BOUNTY_POOLS.map((pool) => {
              const isSelected = selectedPool.size === pool.size;
              return (
                <button
                  key={pool.size}
                  onClick={() => setSelectedPool(pool)}
                  className={`rounded-lg border p-4 text-left transition ${
                    isSelected
                      ? 'bg-[#D4A843] border-[#D4A843] text-[#1B2A4A]'
                      : isDark
                        ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20 text-[#F5F0E8] hover:border-[#D4A843]/50'
                        : 'bg-white border-[#1B2A4A]/20 text-[#1B2A4A] hover:border-[#D4A843]'
                  }`}
                >
                  <p className="font-bold text-lg">${pool.size}</p>
                  <p className={`text-xs mt-1 ${isSelected ? 'text-[#1B2A4A]/70' : textMuted}`}>
                    ${pool.readerPool} to readers
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Per Pass Picker */}
        <div className="mb-8">
          <h2 className={`font-serif text-2xl mb-2 ${textPrimary}`}>Per-Pass Payout</h2>
          <p className={`text-sm mb-6 ${textMuted}`}>
            How much each reader earns when they pass the quiz. Lower = more readers reached. Higher = stronger incentive per reader.
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {PER_PASS_OPTIONS.map((amount) => {
              const isSelected = perPass === amount;
              return (
                <button
                  key={amount}
                  onClick={() => setPerPass(amount)}
                  className={`rounded-lg border p-3 text-center transition ${
                    isSelected
                      ? 'bg-[#D4A843] border-[#D4A843] text-[#1B2A4A]'
                      : isDark
                        ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20 text-[#F5F0E8] hover:border-[#D4A843]/50'
                        : 'bg-white border-[#1B2A4A]/20 text-[#1B2A4A] hover:border-[#D4A843]'
                  }`}
                >
                  <p className="font-bold">${amount.toFixed(2)}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Summary */}
        <div className={`rounded-xl border p-6 mb-10 ${cardBg}`}>
          <h2 className={`font-serif text-xl mb-4 ${textPrimary}`}>Bounty Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className={textMuted}>Total pool</span>
              <span className={`font-medium ${textPrimary}`}>${selectedPool.size}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className={textMuted}>Platform fee (20%)</span>
              <span className={`font-medium ${textPrimary}`}>${selectedPool.platform}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className={textMuted}>Reader pool (80%)</span>
              <span className="text-green-500 font-medium">${selectedPool.readerPool}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className={textMuted}>Per-pass payout</span>
              <span className={`font-medium ${textPrimary}`}>${perPass.toFixed(2)}</span>
            </div>
            <div className={`border-t pt-3 mt-3 flex justify-between ${isDark ? 'border-[#D4A843]/20' : 'border-[#1B2A4A]/10'}`}>
              <span className={`font-medium ${textPrimary}`}>Estimated readers reached</span>
              <span className="text-[#D4A843] font-bold text-lg">~{estimatedReaders}</span>
            </div>
          </div>
        </div>

        {/* Author Info */}
        <div className="mb-10">
          <h2 className={`font-serif text-2xl mb-6 ${textPrimary}`}>Your Information</h2>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>
                  Your Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className={inputClass}
                  placeholder="Author or publisher name"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="Payment confirmation sent here"
                />
              </div>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>
                Book Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                className={inputClass}
                placeholder="Must already be listed on Read to Earn"
              />
              <p className={`text-xs mt-1 ${textMuted}`}>
                Bounties can only be set on books already listed on the platform.{' '}
                <button
                  onClick={() => navigateTo('/author-submit')}
                  className="text-[#D4A843] hover:underline"
                >
                  List your book first →
                </button>
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleCheckout}
          disabled={loading}
          className="w-full bg-[#D4A843] text-[#1B2A4A] font-semibold py-4 rounded-xl hover:bg-[#c49a3a] transition disabled:opacity-50 disabled:cursor-not-allowed text-lg"
        >
          {`Set Bounty — Pay $${selectedPool.size}`}
        </button>
        <p className={`text-xs text-center mt-3 ${textMuted}`}>
          You'll be taken to secure checkout. Your bounty goes live immediately after payment.
        </p>

      </div>
    </div>
  );
};
