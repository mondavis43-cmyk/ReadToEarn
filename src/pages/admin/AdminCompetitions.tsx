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
  type: string;
  title: string;
  book_ids: string[];
  entry_fee: number;
  prize_pool: number;
  platform_cut: number;
  start_date: string | null;
  end_date: string | null;
  status: 'upcoming' | 'active' | 'completed';
  created_at: string;
}

interface NewCompetition {
  type: string;
  title: string;
  book_ids: string[];
  start_date: string;
  end_date: string;
  entry_fee: string;
  prize_pool: string;
}

const COMPETITION_TYPES = ['Sprint', 'Read-A-Thon', 'Elimination Bracket'];

const emptyCompetition: NewCompetition = {
  type: 'Sprint',
  title: '',
  book_ids: [],
  start_date: '',
  end_date: '',
  entry_fee: '',
  prize_pool: '',
};

export function AdminCompetitions() {
  const [books, setBooks] = useState<Book[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [newComp, setNewComp] = useState<NewCompetition>(emptyCompetition);
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

  function toggleBook(id: string) {
    setNewComp((prev) => ({
      ...prev,
      book_ids: prev.book_ids.includes(id)
        ? prev.book_ids.filter((b) => b !== id)
        : [...prev.book_ids, id],
    }));
  }

  async function handleSave() {
    if (!newComp.title || !newComp.start_date || !newComp.end_date || !newComp.entry_fee) {
      setError('Title, dates, and entry fee are required.');
      return;
    }
    if (
      (newComp.type === 'Sprint' || newComp.type === 'Elimination Bracket') &&
      newComp.book_ids.length === 0
    ) {
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
    setShowForm(false);
    setSaving(false);
    loadData();
  }

  async function handleUpdateStatus(id: string, status: 'upcoming' | 'active' | 'completed') {
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
    return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400';
  };

  const standardBooks = (books ?? []).filter((b) => b.book_type !== 'bulletin_board');

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
            <button onClick={() => { setShowForm(false); setNewComp(emptyCompetition); }} className="text-[#6B7280]">
              <X size={18} />
            </button>
          </div>

          {/* Type */}
          <div>
            <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Type</label>
            <select
              className={selectClass}
              value={newComp.type}
              onChange={(e) => setNewComp({ ...newComp, type: e.target.value, book_ids: [] })}
            >
              {COMPETITION_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
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

          {/* Books (not for Read-A-Thon) */}
          {newComp.type !== 'Read-A-Thon' && (
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Books</label>
              <div className="space-y-1 max-h-48 overflow-y-auto border border-[#e8e0d5] dark:border-gray-700 rounded-lg p-2">
                {standardBooks.map((b) => (
                  <label key={b.id} className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-[#f5f0e8] dark:hover:bg-gray-700">
                    <input
                      type="checkbox"
                      checked={newComp.book_ids.includes(b.id)}
                      onChange={() => toggleBook(b.id)}
                      className="accent-[#D4A843]"
                    />
                    <span className="text-sm text-[#1B2A4A] dark:text-[#F5F0E8]">
                      {b.title} <span className="text-[#6B7280]">— {b.author}</span>
                    </span>
                  </label>
                ))}
              </div>
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
              {newComp.prize_pool && (
                <p className="text-xs text-[#6B7280] dark:text-gray-400 mt-1">
                  Platform cut (25%): ${(parseFloat(newComp.prize_pool) * 0.25).toFixed(2)}
                </p>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Start Date</label>
              <input type="date" className={inputClass} value={newComp.start_date} onChange={(e) => setNewComp({ ...newComp, start_date: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">End Date</label>
              <input type="date" className={inputClass} value={newComp.end_date} onChange={(e) => setNewComp({ ...newComp, end_date: e.target.value })} />
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
              onClick={() => { setShowForm(false); setNewComp(emptyCompetition); }}
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
                  <p className="text-xs text-[#6B7280] dark:text-gray-400 mt-0.5">{comp.type}</p>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm">
                    <span className="text-[#1B2A4A] dark:text-[#F5F0E8]">
                      Entry: <strong>${comp.entry_fee}</strong>
                    </span>
                    <span className="text-[#D4A843] font-medium">
                      Prize pool: ${comp.prize_pool}
                    </span>
                    {comp.start_date && (
                      <span className="text-[#6B7280] dark:text-gray-400">
                        {new Date(comp.start_date).toLocaleDateString()} –{' '}
                        {comp.end_date ? new Date(comp.end_date).toLocaleDateString() : 'TBD'}
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
                  <button onClick={() => handleUpdateStatus(comp.id, 'active')} className="text-xs px-3 py-1.5 rounded-lg border border-green-400 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition">
                    Activate
                  </button>
                )}
                {comp.status === 'active' && (
                  <button onClick={() => handleUpdateStatus(comp.id, 'completed')} className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-[#6B7280] hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    Mark Completed
                  </button>
                )}
                <button onClick={() => handleDelete(comp.id)} className="text-xs px-3 py-1.5 rounded-lg border border-red-300 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition ml-auto">
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
