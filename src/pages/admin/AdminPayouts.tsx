import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface CashoutRequest {
  id: string;
  user_id: string;
  amount: number;
  payout_type: string;
  payout_details: string;
  gift_card_brand: string | null;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  requires_tax_review: boolean;
  created_at: string;
  profiles: { email: string; username: string | null; available_balance: number } | null;
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'paid' | 'rejected' | 'tax_review';

export function AdminPayouts() {
  const [requests, setRequests] = useState<CashoutRequest[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data } = await supabase
      .from('cashout_requests')
      .select('*, profiles(email, username, available_balance)')
      .order('created_at', { ascending: false });
    setRequests(data || []);
    setLoading(false);
  }

  async function handleApprove(id: string) {
    setError('');
    const { data, error: fnErr } = await supabase.functions.invoke('process-cashout', {
      body: { cashout_id: id },
    });

    if (fnErr || data?.error) {
      setError(`Payout failed: ${data?.error ?? fnErr?.message}`);
      return;
    }

    setSuccess(data?.manual ? 'Approved — send payment manually then mark paid.' : 'Payment sent successfully!');
    loadData();
  }

  async function handleUpdateStatus(
    id: string,
    status: 'paid' | 'rejected'
  ) {
    const { data: req, error: fetchErr } = await supabase
      .from('cashout_requests')
      .select('user_id, amount')
      .eq('id', id)
      .single();

    if (fetchErr || !req) { setError('Could not find request.'); return; }

    const { error: err } = await supabase
      .from('cashout_requests')
      .update({ status })
      .eq('id', id);

    if (err) { setError('Failed to update status.'); return; }

    if (status === 'rejected') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('available_balance, held_balance')
        .eq('id', req.user_id)
        .single();

      if (profile) {
        await supabase
          .from('profiles')
          .update({
            available_balance: profile.available_balance + profile.held_balance,
            held_balance: 0,
          })
          .eq('id', req.user_id);
      }
    }

    if (status === 'paid') {
      await supabase
        .from('profiles')
        .update({ held_balance: 0 })
        .eq('id', req.user_id);
    }

    setSuccess(`Request marked as ${status}.`);
    loadData();
  }

  async function handleClearTaxFlag(id: string) {
    await supabase
      .from('cashout_requests')
      .update({ requires_tax_review: false })
      .eq('id', id);
    setSuccess('Tax review flag cleared.');
    loadData();
  }

  const filtered = requests.filter((r) => {
    if (filter === 'tax_review') return r.requires_tax_review;
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const counts = {
    all: requests.length,
    pending: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    paid: requests.filter((r) => r.status === 'paid').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
    tax_review: requests.filter((r) => r.requires_tax_review).length,
  };

  const FILTERS: { key: FilterStatus; label: string }[] = [
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'paid', label: 'Paid' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'tax_review', label: '⚠ Tax Review' },
    { key: 'all', label: 'All' },
  ];

  const statusColor = (status: CashoutRequest['status']) => {
    if (status === 'paid') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (status === 'approved') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    if (status === 'rejected') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
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

      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-[#1B2A4A] dark:text-[#F5F0E8]">
          Payouts
          {counts.tax_review > 0 && (
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 font-medium">
              {counts.tax_review} tax review
            </span>
          )}
        </h2>
        <p className="text-sm text-[#6B7280] dark:text-gray-400">
          {counts.pending} pending · ${requests.filter((r) => r.status === 'pending').reduce((sum, r) => sum + r.amount, 0).toFixed(2)} queued
        </p>
      </div>

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

      {loading ? (
        <p className="text-sm text-[#6B7280] dark:text-gray-400">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-[#6B7280] dark:text-gray-400">No requests in this category.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <div
              key={req.id}
              className={`bg-white dark:bg-gray-800 rounded-xl border p-4 space-y-3 ${
                req.requires_tax_review
                  ? 'border-orange-300 dark:border-orange-700'
                  : 'border-[#e8e0d5] dark:border-gray-700'
              }`}
            >
              {req.requires_tax_review && (
                <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg px-3 py-2 text-orange-700 dark:text-orange-400 text-xs">
                  <AlertTriangle size={13} />
                  Tax review required — projected balance exceeds $500
                </div>
              )}

              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="font-medium text-[#1B2A4A] dark:text-[#F5F0E8]">
                    {req.profiles?.username ?? 'Unknown User'}
                  </p>
                  <p className="text-xs text-[#6B7280] dark:text-gray-400 mt-0.5">
                    {req.profiles?.email ?? req.user_id}
                  </p>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm">
                    <span className="text-[#1B2A4A] dark:text-[#F5F0E8] font-semibold">
                      ${req.amount.toFixed(2)}
                    </span>
                    <span className="text-[#6B7280] dark:text-gray-400 capitalize">
                      via {req.payout_type === 'gift_card' ? `Gift Card (${req.gift_card_brand ?? 'Unknown'})` : req.payout_type}
                    </span>
                    {req.payout_type !== 'gift_card' && req.payout_details && (
                      <span className="text-[#6B7280] dark:text-gray-400">{req.payout_details}</span>
                    )}
                    <span className="text-[#6B7280] dark:text-gray-400">
                      Balance: ${req.profiles?.available_balance?.toFixed(2) ?? '—'}
                    </span>
                    <span className="text-[#6B7280] dark:text-gray-400">
                      {new Date(req.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${statusColor(req.status)}`}>
                  {req.status}
                </span>
              </div>

              <div className="flex gap-2 flex-wrap">
                {req.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleApprove(req.id)}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-blue-400 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
                    >
                      <CheckCircle size={12} /> Approve & Send
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(req.id, 'rejected')}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-red-300 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                    >
                      <X size={12} /> Reject
                    </button>
                  </>
                )}
                {req.status === 'approved' && (
                  <button
                    onClick={() => handleUpdateStatus(req.id, 'paid')}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-green-400 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition"
                  >
                    <Clock size={12} /> Mark Paid
                  </button>
                )}
                {req.requires_tax_review && (
                  <button
                    onClick={() => handleClearTaxFlag(req.id)}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-orange-300 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition ml-auto"
                  >
                    <AlertTriangle size={12} /> Clear Tax Flag
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
