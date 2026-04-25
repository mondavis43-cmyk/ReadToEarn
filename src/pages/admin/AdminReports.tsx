import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X, CheckCircle, Trash2 } from 'lucide-react';

interface QuestionReport {
  id: string;
  question_id: string;
  user_id: string;
  reason: string;
  details: string | null;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
  questions: {
    question_text: string;
    correct_answer: string;
    wrong_answer_1: string;
    wrong_answer_2: string;
    wrong_answer_3: string;
    books: { title: string; author: string } | null;
  } | null;
  profiles: { email: string; full_name: string | null } | null;
}

type FilterStatus = 'pending' | 'resolved' | 'dismissed' | 'all';

export function AdminReports() {
  const [reports, setReports] = useState<QuestionReport[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('pending');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data } = await supabase
      .from('question_reports')
      .select(`
        *,
        questions(
          question_text,
          correct_answer,
          wrong_answer_1,
          wrong_answer_2,
          wrong_answer_3,
          books(title, author)
        ),
        profiles(email, full_name)
      `)
      .order('created_at', { ascending: false });
    setReports(data || []);
    setLoading(false);
  }

  async function handleUpdateStatus(id: string, status: 'resolved' | 'dismissed') {
    const { error: err } = await supabase
      .from('question_reports')
      .update({ status })
      .eq('id', id);
    if (err) { setError('Failed to update report.'); return; }
    setSuccess(`Report marked as ${status}.`);
    loadData();
  }

  async function handleDeleteQuestion(questionId: string, reportId: string) {
    if (!confirm('Delete this question from the database? This cannot be undone.')) return;
    await supabase.from('questions').delete().eq('id', questionId);
    await supabase.from('question_reports').update({ status: 'resolved' }).eq('id', reportId);
    setSuccess('Question deleted and report resolved.');
    loadData();
  }

  const filtered = reports.filter((r) =>
    filter === 'all' ? true : r.status === filter
  );

  const counts = {
    pending: reports.filter((r) => r.status === 'pending').length,
    resolved: reports.filter((r) => r.status === 'resolved').length,
    dismissed: reports.filter((r) => r.status === 'dismissed').length,
    all: reports.length,
  };

  const FILTERS: { key: FilterStatus; label: string }[] = [
    { key: 'pending', label: 'Pending' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'dismissed', label: 'Dismissed' },
    { key: 'all', label: 'All' },
  ];

  const reasonColor = (reason: string) => {
    if (reason === 'Answer incorrect') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    if (reason === 'Spoiler') return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    if (reason === 'Confusing') return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    if (reason === 'Typo') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
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
          Question Reports
          {counts.pending > 0 && (
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-medium">
              {counts.pending} pending
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
        <p className="text-sm text-[#6B7280] dark:text-gray-400">No reports in this category.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((report) => {
            const q = report.questions;
            const isExpanded = expanded === report.id;
            return (
              <div
                key={report.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e0d5] dark:border-gray-700 p-4 space-y-3"
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${reasonColor(report.reason)}`}>
                        {report.reason}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        report.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : report.status === 'resolved'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {report.status}
                      </span>
                    </div>
                    <p className="text-sm text-[#1B2A4A] dark:text-[#F5F0E8] mt-1 font-medium">
                      {q?.books?.title ?? 'Unknown Book'} — {q?.books?.author ?? ''}
                    </p>
                    <p className="text-xs text-[#6B7280] dark:text-gray-400 mt-0.5">
                      Reported by {report.profiles?.email ?? report.user_id} · {new Date(report.created_at).toLocaleDateString()}
                    </p>
                    {report.details && (
                      <p className="text-xs text-[#6B7280] dark:text-gray-400 mt-1 italic">
                        "{report.details}"
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setExpanded(isExpanded ? null : report.id)}
                    className="text-xs text-[#D4A843] hover:underline shrink-0"
                  >
                    {isExpanded ? 'Hide' : 'View question'}
                  </button>
                </div>

                {/* Expanded question detail */}
                {isExpanded && q && (
                  <div className="bg-[#F5F0E8] dark:bg-gray-700/50 rounded-lg p-4 space-y-2 text-sm">
                    <p className="font-medium text-[#1B2A4A] dark:text-[#F5F0E8]">
                      Q: {q.question_text}
                    </p>
                    <p className="text-green-700 dark:text-green-400">
                      ✓ {q.correct_answer}
                    </p>
                    <div className="text-[#6B7280] dark:text-gray-400 space-y-1">
                      <p>✗ {q.wrong_answer_1}</p>
                      <p>✗ {q.wrong_answer_2}</p>
                      <p>✗ {q.wrong_answer_3}</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                {report.status === 'pending' && (
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleUpdateStatus(report.id, 'dismissed')}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-[#6B7280] hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                      <X size={12} /> Dismiss
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(report.id, 'resolved')}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-green-400 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition"
                    >
                      <CheckCircle size={12} /> Mark Resolved
                    </button>
                    {report.question_id && (
                      <button
                        onClick={() => handleDeleteQuestion(report.question_id, report.id)}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-red-300 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition ml-auto"
                      >
                        <Trash2 size={12} /> Delete Question
                      </button>
                    )}
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
