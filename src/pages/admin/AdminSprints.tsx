import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, X } from 'lucide-react';

interface Sprint {
  id: string;
  title: string;
  description: string | null;
  book_id: string | null;
  book_title: string | null;
  book_author: string | null;
  entry_fee: number;
  prize_pool: number;
  is_sponsored: boolean;
  start_date: string;
  end_date: string;
  status: 'upcoming' | 'active' | 'completed' | 'canceled';
  winner_paid_at: string | null;
  created_at: string;
}

interface NewSprint {
  title: string;
  description: string;
  book_title: string;
  book_author: string;
  entry_fee: string;
  prize_pool: string;
  is_sponsored: boolean;
  start_date: string;
  end_date: string;
}

const emptySprint: NewSprint = {
  title: '',
  description: '',
  book_title: '',
  book_author: '',
  entry_fee: '',
  prize_pool: '',
  is_sponsored: false,
  start_date: '',
  end_date: '',
};

export function AdminSprints() {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [newSprint, setNewSprint] = useState<NewSprint>(emptySprint);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-[#e8e8d5] dark:border-gray-700 bg-white dark:bg-gray-800 text-[#1B2A4A] dark:text-[#F5F0E8] text-sm focus:outline-none focus:ring-2';

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data } = await supabase
      .from('sprints')
      .select('*')
      .order('created_at', { ascending: false });
    setSprints(data || []);
  }

  async function handleSave() {
    if (!newSprint.title || !newSprint.start_date || !newSprint.end_date || (!newSprint.is_sponsored && !newSprint.entry_fee)) {
      setError('Title, dates, and entry fee are required.');
      return;
    }

    setSaving(true);
    setError('');

    const { error: err } = await supabase.from('sprints').insert({
      title: newSprint.title,
      description: newSprint.description || null,
      book_title: newSprint.book_title || null,
      book_author: newSprint.book_author || null,
      entry_fee: newSprint.is_sponsored ? 0 : parseFloat(newSprint.entry_fee),
      prize_pool: parseFloat(newSprint.prize_pool) || 0,
      is_sponsored: newSprint.is_sponsored,
      start_date: newSprint.start_date,
      end_date: newSprint.end_date,
      status: 'upcoming',
    });

    if (err) {
      setError('Failed to save: ' + err.message);
      setSaving(false);
      return;
    }

    setSuccess('Sprint created!');
    setNewSprint(emptySprint);
    setShowForm(false);
    setSaving(false);
    loadData();
  }

  async function handleUpdateStatus(id: string, status: Sprint['status']) {
    await supabase.from('sprints').update({ status }).eq('id', id);

    if (status === 'active') {
      await supabase.functions.invoke('notify-content-live', {
        body: { content_type: 'sprint', content_id: id },
      });
    }

    loadData();
  }

  async function handleCloseAndPay(id: string) {
    if (!confirm('Close this sprint and distribute prizes? This cannot be undone.')) return;
    const { data, error } = await supabase.rpc('close_sprint_and_pay', { p_sprint_id: id });
    if (error) {
      setError('Payout failed: ' + error.message);
    } else if (data === 'already_completed') {
      setError('This sprint has already been paid out.');
    } else {
      setSuccess('Sprint closed and prizes distributed.');
      loadData();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this sprint?')) return;
    await supabase.from('sprints').delete().eq('id', id);
    loadData();
  }

  const statusColor = (status: Sprint['status']) => {
    if (status === 'active') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (status === 'upcoming') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    if (status === 'canceled') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
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
          Sprints ({sprints.filter((s) => s.status === 'active').length} active)
        </h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-3 py-2 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-sm font-medium hover:bg-[#c49a3a]"
          >
            <Plus size={16} /> New Sprint
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e8d5] dark:border-gray-700 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[#1B2A4A] dark:text-[#F5F0E8]">Create Sprint</h3>
            <button onClick={() => { setShowForm(false); setNewSprint(emptySprint); }} className="text-[#6B7280]">
              <X size={18} />
            </button>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Title</label>
            <input
              className={inputClass}
              placeholder="e.g. July Reading Sprint"
              value={newSprint.title}
              onChange={(e) => setNewSprint({ ...newSprint, title: e.target.value })}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">
              Description <span className="text-[#6B7280]">(optional)</span>
            </label>
            <textarea
              className={inputClass + ' resize-none'}
              rows={3}
              placeholder="Describe the sprint goals, rules, or theme..."
              value={newSprint.description}
              onChange={(e) => setNewSprint({ ...newSprint, description: e.target.value })}
            />
          </div>

          {/* Book (optional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">
                Book Title <span className="text-[#6B7280]">(optional)</span>
              </label>
              <input
                className={inputClass}
                placeholder="e.g. The Midnight Library"
                value={newSprint.book_title}
                onChange={(e) => setNewSprint({ ...newSprint, book_title: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">
                Book Author <span className="text-[#6B7280]">(optional)</span>
              </label>
              <input
                className={inputClass}
                placeholder="e.g. Matt Haig"
                value={newSprint.book_author}
                onChange={(e) => setNewSprint({ ...newSprint, book_author: e.target.value })}
              />
            </div>
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
                value={newSprint.entry_fee}
                onChange={(e) => setNewSprint({ ...newSprint, entry_fee: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Prize Pool ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                placeholder="e.g. 100.00"
                value={newSprint.prize_pool}
                onChange={(e) => setNewSprint({ ...newSprint, prize_pool: e.target.value })}
              />
            </div>
          </div>

          {/* Sponsored toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="sprint_is_sponsored"
              checked={newSprint.is_sponsored}
              onChange={(e) => setNewSprint({ ...newSprint, is_sponsored: e.target.checked })}
              className="accent-[#D4A843] w-4 h-4"
            />
            <label htmlFor="sprint_is_sponsored" className="text-sm text-[#1B2A4A] dark:text-[#F5F0E8]">
              Author-sponsored (free to readers)
            </label>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Start Date</label>
              <input
                type="datetime-local"
                className={inputClass}
                value={newSprint.start_date}
                onChange={(e) => setNewSprint({ ...newSprint, start_date: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">End Date</label>
              <input
                type="datetime-local"
                className={inputClass}
                value={newSprint.end_date}
                onChange={(e) => setNewSprint({ ...newSprint, end_date: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-sm font-semibold hover:bg-[#c49a3a] disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Create Sprint'}
            </button>
            <button
              onClick={() => { setShowForm(false); setNewSprint(emptySprint); }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-[#6B7280] hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Sprint list */}
      {sprints.length === 0 ? (
        <p className="text-sm text-[#6B7280] dark:text-gray-400">No sprints yet.</p>
      ) : (
        <div className="space-y-3">
          {sprints.map((sprint) => (
            <div key={sprint.id} className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e8d5] dark:border-gray-700 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="font-medium text-[#1B2A4A] dark:text-[#F5F0E8]">{sprint.title}</p>
                  <p className="text-xs text-[#6B7280] dark:text-gray-400 mt-0.5">
                    Sprint
                    {sprint.book_title ? ` · ${sprint.book_title}${sprint.book_author ? ` by ${sprint.book_author}` : ''}` : ''}
                    {sprint.is_sponsored ? ' · Sponsored (Free to Readers)' : ''}
                  </p>
                  {sprint.description && (
                    <p className="text-xs text-[#6B7280] dark:text-gray-400 mt-1 italic">{sprint.description}</p>
                  )}
                  <div className="flex flex-wrap gap-4 mt-2 text-sm">
                    <span className="text-[#1B2A4A] dark:text-[#F5F0E8]">
                      Entry: <strong>${sprint.entry_fee}</strong>
                    </span>
                    <span className="text-[#D4A843] font-medium">
                      Prize pool: ${sprint.prize_pool}
                    </span>
                    <span className="text-[#6B7280] dark:text-gray-400">
                      {new Date(sprint.start_date).toLocaleDateString()} –{' '}
                      {new Date(sprint.end_date).toLocaleDateString()}
                    </span>
                  </div>
                  {sprint.winner_paid_at && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      Paid out {new Date(sprint.winner_paid_at).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${statusColor(sprint.status)}`}>
                  {sprint.status}
                </span>
              </div>

              <div className="flex gap-2 mt-3 flex-wrap">
                {sprint.status === 'upcoming' && (
                  <button
                    onClick={() => handleUpdateStatus(sprint.id, 'active')}
                    className="text-xs px-3 py-1.5 rounded-lg border border-green-400 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition"
                  >
                    Activate
                  </button>
                )}
                {sprint.status === 'active' && (
                  <button
                    onClick={() => handleUpdateStatus(sprint.id, 'completed')}
                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-[#6B7280] hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    Mark Completed
                  </button>
                )}
                {sprint.status === 'active' && (
                  <button
                    onClick={() => handleCloseAndPay(sprint.id)}
                    className="text-xs px-3 py-1 text-sm border border-yellow-500 text-yellow-500 rounded hover:bg-yellow-500/10"
                  >
                    Close & Pay Out
                  </button>
                )}
                {(sprint.status === 'upcoming' || sprint.status === 'active') && (
                  <button
                    onClick={() => handleUpdateStatus(sprint.id, 'canceled')}
                    className="text-xs px-3 py-1.5 rounded-lg border border-red-300 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={() => handleDelete(sprint.id)}
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
