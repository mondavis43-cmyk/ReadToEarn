import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, X, Trash2, Pencil } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface QuickTask {
  id: string;
  title: string;
  task_type: string;
  description: string | null;
  additional_notes: string | null;
  author_name: string | null;
  author_id: string | null;
  payout_per_response: number;
  max_responses: number;
  responses_count: number;
  status: string;
  created_at: string;
}

interface Survey {
  id: string;
  title: string;
  description: string | null;
  additional_notes: string | null;
  author_name: string | null;
  author_id: string | null;
  payout_per_response: number;
  max_responses: number;
  responses_count: number;
  status: string;
  created_at: string;
}

interface BetaPanel {
  id: string;
  title: string;
  genre: string | null;
  chapter_text: string;
  additional_notes: string | null;
  excerpt: string | null;
  author_name: string | null;
  author_id: string | null;
  payout_per_response: number;
  max_responses: number;
  responses_count: number;
  status: string;
  created_at: string;
}

interface SensitivityPanel {
  id: string;
  title: string;
  description: string | null;
  identity_requirements: string;
  chapter_text: string;
  additional_notes: string | null;
  excerpt: string | null;
  author_name: string | null;
  author_id: string | null;
  payout_per_response: number;
  max_responses: number;
  responses_count: number;
  status: string;
  created_at: string;
}

interface QuestionInput {
  question_text: string;
  required: boolean;
}

type ActiveTab = 'quick_tasks' | 'surveys' | 'beta' | 'sensitivity';

