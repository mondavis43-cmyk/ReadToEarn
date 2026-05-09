import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, X, Search } from 'lucide-react';

interface Book {
  id: string;
  title: string;
  author: string;
  book_type: string;
}

interface Competition {
  id: string;
  type: string;
  title: string;
  book_title: string | null;
  book_author: string | null;
  author_id: string | null;
  entry_fee: number;
  prize_pool: number;
  is_sponsored: boolean;
  start_date: string | null;
  end_date: string | null;
  status: 'upcoming' | 'active' | 'completed' | 'canceled';
  created_at: string;
}

interface NewCompetition {
  type: string;
  title: string;
  book_id: string;
  book_ids: string[];
  start_date: string;
  end_date: string;
  entry_fee: string;
  prize_pool: string;
  is_sponsored: boolean;
}

const COMPETITION_FORMATS = [
  { value: 'sprint', label: 'Sprint' },
  { value: 'readathon', label: 'Read-A-Thon' },
  { value: 'elimination', label: 'Elimination Bracket' },
];

const emptyComp: NewCompetition = {
  type: 'sprint',
  title: '',
  book_id: '',
  book_ids: [],
  start_date: '',
  end_date: '',
  entry_fee: '',
  prize_pool: '',
  is_sponsored: false,
};

// ---- Searchable book picker ------------------------------------------------

