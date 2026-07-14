import { useState } from 'react';
import { FEATURES } from '../config/features';
import { useNavigate } from '../hooks/useNavigate';
import { useTheme } from '../contexts/ThemeContext';
import { Trophy, Info } from 'lucide-react';
import { BookSearchInput } from '../components/BookSearchInput';

const COMPETITION_TIERS = [
  {
    label: 'Spark',
    price: 60,
    cents: 6000,
    platformFee: 15,
    prizePool: 45,
    platformPct: 25,
    description: 'Great for a single-book push or debut launch.',
  },
  {
    label: 'Boost',
    price: 120,
    cents: 12000,
    platformFee: 30,
    prizePool: 90,
    platformPct: 25,
    description: 'Mid-size competition with solid prize incentive.',
  },
  {
    label: 'Spotlight',
    price: 250,
    cents: 25000,
    platformFee: 50,
    prizePool: 200,
    platformPct: 20,
    description: 'High-visibility event with a meaningful prize pool.',
  },
  {
    label: 'Grand',
    price: 500,
    cents: 50000,
    platformFee: 75,
    prizePool: 425,
    platformPct: 15,
    description: 'Maximum reach. Best for series launches or imprints.',
  },
];

const COMPETITION_TYPES = [
  'Sprint',
  ...(FEATURES.readathon ? ['Read-A-Thon'] : []),
  ...(FEATURES.elimination ? ['Elimination Bracket'] : []),
];

