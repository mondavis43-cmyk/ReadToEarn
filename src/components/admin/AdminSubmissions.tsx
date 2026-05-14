import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, Edit2, Save, X, Plus } from 'lucide-react';

type Tab = 'bounties' | 'competitions' | 'quick_tasks' | 'surveys' | 'beta' | 'sensitivity';
type SubmissionStatus = 'pending' | 'approved' | 'rejected' | 'paid' | 'active';

const TAB_TABLES: Record<Tab, string> = {
bounties:     'author_bounty_submissions',
competitions: 'author_competition_submissions',
quick_tasks:  'author_quick_task_submissions',
surveys:      'author_survey_submissions',
beta:         'author_beta_reader_submissions',
sensitivity:  'author_sensitivity_submissions',
};

const ALL_IDENTITIES = [
'Black / African American','Hispanic / Latino','Asian / Pacific Islander',
'Native American / Indigenous','Middle Eastern / North African','White / European',
'Multiracial / Mixed Race','LGBTQ+','Transgender / Non-Binary','Gay / Lesbian',
'Bisexual / Pansexual','Disabled / Chronically Ill','Neurodivergent',
'Mental Health Experience','Religious / Faith-Based','Atheist / Agnostic',
'Immigrant / First-Generation','Working Class / Low Income','Rural / Small Town',
'Urban','Veteran / Military','Senior / Elderly','Teen / Young Adult',
'Parent / Caregiver','Survivor of Trauma / Abuse','Addiction / Recovery',
'Body Positivity / Fat Acceptance','Vegan / Animal Rights',
];

interface Question { id: string; question: string; required: boolean; }

// ── helpers ──────────────────────────────────────────────────────────────────
const parseQuestions = (raw: string | null): Question[] => {
try { return JSON.parse(raw ?? '[]'); } catch { return []; }
};
const parseIdentities = (raw: string | null): string[] => {
try { return JSON.parse(raw ?? '[]'); } catch { return []; }
};
const statusColor = (s: string) => {
if (s === 'approved' || s === 'active') return 'text-green-400';
if (s === 'rejected') return 'text-red-400';
if (s === 'paid') return 'text-blue-400';
return 'text-yellow-400';
};
const StatusIcon = ({ s }: { s: string }) => {
if (s === 'approved' || s === 'active') return <CheckCircle className="w-4 h-4 text-green-400" />;
if (s === 'rejected') return <XCircle className="w-4 h-4 text-red-400" />;
return <Clock className="w-4 h-4 text-yellow-400" />;
};

// ── blank create-panel forms per tab ─────────────────────────────────────────
const BLANK: Record<string, Record<string, any>> = {
beta: {
  author_name: '', email: '', book_title: '', genre: '',
  feedback_type: 'General Read', package_label: 'Starter',
  readers: 5, price: 28, excerpt: '', blurb: '', notes: '',
  custom_questions: '',
},
sensitivity: {
  author_name: '', email: '', book_title: '', package_label: 'Starter',
  readers: 5, price: 60, chapter_text: '', context: '',
  identity_areas: '', custom_questions: '',
},
surveys: {
  author_name: '', email: '', book_title: '', package_label: 'Starter',
  responses: 50, price: 25, excerpt: '', notes: '', custom_questions: '',
},
quick_tasks: {
  author_name: '', email: '', book_title: '', tier_label: 'Basic',
  price: 15, platform_fee: 3, prize_pool: 12, notes: '', custom_questions: '',
},
};

