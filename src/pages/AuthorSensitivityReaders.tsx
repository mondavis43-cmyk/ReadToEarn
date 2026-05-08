import { useState } from 'react';
import { useNavigate } from '../hooks/useNavigate';
import { useTheme } from '../contexts/ThemeContext';
import { Eye, Plus, Trash2, GripVertical, ToggleLeft, ToggleRight } from 'lucide-react';

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const PACKAGES = [
  {
    label: 'Essential',
    readers: 3,
    price: 50,
    cents: 5000,
    description: 'Surface your chapter to 3 readers from your target identities',
  },
  {
    label: 'Standard',
    readers: 6,
    price: 80,
    cents: 8000,
    description: 'Get more perspectives on your book.',
  },
  {
    label: 'Thorough',
    readers: 9,
    price: 150,
    cents: 15000,
    description: 'Maximum coverage across all requested identity groups',
  },
];

const IDENTITY_OPTIONS = [
  'Black / African American',
  'Latino / Hispanic',
  'Asian / Asian American',
  'Indigenous / Native American',
  'Middle Eastern / North African',
  'South Asian',
  'East Asian',
  'Southeast Asian',
  'Mixed Race / Multiracial',
  'Jewish',
  'Muslim',
  'Hindu',
  'LGBTQ+',
  'Gay / Lesbian',
  'Bisexual',
  'Transgender',
  'Nonbinary / Gender Nonconforming',
  'Disabled (Physical)',
  'Disabled (Cognitive / Neurological)',
  'Deaf / Hard of Hearing',
  'Blind / Low Vision',
  'Chronic Illness',
  'Mental Health (lived experience)',
  'Immigrant / First Generation',
  'Working Class',
  'Fat / Plus Size',
  'Older Adult (60+)',
  'Other (author will specify)',
];

const MAX_QUESTIONS = 15;

interface Question {
  id: string;
  question: string;
  required: boolean;
}

