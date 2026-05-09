import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, X, Search, Trophy, Calendar, DollarSign, BookOpen, Trash2, CheckCircle, AlertCircle } from 'lucide-react';

// --- Interfaces ---
interface Book {
  id: string;
  title: string;
  author: string;
  book_type: string;
}

interface Competition {
  id: string;
  type: string; // Using 'type' exclusively now
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

// --- Constants ---
const COMP_TYPES = [
  { value: 'sprint', label: 'Writing Sprint' },
  { value: 'readathon', label: 'Read-A-Thon' },
  { value: 'elimination', label: 'Elimination Bracket' },
];

const INITIAL_STATE: NewCompetition = {
  type: 'elimination', // Defaulting to elimination per your request
  title: '',
  book_id: '',
  book_ids: [],
  start_date: '',
  end_date: '',
  entry_fee: '',
  prize_pool: '',
  is_sponsored: false,
};

// --- Components ---

const BookPicker = ({
  books,
  selected,
  onSelect,
  onRemove,
  max = 1,
}: {
  books: Book[];
  selected: Book[];
  onSelect: (book: Book) => void;
  onRemove: (id: string) => void;
  max?: number;
}) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = books.filter(b => 
    !selected.find(s => s.id === b.id) &&
    (b.title.toLowerCase().includes(query.toLowerCase()) || b.author.toLowerCase().includes(query.toLowerCase()))
  ).slice(0, 8);

