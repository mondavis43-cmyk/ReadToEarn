import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../hooks/useNavigate';
import { ArrowLeft, Plus, Trash2, Check, X, Pencil, Mail, Sun, Moon, Tag } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ADMIN_EMAIL = 'mondavis43@gmail.com';
const RATE_PER_PAGE = 0.0085;

interface Book {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  bounty_amount: number;
  page_count: number;
  description: string | null;
  geniuslink_url: string | null;
  book_type: 'platform' | 'sponsored';
}

interface Question {
  id: string;
  book_id: string;
  question_text: string;
  correct_answer: string;
  wrong_answer_1: string;
  wrong_answer_2: string;
  wrong_answer_3: string;
}

interface CashoutRequest {
  id: string;
  user_id: string;
  amount: number;
  payout_type: string;
  payout_details: string;
  gift_card_brand: string | null;
  reloadly_product_id: number | null;
  status: string;
  created_at: string;
  profiles: {
    email: string;
  };
}

interface WaitlistEntry {
  id: string;
  email: string;
  created_at: string;
}

interface Trope {
  id: string;
  name: string;
  created_at: string;
}

interface TropeSuggestion {
  id: string;
  book_id: string;
  suggested_name: string;
  status: string;
  created_at: string;
  books: { title: string } | null;
}

