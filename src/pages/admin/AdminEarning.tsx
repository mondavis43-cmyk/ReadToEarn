import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, X, Trash2 } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface QuickTask {
  id: string;
  title: string;
  description: string | null;
  additional_notes: string | null;
  payout_per_response: number;
  task_type: string;
  status: string;
  created_at: string;
}

interface Survey {
  id: string;
  title: string;
  description: string | null;
  additional_notes: string | null;
  payout_per_response: number;
  questions: number;
  status: string;
  created_at: string;
}

interface BetaPanel {
  id: string;
  title: string;
  description: string | null;
  additional_notes: string | null;
  excerpt: string | null;
  payout_per_response: number;
  genre: string | null;
  max_responses: number;
  responses_count: number;
  status: string;
  created_at: string;
}

interface SensitivityPanel {
  id: string;
  title: string;
  description: string | null;
  additional_notes: string | null;
  excerpt: string | null;
  payout_per_response: number;
  identity_requirements: string | null;
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
    onChange(questions.map((q, i) => (i === idx ? { ...q, [field]: value } : q)));

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
            <span className="text-xs font-semibold text-[#D4A843]">Q{qIdx + 1}</span>
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
            onChange={(e) => updateQuestion(qIdx, 'question_text', e.target.value)}
          />

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={q.required}
              onChange={(e) => updateQuestion(qIdx, 'required', e.target.checked)}
              className="rounded border-[#e8e8d5] dark:border-gray-700 text-[#D4A843] focus:ring-[#D4A843]"
            />
            <span className="text-xs text-[#6B7280] dark:text-gray-400">Required</span>
          </label>
        </div>
      ))}
    </div>
  );
}

// ── QuickTasksPanel ──────────────────────────────────────────────────────────

