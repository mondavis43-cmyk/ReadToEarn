import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

type Status = 'pending' | 'approved' | 'rejected';

interface BookRequest {
  id: string;
  user_id: string;
  book_title: string;
  author_name: string;
  questions: any[];
  status: Status;
  created_at: string;
  admin_note?: string;
}

const STATUS_OPTIONS: (Status | 'all')[] = ['all', 'pending', 'approved', 'rejected'];

export function AdminBookRequests() {
  const { isDark } = useTheme();
  const [requests, setRequests]       = useState<BookRequest[]>([]);
  const [loading, setLoading]         = useState(false);
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('pending');
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const textPrimary = isDark ? 'text-[#F5F0E8]'    : 'text-[#1B2A4A]';
  const textMuted   = isDark ? 'text-[#F5F0E8]/60'  : 'text-[#1B2A4A]/60';
  const cardBg      = isDark
    ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20'
    : 'bg-white border-[#D4A843]/30';
  const divider     = isDark ? 'border-[#F5F0E8]/10' : 'border-[#1B2A4A]/10';

  useEffect(() => { fetchRequests(); fetchPendingCount(); }, [statusFilter]);

  async function fetchRequests() {
    setLoading(true);
    let query = supabase
      .from('book_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    const { data } = await query;
    setRequests((data || []).map((r: any) => ({ ...r, status: r.status ?? 'pending' })));
    setLoading(false);
  }

  async function fetchPendingCount() {
    const { count } = await supabase
      .from('book_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .then(res => res);
    setPendingCount(count || 0);
  }

  async function updateStatus(id: string, status: Status) {
    const { error } = await supabase.from('book_requests').update({ status }).eq('id', id);
    if (error) { console.error('update status error:', error); return; }
    setRequests((prev: BookRequest[]) => {
      const updated = prev.map((r: BookRequest) => r.id === id ? { ...r, status } : r);
      return statusFilter !== 'all' ? updated.filter((r: BookRequest) => r.status === statusFilter) : updated;
    });
    if (status !== 'pending') setPendingCount((prev: number) => Math.max(0, prev - 1));
  }

  const StatusBadge = ({ status }: { status: Status }) => {
    const map = {
      pending:  { icon: <Clock size={12} />,       cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
      approved: { icon: <CheckCircle size={12} />, cls: 'bg-green-500/20 text-green-400 border-green-500/30'   },
      rejected: { icon: <XCircle size={12} />,     cls: 'bg-red-500/20 text-red-400 border-red-500/30'         },
    };
    const { icon, cls } = map[status];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border font-medium ${cls}`}>
        {icon}{status}
      </span>
    );
  };

  return (
    <div className="space-y-4">

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`font-serif text-2xl ${textPrimary}`}>
            Book Requests
            {pendingCount > 0 && (
              <span className="ml-2 bg-[#D4A843] text-[#1B2A4A] text-sm font-bold px-2 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </h2>
          <p className={`text-sm mt-0.5 ${textMuted}`}>
            Reader-submitted book suggestions with optional quiz questions.
          </p>
        </div>
        <button
          onClick={() => { fetchRequests(); fetchPendingCount(); }}
          className={`p-2 rounded-lg border transition-colors ${isDark ? 'border-[#F5F0E8]/20 hover:border-[#D4A843]/40' : 'border-[#1B2A4A]/20 hover:border-[#D4A843]/40'}`}
        >
          <RefreshCw size={15} className={textMuted} />
        </button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_OPTIONS.map(opt => (
          <button
            key={opt}
            onClick={() => setStatusFilter(opt)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize ${
              statusFilter === opt
                ? 'bg-[#D4A843] border-[#D4A843] text-[#1B2A4A]'
                : isDark
                  ? 'border-[#F5F0E8]/20 text-[#F5F0E8]/60 hover:border-[#D4A843]/40'
                  : 'border-[#1B2A4A]/20 text-[#1B2A4A]/60 hover:border-[#D4A843]/40'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className={`text-center py-16 text-sm ${textMuted}`}>Loading...</div>
      ) : requests.length === 0 ? (
        <div className={`text-center py-16 text-sm ${textMuted}`}>
          No {statusFilter === 'all' ? '' : statusFilter} book requests.
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => {
            const isExpanded = expandedId === req.id;
            const user = req.profiles;
            return (
              <div key={req.id} className={`rounded-xl border overflow-hidden ${cardBg}`}>

                {/* Row */}
                <div className="flex items-center justify-between px-5 py-4 gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <StatusBadge status={req.status} />
                    <div className="min-w-0">
                      <p className={`font-semibold text-sm truncate ${textPrimary}`}>
                        {req.book_title}
                      </p>
                      <p className={`text-xs truncate ${textMuted}`}>
                        by {req.author_name}
                        {req.user_id ? ` · ${req.user_id.slice(0, 8)}…` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs ${textMuted}`}>
                      {new Date(req.created_at).toLocaleDateString()}
                    </span>
                    {req.questions?.length > 0 && (
                      <span className="text-xs bg-[#D4A843]/10 border border-[#D4A843]/30 text-[#D4A843] px-2 py-0.5 rounded-full">
                        {req.questions.length} Q{req.questions.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : req.id)}
                      className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-[#F5F0E8]/10' : 'hover:bg-[#1B2A4A]/10'}`}
                    >
                      {isExpanded
                        ? <ChevronUp size={16} className={textMuted} />
                        : <ChevronDown size={16} className={textMuted} />}
                    </button>
                  </div>
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div className={`border-t ${divider} px-5 py-5 space-y-5`}>

                    {/* Submitted questions */}
                    {req.questions?.length > 0 ? (
                      <div>
                        <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${textMuted}`}>
                          Submitted Quiz Questions
                        </p>
                        <ol className="space-y-3">
                          {req.questions.map((q: any, i: number) => (
                            <li
                              key={i}
                              className={`rounded-lg p-4 border text-sm ${
                                isDark
                                  ? 'bg-[#0f1623]/40 border-[#F5F0E8]/10'
                                  : 'bg-[#F5F0E8]/60 border-[#1B2A4A]/10'
                              }`}
                            >
                              <p className={`font-medium mb-2 ${textPrimary}`}>
                                <span className={`mr-1.5 ${textMuted}`}>Q{i + 1}.</span>
                                {q.question}
                              </p>
                              <p className="text-green-500 text-xs mb-1">✓ {q.correct_answer}</p>
                              {[q.wrong_answer_1, q.wrong_answer_2, q.wrong_answer_3]
                                .filter(Boolean)
                                .map((w: string, wi: number) => (
                                  <p key={wi} className={`text-xs ${textMuted}`}>✗ {w}</p>
                                ))}
                            </li>
                          ))}
                        </ol>
                      </div>
                    ) : (
                      <p className={`text-sm italic ${textMuted}`}>No quiz questions submitted.</p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap">
                      {req.status !== 'approved' && (
                        <button
                          onClick={() => updateStatus(req.id, 'approved')}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-green-600 text-white hover:bg-green-500 transition-colors"
                        >
                          <CheckCircle size={14} /> Approve
                        </button>
                      )}
                      {req.status !== 'rejected' && (
                        <button
                          onClick={() => updateStatus(req.id, 'rejected')}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-red-600/80 text-white hover:bg-red-500 transition-colors"
                        >
                          <XCircle size={14} /> Reject
                        </button>
                      )}
                      {req.status !== 'pending' && (
                        <button
                          onClick={() => updateStatus(req.id, 'pending')}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors ${
                            isDark
                              ? 'border-[#F5F0E8]/20 text-[#F5F0E8]/60 hover:border-[#F5F0E8]/40'
                              : 'border-[#1B2A4A]/20 text-[#1B2A4A]/60 hover:border-[#1B2A4A]/40'
                          }`}
                        >
                          <Clock size={14} /> Reset to Pending
                        </button>
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
