import { useState } from 'react';
import { useNavigate } from '../hooks/useNavigate';
import { useTheme } from '../contexts/ThemeContext';
import { BookOpen, Plus, Trash2, GripVertical, ToggleLeft, ToggleRight } from 'lucide-react';

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const PACKAGES = [
{ label: 'Starter',  readers: 10,  price: 28,  cents: 2800  },
{ label: 'Standard', readers: 25,  price: 60,  cents: 6000  },
{ label: 'Extended', readers: 50,  price: 110, cents: 11000 },
{ label: 'Pro',      readers: 100, price: 200, cents: 20000 },
];

const GENRES = [
'Romance', 'Fantasy', 'Sci-Fi', 'Thriller', 'Mystery',
'Horror', 'Literary Fiction', 'Historical Fiction',
'Young Adult', 'Middle Grade', 'Non-Fiction', 'Other',
];

const FEEDBACK_TYPES = [
{ value: 'general',           label: 'General Feedback',         description: 'Overall impressions and readability' },
{ value: 'detailed_critique', label: 'Detailed Critique',        description: 'In-depth analysis of writing style and content' },
{ value: 'pacing_structure',  label: 'Pacing & Structure',       description: 'Flow, chapter structure, and story arc' },
{ value: 'character',         label: 'Character Development',    description: 'Believability and depth of characters' },
{ value: 'hook',              label: 'Would You Keep Reading?',  description: 'Did the opening hook make them want more?' },
];

const MAX_QUESTIONS = 15;

interface Question {
id: string;
question: string;
required: boolean;
}