// ── Shared styles ────────────────────────────────────────────────────────────

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-[#e8e8d5] dark:border-gray-700 bg-white dark:bg-gray-800 text-[#1B2A4A] dark:text-[#F5F0E8] text-sm focus:outline-none focus:ring-2';

const textareaClass =
  'w-full px-3 py-2 rounded-lg border border-[#e8e8d5] dark:border-gray-700 bg-white dark:bg-gray-800 text-[#1B2A4A] dark:text-[#F5F0E8] text-sm focus:outline-none focus:ring-2 resize-none';

// ── Author email lookup ───────────────────────────────────────────────────────

async function resolveAuthorId(email: string): Promise<string | null> {
  if (!email.trim()) return null;
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();
  return data?.id ?? null;
}

// ── Free-Text Question Builder ───────────────────────────────────────────────

function FreeTextQuestionBuilder({
  questions,
  onChange,
}: {
  questions: QuestionInput[];
  onChange: (q: QuestionInput[]) => void;
}) {
  const addQuestion = () =>
    onChange([...questions, { question_text: '', required: false }]);
  const removeQuestion = (idx: number) =>
    onChange(questions.filter((_, i) => i !== idx));
  const updateQuestion = (
    idx: number,
    field: keyof QuestionInput,
    value: string | boolean
  ) =>
    onChange(
      questions.map((q, i) => (i === idx ? { ...q, [field]: value } : q))
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-[#6B7280] dark:text-gray-400">
          Questions ({questions.length})
        </label>
        <button
          type="button"
          onClick={addQuestion}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#D4A843]/10 text-[#D4A843] text-xs font-medium hover:bg-[#D4A843]/20 transition-colors"
        >
          <Plus size={12} /> Add Question
        </button>
      </div>
      {questions.length === 0 && (
        <p className="text-xs text-[#6B7280] dark:text-gray-500 italic">
          No questions yet. Click "Add Question" to start.
        </p>
      )}
      {questions.map((q, qIdx) => (
        <div
          key={qIdx}
          className="border border-[#e8e8d5] dark:border-gray-700 rounded-xl p-4 space-y-3 bg-[#fafaf7] dark:bg-gray-800/50"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-semibold text-[#D4A843]">
              Q{qIdx + 1}
            </span>
            <button
              type="button"
              onClick={() => removeQuestion(qIdx)}
              className="text-red-400 hover:text-red-600 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
          <input
            className={inputClass}
            placeholder="Question text"
            value={q.question_text}
            onChange={(e) =>
              updateQuestion(qIdx, 'question_text', e.target.value)
            }
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={q.required}
              onChange={(e) =>
                updateQuestion(qIdx, 'required', e.target.checked)
              }
              className="rounded border-[#e8e8d5] dark:border-gray-700 text-[#D4A843] focus:ring-[#D4A843]"
            />
            <span className="text-xs text-[#6B7280] dark:text-gray-400">
              Required
            </span>
          </label>
        </div>
      ))}
    </div>
  );
}

// ── Author Fields (shared sub-form) ──────────────────────────────────────────

function AuthorFields({
  authorName,
  authorEmail,
  authorIdFound,
  onNameChange,
  onEmailChange,
}: {
  authorName: string;
  authorEmail: string;
  authorIdFound: boolean | null; // null = not checked yet
  onNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <input
        className={inputClass}
        placeholder="Author name (shown to readers)"
        value={authorName}
        onChange={(e) => onNameChange(e.target.value)}
      />
      <div className="relative">
        <input
          className={inputClass}
          placeholder="Author email (links to their account)"
          value={authorEmail}
          onChange={(e) => onEmailChange(e.target.value)}
        />
        {authorEmail.trim() && authorIdFound === false && (
          <p className="text-xs text-amber-500 mt-1">
            ⚠ No account found for this email — panel will save without linking.
          </p>
        )}
        {authorEmail.trim() && authorIdFound === true && (
          <p className="text-xs text-green-500 mt-1">
            ✓ Account found — panel will be linked to this author.
          </p>
        )}
      </div>
    </div>
  );
}

// ── QuickTasksPanel ──────────────────────────────────────────────────────────

function QuickTasksPanel() {
  const [tasks, setTasks] = useState<QuickTask[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [authorIdFound, setAuthorIdFound] = useState<boolean | null>(null);

  const blankForm = {
    title: '',
    task_type: 'cover',
    description: '',
    additional_notes: '',
    author_name: '',
    author_email: '',
    payout_per_response: 0.35,
    max_responses: 50,
  };
  const [form, setForm] = useState(blankForm);
  const [questions, setQuestions] = useState<QuestionInput[]>([]);

  const TASK_TYPES = ['cover', 'blurb', 'title', 'other'];

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase
      .from('quick_tasks')
      .select('*')
      .order('created_at', { ascending: false });
    setTasks(data || []);
  }

  async function handleEmailBlur() {
    if (!form.author_email.trim()) { setAuthorIdFound(null); return; }
    const id = await resolveAuthorId(form.author_email);
    setAuthorIdFound(id !== null);
  }

  function startEdit(task: QuickTask) {
    setEditingId(task.id);
    setForm({
      title: task.title,
      task_type: task.task_type,
      description: task.description || '',
      additional_notes: task.additional_notes || '',
      author_name: task.author_name || '',
      author_email: '',
      payout_per_response: task.payout_per_response,
      max_responses: task.max_responses,
    });
    setAuthorIdFound(null);
    const raw = (task as any).options;
    setQuestions(
      Array.isArray(raw)
        ? raw.map((q: any) => ({ question_text: q.question_text || '', required: q.required || false }))
        : []
    );
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(blankForm);
    setQuestions([]);
    setAuthorIdFound(null);
  }

  async function handleSave() {
    if (!form.title) return;
    setSaving(true);
    const author_id = await resolveAuthorId(form.author_email);
    const questionsJsonb = questions.map((q, idx) => ({
      question_text: q.question_text,
      required: q.required,
      order_index: idx,
    }));
    const payload: any = {
      title: form.title,
      task_type: form.task_type,
      description: form.description || null,
      additional_notes: form.additional_notes || null,
      author_name: form.author_name || null,
      options: questionsJsonb,
      payout_per_response: form.payout_per_response,
      max_responses: form.max_responses,
    };
    if (author_id) payload.author_id = author_id;

    let error;
    if (editingId) {
      ({ error } = await supabase.from('quick_tasks').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('quick_tasks').insert({ ...payload, responses_count: 0, status: 'active' }));
    }
    if (!error) { cancelForm(); } else { console.error('QuickTask save error:', error); }
    setSaving(false);
    load();
  }

  async function handleToggle(id: string, current: string) {
    await supabase.from('quick_tasks').update({ status: current === 'active' ? 'inactive' : 'active' }).eq('id', id);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this task?')) return;
    await supabase.from('quick_tasks').delete().eq('id', id);
    load();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#6B7280] dark:text-gray-400">
          {tasks.filter((t) => t.status === 'active').length} active tasks
        </p>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-xs font-medium hover:bg-[#c49a3e]"
          >
            <Plus size={13} /> Add Task
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e8d5] dark:border-gray-700 p-4 space-y-3">
          <p className="text-xs font-semibold text-[#1B2A4A] dark:text-[#F5F0E8]">
            {editingId ? 'Edit Task' : 'New Task'}
          </p>
          <input
            className={inputClass}
            placeholder="Task title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <AuthorFields
            authorName={form.author_name}
            authorEmail={form.author_email}
            authorIdFound={authorIdFound}
            onNameChange={(v) => setForm({ ...form, author_name: v })}
            onEmailChange={(v) => { setForm({ ...form, author_email: v }); setAuthorIdFound(null); }}
          />
          <div
            onBlur={handleEmailBlur}
            className="contents"
          />
          <div>
            <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">
              Description / Blurb
            </label>
            <textarea
              rows={3}
              className={textareaClass}
              placeholder="Describe the task for readers..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">
              Additional Notes{' '}
              <span className="text-[#6B7280]/60">(optional — shown to readers)</span>
            </label>
            <textarea
              rows={2}
              className={textareaClass}
              placeholder="Any extra instructions or context for readers..."
              value={form.additional_notes}
              onChange={(e) => setForm({ ...form, additional_notes: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Payout ($)</label>
              <input
                type="number" step="0.01" min="0.01"
                className={inputClass}
                value={form.payout_per_response}
                onChange={(e) => setForm({ ...form, payout_per_response: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Max Responses</label>
              <input
                type="number" min="1"
                className={inputClass}
                value={form.max_responses}
                onChange={(e) => setForm({ ...form, max_responses: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Type</label>
              <select
                className={inputClass}
                value={form.task_type}
                onChange={(e) => setForm({ ...form, task_type: e.target.value })}
              >
                {TASK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <FreeTextQuestionBuilder questions={questions} onChange={setQuestions} />
          <div className="flex gap-2">
            <button
              onClick={async () => { await handleEmailBlur(); handleSave(); }}
              disabled={saving || !form.title}
              className="px-3 py-1.5 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-xs font-semibold hover:bg-[#c49a3e] disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add'}
            </button>
            <button
              onClick={cancelForm}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-[#6B7280]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {tasks.length === 0 ? (
        <p className="text-sm text-[#6B7280] dark:text-gray-400">No quick tasks yet.</p>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e8d5] dark:border-gray-700 p-3 flex items-center justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1B2A4A] dark:text-[#F5F0E8] truncate">{task.title}</p>
                <p className="text-xs text-[#6B7280] dark:text-gray-400">
                  {task.author_name ? `${task.author_name} · ` : ''}
                  {task.task_type} · {task.responses_count}/{task.max_responses} · ${task.payout_per_response.toFixed(2)}
                  {task.author_id ? ' · 🔗 linked' : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => startEdit(task)} className="text-[#6B7280] hover:text-[#1B2A4A] dark:hover:text-[#F5F0E8] transition">
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleToggle(task.id, task.status)}
                  className={`text-xs px-2 py-1 rounded-full font-medium transition ${task.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}
                >
                  {task.status === 'active' ? 'Active' : 'Inactive'}
                </button>
                <button onClick={() => handleDelete(task.id)} className="text-red-400 hover:text-red-600 transition">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── SurveysPanel ─────────────────────────────────────────────────────────────

function SurveysPanel() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [authorIdFound, setAuthorIdFound] = useState<boolean | null>(null);

  const blankForm = {
    title: '', description: '', additional_notes: '',
    author_name: '', author_email: '',
    payout_per_response: 1.0, max_responses: 50,
  };
  const [form, setForm] = useState(blankForm);
  const [questions, setQuestions] = useState<QuestionInput[]>([]);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('surveys').select('*').order('created_at', { ascending: false });
    setSurveys(data || []);
  }

  async function handleEmailBlur() {
    if (!form.author_email.trim()) { setAuthorIdFound(null); return; }
    const id = await resolveAuthorId(form.author_email);
    setAuthorIdFound(id !== null);
  }

  function startEdit(s: Survey) {
    setEditingId(s.id);
    setForm({
      title: s.title, description: s.description || '',
      additional_notes: s.additional_notes || '',
      author_name: s.author_name || '', author_email: '',
      payout_per_response: s.payout_per_response, max_responses: s.max_responses,
    });
    setAuthorIdFound(null);
    const raw = (s as any).questions;
    setQuestions(Array.isArray(raw) ? raw.map((q: any) => ({ question_text: q.question_text || '', required: q.required || false })) : []);
    setShowForm(true);
  }

  function cancelForm() { setShowForm(false); setEditingId(null); setForm(blankForm); setQuestions([]); setAuthorIdFound(null); }

  async function handleSave() {
    if (!form.title) return;
    setSaving(true);
    const author_id = await resolveAuthorId(form.author_email);
    const questionsJsonb = questions.map((q, idx) => ({ question_text: q.question_text, required: q.required, order_index: idx }));
    const payload: any = {
      title: form.title, description: form.description || null,
      additional_notes: form.additional_notes || null,
      author_name: form.author_name || null,
      questions: questionsJsonb,
      payout_per_response: form.payout_per_response, max_responses: form.max_responses,
    };
    if (author_id) payload.author_id = author_id;

    let error;
    if (editingId) {
      ({ error } = await supabase.from('surveys').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('surveys').insert({ ...payload, responses_count: 0, status: 'active' }));
    }
    if (!error) { cancelForm(); } else { console.error('Survey save error:', error); }
    setSaving(false);
    load();
  }

  async function handleToggle(id: string, current: string) {
    await supabase.from('surveys').update({ status: current === 'active' ? 'inactive' : 'active' }).eq('id', id);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this survey?')) return;
    await supabase.from('surveys').delete().eq('id', id);
    load();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#6B7280] dark:text-gray-400">
          {surveys.filter((s) => s.status === 'active').length} active surveys
        </p>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1 px-3 py-1.5 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-xs font-medium hover:bg-[#c49a3e]">
            <Plus size={13} /> Add Survey
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e8d5] dark:border-gray-700 p-4 space-y-3">
          <p className="text-xs font-semibold text-[#1B2A4A] dark:text-[#F5F0E8]">{editingId ? 'Edit Survey' : 'New Survey'}</p>
          <input className={inputClass} placeholder="Survey title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <AuthorFields
            authorName={form.author_name} authorEmail={form.author_email} authorIdFound={authorIdFound}
            onNameChange={(v) => setForm({ ...form, author_name: v })}
            onEmailChange={(v) => { setForm({ ...form, author_email: v }); setAuthorIdFound(null); }}
          />
          <div>
            <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Description / Blurb</label>
            <textarea rows={3} className={textareaClass} placeholder="Describe the survey for readers..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Additional Notes <span className="text-[#6B7280]/60">(optional)</span></label>
            <textarea rows={2} className={textareaClass} placeholder="Any extra instructions or context for readers..." value={form.additional_notes} onChange={(e) => setForm({ ...form, additional_notes: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Payout ($)</label>
              <input type="number" step="0.01" min="0.01" className={inputClass} value={form.payout_per_response} onChange={(e) => setForm({ ...form, payout_per_response: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Max Responses</label>
              <input type="number" min="1" className={inputClass} value={form.max_responses} onChange={(e) => setForm({ ...form, max_responses: parseInt(e.target.value) || 1 })} />
            </div>
          </div>
          <FreeTextQuestionBuilder questions={questions} onChange={setQuestions} />
          <div className="flex gap-2">
            <button onClick={async () => { await handleEmailBlur(); handleSave(); }} disabled={saving || !form.title} className="px-3 py-1.5 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-xs font-semibold hover:bg-[#c49a3e] disabled:opacity-50">
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add'}
            </button>
            <button onClick={cancelForm} className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-[#6B7280]">Cancel</button>
          </div>
        </div>
      )}

      {surveys.length === 0 ? (
        <p className="text-sm text-[#6B7280] dark:text-gray-400">No surveys yet.</p>
      ) : (
        <div className="space-y-2">
          {surveys.map((s) => (
            <div key={s.id} className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e8d5] dark:border-gray-700 p-3 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1B2A4A] dark:text-[#F5F0E8] truncate">{s.title}</p>
                <p className="text-xs text-[#6B7280] dark:text-gray-400">
                  {s.author_name ? `${s.author_name} · ` : ''}{s.responses_count}/{s.max_responses} · ${s.payout_per_response.toFixed(2)}{s.author_id ? ' · 🔗 linked' : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => startEdit(s)} className="text-[#6B7280] hover:text-[#1B2A4A] dark:hover:text-[#F5F0E8] transition"><Pencil size={14} /></button>
                <button onClick={() => handleToggle(s.id, s.status)} className={`text-xs px-2 py-1 rounded-full font-medium transition ${s.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                  {s.status === 'active' ? 'Active' : 'Inactive'}
                </button>
                <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-600 transition"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── BetaPanel_ ───────────────────────────────────────────────────────────────

function BetaPanel_() {
  const [panels, setPanels] = useState<BetaPanel[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [authorIdFound, setAuthorIdFound] = useState<boolean | null>(null);

  const blankForm = {
    title: '', genre: '', chapter_text: '', additional_notes: '', excerpt: '',
    author_name: '', author_email: '',
    payout_per_response: 1.5, max_responses: 10,
  };
  const [form, setForm] = useState(blankForm);
  const [questions, setQuestions] = useState<QuestionInput[]>([]);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('beta_panels').select('*').order('created_at', { ascending: false });
    setPanels(data || []);
  }

  async function handleEmailBlur() {
    if (!form.author_email.trim()) { setAuthorIdFound(null); return; }
    const id = await resolveAuthorId(form.author_email);
    setAuthorIdFound(id !== null);
  }

  function startEdit(p: BetaPanel) {
    setEditingId(p.id);
    setForm({
      title: p.title, genre: p.genre || '', chapter_text: p.chapter_text,
      additional_notes: p.additional_notes || '', excerpt: p.excerpt || '',
      author_name: p.author_name || '', author_email: '',
      payout_per_response: p.payout_per_response, max_responses: p.max_responses,
    });
    setAuthorIdFound(null);
    const raw = (p as any).questions;
    setQuestions(Array.isArray(raw) ? raw.map((q: any) => ({ question_text: q.question_text || '', required: q.required || false })) : []);
    setShowForm(true);
  }

  function cancelForm() { setShowForm(false); setEditingId(null); setForm(blankForm); setQuestions([]); setAuthorIdFound(null); }

  async function handleSave() {
    if (!form.title || !form.chapter_text) return;
    setSaving(true);
    const author_id = await resolveAuthorId(form.author_email);
    const questionsJsonb = questions.map((q, idx) => ({ question_text: q.question_text, required: q.required, order_index: idx }));
    const payload: any = {
      title: form.title, genre: form.genre || null, chapter_text: form.chapter_text,
      additional_notes: form.additional_notes || null, excerpt: form.excerpt || null,
      author_name: form.author_name || null,
      questions: questionsJsonb,
      payout_per_response: form.payout_per_response, max_responses: form.max_responses,
    };
    if (author_id) payload.author_id = author_id;

    let error;
    if (editingId) {
      ({ error } = await supabase.from('beta_panels').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('beta_panels').insert({ ...payload, responses_count: 0, status: 'active' }));
    }
    if (!error) { cancelForm(); } else { console.error('BetaPanel save error:', error); }
    setSaving(false);
    load();
  }

  async function handleToggle(id: string, current: string) {
    await supabase.from('beta_panels').update({ status: current === 'active' ? 'inactive' : 'active' }).eq('id', id);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this beta panel?')) return;
    await supabase.from('beta_panels').delete().eq('id', id);
    load();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#6B7280] dark:text-gray-400">
          {panels.filter((p) => p.status === 'active').length} active panels
        </p>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1 px-3 py-1.5 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-xs font-medium hover:bg-[#c49a3e]">
            <Plus size={13} /> Add Panel
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e8d5] dark:border-gray-700 p-4 space-y-3">
          <p className="text-xs font-semibold text-[#1B2A4A] dark:text-[#F5F0E8]">{editingId ? 'Edit Beta Panel' : 'New Beta Panel'}</p>
          <input className={inputClass} placeholder="Panel title (e.g. book title)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <AuthorFields
            authorName={form.author_name} authorEmail={form.author_email} authorIdFound={authorIdFound}
            onNameChange={(v) => setForm({ ...form, author_name: v })}
            onEmailChange={(v) => { setForm({ ...form, author_email: v }); setAuthorIdFound(null); }}
          />
          <div>
            <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Blurb / Description <span className="text-red-400">*</span></label>
            <textarea rows={3} className={textareaClass} placeholder="Author's blurb — shown to readers as the book description..." value={form.chapter_text} onChange={(e) => setForm({ ...form, chapter_text: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Additional Notes <span className="text-[#6B7280]/60">(optional)</span></label>
            <textarea rows={2} className={textareaClass} placeholder="Any extra instructions or context from the author..." value={form.additional_notes} onChange={(e) => setForm({ ...form, additional_notes: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Sample / Excerpt <span className="text-[#6B7280]/60">(readers read this before answering)</span></label>
            <textarea rows={8} className={textareaClass} placeholder="Paste the author's sample chapter or excerpt here..." value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Payout ($)</label>
              <input type="number" step="0.01" min="0.01" className={inputClass} value={form.payout_per_response} onChange={(e) => setForm({ ...form, payout_per_response: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Max Responses</label>
              <input type="number" min="1" className={inputClass} value={form.max_responses} onChange={(e) => setForm({ ...form, max_responses: parseInt(e.target.value) || 1 })} />
            </div>
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Genre</label>
              <input className={inputClass} placeholder="Optional" value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} />
            </div>
          </div>
          <FreeTextQuestionBuilder questions={questions} onChange={setQuestions} />
          <div className="flex gap-2">
            <button onClick={async () => { await handleEmailBlur(); handleSave(); }} disabled={saving || !form.title || !form.chapter_text} className="px-3 py-1.5 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-xs font-semibold hover:bg-[#c49a3e] disabled:opacity-50">
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add'}
            </button>
            <button onClick={cancelForm} className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-[#6B7280]">Cancel</button>
          </div>
        </div>
      )}

      {panels.length === 0 ? (
        <p className="text-sm text-[#6B7280] dark:text-gray-400">No beta panels yet.</p>
      ) : (
        <div className="space-y-2">
          {panels.map((p) => (
            <div key={p.id} className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e8d5] dark:border-gray-700 p-3 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1B2A4A] dark:text-[#F5F0E8] truncate">{p.title}</p>
                <p className="text-xs text-[#6B7280] dark:text-gray-400">
                  {p.author_name ? `${p.author_name} · ` : ''}{p.genre ? `${p.genre} · ` : ''}{p.responses_count}/{p.max_responses} · ${p.payout_per_response.toFixed(2)}{p.author_id ? ' · 🔗 linked' : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => startEdit(p)} className="text-[#6B7280] hover:text-[#1B2A4A] dark:hover:text-[#F5F0E8] transition"><Pencil size={14} /></button>
                <button onClick={() => handleToggle(p.id, p.status)} className={`text-xs px-2 py-1 rounded-full font-medium transition ${p.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                  {p.status === 'active' ? 'Active' : 'Inactive'}
                </button>
                <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-600 transition"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── SensitivityPanel_ ────────────────────────────────────────────────────────

function SensitivityPanel_() {
  const [panels, setPanels] = useState<SensitivityPanel[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [authorIdFound, setAuthorIdFound] = useState<boolean | null>(null);

  const blankForm = {
    title: '', description: '', identity_requirements: '', chapter_text: '',
    additional_notes: '', excerpt: '', author_name: '', author_email: '',
    payout_per_response: 10.0, max_responses: 5,
  };
  const [form, setForm] = useState(blankForm);
  const [questions, setQuestions] = useState<QuestionInput[]>([]);

  const SENSITIVITY_TYPES = ['trauma', 'disability', 'race', 'lgbtq+', 'religion', 'mental health', 'other'];

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('sensitivity_panels').select('*').order('created_at', { ascending: false });
    setPanels(data || []);
  }

  async function handleEmailBlur() {
    if (!form.author_email.trim()) { setAuthorIdFound(null); return; }
    const id = await resolveAuthorId(form.author_email);
    setAuthorIdFound(id !== null);
  }

  function startEdit(p: SensitivityPanel) {
    setEditingId(p.id);
    setForm({
      title: p.title, description: p.description || '',
      identity_requirements: p.identity_requirements, chapter_text: p.chapter_text,
      additional_notes: p.additional_notes || '', excerpt: p.excerpt || '',
      author_name: p.author_name || '', author_email: '',
      payout_per_response: p.payout_per_response, max_responses: p.max_responses,
    });
    setAuthorIdFound(null);
    const raw = (p as any).questions;
    setQuestions(Array.isArray(raw) ? raw.map((q: any) => ({ question_text: q.question_text || '', required: q.required || false })) : []);
    setShowForm(true);
  }

  function cancelForm() { setShowForm(false); setEditingId(null); setForm(blankForm); setQuestions([]); setAuthorIdFound(null); }

  async function handleSave() {
    if (!form.title || !form.chapter_text || !form.identity_requirements) return;
    setSaving(true);
    const author_id = await resolveAuthorId(form.author_email);
    const questionsJsonb = questions.map((q, idx) => ({ question_text: q.question_text, required: q.required, order_index: idx }));
    const payload: any = {
      title: form.title, description: form.description || null,
      identity_requirements: form.identity_requirements, chapter_text: form.chapter_text,
      additional_notes: form.additional_notes || null, excerpt: form.excerpt || null,
      author_name: form.author_name || null,
      questions: questionsJsonb,
      payout_per_response: form.payout_per_response, max_responses: form.max_responses,
    };
    if (author_id) payload.author_id = author_id;

    let error;
    if (editingId) {
      ({ error } = await supabase.from('sensitivity_panels').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('sensitivity_panels').insert({ ...payload, responses_count: 0, status: 'active' }));
    }
    if (!error) { cancelForm(); } else { console.error('SensitivityPanel save error:', error); }
    setSaving(false);
    load();
  }

  async function handleToggle(id: string, current: string) {
    await supabase.from('sensitivity_panels').update({ status: current === 'active' ? 'inactive' : 'active' }).eq('id', id);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this sensitivity panel?')) return;
    await supabase.from('sensitivity_panels').delete().eq('id', id);
    load();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#6B7280] dark:text-gray-400">
          {panels.filter((p) => p.status === 'active').length} active panels
        </p>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1 px-3 py-1.5 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-xs font-medium hover:bg-[#c49a3e]">
            <Plus size={13} /> Add Panel
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e8d5] dark:border-gray-700 p-4 space-y-3">
          <p className="text-xs font-semibold text-[#1B2A4A] dark:text-[#F5F0E8]">{editingId ? 'Edit Sensitivity Panel' : 'New Sensitivity Panel'}</p>
          <input className={inputClass} placeholder="Panel title (e.g. book title)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <AuthorFields
            authorName={form.author_name} authorEmail={form.author_email} authorIdFound={authorIdFound}
            onNameChange={(v) => setForm({ ...form, author_name: v })}
            onEmailChange={(v) => { setForm({ ...form, author_email: v }); setAuthorIdFound(null); }}
          />
          <div>
            <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Description / Blurb</label>
            <textarea rows={3} className={textareaClass} placeholder="Author's blurb — shown to readers as the book description..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Additional Notes <span className="text-[#6B7280]/60">(optional)</span></label>
            <textarea rows={2} className={textareaClass} placeholder="Any extra instructions or context from the author..." value={form.additional_notes} onChange={(e) => setForm({ ...form, additional_notes: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Sample / Excerpt <span className="text-[#6B7280]/60">(readers read this before answering)</span></label>
            <textarea rows={8} className={textareaClass} placeholder="Paste the author's sample chapter or excerpt here..." value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Full Chapter Text <span className="text-red-400">*</span></label>
            <textarea rows={5} className={textareaClass} placeholder="Full chapter or passage for sensitivity review..." value={form.chapter_text} onChange={(e) => setForm({ ...form, chapter_text: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Payout ($)</label>
              <input type="number" step="0.01" min="0.01" className={inputClass} value={form.payout_per_response} onChange={(e) => setForm({ ...form, payout_per_response: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Max Responses</label>
              <input type="number" min="1" className={inputClass} value={form.max_responses} onChange={(e) => setForm({ ...form, max_responses: parseInt(e.target.value) || 1 })} />
            </div>
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Type <span className="text-red-400">*</span></label>
              <select className={inputClass} value={form.identity_requirements} onChange={(e) => setForm({ ...form, identity_requirements: e.target.value })}>
                <option value="">Select...</option>
                {SENSITIVITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <FreeTextQuestionBuilder questions={questions} onChange={setQuestions} />
          <div className="flex gap-2">
            <button onClick={async () => { await handleEmailBlur(); handleSave(); }} disabled={saving || !form.title || !form.chapter_text || !form.identity_requirements} className="px-3 py-1.5 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-xs font-semibold hover:bg-[#c49a3e] disabled:opacity-50">
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add'}
            </button>
            <button onClick={cancelForm} className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-[#6B7280]">Cancel</button>
          </div>
        </div>
      )}

      {panels.length === 0 ? (
        <p className="text-sm text-[#6B7280] dark:text-gray-400">No sensitivity panels yet.</p>
      ) : (
        <div className="space-y-2">
          {panels.map((p) => (
            <div key={p.id} className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e8d5] dark:border-gray-700 p-3 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1B2A4A] dark:text-[#F5F0E8] truncate">{p.title}</p>
                <p className="text-xs text-[#6B7280] dark:text-gray-400">
                  {p.author_name ? `${p.author_name} · ` : ''}{p.identity_requirements} · {p.responses_count}/{p.max_responses} · ${p.payout_per_response.toFixed(2)}{p.author_id ? ' · 🔗 linked' : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => startEdit(p)} className="text-[#6B7280] hover:text-[#1B2A4A] dark:hover:text-[#F5F0E8] transition"><Pencil size={14} /></button>
                <button onClick={() => handleToggle(p.id, p.status)} className={`text-xs px-2 py-1 rounded-full font-medium transition ${p.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                  {p.status === 'active' ? 'Active' : 'Inactive'}
                </button>
                <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-600 transition"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────

export function AdminEarning() {
  const [tab, setTab] = useState<ActiveTab>('quick_tasks');

  const TABS: { key: ActiveTab; label: string }[] = [
    { key: 'quick_tasks', label: 'Quick Tasks' },
    { key: 'surveys',     label: 'Surveys' },
    { key: 'beta',        label: 'Beta Readers' },
    { key: 'sensitivity', label: 'Sensitivity Readers' },
  ];

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-[#1B2A4A] dark:text-[#F5F0E8]">Earning Features</h2>
      <div className="flex flex-wrap gap-2">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === key
                ? 'bg-[#1B2A4A] text-white dark:bg-[#D4A843] dark:text-[#1B2A4A]'
                : 'bg-white dark:bg-gray-800 text-[#6B7280] dark:text-gray-400 border border-[#e8e8d5] dark:border-gray-700 hover:text-[#1B2A4A] dark:hover:text-[#F5F0E8]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'quick_tasks' && <QuickTasksPanel />}
      {tab === 'surveys'     && <SurveysPanel />}
      {tab === 'beta'        && <BetaPanel_ />}
      {tab === 'sensitivity' && <SensitivityPanel_ />}
    </div>
  );
}
