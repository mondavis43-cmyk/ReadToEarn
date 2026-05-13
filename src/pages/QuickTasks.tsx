import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface QuickTask {
  id: string;
  author_name: string;
  book_title: string;
  task_type: string;
  task_content: string;
  completions: number;
  completions_count: number;
  notes: string;
}

export default function QuickTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<QuickTask[]>([]);
  const [selected, setSelected] = useState<QuickTask | null>(null);
  const [choice, setChoice] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    setLoading(true);
    const { data: taskData } = await supabase
      .from('author_quick_task_submissions')
      .select('*')
      .in('status', ['active', 'approved'])
      .filter('completions_count', 'lt', supabase.rpc)
      .order('created_at', { ascending: false });

    // Filter out full tasks client-side
    const open = (taskData ?? []).filter(
      (t: QuickTask) => (t.completions_count ?? 0) < t.completions
    );

    if (user) {
      const { data: done } = await supabase
        .from('quick_task_responses')
        .select('task_id')
        .eq('user_id', user.id);
      setCompletedIds(new Set((done ?? []).map((r: { task_id: string }) => r.task_id)));
    }

    setTasks(open);
    setLoading(false);
  }

  function getOptions(task: QuickTask): string[] {
    if (!task.task_content) return [];
    return task.task_content
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  }

  async function handleSubmit() {
    if (!selected || !choice || !user) return;
    setSubmitting(true);

    const earnMap: Record<string, number> = {
      Sample: 0.42,
      Standard: 0.38,
      Wide: 0.35,
    };

    const { data: task } = await supabase
      .from('author_quick_task_submissions')
      .select('package_label, completions, completions_count')
      .eq('id', selected.id)
      .single();

    if (!task || (task.completions_count ?? 0) >= task.completions) {
      alert('This task is no longer accepting responses.');
      setSubmitting(false);
      return;
    }

    const earned = earnMap[task.package_label] ?? 0.35;

    const { error } = await supabase.from('quick_task_responses').insert({
      task_id: selected.id,
      user_id: user.id,
      choice,
      comment: comment || null,
      earned,
    });

    if (error) {
      alert('Something went wrong. Please try again.');
      setSubmitting(false);
      return;
    }

    // Credit balance atomically
    await supabase.rpc('increment_site_credit', { user_id: user.id, amount: earned });

    await supabase.from('payout_logs').insert({
      user_id: user.id,
      amount: earned,
      status: 'completed',
      reason: `Quick task response - ${selected.task_type}`,
    });

    setSuccess(true);
    setSubmitting(false);
    setSelected(null);
    setChoice('');
    setComment('');
    loadTasks();
  }

  const taskTypeLabel: Record<string, string> = {
    cover_vote: 'Cover Vote',
    title_test: 'Title Test',
    blurb_test: 'Blurb Test',
  };

  const earnMap: Record<string, string> = {
    Sample: '$0.42',
    Standard: '$0.38',
    Wide: '$0.35',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Loading tasks...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 py-10 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-yellow-400 mb-2">Quick Tasks</h1>
      <p className="text-gray-400 mb-8">
        Help authors make creative decisions. Pick your favorite option and earn instantly.
        Takes 1–3 minutes.
      </p>

      {success && (
        <div className="bg-green-900/40 border border-green-500 text-green-300 rounded-lg p-4 mb-6">
          Response submitted! Your earnings have been added to your balance.
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          No quick tasks available right now. Check back soon.
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => {
            const done = completedIds.has(task.id);
            const remaining = task.completions - (task.completions_count ?? 0);
            return (
              <div
                key={task.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded">
                      {taskTypeLabel[task.task_type] ?? task.task_type}
                    </span>
                    <h2 className="text-lg font-semibold mt-2">{task.book_title}</h2>
                    <p className="text-sm text-gray-400">by {task.author_name}</p>
                    {task.notes && (
                      <p className="text-sm text-gray-500 mt-1 italic">"{task.notes}"</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-yellow-400 font-bold text-lg">
                      {earnMap[task.package_label ?? ''] ?? '$0.35'}
                    </p>
                    <p className="text-xs text-gray-500">{remaining} spots left</p>
                  </div>
                </div>

                {done ? (
                  <p className="mt-4 text-sm text-green-400">✓ Completed</p>
                ) : (
                  <button
                    onClick={() => { setSelected(task); setSuccess(false); }}
                    className="mt-4 bg-yellow-400 text-black font-semibold px-4 py-2 rounded-lg hover:bg-yellow-300 transition text-sm"
                  >
                    Start Task
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Task Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-yellow-400">
                  {taskTypeLabel[selected.task_type] ?? selected.task_type}
                </span>
                <h2 className="text-xl font-bold mt-1">{selected.book_title}</h2>
                <p className="text-sm text-gray-400">by {selected.author_name}</p>
              </div>
              <button
                onClick={() => { setSelected(null); setChoice(''); setComment(''); }}
                className="text-gray-500 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            {selected.notes && (
              <p className="text-sm text-gray-400 italic mb-4 border-l-2 border-yellow-400/40 pl-3">
                {selected.notes}
              </p>
            )}

            <p className="text-sm text-gray-300 mb-4 font-medium">
              {selected.task_type === 'cover_vote' && 'Which cover would make you pick up this book?'}
              {selected.task_type === 'title_test' && 'Which title grabs you most?'}
              {selected.task_type === 'blurb_test' && 'Which blurb is most compelling?'}
            </p>

            <div className="space-y-3 mb-6">
              {getOptions(selected).map((option, i) => (
                <label
                  key={i}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                    choice === option
                      ? 'border-yellow-400 bg-yellow-400/10'
                      : 'border-gray-700 hover:border-gray-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="choice"
                    value={option}
                    checked={choice === option}
                    onChange={() => setChoice(option)}
                    className="mt-0.5 accent-yellow-400"
                  />
                  {selected.task_type === 'cover_vote' ? (
                    <div>
                      <p className="text-sm text-gray-300 mb-2">Option {i + 1}</p>
                      <img
                        src={option}
                        alt={`Cover option ${i + 1}`}
                        className="w-24 h-32 object-cover rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-gray-200">{option}</span>
                  )}
                </label>
              ))}
            </div>

            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-1">
                Want to explain your choice? <span className="text-gray-600">(optional)</span>
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Share your thoughts..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 resize-none"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={!choice || submitting}
              className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl hover:bg-yellow-300 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : `Submit & Earn ${earnMap[selected.package_label ?? ''] ?? '$0.35'}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