// ── CreatePanelModal ──────────────────────────────────────────────────────────
const CreatePanelModal = ({
tab, onClose, onCreated, theme,
}: {
tab: Tab; onClose: () => void; onCreated: () => void; theme: string;
}) => {
const [form, setForm] = useState<Record<string, any>>(BLANK[tab] ?? {});
const [saving, setSaving] = useState(false);
const [error, setError] = useState<string | null>(null);

const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

const isDark = theme === 'dark';
const bg     = isDark ? 'bg-[#1a1a1a]' : 'bg-white';
const border = isDark ? 'border-gray-700' : 'border-gray-200';
const text   = isDark ? 'text-white' : 'text-gray-900';
const sub    = isDark ? 'text-gray-400' : 'text-gray-500';
const inp    = `w-full px-3 py-2 rounded-lg border ${border} ${isDark ? 'bg-[#111] text-white placeholder-gray-600' : 'bg-gray-50 text-gray-900'} text-sm focus:outline-none`;
const lbl    = `block text-xs font-medium ${sub} mb-1`;

const handleCreate = async () => {
  setSaving(true);
  setError(null);
  try {
    const table = TAB_TABLES[tab];
    const payload: Record<string, any> = { ...form, status: 'approved' };

    // parse custom_questions string → [{id,question,required}]
    if (typeof payload.custom_questions === 'string') {
      const lines = payload.custom_questions
        .split('\n')
        .map((l: string) => l.trim())
        .filter(Boolean);
      payload.custom_questions = lines.length > 0
        ? JSON.stringify(lines.map((q: string, i: number) => ({ id: String(i + 1), question: q, required: false })))
        : null;
    }

    // parse identity_areas string → []
    if (typeof payload.identity_areas === 'string') {
      const lines = payload.identity_areas
        .split('\n')
        .map((l: string) => l.trim())
        .filter(Boolean);
      payload.identity_areas = lines.length > 0 ? JSON.stringify(lines) : null;
    }

    // coerce numbers
    ['readers','responses','price','platform_fee','prize_pool'].forEach(k => {
      if (payload[k] !== undefined) payload[k] = Number(payload[k]);
    });

    const { error: err } = await supabase.from(table).insert(payload);
    if (err) throw err;
    onCreated();
    onClose();
  } catch (e: any) {
    setError(e.message ?? 'Insert failed');
  } finally {
    setSaving(false);
  }
};

const Field = ({ label, k, type = 'text', rows = 0 }: { label: string; k: string; type?: string; rows?: number }) => (
  <div>
    <label className={lbl}>{label}</label>
    {rows > 0
      ? <textarea className={`${inp} resize-none`} rows={rows} value={form[k] ?? ''} onChange={e => set(k, e.target.value)} />
      : <input type={type} className={inp} value={form[k] ?? ''} onChange={e => set(k, e.target.value)} />
    }
  </div>
);

return (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
    <div className={`${bg} rounded-xl border ${border} w-full max-w-2xl max-h-[90vh] overflow-y-auto`}>
      <div className={`flex items-center justify-between px-6 py-4 border-b ${border}`}>
        <h2 className={`font-semibold ${text}`}>
          Create {tab === 'beta' ? 'Beta Reader' : tab === 'sensitivity' ? 'Sensitivity Reader' : tab === 'surveys' ? 'Survey' : 'Quick Task'} Panel
        </h2>
        <button onClick={onClose} className={`${sub} hover:${text} transition`}><X className="w-5 h-5" /></button>
      </div>

      <div className="px-6 py-5 space-y-4">
        {/* shared fields */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Author Name *" k="author_name" />
          <Field label="Email *" k="email" type="email" />
          <Field label="Book Title *" k="book_title" />
          {tab === 'beta' && <Field label="Genre *" k="genre" />}
          {tab === 'beta' && (
            <div>
              <label className={lbl}>Feedback Type</label>
              <select className={inp} value={form.feedback_type} onChange={e => set('feedback_type', e.target.value)}>
                {['General Read','Detailed Critique','Would You Buy?'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
          )}
          {(tab === 'beta' || tab === 'sensitivity') && (
            <>
              <div>
                <label className={lbl}>Package Label</label>
                <select className={inp} value={form.package_label} onChange={e => set('package_label', e.target.value)}>
                  {['Starter','Standard','Extended','Pro'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <Field label="Readers" k="readers" type="number" />
            </>
          )}
          {tab === 'surveys' && (
            <>
              <div>
                <label className={lbl}>Package Label</label>
                <select className={inp} value={form.package_label} onChange={e => set('package_label', e.target.value)}>
                  {['Starter','Standard','Extended','Pro'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <Field label="Responses" k="responses" type="number" />
            </>
          )}
          {tab === 'quick_tasks' && (
            <>
              <div>
                <label className={lbl}>Tier Label</label>
                <select className={inp} value={form.tier_label} onChange={e => set('tier_label', e.target.value)}>
                  {['Basic','Standard','Premium'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <Field label="Platform Fee ($)" k="platform_fee" type="number" />
              <Field label="Prize Pool ($)" k="prize_pool" type="number" />
            </>
          )}
          <Field label="Price ($)" k="price" type="number" />
        </div>

        {/* content fields */}
        {tab === 'beta' && (
          <>
            <Field label="Excerpt *" k="excerpt" rows={5} />
            <Field label="Blurb *" k="blurb" rows={3} />
            <Field label="Notes (optional)" k="notes" rows={2} />
          </>
        )}
        {tab === 'sensitivity' && (
          <>
            <Field label="Chapter Text *" k="chapter_text" rows={6} />
            <Field label="Context / Author Note" k="context" rows={3} />
            <div>
              <label className={lbl}>Identity Areas (one per line)</label>
              <textarea
                className={`${inp} resize-none`}
                rows={4}
                placeholder={ALL_IDENTITIES.slice(0,4).join('\n')}
                value={form.identity_areas ?? ''}
                onChange={e => set('identity_areas', e.target.value)}
              />
              <p className={`text-xs ${sub} mt-1`}>Type each identity on its own line. Must match the identities readers can select.</p>
            </div>
          </>
        )}
        {tab === 'surveys' && (
          <>
            <Field label="Excerpt *" k="excerpt" rows={5} />
            <Field label="Notes (optional)" k="notes" rows={2} />
          </>
        )}
        {tab === 'quick_tasks' && (
          <Field label="Notes / Task Description *" k="notes" rows={4} />
        )}

        {/* custom questions */}
        <div>
          <label className={lbl}>Custom Questions (one per line, optional)</label>
          <textarea
            className={`${inp} resize-none`}
            rows={4}
            placeholder={"Did the opening hook you?\nWould you keep reading?\nWhat confused you?"}
            value={form.custom_questions ?? ''}
            onChange={e => set('custom_questions', e.target.value)}
          />
          <p className={`text-xs ${sub} mt-1`}>Each line becomes a free-text question readers must answer.</p>
        </div>

        {error && (
          <div className="p-3 bg-red-900/20 border border-red-900/40 rounded text-red-400 text-sm">{error}</div>
        )}
      </div>

      <div className={`flex justify-end gap-3 px-6 py-4 border-t ${border}`}>
        <button onClick={onClose} className={`px-4 py-2 rounded-lg border ${border} text-sm ${sub} hover:${text} transition`}>
          Cancel
        </button>
        <button
          onClick={handleCreate}
          disabled={saving}
          className="px-5 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition disabled:opacity-50"
        >
          {saving ? 'Creating...' : 'Create & Go Live'}
        </button>
      </div>
    </div>
  </div>
);
};

// ── main component ────────────────────────────────────────────────────────────
export const AdminSubmissions = () => {
const { theme } = useTheme();
const isDark = theme === 'dark';

const [activeTab,     setActiveTab]     = useState<Tab>('bounties');
const [statusFilter,  setStatusFilter]  = useState<SubmissionStatus | 'all'>('pending');
const [submissions,   setSubmissions]   = useState<any[]>([]);
const [loading,       setLoading]       = useState(false);
const [expandedId,    setExpandedId]    = useState<string | null>(null);
const [editingId,     setEditingId]     = useState<string | null>(null);
const [editDraft,     setEditDraft]     = useState<Record<string, any>>({});
const [showCreate,    setShowCreate]    = useState(false);
const [pendingCounts, setPendingCounts] = useState<Record<Tab, number>>({
  bounties: 0, competitions: 0, quick_tasks: 0,
  surveys: 0, beta: 0, sensitivity: 0,
});

const TABS: { key: Tab; label: string }[] = [
  { key: 'bounties',     label: 'Bounties'            },
  { key: 'competitions', label: 'Competitions'        },
  { key: 'quick_tasks',  label: 'Quick Tasks'         },
  { key: 'surveys',      label: 'Surveys'             },
  { key: 'beta',         label: 'Beta Readers'        },
  { key: 'sensitivity',  label: 'Sensitivity Readers' },
];

const CREATABLE: Tab[] = ['beta', 'sensitivity', 'surveys', 'quick_tasks'];

const bg      = isDark ? 'bg-[#0f0f0f]' : 'bg-gray-50';
const card    = isDark ? 'bg-[#141414]' : 'bg-white';
const border  = isDark ? 'border-gray-800' : 'border-gray-200';
const text    = isDark ? 'text-white' : 'text-gray-900';
const sub     = isDark ? 'text-gray-400' : 'text-gray-500';
const inp     = `w-full px-3 py-2 rounded-lg border ${border} ${isDark ? 'bg-[#1a1a1a] text-white' : 'bg-gray-50 text-gray-900'} text-sm focus:outline-none`;

const fetchSubmissions = async () => {
  setLoading(true);
  setExpandedId(null);
  setEditingId(null);
  const table = TAB_TABLES[activeTab];
  let query = supabase.from(table).select('*').order('created_at', { ascending: false });
  if (statusFilter !== 'all') query = query.eq('status', statusFilter);
  const { data, error } = await query;
  if (error) console.error('[AdminSubmissions] fetch error:', error);
  setSubmissions(data || []);
  setLoading(false);
};

const fetchPendingCounts = async () => {
  const counts: Record<Tab, number> = {
    bounties: 0, competitions: 0, quick_tasks: 0,
    surveys: 0, beta: 0, sensitivity: 0,
  };
  await Promise.all(
    (Object.entries(TAB_TABLES) as [Tab, string][]).map(async ([tab, table]) => {
      const { count } = await supabase
        .from(table).select('*', { count: 'exact', head: true }).eq('status', 'pending');
      counts[tab] = count ?? 0;
    })
  );
  setPendingCounts(counts);
};

useEffect(() => { fetchSubmissions(); }, [activeTab, statusFilter]);
useEffect(() => { fetchPendingCounts(); }, []);

const updateStatus = async (id: string, status: SubmissionStatus) => {
  const table = TAB_TABLES[activeTab];
  const { error } = await supabase.from(table).update({ status }).eq('id', id);
  if (error) { alert('Failed to update status: ' + error.message); return; }
  setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  if (status !== 'pending') {
    setPendingCounts(prev => ({ ...prev, [activeTab]: Math.max(0, prev[activeTab] - 1) }));
  }
};

const startEdit = (s: any) => {
  setEditingId(s.id);
  setEditDraft({ ...s });
};

const saveEdit = async (id: string, andApprove = false) => {
  const table = TAB_TABLES[activeTab];
  const payload = { ...editDraft };
  if (andApprove) payload.status = 'approved';
  const { error } = await supabase.from(table).update(payload).eq('id', id);
  if (error) { alert('Save failed: ' + error.message); return; }
  setSubmissions(prev => prev.map(s => s.id === id ? { ...s, ...payload } : s));
  setEditingId(null);
  setEditDraft({});
  if (andApprove && payload.status !== 'pending') {
    setPendingCounts(prev => ({ ...prev, [activeTab]: Math.max(0, prev[activeTab] - 1) }));
  }
};

const renderDetail = (s: any) => {
  const questions  = parseQuestions(s.custom_questions);
  const identities = parseIdentities(s.identity_areas);
  const isEditing  = editingId === s.id;

  const EditField = ({ label, k, type = 'text', rows = 0 }: { label: string; k: string; type?: string; rows?: number }) => (
    <div className="col-span-2 sm:col-span-1">
      <p className={`text-xs ${sub} mb-1`}>{label}</p>
      {rows > 0
        ? <textarea className={`${inp} resize-none`} rows={rows} value={editDraft[k] ?? ''} onChange={e => setEditDraft(d => ({ ...d, [k]: e.target.value }))} />
        : <input type={type} className={inp} value={editDraft[k] ?? ''} onChange={e => setEditDraft(d => ({ ...d, [k]: e.target.value }))} />
      }
    </div>
  );

  return (
    <div className={`border-t ${border} px-4 py-4 space-y-4`}>
      {isEditing ? (
        <div className="grid grid-cols-2 gap-3">
          <EditField label="Author Name" k="author_name" />
          <EditField label="Email" k="email" type="email" />
          <EditField label="Book Title" k="book_title" />
          {activeTab === 'beta' && <EditField label="Genre" k="genre" />}
          {(activeTab === 'beta' || activeTab === 'sensitivity') && (
            <EditField label="Readers" k="readers" type="number" />
          )}
          {activeTab === 'surveys' && <EditField label="Responses" k="responses" type="number" />}
          <EditField label="Price" k="price" type="number" />
          {activeTab === 'beta' && <EditField label="Excerpt" k="excerpt" rows={4} />}
          {activeTab === 'beta' && <EditField label="Blurb" k="blurb" rows={3} />}
          {activeTab === 'sensitivity' && <EditField label="Chapter Text" k="chapter_text" rows={5} />}
          {activeTab === 'sensitivity' && <EditField label="Context" k="context" rows={3} />}
          {activeTab === 'surveys' && <EditField label="Excerpt" k="excerpt" rows={4} />}
          {activeTab === 'quick_tasks' && <EditField label="Notes" k="notes" rows={3} />}
          <EditField label="Notes" k="notes" rows={2} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {[
            ['Email', s.email],
            ['Genre', s.genre],
            ['Package', s.package_label ?? s.tier_label],
            ['Readers', s.readers],
            ['Responses', s.responses],
            ['Price', s.price ? `$${s.price}` : null],
            ['Prize Pool', s.prize_pool ? `$${s.prize_pool}` : null],
            ['Feedback Type', s.feedback_type],
            ['Notes', s.notes],
          ].filter(([, v]) => v != null && v !== '').map(([label, val]) => (
            <div key={label as string}>
              <span className={`${sub} text-xs`}>{label}</span>
              <p className={text}>{val as string}</p>
            </div>
          ))}
          {s.excerpt && (
            <div className="col-span-2">
              <span className={`${sub} text-xs`}>Excerpt</span>
              <p className={`${text} text-xs mt-1 line-clamp-4 whitespace-pre-wrap`}>{s.excerpt}</p>
            </div>
          )}
          {s.chapter_text && (
            <div className="col-span-2">
              <span className={`${sub} text-xs`}>Chapter Text</span>
              <p className={`${text} text-xs mt-1 line-clamp-4 whitespace-pre-wrap`}>{s.chapter_text}</p>
            </div>
          )}
          {s.blurb && (
            <div className="col-span-2">
              <span className={`${sub} text-xs`}>Blurb</span>
              <p className={`${text} text-xs mt-1 whitespace-pre-wrap`}>{s.blurb}</p>
            </div>
          )}
          {identities.length > 0 && (
            <div className="col-span-2">
              <span className={`${sub} text-xs`}>Identity Areas</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {identities.map(id => (
                  <span key={id} className="px-2 py-0.5 rounded-full bg-purple-900/30 text-purple-300 text-xs">{id}</span>
                ))}
              </div>
            </div>
          )}
          {questions.length > 0 && (
            <div className="col-span-2">
              <span className={`${sub} text-xs`}>Custom Questions</span>
              <ol className="mt-1 space-y-1 list-decimal list-inside">
                {questions.map((q, i) => (
                  <li key={i} className={`text-xs ${text}`}>{q.question}{q.required && <span className="text-yellow-400 ml-1">*</span>}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        {isEditing ? (
          <>
            <button onClick={() => saveEdit(s.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition">
              <Save className="w-3 h-3" /> Save
            </button>
            <button onClick={() => saveEdit(s.id, true)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-medium transition">
              <CheckCircle className="w-3 h-3" /> Save & Approve
            </button>
            <button onClick={() => { setEditingId(null); setEditDraft({}); }} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border ${border} text-xs ${sub} hover:${text} transition`}>
              <X className="w-3 h-3" /> Cancel
            </button>
          </>
        ) : (
          <>
            <button onClick={() => startEdit(s)} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border ${border} text-xs ${sub} hover:${text} transition`}>
              <Edit2 className="w-3 h-3" /> Edit
            </button>
            {s.status !== 'approved' && s.status !== 'active' && (
              <button onClick={() => updateStatus(s.id, 'approved')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-medium transition">
                <CheckCircle className="w-3 h-3" /> Approve
              </button>
            )}
            {s.status !== 'rejected' && (
              <button onClick={() => updateStatus(s.id, 'rejected')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition">
                <XCircle className="w-3 h-3" /> Reject
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

return (
  <div className={`min-h-screen ${bg} px-4 py-8`}>
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${text}`}>Admin — Earning Tasks</h1>
          <p className={`text-sm ${sub} mt-1`}>Review submissions and create live panels.</p>
        </div>
        {CREATABLE.includes(activeTab) && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition"
          >
            <Plus className="w-4 h-4" />
            Create Panel
          </button>
        )}
      </div>

      {/* tabs */}
      <div className={`flex gap-1 border-b ${border} mb-6 overflow-x-auto`}>
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setActiveTab(key); setStatusFilter('pending'); }}
            className={`relative px-4 py-2.5 text-sm font-medium whitespace-nowrap transition border-b-2 -mb-px ${
              activeTab === key
                ? 'border-white text-white'
                : `border-transparent ${sub} hover:${text}`
            }`}
          >
            {label}
            {pendingCounts[key] > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-yellow-500 text-black text-xs font-bold">
                {pendingCounts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* status filter */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {(['pending','approved','rejected','paid','active','all'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition border ${
              statusFilter === s
                ? 'bg-white text-black border-white'
                : `${border} ${sub} hover:${text}`
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* list */}
      {loading ? (
        <div className={`text-center py-16 ${sub}`}>Loading...</div>
      ) : submissions.length === 0 ? (
        <div className={`text-center py-16 ${sub}`}>
          No {statusFilter === 'all' ? '' : statusFilter} submissions for this tab.
          {CREATABLE.includes(activeTab) && (
            <div className="mt-4">
              <button onClick={() => setShowCreate(true)} className="text-green-400 hover:text-green-300 text-sm underline transition">
                Create a panel manually →
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map(s => (
            <div key={s.id} className={`${card} rounded-xl border ${border} overflow-hidden`}>
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:opacity-80 transition"
                onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <StatusIcon s={s.status} />
                  <div className="min-w-0">
                    <p className={`font-medium text-sm ${text} truncate`}>{s.book_title || s.title || '—'}</p>
                    <p className={`text-xs ${sub} truncate`}>{s.author_name} · {s.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <span className={`text-xs font-medium ${statusColor(s.status)}`}>{s.status}</span>
                  <span className={`text-xs ${sub}`}>{new Date(s.created_at).toLocaleDateString()}</span>
                  {expandedId === s.id ? <ChevronUp className={`w-4 h-4 ${sub}`} /> : <ChevronDown className={`w-4 h-4 ${sub}`} />}
                </div>
              </div>
              {expandedId === s.id && renderDetail(s)}
            </div>
          ))}
        </div>
      )}
    </div>

    {showCreate && (
      <CreatePanelModal
        tab={activeTab}
        theme={theme}
        onClose={() => setShowCreate(false)}
        onCreated={() => { fetchSubmissions(); fetchPendingCounts(); }}
      />
    )}
  </div>
);
};

export default AdminSubmissions;
