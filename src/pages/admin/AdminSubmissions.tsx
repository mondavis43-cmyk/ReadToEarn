import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, Edit2, Save, X } from 'lucide-react';

type SubmissionStatus = 'pending' | 'approved' | 'rejected';
type Tab = 'bounties' | 'competitions' | 'quick_tasks' | 'surveys' | 'beta' | 'sensitivity';

interface Question {
  id: string;
  question: string;
  required: boolean;
}

const TAB_LABELS: Record<Tab, string> = {
  bounties:     'Bounties',
  competitions: 'Competitions',
  quick_tasks:  'Quick Tasks',
  surveys:      'Surveys',
  beta:         'Beta Readers',
  sensitivity:  'Sensitivity Readers',
};

const TAB_TABLES: Record<Tab, string> = {
  bounties:     'author_bounty_submissions',
  competitions: 'author_competition_submissions',
  quick_tasks:  'author_quick_task_submissions',
  surveys:      'author_survey_submissions',
  beta:         'author_beta_reader_submissions',
  sensitivity:  'author_sensitivity_submissions',
};

const STATUS_FILTER_OPTIONS: (SubmissionStatus | 'all')[] = ['all', 'pending', 'approved', 'rejected'];

// Fields shown in expanded detail view (non-question fields)
const DETAIL_FIELDS: Record<Tab, { key: string; label: string }[]> = {
  bounties: [
    { key: 'book_title',        label: 'Book Title' },
    { key: 'pool_size',         label: 'Pool Size ($)' },
    { key: 'platform_fee',      label: 'Platform Fee ($)' },
    { key: 'reader_pool',       label: 'Reader Pool ($)' },
    { key: 'per_pass_amount',   label: 'Per Pass ($)' },
    { key: 'estimated_readers', label: 'Est. Readers' },
    { key: 'notes',             label: 'Notes' },
  ],
  competitions: [
    { key: 'book_titles',      label: 'Book Titles' },
    { key: 'tier_label',       label: 'Tier' },
    { key: 'price',            label: 'Entry Fee ($)' },
    { key: 'platform_fee',     label: 'Platform Fee ($)' },
    { key: 'prize_pool',       label: 'Prize Pool ($)' },
    { key: 'competition_type', label: 'Type' },
    { key: 'notes',            label: 'Notes' },
  ],
  quick_tasks: [
    { key: 'book_title',       label: 'Book Title' },
    { key: 'tier_label',       label: 'Tier' },
    { key: 'price',            label: 'Price ($)' },
    { key: 'platform_fee',     label: 'Platform Fee ($)' },
    { key: 'prize_pool',       label: 'Prize Pool ($)' },
    { key: 'notes',            label: 'Notes' },
  ],
  // surveys/beta/sensitivity: standard fields only — questions rendered separately
  surveys: [
    { key: 'book_title',    label: 'Book Title' },
    { key: 'package_label', label: 'Package' },
    { key: 'responses',     label: 'Responses' },
    { key: 'price',         label: 'Price ($)' },
    { key: 'excerpt',       label: 'Excerpt' },
    { key: 'notes',         label: 'Notes' },
  ],
  beta: [
    { key: 'book_title',    label: 'Book Title' },
    { key: 'genre',         label: 'Genre' },
    { key: 'package_label', label: 'Package' },
    { key: 'readers',       label: 'Readers' },
    { key: 'price',         label: 'Price ($)' },
    { key: 'blurb',         label: 'Blurb' },
    { key: 'excerpt',       label: 'Excerpt' },
    { key: 'notes',         label: 'Notes' },
  ],
  sensitivity: [
    { key: 'book_title',    label: 'Book Title' },
    { key: 'package_label', label: 'Package' },
    { key: 'readers',       label: 'Readers' },
    { key: 'price',         label: 'Price ($)' },
    { key: 'chapter_text',  label: 'Chapter Text' },
    { key: 'context',       label: 'Context' },
  ],
};

