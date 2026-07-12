import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

async function sendEmail(to: string, subject: string, html: string) {
  await supabase.functions.invoke('send-email', { body: { to, subject, html } });
}

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
  const [runningReferralPayouts, setRunningReferralPayouts] = useState(false);

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
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('process-cashout', {
        body: { cashout_id: id },
      });

      if (fnErr) {
        // Try to get the actual error body from the context
        const detail = (fnErr as any).context
          ? await (fnErr as any).context.json().then((j: any) => j.error).catch(() => fnErr.message)
          : fnErr.message;
        setError(`Payout failed: ${detail}`);
        return;
      }

      if (data?.error) {
        setError(`Payout failed: ${data.error}`);
        return;
      }

      setSuccess(data?.manual ? 'Approved — send payment manually then mark paid.' : 'Payment sent successfully!');
      loadData();
    } catch (e: any) {
      setError(`Payout failed: ${e.message}`);
    }
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

    const { data: userProfile } = await supabase
      .from('profiles')
      .select('email, username, available_balance, held_balance')
      .eq('id', req.user_id)
      .single();

    if (status === 'rejected') {
      if (userProfile) {
        await supabase
          .from('profiles')
          .update({
            available_balance: userProfile.available_balance + userProfile.held_balance,
            held_balance: 0,
          })
          .eq('id', req.user_id);
      }
      if (userProfile?.email) {
        await sendEmail(
          userProfile.email,
          'Your Cashout Request Was Not Approved',
          `<p>Hi ${userProfile.username || 'there'},</p>
          <p>Unfortunately your cashout request for <strong>$${req.amount.toFixed(2)}</strong> could not be approved at this time.</p>
          <p>Your balance of $${req.amount.toFixed(2)} has been restored to your account and is available for future requests.</p>
          <p>If you have questions, reply to this email.</p>
          <p>— The ReadToEarn Team</p>`
        );
      }
    }

    if (status === 'paid') {
      await supabase
        .from('profiles')
        .update({ held_balance: 0 })
        .eq('id', req.user_id);
      if (userProfile?.email) {
        await sendEmail(
          userProfile.email,
          'Your Cashout Has Been Sent! 💸',
          `<p>Hi ${userProfile.username || 'there'},</p>
          <p>Great news — your cashout of <strong>$${req.amount.toFixed(2)}</strong> has been processed and sent to you.</p>
          <p>Please allow 1–3 business days for delivery depending on your payout method.</p>
          <p>Thanks for being part of ReadToEarn!</p>
          <p>— The ReadToEarn Team</p>`
        );
      }
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

  async function handleRunReferralPayouts() {
    if (!window.confirm('Run monthly referral payouts now? This will credit $0.50 per active referral to all referrers and send email notifications.')) return;
    setRunningReferralPayouts(true);
    setError('');
    setSuccess('');
    const { data, error: fnError } = await supabase.functions.invoke('process-referral-payouts');
    if (fnError) {
      setError('Referral payout failed: ' + fnError.message);
    } else {
      setSuccess(`Referral payouts complete — ${data?.payouts ?? 0} referrer(s) paid.`);
    }
    setRunningReferralPayouts(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={handleRunReferralPayouts}
          disabled={runningReferralPayouts}
          className="text-sm px-4 py-2 bg-[#D4A843] text-[#1B2A4A] font-bold rounded-lg hover:bg-[#c49a38] disabled:opacity-50 transition"
        >
          {runningReferralPayouts ? 'Running...' : '💰 Run Monthly Referral Payouts'}
        </button>
      </div>
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
                      via {req.payout_type === 'gift_card' ? `Gift Card (${req.gift_card_brand ?? 'Unknown'})` : req.payout_type === 'bank_transfer' ? 'Bank Transfer' : req.payout_type}
                    </span>
                    <span className="text-[#6B7280] dark:text-gray-400">
                      Balance: ${req.profiles?.available_balance?.toFixed(2) ?? '—'}
                    </span>
                    <span className="text-[#6B7280] dark:text-gray-400">
                      {new Date(req.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Payout Details - formatted for readability */}
                  {req.payout_type !== 'gift_card' && req.payout_details && (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                      <p className="text-xs font-medium text-[#6B7280] dark:text-gray-400 mb-1">Payout Details:</p>
                      {req.payout_type === 'bank_transfer' ? (
                        <div className="text-xs text-[#1B2A4A] dark:text-[#F5F0E8] space-y-0.5">
                          {req.payout_details.split(' | ').map((part, i) => (
                            <p key={i}>{part}</p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-[#1B2A4A] dark:text-[#F5F0E8]">{req.payout_details}</p>
                      )}
                    </div>
                  )}
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
