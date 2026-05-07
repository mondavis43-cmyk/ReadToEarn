import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, X, Trash2 } from 'lucide-react';

// -- Types -----------------------------------------------

interface QuickTask {
  id: string;
  title: string;
  description: string | null;
  payout: number;
  task_type: string;
  is_active: boolean;
  created_at: string;
}

interface Survey {
  id: string;
  title: string;
  description: string | null;
  payout: number;
  question_count: number;
  is_active: boolean;
  created_at: string;
}

interface BetaPanel {
  id: string;
  title: string;
  description: string | null;
  payout: number;
  genre: string | null;
  spots_total: number;
  spots_filled: number;
  is_active: boolean;
  created_at: string;
}

interface SensitivityPanel {
  id: string;
  title: string;
  description: string | null;
  payout: number;
  sensitivity_type: string | null;
  spots_total: number;
  spots_filled: number;
  is_active: boolean;
  created_at: string;
}

interface QuestionInput {
  question_text: string;
  options: string[];
  correct_answer: string;
}

type ActiveTab = 'quick_tasks' | 'surveys' | 'beta' | 'sensitivity';

// -- Shared styles ----------------------------------------

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-[#e8e8d5] dark:border-gray-700 bg-white dark:bg-gray-800 text-[#1B2A4A] dark:text-[#F5F0E8] text-sm focus:outline-none focus:ring-2';

// -- Question Builder sub-component -----------------------

function QuestionBuilder({
  questions,
  onChange,
}: {
  questions: QuestionInput[];
  onChange: (q: QuestionInput[]) => void;
}) {
  const addQuestion = () =>
    onChange([...questions, { question_text: '', options: ['', '', '', ''], correct_answer: '' }]);

  const removeQuestion = (idx: number) =>
    onChange(questions.filter((_, i) => i !== idx));

  const updateQuestion = (idx: number, field: keyof QuestionInput, value: string | string[]) => {
    const updated = questions.map((q, i) => (i === idx ? { ...q, [field]: value } : q));
    onChange(updated);
  };

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    const updated = questions.map((q, i) => {
      if (i !== qIdx) return q;
      const opts = [...q.options];
      opts[oIdx] = value;
      return { ...q, options: opts };
    });
    onChange(updated);
  };

  const addOption = (qIdx: number) => {
    const updated = questions.map((q, i) =>
      i === qIdx ? { ...q, options: [...q.options, ''] } : q
    );
    onChange(updated);
  };

  const removeOption = (qIdx: number, oIdx: number) => {
    const updated = questions.map((q, i) => {
      if (i !== qIdx) return q;
      const opts = q.options.filter((_, oi) => oi !== oIdx);
      return { ...q, options: opts };
    });
    onChange(updated);
  };

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
          No questions yet. Click "Add Question" to start building.
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

          <div className="space-y-2">
            <label className="text-xs text-[#6B7280] dark:text-gray-400">Answer options</label>
            {q.options.map((opt, oIdx) => (
              <div key={oIdx} className="flex items-center gap-2">
                <input
                  className={inputClass}
                  placeholder={`Option ${oIdx + 1}`}
                  value={opt}
                  onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                />
                {q.options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(qIdx, oIdx)}
                    className="text-red-400 hover:text-red-600 transition-colors shrink-0"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
            {q.options.length < 6 && (
              <button
                type="button"
                onClick={() => addOption(qIdx)}
                className="text-xs text-[#6B7280] hover:text-[#D4A843] transition-colors"
              >
                + Add option
              </button>
            )}
          </div>

          <div>
            <label className="text-xs text-[#6B7280] dark:text-gray-400 block mb-1">
              Correct answer
            </label>
            <select
              className={inputClass}
              value={q.correct_answer}
              onChange={(e) => updateQuestion(qIdx, 'correct_answer', e.target.value)}
            >
              <option value="">Select correct answer...</option>
              {q.options.filter(Boolean).map((opt, oIdx) => (
                <option key={oIdx} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>
      ))}
    </div>
  );
}

// -- Sub-components ---------------------------------------

function QuickTasksPanel() {
  const [tasks, setTasks] = useState<QuickTask[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', payout: 0.35, task_type: 'social' });
  const [questions, setQuestions] = useState<QuestionInput[]>([]);

  const TASK_TYPES = ['social', 'review', 'share', 'follow', 'other'];

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('quick_tasks').select('*').order('created_at', { ascending: false });
    setTasks(data || []);
  }

  async function handleSave() {
    if (!form.title) return;
    setSaving(true);

    const { data: newTask, error } = await supabase
      .from('quick_tasks')
      .insert({ ...form, is_active: true })
      .select('id, title')
      .single();

    if (!error && newTask) {
      // Insert questions if any
      if (questions.length > 0) {
        const rows = questions.map((q, idx) => ({
          task_id: newTask.id,
          task_type: 'quick_task',
          question_text: q.question_text,
          options: q.options.filter(Boolean),
          correct_answer: q.correct_answer,
          order_index: idx,
        }));
        await supabase.from('earning_task_questions').insert(rows);
      }

      await supabase.functions.invoke('notify-content-live', {
        body: { content_type: 'quick_task', content_id: newTask.id },
      });
    }

    setForm({ title: '', description: '', payout: 0.35, task_type: 'social' });
    setQuestions([]);
    setShowForm(false);
    setSaving(false);
    load();
  }

  async function handleToggle(id: string, current: boolean) {
    await supabase.from('quick_tasks').update({ is_active: !current }).eq('id', id);
    if (!current) {
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
        <p className="text-sm text-[#6B7280] dark:text-gray-400">{tasks.filter((t) => t.is_active).length} active tasks</p>
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
          <input className={inputClass} placeholder="Task title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className={inputClass} placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Payout ($)</label>
              <input type="number" step="0.01" min="0.01" className={inputClass} value={form.payout} onChange={(e) => setForm({ ...form, payout: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Type</label>
              <select className={inputClass} value={form.task_type} onChange={(e) => setForm({ ...form, task_type: e.target.value })}>
                {TASK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <QuestionBuilder questions={questions} onChange={setQuestions} />

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-xs font-semibold hover:bg-[#c49a3e] disabled:opacity-50">
              {saving ? 'Saving...' : 'Add'}
            </button>
            <button onClick={() => { setShowForm(false); setQuestions([]); }} className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-[#6B7280]">Cancel</button>
          </div>
        </div>
      )}

      {tasks.length === 0 ? (
        <p className="text-sm text-[#6B7280] dark:text-gray-400">No quick tasks yet.</p>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.id} className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e8d5] dark:border-gray-700 p-3 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1B2A4A] dark:text-[#F5F0E8] truncate">{task.title}</p>
                <p className="text-xs text-[#6B7280] dark:text-gray-400">{task.task_type} · ${task.payout.toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleToggle(task.id, task.is_active)}
                  className={`text-xs px-2 py-1 rounded-full font-medium transition ${task.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}
                >
                  {task.is_active ? 'Active' : 'Inactive'}
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

function SurveysPanel() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', payout: 1.00, question_count: 5 });
  const [questions, setQuestions] = useState<QuestionInput[]>([]);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('surveys').select('*').order('created_at', { ascending: false });
    setSurveys(data || []);
  }

  async function handleSave() {
    if (!form.title) return;
    setSaving(true);

    const { data: newSurvey, error } = await supabase
      .from('surveys')
      .insert({ ...form, is_active: true })
      .select('id, title')
      .single();

    if (!error && newSurvey) {
      if (questions.length > 0) {
        const rows = questions.map((q, idx) => ({
          task_id: newSurvey.id,
          task_type: 'survey',
          question_text: q.question_text,
          options: q.options.filter(Boolean),
          correct_answer: q.correct_answer,
          order_index: idx,
        }));
        await supabase.from('earning_task_questions').insert(rows);
      }

      await supabase.functions.invoke('notify-content-live', {
        body: { content_type: 'survey', content_id: newSurvey.id },
      });
    }

    setForm({ title: '', description: '', payout: 1.00, question_count: 5 });
    setQuestions([]);
    setShowForm(false);
    setSaving(false);
    load();
  }

  async function handleToggle(id: string, current: boolean) {
    await supabase.from('surveys').update({ is_active: !current }).eq('id', id);
    if (!current) {
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
        <p className="text-sm text-[#6B7280] dark:text-gray-400">{surveys.filter((s) => s.is_active).length} active surveys</p>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1 px-3 py-1.5 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-xs font-medium hover:bg-[#c49a3e]">
            <Plus size={13} /> Add Survey
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e8d5] dark:border-gray-700 p-4 space-y-3">
          <input className={inputClass} placeholder="Survey title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className={inputClass} placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Payout ($)</label>
              <input type="number" step="0.01" min="0.01" className={inputClass} value={form.payout} onChange={(e) => setForm({ ...form, payout: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Questions</label>
              <input type="number" min="1" className={inputClass} value={form.question_count} onChange={(e) => setForm({ ...form, question_count: parseInt(e.target.value) || 1 })} />
            </div>
          </div>

          <QuestionBuilder questions={questions} onChange={setQuestions} />

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-xs font-semibold hover:bg-[#c49a3e] disabled:opacity-50">
              {saving ? 'Saving...' : 'Add'}
            </button>
            <button onClick={() => { setShowForm(false); setQuestions([]); }} className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-[#6B7280]">Cancel</button>
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
                <p className="text-xs text-[#6B7280] dark:text-gray-400">{s.question_count} questions · ${s.payout.toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleToggle(s.id, s.is_active)}
                  className={`text-xs px-2 py-1 rounded-full font-medium transition ${s.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}
                >
                  {s.is_active ? 'Active' : 'Inactive'}
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

function BetaPanel_() {
  const [panels, setPanels] = useState<BetaPanel[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', payout: 1.50, genre: '', spots_total: 10 });
  const [questions, setQuestions] = useState<QuestionInput[]>([]);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('beta_panels').select('*').order('created_at', { ascending: false });
    setPanels(data || []);
  }

  async function handleSave() {
    if (!form.title) return;
    setSaving(true);

    const { data: newPanel, error } = await supabase
      .from('beta_panels')
      .insert({ ...form, genre: form.genre || null, spots_filled: 0, is_active: true })
      .select('id, title')
      .single();

    if (!error && newPanel) {
      if (questions.length > 0) {
        const rows = questions.map((q, idx) => ({
          task_id: newPanel.id,
          task_type: 'beta_panel',
          question_text: q.question_text,
          options: q.options.filter(Boolean),
          correct_answer: q.correct_answer,
          order_index: idx,
        }));
        await supabase.from('earning_task_questions').insert(rows);
      }

      await supabase.functions.invoke('notify-content-live', {
        body: { content_type: 'beta_panel', content_id: newPanel.id },
      });
    }

    setForm({ title: '', description: '', payout: 1.50, genre: '', spots_total: 10 });
    setQuestions([]);
    setShowForm(false);
    setSaving(false);
    load();
  }

  async function handleToggle(id: string, current: boolean) {
    await supabase.from('beta_panels').update({ is_active: !current }).eq('id', id);
    if (!current) {
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
        <p className="text-sm text-[#6B7280] dark:text-gray-400">{panels.filter((p) => p.is_active).length} active panels</p>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1 px-3 py-1.5 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-xs font-medium hover:bg-[#c49a3e]">
            <Plus size={13} /> Add Panel
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e8d5] dark:border-gray-700 p-4 space-y-3">
          <input className={inputClass} placeholder="Panel title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className={inputClass} placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Payout ($)</label>
              <input type="number" step="0.01" min="0.01" className={inputClass} value={form.payout} onChange={(e) => setForm({ ...form, payout: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Spots</label>
              <input type="number" min="1" className={inputClass} value={form.spots_total} onChange={(e) => setForm({ ...form, spots_total: parseInt(e.target.value) || 1 })} />
            </div>
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Genre</label>
              <input className={inputClass} placeholder="Optional" value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} />
            </div>
          </div>

          <QuestionBuilder questions={questions} onChange={setQuestions} />

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-xs font-semibold hover:bg-[#c49a3e] disabled:opacity-50">
              {saving ? 'Saving...' : 'Add'}
            </button>
            <button onClick={() => { setShowForm(false); setQuestions([]); }} className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-[#6B7280]">Cancel</button>
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
                  {p.genre ? `${p.genre} · ` : ''}{p.spots_filled}/{p.spots_total} spots · ${p.payout.toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleToggle(p.id, p.is_active)}
                  className={`text-xs px-2 py-1 rounded-full font-medium transition ${p.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}
                >
                  {p.is_active ? 'Active' : 'Inactive'}
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

function SensitivityPanel_() {
  const [panels, setPanels] = useState<SensitivityPanel[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', payout: 10.00, sensitivity_type: '', spots_total: 5 });
  const [questions, setQuestions] = useState<QuestionInput[]>([]);

  const SENSITIVITY_TYPES = ['trauma', 'disability', 'race', 'lgbtq+', 'religion', 'mental health', 'other'];

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('sensitivity_panels').select('*').order('created_at', { ascending: false });
    setPanels(data || []);
  }

  async function handleSave() {
    if (!form.title) return;
    setSaving(true);

    const { data: newPanel, error } = await supabase
      .from('sensitivity_panels')
      .insert({ ...form, sensitivity_type: form.sensitivity_type || null, spots_filled: 0, is_active: true })
      .select('id, title')
      .single();

    if (!error && newPanel) {
      if (questions.length > 0) {
        const rows = questions.map((q, idx) => ({
          task_id: newPanel.id,
          task_type: 'sensitivity_panel',
          question_text: q.question_text,
          options: q.options.filter(Boolean),
          correct_answer: q.correct_answer,
          order_index: idx,
        }));
        await supabase.from('earning_task_questions').insert(rows);
      }

      await supabase.functions.invoke('notify-content-live', {
        body: { content_type: 'sensitivity_panel', content_id: newPanel.id },
      });
    }

    setForm({ title: '', description: '', payout: 10.00, sensitivity_type: '', spots_total: 5 });
    setQuestions([]);
    setShowForm(false);
    setSaving(false);
    load();
  }

  async function handleToggle(id: string, current: boolean) {
    await supabase.from('sensitivity_panels').update({ is_active: !current }).eq('id', id);
    if (!current) {
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
        <p className="text-sm text-[#6B7280] dark:text-gray-400">{panels.filter((p) => p.is_active).length} active panels</p>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1 px-3 py-1.5 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-xs font-medium hover:bg-[#c49a3e]">
            <Plus size={13} /> Add Panel
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e8d5] dark:border-gray-700 p-4 space-y-3">
          <input className={inputClass} placeholder="Panel title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className={inputClass} placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Payout ($)</label>
              <input type="number" step="0.01" min="0.01" className={inputClass} value={form.payout} onChange={(e) => setForm({ ...form, payout: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Spots</label>
              <input type="number" min="1" className={inputClass} value={form.spots_total} onChange={(e) => setForm({ ...form, spots_total: parseInt(e.target.value) || 1 })} />
            </div>
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Type</label>
              <select className={inputClass} value={form.sensitivity_type} onChange={(e) => setForm({ ...form, sensitivity_type: e.target.value })}>
                <option value="">Select...</option>
                {SENSITIVITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <QuestionBuilder questions={questions} onChange={setQuestions} />

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-xs font-semibold hover:bg-[#c49a3e] disabled:opacity-50">
              {saving ? 'Saving...' : 'Add'}
            </button>
            <button onClick={() => { setShowForm(false); setQuestions([]); }} className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-[#6B7280]">Cancel</button>
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
                  {p.sensitivity_type ? `${p.sensitivity_type} · ` : ''}{p.spots_filled}/{p.spots_total} spots · ${p.payout.toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleToggle(p.id, p.is_active)}
                  className={`text-xs px-2 py-1 rounded-full font-medium transition ${p.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}
                >
                  {p.is_active ? 'Active' : 'Inactive'}
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

// -- Main export ------------------------------------------

export function AdminEarning() {
  const [tab, setTab] = useState<ActiveTab>('quick_tasks');

  const TABS: { key: ActiveTab; label: string }[] = [
    { key: 'quick_tasks', label: 'Quick Tasks' },
    { key: 'surveys', label: 'Surveys' },
    { key: 'beta', label: 'Beta Readers' },
    { key: 'sensitivity', label: 'Sensitivity Readers' },
  ];

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-[#1B2A4A] dark:text-[#F5F0E8]">Earning Features</h2>

      {/* Sub-tabs */}
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

      {/* Panel */}
      {tab === 'quick_tasks' && <QuickTasksPanel />}
      {tab === 'surveys' && <SurveysPanel />}
      {tab === 'beta' && <BetaPanel_ />}
      {tab === 'sensitivity' && <SensitivityPanel_ />}
    </div>
  );
}