export const AuthorCompetition = () => {
  const { navigateTo } = useNavigate();
  const { isDark }     = useTheme();

  const [error, setError]               = useState('');
  const [authorName, setAuthorName]     = useState('');
  const [email, setEmail]               = useState('');
  const [notes, setNotes]               = useState('');
  const [selectedTier, setSelectedTier] = useState(COMPETITION_TIERS[0]);
  const [selectedType, setSelectedType] = useState(COMPETITION_TYPES[0]);

  // Single-select (Sprint + Read-A-Thon)
  const [bookTitle, setBookTitle] = useState('');
  const [bookId, setBookId]       = useState('');

  // Multi-select (Elimination Bracket)
  const [bookTitles, setBookTitles] = useState<string[]>([]);
  const [bookIds, setBookIds]       = useState<string[]>([]);

  const isElimination = selectedType === 'Elimination Bracket';
  const isReadAThon   = selectedType === 'Read-A-Thon';

  const bookValid = isElimination
    ? bookTitles.length > 0
    : bookTitle.trim() !== '';

  const isFormValid = () =>
    authorName.trim() && email.trim() && bookValid;

  // theme tokens
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
  const divider   = isDark ? 'border-[#F5F0E8]/10' : 'border-[#1B2A4A]/10';
  const bg        = isDark ? 'bg-[#0f1623]'        : 'bg-[#F5F0E8]';

  const handleCheckout = () => {
    if (!isFormValid()) {
      setError('Please fill in all required fields and select a book from the dropdown.');
      return;
    }
    setError('');

    const titlesForSubmission = isElimination
      ? bookTitles.join(', ')
      : bookTitle;

    sessionStorage.setItem('checkoutItem', JSON.stringify({
      type:   'competition_sponsored',
      label:  `${selectedTier.label} ${selectedType} — "${isElimination ? bookTitles[0] : bookTitle}${bookTitles.length > 1 ? ` +${bookTitles.length - 1} more` : ''}"`,
      amount: selectedTier.cents,
      metadata: {
        tier:             selectedTier.label,
        competition_type: selectedType,
        prize_pool:       selectedTier.prizePool,
      },
    }));

    sessionStorage.setItem('pendingSubmission', JSON.stringify({
      table: 'author_competition_submissions',
      data: {
        author_name:      authorName.trim(),
        email:            email.trim(),
        book_titles:      titlesForSubmission,
        tier_label:       selectedTier.label,
        price:            selectedTier.price,
        platform_fee:     selectedTier.platformFee,
        prize_pool:       selectedTier.prizePool,
        competition_type: selectedType,
        notes:            notes.trim() || null,
        status:           'pending_payment',
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
            <Trophy className="text-[#D4A843] w-6 h-6" />
            <h1 className={`font-serif text-4xl ${textPrimary}`}>Sponsor a Competition</h1>
          </div>
          <p className={`text-sm leading-relaxed ${textMuted}`}>
            Put your book in front of motivated readers. Choose a format, pick a tier, and we'll run the event.
          </p>
        </div>

        {/* Overlap warning */}
        <div className={`rounded-xl border p-4 mb-6 flex items-start gap-3 ${
          isDark ? 'bg-amber-900/20 border-amber-500/40' : 'bg-amber-50 border-amber-400/60'
        }`}>
          <span className="text-lg flex-shrink-0 mt-0.5">⚠️</span>
          <p className={`text-sm leading-relaxed ${isDark ? 'text-amber-200' : 'text-amber-900'}`}>
            <strong>Competitions and author bounties cannot run at the same time on the same book.</strong> Each reader can only earn from your book once — either through a competition or a bounty, not both. Leave a gap between the two so a fresh set of readers can participate in each.
          </p>
        </div>

        {/* How it works */}
        <div className={`rounded-xl border p-6 mb-6 ${cardBg}`}>
          <h2 className={`font-serif text-xl mb-4 ${textPrimary}`}>How It Works</h2>
          <ol className="space-y-3">
            {[
              COMPETITION_TYPES.length > 1
                ? 'Choose a competition format — Sprint, Read-A-Thon, or Elimination Bracket.'
                : 'Your book will be featured in a Sprint competition.',
              'Select a tier — this sets your platform fee and the reader prize pool.',
              'We schedule and run the event. Readers compete for the prize pool.',
              'You get visibility, quiz engagement, and real reader data.',
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

        {/* Competition format — only show picker when multiple formats exist */}
        {COMPETITION_TYPES.length > 1 && (
          <div className={`rounded-xl border p-6 mb-6 ${cardBg}`}>
            <h2 className={`font-serif text-xl mb-4 ${textPrimary}`}>Competition Format</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {COMPETITION_TYPES.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setSelectedType(type);
                    setBookTitle(''); setBookId('');
                    setBookTitles([]); setBookIds([]);
                  }}
                  className={`p-4 rounded-xl border text-left transition-colors ${
                    selectedType === type
                      ? 'border-[#D4A843] bg-[#D4A843]/10'
                      : isDark
                        ? 'border-[#F5F0E8]/10 hover:border-[#D4A843]/40'
                        : 'border-[#1B2A4A]/10 hover:border-[#D4A843]/40'
                  }`}
                >
                  <p className={`font-semibold text-sm ${textPrimary}`}>{type}</p>
                  <p className={`text-xs mt-1 ${textMuted}`}>
                    {type === 'Sprint'
                      ? 'Readers quiz only on your book within a set time window.'
                      : type === 'Read-A-Thon'
                        ? 'A 4×4 bingo card of books by genre. Your book is guaranteed a square. Readers pass quizzes to complete rows and score Bingos.'
                        : 'A three round bracket. If you have one listing, your book will be the featured book in one of the rounds. If you have at least three listings, the entire competition can revolve around those three books.'}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tier picker */}
        <div className={`rounded-xl border p-6 mb-6 ${cardBg}`}>
          <h2 className={`font-serif text-xl mb-4 ${textPrimary}`}>Select a Tier</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {COMPETITION_TIERS.map(tier => (
              <button
                key={tier.label}
                type="button"
                onClick={() => setSelectedTier(tier)}
                className={`p-4 rounded-xl border text-left transition-colors ${
                  selectedTier.label === tier.label
                    ? 'border-[#D4A843] bg-[#D4A843]/10'
                    : isDark
                      ? 'border-[#F5F0E8]/10 hover:border-[#D4A843]/40'
                      : 'border-[#1B2A4A]/10 hover:border-[#D4A843]/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className={`font-bold ${textPrimary}`}>{tier.label}</p>
                  <p className="text-[#D4A843] font-bold">${tier.price}</p>
                </div>
                <p className={`text-xs ${textMuted}`}>{tier.description}</p>
                <div className="flex gap-4 mt-2">
                  <span className={`text-xs ${textMuted}`}>Prize pool: <strong className={textPrimary}>${tier.prizePool}</strong></span>
                  <span className={`text-xs ${textMuted}`}>Platform: <strong className={textPrimary}>${tier.platformFee}</strong></span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Competition summary */}
        <div className={`rounded-xl border p-6 mb-6 ${cardBg}`}>
          <h2 className={`font-serif text-xl mb-4 ${textPrimary}`}>Competition Summary</h2>
          <div className="space-y-2">
            {[
              ['Tier',         selectedTier.label],
              ['Format',       isReadAThon
                ? 'Book Bingo — your book is guaranteed to be a featured square on the 4×4 card'
                : selectedType],
              ['Price',        `$${selectedTier.price}`],
              ['Platform Fee', `$${selectedTier.platformFee}`],
              ['Prize Pool',   `$${selectedTier.prizePool}`],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between items-start gap-4">
                <span className={`text-sm flex-shrink-0 ${textMuted}`}>{label}</span>
                <span className={`text-sm font-semibold text-right ${textPrimary}`}>{val}</span>
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

            {isElimination ? (
              <BookSearchInput
                label="Books (select all that apply)"
                required
                multi
                multiValue={bookTitles}
                onMultiChange={(titles, ids) => { setBookTitles(titles); setBookIds(ids); }}
                placeholder="Search and add books..."
              />
            ) : (
              <BookSearchInput
                label={isReadAThon ? 'Your Featured Book' : 'Book Title'}
                required
                value={bookTitle}
                onChange={(title, id) => { setBookTitle(title); setBookId(id); }}
                placeholder="Search your book title..."
              />
            )}

            {isReadAThon && bookTitle && (
              <p className={`text-xs ${textMuted}`}>
                <Info size={11} className="inline mr-1 mb-0.5" />
                <strong>{bookTitle}</strong> will be placed as a square on the bingo card. Readers must pass its quiz to complete that square on their way to hitting bingo.
              </p>
            )}

            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${textMuted}`}>
                Notes <span className={`font-normal ${textMuted}`}>(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Preferred dates, special requests, anything else..."
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
          onClick={handleCheckout}
          disabled={!isFormValid()}
          className="w-full bg-[#D4A843] text-[#1B2A4A] font-semibold py-4 rounded-xl hover:bg-[#c49a3a] transition text-lg disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue to Checkout — ${selectedTier.price}
        </button>
        <p className={`text-xs text-center mt-3 ${textMuted}`}>
          Secure checkout. Your competition will be scheduled after payment is confirmed.
        </p>

      </div>
    </div>
  );
};
