import { useState } from 'react';
import { useNavigate } from '../hooks/useNavigate';
import { useTheme } from '../contexts/ThemeContext';
import { MessageSquare } from 'lucide-react';

const PACKAGES = [
  { label: 'Starter', responses: 10, price: 18, cents: 1800 },
  { label: 'Standard', responses: 25, price: 40, cents: 4000 },
  { label: 'Extended', responses: 50, price: 70, cents: 7000 },
  { label: 'Wide', responses: 100, price: 125, cents: 12500 },
  { label: 'Deep', responses: 200, price: 225, cents: 22500 },
];

const SURVEY_FOCUSES = [
  {
    label: 'General Impressions',
    description: 'Overall reaction, pacing, characters, and whether readers would recommend it.',
  },
  {
    label: 'Chapter / Sample Feedback',
    description: 'Focused feedback on a specific excerpt — hook strength, voice, clarity.',
  },
  {
    label: 'Cover & Packaging',
    description: 'Does the cover match the genre? Does it attract the right reader?',
  },
  {
    label: 'Market Fit',
    description: "Would readers buy this? How does it compare to similar books they've read?",
  },
  {
    label: 'Custom Questions',
    description: 'You write the questions. We collect the answers.',
  },
];

export const AuthorSurvey = () => {
  const { navigateTo } = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  const [error, setError] = useState('');

  const [authorName, setAuthorName] = useState('');
  const [email, setEmail] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [selectedPackage, setSelectedPackage] = useState(PACKAGES[1]);
  const [selectedFocus, setSelectedFocus] = useState(SURVEY_FOCUSES[0]);
  const [customQuestions, setCustomQuestions] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [notes, setNotes] = useState('');

  const textPrimary = isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]';
  const textMuted = isDark ? 'text-[#F5F0E8]/70' : 'text-[#1B2A4A]/70';
  const cardBg = isDark ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20' : 'bg-white border-[#D4A843]/30';
  const inputClass = `w-full px-4 py-3 rounded-lg border text-sm transition focus:outline-none ${
    isDark
      ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20 text-[#F5F0E8] focus:border-[#D4A843]/60 placeholder:text-[#F5F0E8]/30'
      : 'bg-white border-[#1B2A4A]/20 text-[#1B2A4A] focus:border-[#D4A843] placeholder:text-[#1B2A4A]/30'
  }`;

  const isFormValid = () => {
    if (!authorName || !email || !bookTitle) return false;
    if (selectedFocus.label === 'Custom Questions' && !customQuestions) return false;
    if (selectedFocus.label === 'Chapter / Sample Feedback' && !excerpt) return false;
    return true;
  };

  const handleCheckout = () => {
    if (!isFormValid()) {
      setError('Please fill out all required fields.');
      return;
    }
    setError('');

    (window as any).__checkoutItem = {
      type: 'survey',
      label: `Reader Survey — ${selectedFocus.label}, ${selectedPackage.label} (${selectedPackage.responses} responses) for "${bookTitle}"`,
      amount: selectedPackage.cents,
      metadata: {
        focus: selectedFocus.label,
        package: selectedPackage.label,
        responses: selectedPackage.responses,
      },
    };

    (window as any).__pendingSubmission = {
      table: 'author_survey_submissions',
      data: {
        author_name: authorName,
        email,
        book_title: bookTitle,
        package_label: selectedPackage.label,
        responses: selectedPackage.responses,
        price: selectedPackage.price,
        survey_focus: selectedFocus.label,
        custom_questions: customQuestions || null,
        excerpt: excerpt || null,
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
          <MessageSquare className="text-[#D4A843] mx-auto mb-4" size={36} />
          <h1 className={`font-serif text-4xl mb-3 ${textPrimary}`}>Reader Feedback Surveys</h1>
          <p className={`text-lg max-w-lg mx-auto ${textMuted}`}>
            Collect structured feedback from real readers. Find out what's landing, what isn't, and what would make them buy.
          </p>
        </div>

        {/* How it works */}
        <div className={`rounded-xl border p-6 mb-10 ${cardBg}`}>
          <h2 className={`font-serif text-xl mb-4 ${textPrimary}`}>How It Works</h2>
          <div className="space-y-3">
            {[
              { step: '1', text: 'Choose a survey focus and package size. Custom questions welcome.' },
              { step: '2', text: 'We build and distribute the survey to our reader community.' },
              { step: '3', text: 'Readers complete the survey for a small reward.' },
              { step: '4', text: 'You receive a full results report once all responses are collected.' },
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
          <p className={`text-sm mb-6 ${textMuted}`}>More responses = more reliable data.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
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
                  <p className="text-sm font-medium mt-0.5">{pkg.label}</p>
                  <p className={`text-xs mt-1 ${isSelected ? 'text-[#1B2A4A]/70' : textMuted}`}>
                    {pkg.responses} responses
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Survey Focus */}
        <div className="mb-8">
          <h2 className={`font-serif text-2xl mb-2 ${textPrimary}`}>Survey Focus</h2>
          <p className={`text-sm mb-6 ${textMuted}`}>What do you want readers to weigh in on?</p>
          <div className="space-y-3">
            {SURVEY_FOCUSES.map((focus) => {
              const isSelected = selectedFocus.label === focus.label;
              return (
                <button
                  key={focus.label}
                  onClick={() => {
                    setSelectedFocus(focus);
                    setCustomQuestions('');
                    setExcerpt('');
                  }}
                  className={`w-full rounded-xl border p-5 text-left transition ${
                    isSelected
                      ? 'bg-[#D4A843] border-[#D4A843] text-[#1B2A4A]'
                      : isDark
                        ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20 text-[#F5F0E8] hover:border-[#D4A843]/50'
                        : 'bg-white border-[#1B2A4A]/20 text-[#1B2A4A] hover:border-[#D4A843]'
                  }`}
                >
                  <p className="font-semibold mb-1">{focus.label}</p>
                  <p className={`text-sm ${isSelected ? 'text-[#1B2A4A]/70' : textMuted}`}>
                    {focus.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Conditional: Custom Questions */}
        {selectedFocus.label === 'Custom Questions' && (
          <div className="mb-8">
            <h2 className={`font-serif text-2xl mb-2 ${textPrimary}`}>Your Questions</h2>
            <p className={`text-sm mb-4 ${textMuted}`}>
              List your questions one per line. We'll format and distribute them as-is.
            </p>
            <textarea
              value={customQuestions}
              onChange={(e) => setCustomQuestions(e.target.value)}
              rows={6}
              className={inputClass}
              placeholder={"1. Did the opening hook you?\n2. Would you keep reading after chapter one?\n3. How would you rate the pacing?"}
            />
          </div>
        )}

        {/* Conditional: Excerpt */}
        {selectedFocus.label === 'Chapter / Sample Feedback' && (
          <div className="mb-8">
            <h2 className={`font-serif text-2xl mb-2 ${textPrimary}`}>Your Excerpt</h2>
            <p className={`text-sm mb-4 ${textMuted}`}>
              Paste the chapter or sample you want feedback on. Keep it under 5,000 words for best results.
            </p>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={10}
              className={inputClass}
              placeholder="Paste your excerpt here..."
            />
          </div>
        )}

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
                  placeholder="Results and receipt sent here"
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
                placeholder="The book this survey is for"
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
                placeholder="Anything else we should know"
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
          {`Launch Survey — Pay $${selectedPackage.price}`}
        </button>
        <p className={`text-xs text-center mt-3 ${textMuted}`}>
          You'll be taken to secure checkout. Results delivered once all responses are collected.
        </p>

      </div>
    </div>
  );
};