const BookSearchInput = ({
  books,
  selected,
  onSelect,
  onRemove,
  multi = false,
  max = 1,
}: {
  books: Book[];
  selected: Book[];
  onSelect: (book: Book) => void;
  onRemove: (id: string) => void;
  multi?: boolean;
  max?: number;
}) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedIds = selected.map(b => b.id);

  const filtered = books.filter(b => {
    if (selectedIds.includes(b.id)) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q);
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (book: Book) => {
    onSelect(book);
    setQuery('');
    if (!multi) setOpen(false);
  };

  const atMax = selected.length >= max;

  const inputClass =
    'w-full px-3 py-2 pl-8 rounded-lg border border-[#e8e0d5] dark:border-gray-700 bg-white dark:bg-gray-800 text-[#1B2A4A] dark:text-[#F5F0E8] text-sm focus:outline-none focus:ring-2';

  return (
    <div ref={ref} className="relative">
      {/* Selected tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map(b => (
            <span
              key={b.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#D4A843]/20 text-[#D4A843] border border-[#D4A843]/30"
            >
              {b.title}
              <button onClick={() => onRemove(b.id)} className="hover:text-white transition-colors">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      {(!atMax || multi) && (
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B7280]" />
          <input
            className={inputClass}
            placeholder={
              atMax
                ? `Max ${max} book${max > 1 ? 's' : ''} selected`
                : multi
                ? `Search books... (${selected.length}/${max} selected)`
                : 'Search by title or author...'
            }
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            disabled={atMax && !multi}
          />
        </div>
      )}

      {/* Dropdown */}
      {open && !atMax && (
        <div className="absolute z-50 w-full mt-1 rounded-lg border border-[#e8e0d5] dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-2.5 text-sm text-[#6B7280] dark:text-gray-400">
                {query ? `No books found for "${query}" — not in our system yet.` : 'No more books to select.'}
              </div>
            ) : (
              filtered.slice(0, 50).map(b => (
                <button
                  key={b.id}
                  onMouseDown={() => handleSelect(b)}
                  className="w-full text-left px-3 py-2.5 text-sm border-b border-[#e8e0d5] dark:border-gray-700 last:border-b-0 text-[#1B2A4A] dark:text-[#F5F0E8] hover:bg-[#D4A843]/10 tr"
                >
                  <span className="font-medium">{b.title}</span>
                  <span className="ml-2 text-xs text-[#6B7280] dark:text-gray-400">— {b.author}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ---- Main component --------------------------------------------------------

export function AdminCompetitions() {
  const [books, setBooks] = useState<Book[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [newComp, setNewComp] = useState<NewCompetition>(emptyComp);
  const [sprintBook, setSprintBook] = useState<Book[]>([]);
  const [elimBooks, setElimBooks] = useState<Book[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-[#e8e0d5] dark:border-gray-700 bg-white dark:bg-gray-800 text-[#1B2A4A] dark:text-[#F5F0E8] text-sm focus:outline-none focus:ring-2';

  useEffect(() => { loadData(); }, []);

  // Reset book selections when format changes
  useEffect(() => {
    setSprintBook([]);
    setElimBooks([]);
  }, [newComp.type]);

  async function loadData() {
    const [{ data: booksData }, { data: compsData }] = await Promise.all([
      supabase.from('books').select('id, title, author, book_type').order('title'),
      supabase.from('competitions').select('*').order('created_at', { ascending: false }),
    ]);
    setBooks(booksData || []);
    setCompetitions(compsData || []);
  }

  async function handleSave() {
    // Logic: Entry fee is only required if NOT sponsored
    const feeRequired = !newComp.is_sponsored;
    
    if (!newComp.title || !newComp.start_date || !newComp.end_date || (feeRequired && !newComp.entry_fee)) {
      setError('Title, dates, and entry fee are required.');
      return;
    }
    if (newComp.type === 'sprint' && sprintBook.length === 0) {
      setError('Please select a book for Sprint.');
      return;
    }
    if (newComp.type === 'elimination' && elimBooks.length < 3) {
      setError('Please select exactly 3 books for Elimination.');
      return;
    }

    setSaving(true);
    setError('');

    let bookTitle: string | null = null;
    let bookAuthor: string | null = null;
    let authorId: string | null = null;

    if (newComp.type === 'sprint' && sprintBook[0]) {
      bookTitle = sprintBook[0].title;
      bookAuthor = sprintBook[0].author;
      const { data: bookRow } = await supabase
        .from('books')
        .select('user_id')
        .eq('id', sprintBook[0].id)
        .single();
      authorId = bookRow?.user_id ?? null;
    } else if (newComp.type === 'elimination') {
      bookTitle = elimBooks.map(b => b.title).join(', ');
      bookAuthor = elimBooks.map(b => b.author).join(', ');
      const { data: bookRow } = await supabase
        .from('books')
        .select('user_id')
        .eq('id', elimBooks[0].id)
        .single();
      authorId = bookRow?.user_id ?? null;
    }

    const { data: newCompRow, error: err } = await supabase.from('competitions').insert({
      type: newComp.type, // Changed from format to type to match DB column
      title: newComp.title,
      book_title: bookTitle,
      book_author: bookAuthor,
      author_id: authorId,
      entry_fee: newComp.is_sponsored ? 0 : parseFloat(newComp.entry_fee),
      prize_pool: parseFloat(newComp.prize_pool) || 0,
      is_sponsored: newComp.is_sponsored,
      start_date: newComp.start_date,
      end_date: newComp.end_date,
      status: 'upcoming',
      pre_registration_count: 0,
    }).select('id, title').single();

    if (err) { setError('Failed to save: ' + err.message); setSaving(false); return; }

    if (newCompRow) {
      await supabase.rpc('notify_subscribers_new_earning', {
        p_type: 'competition',
        p_title: newCompRow.title,
        p_id: newCompRow.id,
      });
    }

    setSuccess('Competition created!');
    setNewComp(emptyComp);
    setSprintBook([]);
    setElimBooks([]);
    setShowForm(false);
    setSaving(false);
    loadData();
  }

  async function handleUpdateStatus(
    id: string,
    status: 'upcoming' | 'active' | 'completed' | 'canceled'
  ) {
    await supabase.from('competitions').update({ status }).eq('id', id);
    loadData();
  }

  async function handleCloseAndPay(id: string) {
    if (!confirm('Close this competition and distribute prizes? This cannot be undone.')) return;

    const { data, error } = await supabase.rpc('close_competition_and_pay', {
      p_competition_id: id,
    });

    if (error) {
      setError('Payout failed: ' + error.message);
    } else if (data === 'already_completed') {
      setError('This competition has already been paid out.');
    } else {
      setSuccess('Competition closed and prizes distributed.');
      loadData();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this competition?')) return;
    await supabase.from('competitions').delete().eq('id', id);
    loadData();
  }

  const statusColor = (status: Competition['status']) => {
    if (status === 'active') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (status === 'upcoming') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    if (status === 'canceled') return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
    return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400';
  };

  const standardBooks = books.filter(b => b.book_type !== 'bulletin_board');

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-red-700 dark:text-red-400 text-sm flex items-center justify-between">
          {error}<button onClick={() => setError('')}><X size={14} /></button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3 text-green-700 dark:text-green-400 text-sm flex items-center justify-between">
          {success}<button onClick={() => setSuccess('')}><X size={14} /></button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-[#1B2A4A] dark:text-[#F5F0E8]">
          Competitions ({competitions.filter(c => c.status === 'active').length} active)
        </h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-3 py-2 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-sm font-medium hover:bg-[#c49a3a]"
          >
            <Plus size={16} /> New Competition
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e0d5] dark:border-gray-700 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[#1B2A4A] dark:text-[#F5F0E8]">Create Competition</h3>
            <button
              onClick={() => { setShowForm(false); setNewComp(emptyComp); setSprintBook([]); setElimBooks([]); }}
              className="text-[#6B7280]"
            >
              <X size={18} />
            </button>
          </div>

          {/* Format */}
          <div>
            <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Format</label>
            <select
              className={inputClass}
              value={newComp.type}
              onChange={e => setNewComp({ ...newComp, type: e.target.value })}
            >
              {COMPETITION_FORMATS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Title</label>
            <input
              className={inputClass}
              placeholder="e.g. Summer Sprint – The Midnight Library"
              value={newComp.title}
              onChange={e => setNewComp({ ...newComp, title: e.target.value })}
            />
          </div>

          {/* Book – Sprint: single searchable */}
          {newComp.type === 'sprint' && (
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">
                Book <span className="text-red-400">*</span>
              </label>
              <BookSearchInput
                books={standardBooks}
                selected={sprintBook}
                onSelect={b => setSprintBook([b])}
                onRemove={() => setSprintBook([])}
                multi={false}
                max={1}
              />
            </div>
          )}

          {/* Book – Read-A-Thon: untouched */}
          {newComp.type === 'readathon' && (
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">
                Book (optional for Read-A-Thon)
              </label>
              <select
                className={inputClass}
                value={newComp.book_id}
                onChange={e => setNewComp({ ...newComp, book_id: e.target.value })}
              >
                <option value="">Select a book...</option>
                {standardBooks.map(b => (
                  <option key={b.id} value={b.id}>{b.title} — {b.author}</option>
                ))}
              </select>
            </div>
          )}

          {/* Book – Elimination: multi searchable, exactly 3 */}
          {newComp.type === 'elimination' && (
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">
                Books <span className="text-red-400">*</span>
                <span className="ml-1 text-[#6B7280] dark:text-gray-400">({elimBooks.length}/3 selected)</span>
              </label>
              <BookSearchInput
                books={standardBooks}
                selected={elimBooks}
                onSelect={b => setElimBooks(prev => [...prev, b])}
                onRemove={id => setElimBooks(prev => prev.filter(b => b.id !== id))}
                multi={true}
                max={3}
              />
            </div>
          )}

          {/* Entry fee + Prize pool */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Entry Fee ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={`${inputClass} ${newComp.is_sponsored ? 'opacity-50 cursor-not-allowed' : ''}`}
                placeholder={newComp.is_sponsored ? 'Free' : 'e.g. 5.00'}
                value={newComp.is_sponsored ? '' : newComp.entry_fee}
                disabled={newComp.is_sponsored}
                onChange={e => setNewComp({ ...newComp, entry_fee: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Prize Pool ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                placeholder="e.g. 200.00"
                value={newComp.prize_pool}
                onChange={e => setNewComp({ ...newComp, prize_pool: e.target.value })}
              />
            </div>
          </div>

          {/* Sponsored toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_sponsored"
              checked={newComp.is_sponsored}
              onChange={e => {
                const checked = e.target.checked;
                setNewComp({ 
                  ...newComp, 
                  is_sponsored: checked,
                  entry_fee: checked ? '0' : newComp.entry_fee 
                });
              }}
              className="accent-[#D4A843] w-4 h-4"
            />
            <label htmlFor="is_sponsored" className="text-sm text-[#1B2A4A] dark:text-[#F5F0E8]">
              Author-sponsored (free to readers)
            </label>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Start Date</label>
              <input
                type="date"
                className={inputClass}
                value={newComp.start_date}
                onChange={e => setNewComp({ ...newComp, start_date: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">End Date</label>
              <input
                type="date"
                className={inputClass}
                value={newComp.end_date}
                onChange={e => setNewComp({ ...newComp, end_date: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-sm font-semibold hover:bg-[#c49a3a] disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Create Competition'}
            </button>
            <button
              onClick={() => { setShowForm(false); setNewComp(emptyComp); setSprintBook([]); setElimBooks([]); }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-[#6B7280] hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Competition list */}
      {competitions.length === 0 ? (
        <p className="text-sm text-[#6B7280] dark:text-gray-400">No competitions yet.</p>
      ) : (
        <div className="space-y-3">
          {competitions.map(comp => (
            <div key={comp.id} className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e0d5] dark:border-gray-700 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="font-medium text-[#1B2A4A] dark:text-[#F5F0E8]">{comp.title}</p>
                  <p className="text-xs text-[#6B7280] dark:text-gray-400 mt-0.5">
                    {comp.type}{comp.book_title ? ` · ${comp.book_title}` : ''}
                    {comp.is_sponsored ? ' · Sponsored' : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-4 mt-2 text-sm">
                  <span className="text-[#1B2A4A] dark:text-[#F5F0E8]">
                    Entry: <strong>${comp.entry_fee}</strong>
                  </span>
                  <span className="font-medium text-[#D4A843]">
                    Prize pool: ${comp.prize_pool}
                  </span>
                </div>
                {comp.start_date && (
                  <span className="text-[#6B7280] dark:text-gray-400 text-xs">
                    {new Date(comp.start_date).toLocaleDateString()} -{' '}
                    {comp.end_date ? new Date(comp.end_date).toLocaleDateString() : 'TBD'}
                  </span>
                )}
                <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${statusColor(comp.status)}`}>
                  {comp.status}
                </span>
              </div>

              <div className="flex gap-2 mt-3 flex-wrap">
                {comp.status === 'upcoming' && (
                  <button
                    onClick={() => handleUpdateStatus(comp.id, 'active')}
                    className="text-xs px-3 py-1.5 rounded-lg border border-green-400 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition"
                  >
                    Activate
                  </button>
                )}
                {comp.status === 'active' && (
                  <button
                    onClick={() => handleUpdateStatus(comp.id, 'completed')}
                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-[#6B7280] hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    Mark Completed
                  </button>
                )}
                {comp.status === 'active' && (
                  <button
                    onClick={() => handleCloseAndPay(comp.id)}
                    className="px-3 py-1 text-sm border border-yellow-500 text-yellow-500 rounded hover:bg-yellow-500/10"
                  >
                    Close & Pay Out
                  </button>
                )}
                {(comp.status === 'upcoming' || comp.status === 'active') && (
                  <button
                    onClick={() => handleUpdateStatus(comp.id, 'canceled')}
                    className="text-xs px-3 py-1.5 rounded-lg border border-red-300 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={() => handleDelete(comp.id)}
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
  );
}
