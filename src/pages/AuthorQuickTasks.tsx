import { useState } from 'react';
import { useNavigate } from '../hooks/useNavigate';
import { useTheme } from '../contexts/ThemeContext';
import { ClipboardList } from 'lucide-react';

const TASK_TYPES = [
  {
    label: 'Cover Vote',
    description: 'Show readers 2–4 cover options. They pick their favorite and optionally explain why.',
    placeholder: 'Describe your cover options or paste image URLs (one per line)',
  },
  {
    label: 'Title Test',
    description: 'Present 2–4 title options. Readers vote on which grabs them most.',
    placeholder: 'List your title options (one per line)',
  },
  {
    label: 'Blurb Test',
    description: 'Share 2–3 back-cover blurb variations. Readers pick the most compelling one.',
    placeholder: 'Paste your blurb variations (separate with a blank line)',
  },
];

const PACKAGES = [
  { label: 'Sample', completions: 25, price: 14, cents: 1400 },
  { label: 'Standard', completions: 50, price: 24, cents: 2400 },
  { label: 'Wide', completions: 100, price: 42, cents: 4200 },
];

export const AuthorQuickTasks = () => {
  const { navigateTo } = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  const [error, setError] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [email, setEmail] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [selectedType, setSelectedType] = useState(TASK_TYPES[0]);
  const [selectedPackage, setSelectedPackage] = useState(PACKAGES[0]);
  const [taskContent, setTaskContent] = useState('');
  const [notes, setNotes] = useState('');

  const textPrimary = isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]';
  const textMuted = isDark ? 'text-[#F5F0E8]/70' : 'text-[#1B2A4A]/70';
  const cardBg = isDark ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20' : 'bg-white border-[#D4A843]/30';
  const inputClass = `w-full px-4 py-3 rounded-lg border text-sm transition focus:outline-none ${
    isDark
      ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20 text-[#F5F0E8] focus:border-[#D4A843]/60 placeholder:text-[#F5F0E8]/30'
      : 'bg-white border-[#1B2A4A]/20 text-[#1B2A4A] focus:border-[#D4A843] placeholder:text-[#1B2A4A]/30'
  }`;

  const isFormValid = () => authorName && email && bookTitle && taskContent;

  const handleCheckout = () => {
    if (!isFormValid()) {
      setError('Please fill out all required fields.');
      return;
    }
    setError('');

    sessionStorage.setItem('checkoutItem', JSON.stringify({
      type: 'quick_task',
      label: `${selectedType.label} — ${selectedPackage.label} (${selectedPackage.completions} readers) for "${bookTitle}"`,
      amount: selectedPackage.cents,
      metadata: {
        task_type: selectedType.label,
        package: selectedPackage.label,
        completions: selectedPackage.completions,
      },
    }));

    sessionStorage.setItem('pendingSubmission', JSON.stringify({
      table: 'author_quick_task_submissions',
      data: {
        author_name: authorName,
        email,
        book_title: bookTitle,
        task_type: selectedType.label,
        package_label: selectedPackage.label,
        completions: selectedPackage.completions,
        price: selectedPackage.price,
        task_content: taskContent,
        notes: notes || null,
        status: 'active',
      },
    }));

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
          <ClipboardList className="text-[#D4A843] mx-auto mb-4" size={36} />
          <h1 className={`font-serif text-4xl mb-3 ${textPrimary}`}>Quick Tasks</h1>
          <p className={`text-lg max-w-lg mx-auto ${textMuted}`}>
            Get real reader opinions before you commit. Cover votes, title tests, blurb testing — fast turnaround, honest feedback from actual readers.
          </p>
        </div>

        {/* How it works */}
        <div className={`rounded-xl border p-6 mb-10 ${cardBg}`}>
          <h2 className={`font-serif text-xl mb-4 ${textPrimary}`}>How It Works</h2>
          <div className="space-y-3">
            {[
              { step: '1', text: 'Choose a task type and submit your options — covers, titles, or blurbs.' },
              { step: '2', text: 'We post the task to our reader community. Readers complete it for a small reward.' },
              { step: '3', text: 'You receive a breakdown of votes and optional written feedback.' },
              { step: '4', text: 'Results delivered within a few days of payment confirmation.' },
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

        {/* Task Type Picker */}
        <div className="mb-8">
          <h2 className={`font-serif text-2xl mb-2 ${textPrimary}`}>What Do You Want to Test?</h2>
          <p className={`text-sm mb-6 ${textMuted}`}>Pick one task type per submission.</p>
          <div className="space-y-3">
            {TASK_TYPES.map((type) => {
              const isSelected = selectedType.label === type.label;
              return (
                <button
                  key={type.label}
                  onClick={() => {
                    setSelectedType(type);
                    setTaskContent('');
                  }}
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

        {/* Package Picker */}
        <div className="mb-8">
          <h2 className={`font-serif text-2xl mb-2 ${textPrimary}`}>Choose a Package</h2>
          <p className={`text-sm mb-6 ${textMuted}`}>More completions = more reliable signal.</p>
          <div className="grid grid-cols-3 gap-3">
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
                    {pkg.completions} readers
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Task Content */}
        <div className="mb-8">
          <h2 className={`font-serif text-2xl mb-2 ${textPrimary}`}>Your {selectedType.label} Content</h2>
          <p className={`text-sm mb-4 ${textMuted}`}>{selectedType.description}</p>
          <textarea
            value={taskContent}
            onChange={(e) => setTaskContent(e.target.value)}
            rows={6}
            className={inputClass}
            placeholder={selectedType.placeholder}
          />
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
                placeholder="The book this task is for"
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
          {`Submit Task — Pay $${selectedPackage.price}`}
        </button>
        <p className={`text-xs text-center mt-3 ${textMuted}`}>
          You'll be taken to secure checkout. Results are delivered within a few days of payment.
        </p>

      </div>
    </div>
  );
};
