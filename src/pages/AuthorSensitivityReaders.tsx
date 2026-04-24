import { useState } from 'react';
import { useNavigate } from '../hooks/useNavigate';
import { useTheme } from '../contexts/ThemeContext';
import { CheckCircle, Eye } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const PACKAGES = [
  {
    label: 'Single',
    readers: 1,
    price: 50,
    description: 'One sensitivity reader. Best for a focused review of a specific identity or experience.',
  },
  {
    label: 'Dual',
    readers: 2,
    price: 100,
    description: 'Two readers with different perspectives. Broader coverage, more balanced feedback.',
  },
  {
    label: 'Triple',
    readers: 3,
    price: 150,
    description: 'Three readers. Recommended for books with multiple marginalized identities or complex representation.',
  },
];

const REPRESENTATION_AREAS = [
  'Race & Ethnicity',
  'Gender Identity',
  'Sexual Orientation',
  'Disability (Physical)',
  'Disability (Mental Health)',
  'Religion & Spirituality',
  'Socioeconomic Class',
  'Immigration & Diaspora',
  'Body Image & Size',
  'Neurodivergence',
  'Age & Ageism',
  'Other',
];

export const AuthorSensitivityReaders = () => {
  const { navigateTo } = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [authorName, setAuthorName] = useState('');
  const [email, setEmail] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [selectedPackage, setSelectedPackage] = useState(PACKAGES[0]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [manuscriptLink, setManuscriptLink] = useState('');
  const [context, setContext] = useState('');
  const [notes, setNotes] = useState('');

  const textPrimary = isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]';
  const textMuted = isDark ? 'text-[#F5F0E8]/70' : 'text-[#1B2A4A]/70';
  const cardBg = isDark ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20' : 'bg-white border-[#D4A843]/30';
  const inputClass = `w-full px-4 py-3 rounded-lg border text-sm transition focus:outline-none ${
    isDark
      ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20 text-[#F5F0E8] focus:border-[#D4A843]/60 placeholder:text-[#F5F0E8]/30'
      : 'bg-white border-[#1B2A4A]/20 text-[#1B2A4A] focus:border-[#D4A843] placeholder:text-[#1B2A4A]/30'
  }`;

  const toggleArea = (area: string) => {
    setSelectedAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  const isFormValid = () =>
    authorName && email && bookTitle && manuscriptLink && selectedAreas.length > 0;

  const handleSubmit = async () => {
    if (!isFormValid()) {
      setError('Please fill out all required fields and select at least one representation area.');
      return;
    }
    setLoading(true);
    setError('');

    const { error: insertError } = await supabase
      .from('author_sensitivity_submissions')
      .insert({
        author_name: authorName,
        email,
        book_title: bookTitle,
        package_label: selectedPackage.label,
        readers: selectedPackage.readers,
        price: selectedPackage.price,
        representation_areas: selectedAreas,
        manuscript_link: manuscriptLink,
        context: context || null,
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
            We've received your sensitivity reader request for{' '}
            <span className={`font-medium ${textPrimary}`}>{bookTitle}</span>.
          </p>
          <p className={`text-sm mb-8 ${textMuted}`}>
            We'll email <span className={textPrimary}>{email}</span> with payment instructions. Readers are matched and notified once payment is confirmed.
          </p>
          <div className={`rounded-xl border p-4 mb-8 text-left ${cardBg}`}>
            <div className="flex justify-between text-sm mb-2">
              <span className={textMuted}>Package</span>
              <span className={`font-medium ${textPrimary}`}>{selectedPackage.label}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className={textMuted}>Readers</span>
              <span className={`font-medium ${textPrimary}`}>{selectedPackage.readers} sensitivity reader{selectedPackage.readers > 1 ? 's' : ''}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className={textMuted}>Areas</span>
              <span className={`font-medium ${textPrimary} text-right max-w-[60%]`}>{selectedAreas.join(', ')}</span>
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
                setSelectedPackage(PACKAGES[0]); setSelectedAreas([]);
                setManuscriptLink(''); setContext(''); setNotes('');
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
          <Eye className="text-[#D4A843] mx-auto mb-4" size={36} />
          <h1 className={`font-serif text-4xl mb-3 ${textPrimary}`}>Sensitivity Readers</h1>
          <p className={`text-lg max-w-lg mx-auto ${textMuted}`}>
            Professional sensitivity reading for diverse representation. Get feedback from readers with lived experience before your book goes to print.
          </p>
        </div>

        {/* How it works */}
        <div className={`rounded-xl border p-6 mb-10 ${cardBg}`}>
          <h2 className={`font-serif text-xl mb-4 ${textPrimary}`}>How It Works</h2>
          <div className="space-y-3">
            {[
              { step: '1', text: 'Choose a package and select the representation areas you want reviewed.' },
              { step: '2', text: 'Share your manuscript via a Google Doc or Dropbox link. We keep it confidential.' },
              { step: '3', text: 'We match you with readers who have lived experience in your selected areas.' },
              { step: '4', text: 'Each reader delivers a written report with specific notes, flagged passages, and recommendations.' },
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
          <p className={`text-sm mb-6 ${textMuted}`}>Each reader provides an independent written report.</p>
          <div className="space-y-3">
            {PACKAGES.map((pkg) => {
              const isSelected = selectedPackage.label === pkg.label;
              return (
                <button
                  key={pkg.label}
                  onClick={() => setSelectedPackage(pkg)}
                  className={`w-full rounded-xl border p-5 text-left transition ${
                    isSelected
                      ? 'bg-[#D4A843] border-[#D4A843] text-[#1B2A4A]'
                      : isDark
                        ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20 text-[#F5F0E8] hover:border-[#D4A843]/50'
                        : 'bg-white border-[#1B2A4A]/20 text-[#1B2A4A] hover:border-[#D4A843]'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-bold text-lg">{pkg.label}</p>
                    <p className="font-bold text-lg">${pkg.price}</p>
                  </div>
                  <p className={`text-xs mb-1 font-medium ${isSelected ? 'text-[#1B2A4A]/80' : 'text-[#D4A843]'}`}>
                    {pkg.readers} reader{pkg.readers > 1 ? 's' : ''}
                  </p>
                  <p className={`text-sm ${isSelected ? 'text-[#1B2A4A]/70' : textMuted}`}>
                    {pkg.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Representation Areas */}
        <div className="mb-8">
          <h2 className={`font-serif text-2xl mb-2 ${textPrimary}`}>Representation Areas</h2>
          <p className={`text-sm mb-6 ${textMuted}`}>
            Select all that apply. We match readers with lived experience in these areas.
          </p>
          <div className="flex flex-wrap gap-2">
            {REPRESENTATION_AREAS.map((area) => {
              const isSelected = selectedAreas.includes(area);
              return (
                <button
                  key={area}
                  onClick={() => toggleArea(area)}
                  className={`px-4 py-2 rounded-full border text-sm font-medium transition ${
                    isSelected
                      ? 'bg-[#D4A843] border-[#D4A843] text-[#1B2A4A]'
                      : isDark
                        ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20 text-[#F5F0E8] hover:border-[#D4A843]/50'
                        : 'bg-white border-[#1B2A4A]/20 text-[#1B2A4A] hover:border-[#D4A843]'
                  }`}
                >
                  {area}
                </button>
              );
            })}
          </div>
          {selectedAreas.length > 0 && (
            <p className={`text-xs mt-3 ${textMuted}`}>
              Selected: {selectedAreas.join(', ')}
            </p>
          )}
        </div>

        {/* Manuscript & Context */}
        <div className="mb-10">
          <h2 className={`font-serif text-2xl mb-6 ${textPrimary}`}>Your Manuscript</h2>
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>
                Manuscript Link <span className="text-red-400">*</span>
              </label>
              <input
                type="url"
                value={manuscriptLink}
                onChange={(e) => setManuscriptLink(e.target.value)}
                className={inputClass}
                placeholder="Google Doc, Dropbox, or Drive link (set to view access)"
              />
              <p className={`text-xs mt-1 ${textMuted}`}>
                Make sure the link is set to "Anyone with the link can view." We never share or distribute your manuscript.
              </p>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>
                Context for Readers <span className={`font-normal ${textMuted}`}>(optional but recommended)</span>
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={4}
                className={inputClass}
                placeholder="What should readers know going in? Any specific scenes or passages you're concerned about? What kind of feedback is most useful to you?"
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
                  placeholder="Reports and invoice sent here"
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
