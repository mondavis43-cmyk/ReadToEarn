import { useState } from 'react';
import { useNavigate } from '../hooks/useNavigate';
import { CheckCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const BUNDLES = [
  { books: 1, perBook: 7.0, total: 7.0, label: '1 Book', savings: null },
  { books: 3, perBook: 6.6, total: 19.8, label: '3 Books', savings: 'Save $1.20' },
  { books: 5, perBook: 6.5, total: 32.5, label: '5 Books', savings: 'Save $2.50' },
  { books: 10, perBook: 6.0, total: 60.0, label: '10 Books', savings: 'Save $10' },
  { books: 20, perBook: 5.5, total: 110.0, label: '20 Books', savings: 'Save $30' },
  { books: 50, perBook: 5.0, total: 250.0, label: '50 Books', savings: 'Save $100' },
  { books: 100, perBook: 4.5, total: 450.0, label: '100 Books', savings: 'Save $250' },
];

const GENRES = [
  'Romance', 'Fantasy', 'Science Fiction', 'Mystery', 'Thriller',
  'Horror', 'Literary Fiction', 'Historical Fiction', 'Young Adult',
  'Middle Grade', 'Non-Fiction', 'Memoir', 'Self-Help', 'Other',
];

const TROPES = [
  'Enemies to Lovers', 'Forced Proximity', 'Slow Burn', 'Found Family',
  'Chosen One', 'Redemption Arc', 'Second Chance', 'Forbidden Love',
  'Love Triangle', 'Fake Dating', 'Friends to Lovers', 'Dark Academia',
  'Cozy Mystery', 'Unreliable Narrator', 'Anti-Hero',
];

interface Question {
  question: string;
  correct: string;
  wrong1: string;
  wrong2: string;
  wrong3: string;
}

const emptyQuestion = (): Question => ({
  question: '', correct: '', wrong1: '', wrong2: '', wrong3: '',
});

export const AuthorSubmit = () => {
  const { navigateTo } = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [selectedBundle, setSelectedBundle] = useState(BUNDLES[0]);

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [email, setEmail] = useState('');
  const [pageCount, setPageCount] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [affiliateLink, setAffiliateLink] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedTropes, setSelectedTropes] = useState<string[]>([]);
  const [questions, setQuestions] = useState<Question[]>(
    Array.from({ length: 10 }, emptyQuestion)
  );

  // Credits state
  const [existingCredits, setExistingCredits] = useState<number | null>(null);
  const [checkingCredits, setCheckingCredits] = useState(false);

  const checkCredits = async (authorEmail: string) => {
    if (!authorEmail) return;
    setCheckingCredits(true);
    const { data } = await supabase
      .from('author_credits')
      .select('credits_total, credits_used')
      .eq('email', authorEmail)
      .maybeSingle();
    const remaining = data ? data.credits_total - data.credits_used : 0;
    setExistingCredits(remaining);
    setCheckingCredits(false);
  };

  const toggleTag = (
    tag: string,
    list: string[],
    setList: (v: string[]) => void
  ) => {
    setList(list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]);
  };

  const updateQuestion = (index: number, field: keyof Question, value: string) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const isFormValid = () => {
    if (!title || !author || !email || !pageCount || !description || !coverUrl) return false;
    return questions.every(
      (q) => q.question && q.correct && q.wrong1 && q.wrong2 && q.wrong3
    );
  };

  const handleCheckout = async () => {
    if (!isFormValid()) {
      setError('Please fill out all required fields including all 10 questions.');
      return;
    }
    setLoading(true);
    setError('');

    // Use existing credit instead of Stripe
    if (existingCredits && existingCredits > 0) {
      const { error: insertError } = await supabase
        .from('author_submissions')
        .insert({
          email,
          title,
          author,
          page_count: parseInt(pageCount),
          description,
          cover_url: coverUrl,
          affiliate_link: affiliateLink,
          genres: selectedGenres,
          tropes: selectedTropes,
          questions,
          bundle_size: 1,
          amount_paid: 0,
          status: 'paid',
        });

      if (insertError) {
        setError('Something went wrong. Please try again.');
        setLoading(false);
        return;
      }

      // Increment credits_used by 1
      const { data: creditRow } = await supabase
        .from('author_credits')
        .select('credits_used')
        .eq('email', email)
        .maybeSingle();

      if (creditRow) {
        await supabase
          .from('author_credits')
          .update({ credits_used: creditRow.credits_used + 1 })
          .eq('email', email);
      }

      setSubmitted(true);
      setLoading(false);
      return;
    }

    // No credits — go to Stripe
    try {
      const res = await fetch(
        'https://ohsocstmqwrsxvlcdrae.supabase.co/functions/v1/create-checkout',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            bundle: selectedBundle,
            bookData: {
              title,
              author,
              pageCount: parseInt(pageCount),
              description,
              coverUrl,
              affiliateLink,
              genres: selectedGenres,
              tropes: selectedTropes,
              questions,
            },
          }),
        }
      );

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError('Something went wrong creating your checkout session. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    }

    setLoading(false);
  };

  if (submitted) {
    const remainingAfter = existingCredits !== null && existingCredits > 0
      ? existingCredits - 1
      : selectedBundle.books - 1;

    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h1 className="font-serif text-3xl text-white mb-3">
            {existingCredits && existingCredits > 0 ? 'Book Submitted!' : 'Payment Received!'}
          </h1>
          <p className="text-gray-400 mb-2">
            Your book submission is confirmed. We'll review it and add it to the library within a few days.
          </p>
          <p className="text-gray-500 text-sm mb-8">
            A confirmation has been sent to <span className="text-white">{email}</span>.
          </p>
          {remainingAfter > 0 && (
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-4 mb-6">
              <p className="text-gray-300 text-sm">
                You have <span className="text-white font-medium">{remainingAfter} remaining slot{remainingAfter !== 1 ? 's' : ''}</span> in your bundle. Submit another book anytime using the same email.
              </p>
            </div>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setSubmitted(false);
                setTitle(''); setAuthor(''); setPageCount('');
                setDescription(''); setCoverUrl(''); setAffiliateLink('');
                setSelectedGenres([]); setSelectedTropes([]);
                setQuestions(Array.from({ length: 10 }, emptyQuestion));
                setExistingCredits(null);
              }}
              className="bg-white text-black font-medium px-6 py-3 rounded-lg hover:bg-gray-200 transition"
            >
              Submit Another Book
            </button>
            <button
              onClick={() => navigateTo('/')}
              className="bg-gray-800 text-white font-medium px-6 py-3 rounded-lg hover:bg-gray-700 transition"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="font-serif text-4xl text-white mb-3">Submit Your Book</h1>
          <p className="text-gray-400">
            Fill out the form below and complete payment to get your book listed in the Read to Earn library.
          </p>
        </div>

        {/* Bundle Picker - hidden if author has credits */}
        {existingCredits !== null && existingCredits > 0 ? (
          <div className="mb-12 bg-green-900/20 border border-green-700/50 rounded-lg p-6">
            <h2 className="font-serif text-2xl text-white mb-2">You have credits</h2>
            <p className="text-gray-300">
              You have <span className="text-white font-bold">{existingCredits} remaining slot{existingCredits !== 1 ? 's' : ''}</span> in your bundle. This submission will use 1 — no payment needed.
            </p>
          </div>
        ) : (
          <div className="mb-12">
            <h2 className="font-serif text-2xl text-white mb-2">Choose a Bundle</h2>
            <p className="text-gray-500 text-sm mb-6">
              Buy slots in advance and use them whenever you're ready. Unused slots never expire.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {BUNDLES.map((bundle) => {
                const isSelected = selectedBundle.books === bundle.books;
                return (
                  <button
                    key={bundle.books}
                    onClick={() => setSelectedBundle(bundle)}
                    className={`relative rounded-lg p-4 border text-left transition ${
                      isSelected
                        ? 'bg-white text-black border-white'
                        : 'bg-[#1a1a1a] text-white border-gray-700 hover:border-gray-500'
                    }`}
                  >
                    <p className="font-semibold text-sm mb-1">{bundle.label}</p>
                    <p className={`text-lg font-bold ${isSelected ? 'text-black' : 'text-white'}`}>
                      ${bundle.total.toFixed(2)}
                    </p>
                    <p className={`text-xs mt-0.5 ${isSelected ? 'text-gray-600' : 'text-gray-500'}`}>
                      ${bundle.perBook.toFixed(2)}/book
                    </p>
                    {bundle.savings && (
                      <span className={`text-xs font-medium mt-1 block ${
                        isSelected ? 'text-green-700' : 'text-green-400'
                      }`}>
                        {bundle.savings}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Book Info */}
        <div className="mb-10">
          <h2 className="font-serif text-2xl text-white mb-6">Book Information</h2>
          <div className="space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Book Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-500 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Author Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-500 transition"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Your Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => checkCredits(email)}
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-500 transition"
                  placeholder="Used to track your credits"
                />
                {checkingCredits && (
                  <p className="text-gray-500 text-xs mt-1">Checking credits...</p>
                )}
                {!checkingCredits && existingCredits !== null && existingCredits === 0 && (
                  <p className="text-gray-500 text-xs mt-1">No existing credits found.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Page Count <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  value={pageCount}
                  onChange={(e) => setPageCount(e.target.value)}
                  min="1"
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Book Description <span className="text-red-400">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-500 transition resize-none"
                placeholder="This will appear on your book's page in the library."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Cover Image URL <span className="text-red-400">*</span>
              </label>
              <input
                type="url"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-500 transition"
                placeholder="https://..."
              />
              <p className="text-gray-600 text-xs mt-1">
                Upload your cover to Imgur, Cloudinary, or any image host and paste the direct link here.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Buy Link <span className="text-gray-500 font-normal">(optional)</span>
              </label>
              <input
                type="url"
                value={affiliateLink}
                onChange={(e) => setAffiliateLink(e.target.value)}
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-500 transition"
                placeholder="Amazon, Kobo, your website, etc."
              />
            </div>
          </div>
        </div>

        {/* Genres */}
        <div className="mb-10">
          <h2 className="font-serif text-2xl text-white mb-2">
            Genre <span className="text-gray-500 font-normal text-base">(optional)</span>
          </h2>
          <p className="text-gray-500 text-sm mb-4">Select all that apply.</p>
          <div className="flex flex-wrap gap-2">
            {GENRES.map((genre) => (
              <button
                key={genre}
                onClick={() => toggleTag(genre, selectedGenres, setSelectedGenres)}
                className={`px-4 py-2 rounded-full text-sm border transition ${
                  selectedGenres.includes(genre)
                    ? 'bg-white text-black border-white'
                    : 'bg-[#1a1a1a] text-gray-300 border-gray-700 hover:border-gray-500'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        {/* Tropes */}
        <div className="mb-10">
          <h2 className="font-serif text-2xl text-white mb-2">
            Tropes <span className="text-gray-500 font-normal text-base">(optional)</span>
          </h2>
          <p className="text-gray-500 text-sm mb-4">Help readers find your book by tagging relevant tropes.</p>
          <div className="flex flex-wrap gap-2">
            {TROPES.map((trope) => (
              <button
                key={trope}
                onClick={() => toggleTag(trope, selectedTropes, setSelectedTropes)}
                className={`px-4 py-2 rounded-full text-sm border transition ${
                  selectedTropes.includes(trope)
                    ? 'bg-white text-black border-white'
                    : 'bg-[#1a1a1a] text-gray-300 border-gray-700 hover:border-gray-500'
                }`}
              >
                {trope}
              </button>
            ))}
          </div>
        </div>

        {/* Questions */}
        <div className="mb-10">
          <h2 className="font-serif text-2xl text-white mb-2">Quiz Questions</h2>
          <p className="text-gray-500 text-sm mb-6">
            Write 10 questions about your book. Readers must answer 8 correctly to earn their reward.
          </p>
          <div className="space-y-6">
            {questions.map((q, i) => (
              <div key={i} className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
                <p className="text-white font-medium mb-4">Question {i + 1}</p>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Question"
                    value={q.question}
                    onChange={(e) => updateQuestion(i, 'question', e.target.value)}
                    className="w-full px-4 py-3 bg-[#0f0f0f] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-500 transition text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Correct answer"
                    value={q.correct}
                    onChange={(e) => updateQuestion(i, 'correct', e.target.value)}
                    className="w-full px-4 py-3 bg-[#0f0f0f] border border-green-900/50 rounded-lg text-white focus:outline-none focus:border-green-700 transition text-sm"
                  />
                  {(['wrong1', 'wrong2', 'wrong3'] as const).map((field, wi) => (
                    <input
                      key={field}
                      type="text"
                      placeholder={`Wrong answer ${wi + 1}`}
                      value={q[field]}
                      onChange={(e) => updateQuestion(i, field, e.target.value)}
                      className="w-full px-4 py-3 bg-[#0f0f0f] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-500 transition text-sm"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary - hidden if using credits */}
        {!(existingCredits !== null && existingCredits > 0) && (
          <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800 mb-6">
            <h2 className="font-serif text-xl text-white mb-4">Order Summary</h2>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">{selectedBundle.label} bundle</span>
              <span className="text-white">${selectedBundle.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Per book</span>
              <span className="text-white">${selectedBundle.perBook.toFixed(2)}</span>
            </div>
            {selectedBundle.savings && (
              <div className="flex justify-between text-sm mb-2">
                <span className="text-green-400">Bundle discount</span>
                <span className="text-green-400">{selectedBundle.savings}</span>
              </div>
            )}
            <div className="border-t border-gray-700 mt-4 pt-4 flex justify-between">
              <span className="text-white font-medium">Total</span>
              <span className="text-white font-bold text-lg">${selectedBundle.total.toFixed(2)}</span>
            </div>
            {selectedBundle.books > 1 && (
              <p className="text-gray-500 text-xs mt-3">
                You're buying {selectedBundle.books} slots. This submission uses 1. The remaining {selectedBundle.books - 1} never expire and can be used for future books.
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-900/50 rounded text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleCheckout}
          disabled={loading}
          className="w-full bg-white text-black font-medium py-4 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed text-lg"
        >
          {loading
            ? existingCredits && existingCredits > 0 ? 'Submitting...' : 'Redirecting to payment...'
            : existingCredits && existingCredits > 0 ? 'Submit Book' : `Pay $${selectedBundle.total.toFixed(2)} & Submit`}
        </button>

        {!(existingCredits !== null && existingCredits > 0) && (
          <p className="text-gray-600 text-xs text-center mt-3">
            Secured by Stripe. You'll be redirected to complete payment.
          </p>
        )}
      </div>
    </div>
  );
};
