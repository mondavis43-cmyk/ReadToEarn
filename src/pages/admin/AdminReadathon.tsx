import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Trophy, Users, BookOpen, Plus, Play, Square, ChevronDown, ChevronUp, DollarSign, Trash2 } from 'lucide-react';

interface Readathon {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  entry_fee: number;
  prize_pool: number;
  first_place_pct: number;
  second_place_pct: number;
  third_place_pct: number;
  status: 'upcoming' | 'active' | 'ended' | 'completed';
  created_at: string;
}

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  total_pages: number;
  books_completed: number;
  rank: number;
}

interface ReadathonStats {
  entrant_count: number;
  total_pool: number;
}

const EMPTY_FORM = {
  title: '',
  description: '',
  start_date: '',
  end_date: '',
  entry_fee: '',
  prize_pool: '',
  first_place_pct: '60',
  second_place_pct: '25',
  third_place_pct: '15',
  is_sponsored: false,
};

export function AdminReadathon() {
  const [readathons, setReadathons] = useState<Readathon[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [leaderboards, setLeaderboards] = useState<Record<string, LeaderboardEntry[]>>({});
  const [stats, setStats] = useState<Record<string, ReadathonStats>>({});
  const [loadingLeaderboard, setLoadingLeaderboard] = useState<string | null>(null);
  const [payingOut, setPayingOut] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('readathons')
      .select('*')
      .order('created_at', { ascending: false });
    setReadathons(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const loadLeaderboard = async (readathonId: string) => {
    if (leaderboards[readathonId]) return;
    setLoadingLeaderboard(readathonId);

    const { data: progress } = await supabase
      .from('readathon_progress')
      .select('user_id, pages_read, book_id')
      .eq('readathon_id', readathonId);

    const { data: entries } = await supabase
      .from('readathon_entries')
      .select('user_id, entry_fee_paid')
      .eq('readathon_id', readathonId);

    const entrantCount = entries?.length ?? 0;
    const totalPool = entries?.reduce((sum, e) => sum + (e.entry_fee_paid ?? 0), 0) ?? 0;
    setStats((prev) => ({ ...prev, [readathonId]: { entrant_count: entrantCount, total_pool: totalPool } }));

    if (!progress || progress.length === 0) {
      setLeaderboards((prev) => ({ ...prev, [readathonId]: [] }));
      setLoadingLeaderboard(null);
      return;
    }

    const userMap: Record<string, { total_pages: number; books: Set<string> }> = {};
    for (const row of progress) {
      if (!userMap[row.user_id]) userMap[row.user_id] = { total_pages: 0, books: new Set() };
      userMap[row.user_id].total_pages += row.pages_read ?? 0;
      userMap[row.user_id].books.add(row.book_id);
    }

    const userIds = Object.keys(userMap);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, email')
      .in('id', userIds);

    const nameMap: Record<string, string> = {};
    for (const p of profiles ?? []) {
      nameMap[p.id] = p.display_name ?? p.email?.slice(0, 8);
    }

    const sorted = Object.entries(userMap)
      .map(([user_id, data]) => ({
        user_id,
        display_name: nameMap[user_id] ?? user_id.slice(0, 8),
        total_pages: data.total_pages,
        books_completed: data.books.size,
        rank: 0,
      }))
      .sort((a, b) => b.total_pages - a.total_pages)
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

    setLeaderboards((prev) => ({ ...prev, [readathonId]: sorted }));
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

  const handleStatusChange = async (id: string, newStatus: 'upcoming' | 'active' | 'ended') => {
    if (newStatus === 'active') {
      await supabase
        .from('readathons')
        .update({ status: 'upcoming' })
        .eq('status', 'active');
    }
    await supabase.from('readathons').update({ status: newStatus }).eq('id', id);

    // Notify when going live
    if (newStatus === 'active') {
      await supabase.functions.invoke('notify-content-live', {
        body: { content_type: 'readathon', content_id: id },
      });
    }

    load();
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    await supabase.from('readathons').delete().eq('id', id);
    load();
  };

  const handleCloseAndPay = async (id: string, title: string) => {
    if (!window.confirm(`Close "${title}" and distribute prizes to top 3 readers? This cannot be undone.`)) return;
    setPayingOut(id);
    setSuccess('');
    setError('');
    const { data, error: rpcError } = await supabase.rpc('close_readathon_and_pay', { p_readathon_id: id });
    setPayingOut(null);
    if (rpcError) {
      setError(`Payout failed: ${rpcError.message}`);
      return;
    }
    if (data === 'already_completed') {
      setError('This readathon has already been paid out.');
      return;
    }
    if (data === 'no_prize_pool') {
      setError('No prize pool to distribute.');
      return;
    }
    setSuccess(`"${title}" closed and prizes distributed successfully.`);
    load();
  };

  const handleCreate = async () => {
    setError('');
    const pctSum = Number(form.first_place_pct) + Number(form.second_place_pct) + Number(form.third_place_pct);
    if (pctSum !== 100) {
      setError('Prize percentages must add up to 100%');
      return;
    }
    if (!form.title || !form.start_date || !form.end_date || (!form.is_sponsored && !form.entry_fee)) {
      setError('Title, dates, and entry fee are required');
      return;
    }
    setSaving(true);
    const { data: newRow, error: insertError } = await supabase
      .from('readathons')
      .insert({
        title: form.title,
        description: form.description || null,
        start_date: new Date(form.start_date).toISOString(),
        end_date: new Date(form.end_date).toISOString(),
        entry_fee: form.is_sponsored ? 0 : Number(form.entry_fee),
        prize_pool: Number(form.prize_pool) || 0,
        is_sponsored: form.is_sponsored,
        first_place_pct: Number(form.first_place_pct),
        second_place_pct: Number(form.second_place_pct),
        third_place_pct: Number(form.third_place_pct),
        status: 'upcoming',
      })
      .select('id, title')
      .single();

    setSaving(false);
    if (insertError || !newRow) {
      setError(insertError?.message ?? 'Insert failed');
      return;
    }

    // Notify subscribers immediately on creation (status = upcoming, goes live when activated)
    // Only notify on create if you want pre-reg awareness -- remove this block if you only
    // want to notify on handleStatusChange('active'). Keeping it here matches AdminBounties pattern.
    // If readathons use pre-registration, you may want to notify here for pre-reg signups.
    // For consistency with other competition formats, notify on 'active' only (via handleStatusChange).
    // So: no notify-content-live call here -- notification fires when admin clicks "Start".

    setForm(EMPTY_FORM);
    setCreating(false);
    load();
  };

  const prizeBreakdown = (r: Readathon) => {
    const pool = r.prize_pool;
    return {
      first: ((pool * r.first_place_pct) / 100).toFixed(2),
      second: ((pool * r.second_place_pct) / 100).toFixed(2),
      third: ((pool * r.third_place_pct) / 100).toFixed(2),
    };
  };

  const statusBadge = (status: Readathon['status']) => {
    if (status === 'active') return 'bg-green-500/15 text-green-500 border-green-500/20';
    if (status === 'ended' || status === 'completed') return 'bg-gray-500/15 text-gray-400 border-gray-500/20';
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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#1B2A4A] dark:text-[#F5F0E8]">Readathons</h2>
          <p className="text-sm text-[#6B7280] dark:text-gray-400 mt-0.5">
            Create and manage monthly reading competitions
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#D4A843] text-white text-sm font-semibold hover:bg-[#c49a3e] transition-colors"
        >
          <Plus size={16} />
          New Readathon
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="ml-3 text-red-400 hover:text-red-600">X</button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 text-sm text-green-600 dark:text-green-400 flex items-center justify-between">
          {success}
          <button onClick={() => setSuccess('')} className="ml-3 text-green-400 hover:text-green-600">X</button>
        </div>
      )}

      {/* Create form */}
      {creating && (
        <div className="bg-white dark:bg-gray-800 border border-[#e8e8d5] dark:border-gray-700 rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold text-[#1B2A4A] dark:text-[#F5F0E8]">New Readathon</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#6B7280] dark:text-gray-400 mb-1">Title *</label>
              <input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="May Readathon 2026"
                className="w-full px-3 py-2 rounded-xl border border-[#e8e8d5] dark:border-gray-600 bg-[#F5F0E8] dark:bg-gray-700 text-[#1B2A4A] dark:text-[#F5F0E8] text-sm focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#6B7280] dark:text-gray-400 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Optional description shown to users"
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-[#e8e8d5] dark:border-gray-600 bg-[#F5F0E8] dark:bg-gray-700 text-[#1B2A4A] dark:text-[#F5F0E8] text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B7280] dark:text-gray-400 mb-1">Start Date *</label>
              <input
                type="datetime-local"
                value={form.start_date}
                onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-[#e8e8d5] dark:border-gray-600 bg-[#F5F0E8] dark:bg-gray-700 text-[#1B2A4A] dark:text-[#F5F0E8] text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B7280] dark:text-gray-400 mb-1">End Date *</label>
              <input
                type="datetime-local"
                value={form.end_date}
                onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-[#e8e8d5] dark:border-gray-600 bg-[#F5F0E8] dark:bg-gray-700 text-[#1B2A4A] dark:text-[#F5F0E8] text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B7280] dark:text-gray-400 mb-1">Entry Fee ($) {!form.is_sponsored && '*'}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.is_sponsored ? '' : form.entry_fee}
                disabled={form.is_sponsored}
                onChange={(e) => setForm((p) => ({ ...p, entry_fee: e.target.value }))}
                placeholder={form.is_sponsored ? 'Free (sponsored)' : '5.00'}
                className="w-full px-3 py-2 rounded-xl border border-[#e8e8d5] dark:border-gray-600 bg-[#F5F0E8] dark:bg-gray-700 text-[#1B2A4A] dark:text-[#F5F0E8] text-sm focus:outline-none disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B7280] dark:text-gray-400 mb-1">Guaranteed Prize Pool ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.prize_pool}
                onChange={(e) => setForm((p) => ({ ...p, prize_pool: e.target.value }))}
                placeholder="0.00 (entry fees fund the pool)"
                className="w-full px-3 py-2 rounded-xl border border-[#e8e8d5] dark:border-gray-600 bg-[#F5F0E8] dark:bg-gray-700 text-[#1B2A4A] dark:text-[#F5F0E8] text-sm focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B7280] dark:text-gray-400 mb-2">Prize Split (must total 100%)</label>
            <div className="grid grid-cols-3 gap-3">
              {(['first_place_pct', 'second_place_pct', 'third_place_pct'] as const).map((field, idx) => (
                <div key={field}>
                  <label className="block text-xs text-[#6B7280] dark:text-gray-500 mb-1">
                    {idx === 0 ? '🥇 1st' : idx === 1 ? '🥈 2nd' : '🥉 3rd'} (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form[field]}
                    onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-[#e8e8d5] dark:border-gray-600 bg-[#F5F0E8] dark:bg-gray-700 text-[#1B2A4A] dark:text-[#F5F0E8] text-sm focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pb-1">
            <input
              type="checkbox"
              id="readathon_is_sponsored"
              checked={form.is_sponsored}
              onChange={(e) => setForm((p) => ({ ...p, is_sponsored: e.target.checked, entry_fee: e.target.checked ? '' : p.entry_fee }))}
              className="accent-[#D4A843] w-4 h-4"
            />
            <label htmlFor="readathon_is_sponsored" className="text-sm text-[#1B2A4A] dark:text-[#F5F0E8]">
              Author-sponsored (free to readers)
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-[#D4A843] text-white text-sm font-semibold hover:bg-[#c49a3e] transition-colors disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Readathon'}
            </button>
            <button
              onClick={() => { setCreating(false); setForm(EMPTY_FORM); setError(''); }}
              className="px-5 py-2 rounded-xl border border-[#e8e8d5] dark:border-gray-600 text-[#6B7280] dark:text-gray-400 text-sm hover:opacity-70 transition-opacity"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Readathon list */}
      {readathons.length === 0 && !creating ? (
        <div className="bg-white dark:bg-gray-800 border border-[#e8e8d5] dark:border-gray-700 rounded-2xl p-10 text-center">
          <Trophy size={32} className="text-[#D4A843] mx-auto mb-3" />
          <p className="text-[#1B2A4A] dark:text-[#F5F0E8] font-medium">No readathons yet</p>
          <p className="text-sm text-[#6B7280] dark:text-gray-400 mt-1">Create your first one to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {readathons.map((r) => {
            const prizes = prizeBreakdown(r);
            const isExpanded = expandedId === r.id;
            const lb = leaderboards[r.id] ?? [];
            const st = stats[r.id];

            return (
              <div key={r.id} className="bg-white dark:bg-gray-800 border border-[#e8e8d5] dark:border-gray-700 rounded-2xl overflow-hidden">

                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-[#1B2A4A] dark:text-[#F5F0E8] truncate">{r.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusBadge(r.status)}`}>
                          {r.status}
                        </span>
                      </div>
                      {r.description && (
                        <p className="text-sm text-[#6B7280] dark:text-gray-400 mt-1 line-clamp-2">{r.description}</p>
                      )}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-[#6B7280] dark:text-gray-400">
                        <span>📅 {new Date(r.start_date).toLocaleDateString()} → {new Date(r.end_date).toLocaleDateString()}</span>
                        <span>💲 ${r.entry_fee.toFixed(2)} entry</span>
                        <span>🏆 ${r.prize_pool.toFixed(2)} pool</span>
                        <span>🥇 ${prizes.first} / 🥈 ${prizes.second} / 🥉 ${prizes.third}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {r.status === 'upcoming' && (
                        <button
                          onClick={() => handleStatusChange(r.id, 'active')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-500 text-xs font-semibold hover:bg-green-500/20 transition-colors border border-green-500/20"
                        >
                          <Play size={12} /> Start
                        </button>
                      )}
                      {r.status === 'active' && (
                        <button
                          onClick={() => handleStatusChange(r.id, 'ended')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-colors border border-red-500/20"
                        >
                          <Square size={12} /> End
                        </button>
                      )}
                      {r.status === 'ended' && (
                        <button
                          onClick={() => handleCloseAndPay(r.id, r.title)}
                          disabled={payingOut === r.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4A843]/10 text-[#D4A843] text-xs font-semibold hover:bg-[#D4A843]/20 transition-colors border border-[#D4A843]/20"
                        >
                          <DollarSign size={12} />
                          {payingOut === r.id ? 'Paying...' : 'Close & Pay Out'}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(r.id, r.title)}
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-500/10 transition-colors"
                        title="Delete readathon"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button
                        onClick={() => toggleExpand(r.id)}
                        className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#1B2A4A] dark:hover:text-[#F5F0E8] transition-colors"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-[#e8e8d5] dark:border-gray-700 p-5 space-y-4">
                    {st && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
                            <span className="text-xs text-[#6B7280] dark:text-gray-400 font-medium">Entry Pool</span>
                          </div>
                          <p className="text-xl font-bold text-[#1B2A4A] dark:text-[#F5F0E8]">${st.total_pool.toFixed(2)}</p>
                        </div>
                        <div className="bg-[#F5F0E8] dark:bg-gray-700/50 rounded-xl p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5 mb-1">
                            <BookOpen size={14} className="text-[#D4A843]" />
                            <span className="text-xs text-[#6B7280] dark:text-gray-400 font-medium">Active Readers</span>
                          </div>
                          <p className="text-xl font-bold text-[#1B2A4A] dark:text-[#F5F0E8]">{lb.length}</p>
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="text-sm font-semibold text-[#1B2A4A] dark:text-[#F5F0E8] mb-3">Leaderboard</h4>
                      {loadingLeaderboard === r.id ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="w-5 h-5 border-2 border-[#D4A843] border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : lb.length === 0 ? (
                        <p className="text-sm text-[#6B7280] dark:text-gray-400 text-center py-6">No quiz completions yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {lb.map((entry) => (
                            <div
                              key={entry.user_id}
                              className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                                entry.rank <= 3
                                  ? 'border-[#D4A843]/30 bg-[#D4A843]/5'
                                  : 'border-[#e8e8d5] dark:border-gray-700 bg-[#F5F0E8] dark:bg-gray-700/30'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-base w-8 text-center">{rankMedal(entry.rank)}</span>
                                <div>
                                  <p className="text-sm font-medium text-[#1B2A4A] dark:text-[#F5F0E8]">{entry.display_name}</p>
                                  <p className="text-xs text-[#6B7280] dark:text-gray-400">{entry.books_completed} book{entry.books_completed !== 1 ? 's' : ''} completed</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-[#1B2A4A] dark:text-[#F5F0E8]">{entry.total_pages.toLocaleString()}</p>
                                <p className="text-xs text-[#6B7280] dark:text-gray-400">pages</p>
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
