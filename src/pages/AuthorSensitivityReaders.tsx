import { useState } from 'react';
import { useNavigate } from '../hooks/useNavigate';
import { useTheme } from '../contexts/ThemeContext';
import { CheckCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const PACKAGES = [
  {
    label: 'Essential',
    readers: 3,
    price: 50,
    description: 'Surface your chapter to 3 readers from your target identities',
  },
  {
    label: 'Standard',
    readers: 6,
    price: 80,
    description: 'Broader pool — more perspectives, more signal',
  },
  {
    label: 'Thorough',
    readers: 9,
    price: 150,
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

export const AuthorSensitivityReaders = () => {
  const { navigateTo } = useNavigate();
  const { isDark } = useTheme();

  const bg = isDark ? 'bg-[#0f1623]' : 'bg-[#F5F0E8]';
  const textPrimary = isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]';
  const textMuted = isDark ? 'text-[#F5F0E8]/70' : 'text-[#1B2A4A]/70';
  const cardBg = isDark ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20' : 'bg-white border-[#D4A843]/30';
  const inputCls = `w-full px-4 py-3 rounded-lg border text-sm transition focus:outline-none ${
    isDark
      ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20 text-[#F5F0E8] focus:border-[#D4A843]/60 placeholder-[#F5F0E8]/30'
      : 'bg-white border-[#D4A843]/30 text-[#1B2A4A] focus:border-[#D4A843] placeholder-[#1B2A4A]/30'
  }`;

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [selectedPackage, setSelectedPackage] = useState(PACKAGES[0]);
  const [authorName, setAuthorName] = useState('');
  const [email, setEmail] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [chapterText, setChapterText] = useState('');
  const [selectedIdentities, setSelectedIdentities] = useState<string[]>([]);
  const [otherIdentity, setOtherIdentity] = useState('');
  const [context, setContext] = useState('');

  const toggleIdentity = (id: string) => {
    setSelectedIdentities((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const isValid =
    authorName.trim() &&
    email.trim() &&
    bookTitle.trim() &&
    chapterText.trim().length >= 100 &&
    selectedIdentities.length > 0;

  const handleSubmit = async () => {
    if (!isValid) {
      setError('Please fill out all required fields, paste your chapter, and select at least one identity.');
      return;
    }
    setLoading(true);
    setError('');

    const identityList =
      selectedIdentities.includes('Other (author will specify)') && otherIdentity.trim()
        ? [...selectedIdentities.filter((i) => i !== 'Other (author will specify)'), `Other: ${otherIdentity.trim()}`]
        : selectedIdentities;

    const { error: insertError } = await supabase
      .from('author_sensitivity_submissions')
      .insert({
        author_name: authorName.trim(),
        email: email.trim(),
        book_title: bookTitle.trim(),
        package_label: selectedPackage.label,
        readers: selectedPackage.readers,
        price: selectedPackage.price,
        chapter_text: chapterText.trim(),
        identity_areas: identityList,
        context: context.trim(),
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
      <div className={`min-h-screen ${bg} flex items-center justify-center px-4`}>
        <div className="max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-[#D4A843] mx-auto mb-4" />
          <h1 className={`font-serif text-3xl mb-3 ${textPrimary}`}>Submission Received!</h1>
          <p className={`mb-2 ${textMuted}`}>
            We'll email <span className={textPrimary}>{email}</span> with payment instructions.
          </p>
          <p className={`text-sm mb-8 ${textMuted}`}>
            Once payment is confirmed, your chapter will go live to readers matching your requested identities. You'll receive their responses and contact info so you can choose who to work with directly.
          </p>
          <div className={`rounded-xl border p-5 mb-8 ${cardBg}`}>
            <p className={`text-sm ${textMuted}`}>
              Package: <span className={`font-semibold ${textPrimary}`}>{selectedPackage.label}</span>
            </p>
            <p className={`text-sm mt-1 ${textMuted}`}>
              Up to <span className={`font-semibold ${textPrimary}`}>{selectedPackage.readers} reader responses</span>
            </p>
            <p className={`text-xl font-bold mt-3 text-[#D4A843]`}>${selectedPackage.price} due</p>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setSubmitted(false);
                setAuthorName(''); setEmail(''); setBookTitle('');
                setChapterText(''); setSelectedIdentities([]); setOtherIdentity(''); setContext('');
                setSelectedPackage(PACKAGES[0]);
              }}
              className="bg-[#D4A843] text-[#1B2A4A] font-semibold px-6 py-3 rounded-xl hover:bg-[#c49a3a] transition"
            >
              Submit Another
            </button>
            <button
              onClick={() => navigateTo('/authors')}
              className={`px-6 py-3 rounded-xl border font-medium transition ${
                isDark
                  ? 'border-[#D4A843]/30 text-[#F5F0E8] hover:bg-[#1B2A4A]/40'
                  : 'border-[#1B2A4A]/30 text-[#1B2A4A] hover:bg-[#1B2A4A]/10'
              }`}
            >
              Back to Authors
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg}`}>
      <div className="max-w-2xl mx-auto px-4 py-16">

        {/* Header */}
        <div className="mb-12">
          <button
            onClick={() => navigateTo('/authors')}
            className={`text-sm mb-6 inline-block transition hover:underline ${textMuted}`}
          >
            ← Back to Author Services
          </button>
          <h1 className={`font-serif text-4xl mb-3 ${textPrimary}`}>Sensitivity Readers</h1>
          <p className={`${textMuted}`}>
            Upload a sample chapter and tell us which identities you're seeking feedback from. Readers who match those identities will read your chapter, answer survey questions, and share whether they're interested in reading the full manuscript. You review their responses and reach out directly to whoever you want to work with — no middleman.
          </p>
        </div>

        {/* How It Works */}
        <div className={`rounded-xl border p-6 mb-10 ${cardBg}`}>
          <h2 className={`font-serif text-lg mb-4 ${textPrimary}`}>How it works</h2>
          <div className="space-y-3">
            {[
              { n: '1', t: 'You submit a chapter', d: 'Paste any chapter from your pre-publication manuscript and select the identities you want feedback from.' },
              { n: '2', t: 'Readers respond', d: 'Readers who identify with your selected groups read the chapter and answer survey questions. They can opt in to read the full book.' },
              { n: '3', t: 'You choose who to work with', d: 'We send you all responses with contact info. You email whoever you want to bring on as a sensitivity reader — entirely off-platform.' },
            ].map((step) => (
              <div key={step.n} className="flex items-start gap-4">
                <div className="w-7 h-7 rounded-full bg-[#D4A843] text-[#1B2A4A] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {step.n}
                </div>
                <div>
                  <p className={`text-sm font-medium ${textPrimary}`}>{step.t}</p>
                  <p className={`text-sm ${textMuted}`}>{step.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Package Picker */}
        <div className="mb-10">
          <h2 className={`font-serif text-2xl mb-2 ${textPrimary}`}>Choose a Package</h2>
          <p className={`text-sm mb-6 ${textMuted}`}>
            Package size = the number of reader responses you'll receive before we send you results.
          </p>
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
                      : 'bg-white border-[#D4A843]/30 text-[#1B2A4A] hover:border-[#D4A843]'
                  }`}
                >
                  <p className="font-semibold text-sm">{pkg.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${isSelected ? 'text-[#1B2A4A]' : 'text-[#D4A843]'}`}>
                    ${pkg.price}
                  </p>
                  <p className={`text-xs mt-1 ${isSelected ? 'text-[#1B2A4A]/70' : textMuted}`}>
                    {pkg.readers} reader responses
                  </p>
                  <p className={`text-xs mt-1 ${isSelected ? 'text-[#1B2A4A]/60' : textMuted}`}>
                    {pkg.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Author Info */}
        <div className="mb-10">
          <h2 className={`font-serif text-2xl mb-6 ${textPrimary}`}>Your Information</h2>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>
                  Author Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className={inputCls}
                  placeholder="Your name or pen name"
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
                  className={inputCls}
                  placeholder="We'll send reader responses here"
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
                className={inputCls}
                placeholder="Working title is fine"
              />
            </div>
          </div>
        </div>

        {/* Identity Selection */}
        <div className="mb-10">
          <h2 className={`font-serif text-2xl mb-2 ${textPrimary}`}>
            Identities You're Seeking Feedback From <span className="text-red-400">*</span>
          </h2>
          <p className={`text-sm mb-6 ${textMuted}`}>
            Select all that apply. Readers who identify with these groups will be shown your chapter.
          </p>
          <div className="flex flex-wrap gap-2">
            {IDENTITY_OPTIONS.map((id) => (
              <button
                key={id}
                onClick={() => toggleIdentity(id)}
                className={`px-3 py-1.5 rounded-full text-sm border transition ${
                  selectedIdentities.includes(id)
                    ? 'bg-[#D4A843] border-[#D4A843] text-[#1B2A4A] font-medium'
                    : isDark
                    ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20 text-[#F5F0E8] hover:border-[#D4A843]/50'
                    : 'bg-white border-[#D4A843]/30 text-[#1B2A4A] hover:border-[#D4A843]'
                }`}
              >
                {id}
              </button>
            ))}
          </div>
          {selectedIdentities.includes('Other (author will specify)') && (
            <div className="mt-4">
              <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>
                Describe the identity group
              </label>
              <input
                type="text"
                value={otherIdentity}
                onChange={(e) => setOtherIdentity(e.target.value)}
                className={inputCls}
                placeholder="e.g. Adoptees, Veterans, Survivors of domestic abuse..."
              />
            </div>
          )}
        </div>

        {/* Chapter Upload */}
        <div className="mb-10">
          <h2 className={`font-serif text-2xl mb-2 ${textPrimary}`}>
            Paste Your Chapter <span className="text-red-400">*</span>
          </h2>
          <p className={`text-sm mb-4 ${textMuted}`}>
            Any chapter from your pre-publication manuscript. This is what readers will read and respond to. Minimum 100 characters.
          </p>
          <textarea
            value={chapterText}
            onChange={(e) => setChapterText(e.target.value)}
            rows={14}
            className={inputCls}
            placeholder="Paste your chapter text here..."
          />
          <p className={`text-xs mt-1 text-right ${textMuted}`}>
            {chapterText.length} characters
          </p>
        </div>

        {/* Context for Readers */}
        <div className="mb-10">
          <h2 className={`font-serif text-2xl mb-2 ${textPrimary}`}>
            Context for Readers <span className={`font-normal text-base ${textMuted}`}>(optional)</span>
          </h2>
          <p className={`text-sm mb-4 ${textMuted}`}>
            Anything readers should know before reading — what the book is about, specific concerns you have, what kind of feedback is most useful to you.
          </p>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={4}
            className={inputCls}
            placeholder="e.g. This is a YA fantasy with a Black protagonist. I'm specifically concerned about how the magic system intersects with cultural elements..."
          />
        </div>

        {/* Order Summary */}
        <div className={`rounded-xl border p-6 mb-6 ${cardBg}`}>
          <h2 className={`font-serif text-xl mb-4 ${textPrimary}`}>Order Summary</h2>
          <div className="flex justify-between text-sm mb-2">
            <span className={textMuted}>Package</span>
            <span className={`font-medium ${textPrimary}`}>{selectedPackage.label}</span>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className={textMuted}>Reader responses</span>
            <span className={`font-medium ${textPrimary}`}>Up to {selectedPackage.readers}</span>
          </div>
          <div className={`border-t pt-4 mt-2 flex justify-between ${isDark ? 'border-[#D4A843]/20' : 'border-[#D4A843]/30'}`}>
            <span className={`font-medium ${textPrimary}`}>Total Due</span>
            <span className="text-[#D4A843] font-bold text-xl">${selectedPackage.price}</span>
          </div>
          <p className={`text-xs mt-3 ${textMuted}`}>
            Payment instructions will be sent to your email after submission. No charge until you confirm.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-[#D4A843] text-[#1B2A4A] font-semibold py-4 rounded-xl hover:bg-[#c49a3a] transition disabled:opacity-50 disabled:cursor-not-allowed text-lg"
        >
          {loading ? 'Submitting...' : `Submit — $${selectedPackage.price} due after review`}
        </button>

        <p className={`text-xs text-center mt-3 ${textMuted}`}>
          No payment required now. We'll email you with next steps.
        </p>

      </div>
    </div>
  );
};
