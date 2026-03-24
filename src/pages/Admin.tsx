import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../hooks/useNavigate';
import { ArrowLeft, Plus, Trash2, Check, X } from 'lucide-react';

const ADMIN_EMAIL = 'mondavis43@gmail.com';

interface Book {
  id: number;
  title: string;
  author: string;
  cover_url: string | null;
  bounty_amount: number;
}

interface CashoutRequest {
  id: string;
  user_id: string;
  amount: number;
  payout_type: string;
  payout_details: string;
  gift_card_brand: string | null;
  status: string;
  created_at: string;
  profiles: {
    email: string;
  };
}

interface NewBook {
  title: string;
  author: string;
  cover_url: string;
  bounty_amount: string;
}

interface NewQuestion {
  question_text: string;
  correct_answer: string;
  wrong_answer_1: string;
  wrong_answer_2: string;
  wrong_answer_3: string;
}

const emptyBook: NewBook = {
  title: '',
  author: '',
  cover_url: '',
  bounty_amount: '1.00',
};

const emptyQuestion: NewQuestion = {
  question_text: '',
  correct_answer: '',
  wrong_answer_1: '',
  wrong_answer_2: '',
  wrong_answer_3: '',
};

export const Admin = () => {
  const { user } = useAuth();
  const { navigateTo } = useNavigate();
  const [activeTab, setActiveTab] = useState<'books' | 'cashouts'>('books');
  const [books, setBooks] = useState<Book[]>([]);
  const [cashouts, setCashouts] = useState<CashoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBook, setNewBook] = useState<NewBook>(emptyBook);
  const [questions, setQuestions] = useState<NewQuestion[]>(
    Array(10).fill(null).map(() => ({ ...emptyQuestion }))
  );
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.email === ADMIN_EMAIL) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    const [booksResult, cashoutsResult] = await Promise.all([
      supabase.from('books').select('*').order('id'),
      supabase
        .from('cashout_requests')
        .select('*, profiles(email)')
        .order('created_at', { ascending: false }),
    ]);

    if (booksResult.data) setBooks(booksResult.data);
    if (cashoutsResult.data) setCashouts(cashoutsResult.data as CashoutRequest[]);
    setLoading(false);
  };

  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text || !q.correct_answer || !q.wrong_answer_1 || !q.wrong_answer_2 || !q.wrong_answer_3) {
        setError(`Question ${i + 1} is incomplete.`);
        setSaving(false);
        return;
      }
    }

    const { data: bookData, error: bookError } = await supabase
      .from('books')
      .insert({
        title: newBook.title,
        author: newBook.author,
        cover_url: newBook.cover_url || null,
        bounty_amount: parseFloat(newBook.bounty_amount),
      })
      .select()
      .single();

    if (bookError || !bookData) {
      setError('Failed to save book. Try again.');
      setSaving(false);
      return;
    }

    const questionsToInsert = questions.map((q) => ({
      book_id: bookData.id,
      question_text: q.question_text,
      correct_answer: q.correct_answer,
      wrong_answer_1: q.wrong_answer_1,
      wrong_answer_2: q.wrong_answer_2,
      wrong_answer_3: q.wrong_answer_3,
    }));

    const { error: questionsError } = await supabase
      .from('questions')
      .insert(questionsToInsert);

    if (questionsError) {
      setError('Book saved but questions failed. Check Supabase.');
      setSaving(false);
      return;
    }

    setNewBook(emptyBook);
    setQuestions(Array(10).fill(null).map(() => ({ ...emptyQuestion })));
    setSaveSuccess(true);
    setSaving(false);
    setTimeout(() => setSaveSuccess(false), 3000);
    loadData();
  };

  const handleUpdateCashoutStatus = async (id: string, status: string) => {
    await supabase.from('cashout_requests').update({ status }).eq('id', id);
    loadData();
  };

  const handleDeleteBook = async (id: number) => {
    if (!confirm('Delete this book and all its questions?')) return;
    await supabase.from('books').delete().eq('id', id);
    loadData();
  };

  // Block non-admins (after all hooks)
  if (user?.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <p className="text-red-400">Access denied.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <header className="border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center gap-4">
          <button
            onClick={() => navigateTo('/')}
            className="text-gray-400 hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-serif text-3xl text-white">Admin Panel</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab('books')}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              activeTab === 'books'
                ? 'bg-white text-black'
                : 'bg-[#1a1a1a] text-gray-300 border border-gray-700 hover:border-gray-500'
            }`}
          >
            Books & Questions
          </button>
          <button
            onClick={() => setActiveTab('cashouts')}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              activeTab === 'cashouts'
                ? 'bg-white text-black'
                : 'bg-[#1a1a1a] text-gray-300 border border-gray-700 hover:border-gray-500'
            }`}
          >
            Cashout Requests ({cashouts.filter(c => c.status === 'pending').length} pending)
          </button>
        </div>

        {activeTab === 'books' && (
          <div>
            <div className="mb-10">
              <h2 className="text-xl font-semibold text-white mb-4">
                Current Books ({books.length})
              </h2>
              <div className="space-y-3">
                {books.map((book) => (
                  <div
                    key={book.id}
                    className="bg-[#1a1a1a] rounded-lg p-4 border border-gray-800 flex justify-between items-center"
                  >
                    <div className="flex items-center gap-4">
                      {book.cover_url && (
                        <img
                          src={book.cover_url}
                          alt={book.title}
                          className="w-10 h-14 object-cover rounded"
                        />
                      )}
                      <div>
                        <p className="text-white font-medium">{book.title}</p>
                        <p className="text-gray-400 text-sm">{book.author}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-green-400 font-medium">
                        ${book.bounty_amount.toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleDeleteBook(book.id)}
                        className="text-red-400 hover:text-red-300 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#1a1a1a] rounded-lg p-8 border border-gray-800">
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add New Book
              </h2>

              {error && (
                <div className="mb-4 p-3 bg-red-900/20 border border-red-900/50 rounded text-red-400 text-sm">
                  {error}
                </div>
              )}

              {saveSuccess && (
                <div className="mb-4 p-3 bg-green-900/20 border border-green-900/50 rounded text-green-400 text-sm">
                  Book and questions saved successfully!
                </div>
              )}

              <form onSubmit={handleSaveBook}>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                    <input
                      type="text"
                      value={newBook.title}
                      onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                      className="w-full px-4 py-3 bg-[#0f0f0f] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Author</label>
                    <input
                      type="text"
                      value={newBook.author}
                      onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                      className="w-full px-4 py-3 bg-[#0f0f0f] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Cover URL</label>
                    <input
                      type="text"
                      value={newBook.cover_url}
                      onChange={(e) => setNewBook({ ...newBook, cover_url: e.target.value })}
                      placeholder="https://covers.openlibrary.org/..."
                      className="w-full px-4 py-3 bg-[#0f0f0f] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Bounty Amount ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={newBook.bounty_amount}
                      onChange={(e) => setNewBook({ ...newBook, bounty_amount: e.target.value })}
                      className="w-full px-4 py-3 bg-[#0f0f0f] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-500"
                      required
                    />
                  </div>
                </div>

                <h3 className="text-lg font-medium text-white mb-4">Questions (10 required)</h3>
                <div className="space-y-6">
                  {questions.map((q, index) => (
                    <div
                      key={index}
                      className="bg-[#0f0f0f] rounded-lg p-6 border border-gray-700"
                    >
                      <p className="text-gray-400 text-sm font-medium mb-4">Question {index + 1}</p>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Question</label>
                          <input
                            type="text"
                            value={q.question_text}
                            onChange={(e) => {
                              const updated = [...questions];
                              updated[index] = { ...updated[index], question_text: e.target.value };
                              setQuestions(updated);
                            }}
                            className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-gray-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-green-500 mb-1">Correct Answer</label>
                          <input
                            type="text"
                            value={q.correct_answer}
                            onChange={(e) => {
                              const updated = [...questions];
                              updated[index] = { ...updated[index], correct_answer: e.target.value };
                              setQuestions(updated);
                            }}
                            className="w-full px-3 py-2 bg-[#1a1a1a] border border-green-900/50 rounded text-white text-sm focus:outline-none focus:border-green-700"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {[1, 2, 3].map((n) => (
                            <div key={n}>
                              <label className="block text-xs text-gray-500 mb-1">Wrong Answer {n}</label>
                              <input
                                type="text"
                                value={q[`wrong_answer_${n}` as keyof NewQuestion]}
                                onChange={(e) => {
                                  const updated = [...questions];
                                  updated[index] = {
                                    ...updated[index],
                                    [`wrong_answer_${n}`]: e.target.value,
                                  };
                                  setQuestions(updated);
                                }}
                                className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-gray-500"
                                required
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="mt-8 w-full bg-white text-black font-medium py-3 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Book & Questions'}
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'cashouts' && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Cashout Requests</h2>
            {cashouts.length === 0 ? (
              <div className="bg-[#1a1a1a] rounded-lg p-12 border border-gray-800 text-center">
                <p className="text-gray-400">No cashout requests yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cashouts.map((req) => (
                  <div
                    key={req.id}
                    className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-white font-medium">{req.profiles?.email}</p>
                        <p className="text-gray-400 text-sm mt-0.5">
                          {new Date(req.created_at).toLocaleDateString()} at{' '}
                          {new Date(req.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-white text-xl font-semibold">${req.amount.toFixed(2)}</p>
                        <p
                          className={`text-xs mt-1 ${
                            req.status === 'completed'
                              ? 'text-green-400'
                              : req.status === 'failed'
                              ? 'text-red-400'
                              : 'text-yellow-400'
                          }`}
                        >
                          {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                        </p>
                      </div>
                    </div>

                    <div className="bg-[#0f0f0f] rounded p-3 mb-4 text-sm">
                      <p className="text-gray-400">
                        <span className="text-gray-300 font-medium">Payout type:</span>{' '}
                        {req.payout_type === 'gift_card'
                          ? `Gift Card - ${req.gift_card_brand}`
                          : req.payout_type === 'paypal'
                          ? `PayPal - ${req.payout_details}`
                          : `Venmo - ${req.payout_details}`}
                      </p>
                    </div>

                    {req.status === 'pending' && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleUpdateCashoutStatus(req.id, 'completed')}
                          className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
                        >
                          <Check className="w-4 h-4" />
                          Mark Fulfilled
                        </button>
                        <button
                          onClick={() => handleUpdateCashoutStatus(req.id, 'failed')}
                          className="flex items-center gap-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 text-sm font-medium px-4 py-2 rounded-lg border border-red-900/50 transition"
                        >
                          <X className="w-4 h-4" />
                          Mark Failed
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
