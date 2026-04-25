import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, X } from 'lucide-react';

interface Book {
  id: string;
  title: string;
  author: string;
  book_type: string;
}

interface Competition {
  id: string;
  format: string;
  title: string;
  book_title: string | null;
  book_author: string | null;
  entry_fee: number;
  prize_pool: number;
  is_sponsored: boolean;
  starts_at: string | null;
  ends_at: string | null;
  status: 'upcoming' | 'active' | 'completed' | 'canceled';
  created_at: string;
}

interface NewCompetition {
  format: string;
  title: string;
  book_id: string;
  starts_at: string;
  ends_at: string;
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
  format: 'sprint',
  title: '',
  book_id: '',
  starts_at: '',
  ends_at: '',
  entry_fee: '',
  prize_pool: '',
  is_sponsored: false,
};

export function AdminCompetitions() {
  const [books, setBooks] = useState<Book[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [newComp, setNewComp] = useState<NewCompetition>(emptyComp);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-[#e8e0d5] dark:border-gray-700 bg-white dark:bg-gray-800 text-[#1B2A4A] dark:text-[#F5F0E8] text-sm focus:outline-none focus:ring-2';
  const selectClass = inputClass;

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [{ data: booksData }, { data: compsData }] = await Promise.all([
      supabase.from('books').select('id, title, author, book_type').order('title'),
      supabase.from('competitions').select('*').order('created_at', { ascending: false }),
    ]);
    setBooks(booksData || []);
    setCompetitions(compsData || []);
  }

  async function handleSave() {
    if (!newComp.title || !newComp.starts_at || !newComp.ends_at || !newComp.entry_fee) {
      setError('Title, dates, and entry fee are required.');
      return;
    }
    setSaving(true);
    setError('');

    // Look up book title/author to store flat (what the page reads)
    const selectedBook = books.find((b) => b.id === newComp.book_id);

    const { error: err } = await supabase.from('competitions').insert({
      format: newComp.format,
      title: newComp.title,
      book_title: selectedBook?.title ?? null,
      book_author: selectedBook?.author ?? null,
      entry_fee: parseFloat(newComp.entry_fee),
      prize_pool: parseFloat(newComp.prize_pool) || 0,
      is_sponsored: newComp.is_sponsored,
      starts_at: newComp.starts_at,
      ends_at: newComp.ends_at,
      status: 'upcoming',
      pre_registration_count: 0,
    });

    if (err) { setError('Failed to save: ' + err.message); setSaving(false); return; }
    setSuccess('Competition created!');
    setNewComp(emptyComp);
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

  async function handleDelete(id: string) {
    if (!confirm('Delete this competition?')) return;
    await supabase.from('competitions').delete().eq('id', id);
    loadData();
  }

  const statusColor = (status: Competition['status']) => {
    if (status === 'active') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (status === 'upcoming') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    if (status === 'canceled') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400';
  };

  const standardBooks = books.filter((b) => b.book_type !== 'bulletin_board');

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
          Competitions ({competitions.filter((c) => c.status === 'active').length} active)
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
            <button onClick={() => { setShowForm(false); setNewComp(emptyComp); }} className="text-[#6B7280]">
              <X size={18} />
            </button>
          </div>

          {/* Format */}
          <div>
            <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Format</label>
            <select
              className={selectClass}
              value={newComp.format}
              onChange={(e) => setNewComp({ ...newComp, format: e.target.value })}
            >
              {COMPETITION_FORMATS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Title</label>
            <input
              className={inputClass}
              placeholder="e.g. Summer Sprint — The Midnight Library"
              value={newComp.title}
              onChange={(e) => setNewComp({ ...newComp, title: e.target.value })}
            />
          </div>

          {/* Book (optional for Read-A-Thon) */}
          <div>
            <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">
              Book {newComp.format === 'readathon' ? '(optional for Read-A-Thon)' : ''}
            </label>
            <select
              className={selectClass}
              value={newComp.book_id}
              onChange={(e) => setNewComp({ ...newComp, book_id: e.target.value })}
            >
              <option value="">Select a book...</option>
              {standardBooks.map((b) => (
                <option key={b.id} value={b.id}>{b.title} — {b.author}</option>
              ))}
            </select>
          </div>

          {/* Entry fee + Prize pool */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Entry Fee ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                placeholder="e.g. 5.00"
                value={newComp.entry_fee}
                onChange={(e) => setNewComp({ ...newComp, entry_fee: e.target.value })}
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
                onChange={(e) => setNewComp({ ...newComp, prize_pool: e.target.value })}
              />
            </div>
          </div>

          {/* Sponsored toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_sponsored"
              checked={newComp.is_sponsored}
              onChange={(e) => setNewComp({ ...newComp, is_sponsored: e.target.checked })}
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
                value={newComp.starts_at}
                onChange={(e) => setNewComp({ ...newComp, starts_at: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">End Date</label>
              <input
                type="date"
                className={inputClass}
                value={newComp.ends_at}
                onChange={(e) => setNewComp({ ...newComp, ends_at: e.target.value })}
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
              onClick={() => { setShowForm(false); setNewComp(emptyComp); }}
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
          {competitions.map((comp) => (
            <div key={comp.id} className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e0d5] dark:border-gray-700 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="font-medium text-[#1B2A4A] dark:text-[#F5F0E8]">{comp.title}</p>
                  <p className="text-xs text-[#6B7280] dark:text-gray-400 mt-0.5">
                    {comp.format}{comp.book_title ? ` · ${comp.book_title}` : ''}
                    {comp.is_sponsored ? ' · Sponsored' : ''}
                  </p>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm">
                    <span className="text-[#1B2A4A] dark:text-[#F5F0E8]">
                      Entry: <strong>${comp.entry_fee}</strong>
                    </span>
                    <span className="text-[#D4A843] font-medium">
                      Prize pool: ${comp.prize_pool}
                    </span>
                    {comp.starts_at && (
                      <span className="text-[#6B7280] dark:text-gray-400">
                        {new Date(comp.starts_at).toLocaleDateString()} –{' '}
                        {comp.ends_at ? new Date(comp.ends_at).toLocaleDateString() : 'TBD'}
                      </span>
                    )}
                  </div>
                </div>
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