interface NewBook {
  title: string;
  author: string;
  cover_url: string;
  page_count: string;
  description: string;
  geniuslink_url: string;
  book_type: 'platform' | 'sponsored';
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
  page_count: '',
  description: '',
  geniuslink_url: '',
  book_type: 'platform',
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
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'books' | 'cashouts' | 'waitlist' | 'tropes'>('books');
  const [books, setBooks] = useState<Book[]>([]);
  const [cashouts, setCashouts] = useState<CashoutRequest[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [tropes, setTropes] = useState<Trope[]>([]);
  const [tropeSuggestions, setTropeSuggestions] = useState<TropeSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBook, setNewBook] = useState<NewBook>(emptyBook);
  const [questions, setQuestions] = useState<NewQuestion[]>(
    Array(10).fill(null).map(() => ({ ...emptyQuestion }))
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [editingQuestions, setEditingQuestions] = useState<Question[]>([]);
  const [newTropeName, setNewTropeName] = useState('');
  const [addingTrope, setAddingTrope] = useState(false);

  useEffect(() => {
    if (user?.email !== ADMIN_EMAIL) {
      navigateTo('/');
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    const [booksResult, cashoutsResult, waitlistResult, tropesResult, suggestionsResult] =
      await Promise.all([
        supabase.from('books').select('*').order('title'),
        supabase
          .from('cashout_requests')
          .select('*, profiles(email)')
          .order('created_at', { ascending: false }),
        supabase.from('waitlist').select('*').order('created_at', { ascending: false }),
        supabase.from('tropes').select('*').order('name'),
        supabase
          .from('trope_suggestions')
          .select('*, books(title)')
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
      ]);

    if (booksResult.data) setBooks(booksResult.data);
    if (cashoutsResult.data) setCashouts(cashoutsResult.data);
    if (waitlistResult.data) setWaitlist(waitlistResult.data);
    if (tropesResult.data) setTropes(tropesResult.data);
    if (suggestionsResult.data) setTropeSuggestions(suggestionsResult.data as TropeSuggestion[]);
    setLoading(false);
  };

  // ── Trope handlers ──────────────────────────────────────────────────────────

  const handleAddTrope = async () => {
    const name = newTropeName.trim();
    if (!name) return;
    setAddingTrope(true);
    const { error: err } = await supabase.from('tropes').insert({ name });
    if (err) {
      setError('Failed to add trope.');
    } else {
      setNewTropeName('');
      setSuccess('Trope added!');
      setTimeout(() => setSuccess(''), 2000);
      loadData();
    }
    setAddingTrope(false);
  };

  const handleDeleteTrope = async (id: string) => {
    if (!confirm('Delete this trope? It will be removed from all books.')) return;
    await supabase.from('book_tropes').delete().eq('trope_id', id);
    await supabase.from('tropes').delete().eq('id', id);
    loadData();
  };

  const handleApproveSuggestion = async (suggestion: TropeSuggestion) => {
    const { data: existing } = await supabase
      .from('tropes')
      .select('id')
      .ilike('name', suggestion.suggested_name)
      .maybeSingle();

    let tropeId: string;

    if (existing) {
      tropeId = existing.id;
    } else {
      const { data: newTrope, error: insertErr } = await supabase
        .from('tropes')
        .insert({ name: suggestion.suggested_name })
        .select('id')
        .single();
      if (insertErr || !newTrope) {
        setError('Failed to create trope from suggestion.');
        return;
      }
      tropeId = newTrope.id;
    }

    await supabase
      .from('book_tropes')
      .upsert({ book_id: suggestion.book_id, trope_id: tropeId }, { onConflict: 'book_id,trope_id' });

    await supabase
      .from('trope_suggestions')
      .update({ status: 'approved' })
      .eq('id', suggestion.id);

    setSuccess('Suggestion approved and trope linked!');
    setTimeout(() => setSuccess(''), 2500);
    loadData();
  };

  const handleRejectSuggestion = async (id: string) => {
    await supabase.from('trope_suggestions').update({ status: 'rejected' }).eq('id', id);
    loadData();
  };

  // ── Book handlers ───────────────────────────────────────────────────────────

  const handleSaveBook = async () => {
    setError('');
    const incomplete = questions.some(
      (q) =>
        !q.question_text ||
        !q.correct_answer ||
        !q.wrong_answer_1 ||
        !q.wrong_answer_2 ||
        !q.wrong_answer_3
    );
    if (incomplete) {
      setError('Please complete all 10 questions.');
      return;
    }
    setSaving(true);
    const bounty = newBook.book_type === 'sponsored'
  ? Math.min(parseFloat(newBook.page_count) * RATE_PER_PAGE, 5)
  : 0;
    const { data: bookData, error: bookError } = await supabase
      .from('books')
      .insert({
        ...newBook,
        page_count: parseInt(newBook.page_count),
        bounty_amount: bounty,
        book_type: newBook.book_type,
      })
      .select()
      .single();
    if (bookError || !bookData) {
      setError('Failed to save book.');
      setSaving(false);
      return;
    }
    const questionsToInsert = questions.map((q) => ({ ...q, book_id: bookData.id }));
    const { error: qError } = await supabase.from('questions').insert(questionsToInsert);
    if (qError) {
      setError('Book saved but questions failed.');
    } else {
      setSuccess('Book and questions saved!');
      setNewBook(emptyBook);
      setQuestions(Array(10).fill(null).map(() => ({ ...emptyQuestion })));
      setShowAddForm(false);
      loadData();
      setTimeout(() => setSuccess(''), 2000);
    }
    setSaving(false);
  };

  const handleEditBook = async (book: Book) => {
    const { data } = await supabase.from('questions').select('*').eq('book_id', book.id);
    setEditingBook(book);
    setEditingQuestions(data || []);
  };

  const handleSaveEdit = async () => {
    if (!editingBook) return;
    setError('');
    setSaving(true);
    const bounty = editingBook.book_type === 'sponsored'
  ? Math.min(editingBook.page_count * RATE_PER_PAGE, 5)
  : 0;
    const { error: bookError } = await supabase
      .from('books')
      .update({ ...editingBook, bounty_amount: bounty, book_type: editingBook.book_type })
      .eq('id', editingBook.id);
    if (bookError) {
      setError('Failed to update book.');
      setSaving(false);
      return;
    }
    for (const q of editingQuestions) {
      await supabase.from('questions').update(q).eq('id', q.id);
    }
    setSuccess('Book updated!');
    setEditingBook(null);
    loadData();
    setTimeout(() => setSuccess(''), 2000);
    setSaving(false);
  };

  const handleDeleteBook = async (bookId: string) => {
    if (!confirm('Delete this book and all its questions?')) return;
    await supabase.from('questions').delete().eq('book_id', bookId);
    await supabase.from('books').delete().eq('id', bookId);
    loadData();
  };

  const handleUpdateCashoutStatus = async (id: string, status: string) => {
    await supabase.from('cashout_requests').update({ status }).eq('id', id);
    loadData();
  };

  const handleDeleteWaitlistEntry = async (id: string) => {
    await supabase.from('waitlist').delete().eq('id', id);
    loadData();
  };

  // ── Shared styles ───────────────────────────────────────────────────────────

  const inputClass =
    'w-full px-3 py-2 bg-white dark:bg-[#1a1a1a] border border-[#e8e0d5] dark:border-gray-700 rounded-lg text-[#2C2C2C] dark:text-[#F5F0E8] placeholder-[#2C2C2C]/30 dark:placeholder-gray-600 focus:outline-none focus:border-[#1B2A4A] dark:focus:border-[#D4A843] transition text-sm';

  const correctInputClass =
    'w-full px-3 py-2 bg-[#D4A843]/10 dark:bg-[#D4A843]/10 border border-[#D4A843]/40 rounded-lg text-[#2C2C2C] dark:text-[#F5F0E8] placeholder-[#2C2C2C]/30 dark:placeholder-gray-600 focus:outline-none focus:border-[#D4A843] transition text-sm';

  const selectClass =
    'w-full px-3 py-2 bg-white dark:bg-[#1a1a1a] border border-[#e8e0d5] dark:border-gray-700 rounded-lg text-[#2C2C2C] dark:text-[#F5F0E8] focus:outline-none focus:border-[#1B2A4A] dark:focus:border-[#D4A843] transition text-sm';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] dark:bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-[#1B2A4A] dark:text-[#F5F0E8] font-medium">Loading...</div>
      </div>
    );
  }

  // ── Edit Mode ───────────────────────────────────────────────────────────────
  if (editingBook) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] dark:bg-[#0f0f0f] transition-colors duration-200">
        <header className="bg-[#1B2A4A] dark:bg-[#111111] border-b border-[#142038] dark:border-gray-800">
          <div className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setEditingBook(null)}
                className="text-[#F5F0E8]/70 hover:text-[#F5F0E8] transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="font-serif text-2xl text-[#F5F0E8]">Edit Book</h1>
            </div>
            <button
              onClick={toggleTheme}
              className="text-[#F5F0E8]/50 hover:text-[#F5F0E8] transition"
              aria-label="Toggle dark mode"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-10 space-y-6">
          {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}
          {success && (
            <p className="text-[#1B2A4A] dark:text-[#D4A843] text-sm font-medium">{success}</p>
          )}

          <div className="bg-white dark:bg-[#1a1a1a] rounded-lg border border-[#e8e0d5] dark:border-gray-800 p-6 space-y-4">
            <h2 className="font-semibold text-[#1B2A4A] dark:text-[#F5F0E8]">Book Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                className={inputClass}
                placeholder="Title"
                value={editingBook.title}
                onChange={(e) => setEditingBook({ ...editingBook, title: e.target.value })}
              />
              <input
                className={inputClass}
                placeholder="Author"
                value={editingBook.author}
                onChange={(e) => setEditingBook({ ...editingBook, author: e.target.value })}
              />
              <input
                className={inputClass}
                placeholder="Cover URL"
                value={editingBook.cover_url || ''}
                onChange={(e) => setEditingBook({ ...editingBook, cover_url: e.target.value })}
              />
              <div>
                <input
                  className={inputClass}
                  placeholder="Page Count"
                  type="number"
                  value={editingBook.page_count}
                  onChange={(e) =>
                    setEditingBook({ ...editingBook, page_count: parseInt(e.target.value) || 0 })
                  }
                />
                <p className="text-[#2C2C2C]/50 dark:text-gray-500 text-xs mt-1">
                  Bounty: ${Math.min(editingBook.page_count * RATE_PER_PAGE, 5).toFixed(2)}
                </p>
              </div>
              <input
                className={inputClass}
                placeholder="Geniuslink URL"
                value={editingBook.geniuslink_url || ''}
                onChange={(e) =>
                  setEditingBook({ ...editingBook, geniuslink_url: e.target.value })
                }
              />
              <textarea
                className={inputClass}
                placeholder="Description"
                rows={3}
                value={editingBook.description || ''}
                onChange={(e) =>
                  setEditingBook({ ...editingBook, description: e.target.value })
                }
              />
              <div>
                <label className="block text-xs font-medium text-[#2C2C2C]/60 dark:text-gray-400 mb-1">
                  Book Type
                </label>
                <select
                  className={selectClass}
                  value={editingBook.book_type || 'platform'}
                  onChange={(e) =>
                    setEditingBook({
                      ...editingBook,
                      book_type: e.target.value as 'platform' | 'sponsored',
                    })
                  }
                >
                  <option value="platform">Platform</option>
                  <option value="sponsored">Sponsored</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1a1a1a] rounded-lg border border-[#e8e0d5] dark:border-gray-800 p-6 space-y-6">
            <h2 className="font-semibold text-[#1B2A4A] dark:text-[#F5F0E8]">Questions</h2>
            {editingQuestions.map((q, i) => (
              <div
                key={q.id}
                className="border border-[#e8e0d5] dark:border-gray-700 rounded-lg p-4 space-y-3"
              >
                <p className="text-[#1B2A4A] dark:text-[#F5F0E8] text-sm font-medium">
                  Question {i + 1}
                </p>
                <input
                  className={inputClass}
                  placeholder="Question"
                  value={q.question_text}
                  onChange={(e) => {
                    const updated = [...editingQuestions];
                    updated[i] = { ...updated[i], question_text: e.target.value };
                    setEditingQuestions(updated);
                  }}
                />
                <input
                  className={correctInputClass}
                  placeholder="Correct Answer"
                  value={q.correct_answer}
                  onChange={(e) => {
                    const updated = [...editingQuestions];
                    updated[i] = { ...updated[i], correct_answer: e.target.value };
                    setEditingQuestions(updated);
                  }}
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(['wrong_answer_1', 'wrong_answer_2', 'wrong_answer_3'] as const).map(
                    (field, wi) => (
                      <input
                        key={field}
                        className={inputClass}
                        placeholder={`Wrong Answer ${wi + 1}`}
                        value={q[field]}
                        onChange={(e) => {
                          const updated = [...editingQuestions];
                          updated[i] = { ...updated[i], [field]: e.target.value };
                          setEditingQuestions(updated);
                        }}
                      />
                    )
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleSaveEdit}
            disabled={saving}
            className="w-full bg-[#1B2A4A] hover:bg-[#142038] dark:bg-[#D4A843] dark:hover:bg-[#bf9538] dark:text-[#1B2A4A] text-[#F5F0E8] font-medium py-3 rounded-lg transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </main>
      </div>
    );
  }

  // ── Main Admin Panel ────────────────────────────────────────────────────────
  const pendingCashouts = cashouts.filter((c) => c.status === 'pending').length;

  return (
    <div className="min-h-screen bg-[#F5F0E8] dark:bg-[#0f0f0f] transition-colors duration-200">
      <header className="bg-[#1B2A4A] dark:bg-[#111111] border-b border-[#142038] dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateTo('/')}
              className="text-[#F5F0E8]/70 hover:text-[#F5F0E8] transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-serif text-2xl text-[#F5F0E8]">Admin Panel</h1>
          </div>
          <button
            onClick={toggleTheme}
            className="text-[#F5F0E8]/50 hover:text-[#F5F0E8] transition"
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {success && (
          <p className="text-[#1B2A4A] dark:text-[#D4A843] text-sm font-medium mb-4">{success}</p>
        )}
        {error && <p className="text-red-500 dark:text-red-400 text-sm mb-4">{error}</p>}

        {/* Tabs */}
        <div className="flex gap-3 mb-8 flex-wrap">
          {[
            { key: 'books', label: `Books & Questions (${books.length})` },
            { key: 'cashouts', label: `Cashout Requests (${pendingCashouts} pending)` },
            { key: 'waitlist', label: `Waitlist (${waitlist.length})` },
            {
              key: 'tropes',
              label: `Tropes (${tropeSuggestions.length > 0 ? `${tropeSuggestions.length} pending` : tropes.length})`,
            },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as typeof activeTab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === key
                  ? 'bg-[#1B2A4A] dark:bg-[#D4A843] dark:text-[#1B2A4A] text-[#F5F0E8]'
                  : 'bg-white dark:bg-[#1a1a1a] text-[#2C2C2C] dark:text-[#F5F0E8] border border-[#e8e0d5] dark:border-gray-700 hover:border-[#1B2A4A] dark:hover:border-[#D4A843]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Books Tab ── */}
        {activeTab === 'books' && (
          <div className="space-y-4">
            {books.map((book) => (
              <div
                key={book.id}
                className="bg-white dark:bg-[#1a1a1a] rounded-lg border border-[#e8e0d5] dark:border-gray-800 p-4 flex items-center gap-4"
              >
                {book.cover_url && (
                  <img
                    src={book.cover_url}
                    alt={book.title}
                    className="w-12 h-16 object-cover rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#1B2A4A] dark:text-[#F5F0E8] truncate">
                    {book.title}
                  </p>
                  <p className="text-[#2C2C2C]/50 dark:text-gray-400 text-sm">{book.author}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[#2C2C2C]/40 dark:text-gray-500 text-xs">
                      {book.page_count} pages ·{' '}
                      {book.book_type === 'sponsored'
                        ? `Bounty: $${book.bounty_amount.toFixed(2)}`
                        : 'Payout: free $0.50 / casual $0.65 / avid $0.80 / voracious $0.95'}
                    </p>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        book.book_type === 'sponsored'
                          ? 'bg-[#D4A843]/15 text-[#1B2A4A] dark:text-[#D4A843]'
                          : 'bg-[#1B2A4A]/10 text-[#1B2A4A] dark:bg-[#F5F0E8]/10 dark:text-[#F5F0E8]'
                      }`}
                    >
                      {book.book_type === 'sponsored' ? 'Sponsored' : 'Platform'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditBook(book)}
                    className="p-2 text-[#1B2A4A]/60 dark:text-gray-400 hover:text-[#1B2A4A] dark:hover:text-[#F5F0E8] hover:bg-[#F5F0E8] dark:hover:bg-[#2a2a2a] rounded-lg transition"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteBook(book.id)}
                    className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {!showAddForm ? (
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full border-2 border-dashed border-[#e8e0d5] dark:border-gray-700 hover:border-[#1B2A4A] dark:hover:border-[#D4A843] rounded-lg py-4 text-[#2C2C2C]/50 dark:text-gray-500 hover:text-[#1B2A4A] dark:hover:text-[#D4A843] transition flex items-center justify-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" /> Add New Book
              </button>
            ) : (
              <div className="bg-white dark:bg-[#1a1a1a] rounded-lg border border-[#e8e0d5] dark:border-gray-800 p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="font-semibold text-[#1B2A4A] dark:text-[#F5F0E8]">New Book</h2>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="text-[#2C2C2C]/40 dark:text-gray-500 hover:text-[#2C2C2C] dark:hover:text-[#F5F0E8] transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    className={inputClass}
                    placeholder="Title"
                    value={newBook.title}
                    onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                  />
                  <input
                    className={inputClass}
                    placeholder="Author"
                    value={newBook.author}
                    onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                  />
                  <input
                    className={inputClass}
                    placeholder="Cover URL"
                    value={newBook.cover_url}
                    onChange={(e) => setNewBook({ ...newBook, cover_url: e.target.value })}
                  />
                  <div>
                    <input
                      className={inputClass}
                      placeholder="Page Count"
                      type="number"
                      value={newBook.page_count}
                      onChange={(e) => setNewBook({ ...newBook, page_count: e.target.value })}
                    />
                    {newBook.page_count && (
                      <p className="text-[#2C2C2C]/50 dark:text-gray-500 text-xs mt-1">
                        Bounty: $
                        {Math.min(parseFloat(newBook.page_count) * RATE_PER_PAGE, 5).toFixed(2)}
                      </p>
                    )}
                  </div>
                  <input
                    className={inputClass}
                    placeholder="Geniuslink URL"
                    value={newBook.geniuslink_url}
                    onChange={(e) => setNewBook({ ...newBook, geniuslink_url: e.target.value })}
                  />
                  <textarea
                    className={inputClass}
                    placeholder="Description"
                    rows={3}
                    value={newBook.description}
                    onChange={(e) => setNewBook({ ...newBook, description: e.target.value })}
                  />
                  <div>
                    <label className="block text-xs font-medium text-[#2C2C2C]/60 dark:text-gray-400 mb-1">
                      Book Type
                    </label>
                    <select
                      className={selectClass}
                      value={newBook.book_type}
                      onChange={(e) =>
                        setNewBook({
                          ...newBook,
                          book_type: e.target.value as 'platform' | 'sponsored',
                        })
                      }
                    >
                      <option value="platform">Platform</option>
                      <option value="sponsored">Sponsored</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium text-[#1B2A4A] dark:text-[#F5F0E8] text-sm">
                    Questions (10 required)
                  </h3>
                  {questions.map((q, i) => (
                    <div
                      key={i}
                      className="border border-[#e8e0d5] dark:border-gray-700 rounded-lg p-4 space-y-3"
                    >
                      <p className="text-[#1B2A4A] dark:text-[#F5F0E8] text-sm font-medium">
                        Question {i + 1}
                      </p>
                      <input
                        className={inputClass}
                        placeholder="Question"
                        value={q.question_text}
                        onChange={(e) => {
                          const updated = [...questions];
                          updated[i] = { ...updated[i], question_text: e.target.value };
                          setQuestions(updated);
                        }}
                      />
                      <input
                        className={correctInputClass}
                        placeholder="Correct Answer"
                        value={q.correct_answer}
                        onChange={(e) => {
                          const updated = [...questions];
                          updated[i] = { ...updated[i], correct_answer: e.target.value };
                          setQuestions(updated);
                        }}
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {(['wrong_answer_1', 'wrong_answer_2', 'wrong_answer_3'] as const).map(
                          (field, wi) => (
                            <input
                              key={field}
                              className={inputClass}
                              placeholder={`Wrong Answer ${wi + 1}`}
                              value={q[field]}
                              onChange={(e) => {
                                const updated = [...questions];
                                updated[i] = { ...updated[i], [field]: e.target.value };
                                setQuestions(updated);
                              }}
                            />
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}
                <button
                  onClick={handleSaveBook}
                  disabled={saving}
                  className="w-full bg-[#1B2A4A] hover:bg-[#142038] dark:bg-[#D4A843] dark:hover:bg-[#bf9538] dark:text-[#1B2A4A] text-[#F5F0E8] font-medium py-3 rounded-lg transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Book & Questions'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Cashouts Tab ── */}
        {activeTab === 'cashouts' && (
          <div className="space-y-3">
            {cashouts.length === 0 && (
              <p className="text-[#2C2C2C]/50 dark:text-gray-500 text-sm">
                No cashout requests yet.
              </p>
            )}
            {cashouts.map((c) => (
              <div
                key={c.id}
                className="bg-white dark:bg-[#1a1a1a] rounded-lg border border-[#e8e0d5] dark:border-gray-800 p-4"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-medium text-[#1B2A4A] dark:text-[#F5F0E8] text-sm">
                      {c.profiles?.email}
                    </p>
                    <p className="text-[#2C2C2C]/50 dark:text-gray-500 text-xs mt-0.5">
                      {new Date(c.created_at).toLocaleString()} · {c.payout_type}
                    </p>
                    <p className="text-[#2C2C2C]/60 dark:text-gray-400 text-xs mt-1">
                      {c.payout_details}
                    </p>
                    {c.gift_card_brand && (
                      <p className="text-[#2C2C2C]/50 dark:text-gray-500 text-xs">
                        Brand: {c.gift_card_brand}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[#1B2A4A] dark:text-[#F5F0E8] font-semibold">
                      ${c.amount.toFixed(2)}
                    </span>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        c.status === 'completed'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : c.status === 'failed'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                          : 'bg-[#D4A843]/15 text-[#1B2A4A] dark:text-[#D4A843]'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                </div>
                {c.status === 'pending' && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleUpdateCashoutStatus(c.id, 'completed')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 text-xs font-medium rounded-lg transition"
                    >
                      <Check className="w-3.5 h-3.5" /> Mark Sent
                    </button>
                    <button
                      onClick={() => handleUpdateCashoutStatus(c.id, 'failed')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 text-xs font-medium rounded-lg transition"
                    >
                      <X className="w-3.5 h-3.5" /> Mark Failed
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Waitlist Tab ── */}
        {activeTab === 'waitlist' && (
          <div className="space-y-3">
            {waitlist.length === 0 && (
              <p className="text-[#2C2C2C]/50 dark:text-gray-500 text-sm">
                No waitlist entries yet.
              </p>
            )}
            {waitlist.map((entry) => (
              <div
                key={entry.id}
                className="bg-white dark:bg-[#1a1a1a] rounded-lg border border-[#e8e0d5] dark:border-gray-800 p-4 flex items-center gap-3"
              >
                <Mail className="w-4 h-4 text-[#1B2A4A]/40 dark:text-gray-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[#1B2A4A] dark:text-[#F5F0E8] text-sm font-medium truncate">
                    {entry.email}
                  </p>
                  <p className="text-[#2C2C2C]/40 dark:text-gray-600 text-xs">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteWaitlistEntry(entry.id)}
                  className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Tropes Tab ── */}
        {activeTab === 'tropes' && (
          <div className="space-y-8">
            {tropeSuggestions.length > 0 && (
              <div>
                <h2 className="font-semibold text-[#1B2A4A] dark:text-[#F5F0E8] mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#D4A843]" />
                  Pending Suggestions ({tropeSuggestions.length})
                </h2>
                <div className="space-y-3">
                  {tropeSuggestions.map((s) => (
                    <div
                      key={s.id}
                      className="bg-white dark:bg-[#1a1a1a] rounded-lg border border-[#D4A843]/30 dark:border-[#D4A843]/20 p-4 flex items-center gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#1B2A4A] dark:text-[#F5F0E8] text-sm">
                          {s.suggested_name}
                        </p>
                        <p className="text-[#2C2C2C]/50 dark:text-gray-500 text-xs mt-0.5">
                          Suggested for: {s.books?.title ?? 'Unknown book'}
                        </p>
                        <p className="text-[#2C2C2C]/40 dark:text-gray-600 text-xs">
                          {new Date(s.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleApproveSuggestion(s)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 text-xs font-medium rounded-lg transition"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => handleRejectSuggestion(s.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 text-xs font-medium rounded-lg transition"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="font-semibold text-[#1B2A4A] dark:text-[#F5F0E8] mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Trope Library ({tropes.length})
              </h2>
              <div className="flex gap-2 mb-4">
                <input
                  className={inputClass}
                  placeholder="New trope name (e.g. Enemies to Lovers)"
                  value={newTropeName}
                  onChange={(e) => setNewTropeName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddTrope();
                  }}
                />
                <button
                  onClick={handleAddTrope}
                  disabled={addingTrope || !newTropeName.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#1B2A4A] hover:bg-[#142038] dark:bg-[#D4A843] dark:hover:bg-[#bf9538] dark:text-[#1B2A4A] text-[#F5F0E8] text-sm font-medium rounded-lg transition disabled:opacity-40 flex-shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
              {tropes.length === 0 ? (
                <p className="text-[#2C2C2C]/50 dark:text-gray-500 text-sm">
                  No tropes yet. Add one above.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tropes.map((trope) => (
                    <div
                      key={trope.id}
                      className="flex items-center gap-1.5 bg-white dark:bg-[#1a1a1a] border border-[#e8e0d5] dark:border-gray-700 rounded-full px-3 py-1.5 text-sm text-[#1B2A4A] dark:text-[#F5F0E8]"
                    >
                      <span>{trope.name}</span>
                      <button
                        onClick={() => handleDeleteTrope(trope.id)}
                        className="text-[#2C2C2C]/30 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition ml-0.5"
                        aria-label={`Delete ${trope.name}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
