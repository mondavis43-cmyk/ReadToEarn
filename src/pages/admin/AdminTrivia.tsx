import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, X, Star } from 'lucide-react';

interface TriviaQuestion {
  id: string;
  question_text: string;
  correct_answer: string;
  wrong_answer_1: string;
  wrong_answer_2: string;
  wrong_answer_3: string;
  book_title: string | null;
  is_active: boolean;
  active_date: string | null;
  created_at: string;
}

interface NewTrivia {
  question_text: string;
  correct_answer: string;
  wrong_answer_1: string;
  wrong_answer_2: string;
  wrong_answer_3: string;
  book_title: string;
  active_date: string;
}

const emptyTrivia: NewTrivia = {
  question_text: '',
  correct_answer: '',
  wrong_answer_1: '',
  wrong_answer_2: '',
  wrong_answer_3: '',
  book_title: '',
  active_date: '',
};

export function AdminTrivia() {
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [newQ, setNewQ] = useState<NewTrivia>(emptyTrivia);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-[#e8e0d5] dark:border-gray-700 bg-white dark:bg-gray-800 text-[#1B2A4A] dark:text-[#F5F0E8] text-sm focus:outline-none focus:ring-2';
  const correctInputClass =
    'w-full px-3 py-2 rounded-lg border border-green-400 bg-green-50 dark:bg-green-900/20 text-[#1B2A4A] dark:text-[#F5F0E8] text-sm focus:outline-none focus:ring-2 focus:ring-green-400/40';

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data } = await supabase
      .from('daily_trivia')
      .select('*')
      .order('active_date', { ascending: false });
    setQuestions(data || []);
  }

  async function handleSave() {
    if (!newQ.question_text || !newQ.correct_answer || !newQ.wrong_answer_1 || !newQ.wrong_answer_2 || !newQ.wrong_answer_3) {
      setError('All answer fields are required.');
      return;
    }
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('daily_trivia').insert({
      question_text: newQ.question_text,
      correct_answer: newQ.correct_answer,
      wrong_answer_1: newQ.wrong_answer_1,
      wrong_answer_2: newQ.wrong_answer_2,
      wrong_answer_3: newQ.wrong_answer_3,
      book_title: newQ.book_title || null,
      active_date: newQ.active_date || null,
      is_active: false,
    });
    if (err) { setError('Failed to save question.'); setSaving(false); return; }
    setSuccess('Trivia question added!');
    setNewQ(emptyTrivia);
    setShowForm(false);
    setSaving(false);
    loadData();
  }

  async function handleSetActive(id: string) {
    // Deactivate all, then activate selected
    await supabase.from('daily_trivia').update({ is_active: false }).neq('id', id);
    await supabase.from('daily_trivia').update({ is_active: true }).eq('id', id);
    setSuccess("Today's trivia question set!");
    loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this trivia question?')) return;
    await supabase.from('daily_trivia').delete().eq('id', id);
    loadData();
  }

  const activeQuestion = questions.find((q) => q.is_active);

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
          Daily Trivia ({questions.length} questions)
        </h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-3 py-2 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-sm font-medium hover:bg-[#c49a3a]"
          >
            <Plus size={16} /> Add Question
          </button>
        )}
      </div>

      {/* Active question banner */}
      {activeQuestion && (
        <div className="bg-[#D4A843]/10 border border-[#D4A843]/40 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Star size={14} className="text-[#D4A843]" />
            <p className="text-xs font-semibold text-[#D4A843] uppercase tracking-wide">
              Today's Active Question
            </p>
          </div>
          <p className="text-sm font-medium text-[#1B2A4A] dark:text-[#F5F0E8]">
            {activeQuestion.question_text}
          </p>
          {activeQuestion.book_title && (
            <p className="text-xs text-[#6B7280] dark:text-gray-400 mt-0.5">
              From: {activeQuestion.book_title}
            </p>
          )}
          <p className="text-xs text-green-700 dark:text-green-400 mt-1">
            ✓ {activeQuestion.correct_answer}
          </p>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e0d5] dark:border-gray-700 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[#1B2A4A] dark:text-[#F5F0E8]">Add Trivia Question</h3>
            <button onClick={() => { setShowForm(false); setNewQ(emptyTrivia); }} className="text-[#6B7280]">
              <X size={18} />
            </button>
          </div>

          <input
            className={inputClass}
            placeholder="Question"
            value={newQ.question_text}
            onChange={(e) => setNewQ({ ...newQ, question_text: e.target.value })}
          />
          <input
            className={correctInputClass}
            placeholder="Correct Answer"
            value={newQ.correct_answer}
            onChange={(e) => setNewQ({ ...newQ, correct_answer: e.target.value })}
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(['wrong_answer_1', 'wrong_answer_2', 'wrong_answer_3'] as const).map((field) => (
              <input
                key={field}
                className={inputClass}
                placeholder={`Wrong Answer ${field.slice(-1)}`}
                value={newQ[field]}
                onChange={(e) => setNewQ({ ...newQ, [field]: e.target.value })}
              />
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              className={inputClass}
              placeholder="Book title (optional)"
              value={newQ.book_title}
              onChange={(e) => setNewQ({ ...newQ, book_title: e.target.value })}
            />
            <div>
              <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">
                Scheduled Date (optional)
              </label>
              <input
                type="date"
                className={inputClass}
                value={newQ.active_date}
                onChange={(e) => setNewQ({ ...newQ, active_date: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-sm font-semibold hover:bg-[#c49a3a] disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Add Question'}
            </button>
            <button
              onClick={() => { setShowForm(false); setNewQ(emptyTrivia); }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-[#6B7280] hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Question list */}
      {questions.length === 0 ? (
        <p className="text-sm text-[#6B7280] dark:text-gray-400">No trivia questions yet.</p>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <div
              key={q.id}
              className={`bg-white dark:bg-gray-800 rounded-xl border p-4 space-y-2 ${
                q.is_active
                  ? 'border-[#D4A843] dark:border-[#D4A843]'
                  : 'border-[#e8e0d5] dark:border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {q.is_active && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#D4A843]/20 text-[#D4A843] font-medium flex items-center gap-1">
                        <Star size={10} /> Active
                      </span>
                    )}
                    {q.active_date && (
                      <span className="text-xs text-[#6B7280] dark:text-gray-400">
                        Scheduled: {new Date(q.active_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-[#1B2A4A] dark:text-[#F5F0E8] mt-1">
                    {q.question_text}
                  </p>
                  {q.book_title && (
                    <p className="text-xs text-[#6B7280] dark:text-gray-400 mt-0.5">
                      From: {q.book_title}
                    </p>
                  )}
                  <div className="mt-2 space-y-0.5 text-xs">
                    <p className="text-green-700 dark:text-green-400">✓ {q.correct_answer}</p>
                    <p className="text-[#6B7280] dark:text-gray-400">✗ {q.wrong_answer_1}</p>
                    <p className="text-[#6B7280] dark:text-gray-400">✗ {q.wrong_answer_2}</p>
                    <p className="text-[#6B7280] dark:text-gray-400">✗ {q.wrong_answer_3}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap pt-1">
                {!q.is_active && (
                  <button
                    onClick={() => handleSetActive(q.id)}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-[#D4A843] text-[#D4A843] hover:bg-[#D4A843]/10 transition"
                  >
                    <Star size={12} /> Set as Today's Question
                  </button>
                )}
                <button
                  onClick={() => handleDelete(q.id)}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-red-300 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition ml-auto"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
