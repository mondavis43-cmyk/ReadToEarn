import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from '../hooks/useNavigate';
import { useTheme } from '../contexts/ThemeContext';
import {
  BookOpen, Users, DollarSign, ArrowLeft, Edit2, Pin, PinOff,
  MessageSquare, Trophy, Upload, Check, Search, X, Star
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

interface BookListing {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  page_count: number;
  book_type: 'standard' | 'bulletin_board';
  description: string | null;
  total_completions: number;
  pass_count: number;
  total_paid_out: number;
}

interface Question {
  id: string;
  question_text: string;
  correct_answer: string;
  wrong_answer_1: string;
  wrong_answer_2: string;
  wrong_answer_3: string;
}

interface AMASessionRow {
  id: string;
  title: string;
  status: 'open' | 'answering' | 'closed';
  ama_start_date: string;
  questions_close_at: string;
  books?: { title: string } | null;
}

interface BountyRow {
  id: string;
  title: string;
  payout_per_reader: number;
  pool_amount: number;
  is_active: boolean;
  books?: { title: string } | null;
}

interface CompetitionRow {
  id: string;
  title: string;
  format: string;
  start_date: string;
  end_date: string;
  book_title: string;
}

interface ClaimableBook {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  page_count: number;
}

interface AmbassadorPayout {
  id: string;
  referred_id: string;
  listing_tier: ListingTier | null;
  listing_fee: number;
  payout_amount: number;
  status: 'pending' | 'paid';
  created_at: string;
  paid_at: string | null;
  referred: { email: string } | null;
}

interface AuthorProfile {
  author_referral_code: string | null;
}

type EditTab = 'details' | 'quiz';
type DashTab = 'books' | 'ama' | 'bounties' | 'competitions' | 'ambassador';
type ListingTier = 'single' | 'trilogy' | 'series' | 'catalog' | 'imprint';

const LISTING_TIERS: Record<ListingTier, { label: string; fee: number; books: number }> = {
  single:   { label: 'Single',   fee: 7,   books: 1  },
  trilogy:  { label: 'Trilogy',  fee: 18,  books: 3  },
  series:   { label: 'Series',   fee: 30,  books: 5  },
  catalog:  { label: 'Catalog',  fee: 50,  books: 10 },
  imprint:  { label: 'Imprint',  fee: 100, books: 25 },
};

const AMBASSADOR_PCT = 0.25;

// ── Component ──────────────────────────────────────────────────────────────

export const AuthorDashboard = () => {
  const { isDark } = useTheme();
  const { navigateTo } = useNavigate();

  const bg           = isDark ? 'bg-[#0F1923]'                        : 'bg-[#FAF8F5]';
  const textPrimary  = isDark ? 'text-[#F5F0E8]'                      : 'text-[#1B2A4A]';
  const textMuted    = isDark ? 'text-[#F5F0E8]/60'                   : 'text-[#1B2A4A]/60';
  const cardBg       = isDark ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20' : 'bg-white border-[#D4A843]/30';
  const divider      = isDark ? 'border-gray-800'                      : 'border-gray-200';
  const subColor     = isDark ? 'text-[#F5F0E8]/50'                   : 'text-[#1B2A4A]/50';
  const inputCls     = `w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 ${textPrimary} text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A843]/40`;

  // ── State ────────────────────────────────────────────────────────────────

  const [userId,       setUserId]       = useState<string | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [dashTab,      setDashTab]      = useState<DashTab>('books');

  const [books,        setBooks]        = useState<BookListing[]>([]);
  const [totalReaders, setTotalReaders] = useState(0);
  const [totalPaid,    setTotalPaid]    = useState(0);

  const [amaSessions,  setAmaSessions]  = useState<AMASessionRow[]>([]);
  const [bounties,     setBounties]     = useState<BountyRow[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionRow[]>([]);

  const [authorProfile,      setAuthorProfile]      = useState<AuthorProfile | null>(null);
  const [ambassadorPayouts,  setAmbassadorPayouts]  = useState<AmbassadorPayout[]>([]);
  const [codeCopied,         setCodeCopied]         = useState(false);
  const [linkCopied,         setLinkCopied]         = useState(false);

  const [editingBook,    setEditingBook]    = useState<BookListing | null>(null);
  const [editTab,        setEditTab]        = useState<EditTab>('details');
  const [editForm,       setEditForm]       = useState({ title: '', author: '', description: '', page_count: 0 });
  const [questions,      setQuestions]      = useState<Question[]>([]);
  const [qLoading,       setQLoading]       = useState(false);
  const [coverFile,      setCoverFile]      = useState<File | null>(null);
  const [coverPreview,   setCoverPreview]   = useState<string | null>(null);
  const [uploading,      setUploading]      = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [saveSuccess,    setSaveSuccess]    = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [showClaim,    setShowClaim]    = useState(false);
  const [claimSearch,  setClaimSearch]  = useState('');
  const [claimResults, setClaimResults] = useState<ClaimableBook[]>([]);
  const [claimBusy,    setClaimBusy]    = useState(false);
  const [claiming,     setClaiming]     = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);

  const [bulletinBook,       setBulletinBook]       = useState<BookListing | null>(null);
  const [bulletinSubmitting, setBulletinSubmitting] = useState(false);

  // ── Init ─────────────────────────────────────────────────────────────────

  useEffect(() => { boot(); }, []);

  async function boot() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigateTo('/'); return; }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'author' && profile?.role !== 'admin') {
      navigateTo('/');
      return;
    }

    setUserId(user.id);

    await Promise.all([
      loadBooks(user.id),
      loadAMA(user.id),
      loadBounties(user.id),
      loadCompetitions(user.id),
      loadAmbassador(user.id),
    ]);

    setLoading(false);
  }

  // ── Data loaders ─────────────────────────────────────────────────────────

  async function loadBooks(uid: string) {
    const { data } = await supabase
      .from('books')
      .select('id,title,author,cover_url,page_count,book_type,description,total_completions,pass_count,total_paid_out')
      .eq('author_id', uid)
      .order('created_at', { ascending: false });
    const list = data || [];
    setBooks(list);
    setTotalReaders(list.reduce((s, b) => s + (b.total_completions || 0), 0));
    setTotalPaid(list.reduce((s, b) => s + (b.total_paid_out || 0), 0));
  }

  async function loadAMA(uid: string) {
    const { data } = await supabase
      .from('ama_sessions')
      .select('id,title,status,ama_start_date,questions_close_at,books(title)')
      .eq('author_id', uid)
      .order('ama_start_date', { ascending: false });
    setAmaSessions(data || []);
  }

  async function loadBounties(uid: string) {
    const { data } = await supabase
      .from('bounties')
      .select('id,title,payout_per_reader,pool_amount,is_active,books(title)')
      .eq('author_id', uid)
      .order('created_at', { ascending: false });
    setBounties(data || []);
  }

  async function loadCompetitions(uid: string) {
    const { data } = await supabase
      .from('competitions')
      .select('id,title,format,start_date,end_date,book_title')
      .eq('author_id', uid)
      .order('start_date', { ascending: false });
    setCompetitions(data || []);
  }

  async function loadAmbassador(uid: string) {
    const { data: p } = await supabase
      .from('profiles')
      .select('author_referral_code')
      .eq('id', uid)
      .single();
    setAuthorProfile(p);

    const { data: pays } = await supabase
      .from('author_ambassador_payouts')
      .select('id,referred_id,listing_tier,listing_fee,payout_amount,status,created_at,paid_at,referred:profiles!referred_id(email)')
      .eq('referrer_id', uid)
      .order('created_at', { ascending: false });
    setAmbassadorPayouts((pays as any) || []);
  }

  // ── Bulletin ──────────────────────────────────────────────────────────────

  async function postToBulletin(book: BookListing) {
    setBulletinSubmitting(true);
    await supabase.from('books').update({ book_type: 'bulletin_board' }).eq('id', book.id);
    setBulletinBook(null);
    setBulletinSubmitting(false);
    if (userId) loadBooks(userId);
  }

  async function removeFromBulletin(book: BookListing) {
    await supabase.from('books').update({ book_type: 'standard' }).eq('id', book.id);
    if (userId) loadBooks(userId);
  }

  // ── Edit modal ────────────────────────────────────────────────────────────

  function openEdit(book: BookListing) {
    setEditingBook(book);
    setEditTab('details');
    setEditForm({ title: book.title, author: book.author, description: book.description || '', page_count: book.page_count });
    setCoverFile(null);
    setCoverPreview(null);
    setSaveSuccess(false);
    loadQuestions(book.id);
  }

  function closeEdit() {
    setEditingBook(null);
    setQuestions([]);
    setCoverFile(null);
    setCoverPreview(null);
  }

  async function loadQuestions(bookId: string) {
    setQLoading(true);
    const { data } = await supabase.from('questions').select('*').eq('book_id', bookId).order('created_at', { ascending: true });
    setQuestions(data || []);
    setQLoading(false);
  }

  function onCoverSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  async function uploadCover(bookId: string): Promise<string | null> {
    if (!coverFile) return null;
    setUploading(true);
    const ext = coverFile.name.split('.').pop();
    const path = `covers/${bookId}.${ext}`;
    const { error } = await supabase.storage.from('book-covers').upload(path, coverFile, { upsert: true });
    setUploading(false);
    if (error) return null;
    const { data } = supabase.storage.from('book-covers').getPublicUrl(path);
    return data.publicUrl;
  }

  async function saveDetails() {
    if (!editingBook) return;
    setSaving(true);
    let cover_url = editingBook.cover_url;
    if (coverFile) {
      const up = await uploadCover(editingBook.id);
      if (up) cover_url = up;
    }
    await supabase.from('books').update({
      title: editForm.title,
      author: editForm.author,
      description: editForm.description,
      page_count: editForm.page_count,
      cover_url,
    }).eq('id', editingBook.id);
    setSaving(false);
    setSaveSuccess(true);
    if (userId) loadBooks(userId);
    setTimeout(() => setSaveSuccess(false), 3000);
  }

  function updateQ(i: number, field: keyof Question, val: string) {
    setQuestions((prev) => prev.map((q, idx) => idx === i ? { ...q, [field]: val } : q));
  }

  async function saveQuestions() {
    if (!editingBook) return;
    setSaving(true);
    await supabase.from('questions').upsert(
      questions.map((q) => ({ ...q, book_id: editingBook.id })),
      { onConflict: 'id' }
    );
    setSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  }

  // ── Claim modal ───────────────────────────────────────────────────────────

  async function searchBooks() {
    setClaimBusy(true);
    const { data } = await supabase
      .from('books')
      .select('id,title,author,cover_url,page_count')
      .is('author_id', null)
      .ilike('title', `%${claimSearch}%`)
      .limit(10);
    setClaimResults(data || []);
    setClaimBusy(false);
  }

  async function claimBook(book: ClaimableBook) {
    if (!userId) return;
    setClaiming(book.id);
    await supabase.from('books').update({ author_id: userId }).eq('id', book.id);
    setClaimSuccess(book.title);
    setClaimResults((prev) => prev.filter((b) => b.id !== book.id));
    setClaiming(null);
    loadBooks(userId);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function statusBadge(status: AMASessionRow['status']) {
    const styles = {
      open:      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      answering: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      closed:    'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
    };
    const labels = { open: 'Taking Questions', answering: 'Live', closed: 'Closed' };
    return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status]}`}>{labels[status]}</span>;
  }

  function fmt(d: string) {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center`}>
        <div className="w-8 h-8 border-2 border-[#D4A843] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Tabs config ───────────────────────────────────────────────────────────

  const tabs: { key: DashTab; label: string; icon: any }[] = [
    { key: 'books',        label: 'My Books',     icon: BookOpen     },
    { key: 'ama',          label: 'AMAs',          icon: MessageSquare },
    { key: 'bounties',     label: 'Bounties',      icon: DollarSign   },
    { key: 'competitions', label: 'Competitions',  icon: Trophy       },
    { key: 'ambassador',   label: 'Ambassador',    icon: Star         },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={`min-h-screen ${bg}`}>

      {/* ── Header ── */}
      <div className={`border-b ${divider} px-4 py-4 mb-8`}>
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={() => navigateTo('/')} className={`${subColor} hover:text-[#D4A843] transition-colors`}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className={`font-serif text-3xl ${textPrimary}`}>Author Dashboard</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-16">

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Books Listed',   value: books.length,              icon: BookOpen  },
            { label: 'Total Readers',  value: totalReaders,              icon: Users     },
            { label: 'Total Paid Out', value: `$${totalPaid.toFixed(2)}`, icon: DollarSign },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className={`rounded-2xl border ${cardBg} p-4 flex items-center gap-3`}>
              <div className="w-9 h-9 rounded-full bg-[#D4A843]/10 flex items-center justify-center">
                <Icon size={16} className="text-[#D4A843]" />
              </div>
              <div>
                <p className={`text-xs ${textMuted}`}>{label}</p>
                <p className={`font-bold text-lg ${textPrimary}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Tab bar ── */}
        <div className="flex gap-1 p-1 rounded-xl bg-[#e8e0d5]/50 dark:bg-[#1B2A4A]/40 mb-6">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setDashTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                dashTab === key
                  ? 'bg-white dark:bg-[#1B2A4A] text-[#1B2A4A] dark:text-[#F5F0E8] shadow-sm'
                  : `${textMuted} hover:text-[#1B2A4A] dark:hover:text-[#F5F0E8]`
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            BOOKS TAB
        ══════════════════════════════════════════════════════════════════ */}
        {dashTab === 'books' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`font-semibold ${textPrimary}`}>My Books</h2>
              <button
                onClick={() => setShowClaim(true)}
                className="px-3 py-1.5 text-xs font-medium border border-[#D4A843] text-[#D4A843] rounded-lg hover:bg-[#D4A843]/10 transition"
              >
                + Claim a Book
              </button>
            </div>

            {books.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen size={36} className="mx-auto text-[#D4A843]/30 mb-3" />
                <p className={`text-sm ${textMuted}`}>No books listed yet. Claim a book to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {books.map((book) => (
                  <div key={book.id} className={`rounded-2xl border ${cardBg} p-4 flex gap-4`}>
                    <div className="w-14 h-20 rounded-lg overflow-hidden bg-[#D4A843]/10 shrink-0">
                      {book.cover_url
                        ? <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><BookOpen size={20} className="text-[#D4A843]/40" /></div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div>
                          <h3 className={`font-semibold text-sm ${textPrimary} truncate`}>{book.title}</h3>
                          <p className={`text-xs ${textMuted}`}>{book.author}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                          book.book_type === 'bulletin_board'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {book.book_type === 'bulletin_board' ? 'Bulletin Board' : 'Standard'}
                        </span>
                      </div>
                      <div className={`flex gap-4 text-xs ${textMuted} mb-3`}>
                        <span>{book.page_count} pages</span>
                        <span>{book.total_completions || 0} readers</span>
                        <span>{book.pass_count || 0} passes</span>
                        <span>${(book.total_paid_out || 0).toFixed(2)} paid</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(book)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs border border-[#D4A843]/40 text-[#D4A843] rounded-lg hover:bg-[#D4A843]/10 transition"
                        >
                          <Edit2 size={11} /> Edit
                        </button>
                        {book.book_type === 'bulletin_board' ? (
                          <button
                            onClick={() => removeFromBulletin(book)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs border border-gray-300 dark:border-gray-600 text-gray-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                          >
                            <PinOff size={11} /> Remove from Bulletin
                          </button>
                        ) : (
                          <button
                            onClick={() => setBulletinBook(book)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs border border-gray-300 dark:border-gray-600 text-gray-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                          >
                            <Pin size={11} /> Post to Bulletin
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            AMA TAB
        ══════════════════════════════════════════════════════════════════ */}
        {dashTab === 'ama' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`font-semibold ${textPrimary}`}>My AMAs</h2>
              <p className={`text-xs ${textMuted}`}>New sessions are created by the admin team.</p>
            </div>
            {amaSessions.length === 0 ? (
              <div className="text-center py-16">
                <MessageSquare size={36} className="mx-auto text-[#D4A843]/30 mb-3" />
                <p className={`text-sm ${textMuted}`}>No AMA sessions yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {amaSessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => navigateTo(`ama/${s.id}`)}
                    className={`w-full text-left rounded-2xl border ${cardBg} p-4 hover:border-[#D4A843]/60 transition`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <h3 className={`font-semibold text-sm ${textPrimary}`}>{s.title}</h3>
                      {statusBadge(s.status)}
                    </div>
                    {s.books && <p className="text-xs text-[#D4A843] mb-1">{s.books.title}</p>}
                    <p className={`text-xs ${textMuted}`}>AMA: {fmt(s.ama_start_date)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            BOUNTIES TAB
        ══════════════════════════════════════════════════════════════════ */}
        {dashTab === 'bounties' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`font-semibold ${textPrimary}`}>My Bounties</h2>
              <p className={`text-xs ${textMuted}`}>Managed by the admin team.</p>
            </div>
            {bounties.length === 0 ? (
              <div className="text-center py-16">
                <DollarSign size={36} className="mx-auto text-[#D4A843]/30 mb-3" />
                <p className={`text-sm ${textMuted}`}>No bounties set up yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bounties.map((b) => (
                  <div key={b.id} className={`rounded-2xl border ${cardBg} p-4`}>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={`font-semibold text-sm ${textPrimary}`}>{b.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        b.is_active
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {b.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {b.books && <p className="text-xs text-[#D4A843] mb-2">{b.books.title}</p>}
                    <div className={`flex gap-4 text-xs ${textMuted}`}>
                      <span>${b.payout_per_reader.toFixed(2)} per reader</span>
                      <span>${b.pool_amount.toFixed(2)} pool</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            COMPETITIONS TAB
        ══════════════════════════════════════════════════════════════════ */}
        {dashTab === 'competitions' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`font-semibold ${textPrimary}`}>My Competitions</h2>
              <p className={`text-xs ${textMuted}`}>Managed by the admin team.</p>
            </div>
            {competitions.length === 0 ? (
              <div className="text-center py-16">
                <Trophy size={36} className="mx-auto text-[#D4A843]/30 mb-3" />
                <p className={`text-sm ${textMuted}`}>No competitions yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {competitions.map((c) => (
                  <div key={c.id} className={`rounded-2xl border ${cardBg} p-4`}>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={`font-semibold text-sm ${textPrimary}`}>{c.title}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#D4A843]/10 text-[#D4A843]">{c.format}</span>
                    </div>
                    <p className="text-xs text-[#D4A843] mb-2">{c.book_title}</p>
                    <p className={`text-xs ${textMuted}`}>
                      {new Date(c.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
                      {fmt(c.end_date)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            AMBASSADOR TAB
        ══════════════════════════════════════════════════════════════════ */}
        {dashTab === 'ambassador' && (
          <div>
            <div className="mb-6">
              <h2 className={`font-semibold ${textPrimary} mb-1`}>Author Ambassador Program</h2>
              <p className={`text-sm ${textMuted}`}>
                Refer another author. When they buy their first listing, you earn 25% of the listing fee — automatically credited to your payout balance.
              </p>
            </div>

            {/* Tier table */}
            <div className={`rounded-2xl border ${cardBg} p-4 mb-6`}>
              <p className={`text-xs font-semibold ${textMuted} uppercase tracking-wide mb-3`}>Listing Tiers & Your Cut</p>
              <div className="grid grid-cols-5 gap-2">
                {(Object.entries(LISTING_TIERS) as [ListingTier, typeof LISTING_TIERS[ListingTier]][]).map(([key, tier]) => (
                  <div key={key} className="text-center">
                    <p className={`text-xs font-semibold ${textPrimary}`}>{tier.label}</p>
                    <p className={`text-xs ${textMuted}`}>{tier.books} {tier.books === 1 ? 'book' : 'books'}</p>
                    <p className="text-xs text-[#D4A843] font-bold mt-1">+${(tier.fee * AMBASSADOR_PCT).toFixed(2)}</p>
                    <p className={`text-xs ${textMuted}`}>(${tier.fee} fee)</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Referral code */}
            <div className={`rounded-2xl border ${cardBg} p-5 mb-6`}>
              <p className={`text-xs font-semibold ${textMuted} uppercase tracking-wide mb-3`}>Your Referral Code</p>
              {authorProfile?.author_referral_code ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className={`flex-1 px-4 py-2.5 rounded-xl font-mono text-lg font-bold tracking-widest text-[#D4A843] ${isDark ? 'bg-[#D4A843]/10' : 'bg-[#D4A843]/5'} border border-[#D4A843]/30`}>
                      {authorProfile.author_referral_code}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(authorProfile.author_referral_code!);
                        setCodeCopied(true);
                        setTimeout(() => setCodeCopied(false), 2000);
                      }}
                      className="px-3 py-2.5 rounded-xl border border-[#D4A843]/40 text-[#D4A843] hover:bg-[#D4A843]/10 transition text-xs font-medium flex items-center gap-1.5"
                    >
                      {codeCopied ? <><Check size={12} /> Copied!</> : 'Copy Code'}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`flex-1 px-3 py-2 rounded-xl text-xs ${textMuted} truncate ${isDark ? 'bg-[#1B2A4A]/60' : 'bg-gray-50'} border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                      {window.location.origin}/signup?author_ref={authorProfile.author_referral_code}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/signup?author_ref=${authorProfile.author_referral_code}`);
                        setLinkCopied(true);
                        setTimeout(() => setLinkCopied(false), 2000);
                      }}
                      className="px-3 py-2 rounded-xl border border-[#D4A843]/40 text-[#D4A843] hover:bg-[#D4A843]/10 transition text-xs font-medium flex items-center gap-1.5 shrink-0"
                    >
                      {linkCopied ? <><Check size={12} /> Copied!</> : 'Copy Link'}
                    </button>
                  </div>
                  <p className={`text-xs ${textMuted}`}>
                    Share your code or link. When a referred author buys their first listing, your cut is credited automatically.
                  </p>
                </div>
              ) : (
                <p className={`text-sm ${textMuted}`}>No referral code assigned yet. Contact support to get yours.</p>
              )}
            </div>

            {/* Earnings summary */}
            {ambassadorPayouts.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { label: 'Total Referred', value: ambassadorPayouts.length },
                  {
                    label: 'Pending',
                    value: `$${ambassadorPayouts.filter((p) => p.status === 'pending').reduce((s, p) => s + p.payout_amount, 0).toFixed(2)}`,
                  },
                  {
                    label: 'Paid Out',
                    value: `$${ambassadorPayouts.filter((p) => p.status === 'paid').reduce((s, p) => s + p.payout_amount, 0).toFixed(2)}`,
                  },
                ].map(({ label, value }) => (
                  <div key={label} className={`rounded-xl border ${cardBg} p-3 text-center`}>
                    <p className={`text-xs ${textMuted} mb-1`}>{label}</p>
                    <p className={`font-bold ${textPrimary}`}>{value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Referral history */}
            <div>
              <p className={`text-xs font-semibold ${textMuted} uppercase tracking-wide mb-3`}>Referral History</p>
              {ambassadorPayouts.length === 0 ? (
                <div className="text-center py-12">
                  <Star size={36} className="mx-auto text-[#D4A843]/30 mb-3" />
                  <p className={`text-sm ${textMuted}`}>No referrals yet. Share your code to start earning.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {ambassadorPayouts.map((p) => (
                    <div key={p.id} className={`rounded-xl border ${cardBg} p-4 flex items-center justify-between gap-3`}>
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${textPrimary} truncate`}>{p.referred?.email ?? 'Author'}</p>
                        <div className={`flex gap-3 text-xs ${textMuted} mt-0.5`}>
                          {p.listing_tier && <span>{LISTING_TIERS[p.listing_tier]?.label} listing</span>}
                          <span>${p.listing_fee.toFixed(2)} fee</span>
                          <span>{fmt(p.created_at)}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-[#D4A843]">+${p.payout_amount.toFixed(2)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          p.status === 'paid'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}>
                          {p.status === 'paid' ? 'Paid' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ══════════════════════════════════════════════════════════════════
          EDIT MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {editingBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className={`w-full max-w-lg rounded-2xl border ${cardBg} overflow-hidden`}>
            <div className={`flex items-center justify-between px-5 py-4 border-b ${divider}`}>
              <h2 className={`font-semibold ${textPrimary}`}>Edit Book</h2>
              <button onClick={closeEdit} className={`${textMuted} hover:text-[#D4A843]`}><X size={18} /></button>
            </div>
            <div className={`flex border-b ${divider}`}>
              {(['details', 'quiz'] as EditTab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setEditTab(t)}
                  className={`flex-1 py-2.5 text-sm font-medium transition ${
                    editTab === t ? 'border-b-2 border-[#D4A843] text-[#D4A843]' : textMuted
                  }`}
                >
                  {t === 'details' ? 'Details' : 'Quiz Questions'}
                </button>
              ))}
            </div>
            <div className="p-5 max-h-[60vh] overflow-y-auto">
              {editTab === 'details' ? (
                <div className="space-y-4">
                  <div>
                    <label className={`block text-xs font-medium ${textMuted} mb-1`}>Cover Image</label>
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-22 rounded-lg overflow-hidden bg-[#D4A843]/10">
                        {(coverPreview || editingBook.cover_url)
                          ? <img src={coverPreview || editingBook.cover_url!} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><BookOpen size={20} className="text-[#D4A843]/40" /></div>
                        }
                      </div>
                      <button
                        onClick={() => fileRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[#D4A843]/40 text-[#D4A843] rounded-lg hover:bg-[#D4A843]/10 transition"
                      >
                        <Upload size={12} /> {uploading ? 'Uploading...' : 'Upload'}
                      </button>
                      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onCoverSelect} />
                    </div>
                  </div>
                  {([
                    { label: 'Title',      key: 'title',      type: 'text'   },
                    { label: 'Author',     key: 'author',     type: 'text'   },
                    { label: 'Page Count', key: 'page_count', type: 'number' },
                  ] as const).map(({ label, key, type }) => (
                    <div key={key}>
                      <label className={`block text-xs font-medium ${textMuted} mb-1`}>{label}</label>
                      <input
                        type={type}
                        value={(editForm as any)[key]}
                        onChange={(e) => setEditForm((f) => ({ ...f, [key]: type === 'number' ? +e.target.value : e.target.value }))}
                        className={inputCls}
                      />
                    </div>
                  ))}
                  <div>
                    <label className={`block text-xs font-medium ${textMuted} mb-1`}>Description</label>
                    <textarea
                      rows={3}
                      value={editForm.description}
                      onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                      className={`${inputCls} resize-none`}
                    />
                  </div>
                  <button
                    onClick={saveDetails}
                    disabled={saving}
                    className="w-full py-2 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-sm font-semibold hover:bg-[#c49a3a] disabled:opacity-50 transition flex items-center justify-center gap-2"
                  >
                    {saving ? 'Saving...' : saveSuccess ? <><Check size={14} /> Saved!</> : 'Save Details'}
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  {qLoading ? (
                    <p className={`text-sm ${textMuted}`}>Loading questions...</p>
                  ) : questions.length === 0 ? (
                    <p className={`text-sm ${textMuted}`}>No questions found for this book.</p>
                  ) : (
                    questions.map((q, i) => (
                      <div key={q.id} className={`rounded-xl border ${isDark ? 'border-gray-700' : 'border-gray-200'} p-4`}>
                        <p className={`text-xs font-medium ${textMuted} mb-2`}>Question {i + 1}</p>
                        <input className={`${inputCls} mb-2`} placeholder="Question" value={q.question_text} onChange={(e) => updateQ(i, 'question_text', e.target.value)} />
                        <input className={`${inputCls} mb-2 border-green-400/50`} placeholder="Correct answer" value={q.correct_answer} onChange={(e) => updateQ(i, 'correct_answer', e.target.value)} />
                        {(['wrong_answer_1', 'wrong_answer_2', 'wrong_answer_3'] as const).map((field, wi) => (
                          <input key={field} className={`${inputCls} mb-2`} placeholder={`Wrong answer ${wi + 1}`} value={q[field]} onChange={(e) => updateQ(i, field, e.target.value)} />
                        ))}
                      </div>
                    ))
                  )}
                  {questions.length > 0 && (
                    <button
                      onClick={saveQuestions}
                      disabled={saving}
                      className="w-full py-2 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-sm font-semibold hover:bg-[#c49a3a] disabled:opacity-50 transition flex items-center justify-center gap-2"
                    >
                      {saving ? 'Saving...' : saveSuccess ? <><Check size={14} /> Saved!</> : 'Save Questions'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          BULLETIN CONFIRM MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {bulletinBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className={`w-full max-w-sm rounded-2xl border ${cardBg} p-6`}>
            <h3 className={`font-semibold ${textPrimary} mb-2`}>Post to Bulletin Board?</h3>
            <p className={`text-sm ${textMuted} mb-5`}>
              <span className="font-medium text-[#D4A843]">{bulletinBook.title}</span> will be listed on the public Bulletin Board. You can remove it at any time.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setBulletinBook(null)}
                className={`flex-1 py-2 rounded-lg text-sm border ${isDark ? 'border-gray-600 text-gray-400' : 'border-gray-300 text-gray-500'} hover:bg-gray-100 dark:hover:bg-gray-700 transition`}
              >
                Cancel
              </button>
              <button
                onClick={() => postToBulletin(bulletinBook)}
                disabled={bulletinSubmitting}
                className="flex-1 py-2 rounded-lg text-sm bg-[#D4A843] text-[#1B2A4A] font-semibold hover:bg-[#c49a3a] disabled:opacity-50 transition"
              >
                {bulletinSubmitting ? 'Posting...' : 'Post It'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          CLAIM MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {showClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className={`w-full max-w-md rounded-2xl border ${cardBg} overflow-hidden`}>
            <div className={`flex items-center justify-between px-5 py-4 border-b ${divider}`}>
              <h2 className={`font-semibold ${textPrimary}`}>Claim a Book</h2>
              <button
                onClick={() => { setShowClaim(false); setClaimResults([]); setClaimSearch(''); setClaimSuccess(null); }}
                className={`${textMuted} hover:text-[#D4A843]`}
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5">
              {claimSuccess && (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm mb-4">
                  <Check size={14} /> "{claimSuccess}" claimed successfully.
                </div>
              )}
              <div className="flex gap-2 mb-4">
                <input
                  className={`${inputCls} flex-1`}
                  placeholder="Search by title..."
                  value={claimSearch}
                  onChange={(e) => setClaimSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchBooks()}
                />
                <button
                  onClick={searchBooks}
                  disabled={claimBusy}
                  className="px-3 py-2 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-sm font-semibold hover:bg-[#c49a3a] disabled:opacity-50 transition"
                >
                  <Search size={14} />
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {claimResults.length === 0 && !claimBusy && (
                  <p className={`text-sm ${textMuted} text-center py-4`}>Search for a book to claim it.</p>
                )}
                {claimResults.map((book) => (
                  <div key={book.id} className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div>
                      <p className={`text-sm font-medium ${textPrimary}`}>{book.title}</p>
                      <p className={`text-xs ${textMuted}`}>{book.author} · {book.page_count} pages</p>
                    </div>
                    <button
                      onClick={() => claimBook(book)}
                      disabled={claiming === book.id}
                      className="px-3 py-1 text-xs bg-[#D4A843] text-[#1B2A4A] rounded-lg font-semibold hover:bg-[#c49a3a] disabled:opacity-50 transition"
                    >
                      {claiming === book.id ? 'Claiming...' : 'Claim'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
