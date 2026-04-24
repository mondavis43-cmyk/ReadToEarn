import { useState } from 'react';
import { useNavigate } from '../hooks/useNavigate';
import { useTheme } from '../contexts/ThemeContext';
import { CheckCircle, BookOpen } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const PACKAGES = [
  { label: 'Starter', readers: 10, price: 28 },
  { label: 'Standard', readers: 25, price: 60 },
  { label: 'Extended', readers: 50, price: 110 },
  { label: 'Pro', readers: 100, price: 200 },
];

const GENRES = [
  'Romance', 'Fantasy', 'Sci-Fi', 'Thriller', 'Mystery',
  'Horror', 'Literary Fiction', 'Historical Fiction',
  'Young Adult', 'Middle Grade', 'Non-Fiction', 'Other',
];

const FEEDBACK_TYPES = [
  {
    label: 'General Read',
    description: 'Readers finish your first chapter and share overall impressions — hook, voice, pacing.',
  },
  {
    label: 'Detailed Critique',
    description: 'Readers provide structured feedback on character, plot, dialogue, and readability.',
  },
  {
    label: 'Would You Buy?',
    description: 'Readers assess market appeal — would they purchase this based on the sample?',
  },
];

export const AuthorBetaReaders = () => {
  const { navigateTo } = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [authorName, setAuthorName] = useState('');
  const [email, setEmail] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [genre, setGenre] = useState(GENRES[0]);
  const [selectedPackage, setSelectedPackage] = useState(PACKAGES[1]);
  const [selectedFeedback, setSelectedFeedback] = useState(FEEDBACK_TYPES[0]);
  const [excerpt, setExcerpt] = useState('');
  const [blurb, setBlurb] = useState('');
  const [notes, setNotes] = useState('');

  const textPrimary = isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]';
  const textMuted = isDark ? 'text-[#F5F0E8]/70' : 'text-[#1B2A4A]/70';
  const cardBg = isDark ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20' : 'bg-white border-[#D4A843]/30';
  const inputClass = `w-full px-4 py-3 rounded-lg border text-sm transition focus:outline-none ${
    isDark
      ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20 text-[#F5F0E8] focus:border-[#D4A843]/60 placeholder:text-[#F5F0E8]/30'
      : 'bg-white border-[#1B2A4A]/20 text-[#1B2A4A] focus:border-[#D4A843] placeholder:text-[#1B2A4A]/30'
  }`;

  const isFormValid = () => authorName && email && bookTitle && excerpt && blurb;

  const handleSubmit = async () => {
    if (!isFormValid()) {
      setError('Please fill out all required fields.');
      return;
    }
    setLoading(true);
    setError('');

    const { error: insertError } = await supabase
      .from('author_beta_reader_submissions')
      .insert({
        author_name: authorName,
        email,
        book_title: bookTitle,
        genre,
        package_label: selectedPackage.label,
        readers: selectedPackage.readers,
        price: selectedPackage.price,
        feedback_type: selectedFeedback.label,
        excerpt,
        blurb,
        notes: notes || null,
        status: 'pending_payment',
      });

    if (insertError) {
      setError('Something went wrong. Please try again.');
      setLoading(false);
      return;
    }

    setSubmitted(true);
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className={`min-h-screen flex items-center justify-center px-4 transition-colors ${isDark ? 'bg-[#0f1623]' : 'bg-[#F5F0E8]'}`}>
        <div className="max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h1 className={`font-serif text-3xl mb-3 ${textPrimary}`}>Request Submitted!</h1>
          <p className={`mb-2 ${textMuted}`}>
            We've received your beta reader request for{' '}
            <span className={`font-medium ${textPrimary}`}>{bookTitle}</span>.
          </p>
          <p className={`text-sm mb-8 ${textMuted}`}>
            We'll email <span className={textPrimary}>{email}</span> with payment instructions. Beta readers are matched and notified once payment is confirmed.
          </p>
          <div className={`rounded-xl border p-4 mb-8 text-left ${cardBg}`}>
            <div className="flex justify-between text-sm mb-2">
              <span className={textMuted}>Genre</span>
              <span className={`font-medium ${textPrimary}`}>{genre}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className={textMuted}>Feedback type</span>
              <span className={`font-medium ${textPrimary}`}>{selectedFeedback.label}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className={textMuted}>Package</span>
              <span className={`font-medium ${textPrimary}`}>{selectedPackage.label}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className={textMuted}>Readers</span>
              <span className={`font-medium ${textPrimary}`}>{selectedPackage.readers} beta readers</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className={textMuted}>Total</span>
              <span className="text-[#D4A843] font-bold">${selectedPackage.price}</span>
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setSubmitted(false);
                setAuthorName(''); setEmail(''); setBookTitle('');
                setGenre(GENRES[0]); setSelectedPackage(PACKAGES[1]);
                setSelectedFeedback(FEEDBACK_TYPES[0]);
                setExcerpt(''); setBlurb(''); setNotes('');
              }}
              className="bg-[#D4A843] text-[#1B2A4A] font-medium px-6 py-3 rounded-lg hover:bg-[#c49a3a] transition"
            >
              Submit Another
            </button>
            <button
              onClick={() => navigateTo('/authors')}
              className={`font-medium px-6 py-3 rounded-lg transition border ${cardBg} ${textPrimary}`}
            >
              Back to Authors
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          <BookOpen className="text-[#D4A843] mx-auto mb-4" size={36} />
          <h1 className={`font-serif text-4xl mb-3 ${textPrimary}`}>Beta Reader Acquisition</h1>
          <p className={`text-lg max-w-lg mx-auto ${textMuted}`}>
            Get early readers for your first chapter before you commit to a full launch. Real feedback from motivated readers who actually finish.
          </p>
        </div>

        {/* How it works */}
        <div className={`rounded-xl border p-6 mb-10 ${cardBg}`}>
          <h2 className={`font-serif text-xl mb-4 ${textPrimary}`}>How It Works</h2>
          <div className="space-y-3">
            {[
              { step: '1', text: 'Submit your first chapter and a short blurb. Choose your genre and feedback type.' },
              { step: '2', text: 'We match your book with genre-appropriate readers from our community.' },
              { step: '3', text: 'Readers read your chapter and submit structured feedback for a small reward.' },
              { step: '4', text: 'You receive all feedback reports once your reader panel is complete.' },
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

        {/* Package Picker */}
        <div className="mb-8">
          <h2 className={`font-serif text-2xl mb-2 ${textPrimary}`}>Choose a Package</h2>
          <p className={`text-sm mb-6 ${textMuted}`}>Each reader reads your first chapter and submits feedback.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PACKAGES.map((pkg) => {
              const isSelected = selectedPackage.label === pkg.label;
              return (
                <button
                  key={pkg.label}
                  onClick={() => setSelectedPackage(pkg)}
                  className={`rounded-xl border p-4 text-left transition ${
                    isSelected
                      ? 'bg-[#D4A843] border-[#D4A843] text-[#1B2A4A]'
                      : isDark
                        ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20 text-[#F5F0E8] hover:border-[#D4A843]/50'
                        : 'bg-white border-[#1B2A4A]/20 text-[#1B2A4A] hover:border-[#D4A843]'
                  }`}
                >
                  <p className="font-bold text-lg">${pkg.price}</p>
                  <p className="font-medium text-sm mt-0.5">{pkg.label}</p>
                  <p className={`text-xs mt-1 ${isSelected ? 'text-[#1B2A4A]/70' : textMuted}`}>
                    {pkg.readers} readers
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Feedback Type */}
        <div className="mb-8">
          <h2 className={`font-serif text-2xl mb-2 ${textPrimary}`}>Feedback Type</h2>
          <p className={`text-sm mb-6 ${textMuted}`}>What do you want readers to focus on?</p>
          <div className="space-y-3">
            {FEEDBACK_TYPES.map((type) => {
              const isSelected = selectedFeedback.label === type.label;
              return (
                <button
                  key={type.label}
                  onClick={() => setSelectedFeedback(type)}
                  className={`w-full rounded-xl border p-5 text-left transition ${
                    isSelected
                      ? 'bg-[#D4A843] border-[#D4A843] text-[#1B2A4A]'
                      : isDark
                        ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20 text-[#F5F0E8] hover:border-[#D4A843]/50'
                        : 'bg-white border-[#1B2A4A]/20 text-[#1B2A4A] hover:border-[#D4A843]'
                  }`}
                >
                  <p className="font-semibold mb-1">{type.label}</p>
                  <p className={`text-sm ${isSelected ? 'text-[#1B2A4A]/70' : textMuted}`}>
                    {type.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Genre */}
        <div className="mb-8">
          <h2 className={`font-serif text-2xl mb-2 ${textPrimary}`}>Genre</h2>
          <p className={`text-sm mb-4 ${textMuted}`}>We match you with readers who prefer your genre.</p>
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className={inputClass}
          >
            {GENRES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        {/* Book Content */}
        <div className="mb-8">
          <h2 className={`font-serif text-2xl mb-6 ${textPrimary}`}>Your Book Content</h2>
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>
                Short Blurb <span className="text-red-400">*</span>
              </label>
              <textarea
                value={blurb}
                onChange={(e) => setBlurb(e.target.value)}
                rows={3}
                className={inputClass}
                placeholder="2–4 sentences. What's the book about? What's the hook?"
              />
              <p className={`text-xs mt-1 ${textMuted}`}>Shown to readers before they start so they know what they're signing up for.</p>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>
                First Chapter <span className="text-red-400">*</span>
              </label>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                rows={12}
                className={inputClass}
                placeholder="Paste your first chapter here. Aim for 1,500–5,000 words for best results."
              />
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
                  placeholder="Results and invoice sent here"
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
                placeholder="Working title is fine"
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>
                Notes <span className={`font-normal ${textMuted}`}>(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className={inputClass}
                placeholder="Anything specific you want readers to pay attention to"
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
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-[#D4A843] text-[#1B2A4A] font-semibold py-4 rounded-xl hover:bg-[#c49a3a] transition disabled:opacity-50 disabled:cursor-not-allowed text-lg"
        >
          {loading ? 'Submitting...' : `Submit Request — $${selectedPackage.price} due after review`}
        </button>
        <p className={`text-xs text-center mt-3 ${textMuted}`}>
          No payment required now. We'll email you with next steps.
        </p>

      </div>
    </div>
  );
};