// Fields editable inline
const EDITABLE_FIELDS: Record<Tab, { key: string; label: string; type: 'input' | 'textarea' }[]> = {
  bounties: [
    { key: 'pool_size',         label: 'Pool Size ($)',    type: 'input'    },
    { key: 'platform_fee',      label: 'Platform Fee ($)', type: 'input'    },
    { key: 'reader_pool',       label: 'Reader Pool ($)',  type: 'input'    },
    { key: 'per_pass_amount',   label: 'Per Pass ($)',     type: 'input'    },
    { key: 'estimated_readers', label: 'Est. Readers',     type: 'input'    },
    { key: 'notes',             label: 'Notes',            type: 'textarea' },
  ],
  competitions: [
    { key: 'price',            label: 'Entry Fee ($)',    type: 'input'    },
    { key: 'platform_fee',     label: 'Platform Fee ($)', type: 'input'    },
    { key: 'prize_pool',       label: 'Prize Pool ($)',   type: 'input'    },
    { key: 'competition_type', label: 'Type',             type: 'input'    },
    { key: 'notes',            label: 'Notes',            type: 'textarea' },
  ],
  quick_tasks: [
    { key: 'price',        label: 'Price ($)',        type: 'input'    },
    { key: 'platform_fee', label: 'Platform Fee ($)', type: 'input'    },
    { key: 'prize_pool',   label: 'Prize Pool ($)',   type: 'input'    },
    { key: 'notes',        label: 'Notes',            type: 'textarea' },
  ],
  surveys: [
    { key: 'price',     label: 'Price ($)',    type: 'input'    },
    { key: 'responses', label: 'Responses',    type: 'input'    },
    { key: 'notes',     label: 'Notes',        type: 'textarea' },
  ],
  beta: [
    { key: 'price',   label: 'Price ($)', type: 'input'    },
    { key: 'readers', label: 'Readers',   type: 'input'    },
    { key: 'notes',   label: 'Notes',     type: 'textarea' },
  ],
  sensitivity: [
    { key: 'price',   label: 'Price ($)', type: 'input'    },
    { key: 'readers', label: 'Readers',   type: 'input'    },
    { key: 'context', label: 'Context',   type: 'textarea' },
  ],
};

// Tabs that have custom_questions to render
const QUESTION_TABS: Tab[] = ['surveys', 'beta', 'sensitivity'];

// ── helpers ────────────────────────────────────────────────────────────────────

function parseQuestions(raw: unknown): Question[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) return parsed as Question[];
  } catch {
    // legacy plain text — wrap as single question
    if (typeof raw === 'string' && raw.trim()) {
      return [{ id: 'legacy', question: raw.trim(), required: false }];
    }
  }
  return [];
}

function parseIdentities(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as string[];
  try {
    const parsed = JSON.parse(raw as string);
    if (Array.isArray(parsed)) return parsed as string[];
  } catch { /* ignore */ }
  return [];
}

// ── component ──────────────────────────────────────────────────────────────────

