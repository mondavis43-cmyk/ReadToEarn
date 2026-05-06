import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Zap, Trophy, Users, Plus, Play, Square, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';

interface Sprint {
id: string;
title: string;
description: string;
book_id: string;
book_title: string;
book_author: string;
entry_fee: number;
prize_pool: number;
status: 'upcoming' | 'active' | 'completed';
start_date: string;
end_date: string;
winner_paid_at: string | null;
created_at: string;
}

interface LeaderboardEntry {
user_id: string;
display_name: string;
score: number;
time_spent_ms: number;
rank: number;
}

interface SprintStats {
entrant_count: number;
}

interface Book {
id: string;
title: string;
author: string;
}

const EMPTY_FORM = {
title: '',
description: '',
book_id: '',
entry_fee: '',
prize_pool: '',
start_date: '',
end_date: '',
};

export function AdminSprints() {
const [sprints, setSprints] = useState<Sprint[]>([]);
const [loading, setLoading] = useState(true);
const [creating, setCreating] = useState(false);
const [form, setForm] = useState(EMPTY_FORM);
const [saving, setSaving] = useState(false);
const [error, setError] = useState('');
const [success, setSuccess] = useState('');
const [expandedId, setExpandedId] = useState<string | null>(null);
const [leaderboards, setLeaderboards] = useState<Record<string, LeaderboardEntry[]>>({});
const [stats, setStats] = useState<Record<string, SprintStats>>({});
const [loadingLeaderboard, setLoadingLeaderboard] = useState<string | null>(null);
const [payingOut, setPayingOut] = useState<string | null>(null);
const [books, setBooks] = useState<Book[]>([]);
const [bookSearch, setBookSearch] = useState('');

const load = async () => {
  setLoading(true);
  const { data } = await supabase
    .from('sprints')
    .select('*')
    .order('created_at', { ascending: false });
  setSprints(data ?? []);
  setLoading(false);
};

const loadBooks = async (search: string) => {
  const { data } = await supabase
    .from('books')
    .select('id, title, author')
    .eq('book_type', 'standard')
    .ilike('title', `%${search}%`)
    .limit(20);
  setBooks(data ?? []);
};

useEffect(() => { load(); }, []);
useEffect(() => { if (creating) loadBooks(''); }, [creating]);
useEffect(() => { loadBooks(bookSearch); }, [bookSearch]);

const loadLeaderboard = async (sprintId: string) => {
  if (leaderboards[sprintId]) return;
  setLoadingLeaderboard(sprintId);

  const { data: entries } = await supabase
    .from('sprint_entries')
    .select('user_id, score, time_spent_ms')
    .eq('sprint_id', sprintId)
    .order('score', { ascending: false })
    .order('time_spent_ms', { ascending: true });

  const entrantCount = entries?.length ?? 0;
  setStats(prev => ({ ...prev, [sprintId]: { entrant_count: entrantCount } }));

  if (!entries || entries.length === 0) {
    setLeaderboards(prev => ({ ...prev, [sprintId]: [] }));
    setLoadingLeaderboard(null);
    return;
  }

  const userIds = entries.map((e: any) => e.user_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', userIds);

  const nameMap: Record<string, string> = {};
  for (const p of profiles ?? []) {
    nameMap[p.id] = p.display_name ?? 'Reader';
  }

  const ranked = entries.map((row: any, idx: number) => ({
    user_id: row.user_id,
    display_name: nameMap[row.user_id] ?? 'Reader',
    score: row.score ?? 0,
    time_spent_ms: row.time_spent_ms ?? 0,
    rank: idx + 1,
  }));

  setLeaderboards(prev => ({ ...prev, [sprintId]: ranked }));
  setLoadingLeaderboard(null);
};

const toggleExpand = (id: string) => {
  if (expandedId === id) {
    setExpandedId(null);
  } else {
    setExpandedId(id);
    loadLeaderboard(id);
  }
};

const handleStatusChange = async (id: string, newStatus: 'upcoming' | 'active' | 'completed') => {
  if (newStatus === 'active') {
    await supabase.from('sprints').update({ status: 'upcoming' }).eq('status', 'active');
  }
  await supabase.from('sprints').update({ status: newStatus }).eq('id', id);
  load();
};

const handleCloseAndPay = async (id: string, title: string) => {
  if (!window.confirm(`Close "${title}" and pay the winner? This cannot be undone.`)) return;
  setPayingOut(id);
  setError('');
  setSuccess('');
  const { data, error: rpcError } = await supabase.rpc('close_sprint_and_pay', { p_sprint_id: id });
  setPayingOut(null);
  if (rpcError) {
    setError(`Payout failed: ${rpcError.message}`);
    return;
  }
  if (data === 'already_completed') {
    setError('This sprint has already been paid out.');
    return;
  }
  if (data === 'no_prize_pool') {
    setError('No prize pool to distribute.');
    return;
  }
  setSuccess(`"${title}" closed and winner paid successfully.`);
  load();
};

const handleCreate = async () => {
  setError('');
  if (!form.title || !form.book_id || !form.entry_fee || !form.start_date || !form.end_date) {
    setError('Title, book, entry fee, and dates are required.');
    return;
  }
  const selectedBook = books.find(b => b.id === form.book_id);
  setSaving(true);
  const { error: insertError } = await supabase.from('sprints').insert({
    title: form.title,
    description: form.description || null,
    book_id: form.book_id,
    book_title: selectedBook?.title ?? '',
    book_author: selectedBook?.author ?? '',
    entry_fee: Number(form.entry_fee),
    prize_pool: Number(form.prize_pool) || 0,
    start_date: new Date(form.start_date).toISOString(),
    end_date: new Date(form.end_date).toISOString(),
    status: 'upcoming',
  });
  setSaving(false);
  if (insertError) {
    setError(insertError.message);
    return;
  }
  setForm(EMPTY_FORM);
  setBookSearch('');
  setCreating(false);
  load();
};

const formatTime = (ms: number) => {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const statusBadge = (status: Sprint['status']) => {
  if (status === 'active') return 'bg-green-500/15 text-green-400 border-green-500/20';
  if (status === 'completed') return 'bg-gray-500/15 text-gray-400 border-gray-500/20';
  return 'bg-amber-500/15 text-amber-400 border-amber-500/20';
};

const rankMedal = (rank: number) => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
};

if (loading) return (
  <div className="flex items-center justify-center py-16">
    <div className="w-6 h-6 border-2 border-[#D4A843] border-t-transparent rounded-full animate-spin" />
  </div>
);

return (
  <div className="space-y-6">

    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-lg font-bold text-[#1B2A4A] dark:text-[#F5F0E8]">Sprints</h2>
        <p className="text-sm text-[#6B7280] dark:text-gray-400 mt-0.5">
          Create and manage winner-takes-all speed competitions
        </p>
      </div>
      <button
        onClick={() => setCreating(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#D4A843] text-white text-sm font-semibold hover:bg-[#c49a3a] transition-colors"
      >
        <Plus size={16} />
        New Sprint
      </button>
    </div>

    {error && (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
        {error}
        <button onClick={() => setError('')} className="ml-3 text-red-400 hover:text-red-600">✕</button>
      </div>
    )}
    {success && (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 text-sm text-green-600 dark:text-green-400 flex items-center justify-between">
        {success}
        <button onClick={() => setSuccess('')} className="ml-3 text-green-400 hover:text-green-600">✕</button>
      </div>
    )}

    {creating && (
      <div className="bg-white dark:bg-gray-800 border border-[#e8e0d5] dark:border-gray-700 rounded-2xl p-6 space-y-4">
        <h3 className="font-semibold text-[#1B2A4A] dark:text-[#F5F0E8]">New Sprint</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[#6B7280] dark:text-gray-400 mb-1">Title *</label>
            <input
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="May Speed Sprint"
              className="w-full px-3 py-2 rounded-xl border border-[#e8e0d5] dark:border-gray-600 bg-[#F5F0E8] dark:bg-gray-700 text-[#1B2A4A] dark:text-[#F5F0E8] text-sm focus:outline-none focus:border-[#D4A843]"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[#6B7280] dark:text-gray-400 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Optional description shown to users"
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-[#e8e0d5] dark:border-gray-600 bg-[#F5F0E8] dark:bg-gray-700 text-[#1B2A4A] dark:text-[#F5F0E8] text-sm focus:outline-none focus:border-[#D4A843] resize-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[#6B7280] dark:text-gray-400 mb-1">Book *</label>
            <input
              value={bookSearch}
              onChange={e => setBookSearch(e.target.value)}
              placeholder="Search books by title..."
              className="w-full px-3 py-2 rounded-xl border border-[#e8e0d5] dark:border-gray-600 bg-[#F5F0E8] dark:bg-gray-700 text-[#1B2A4A] dark:text-[#F5F0E8] text-sm focus:outline-none focus:border-[#D4A843] mb-2"
            />
            {books.length > 0 && (
              <div className="border border-[#e8e0d5] dark:border-gray-600 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                {books.map(b => (
                  <button
                    key={b.id}
                    onClick={() => { setForm(p => ({ ...p, book_id: b.id })); setBookSearch(b.title); setBooks([]); }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-[#D4A843]/10 transition-colors ${
                      form.book_id === b.id ? 'bg-[#D4A843]/10 text-[#D4A843]' : 'text-[#1B2A4A] dark:text-[#F5F0E8]'
                    }`}
                  >
                    <span className="font-medium">{b.title}</span>
                    <span className="text-[#6B7280] dark:text-gray-400 ml-2">by {b.author}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B7280] dark:text-gray-400 mb-1">Start Date *</label>
            <input
              type="datetime-local"
              value={form.start_date}
              onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-[#e8e0d5] dark:border-gray-600 bg-[#F5F0E8] dark:bg-gray-700 text-[#1B2A4A] dark:text-[#F5F0E8] text-sm focus:outline-none focus:border-[#D4A843]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6B7280] dark:text-gray-400 mb-1">End Date *</label>
            <input
              type="datetime-local"
              value={form.end_date}
              onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-[#e8e0d5] dark:border-gray-600 bg-[#F5F0E8] dark:bg-gray-700 text-[#1B2A4A] dark:text-[#F5F0E8] text-sm focus:outline-none focus:border-[#D4A843]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6B7280] dark:text-gray-400 mb-1">Entry Fee ($) *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.entry_fee}
              onChange={e => setForm(p => ({ ...p, entry_fee: e.target.value }))}
              placeholder="5.00"
              className="w-full px-3 py-2 rounded-xl border border-[#e8e0d5] dark:border-gray-600 bg-[#F5F0E8] dark:bg-gray-700 text-[#1B2A4A] dark:text-[#F5F0E8] text-sm focus:outline-none focus:border-[#D4A843]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6B7280] dark:text-gray-400 mb-1">Guaranteed Prize Pool ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.prize_pool}
              onChange={e => setForm(p => ({ ...p, prize_pool: e.target.value }))}
              placeholder="0.00 (entry fees fund the pool)"
              className="w-full px-3 py-2 rounded-xl border border-[#e8e0d5] dark:border-gray-600 bg-[#F5F0E8] dark:bg-gray-700 text-[#1B2A4A] dark:text-[#F5F0E8] text-sm focus:outline-none focus:border-[#D4A843]"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleCreate}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-[#D4A843] text-white text-sm font-semibold hover:bg-[#c49a3a] transition-colors disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create Sprint'}
          </button>
          <button
            onClick={() => { setCreating(false); setForm(EMPTY_FORM); setBookSearch(''); setError(''); }}
            className="px-5 py-2 rounded-xl border border-[#e8e0d5] dark:border-gray-600 text-[#6B7280] dark:text-gray-400 text-sm hover:opacity-70 transition-opacity"
          >
            Cancel
          </button>
        </div>
      </div>
    )}

    {sprints.length === 0 && !creating ? (
      <div className="bg-white dark:bg-gray-800 border border-[#e8e0d5] dark:border-gray-700 rounded-2xl p-10 text-center">
        <Zap size={32} className="text-[#D4A843] mx-auto mb-3" />
        <p className="text-[#1B2A4A] dark:text-[#F5F0E8] font-medium">No sprints yet</p>
        <p className="text-sm text-[#6B7280] dark:text-gray-400 mt-1">Create your first one to get started.</p>
      </div>
    ) : (
      <div className="space-y-4">
        {sprints.map((s) => {
          const isExpanded = expandedId === s.id;
          const lb = leaderboards[s.id] ?? [];
          const st = stats[s.id];

          return (
            <div key={s.id} className="bg-white dark:bg-gray-800 border border-[#e8e0d5] dark:border-gray-700 rounded-2xl overflow-hidden">

              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-[#1B2A4A] dark:text-[#F5F0E8] truncate">{s.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusBadge(s.status)}`}>
                        {s.status}
                      </span>
                    </div>
                    {s.description && (
                      <p className="text-sm text-[#6B7280] dark:text-gray-400 mt-1 line-clamp-2">{s.description}</p>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-[#6B7280] dark:text-gray-400">
                      <span>📖 {s.book_title} by {s.book_author}</span>
                      <span>📅 {new Date(s.start_date).toLocaleDateString()} – {new Date(s.end_date).toLocaleDateString()}</span>
                      <span>🎟 ${s.entry_fee.toFixed(2)} entry</span>
                      <span>🏆 ${s.prize_pool.toFixed(2)} pool (winner takes all)</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {s.status === 'upcoming' && (
                      <button
                        onClick={() => handleStatusChange(s.id, 'active')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-500 text-xs font-semibold hover:bg-green-500/20 transition-colors border border-green-500/20"
                      >
                        <Play size={12} /> Start
                      </button>
                    )}
                    {s.status === 'active' && (
                      <button
                        onClick={() => handleStatusChange(s.id, 'completed')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-colors border border-red-500/20"
                      >
                        <Square size={12} /> End
                      </button>
                    )}
                    {s.status === 'completed' && !s.winner_paid_at && (
                      <button
                        onClick={() => handleCloseAndPay(s.id, s.title)}
                        disabled={payingOut === s.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4A843]/10 text-[#D4A843] text-xs font-semibold hover:bg-[#D4A843]/20 transition-colors border border-[#D4A843]/20 disabled:opacity-50"
                      >
                        <DollarSign size={12} />
                        {payingOut === s.id ? 'Paying...' : 'Pay Winner'}
                      </button>
                    )}
                    {s.winner_paid_at && (
                      <span className="text-xs text-green-400 font-medium">✓ Paid</span>
                    )}
                    <button
                      onClick={() => toggleExpand(s.id)}
                      className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#1B2A4A] dark:hover:text-[#F5F0E8] transition-colors"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-[#e8e0d5] dark:border-gray-700 p-5 space-y-4">
                  {st && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-[#F5F0E8] dark:bg-gray-700/50 rounded-xl p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                          <Users size={14} className="text-[#D4A843]" />
                          <span className="text-xs text-[#6B7280] dark:text-gray-400 font-medium">Entrants</span>
                        </div>
                        <p className="text-xl font-bold text-[#1B2A4A] dark:text-[#F5F0E8]">{st.entrant_count}</p>
                      </div>
                      <div className="bg-[#F5F0E8] dark:bg-gray-700/50 rounded-xl p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                          <Trophy size={14} className="text-[#D4A843]" />
                          <span className="text-xs text-[#6B7280] dark:text-gray-400 font-medium">Prize Pool</span>
                        </div>
                        <p className="text-xl font-bold text-[#1B2A4A] dark:text-[#F5F0E8]">${s.prize_pool.toFixed(2)}</p>
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-semibold text-[#1B2A4A] dark:text-[#F5F0E8] mb-3">
                      {s.status === 'completed' ? 'Final Results' : 'Live Standings'}
                    </h4>
                    {loadingLeaderboard === s.id ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="w-5 h-5 border-2 border-[#D4A843] border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : lb.length === 0 ? (
                      <p className="text-sm text-[#6B7280] dark:text-gray-400 text-center py-6">No entries yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {lb.slice(0, 10).map((entry) => (
                          <div
                            key={entry.user_id}
                            className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                              entry.rank === 1
                                ? 'border-[#D4A843]/30 bg-[#D4A843]/5'
                                : 'border-[#e8e0d5] dark:border-gray-700 bg-[#F5F0E8] dark:bg-gray-700/30'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-base w-8 text-center">{rankMedal(entry.rank)}</span>
                              <p className="text-sm font-medium text-[#1B2A4A] dark:text-[#F5F0E8]">{entry.display_name}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-[#D4A843]">{entry.score}/10</p>
                              <p className="text-xs text-[#6B7280] dark:text-gray-400">{formatTime(entry.time_spent_ms)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    )}
  </div>
);
}