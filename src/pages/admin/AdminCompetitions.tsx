import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, X } from 'lucide-react';

interface Book {
  id: string;
  title: string;
  author: string;
}

interface Competition {
  id: string;
  book_id: string;
  entry_fee: number;
  prize_pool: number;
  platform_fee: number;
  reader_pool: number;
  max_participants: number | null;
  start_date: string | null;
  end_date: string | null;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  created_at: string;
  books: { title: string; author: string } | null;
}

interface NewCompetition {
  book_id: string;
  entry_fee: number;
  max_participants: string;
  start_date: string;
  end_date: string;
}

const emptyComp: NewCompetition = {
  book_id: '',
  entry_fee: 5,
  max_participants: '',
  start_date: '',
  end_date: '',
};

const ENTRY_FEE_OPTIONS = [1, 2, 5, 10, 20];

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
      supabase.from('books').select('id, title, author').order('title'),
      supabase
        .from('competitions')
        .select('*, books(title, author)')
        .order('created_at', { ascending: false }),
    ]);
    setBooks(booksData || []);
    setCompetitions(compsData || []);
  }

  function calcPools(entryFee: number, maxParticipants: string) {
    const participants = parseInt(maxParticipants) || 0;
    const gross = entryFee * participants;
    const platform_fee = Math.round(gross * 0.2 * 100) / 100;
    const reader_pool = Math.round(gross * 0.8 * 100) / 100;
    return { gross, platform_fee, reader_pool };
  }

  async function handleSave() {
    if (!newComp.book_id) { setError('Select a book.'); return; }
    if (!newComp.start_date || !newComp.end_date) { setError('Start and end dates are required.'); return; }
    setSaving(true);
    setError('');
    const { platform_fee, reader_pool } = calcPools(newComp.entry_fee, newComp.max_participants);
    const gross = newComp.entry_fee * (parseInt(newComp.max_participants) || 0);
    const { error: err } = await supabase.from('competitions').insert({
      book_id: newComp.book_id,
      entry_fee: newComp.entry_fee,
      prize_pool: gross,
      platform_fee,
      reader_pool,
      max_participants: newComp.max_participants ? parseInt(newComp.max_participants) : null,
      start_date: newComp.start_date || null,
      end_date: newComp.end_date || null,
      status: 'upcoming',
    });
    if (err) { setError('Failed to save competition.'); setSaving(false); return; }
    setSuccess('Competition created!');
    setNewComp(emptyComp);
    setShowForm(false);
    setSaving(false);
    loadData();
  }

  async function handleUpdateStatus(
    id: string,
    status: 'upcoming' | 'active' | 'completed' | 'cancelled'
  ) {
    await supabase.from('competitions').update({ status }).eq('id', id);
    loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this competition?')) return;
    await supabase.from('competitions').delete().eq('id', id);
    loadData();
  }

  const { gross, platform_fee, reader_pool } = calcPools(newComp.entry_fee, newComp.max_participants);

  const statusColor = (status: Competition['status']) => {
    if (status === 'active') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (status === 'upcoming') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    if (status === 'cancelled') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400';
  };

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

          {/* Book */}
          <div>
            <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Book</label>
            <select className={selectClass} value={newComp.book_id} onChange={(e) => setNewComp({ ...newComp, book_id: e.target.value })}>
              <option value="">Select a book...</option>
              {books.map((b) => (
                <option key={b.id} value={b.id}>{b.title} — {b.author}</option>
              ))}
            </select>
          </div>

          {/* Entry fee */}
          <div>
            <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Entry Fee</label>
            <div className="flex flex-wrap gap-2">
              {ENTRY_FEE_OPTIONS.map((fee) => (
                <button
                  key={fee}
                  onClick={() => setNewComp({ ...newComp, entry_fee: fee })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                    newComp.entry_fee === fee
                      ? 'bg-[#D4A843] border-[#D4A843] text-[#1B2A4A]'
                      : 'border-gray-300 dark:border-gray-600 text-[#1B2A4A] dark:text-[#F5F0E8] hover:border-[#D4A843]'
                  }`}
                >
                  ${fee}
                </button>
              ))}
            </div>
          </div>

          {/* Max participants */}
          <div>
            <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Max Participants (optional)</label>
            <input
              type="number"
              min="1"
              className={inputClass}
              placeholder="Leave blank for unlimited"
              value={newComp.max_participants}
              onChange={(e) => setNewComp({ ...newComp, max_participants: e.target.value })}
            />
            {newComp.max_participants && (
              <p className="text-xs text-[#6B7280] dark:text-gray-400 mt-1">
                Gross: ${gross.toFixed(2)} · Platform: ${platform_fee.toFixed(2)} · Prize pool: ${reader_pool.toFixed(2)}
              </p>
            )}
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
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-sm font-semibold hover:bg-[#c49a3a] disabled:opacity-50">
              {saving ? 'Saving...' : 'Create Competition'}
            </button>
            <button onClick={() => { setShowForm(false); setNewComp(emptyComp); }} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-[#6B7280] hover:bg-gray-50 dark:hover:bg-gray-700">
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
                  <p className="font-medium text-[#1B2A4A] dark:text-[#F5F0E8]">
                    {comp.books?.title ?? 'Unknown Book'}
                  </p>
                  <p className="text-xs text-[#6B7280] dark:text-gray-400 mt-0.5">
                    {comp.books?.author ?? ''}
                  </p>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm">
                    <span className="text-[#1B2A4A] dark:text-[#F5F0E8]">
                      Entry: <strong>${comp.entry_fee}</strong>
                    </span>
                    <span className="text-[#D4A843] font-medium">
                      Prize pool: ${comp.reader_pool}
                    </span>
                    {comp.max_participants && (
                      <span className="text-[#6B7280] dark:text-gray-400">
                        Max: {comp.max_participants} participants
                      </span>
                    )}
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
                {(comp.status === 'upcoming' || comp.status === 'active') && (
                  <button onClick={() => handleUpdateStatus(comp.id, 'cancelled')} className="text-xs px-3 py-1.5 rounded-lg border border-red-300 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                    Cancel
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
