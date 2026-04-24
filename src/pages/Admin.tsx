import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../hooks/useNavigate';
import { ArrowLeft, Plus, Trash2, Check, X, Pencil, Mail, Sun, Moon, Tag, Trophy, BookOpen, Zap } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ADMIN_EMAIL = 'mondavis43@gmail.com';

export const GENRES = [
  'Action & Adventure', 'Biography & Memoir', 'Business', "Children's", 'Chick Lit',
  'Comics / Graphic Novels / Manga', 'Cozy Mystery', 'Dark Romance', 'Dystopian', 'Erotica',
  'Fantasy', 'Fiction', 'Gothic', 'Health & Wellness', 'Historical Fiction', 'History',
  'Horror', 'LGBTQIA+', 'Literary Fiction', 'Magical Realism', 'Mystery', 'Noir',
  'Non-Fiction', 'Paranormal', 'Poetry', 'Religious', 'Romance', 'Romantasy / Romantic Fantasy',
  'Satire', 'Science Fiction', 'Self-Help', 'Short Stories', 'Space Opera', 'Sports',
  'Spy', 'Suspense', 'Thriller', 'True Crime', 'War & Military', 'Western', "Women's Fiction", 'Young Adult',
];

const COMPETITION_TYPES = ['Sprint', 'Read-A-Thon', 'Elimination Bracket'] as const;
type CompetitionType = typeof COMPETITION_TYPES[number];

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Book {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  page_count: number;
  description: string | null;
  geniuslink_url: string | null;
  book_type: 'standard' | 'bulletin_board';
  genres: string[];
}

interface Bounty {
  id: string;
  book_id: string;
  pool_size: number;
  per_pass_amount: number;
  platform_fee: number;
  reader_pool: number;
  status: 'active' | 'completed' | 'paused';
  created_at: string;
  books: { title: string; author: string } | null;
}

interface Competition {
  id: string;
  type: CompetitionType;
  title: string;
  entry_fee: number;
  prize_pool: number;
  platform_cut: number;
  start_date: string;
  end_date: string;
  status: 'upcoming' | 'active' | 'completed';
  book_ids: string[];
  created_at: string;
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
  profiles: { email: string };
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
  book_type: 'standard' | 'bulletin_board';
  genres: string[];
}

interface NewQuestion {
  question_text: string;
  correct_answer: string;
  wrong_answer_1: string;
  wrong_answer_2: string;
  wrong_answer_3: string;
}

interface NewBounty {
  book_id: string;
  pool_size: number;
  per_pass_amount: number;
}