function QuickTasksPanel() {
  const [tasks, setTasks] = useState<QuickTask[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    additional_notes: '',
    payout_per_response: 0.35,
    task_type: 'cover',
  });
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

  async function handleSave() {
    if (!form.title) return;
    setSaving(true);

    const { data: newTask, error } = await supabase
      .from('quick_tasks')
      .insert({
        title: form.title,
        description: form.description || null,
        additional_notes: form.additional_notes || null,
        payout_per_response: form.payout_per_response,
        task_type: form.task_type,
        status: 'active',
      })
      .select('id')
      .single();

    if (!error && newTask && questions.length > 0) {
      await supabase.from('earning_task_questions').insert(
        questions.map((q, idx) => ({
          task_id: newTask.id,
          task_type: 'quick_task',
          question_text: q.question_text,
          required: q.required,
          order_index: idx,
        }))
      );
    }

    if (!error && newTask) {
      await supabase.functions.invoke('notify-content-live', {
        body: { content_type: 'quick_task', content_id: newTask.id },
      });
    }

    setForm({ title: '', description: '', additional_notes: '', payout_per_response: 0.35, task_type: 'social' });
    setQuestions([]);
    setShowForm(false);
    setSaving(false);
    load();
  }

  async function handleToggle(id: string, current: string) {
    const next = current === 'active' ? 'inactive' : 'active';
    await supabase.from('quick_tasks').update({ status: next }).eq('id', id);
    if (next === 'active') {
      await supabase.functions.invoke('notify-content-live', {
        body: { content_type: 'quick_task', content_id: id },
      });
    }
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
          <input
            className={inputClass}
            placeholder="Task title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <div>
            <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Description / Blurb</label>
            <textarea
              rows={3}
              className={textareaClass}
              placeholder="Describe the task for readers..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Additional Notes <span className="text-[#6B7280]/60">(optional — shown to readers)</span></label>
            <textarea
              rows={2}
              className={textareaClass}
              placeholder="Any extra instructions or context for readers..."
              value={form.additional_notes}
              onChange={(e) => setForm({ ...form, additional_notes: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Payout ($)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className={inputClass}
                value={form.payout_per_response}
                onChange={(e) => setForm({ ...form, payout_per_response: parseFloat(e.target.value) || 0 })}
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
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-xs font-semibold hover:bg-[#c49a3e] disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Add'}
            </button>
            <button
              onClick={() => { setShowForm(false); setQuestions([]); }}
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
                  {task.task_type} · ${task.payout_per_response.toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleToggle(task.id, task.status)}
                  className={`text-xs px-2 py-1 rounded-full font-medium transition ${
                    task.status === 'active'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  }`}
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
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    additional_notes: '',
    payout_per_response: 1.0,
    questions: 5,
  });
  const [questionInputs, setQuestionInputs] = useState<QuestionInput[]>([]);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase
      .from('surveys')
      .select('*')
      .order('created_at', { ascending: false });
    setSurveys(data || []);
  }

  async function handleSave() {
    if (!form.title) return;
    setSaving(true);

    const { data: newSurvey, error } = await supabase
      .from('surveys')
      .insert({
        title: form.title,
        description: form.description || null,
        additional_notes: form.additional_notes || null,
        payout_per_response: form.payout_per_response,
        questions: form.questions,
        status: 'active',
      })
      .select('id')
      .single();

    if (!error && newSurvey && questionInputs.length > 0) {
      await supabase.from('earning_task_questions').insert(
        questionInputs.map((q, idx) => ({
          task_id: newSurvey.id,
          task_type: 'survey',
          question_text: q.question_text,
          required: q.required,
          order_index: idx,
        }))
      );
    }

    if (!error && newSurvey) {
      await supabase.functions.invoke('notify-content-live', {
        body: { content_type: 'survey', content_id: newSurvey.id },
      });
    }

    setForm({ title: '', description: '', additional_notes: '', payout_per_response: 1.0, questions: 5 });
    setQuestionInputs([]);
    setShowForm(false);
    setSaving(false);
    load();
  }

  async function handleToggle(id: string, current: string) {
    const next = current === 'active' ? 'inactive' : 'active';
    await supabase.from('surveys').update({ status: next }).eq('id', id);
    if (next === 'active') {
      await supabase.functions.invoke('notify-content-live', {
        body: { content_type: 'survey', content_id: id },
      });
    }
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
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-xs font-medium hover:bg-[#c49a3e]"
          >
            <Plus size={13} /> Add Survey
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e8d5] dark:border-gray-700 p-4 space-y-3">
          <input
            className={inputClass}
            placeholder="Survey title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <div>
            <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Description / Blurb</label>
            <textarea
              rows={3}
              className={textareaClass}
              placeholder="Describe the survey for readers..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Additional Notes <span className="text-[#6B7280]/60">(optional — shown to readers)</span></label>
            <textarea
              rows={2}
              className={textareaClass}
              placeholder="Any extra instructions or context for readers..."
              value={form.additional_notes}
              onChange={(e) => setForm({ ...form, additional_notes: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Payout ($)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className={inputClass}
                value={form.payout_per_response}
                onChange={(e) => setForm({ ...form, payout_per_response: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Question count</label>
              <input
                type="number"
                min="1"
                className={inputClass}
                value={form.questions}
                onChange={(e) => setForm({ ...form, questions: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>
          <FreeTextQuestionBuilder questions={questionInputs} onChange={setQuestionInputs} />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-xs font-semibold hover:bg-[#c49a3e] disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Add'}
            </button>
            <button
              onClick={() => { setShowForm(false); setQuestionInputs([]); }}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-[#6B7280]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {surveys.length === 0 ? (
        <p className="text-sm text-[#6B7280] dark:text-gray-400">No surveys yet.</p>
      ) : (
        <div className="space-y-2">
          {surveys.map((s) => (
            <div
              key={s.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e8d5] dark:border-gray-700 p-3 flex items-center justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1B2A4A] dark:text-[#F5F0E8] truncate">{s.title}</p>
                <p className="text-xs text-[#6B7280] dark:text-gray-400">
                  {s.questions} questions · ${s.payout_per_response.toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleToggle(s.id, s.status)}
                  className={`text-xs px-2 py-1 rounded-full font-medium transition ${
                    s.status === 'active'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {s.status === 'active' ? 'Active' : 'Inactive'}
                </button>
                <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-600 transition">
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

// ── BetaPanel_ ───────────────────────────────────────────────────────────────

function BetaPanel_() {
  const [panels, setPanels] = useState<BetaPanel[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    additional_notes: '',
    excerpt: '',
    payout_per_response: 1.5,
    genre: '',
    max_responses: 10,
  });
  const [questions, setQuestions] = useState<QuestionInput[]>([]);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase
      .from('beta_panels')
      .select('*')
      .order('created_at', { ascending: false });
    setPanels(data || []);
  }

  async function handleSave() {
    if (!form.title) return;
    setSaving(true);

    const { data: newPanel, error } = await supabase
      .from('beta_panels')
      .insert({
        title: form.title,
        description: form.description || null,
        additional_notes: form.additional_notes || null,
        excerpt: form.excerpt || null,
        payout_per_response: form.payout_per_response,
        genre: form.genre || null,
        max_responses: form.max_responses,
        responses_count: 0,
        status: 'active',
      })
      .select('id')
      .single();

    if (!error && newPanel && questions.length > 0) {
      await supabase.from('earning_task_questions').insert(
        questions.map((q, idx) => ({
          task_id: newPanel.id,
          task_type: 'beta_panel',
          question_text: q.question_text,
          required: q.required,
          order_index: idx,
        }))
      );
    }

    if (!error && newPanel) {
      await supabase.functions.invoke('notify-content-live', {
        body: { content_type: 'beta_panel', content_id: newPanel.id },
      });
    }

    setForm({ title: '', description: '', additional_notes: '', excerpt: '', payout_per_response: 1.5, genre: '', max_responses: 10 });
    setQuestions([]);
    setShowForm(false);
    setSaving(false);
    load();
  }

  async function handleToggle(id: string, current: string) {
    const next = current === 'active' ? 'inactive' : 'active';
    await supabase.from('beta_panels').update({ status: next }).eq('id', id);
    if (next === 'active') {
      await supabase.functions.invoke('notify-content-live', {
        body: { content_type: 'beta_panel', content_id: id },
      });
    }
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
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-xs font-medium hover:bg-[#c49a3e]"
          >
            <Plus size={13} /> Add Panel
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e8d5] dark:border-gray-700 p-4 space-y-3">
          <input
            className={inputClass}
            placeholder="Panel title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <div>
            <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Description / Blurb</label>
            <textarea
              rows={3}
              className={textareaClass}
              placeholder="Author's blurb for this book..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Additional Notes <span className="text-[#6B7280]/60">(optional — shown to readers)</span></label>
            <textarea
              rows={2}
              className={textareaClass}
              placeholder="Any extra instructions or context for readers..."
              value={form.additional_notes}
              onChange={(e) => setForm({ ...form, additional_notes: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Sample / Excerpt <span className="text-[#6B7280]/60">(readers will read this before answering questions)</span></label>
            <textarea
              rows={8}
              className={textareaClass}
              placeholder="Paste the author's sample chapter or excerpt here..."
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Payout ($)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className={inputClass}
                value={form.payout_per_response}
                onChange={(e) => setForm({ ...form, payout_per_response: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Max Responses</label>
              <input
                type="number"
                min="1"
                className={inputClass}
                value={form.max_responses}
                onChange={(e) => setForm({ ...form, max_responses: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Genre</label>
              <input
                className={inputClass}
                placeholder="Optional"
                value={form.genre}
                onChange={(e) => setForm({ ...form, genre: e.target.value })}
              />
            </div>
          </div>
          <FreeTextQuestionBuilder questions={questions} onChange={setQuestions} />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-xs font-semibold hover:bg-[#c49a3e] disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Add'}
            </button>
            <button
              onClick={() => { setShowForm(false); setQuestions([]); }}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-[#6B7280]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {panels.length === 0 ? (
        <p className="text-sm text-[#6B7280] dark:text-gray-400">No beta panels yet.</p>
      ) : (
        <div className="space-y-2">
          {panels.map((p) => (
            <div
              key={p.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e8d5] dark:border-gray-700 p-3 flex items-center justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1B2A4A] dark:text-[#F5F0E8] truncate">{p.title}</p>
                <p className="text-xs text-[#6B7280] dark:text-gray-400">
                  {p.genre ? `${p.genre} · ` : ''}{p.responses_count}/{p.max_responses} · ${p.payout_per_response.toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleToggle(p.id, p.status)}
                  className={`text-xs px-2 py-1 rounded-full font-medium transition ${
                    p.status === 'active'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {p.status === 'active' ? 'Active' : 'Inactive'}
                </button>
                <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-600 transition">
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

// ── SensitivityPanel_ ────────────────────────────────────────────────────────

function SensitivityPanel_() {
  const [panels, setPanels] = useState<SensitivityPanel[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    additional_notes: '',
    excerpt: '',
    payout_per_response: 10.0,
    identity_requirements: '',
    max_responses: 5,
  });
  const [questions, setQuestions] = useState<QuestionInput[]>([]);

  const SENSITIVITY_TYPES = ['trauma', 'disability', 'race', 'lgbtq+', 'religion', 'mental health', 'other'];

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase
      .from('sensitivity_panels')
      .select('*')
      .order('created_at', { ascending: false });
    setPanels(data || []);
  }

  async function handleSave() {
    if (!form.title) return;
    setSaving(true);

    const { data: newPanel, error } = await supabase
      .from('sensitivity_panels')
      .insert({
        title: form.title,
        description: form.description || null,
        additional_notes: form.additional_notes || null,
        excerpt: form.excerpt || null,
        payout_per_response: form.payout_per_response,
        identity_requirements: form.identity_requirements || null,
        max_responses: form.max_responses,
        responses_count: 0,
        status: 'active',
      })
      .select('id')
      .single();

    if (!error && newPanel && questions.length > 0) {
      await supabase.from('earning_task_questions').insert(
        questions.map((q, idx) => ({
          task_id: newPanel.id,
          task_type: 'sensitivity_panel',
          question_text: q.question_text,
          required: q.required,
          order_index: idx,
        }))
      );
    }

    if (!error && newPanel) {
      await supabase.functions.invoke('notify-content-live', {
        body: { content_type: 'sensitivity_panel', content_id: newPanel.id },
      });
    }

    setForm({ title: '', description: '', additional_notes: '', excerpt: '', payout_per_response: 10.0, identity_requirements: '', max_responses: 5 });
    setQuestions([]);
    setShowForm(false);
    setSaving(false);
    load();
  }

  async function handleToggle(id: string, current: string) {
    const next = current === 'active' ? 'inactive' : 'active';
    await supabase.from('sensitivity_panels').update({ status: next }).eq('id', id);
    if (next === 'active') {
      await supabase.functions.invoke('notify-content-live', {
        body: { content_type: 'sensitivity_panel', content_id: id },
      });
    }
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
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-xs font-medium hover:bg-[#c49a3e]"
          >
            <Plus size={13} /> Add Panel
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e8d5] dark:border-gray-700 p-4 space-y-3">
          <input
            className={inputClass}
            placeholder="Panel title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <div>
            <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Description / Blurb</label>
            <textarea
              rows={3}
              className={textareaClass}
              placeholder="Author's blurb for this book..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Additional Notes <span className="text-[#6B7280]/60">(optional — shown to readers)</span></label>
            <textarea
              rows={2}
              className={textareaClass}
              placeholder="Any extra instructions or context for readers..."
              value={form.additional_notes}
              onChange={(e) => setForm({ ...form, additional_notes: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Sample / Excerpt <span className="text-[#6B7280]/60">(readers will read this before answering questions)</span></label>
            <textarea
              rows={8}
              className={textareaClass}
              placeholder="Paste the author's sample chapter or excerpt here..."
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Payout ($)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className={inputClass}
                value={form.payout_per_response}
                onChange={(e) => setForm({ ...form, payout_per_response: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Max Responses</label>
              <input
                type="number"
                min="1"
                className={inputClass}
                value={form.max_responses}
                onChange={(e) => setForm({ ...form, max_responses: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Type</label>
              <select
                className={inputClass}
                value={form.identity_requirements}
                onChange={(e) => setForm({ ...form, identity_requirements: e.target.value })}
              >
                <option value="">Select...</option>
                {SENSITIVITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <FreeTextQuestionBuilder questions={questions} onChange={setQuestions} />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-xs font-semibold hover:bg-[#c49a3e] disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Add'}
            </button>
            <button
              onClick={() => { setShowForm(false); setQuestions([]); }}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-[#6B7280]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {panels.length === 0 ? (
        <p className="text-sm text-[#6B7280] dark:text-gray-400">No sensitivity panels yet.</p>
      ) : (
        <div className="space-y-2">
          {panels.map((p) => (
            <div
              key={p.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e8d5] dark:border-gray-700 p-3 flex items-center justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1B2A4A] dark:text-[#F5F0E8] truncate">{p.title}</p>
                <p className="text-xs text-[#6B7280] dark:text-gray-400">
                  {p.identity_requirements ? `${p.identity_requirements} · ` : ''}{p.responses_count}/{p.max_responses} · ${p.payout_per_response.toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleToggle(p.id, p.status)}
                  className={`text-xs px-2 py-1 rounded-full font-medium transition ${
                    p.status === 'active'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {p.status === 'active' ? 'Active' : 'Inactive'}
                </button>
                <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-600 transition">
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