export const AuthorSensitivityReaders = () => {
  const { navigateTo } = useNavigate();
  const { isDark } = useTheme();

  const [selectedPackage, setSelectedPackage]       = useState(PACKAGES[1]);
  const [authorName, setAuthorName]                 = useState('');
  const [email, setEmail]                           = useState('');
  const [bookTitle, setBookTitle]                   = useState('');
  const [chapterText, setChapterText]               = useState('');
  const [selectedIdentities, setSelectedIdentities] = useState<string[]>([]);
  const [otherIdentity, setOtherIdentity]           = useState('');
  const [context, setContext]                       = useState('');
  const [questions, setQuestions]                   = useState<Question[]>([
    { id: uid(), question: '', required: true },
  ]);
  const [error, setError] = useState('');

  // ── theme tokens ──────────────────────────────────────────
  const bg          = isDark ? 'bg-[#0f1623]'          : 'bg-[#F5F0E8]';
  const textPrimary = isDark ? 'text-[#F5F0E8]'        : 'text-[#1B2A4A]';
  const textMuted   = isDark ? 'text-[#F5F0E8]/70'     : 'text-[#1B2A4A]/70';
  const cardBg      = isDark ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20' : 'bg-white border-[#D4A843]/30';
  const inputCls    = `w-full px-4 py-3 rounded-lg border text-sm transition focus:outline-none ${
    isDark
      ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20 text-[#F5F0E8] focus:border-[#D4A843]/60 placeholder-[#F5F0E8]/30'
      : 'bg-white border-[#1B2A4A]/20 text-[#1B2A4A] focus:border-[#D4A843]/60 placeholder-[#1B2A4A]/30'
  }`;
  const divider     = isDark ? 'border-[#F5F0E8]/10'   : 'border-[#1B2A4A]/10';

  // ── identity toggle ────────────────────────────────────────
  const toggleIdentity = (identity: string) => {
    setSelectedIdentities(prev =>
      prev.includes(identity)
        ? prev.filter(i => i !== identity)
        : [...prev, identity]
    );
  };

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
    if (chapterText.trim().length < 100) return false;
    if (selectedIdentities.length === 0) return false;
    if (selectedIdentities.includes('Other (author will specify)') && !otherIdentity.trim()) return false;
    const filledQuestions = questions.filter(q => q.question.trim());
    if (filledQuestions.length === 0) return false;
    return true;
  };

  // ── checkout ───────────────────────────────────────────────
  const handleCheckout = () => {
    if (!isFormValid()) {
      setError('Please fill in all required fields, select at least one identity group, and add your questions.');
      return;
    }
    setError('');

    const filledQuestions = questions.filter(q => q.question.trim());

    const processedIdentities = selectedIdentities.map(i =>
      i === 'Other (author will specify)' && otherIdentity.trim()
        ? `Other: ${otherIdentity.trim()}`
        : i
    );

    sessionStorage.setItem('checkoutItem', JSON.stringify({
      type: 'sensitivity_readers',
      label: `Sensitivity Readers — ${selectedPackage.label} (${selectedPackage.readers} readers) — ${bookTitle}`,
      amount: selectedPackage.cents,
      metadata: {
        package:    selectedPackage.label,
        readers:    selectedPackage.readers,
        identities: processedIdentities,
      },
    }));

    sessionStorage.setItem('pendingSubmission', JSON.stringify({
      table: 'author_sensitivity_submissions',
      data: {
        author_name:      authorName.trim(),
        email:            email.trim(),
        book_title:       bookTitle.trim(),
        package_label:    selectedPackage.label,
        readers:          selectedPackage.readers,
        price:            selectedPackage.price,
        chapter_text:     chapterText.trim(),
        identity_areas:   processedIdentities,
        custom_questions: JSON.stringify(filledQuestions),
        context:          context.trim(),
        status:           'pending',
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
            onClick={() => navigateTo('/author-dashboard')}
            className={`font-serif text-lg font-bold ${isDark ? 'text-[#D4A843]' : 'text-[#1B2A4A]'}`}
          >
            ← Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12">

        {/* Title */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <Eye className="text-[#D4A843] w-6 h-6" />
            <h1 className={`font-serif text-4xl ${textPrimary}`}>Sensitivity Readers</h1>
          </div>
          <p className={`text-sm leading-relaxed ${textMuted}`}>
            Get feedback from readers who share lived experience with the identities in your story. You write the questions. We match the right readers.
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
                    <p className={`text-xs ${textMuted}`}>{pkg.description}</p>
                  </div>
                </div>
                <p className="font-bold text-[#D4A843] ml-4 flex-shrink-0">${pkg.price}</p>
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
                className={inputCls}
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
                className={inputCls}
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
                placeholder="Title of the manuscript"
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* Identity checklist */}
        <div className={`rounded-xl border p-6 mb-6 ${cardBg}`}>
          <h2 className={`font-serif text-xl mb-1 ${textPrimary}`}>
            Identities You're Seeking Feedback From <span className="text-red-400">*</span>
          </h2>
          <p className={`text-xs mb-5 ${textMuted}`}>
            Select all that apply. Readers who identify with these groups will be shown your chapter.
          </p>
          <div className="flex flex-wrap gap-2">
            {IDENTITY_OPTIONS.map(identity => {
              const selected = selectedIdentities.includes(identity);
              return (
                <button
                  key={identity}
                  type="button"
                  onClick={() => toggleIdentity(identity)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    selected
                      ? 'bg-[#D4A843]/20 border-[#D4A843] text-[#D4A843]'
                      : isDark
                        ? 'border-[#F5F0E8]/20 text-[#F5F0E8]/70 hover:border-[#D4A843]/40 hover:text-[#F5F0E8]'
                        : 'border-[#1B2A4A]/20 text-[#1B2A4A]/70 hover:border-[#D4A843]/40 hover:text-[#1B2A4A]'
                  }`}
                >
                  {identity}
                </button>
              );
            })}
          </div>

          {selectedIdentities.includes('Other (author will specify)') && (
            <div className="mt-4">
              <label className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${textMuted}`}>
                Please specify <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={otherIdentity}
                onChange={e => setOtherIdentity(e.target.value)}
                placeholder="Describe the identity group..."
                className={inputCls}
              />
            </div>
          )}
        </div>

        {/* Chapter text */}
        <div className={`rounded-xl border p-6 mb-6 ${cardBg}`}>
          <h2 className={`font-serif text-xl mb-1 ${textPrimary}`}>
            Chapter / Excerpt <span className="text-red-400">*</span>
          </h2>
          <p className={`text-xs mb-4 ${textMuted}`}>
            Paste the chapter or passage you want reviewed. Minimum 100 characters.
          </p>
          <textarea
            value={chapterText}
            onChange={e => setChapterText(e.target.value)}
            placeholder="Paste your chapter or excerpt here..."
            rows={10}
            className={`${inputCls} resize-none`}
          />
          <p className={`text-xs mt-1.5 text-right ${chapterText.trim().length < 100 ? 'text-red-400' : textMuted}`}>
            {chapterText.trim().length} chars {chapterText.trim().length < 100 ? `(${100 - chapterText.trim().length} more needed)` : '✓'}
          </p>
        </div>

        {/* Question builder */}
        <div className={`rounded-xl border p-6 mb-6 ${cardBg}`}>
          <div className="flex items-center justify-between mb-1">
            <h2 className={`font-serif text-xl ${textPrimary}`}>
              Feedback Questions <span className="text-red-400">*</span>
            </h2>
            <span className={`text-xs font-medium ${questions.length >= MAX_QUESTIONS ? 'text-red-400' : textMuted}`}>
              {questions.length}/{MAX_QUESTIONS}
            </span>
          </div>
          <p className={`text-xs mb-5 ${textMuted}`}>
            Write the questions you want sensitivity readers to answer. All responses are free text.
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
                      placeholder="e.g. Did any language or framing feel inaccurate or harmful to your community?"
                      rows={2}
                      className={`w-full px-3 py-2.5 rounded-lg border text-sm resize-none focus:outline-none transition-colors ${
                        isDark
                          ? 'bg-[#0f1623] border-[#F5F0E8]/10 text-[#F5F0E8] placeholder-[#F5F0E8]/30 focus:border-[#D4A843]/60'
                          : 'bg-white border-[#1B2A4A]/20 text-[#1B2A4A] placeholder-[#1B2A4A]/30 focus:border-[#D4A843]/60'
                      }`}
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

        {/* Context (optional) */}
        <div className={`rounded-xl border p-6 mb-8 ${cardBg}`}>
          <h2 className={`font-serif text-xl mb-1 ${textPrimary}`}>
            Additional Context <span className={`text-sm font-normal ${textMuted}`}>(optional)</span>
          </h2>
          <p className={`text-xs mb-4 ${textMuted}`}>
            Any background readers should know — content warnings, narrative intent, specific concerns.
          </p>
          <textarea
            value={context}
            onChange={e => setContext(e.target.value)}
            placeholder="e.g. This chapter deals with themes of generational trauma. I want to make sure the portrayal feels authentic and not exploitative..."
            rows={4}
            className={`${inputCls} resize-none`}
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