  useEffect(() => {
    const clickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <div className="flex flex-wrap gap-2 mb-2">
        {selected.map(b => (
          <div key={b.id} className="flex items-center gap-2 px-3 py-1 bg-[#D4A843]/10 border border-[#D4A843]/30 text-[#D4A843] rounded-full text-xs font-semibold">
            {b.title}
            <button onClick={() => onRemove(b.id)} className="hover:text-red-500"><X size={12} /></button>
          </div>
        ))}
      </div>

      {selected.length < max && (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#e8e0d5] dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-[#D4A843] outline-none transition-all"
            placeholder={max > 1 ? `Select up to ${max} books...` : "Search by title or author..."}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
          />
          {open && query && (
            <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-[#e8e0d5] dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden">
              {filtered.length > 0 ? filtered.map(b => (
                <button
                  key={b.id}
                  onClick={() => { onSelect(b); setQuery(''); setOpen(false); }}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-[#D4A843]/5 border-b border-gray-50 dark:border-gray-700 last:border-0"
                >
                  <p className="font-bold text-[#1B2A4A] dark:text-[#F5F0E8]">{b.title}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-tighter">{b.author}</p>
                </button>
              )) : (
                <div className="px-4 py-3 text-xs text-gray-400">No matching books found.</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export function AdminCompetitions() {
  const [books, setBooks] = useState<Book[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [newComp, setNewComp] = useState<NewCompetition>(INITIAL_STATE);
  const [selectedBooks, setSelectedBooks] = useState<Book[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const [{ data: bData }, { data: cData }] = await Promise.all([
      supabase.from('books').select('id, title, author, book_type').order('title'),
      supabase.from('competitions').select('*').order('created_at', { ascending: false }),
    ]);
    setBooks(bData || []);
    setCompetitions(cData || []);
  }

  const handleAddBook = (book: Book) => {
    const limit = newComp.type === 'elimination' ? 3 : 1;
    if (selectedBooks.length < limit) {
      setSelectedBooks([...selectedBooks, book]);
    }
  };

  const handleRemoveBook = (id: string) => {
    setSelectedBooks(selectedBooks.filter(b => b.id !== id));
  };

  async function handleSave() {
    if (!newComp.title || !newComp.start_date || (!newComp.is_sponsored && !newComp.entry_fee)) {
      return setError('Please fill in all required fields.');
    }
    
    if (newComp.type === 'elimination' && selectedBooks.length !== 3) {
      return setError('Elimination brackets require exactly 3 books.');
    }

    setLoading(true);
    setError('');

    try {
      // Get the primary author ID for the first book selected
      const { data: bookOwner } = await supabase
        .from('books')
        .select('user_id')
        .eq('id', selectedBooks[0]?.id)
        .single();

      // STRICTLY only sending the 'type' key. No 'format' present.
      const payload = {
        type: newComp.type,
        title: newComp.title,
        book_title: selectedBooks.map(b => b.title).join(', '),
        book_author: selectedBooks.map(b => b.author).join(', '),
        author_id: bookOwner?.user_id ?? null,
        entry_fee: newComp.is_sponsored ? 0 : parseFloat(newComp.entry_fee),
        prize_pool: parseFloat(newComp.prize_pool) || 0,
        is_sponsored: newComp.is_sponsored,
        start_date: newComp.start_date,
        end_date: newComp.end_date,
        status: 'upcoming' as const,
      };

      const { data: created, error: insertErr } = await supabase
        .from('competitions')
        .insert(payload)
        .select()
        .single();

      if (insertErr) throw insertErr;

      // Trigger notification RPC
      await supabase.rpc('notify_subscribers_new_earning', {
        p_type: 'competition',
        p_title: created.title,
        p_id: created.id,
      });

      setSuccess('Competition successfully launched!');
      setNewComp(INITIAL_STATE);
      setSelectedBooks([]);
      setShowForm(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // --- Actions ---
  async function updateStatus(id: string, status: Competition['status']) {
    await supabase.from('competitions').update({ status }).eq('id', id);
    fetchData();
  }

  async function processPayout(id: string) {
    if (!confirm('This will distribute prizes and close the competition. Proceed?')) return;
    const { error } = await supabase.rpc('close_competition_and_pay', { p_competition_id: id });
    if (error) setError(error.message);
    else { setSuccess('Payout processed successfully!'); fetchData(); }
  }

  async function deleteComp(id: string) {
    if (!confirm('Permanently delete this competition?')) return;
    await supabase.from('competitions').delete().eq('id', id);
    fetchData();
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6 bg-[#F5F0E8] dark:bg-gray-950 min-h-screen">
      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
          <AlertCircle size={18} /> {error}
          <button onClick={() => setError('')} className="ml-auto"><X size={16} /></button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-400 text-sm animate-in fade-in slide-in-from-top-2">
          <CheckCircle size={18} /> {success}
          <button onClick={() => setSuccess('')} className="ml-auto"><X size={16} /></button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8e0d5] dark:border-gray-800 pb-6">
        <div>
          <h1 className="text-3xl font-black text-[#1B2A4A] dark:text-[#F5F0E8] tracking-tight">COMPETITIONS</h1>
          <p className="text-[#6B7280] text-sm font-medium">Manage sprints, read-a-thons, and elimination brackets.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg ${
            showForm ? 'bg-gray-200 text-gray-700' : 'bg-[#D4A843] text-[#1B2A4A] hover:scale-105 active:scale-95'
          }`}
        >
          {showForm ? <X size={20} /> : <Plus size={20} />}
          {showForm ? 'Close Editor' : 'Create New'}
        </button>
      </div>

      {/* Main Creation Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-[#e8e0d5] dark:border-gray-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#D4A843] mb-2 block">Competition Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {COMP_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => { setNewComp({...newComp, type: t.value}); setSelectedBooks([]); }}
                      className={`py-3 px-2 rounded-xl text-xs font-bold border transition-all ${
                        newComp.type === t.value 
                        ? 'bg-[#1B2A4A] border-[#1B2A4A] text-white shadow-md' 
                        : 'border-[#e8e0d5] dark:border-gray-700 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Display Title</label>
                <input
                  className="w-full px-4 py-3 rounded-xl border border-[#e8e0d5] dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 outline-none focus:ring-2 focus:ring-[#D4A843]"
                  placeholder="e.g. Summer Slasher Showdown"
                  value={newComp.title}
                  onChange={e => setNewComp({...newComp, title: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Start Date</label>
                  <input type="date" className="w-full px-4 py-3 rounded-xl border border-[#e8e0d5] dark:border-gray-800" 
                    value={newComp.start_date} onChange={e => setNewComp({...newComp, start_date: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">End Date</label>
                  <input type="date" className="w-full px-4 py-3 rounded-xl border border-[#e8e0d5] dark:border-gray-800" 
                    value={newComp.end_date} onChange={e => setNewComp({...newComp, end_date: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#D4A843] mb-2 block">
                  Book Selection ({selectedBooks.length}/{newComp.type === 'elimination' ? 3 : 1})
                </label>
                <BookPicker
                  books={books}
                  selected={selectedBooks}
                  onSelect={handleAddBook}
                  onRemove={handleRemoveBook}
                  max={newComp.type === 'elimination' ? 3 : 1}
                />
              </div>

              <div className="p-4 bg-[#D4A843]/5 border border-[#D4A843]/20 rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="checkbox"
                    id="sponsored"
                    className="w-5 h-5 accent-[#D4A843] rounded"
                    checked={newComp.is_sponsored}
                    onChange={e => setNewComp({...newComp, is_sponsored: e.target.checked})}
                  />
                  <label htmlFor="sponsored" className="text-sm font-bold text-[#1B2A4A] dark:text-[#F5F0E8]">Author-Sponsored (Free Entry)</label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Entry Fee ($)</label>
                    <div className="relative">
                      <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="number"
                        disabled={newComp.is_sponsored}
                        className="w-full pl-8 pr-4 py-2 rounded-lg border border-[#e8e0d5] dark:border-gray-700 bg-white dark:bg-gray-800 disabled:opacity-50 text-sm font-bold"
                        value={newComp.is_sponsored ? '0.00' : newComp.entry_fee}
                        onChange={e => setNewComp({...newComp, entry_fee: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Prize Pool ($)</label>
                    <div className="relative">
                      <Trophy size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#D4A843]" />
                      <input
                        type="number"
                        className="w-full pl-8 pr-4 py-2 rounded-lg border border-[#e8e0d5] dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-bold"
                        value={newComp.prize_pool}
                        onChange={e => setNewComp({...newComp, prize_pool: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={loading}
                className="w-full py-4 bg-[#1B2A4A] text-white dark:bg-[#D4A843] dark:text-[#1B2A4A] rounded-xl font-black text-lg shadow-xl hover:opacity-90 disabled:opacity-50 transition-all active:scale-[0.98]"
              >
                {loading ? 'PUBLISHING...' : 'LAUNCH COMPETITION'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List / Feed */}
      <div className="grid grid-cols-1 gap-4">
        {competitions.map(comp => (
          <div key={comp.id} className="group bg-white dark:bg-gray-900 border border-[#e8e0d5] dark:border-gray-800 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-[#D4A843] transition-colors shadow-sm">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <span className={`text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded border ${
                  comp.type === 'elimination' ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-blue-50 text-blue-600 border-blue-200'
                }`}>
                  {comp.type}
                </span>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                  comp.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {comp.status}
                </span>
              </div>
              <h3 className="text-xl font-black text-[#1B2A4A] dark:text-[#F5F0E8]">{comp.title}</h3>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 font-medium">
                <span className="flex items-center gap-1.5"><BookOpen size={14} /> {comp.book_title || 'General Competition'}</span>
                <span className="flex items-center gap-1.5"><Calendar size={14} /> {new Date(comp.start_date!).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 md:gap-8 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
              <div className="text-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Prize</p>
                <p className="text-lg font-black text-[#D4A843]">${comp.prize_pool}</p>
              </div>
              <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />
              <div className="text-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Entry</p>
                <p className="text-lg font-black text-[#1B2A4A] dark:text-[#F5F0E8]">{comp.is_sponsored ? 'FREE' : `$${comp.entry_fee}`}</p>
              </div>
            </div>

            <div className="flex md:flex-col gap-2">
              {comp.status === 'upcoming' && (
                <button onClick={() => updateStatus(comp.id, 'active')} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Activate"><CheckCircle size={20}/></button>
              )}
              {comp.status === 'active' && (
                <button onClick={() => processPayout(comp.id)} className="p-2 text-[#D4A843] hover:bg-[#D4A843]/10 rounded-lg transition-colors" title="Payout"><Trophy size={20}/></button>
              )}
              <button onClick={() => deleteComp(comp.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors ml-auto md:ml-0" title="Delete"><Trash2 size={20}/></button>
            </div>
          </div>
        ))}

        {competitions.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-gray-900 border-2 border-dashed border-[#e8e0d5] dark:border-gray-800 rounded-3xl">
            <Trophy size={48} className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-400 font-bold">No competitions found. Start by creating your first one!</p>
          </div>
        )}
      </div>
    </div>
  );
}