export const AdminSubmissions = () => {
  const { isDark } = useTheme();

  const [activeTab, setActiveTab]       = useState<Tab>('bounties');
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | 'all'>('pending');
  const [submissions, setSubmissions]   = useState<any[]>([]);
  const [loading, setLoading]           = useState(false);
  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [editDraft, setEditDraft]       = useState<Record<string, any>>({});
  const [pendingCounts, setPendingCounts] = useState<Record<Tab, number>>({
    bounties: 0, competitions: 0, quick_tasks: 0,
    surveys: 0, beta: 0, sensitivity: 0,
  });

  // ── theme tokens ─────────────────────────────────────────────────────────────
  const pageBg      = isDark ? 'bg-[#0f1623]'        : 'bg-[#F5F0E8]';
  const textPrimary = isDark ? 'text-[#F5F0E8]'      : 'text-[#1B2A4A]';
  const textMuted   = isDark ? 'text-[#F5F0E8]/60'   : 'text-[#1B2A4A]/60';
  const cardBg      = isDark
    ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20'
    : 'bg-white border-[#D4A843]/30';
  const inputCls    = `w-full px-3 py-2 rounded-lg border text-sm focus:outline-none transition-colors ${
    isDark
      ? 'bg-[#0f1623] border-[#F5F0E8]/10 text-[#F5F0E8] focus:border-[#D4A843]/60'
      : 'bg-white border-[#1B2A4A]/20 text-[#1B2A4A] focus:border-[#D4A843]/60'
  }`;
  const divider     = isDark ? 'border-[#F5F0E8]/10' : 'border-[#1B2A4A]/10';

  // ── data fetching ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchSubmissions();
    fetchAllPendingCounts();
  }, [activeTab, statusFilter]);

  const fetchSubmissions = async () => {
    setLoading(true);
    setExpandedId(null);
    setEditingId(null);
    const table = TAB_TABLES[activeTab];
    let query = supabase.from(table).select('*').order('created_at', { ascending: false });
    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    const { data } = await query;
    setSubmissions(data || []);
    setLoading(false);
  };

  const fetchAllPendingCounts = async () => {
    const counts = { ...pendingCounts };
    await Promise.all(
      (Object.keys(TAB_TABLES) as Tab[]).map(async tab => {
        const { count } = await supabase
          .from(TAB_TABLES[tab])
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        counts[tab] = count || 0;
      })
    );
    setPendingCounts(counts);
  };

  // ── actions ───────────────────────────────────────────────────────────────────
  const updateStatus = async (id: string, status: SubmissionStatus) => {
    const table = TAB_TABLES[activeTab];
    await supabase.from(table).update({ status }).eq('id', id);
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    setPendingCounts(prev => ({
      ...prev,
      [activeTab]: Math.max(0, prev[activeTab] - 1),
    }));
  };

  const startEdit = (submission: any) => {
    const draft: Record<string, any> = {};
    EDITABLE_FIELDS[activeTab].forEach(f => { draft[f.key] = submission[f.key] ?? ''; });
    setEditDraft(draft);
    setEditingId(submission.id);
  };

  const cancelEdit = () => { setEditingId(null); setEditDraft({}); };

  const saveEdit = async (id: string) => {
    const table = TAB_TABLES[activeTab];
    await supabase.from(table).update(editDraft).eq('id', id);
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, ...editDraft } : s));
    setEditingId(null);
    setEditDraft({});
  };

  const saveAndApprove = async (id: string) => {
    await saveEdit(id);
    await updateStatus(id, 'approved');
  };

  // ── status badge ──────────────────────────────────────────────────────────────
  const StatusBadge = ({ status }: { status: SubmissionStatus }) => {
    const map = {
      pending:  { icon: <Clock size={12} />,        cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
      approved: { icon: <CheckCircle size={12} />,  cls: 'bg-green-500/20 text-green-400 border-green-500/30'   },
      rejected: { icon: <XCircle size={12} />,      cls: 'bg-red-500/20 text-red-400 border-red-500/30'         },
    };
    const { icon, cls } = map[status];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border font-medium ${cls}`}>
        {icon}{status}
      </span>
    );
  };

  // ── question list renderer ────────────────────────────────────────────────────
  const QuestionList = ({ raw }: { raw: unknown }) => {
    const questions = parseQuestions(raw);
    if (questions.length === 0) return (
      <p className={`text-xs italic ${textMuted}`}>No questions submitted.</p>
    );
    return (
      <ol className="space-y-2">
        {questions.map((q, idx) => (
          <li key={q.id || idx} className={`rounded-lg p-3 border ${isDark ? 'border-[#F5F0E8]/10 bg-[#0f1623]/40' : 'border-[#1B2A4A]/10 bg-[#F5F0E8]/60'}`}>
            <div className="flex items-start justify-between gap-2">
              <p className={`text-sm ${textPrimary}`}>
                <span className={`font-semibold mr-1.5 ${textMuted}`}>Q{idx + 1}.</span>
                {q.question}
              </p>
              <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full border ${
                q.required
                  ? 'bg-[#D4A843]/10 border-[#D4A843]/40 text-[#D4A843]'
                  : isDark ? 'border-[#F5F0E8]/10 text-[#F5F0E8]/40' : 'border-[#1B2A4A]/10 text-[#1B2A4A]/40'
              }`}>
                {q.required ? 'Required' : 'Optional'}
              </span>
            </div>
          </li>
        ))}
      </ol>
    );
  };

  // ── identity pills renderer ─────────────────────────────────────────────────--
  const IdentityPills = ({ raw }: { raw: unknown }) => {
    const identities = parseIdentities(raw);
    if (identities.length === 0) return (
      <p className={`text-xs italic ${textMuted}`}>None specified.</p>
    );
    return (
      <div className="flex flex-wrap gap-1.5">
        {identities.map(identity => (
          <span
            key={identity}
            className={`px-2.5 py-1 rounded-full text-xs border ${
              isDark
                ? 'bg-[#D4A843]/10 border-[#D4A843]/30 text-[#D4A843]'
                : 'bg-[#D4A843]/10 border-[#D4A843]/40 text-[#1B2A4A]'
            }`}
          >
            {identity}
          </span>
        ))}
      </div>
    );
  };

  // ── main render ───────────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen ${pageBg} transition-colors duration-300`}>

      {/* Header */}
      <div className={`border-b ${divider} px-6 py-5`}>
        <div className="max-w-6xl mx-auto">
          <h1 className={`font-serif text-3xl ${textPrimary}`}>Admin Submissions</h1>
          <p className={`text-sm mt-1 ${textMuted}`}>
            Review, edit, and approve author submissions before they go live.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Tab bar */}
        <div className={`flex gap-1 border-b ${divider} mb-6 overflow-x-auto`}>
          {(Object.keys(TAB_LABELS) as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setStatusFilter('pending'); }}
              className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-[#D4A843] text-[#D4A843]'
                  : `border-transparent ${textMuted} hover:${textPrimary}`
              }`}
            >
              {TAB_LABELS[tab]}
              {pendingCounts[tab] > 0 && (
                <span className="bg-[#D4A843] text-[#1B2A4A] text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {pendingCounts[tab]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex gap-2 mb-6">
          {STATUS_FILTER_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => setStatusFilter(opt)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize ${
                statusFilter === opt
                  ? 'bg-[#D4A843] border-[#D4A843] text-[#1B2A4A]'
                  : `${isDark ? 'border-[#F5F0E8]/20 text-[#F5F0E8]/60 hover:border-[#D4A843]/40' : 'border-[#1B2A4A]/20 text-[#1B2A4A]/60 hover:border-[#D4A843]/40'}`
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        {/* Submissions list */}
        {loading ? (
          <div className={`text-center py-16 ${textMuted}`}>Loading...</div>
        ) : submissions.length === 0 ? (
          <div className={`text-center py-16 ${textMuted}`}>
            No {statusFilter === 'all' ? '' : statusFilter} submissions for {TAB_LABELS[activeTab]}.
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.map(sub => {
              const isExpanded = expandedId === sub.id;
              const isEditing  = editingId === sub.id;

              return (
                <div key={sub.id} className={`rounded-xl border ${cardBg} overflow-hidden`}>

                  {/* Row header */}
                  <div className="flex items-center justify-between px-5 py-4 gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <StatusBadge status={sub.status} />
                      <div className="min-w-0">
                        <p className={`font-semibold text-sm truncate ${textPrimary}`}>
                          {sub.author_name || sub.title || '—'}
                        </p>
                        <p className={`text-xs truncate ${textMuted}`}>
                          {sub.email} · {sub.book_title || sub.book_titles || ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs ${textMuted}`}>
                        {new Date(sub.created_at).toLocaleDateString()}
                      </span>
                      {sub.price && (
                        <span className="text-xs font-semibold text-[#D4A843]">${sub.price}</span>
                      )}
                      {sub.pool_size && (
                        <span className="text-xs font-semibold text-[#D4A843]">${sub.pool_size}</span>
                      )}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                        className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-[#F5F0E8]/10' : 'hover:bg-[#1B2A4A]/10'}`}
                      >
                        {isExpanded ? <ChevronUp size={16} className={textMuted} /> : <ChevronDown size={16} className={textMuted} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className={`border-t ${divider} px-5 py-5`}>

                      {/* Standard detail fields */}
                      <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-6">
                        {DETAIL_FIELDS[activeTab].map(field => {
                          const val = sub[field.key];
                          if (!val && val !== 0) return null;
                          const isLong = typeof val === 'string' && val.length > 80;
                          return (
                            <div key={field.key} className={isLong ? 'col-span-2' : ''}>
                              <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${textMuted}`}>
                                {field.label}
                              </p>
                              <p className={`text-sm ${textPrimary} ${isLong ? 'whitespace-pre-wrap' : ''}`}>
                                {Array.isArray(val) ? val.join(', ') : String(val)}
                              </p>
                            </div>
                          );
                        })}
                      </div>

                      {/* Identity areas — sensitivity only */}
                      {activeTab === 'sensitivity' && sub.identity_areas && (
                        <div className="mb-6">
                          <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${textMuted}`}>
                            Identities Requested
                          </p>
                          <IdentityPills raw={sub.identity_areas} />
                        </div>
                      )}

                      {/* Custom questions — surveys, beta, sensitivity */}
                      {QUESTION_TABS.includes(activeTab) && (
                        <div className="mb-6">
                          <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${textMuted}`}>
                            Feedback Questions
                          </p>
                          <QuestionList raw={sub.custom_questions} />
                        </div>
                      )}

                      {/* Edit mode */}
                      {isEditing ? (
                        <div>
                          <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${textMuted}`}>
                            Editing Fields
                          </p>
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            {EDITABLE_FIELDS[activeTab].map(field => (
                              <div key={field.key} className={field.type === 'textarea' ? 'col-span-2' : ''}>
                                <label className={`block text-xs font-medium mb-1 ${textMuted}`}>
                                  {field.label}
                                </label>
                                {field.type === 'textarea' ? (
                                  <textarea
                                    rows={3}
                                    value={editDraft[field.key] ?? ''}
                                    onChange={e => setEditDraft(prev => ({ ...prev, [field.key]: e.target.value }))}
                                    className={`${inputCls} resize-none`}
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    value={editDraft[field.key] ?? ''}
                                    onChange={e => setEditDraft(prev => ({ ...prev, [field.key]: e.target.value }))}
                                    className={inputCls}
                                  />
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Edit action bar */}
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={cancelEdit}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors ${
                                isDark ? 'border-[#F5F0E8]/20 text-[#F5F0E8]/60 hover:border-[#F5F0E8]/40' : 'border-[#1B2A4A]/20 text-[#1B2A4A]/60 hover:border-[#1B2A4A]/40'
                              }`}
                            >
                              <X size={14} /> Cancel
                            </button>
                            <button
                              onClick={() => saveEdit(sub.id)}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors ${
                                isDark ? 'border-[#D4A843]/40 text-[#D4A843] hover:bg-[#D4A843]/10' : 'border-[#D4A843]/60 text-[#D4A843] hover:bg-[#D4A843]/10'
                              }`}
                            >
                              <Save size={14} /> Save Changes
                            </button>
                            <button
                              onClick={() => saveAndApprove(sub.id)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-green-600 text-white hover:bg-green-500 transition-colors"
                            >
                              <CheckCircle size={14} /> Save & Approve
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* View mode action bar */
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => startEdit(sub)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors ${
                              isDark ? 'border-[#F5F0E8]/20 text-[#F5F0E8]/60 hover:border-[#D4A843]/40 hover:text-[#D4A843]' : 'border-[#1B2A4A]/20 text-[#1B2A4A]/60 hover:border-[#D4A843]/40 hover:text-[#D4A843]'
                            }`}
                          >
                            <Edit2 size={14} /> Edit
                          </button>
                          {sub.status !== 'approved' && (
                            <button
                              onClick={() => updateStatus(sub.id, 'approved')}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-green-600 text-white hover:bg-green-500 transition-colors"
                            >
                              <CheckCircle size={14} /> Approve
                            </button>
                          )}
                          {sub.status !== 'rejected' && (
                            <button
                              onClick={() => updateStatus(sub.id, 'rejected')}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-red-600/80 text-white hover:bg-red-500 transition-colors"
                            >
                              <XCircle size={14} /> Reject
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
