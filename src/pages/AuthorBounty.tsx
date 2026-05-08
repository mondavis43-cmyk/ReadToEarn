import { useState } from 'react';
import { useNavigate } from '../hooks/useNavigate';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { CheckCircle, Zap } from 'lucide-react';
import { BookSearchInput } from '../components/BookSearchInput';

const BOUNTY_POOLS = [
  { size: 25,  platform: 5,   readerPool: 20,  label: '$25 Pool'},
  { size: 50,  platform: 10,  readerPool: 40,  label: '$50 Pool'},
  { size: 100, platform: 20,  readerPool: 80,  label: '$100 Pool'},
  { size: 200, platform: 40,  readerPool: 160, label: '$200 Pool'},
  { size: 500, platform: 100, readerPool: 400, label: '$500 Pool'},
];

const PER_PASS_OPTIONS = [0.25, 0.50, 0.75, 1.00, 1.50, 2.00];

const POOL_CENTS: Record<number, number> = {
  25: 2500, 50: 5000, 100: 10000, 200: 20000, 500: 50000,
};

export const AuthorBounty = () => {
  const { navigateTo } = useNavigate();
  const { isDark }     = useTheme();

  const [authorName, setAuthorName]     = useState('');
  const [email, setEmail]               = useState('');
  const [bookTitle, setBookTitle]       = useState('');
  const [bookId, setBookId]             = useState('');
  const [selectedPool, setSelectedPool] = useState(BOUNTY_POOLS[0]);
  const [perPass, setPerPass]           = useState(PER_PASS_OPTIONS[1]);
  const [notes, setNotes]               = useState('');
  const [error, setError]               = useState('');

  const textPrimary = isDark ? 'text-[#F5F0E8]'    : 'text-[#1B2A4A]';
  const textMuted   = isDark ? 'text-[#F5F0E8]/70' : 'text-[#1B2A4A]/70';
  const cardBg      = isDark
    ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20'
    : 'bg-white border-[#D4A843]/30';
  const inputClass  = `w-full px-4 py-3 rounded-lg border text-sm transition focus:outline-none ${
    isDark
      ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20 text-[#F5F0E8] focus:border-[#D4A843]/60 placeholder:text-[#F5F0E8]/30'
      : 'bg-white border-[#1B2A4A]/20 text-[#1B2A4A] focus:border-[#D4A843] placeholder:text-[#1B2A4A]/30'
  }`;
  const divider = isDark ? 'border-[#F5F0E8]/10' : 'border-[#1B2A4A]/10';
  const bg      = isDark ? 'bg-[#0f1623]'        : 'bg-[#F5F0E8]';

  const estimatedReaders = Math.floor(selectedPool.readerPool / perPass);

  const isFormValid = () =>
    authorName.trim() && email.trim() && bookTitle.trim() && bookId.trim();

  const handleCheckout = async () => {
    if (!isFormValid()) {
      setError('Please fill in all required fields and select a book from the dropdown.');
      return;
    }
    setError('');

    const { data: { user } } = await supabase.auth.getUser();

    sessionStorage.setItem('checkoutItem', JSON.stringify({
      type:   'bounty',
      label:  `Author Bounty — ${selectedPool.label} for "${bookTitle}"`,
      amount: POOL_CENTS[selectedPool.size],
      metadata: { pool_size: selectedPool.size, per_pass: perPass },
    }));

    sessionStorage.setItem('pendingSubmission', JSON.stringify({
      table: 'author_bounty_submissions',
      data: {
        author_id:         user?.id ?? null,
        author_name:       authorName.trim(),
        email:             email.trim(),
        book_title:        bookTitle.trim(),
        book_id:           bookId,
        pool_size:         selectedPool.size,
        platform_fee:      selectedPool.platform,
        reader_pool:       selectedPool.readerPool,
        per_pass_amount:   perPass,
        estimated_readers: estimatedReaders,
        notes:             notes.trim(),
        status:            'pending',
      },
    }));

    window.history.pushState({}, '', '/checkout');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300`}>

      {/* Header */}
      <div className={`border-b ${divider} px-4 py-4`}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigateTo('/author-submit')}
            className={`font-serif text-lg font-bold ${isDark ? 'text-[#D4A843]' : 'text-[#1B2A4A]'}`}
          >
            ← Back
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12">

        {/* Title */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <Zap className="text-[#D4A843] w-6 h-6" />
            <h1 className={`font-serif text-4xl ${textPrimary}`}>Author Bounty</h1>
          </div>
          <p className={`text-sm leading-relaxed ${textMuted}`}>
            Fund a reader pool for your book. Readers earn a payout for every quiz they pass — you set the per-pass amount.
          </p>
        </div>

        {/* How it works */}
        <div className={`rounded-xl border p-6 mb-6 ${cardBg}`}>
          <h2 className={`font-serif text-xl mb-4 ${textPrimary}`}>How Bounties Work</h2>
          <ol className="space-y-3">
            {[
              'Choose a pool size — this is the total you fund.',
              'Set a per-pass payout — readers earn this for every quiz they pass.',
              'We keep 20% as a platform fee. The rest goes to readers.',
              'Your bounty runs until the pool is empty.',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#D4A843]/20 text-[#D4A843] text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <p className={`text-sm ${textMuted}`}>{step}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* Pool size */}
        <div className={`rounded-xl border p-6 mb-6 ${cardBg}`}>
          <h2 className={`font-serif text-xl mb-4 ${textPrimary}`}>Pool Size</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {BOUNTY_POOLS.map(pool => (
              <button
                key={pool.size}
                type="button"
                onClick={() => setSelectedPool(pool)}
                className={`p-4 rounded-xl border text-left transition-colors ${
                  selectedPool.size === pool.size
                    ? 'border-[#D4A843] bg-[#D4A843]/10'
                    : isDark
                      ? 'border-[#F5F0E8]/10 hover:border-[#D4A843]/40'
                      : 'border-[#1B2A4A]/10 hover:border-[#D4A843]/40'
                }`}
              >
                <p className={`font-bold text-lg ${textPrimary}`}>{pool.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Per-pass payout */}
        <div className={`rounded-xl border p-6 mb-6 ${cardBg}`}>
          <h2 className={`font-serif text-xl mb-4 ${textPrimary}`}>Per-Pass Payout</h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {PER_PASS_OPTIONS.map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => setPerPass(opt)}
                className={`py-2.5 rounded-lg border text-sm font-semibold transition-colors ${
                  perPass === opt
                    ? 'border-[#D4A843] bg-[#D4A843]/10 text-[#D4A843]'
                    : isDark
                      ? 'border-[#F5F0E8]/10 text-[#F5F0E8]/70 hover:border-[#D4A843]/40'
                      : 'border-[#1B2A4A]/10 text-[#1B2A4A]/70 hover:border-[#D4A843]/40'
                }`}
              >
                ${opt.toFixed(2)}
              </button>
            ))}
          </div>
        </div>

        {/* Live summary */}
        <div className={`rounded-xl border p-6 mb-6 ${cardBg}`}>
          <h2 className={`font-serif text-xl mb-4 ${textPrimary}`}>Bounty Summary</h2>
          <div className="space-y-2">
            {[
              ['Total Pool',         `$${selectedPool.size}`],
              ['Platform Fee (20%)', `$${selectedPool.platform}`],
              ['Reader Pool',        `$${selectedPool.readerPool}`],
              ['Per-Pass Payout',    `$${perPass.toFixed(2)}`],
              ['Est. Readers',       `~${estimatedReaders}`],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between items-center">
                <span className={`text-sm ${textMuted}`}>{label}</span>
                <span className={`text-sm font-semibold ${textPrimary}`}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Author info */}
        <div className={`rounded-xl border p-6 mb-6 ${cardBg}`}>
          <h2 className={`font-serif text-xl mb-4 ${textPrimary}`}>Your Information</h2>
          <div className="space-y-4">

            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${textMuted}`}>
                Author Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={authorName}
                onChange={e => setAuthorName(e.target.value)}
                placeholder="Author or publisher name"
                className={inputClass}
              />
            </div>

            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${textMuted}`}>
                Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Payment confirmation sent here"
                className={inputClass}
              />
            </div>

            <BookSearchInput
              label="Book Title"
              required
              value={bookTitle}
              onChange={(title, id) => { setBookTitle(title); setBookId(id); }}
              placeholder="Search your book title..."
            />

            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${textMuted}`}>
                Notes <span className={`font-normal ${textMuted}`}>(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Anything else we should know..."
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </div>

          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={() => { handleCheckout(); }}
          disabled={!isFormValid()}
          className="w-full bg-[#D4A843] text-[#1B2A4A] font-semibold py-4 rounded-xl hover:bg-[#c49a3a] transition text-lg disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="flex items-center justify-center gap-2">
            <CheckCircle size={20} />
            Continue to Checkout — ${selectedPool.size}
          </span>
        </button>
        <p className={`text-xs text-center mt-3 ${textMuted}`}>
          Your bounty goes live after payment is confirmed.
        </p>

      </div>
    </div>
  );
};