export const AuthorBetaReaders = () => {
const { navigateTo } = useNavigate();
const { isDark, toggleTheme } = useTheme();

const [authorName, setAuthorName]           = useState('');
const [email, setEmail]                     = useState('');
const [bookTitle, setBookTitle]             = useState('');
const [genre, setGenre]                     = useState(GENRES[0]);
const [feedbackType, setFeedbackType]       = useState(FEEDBACK_TYPES[0].value);
const [selectedPackage, setSelectedPackage] = useState(PACKAGES[1]);
const [excerpt, setExcerpt]                 = useState('');
const [blurb, setBlurb]                     = useState('');
const [notes, setNotes]                     = useState('');
const [questions, setQuestions]             = useState<Question[]>([
  { id: uid(), question: '', required: true },
]);
const [error, setError]                     = useState('');

// ── theme tokens ──────────────────────────────────────────
const textPrimary = isDark ? 'text-[#F5F0E8]'        : 'text-[#1B2A4A]';
const textMuted   = isDark ? 'text-[#F5F0E8]/70'     : 'text-[#1B2A4A]/70';
const cardBg      = isDark ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20' : 'bg-white border-[#D4A843]/30';
const inputBg     = isDark
  ? 'bg-[#0f1623] border-[#F5F0E8]/10 text-[#F5F0E8] placeholder-[#F5F0E8]/30 focus:border-[#D4A843]/60'
  : 'bg-white border-[#1B2A4A]/20 text-[#1B2A4A] placeholder-[#1B2A4A]/30 focus:border-[#D4A843]/60';
const pageBg      = isDark ? 'bg-[#0f1623]'          : 'bg-[#F5F0E8]';
const divider     = isDark ? 'border-[#F5F0E8]/10'   : 'border-[#1B2A4A]/10';

// ── question builder helpers ───────────────────────────────
const addQuestion = () => {
  if (questions.length >= MAX_QUESTIONS) return;
  setQuestions(prev => [...prev, { id: uid(), question: '', required: false }]);
};

const removeQuestion = (id: string) => {
  setQuestions(prev => prev.filter(q => q.id !== id));
};

const updateQuestion = (id: string, text: string) => {
  setQuestions(prev => prev.map(q => q.id === id ? { ...q, question: text } : q));
};

const toggleRequired = (id: string) => {
  setQuestions(prev => prev.map(q => q.id === id ? { ...q, required: !q.required } : q));
};

// ── validation ─────────────────────────────────────────────
const isFormValid = () => {
  if (!authorName.trim() || !email.trim() || !bookTitle.trim()) return false;
  if (!excerpt.trim() || !blurb.trim()) return false;
  if (!feedbackType) return false;
  const filledQuestions = questions.filter(q => q.question.trim());
  if (filledQuestions.length === 0) return false;
  return true;
};

// ── checkout ───────────────────────────────────────────────
const handleCheckout = () => {
  if (!isFormValid()) {
    setError('Please fill in all required fields and add at least one question.');
    return;
  }
  setError('');

  const filledQuestions = questions.filter(q => q.question.trim());

  sessionStorage.setItem('checkoutItem', JSON.stringify({
    type: 'beta_reader',
    label: `Beta Readers — ${selectedPackage.label} (${selectedPackage.readers} readers) — ${bookTitle}`,
    amount: selectedPackage.cents,
    metadata: {
      package: selectedPackage.label,
      readers: selectedPackage.readers,
    },
  }));

  sessionStorage.setItem('pendingSubmission', JSON.stringify({
    table: 'author_beta_reader_submissions',
    data: {
      author_name:      authorName.trim(),
      email:            email.trim(),
      book_title:       bookTitle.trim(),
      genre,
      feedback_type:    feedbackType,
      package_label:    selectedPackage.label,
      readers:          selectedPackage.readers,
      price:            selectedPackage.price,
      custom_questions: JSON.stringify(filledQuestions),
      excerpt:          excerpt.trim(),
      blurb:            blurb.trim(),
      notes:            notes.trim(),
      status:           'pending',
    },
  }));

  window.history.pushState({}, '', '/checkout');
  window.dispatchEvent(new PopStateEvent('popstate'));
};

return (
  <div className={`min-h-screen ${pageBg} transition-colors duration-300`}>

    {/* Header */}
    <div className={`border-b ${divider} px-4 py-4`}>
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <button
          onClick={() => navigateTo('/author-dashboard')}
          className={`font-serif text-lg font-bold ${isDark ? 'text-[#D4A843]' : 'text-[#1B2A4A]'}`}
        >
          ← Dashboard
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

    <div className="max-w-2xl mx-auto px-4 py-12">

      {/* Title */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <BookOpen className="text-[#D4A843] w-6 h-6" />
          <h1 className={`font-serif text-4xl ${textPrimary}`}>Beta Readers</h1>
        </div>
        <p className={`text-sm leading-relaxed ${textMuted}`}>
          Get real readers to review your first chapter and answer your custom questions. You write the questions. We handle the rest.
        </p>
        <p className={`text-xs mt-2 leading-relaxed ${textMuted}`}>
          Readers can optionally indicate if they're interested in reading your full manuscript as a beta reader (paid or unpaid). Those contacts will be visible to you in the Author Hub so you can follow up directly.
        </p>
      </div>

      {/* Package selection */}
      <div className={`rounded-xl border p-6 mb-6 ${cardBg}`}>
        <h2 className={`font-serif text-xl mb-4 ${textPrimary}`}>Select a Package</h2>
        <div className="space-y-3">
          {PACKAGES.map(pkg => (
            <label
              key={pkg.label}
              className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${
                selectedPackage.label === pkg.label
                  ? 'border-[#D4A843] bg-[#D4A843]/10'
                  : `${isDark ? 'border-[#F5F0E8]/10 hover:border-[#D4A843]/40' : 'border-[#1B2A4A]/10 hover:border-[#D4A843]/40'}`
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="package"
                  checked={selectedPackage.label === pkg.label}
                  onChange={() => setSelectedPackage(pkg)}
                  className="accent-[#D4A843]"
                />
                <div>
                  <p className={`font-semibold text-sm ${textPrimary}`}>{pkg.label}</p>
                  <p className={`text-xs ${textMuted}`}>{pkg.readers} readers</p>
                </div>
              </div>
              <p className="font-bold text-[#D4A843]">${pkg.price}</p>
            </label>
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
              placeholder="Your name or pen name"
              className={`w-full px-4 py-3 rounded-lg border text-sm focus:outline-none transition-colors ${inputBg}`}
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
              placeholder="you@example.com"
              className={`w-full px-4 py-3 rounded-lg border text-sm focus:outline-none transition-colors ${inputBg}`}
            />
          </div>
          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${textMuted}`}>
              Book Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={bookTitle}
              onChange={e => setBookTitle(e.target.value)}
              placeholder="Title of the book being reviewed"
              className={`w-full px-4 py-3 rounded-lg border text-sm focus:outline-none transition-colors ${inputBg}`}
            />
          </div>
          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${textMuted}`}>
              Genre <span className="text-red-400">*</span>
            </label>
            <select
              value={genre}
              onChange={e => setGenre(e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border text-sm focus:outline-none transition-colors ${inputBg}`}
            >
              {GENRES.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Feedback type */}
      <div className={`rounded-xl border p-6 mb-6 ${cardBg}`}>
        <h2 className={`font-serif text-xl mb-1 ${textPrimary}`}>
          Feedback Focus <span className="text-red-400">*</span>
        </h2>
        <p className={`text-xs mb-4 ${textMuted}`}>
          What type of feedback are you looking for from your beta readers?
        </p>
        <div className="space-y-3">
          {FEEDBACK_TYPES.map(ft => (
            <label
              key={ft.value}
              className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                feedbackType === ft.value
                  ? 'border-[#D4A843] bg-[#D4A843]/10'
                  : `${isDark ? 'border-[#F5F0E8]/10 hover:border-[#D4A843]/40' : 'border-[#1B2A4A]/10 hover:border-[#D4A843]/40'}`
              }`}
            >
              <input
                type="radio"
                name="feedbackType"
                value={ft.value}
                checked={feedbackType === ft.value}
                onChange={() => setFeedbackType(ft.value)}
                className="accent-[#D4A843] mt-0.5 flex-shrink-0"
              />
              <div>
                <p className={`font-semibold text-sm ${textPrimary}`}>{ft.label}</p>
                <p className={`text-xs mt-0.5 ${textMuted}`}>{ft.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Short blurb */}
      <div className={`rounded-xl border p-6 mb-6 ${cardBg}`}>
        <h2 className={`font-serif text-xl mb-1 ${textPrimary}`}>Short Blurb <span className="text-red-400">*</span></h2>
        <p className={`text-xs mb-4 ${textMuted}`}>
          A 2–4 sentence summary of your book so readers know what they're getting into.
        </p>
        <textarea
          value={blurb}
          onChange={e => setBlurb(e.target.value)}
          placeholder="e.g. A slow-burn romance set in 1920s Paris between a jazz musician and a war correspondent..."
          rows={3}
          className={`w-full px-4 py-3 rounded-lg border text-sm resize-none focus:outline-none transition-colors ${inputBg}`}
        />
      </div>

      {/* Excerpt */}
      <div className={`rounded-xl border p-6 mb-6 ${cardBg}`}>
        <h2 className={`font-serif text-xl mb-1 ${textPrimary}`}>First Chapter / Excerpt <span className="text-red-400">*</span></h2>
        <p className={`text-xs mb-4 ${textMuted}`}>
          Paste the chapter or sample you want readers to review. This is what they'll read before answering your questions.
        </p>
        <textarea
          value={excerpt}
          onChange={e => setExcerpt(e.target.value)}
          placeholder="Paste your first chapter or excerpt here..."
          rows={10}
          className={`w-full px-4 py-3 rounded-lg border text-sm resize-none focus:outline-none transition-colors ${inputBg}`}
        />
      </div>

      {/* Question builder */}
      <div className={`rounded-xl border p-6 mb-6 ${cardBg}`}>
        <div className="flex items-center justify-between mb-1">
          <h2 className={`font-serif text-xl ${textPrimary}`}>Feedback Questions <span className="text-red-400">*</span></h2>
          <span className={`text-xs font-medium ${questions.length >= MAX_QUESTIONS ? 'text-red-400' : textMuted}`}>
            {questions.length}/{MAX_QUESTIONS}
          </span>
        </div>
        <p className={`text-xs mb-5 ${textMuted}`}>
          Write the questions you want beta readers to answer after reading your excerpt. All responses are free text.
        </p>

        <div className="space-y-3 mb-4">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className={`rounded-lg border p-4 transition-colors ${
                isDark ? 'border-[#F5F0E8]/10 bg-[#0f1623]/40' : 'border-[#1B2A4A]/10 bg-[#F5F0E8]/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <GripVertical size={16} className={`mt-3 flex-shrink-0 ${textMuted} opacity-40`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-semibold ${textMuted}`}>Q{idx + 1}</span>
                  </div>
                  <textarea
                    value={q.question}
                    onChange={e => updateQuestion(q.id, e.target.value)}
                    placeholder="e.g. Did the opening hook make you want to keep reading?"
                    rows={2}
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm resize-none focus:outline-none transition-colors ${inputBg}`}
                  />
                  <button
                    type="button"
                    onClick={() => toggleRequired(q.id)}
                    className={`flex items-center gap-1.5 mt-2 text-xs transition-colors ${
                      q.required ? 'text-[#D4A843]' : textMuted
                    }`}
                  >
                    {q.required
                      ? <ToggleRight size={16} className="text-[#D4A843]" />
                      : <ToggleLeft size={16} />
                    }
                    {q.required ? 'Required' : 'Optional'}
                  </button>
                </div>
                {questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeQuestion(q.id)}
                    className={`mt-2.5 flex-shrink-0 p-1 rounded transition-colors ${textMuted} hover:text-red-400`}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addQuestion}
          disabled={questions.length >= MAX_QUESTIONS}
          className={`flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            isDark
              ? 'border-[#D4A843]/30 text-[#D4A843] hover:bg-[#D4A843]/10'
              : 'border-[#D4A843]/40 text-[#D4A843] hover:bg-[#D4A843]/10'
          }`}
        >
          <Plus size={15} />
          Add Question
          {questions.length >= MAX_QUESTIONS && (
            <span className={`text-xs ${textMuted}`}>(max reached)</span>
          )}
        </button>
      </div>

      {/* Notes */}
      <div className={`rounded-xl border p-6 mb-8 ${cardBg}`}>
        <h2 className={`font-serif text-xl mb-1 ${textPrimary}`}>
          Additional Notes <span className={`text-sm font-normal ${textMuted}`}>(optional)</span>
        </h2>
        <p className={`text-xs mb-4 ${textMuted}`}>Anything else readers or the admin team should know.</p>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="e.g. Content warnings, target audience, specific areas of concern..."
          rows={3}
          className={`w-full px-4 py-3 rounded-lg border text-sm resize-none focus:outline-none transition-colors ${inputBg}`}
        />
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
        Continue to Checkout — ${selectedPackage.price}
      </button>
      <p className={`text-xs text-center mt-3 ${textMuted}`}>
        Your submission goes live after admin review.
      </p>

    </div>
  </div>
);
};