interface NewCompetition {
  type: CompetitionType;
  title: string;
  entry_fee: string;
  prize_pool: string;
  start_date: string;
  end_date: string;
  book_ids: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const emptyBook: NewBook = {
  title: '', author: '', cover_url: '', page_count: '',
  description: '', geniuslink_url: '', book_type: 'standard', genres: [],
};

const emptyQuestion: NewQuestion = {
  question_text: '', correct_answer: '',
  wrong_answer_1: '', wrong_answer_2: '', wrong_answer_3: '',
};

const emptyBounty: NewBounty = { book_id: '', pool_size: 25, per_pass_amount: 1 };

const emptyCompetition: NewCompetition = {
  type: 'Sprint', title: '', entry_fee: '', prize_pool: '',
  start_date: '', end_date: '', book_ids: [],
};

// ─── GenrePicker ──────────────────────────────────────────────────────────────

function GenrePicker({
  selected, onChange, selectClass,
}: {
  selected: string[];
  onChange: (genres: string[]) => void;
  selectClass: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs text-[#6B7280] dark:text-gray-400">Genres</label>
      <select
        className={selectClass}
        value=""
        onChange={(e) => {
          if (e.target.value && !selected.includes(e.target.value)) {
            onChange([...selected, e.target.value]);
          }
        }}
      >
        <option value="">Add a genre...</option>
        {GENRES.filter((g) => !selected.includes(g)).map((g) => (
          <option key={g} value={g}>{g}</option>
        ))}
      </select>
      <div className="flex flex-wrap gap-2">
        {selected.map((g) => (
          <span
            key={g}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#D4A843]/20 text-[#D4A843] text-xs"
          >
            {g}
            <button onClick={() => onChange(selected.filter((x) => x !== g))}>
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Main Admin Component ─────────────────────────────────────────────────────

export function Admin() {
  const { user } = useAuth();
  const { navigate } = useNavigate();
  const { theme, toggleTheme } = useTheme();

  type Tab = 'books' | 'bounties' | 'competitions' | 'cashouts' | 'waitlist' | 'tropes';
  const [activeTab, setActiveTab] = useState<Tab>('books');

  // Books
  const [books, setBooks] = useState<Book[]>([]);
  const [newBook, setNewBook] = useState<NewBook>(emptyBook);
  const [questions, setQuestions] = useState<NewQuestion[]>(Array(10).fill(null).map(() => ({ ...emptyQuestion })));
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [editingQuestions, setEditingQuestions] = useState<Question[]>([]);

  // Bounties
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [newBounty, setNewBounty] = useState<NewBounty>(emptyBounty);
  const [showAddBountyForm, setShowAddBountyForm] = useState(false);

  // Competitions
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [newComp, setNewComp] = useState<NewCompetition>(emptyCompetition);
  const [showAddCompForm, setShowAddCompForm] = useState(false);

  // Other
  const [cashouts, setCashouts] = useState<CashoutRequest[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [tropes, setTropes] = useState<Trope[]>([]);
  const [tropeSuggestions, setTropeSuggestions] = useState<TropeSuggestion[]>([]);
  const [newTropeName, setNewTropeName] = useState('');
  const [addingTrope, setAddingTrope] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ── Styling helpers ──────────────────────────────────────────────────────────
  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-[#e8e0d5] dark:border-gray-700 bg-white dark:bg-gray-800 text-[#1B2A4A] dark:text-[#F5F0E8] text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A843]/40';
  const correctInputClass =
    'w-full px-3 py-2 rounded-lg border border-green-400 bg-green-50 dark:bg-green-900/20 text-[#1B2A4A] dark:text-[#F5F0E8] text-sm focus:outline-none focus:ring-2 focus:ring-green-400/40';
  const selectClass =
    'w-full px-3 py-2 rounded-lg border border-[#e8e0d5] dark:border-gray-700 bg-white dark:bg-gray-800 text-[#1B2A4A] dark:text-[#F5F0E8] text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A843]/40';

  // ── Auth guard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (user && user.email !== ADMIN_EMAIL) navigate('/');
  }, [user]);

  // ── Load data ────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [
      { data: booksData },
      { data: bountiesData },
      { data: compsData },
      { data: cashoutsData },
      { data: waitlistData },
      { data: tropesData },
      { data: suggestionsData },
    ] = await Promise.all([
      supabase.from('books').select('*').order('created_at', { ascending: false }),
      supabase.from('bounties').select('*, books(title, author)').order('created_at', { ascending: false }),
      supabase.from('competitions').select('*').order('start_date', { ascending: false }),
      supabase.from('cashout_requests').select('*, profiles(email)').order('created_at', { ascending: false }),
      supabase.from('waitlist').select('*').order('created_at', { ascending: false }),
      supabase.from('tropes').select('*').order('name'),
      supabase.from('trope_suggestions').select('*, books(title)').eq('status', 'pending').order('created_at', { ascending: false }),
    ]);
    setBooks(booksData || []);
    setBounties(bountiesData || []);
    setCompetitions(compsData || []);
    setCashouts(cashoutsData || []);
    setWaitlist(waitlistData || []);
    setTropes(tropesData || []);
    setTropeSuggestions(suggestionsData || []);
    setLoading(false);
  }

  // ── Books ────────────────────────────────────────────────────────────────────
  async function handleSaveBook() {
    if (!newBook.title || !newBook.author || !newBook.page_count) {
      setError('Title, author, and page count are required.');
      return;
    }
    if (questions.some((q) => !q.question_text || !q.correct_answer)) {
      setError('All 10 questions must have a question and correct answer.');
      return;
    }
    setSaving(true);
    setError('');
    const { data: bookData, error: bookErr } = await supabase
      .from('books')
      .insert({
        title: newBook.title,
        author: newBook.author,
        cover_url: newBook.cover_url || null,
        page_count: parseInt(newBook.page_count),
        description: newBook.description || null,
        geniuslink_url: newBook.geniuslink_url || null,
        book_type: newBook.book_type,
        genres: newBook.genres,
      })
      .select()
      .single();
    if (bookErr || !bookData) { setError('Failed to save book.'); setSaving(false); return; }
    const questionsToInsert = questions.map((q) => ({ ...q, book_id: bookData.id }));
    const { error: qErr } = await supabase.from('questions').insert(questionsToInsert);
    if (qErr) { setError('Book saved but questions failed.'); setSaving(false); return; }
    setSuccess('Book added!');
    setNewBook(emptyBook);
    setQuestions(Array(10).fill(null).map(() => ({ ...emptyQuestion })));
    setShowAddForm(false);
    setSaving(false);
    loadData();
  }

  async function handleEditBook(book: Book) {
    setEditingBook(book);
    const { data } = await supabase.from('questions').select('*').eq('book_id', book.id);
    setEditingQuestions(data || []);
  }

  async function handleSaveEdit() {
  if (!editingBook) return;
  setSaving(true);

  // Update book details
  await supabase.from('books').update({
    title: editingBook.title,
    author: editingBook.author,
    cover_url: editingBook.cover_url,
    page_count: editingBook.page_count,
    description: editingBook.description,
    geniuslink_url: editingBook.geniuslink_url,
    book_type: editingBook.book_type,
    genres: editingBook.genres,
  }).eq('id', editingBook.id);

  // Split into existing (have a real UUID) vs new (id starts with 'new-')
  const existingQuestions = editingQuestions.filter((q) => !q.id.startsWith('new-'));
  const newQuestions = editingQuestions.filter((q) => q.id.startsWith('new-'));

  // Update existing questions
  for (const q of existingQuestions) {
    await supabase.from('questions').update({
      question_text: q.question_text,
      correct_answer: q.correct_answer,
      wrong_answer_1: q.wrong_answer_1,
      wrong_answer_2: q.wrong_answer_2,
      wrong_answer_3: q.wrong_answer_3,
    }).eq('id', q.id);
  }

  // Insert new questions
  if (newQuestions.length > 0) {
    await supabase.from('questions').insert(
      newQuestions.map((q) => ({
        book_id: editingBook.id,
        question_text: q.question_text,
        correct_answer: q.correct_answer,
        wrong_answer_1: q.wrong_answer_1,
        wrong_answer_2: q.wrong_answer_2,
        wrong_answer_3: q.wrong_answer_3,
      }))
    );
  }

  // Handle deletions — questions removed from the list that existed in DB
  const removedIds = editingQuestions
    .filter((q) => q.id.startsWith('new-'))
    .map((q) => q.id); // these were never in DB, nothing to delete

  // Get original question IDs from DB and delete any that are no longer in the list
  const currentIds = existingQuestions.map((q) => q.id);
  const { data: dbQuestions } = await supabase
    .from('questions')
    .select('id')
    .eq('book_id', editingBook.id);

  const toDelete = (dbQuestions || [])
    .map((q) => q.id)
    .filter((id) => !currentIds.includes(id));

  if (toDelete.length > 0) {
    await supabase.from('questions').delete().in('id', toDelete);
  }

  setSuccess('Book updated!');
  setEditingBook(null);
  setSaving(false);
  loadData();
}

  async function handleDeleteBook(id: string) {
    if (!confirm('Delete this book and all its questions?')) return;
    await supabase.from('questions').delete().eq('book_id', id);
    await supabase.from('books').delete().eq('id', id);
    loadData();
  }

  // ── Bounties ─────────────────────────────────────────────────────────────────
  async function handleSaveBounty() {
    if (!newBounty.book_id) { setError('Select a book for this bounty.'); return; }
    setSaving(true);
    setError('');
    const platform_fee = Math.round(newBounty.pool_size * 0.2 * 100) / 100;
    const reader_pool = Math.round(newBounty.pool_size * 0.8 * 100) / 100;
    const { error: err } = await supabase.from('bounties').insert({
      book_id: newBounty.book_id,
      pool_size: newBounty.pool_size,
      per_pass_amount: newBounty.per_pass_amount,
      platform_fee,
      reader_pool,
      status: 'active',
    });
    if (err) { setError('Failed to save bounty.'); setSaving(false); return; }
    setSuccess('Bounty created!');
    setNewBounty(emptyBounty);
    setShowAddBountyForm(false);
    setSaving(false);
    loadData();
  }

  async function handleUpdateBountyStatus(id: string, status: 'active' | 'completed' | 'paused') {
    await supabase.from('bounties').update({ status }).eq('id', id);
    loadData();
  }

  async function handleDeleteBounty(id: string) {
    if (!confirm('Delete this bounty?')) return;
    await supabase.from('bounties').delete().eq('id', id);
    loadData();
  }

  // ── Competitions ─────────────────────────────────────────────────────────────
  async function handleSaveCompetition() {
    if (!newComp.title || !newComp.start_date || !newComp.end_date || !newComp.entry_fee) {
      setError('Title, dates, and entry fee are required.');
      return;
    }
    if ((newComp.type === 'Sprint' || newComp.type === 'Elimination Bracket') && newComp.book_ids.length === 0) {
      setError('Select at least one book for this competition type.');
      return;
    }
    setSaving(true);
    setError('');
    const entryFee = parseFloat(newComp.entry_fee);
    const prizePool = parseFloat(newComp.prize_pool) || 0;
    const { error: err } = await supabase.from('competitions').insert({
      type: newComp.type,
      title: newComp.title,
      entry_fee: entryFee,
      prize_pool: prizePool,
      platform_cut: Math.round(prizePool * 0.25 * 100) / 100,
      start_date: newComp.start_date,
      end_date: newComp.end_date,
      status: 'upcoming',
      book_ids: newComp.type === 'Read-A-Thon' ? [] : newComp.book_ids,
    });
    if (err) { setError('Failed to save competition.'); setSaving(false); return; }
    setSuccess('Competition created!');
    setNewComp(emptyCompetition);
    setShowAddCompForm(false);
    setSaving(false);
    loadData();
  }

  async function handleUpdateCompStatus(id: string, status: 'upcoming' | 'active' | 'completed') {
    await supabase.from('competitions').update({ status }).eq('id', id);
    loadData();
  }

  async function handleDeleteCompetition(id: string) {
    if (!confirm('Delete this competition?')) return;
    await supabase.from('competitions').delete().eq('id', id);
    loadData();
  }

  // ── Cashouts ─────────────────────────────────────────────────────────────────
  async function handleUpdateCashoutStatus(id: string, status: string) {
    await supabase.from('cashout_requests').update({ status }).eq('id', id);
    loadData();
  }

  // ── Waitlist ─────────────────────────────────────────────────────────────────
  async function handleDeleteWaitlistEntry(id: string) {
    await supabase.from('waitlist').delete().eq('id', id);
    loadData();
  }

  // ── Tropes ───────────────────────────────────────────────────────────────────
  async function handleAddTrope() {
    if (!newTropeName.trim()) return;
    setAddingTrope(true);
    await supabase.from('tropes').insert({ name: newTropeName.trim() });
    setNewTropeName('');
    setAddingTrope(false);
    loadData();
  }

  async function handleDeleteTrope(id: string) {
    await supabase.from('book_tropes').delete().eq('trope_id', id);
    await supabase.from('tropes').delete().eq('id', id);
    loadData();
  }

  async function handleApproveSuggestion(suggestion: TropeSuggestion) {
    const existing = tropes.find((t) => t.name.toLowerCase() === suggestion.suggested_name.toLowerCase());
    let tropeId = existing?.id;
    if (!tropeId) {
      const { data } = await supabase.from('tropes').insert({ name: suggestion.suggested_name }).select().single();
      tropeId = data?.id;
    }
    if (tropeId) {
      await supabase.from('book_tropes').upsert({ book_id: suggestion.book_id, trope_id: tropeId });
    }
    await supabase.from('trope_suggestions').update({ status: 'approved' }).eq('id', suggestion.id);
    loadData();
  }

  async function handleRejectSuggestion(id: string) {
    await supabase.from('trope_suggestions').update({ status: 'rejected' }).eq('id', id);
    loadData();
  }

  // ── Eligible books for competitions (non-bulletin) ───────────────────────────
  const eligibleBooks = books.filter((b) => b.book_type !== 'bulletin_board');

  // ── Guards ───────────────────────────────────────────────────────────────────
  if (!user || user.email !== ADMIN_EMAIL) return null;
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F0E8] dark:bg-gray-900">
      <p className="text-[#1B2A4A] dark:text-[#F5F0E8]">Loading...</p>
    </div>
  );

  // ── Tab counts ───────────────────────────────────────────────────────────────
  const tabCounts: Record<Tab, number | null> = {
    books: books.length,
    bounties: bounties.filter((b) => b.status === 'active').length,
    competitions: competitions.filter((c) => c.status !== 'completed').length,
    cashouts: cashouts.filter((c) => c.status === 'pending').length,
    waitlist: waitlist.length,
    tropes: tropeSuggestions.length,
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'books', label: 'Books & Questions' },
    { key: 'bounties', label: 'Bounties' },
    { key: 'competitions', label: 'Competitions' },
    { key: 'cashouts', label: 'Cashout Requests' },
    { key: 'waitlist', label: 'Waitlist' },
    { key: 'tropes', label: 'Tropes' },
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F5F0E8] dark:bg-gray-900 pb-16">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-[#e8e0d5] dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-[#6B7280] hover:text-[#1B2A4A] dark:hover:text-[#F5F0E8]">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-semibold text-[#1B2A4A] dark:text-[#F5F0E8]">Admin Panel</h1>
        </div>
        <button onClick={toggleTheme} className="text-[#6B7280] hover:text-[#1B2A4A] dark:hover:text-[#F5F0E8]">
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Alerts */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-red-700 dark:text-red-400 text-sm flex items-center justify-between">
            {error}
            <button onClick={() => setError('')}><X size={14} /></button>
          </div>
        )}
        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3 text-green-700 dark:text-green-400 text-sm flex items-center justify-between">
            {success}
            <button onClick={() => setSuccess('')}><X size={14} /></button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                activeTab === key
                  ? 'bg-[#1B2A4A] text-white dark:bg-[#D4A843] dark:text-[#1B2A4A]'
                  : 'bg-white dark:bg-gray-800 text-[#6B7280] dark:text-gray-400 hover:text-[#1B2A4A] dark:hover:text-[#F5F0E8]'
              }`}
            >
              {label}
              {tabCounts[key] !== null && tabCounts[key]! > 0 && (
                <span className="ml-2 bg-[#D4A843] text-[#1B2A4A] text-xs rounded-full px-1.5 py-0.5">
                  {tabCounts[key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── BOOKS TAB ─────────────────────────────────────────────────────── */}
        {activeTab === 'books' && (
          <div className="space-y-4">
            {/* Edit mode */}
            {editingBook ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e0d5] dark:border-gray-700 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-[#1B2A4A] dark:text-[#F5F0E8]">Edit Book</h2>
                  <button onClick={() => setEditingBook(null)} className="text-[#6B7280] hover:text-[#1B2A4A] dark:hover:text-[#F5F0E8]">
                    <X size={18} />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input className={inputClass} placeholder="Title" value={editingBook.title} onChange={(e) => setEditingBook({ ...editingBook, title: e.target.value })} />
                  <input className={inputClass} placeholder="Author" value={editingBook.author} onChange={(e) => setEditingBook({ ...editingBook, author: e.target.value })} />
                  <input className={inputClass} placeholder="Cover URL" value={editingBook.cover_url || ''} onChange={(e) => setEditingBook({ ...editingBook, cover_url: e.target.value })} />
                  <input className={inputClass} type="number" placeholder="Page Count" value={editingBook.page_count} onChange={(e) => setEditingBook({ ...editingBook, page_count: parseInt(e.target.value) })} />
                  <input className={inputClass} placeholder="Geniuslink URL" value={editingBook.geniuslink_url || ''} onChange={(e) => setEditingBook({ ...editingBook, geniuslink_url: e.target.value })} />
                  <select className={selectClass} value={editingBook.book_type} onChange={(e) => setEditingBook({ ...editingBook, book_type: e.target.value as Book['book_type'] })}>
                    <option value="standard">Standard Listing</option>
                    <option value="bulletin_board">Bulletin Board</option>
                  </select>
                </div>
                <textarea className={inputClass} placeholder="Description" rows={3} value={editingBook.description || ''} onChange={(e) => setEditingBook({ ...editingBook, description: e.target.value })} />
                <GenrePicker selected={editingBook.genres} onChange={(genres) => setEditingBook({ ...editingBook, genres })} selectClass={selectClass} />
<div className="space-y-4">
  <div className="flex items-center justify-between">
    <h3 className="font-medium text-[#1B2A4A] dark:text-[#F5F0E8] text-sm">
      Questions ({editingQuestions.length})
    </h3>
    <button
      onClick={() =>
        setEditingQuestions([
          ...editingQuestions,
          {
            id: `new-${Date.now()}`,
            book_id: editingBook!.id,
            question_text: '',
            correct_answer: '',
            wrong_answer_1: '',
            wrong_answer_2: '',
            wrong_answer_3: '',
          },
        ])
      }
      className="flex items-center gap-1 text-xs px-3 py-1.5 bg-[#D4A843] text-[#1B2A4A] rounded-lg font-medium hover:bg-[#c49a3a]"
    >
      <Plus size={13} /> Add Question
    </button>
  </div>

  {editingQuestions.map((q, i) => (
    <div
      key={q.id}
      className="border border-[#e8e0d5] dark:border-gray-700 rounded-lg p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <p className="text-[#1B2A4A] dark:text-[#F5F0E8] text-sm font-medium">
          Question {i + 1}
        </p>
        {editingQuestions.length > 1 && (
          <button
            onClick={() =>
              setEditingQuestions(editingQuestions.filter((_, idx) => idx !== i))
            }
            className="text-red-400 hover:text-red-600"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      <input
        className={inputClass}
        placeholder="Question"
        value={q.question_text}
        onChange={(e) => {
          const u = [...editingQuestions];
          u[i] = { ...u[i], question_text: e.target.value };
          setEditingQuestions(u);
        }}
      />
      <input
        className={correctInputClass}
        placeholder="Correct Answer"
        value={q.correct_answer}
        onChange={(e) => {
          const u = [...editingQuestions];
          u[i] = { ...u[i], correct_answer: e.target.value };
          setEditingQuestions(u);
        }}
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(['wrong_answer_1', 'wrong_answer_2', 'wrong_answer_3'] as const).map((field) => (
          <input
            key={field}
            className={inputClass}
            placeholder={`Wrong ${field.slice(-1)}`}
            value={q[field]}
            onChange={(e) => {
              const u = [...editingQuestions];
              u[i] = { ...u[i], [field]: e.target.value };
              setEditingQuestions(u);
            }}
          />
        ))}
      </div>
    </div>
  ))}
</div>
                <div className="flex gap-3">
                  <button onClick={handleSaveEdit} disabled={saving} className="px-4 py-2 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-sm font-medium hover:bg-[#c49a3a] disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button onClick={() => setEditingBook(null)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-[#6B7280] rounded-lg text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                {/* Add book form */}
                {showAddForm && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e0d5] dark:border-gray-700 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold text-[#1B2A4A] dark:text-[#F5F0E8]">Add New Book</h2>
                      <button onClick={() => setShowAddForm(false)} className="text-[#6B7280]"><X size={18} /></button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <input className={inputClass} placeholder="Title" value={newBook.title} onChange={(e) => setNewBook({ ...newBook, title: e.target.value })} />
                      <input className={inputClass} placeholder="Author" value={newBook.author} onChange={(e) => setNewBook({ ...newBook, author: e.target.value })} />
                      <input className={inputClass} placeholder="Cover URL" value={newBook.cover_url} onChange={(e) => setNewBook({ ...newBook, cover_url: e.target.value })} />
                      <input className={inputClass} type="number" placeholder="Page Count" value={newBook.page_count} onChange={(e) => setNewBook({ ...newBook, page_count: e.target.value })} />
                      <input className={inputClass} placeholder="Geniuslink URL" value={newBook.geniuslink_url} onChange={(e) => setNewBook({ ...newBook, geniuslink_url: e.target.value })} />
                      <select className={selectClass} value={newBook.book_type} onChange={(e) => setNewBook({ ...newBook, book_type: e.target.value as NewBook['book_type'] })}>
                        <option value="standard">Standard Listing</option>
                        <option value="bulletin_board">Bulletin Board</option>
                      </select>
                    </div>
                    <textarea className={inputClass} placeholder="Description" rows={3} value={newBook.description} onChange={(e) => setNewBook({ ...newBook, description: e.target.value })} />
                    <GenrePicker selected={newBook.genres} onChange={(genres) => setNewBook({ ...newBook, genres })} selectClass={selectClass} />
                    <div className="space-y-4">
                      <h3 className="font-medium text-[#1B2A4A] dark:text-[#F5F0E8] text-sm">Questions (10 required)</h3>
                      {questions.map((q, i) => (
                        <div key={i} className="border border-[#e8e0d5] dark:border-gray-700 rounded-lg p-4 space-y-3">
                          <p className="text-[#1B2A4A] dark:text-[#F5F0E8] text-sm font-medium">Question {i + 1}</p>
                          <input className={inputClass} placeholder="Question" value={q.question_text} onChange={(e) => { const u = [...questions]; u[i] = { ...u[i], question_text: e.target.value }; setQuestions(u); }} />
                          <input className={correctInputClass} placeholder="Correct Answer" value={q.correct_answer} onChange={(e) => { const u = [...questions]; u[i] = { ...u[i], correct_answer: e.target.value }; setQuestions(u); }} />
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {(['wrong_answer_1', 'wrong_answer_2', 'wrong_answer_3'] as const).map((field) => (
                              <input key={field} className={inputClass} placeholder={`Wrong ${field.slice(-1)}`} value={q[field]} onChange={(e) => { const u = [...questions]; u[i] = { ...u[i], [field]: e.target.value }; setQuestions(u); }} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      <button onClick={handleSaveBook} disabled={saving} className="px-4 py-2 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-sm font-medium hover:bg-[#c49a3a] disabled:opacity-50">
                        {saving ? 'Saving...' : 'Add Book'}
                      </button>
                      <button onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-[#6B7280] rounded-lg text-sm">Cancel</button>
                    </div>
                  </div>
                )}

                {/* Book list */}
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-[#1B2A4A] dark:text-[#F5F0E8]">Books ({books.length})</h2>
                  {!showAddForm && (
                    <button onClick={() => setShowAddForm(true)} className="flex items-center gap-2 px-3 py-2 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-sm font-medium hover:bg-[#c49a3a]">
                      <Plus size={16} /> Add Book
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {books.map((book) => (
                    <div key={book.id} className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e0d5] dark:border-gray-700 p-4 flex gap-4">
                      {book.cover_url && (
                        <img src={book.cover_url} alt={book.title} className="w-12 h-16 object-cover rounded" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-[#1B2A4A] dark:text-[#F5F0E8] text-sm">{book.title}</p>
                            <p className="text-xs text-[#6B7280] dark:text-gray-400">{book.author} · {book.page_count} pages</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              book.book_type === 'bulletin_board'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                : 'bg-[#D4A843]/20 text-[#D4A843]'
                            }`}>
                              {book.book_type === 'bulletin_board' ? 'Bulletin Board' : 'Standard'}
                            </span>
                            <button onClick={() => handleEditBook(book)} className="text-[#6B7280] hover:text-[#1B2A4A] dark:hover:text-[#F5F0E8]"><Pencil size={15} /></button>
                            <button onClick={() => handleDeleteBook(book.id)} className="text-red-400 hover:text-red-600"><Trash2 size={15} /></button>
                          </div>
                        </div>
                        {book.genres?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {book.genres.map((g) => (
                              <span key={g} className="text-xs bg-[#F5F0E8] dark:bg-gray-700 text-[#6B7280] dark:text-gray-400 px-2 py-0.5 rounded-full">{g}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── BOUNTIES TAB ──────────────────────────────────────────────────── */}
{activeTab === 'bounties' && (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h2 className="font-semibold text-[#1B2A4A] dark:text-[#F5F0E8]">Author Bounties</h2>
      {!showAddBountyForm && (
        <button
          onClick={() => setShowAddBountyForm(true)}
          className="flex items-center gap-2 px-3 py-2 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-sm font-medium hover:bg-[#c49a3a]"
        >
          <Plus size={16} /> New Bounty
        </button>
      )}
    </div>

    {/* Create Form */}
    {showAddBountyForm && (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e0d5] dark:border-gray-700 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[#1B2A4A] dark:text-[#F5F0E8]">Create Bounty</h3>
          <button onClick={() => { setShowAddBountyForm(false); setNewBounty(emptyBounty); }} className="text-[#6B7280]">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Book selector */}
          <div>
            <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Book</label>
            <select
              className={selectClass}
              value={newBounty.book_id}
              onChange={(e) => setNewBounty({ ...newBounty, book_id: e.target.value })}
            >
              <option value="">Select a book...</option>
              {books.map((book) => (
                <option key={book.id} value={book.id}>{book.title} — {book.author}</option>
              ))}
            </select>
          </div>

          {/* Pool size */}
          <div>
            <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Pool Size</label>
            <div className="flex flex-wrap gap-2">
              {BOUNTY_POOL_OPTIONS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setNewBounty({ ...newBounty, pool_size: amt })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                    newBounty.pool_size === amt
                      ? 'bg-[#D4A843] border-[#D4A843] text-[#1B2A4A]'
                      : 'border-gray-300 dark:border-gray-600 text-[#1B2A4A] dark:text-[#F5F0E8] hover:border-[#D4A843]'
                  }`}
                >
                  ${amt}
                </button>
              ))}
            </div>
            <p className="text-xs text-[#6B7280] dark:text-gray-400 mt-1">
              Platform keeps ${(newBounty.pool_size * 0.2).toFixed(2)} · Readers earn ${(newBounty.pool_size * 0.8).toFixed(2)}
            </p>
          </div>

          {/* Per-pass payout */}
          <div>
            <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Per-Pass Payout ($)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className={inputClass}
              value={newBounty.per_pass_amount}
              onChange={(e) => setNewBounty({ ...newBounty, per_pass_amount: parseFloat(e.target.value) || 0 })}
              placeholder="e.g. 0.50"
            />
            <p className="text-xs text-[#6B7280] dark:text-gray-400 mt-1">
              Estimated passes: {newBounty.per_pass_amount > 0 ? Math.floor((newBounty.pool_size * 0.8) / newBounty.per_pass_amount) : '—'}
            </p>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSaveBounty}
            disabled={saving}
            className="px-4 py-2 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-sm font-semibold hover:bg-[#c49a3a] disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Create Bounty'}
          </button>
          <button
            onClick={() => { setShowAddBountyForm(false); setNewBounty(emptyBounty); }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-[#6B7280] hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    )}

    {/* Bounties List */}
    {bounties.length === 0 ? (
      <p className="text-sm text-[#6B7280] dark:text-gray-400">No bounties yet.</p>
    ) : (
      <div className="space-y-3">
        {bounties.map((bounty) => {
          const passesTotal = bounty.per_pass_amount > 0
            ? Math.floor(bounty.reader_pool / bounty.per_pass_amount)
            : 0;
          return (
            <div
              key={bounty.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e0d5] dark:border-gray-700 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="font-medium text-[#1B2A4A] dark:text-[#F5F0E8]">
                    {books.find((b) => b.id === bounty.book_id)?.title ?? 'Unknown Book'}
                  </p>
                  <p className="text-xs text-[#6B7280] dark:text-gray-400 mt-0.5">
                    {books.find((b) => b.id === bounty.book_id)?.author ?? ''}
                  </p>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm">
                    <span className="text-[#1B2A4A] dark:text-[#F5F0E8]">
                      Pool: <strong>${bounty.pool_size}</strong>
                    </span>
                    <span className="text-[#6B7280] dark:text-gray-400">
                      Platform: ${bounty.platform_fee}
                    </span>
                    <span className="text-[#6B7280] dark:text-gray-400">
                      Reader pool: ${bounty.reader_pool}
                    </span>
                    <span className="text-[#D4A843] font-medium">
                      ${bounty.per_pass_amount}/pass · ~{passesTotal} passes
                    </span>
                  </div>
                </div>

                {/* Status badge */}
                <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${
                  bounty.status === 'active'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : bounty.status === 'paused'
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                }`}>
                  {bounty.status}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-3 flex-wrap">
                {bounty.status === 'active' && (
                  <button
                    onClick={() => handleUpdateBountyStatus(bounty.id, 'paused')}
                    className="text-xs px-3 py-1.5 rounded-lg border border-yellow-400 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition"
                  >
                    Pause
                  </button>
                )}
                {bounty.status === 'paused' && (
                  <button
                    onClick={() => handleUpdateBountyStatus(bounty.id, 'active')}
                    className="text-xs px-3 py-1.5 rounded-lg border border-green-400 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition"
                  >
                    Resume
                  </button>
                )}
                {bounty.status !== 'completed' && (
                  <button
                    onClick={() => handleUpdateBountyStatus(bounty.id, 'completed')}
                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-[#6B7280] hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    Mark Completed
                  </button>
                )}
                <button
                  onClick={() => handleDeleteBounty(bounty.id)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-red-300 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition ml-auto"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
)}

        {/* ── COMPETITIONS TAB ──────────────────────────────────────────────── */}
{activeTab === 'competitions' && (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h2 className="font-semibold text-[#1B2A4A] dark:text-[#F5F0E8]">Competitions</h2>
      {!showAddCompForm && (
        <button
          onClick={() => setShowAddCompForm(true)}
          className="flex items-center gap-2 px-3 py-2 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-sm font-medium hover:bg-[#c49a3a]"
        >
          <Plus size={16} /> New Competition
        </button>
      )}
    </div>

    {/* Create Form */}
    {showAddCompForm && (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e0d5] dark:border-gray-700 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[#1B2A4A] dark:text-[#F5F0E8]">Create Competition</h3>
          <button onClick={() => { setShowAddCompForm(false); setNewComp(emptyCompetition); }} className="text-[#6B7280]">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Type */}
          <div>
            <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Type</label>
            <div className="flex flex-wrap gap-2">
              {COMPETITION_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => setNewComp({ ...newComp, type, book_ids: [] })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                    newComp.type === type
                      ? 'bg-[#D4A843] border-[#D4A843] text-[#1B2A4A]'
                      : 'border-gray-300 dark:border-gray-600 text-[#1B2A4A] dark:text-[#F5F0E8] hover:border-[#D4A843]'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            <p className="text-xs text-[#6B7280] dark:text-gray-400 mt-1">
              {newComp.type === 'Read-A-Thon'
                ? 'Read-A-Thon: readers earn across any books on the platform — no book selection needed.'
                : 'Sprint & Elimination: select specific books readers will be quizzed on.'}
            </p>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Title</label>
            <input
              type="text"
              className={inputClass}
              value={newComp.title}
              onChange={(e) => setNewComp({ ...newComp, title: e.target.value })}
              placeholder="e.g. April Sprint — Week 1"
            />
          </div>

          {/* Book selection (Sprint + Elimination only) */}
          {newComp.type !== 'Read-A-Thon' && (
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">
                Books ({newComp.book_ids.length} selected)
              </label>
              <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
                {books.map((book) => {
                  const selected = newComp.book_ids.includes(book.id);
                  return (
                    <label
                      key={book.id}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => {
                          const updated = selected
                            ? newComp.book_ids.filter((id) => id !== book.id)
                            : [...newComp.book_ids, book.id];
                          setNewComp({ ...newComp, book_ids: updated });
                        }}
                        className="accent-[#D4A843]"
                      />
                      <span className="text-sm text-[#1B2A4A] dark:text-[#F5F0E8]">
                        {book.title}
                        <span className="text-[#6B7280] dark:text-gray-400 ml-1">— {book.author}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Start Date</label>
              <input
                type="date"
                className={inputClass}
                value={newComp.start_date}
                onChange={(e) => setNewComp({ ...newComp, start_date: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">End Date</label>
              <input
                type="date"
                className={inputClass}
                value={newComp.end_date}
                onChange={(e) => setNewComp({ ...newComp, end_date: e.target.value })}
              />
            </div>
          </div>

          {/* Entry fee + prize pool */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Entry Fee ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className={inputClass}
                value={newComp.entry_fee}
                onChange={(e) => setNewComp({ ...newComp, entry_fee: e.target.value })}
                placeholder="e.g. 5.00"
              />
            </div>
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Starting Prize Pool ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className={inputClass}
                value={newComp.prize_pool}
                onChange={(e) => setNewComp({ ...newComp, prize_pool: e.target.value })}
                placeholder="e.g. 100.00"
              />
            </div>
          </div>
          {newComp.prize_pool && (
            <p className="text-xs text-[#6B7280] dark:text-gray-400">
              Platform keeps ${(parseFloat(newComp.prize_pool) * 0.25).toFixed(2)} · Winners split ${(parseFloat(newComp.prize_pool) * 0.75).toFixed(2)}
            </p>
          )}
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSaveCompetition}
            disabled={saving}
            className="px-4 py-2 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-sm font-semibold hover:bg-[#c49a3a] disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Create Competition'}
          </button>
          <button
            onClick={() => { setShowAddCompForm(false); setNewComp(emptyCompetition); }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-[#6B7280] hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    )}

    {/* Competitions List */}
    {competitions.length === 0 ? (
      <p className="text-sm text-[#6B7280] dark:text-gray-400">No competitions yet.</p>
    ) : (
      <div className="space-y-3">
        {competitions.map((comp) => (
          <div
            key={comp.id}
            className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e0d5] dark:border-gray-700 p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium text-[#1B2A4A] dark:text-[#F5F0E8]">{comp.title}</p>
                <p className="text-xs text-[#6B7280] dark:text-gray-400 mt-0.5">{comp.type}</p>
                <div className="flex flex-wrap gap-4 mt-2 text-sm">
                  <span className="text-[#1B2A4A] dark:text-[#F5F0E8]">
                    Entry: <strong>${comp.entry_fee}</strong>
                  </span>
                  <span className="text-[#D4A843] font-medium">
                    Prize pool: ${comp.prize_pool}
                  </span>
                  <span className="text-[#6B7280] dark:text-gray-400">
                    Platform: ${comp.platform_cut}
                  </span>
                  <span className="text-[#6B7280] dark:text-gray-400">
                    {comp.start_date} → {comp.end_date}
                  </span>
                </div>
                {comp.book_ids && comp.book_ids.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {comp.book_ids.map((id: string) => {
                      const b = books.find((bk) => bk.id === id);
                      return b ? (
                        <span
                          key={id}
                          className="text-xs bg-[#1B2A4A]/10 dark:bg-[#F5F0E8]/10 text-[#1B2A4A] dark:text-[#F5F0E8] px-2 py-0.5 rounded-full"
                        >
                          {b.title}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>

              {/* Status badge */}
              <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${
                comp.status === 'active'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : comp.status === 'upcoming'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
              }`}>
                {comp.status}
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-3 flex-wrap">
              {comp.status === 'upcoming' && (
                <button
                  onClick={() => handleUpdateCompStatus(comp.id, 'active')}
                  className="text-xs px-3 py-1.5 rounded-lg border border-green-400 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition"
                >
                  Go Live
                </button>
              )}
              {comp.status === 'active' && (
                <button
                  onClick={() => handleUpdateCompStatus(comp.id, 'completed')}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-[#6B7280] hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  End Competition
                </button>
              )}
              <button
                onClick={() => handleDeleteCompetition(comp.id)}
                className="text-xs px-3 py-1.5 rounded-lg border border-red-300 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition ml-auto"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)}
        {/* ── CASHOUTS TAB ──────────────────────────────────────────────────── */}
        {activeTab === 'cashouts' && (
          <div className="space-y-3">
            <h2 className="font-semibold text-[#1B2A4A] dark:text-[#F5F0E8]">
              Cashout Requests ({cashouts.filter((c) => c.status === 'pending').length} pending)
            </h2>
            {cashouts.length === 0 && <p className="text-sm text-[#6B7280] dark:text-gray-400">No cashout requests.</p>}
            {cashouts.map((cashout) => (
              <div key={cashout.id} className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e0d5] dark:border-gray-700 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Mail size={14} className="text-[#6B7280]" />
                      <p className="text-sm text-[#1B2A4A] dark:text-[#F5F0E8]">{cashout.profiles?.email}</p>
                    </div>
                    <p className="text-xs text-[#6B7280] dark:text-gray-400 mt-0.5">
                      {new Date(cashout.created_at).toLocaleDateString()} · {cashout.payout_type}
                    </p>
                    <p className="text-xs text-[#6B7280] dark:text-gray-400">{cashout.payout_details}</p>
                    {cashout.gift_card_brand && (
                      <p className="text-xs text-[#6B7280] dark:text-gray-400">Gift card: {cashout.gift_card_brand}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-semibold text-[#1B2A4A] dark:text-[#F5F0E8] text-sm">${cashout.amount.toFixed(2)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      cashout.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : cashout.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {cashout.status}
                    </span>
                  </div>
                </div>
                {cashout.status === 'pending' && (
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => handleUpdateCashoutStatus(cashout.id, 'completed')} className="flex items-center gap-1 text-xs px-3 py-1 rounded-lg bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:opacity-80">
                      <Check size={12} /> Sent
                    </button>
                    <button onClick={() => handleUpdateCashoutStatus(cashout.id, 'failed')} className="flex items-center gap-1 text-xs px-3 py-1 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:opacity-80">
                      <X size={12} /> Failed
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── WAITLIST TAB ──────────────────────────────────────────────────── */}
        {activeTab === 'waitlist' && (
          <div className="space-y-3">
            <h2 className="font-semibold text-[#1B2A4A] dark:text-[#F5F0E8]">Waitlist ({waitlist.length})</h2>
            {waitlist.length === 0 && <p className="text-sm text-[#6B7280] dark:text-gray-400">Waitlist is empty.</p>}
            {waitlist.map((entry) => (
              <div key={entry.id} className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e0d5] dark:border-gray-700 p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#1B2A4A] dark:text-[#F5F0E8]">{entry.email}</p>
                  <p className="text-xs text-[#6B7280] dark:text-gray-400">{new Date(entry.created_at).toLocaleDateString()}</p>
                </div>
                <button onClick={() => handleDeleteWaitlistEntry(entry.id)} className="text-red-400 hover:text-red-600"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        )}

        {/* ── TROPES TAB ────────────────────────────────────────────────────── */}
        {activeTab === 'tropes' && (
          <div className="space-y-6">
            {/* Pending suggestions */}
            {tropeSuggestions.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-semibold text-[#1B2A4A] dark:text-[#F5F0E8]">
                  Pending Suggestions ({tropeSuggestions.length})
                </h2>
                {tropeSuggestions.map((s) => (
                  <div key={s.id} className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e0d5] dark:border-gray-700 p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[#1B2A4A] dark:text-[#F5F0E8]">{s.suggested_name}</p>
                      <p className="text-xs text-[#6B7280] dark:text-gray-400">for: {s.books?.title ?? 'Unknown'}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => handleApproveSuggestion(s)} className="flex items-center gap-1 text-xs px-3 py-1 rounded-lg bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:opacity-80">
                        <Check size={12} /> Approve
                      </button>
                      <button onClick={() => handleRejectSuggestion(s.id)} className="flex items-center gap-1 text-xs px-3 py-1 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:opacity-80">
                        <X size={12} /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Trope library */}
            <div className="space-y-3">
              <h2 className="font-semibold text-[#1B2A4A] dark:text-[#F5F0E8]">Trope Library ({tropes.length})</h2>
              <div className="flex gap-2">
                <input
                  className={inputClass}
                  placeholder="New trope name..."
                  value={newTropeName}
                  onChange={(e) => setNewTropeName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTrope()}
                />
                <button onClick={handleAddTrope} disabled={addingTrope || !newTropeName.trim()} className="px-4 py-2 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-sm font-medium hover:bg-[#c49a3a] disabled:opacity-50 shrink-0">
                  <Plus size={16} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {tropes.map((trope) => (
                  <span key={trope.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-[#e8e0d5] dark:border-gray-700 text-[#1B2A4A] dark:text-[#F5F0E8] text-sm">
                    <Tag size={12} className="text-[#D4A843]" />
                    {trope.name}
                    <button onClick={() => handleDeleteTrope(trope.id)} className="text-[#6B7280] hover:text-red-500 ml-0.5">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
