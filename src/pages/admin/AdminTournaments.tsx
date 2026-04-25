import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X, CheckCircle, Trophy } from 'lucide-react';

interface Tournament {
  id: string;
  title: string;
  description: string | null;
  book_id: string | null;
  entry_fee: number;
  prize_pool: number;
  max_participants: number | null;
  start_date: string | null;
  end_date: string | null;
  status: 'pending' | 'approved' | 'active' | 'completed' | 'rejected';
  is_featured: boolean;
  created_by: string;
  created_at: string;
  books: { title: string; author: string } | null;
  profiles: { email: string; full_name: string | null } | null;
  entry_count?: number;
}

type FilterStatus = 'pending' | 'approved' | 'active' | 'completed' | 'rejected' | 'all';

export function AdminTournaments() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data } = await supabase
      .from('tournaments')
      .select(`
        *,
        books(title, author),
        profiles(email, full_name)
      `)
      .order('created_at', { ascending: false });

    if (data) {
      // Get entry counts for each tournament
      const withCounts = await Promise.all(
        data.map(async (t) => {
          const { count } = await supabase
            .from('tournament_entries')
            .select('*', { count: 'exact', head: true })
            .eq('tournament_id', t.id);
          return { ...t, entry_count: count ?? 0 };
        })
      );
      setTournaments(withCounts);
    }
    setLoading(false);
  }

  async function handleUpdateStatus(
    id: string,
    status: 'approved' | 'active' | 'completed' | 'rejected'
  ) {
    const { error: err } = await supabase
      .from('tournaments')
      .update({ status })
      .eq('id', id);
    if (err) { setError('Failed to update tournament.'); return; }
    setSuccess(`Tournament marked as ${status}.`);
    loadData();
  }

  async function handleToggleFeatured(id: string, current: boolean) {
    await supabase
      .from('tournaments')
      .update({ is_featured: !current })
      .eq('id', id);
    setSuccess(current ? 'Removed from featured.' : 'Tournament featured!');
    loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this tournament? This cannot be undone.')) return;
    await supabase.from('tournament_entries').delete().eq('tournament_id', id);
    await supabase.from('tournaments').delete().eq('id', id);
    setSuccess('Tournament deleted.');
    loadData();
  }

  const filtered = tournaments.filter((t) =>
    filter === 'all' ? true : t.status === filter
  );

  const counts = {
    pending: tournaments.filter((t) => t.status === 'pending').length,
    approved: tournaments.filter((t) => t.status === 'approved').length,
    active: tournaments.filter((t) => t.status === 'active').length,
    completed: tournaments.filter((t) => t.status === 'completed').length,
    rejected: tournaments.filter((t) => t.status === 'rejected').length,
    all: tournaments.length,
  };

  const FILTERS: { key: FilterStatus; label: string }[] = [
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'all', label: 'All' },
  ];

  const statusColor = (status: Tournament['status']) => {
    if (status === 'active') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (status === 'approved') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    if (status === 'pending') return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    if (status === 'rejected') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
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
          Tournaments
          {counts.pending > 0 && (
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 font-medium">
              {counts.pending} pending review
            </span>
          )}
        </h2>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === key
                ? 'bg-[#1B2A4A] text-white dark:bg-[#D4A843] dark:text-[#1B2A4A]'
                : 'bg-white dark:bg-gray-800 text-[#6B7280] dark:text-gray-400 border border-[#e8e0d5] dark:border-gray-700 hover:text-[#1B2A4A] dark:hover:text-[#F5F0E8]'
            }`}
          >
            {label} ({counts[key]})
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <p className="text-sm text-[#6B7280] dark:text-gray-400">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-[#6B7280] dark:text-gray-400">No tournaments in this category.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <div
              key={t.id}
              className={`bg-white dark:bg-gray-800 rounded-xl border p-4 space-y-3 ${
                t.is_featured
                  ? 'border-[#D4A843] dark:border-[#D4A843]'
                  : 'border-[#e8e0d5] dark:border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-[#1B2A4A] dark:text-[#F5F0E8]">
                      {t.title}
                    </p>
                    {t.is_featured && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#D4A843]/20 text-[#D4A843] font-medium flex items-center gap-1">
                        <Trophy size={10} /> Featured
                      </span>
                    )}
                  </div>

                  {t.description && (
                    <p className="text-xs text-[#6B7280] dark:text-gray-400 mt-0.5 line-clamp-2">
                      {t.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-4 mt-2 text-sm">
                    {t.books && (
                      <span className="text-[#6B7280] dark:text-gray-400 text-xs">
                        Book: {t.books.title}
                      </span>
                    )}
                    <span className="text-[#1B2A4A] dark:text-[#F5F0E8]">
                      Entry: <strong>${t.entry_fee}</strong>
                    </span>
                    <span className="text-[#D4A843] font-medium">
                      Prize: ${t.prize_pool}
                    </span>
                    <span className="text-[#6B7280] dark:text-gray-400">
                      {t.entry_count ?? 0} entries
                      {t.max_participants ? ` / ${t.max_participants} max` : ''}
                    </span>
                    {t.start_date && (
                      <span className="text-[#6B7280] dark:text-gray-400 text-xs">
                        {new Date(t.start_date).toLocaleDateString()} –{' '}
                        {t.end_date ? new Date(t.end_date).toLocaleDateString() : 'TBD'}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#6B7280] dark:text-gray-400 mt-1">
                    Created by {t.profiles?.full_name ?? t.profiles?.email ?? t.created_by}
                  </p>
                </div>

                <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${statusColor(t.status)}`}>
                  {t.status}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                {t.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus(t.id, 'approved')}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-blue-400 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
                    >
                      <CheckCircle size={12} /> Approve
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(t.id, 'rejected')}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-red-300 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                    >
                      <X size={12} /> Reject
                    </button>
                  </>
                )}
                {t.status === 'approved' && (
                  <button
                    onClick={() => handleUpdateStatus(t.id, 'active')}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-green-400 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition"
                  >
                    <CheckCircle size={12} /> Activate
                  </button>
                )}
                {t.status === 'active' && (
                  <button
                    onClick={() => handleUpdateStatus(t.id, 'completed')}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-[#6B7280] hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    Mark Completed
                  </button>
                )}
                <button
                  onClick={() => handleToggleFeatured(t.id, t.is_featured)}
                  className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border transition ${
                    t.is_featured
                      ? 'border-[#D4A843] text-[#D4A843] hover:bg-[#D4A843]/10'
                      : 'border-gray-300 dark:border-gray-600 text-[#6B7280] hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <Trophy size={12} /> {t.is_featured ? 'Unfeature' : 'Feature'}
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-red-300 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition ml-auto"
                >
                  <X size={12} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
