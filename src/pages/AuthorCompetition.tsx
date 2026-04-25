import { useState } from 'react';
import { useNavigate } from '../hooks/useNavigate';
import { useTheme } from '../contexts/ThemeContext';
import { Trophy } from 'lucide-react';

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

const COMPETITION_TYPES = ['Sprint', 'Read-A-Thon', 'Elimination Bracket'];

export const AuthorCompetition = () => {
  const { navigateTo } = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  const [error, setError] = useState('');

  const [authorName, setAuthorName] = useState('');
  const [email, setEmail] = useState('');
  const [bookTitles, setBookTitles] = useState('');
  const [selectedTier, setSelectedTier] = useState(COMPETITION_TIERS[0]);
  const [selectedType, setSelectedType] = useState(COMPETITION_TYPES[0]);
  const [notes, setNotes] = useState('');

  const textPrimary = isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]';
  const textMuted = isDark ? 'text-[#F5F0E8]/70' : 'text-[#1B2A4A]/70';
  const cardBg = isDark ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20' : 'bg-white border-[#D4A843]/30';
  const inputClass = `w-full px-4 py-3 rounded-lg border text-sm transition focus:outline-none ${
    isDark
      ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20 text-[#F5F0E8] focus:border-[#D4A843]/60 placeholder:text-[#F5F0E8]/30'
      : 'bg-white border-[#1B2A4A]/20 text-[#1B2A4A] focus:border-[#D4A843] placeholder:text-[#1B2A4A]/30'
  }`;

  const isFormValid = () => authorName && email && bookTitles;

  const handleCheckout = () => {
    if (!isFormValid()) {
      setError('Please fill out all required fields.');
      return;
    }
    setError('');

    (window as any).__checkoutItem = {
      type: 'competition',
      label: `Sponsored Competition — ${selectedTier.label} (${selectedType}) for "${bookTitles}"`,
      amount: selectedTier.cents,
      metadata: {
        tier: selectedTier.label,
        competition_type: selectedType,
        prize_pool: selectedTier.prizePool,
      },
    };

    (window as any).__pendingSubmission = {
      table: 'author_competition_submissions',
      data: {
        author_name: authorName,
        email,
        book_titles: bookTitles,
        tier_label: selectedTier.label,
        price: selectedTier.price,
        platform_fee: selectedTier.platformFee,
        prize_pool: selectedTier.prizePool,
        competition_type: selectedType,
        notes: notes || null,
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
          <Trophy className="text-[#D4A843] mx-auto mb-4" size={36} />
          <h1 className={`font-serif text-4xl mb-3 ${textPrimary}`}>Sponsor a Competition</h1>
          <p className={`text-lg max-w-lg mx-auto ${textMuted}`}>
            Fund a reading competition around your book. Readers compete, you get visibility. The bigger the prize pool, the more readers show up.
          </p>
        </div>

        {/* How it works */}
        <div className={`rounded-xl border p-6 mb-10 ${cardBg}`}>
          <h2 className={`font-serif text-xl mb-4 ${textPrimary}`}>How It Works</h2>
          <div className="space-y-3">
            {[
              { step: '1', text: 'Choose a tier and competition type. We handle scheduling and setup.' },
              { step: '2', text: 'Your book is featured as the competition title. Readers sign up to compete.' },
              { step: '3', text: 'Readers race to finish and pass the quiz. Top finishers split the prize pool.' },
              { step: '4', text: 'Platform keeps its fee. The rest goes to winning readers.' },
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

        {/* Tier Picker */}
        <div className="mb-8">
          <h2 className={`font-serif text-2xl mb-2 ${textPrimary}`}>Choose a Tier</h2>
          <p className={`text-sm mb-6 ${textMuted}`}>Platform fee decreases as your investment grows.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {COMPETITION_TIERS.map((tier) => {
              const isSelected = selectedTier.label === tier.label;
              return (
                <button
                  key={tier.label}
                  onClick={() => setSelectedTier(tier)}
                  className={`rounded-xl border p-5 text-left transition ${
                    isSelected
                      ? 'bg-[#D4A843] border-[#D4A843] text-[#1B2A4A]'
                      : isDark
                        ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20 text-[#F5F0E8] hover:border-[#D4A843]/50'
                        : 'bg-white border-[#1B2A4A]/20 text-[#1B2A4A] hover:border-[#D4A843]'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-bold text-lg">{tier.label}</p>
                    <p className="font-bold text-lg">${tier.price}</p>
                  </div>
                  <p className={`text-xs mb-3 ${isSelected ? 'text-[#1B2A4A]/70' : textMuted}`}>
                    {tier.description}
                  </p>
                  <div className="flex justify-between text-xs">
                    <span className={isSelected ? 'text-[#1B2A4A]/70' : textMuted}>
                      Platform {tier.platformPct}%
                    </span>
                    <span className={isSelected ? 'text-[#1B2A4A]' : 'text-green-500'}>
                      ${tier.prizePool} to readers
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Competition Type */}
        <div className="mb-8">
          <h2 className={`font-serif text-2xl mb-2 ${textPrimary}`}>Competition Format</h2>
          <p className={`text-sm mb-6 ${textMuted}`}>We'll work with you on timing and structure after submission.</p>
          <div className="grid grid-cols-3 gap-3">
            {COMPETITION_TYPES.map((type) => {
              const isSelected = selectedType === type;
              return (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`rounded-lg border p-4 text-center text-sm font-medium transition ${
                    isSelected
                      ? 'bg-[#D4A843] border-[#D4A843] text-[#1B2A4A]'
                      : isDark
                        ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20 text-[#F5F0E8] hover:border-[#D4A843]/50'
                        : 'bg-white border-[#1B2A4A]/20 text-[#1B2A4A] hover:border-[#D4A843]'
                  }`}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Summary */}
        <div className={`rounded-xl border p-6 mb-10 ${cardBg}`}>
          <h2 className={`font-serif text-xl mb-4 ${textPrimary}`}>Competition Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className={textMuted}>Tier</span>
              <span className={`font-medium ${textPrimary}`}>{selectedTier.label}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className={textMuted}>Format</span>
              <span className={`font-medium ${textPrimary}`}>{selectedType}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className={textMuted}>Platform fee ({selectedTier.platformPct}%)</span>
              <span className={`font-medium ${textPrimary}`}>${selectedTier.platformFee}</span>
            </div>
            <div className={`border-t pt-3 mt-3 flex justify-between ${isDark ? 'border-[#D4A843]/20' : 'border-[#1B2A4A]/10'}`}>
              <span className={`font-medium ${textPrimary}`}>Prize pool to readers</span>
              <span className="text-[#D4A843] font-bold text-lg">${selectedTier.prizePool}</span>
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
                  placeholder="Receipt and scheduling details sent here"
                />
              </div>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>
                Book Title(s) <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={bookTitles}
                onChange={(e) => setBookTitles(e.target.value)}
                className={inputClass}
                placeholder="Must already be listed on Read to Earn"
              />
              <p className={`text-xs mt-1 ${textMuted}`}>
                Competitions require books already listed on the platform.{' '}
                <button
                  onClick={() => navigateTo('/author-submit')}
                  className="text-[#D4A843] hover:underline"
                >
                  List your book first →
                </button>
              </p>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>
                Notes <span className={`font-normal ${textMuted}`}>(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className={inputClass}
                placeholder="Preferred dates, special requests, anything we should know"
              />
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
          className="w-full bg-[#D4A843] text-[#1B2A4A] font-semibold py-4 rounded-xl hover:bg-[#c49a3a] transition text-lg"
        >
          {`Sponsor Competition — Pay $${selectedTier.price}`}
        </button>
        <p className={`text-xs text-center mt-3 ${textMuted}`}>
          You'll be taken to secure checkout. Your competition is scheduled immediately after payment.
        </p>

      </div>
    </div>
  );
};
