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
package_label: string;
}

const taskTypeLabel: Record<string, string> = {
cover_vote: 'Cover Vote',
title_test: 'Title Test',
blurb_test: 'Blurb Test',
};

const earnMap: Record<string, number> = {
Sample: 0.42,
Standard: 0.38,
Wide: 0.35,
};

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

  const { data } = await supabase
    .from('author_quick_task_submissions')
    .select('*')
    .in('status', ['active', 'approved'])
    .order('created_at', { ascending: false });

  const open = (data ?? []).filter(
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
  try {
    const parsed = JSON.parse(task.task_content ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return task.task_content ? task.task_content.split('\n').filter(Boolean) : [];
  }
}

async function handleSubmit() {
  if (!selected || !choice || !user) return;
  setSubmitting(true);

  const { data: current } = await supabase
    .from('author_quick_task_submissions')
    .select('package_label, completions, completions_count')
    .eq('id', selected.id)
    .single();

  if (!current || (current.completions_count ?? 0) >= current.completions) {
    alert('This task is no longer accepting responses.');
    setSubmitting(false);
    return;
  }

  const earned = earnMap[current.package_label] ?? 0.35;

  const { error } = await supabase.from('quick_task_responses').insert({
    task_id: selected.id,
    user_id: user.id,
    selected_option: choice,
    earned,
  });

  if (error) {
    alert('Something went wrong. Please try again.');
    setSubmitting(false);
    return;
  }

  await supabase.rpc('increment_site_credit', {
    user_id: user.id,
    amount: earned,
  });

  await supabase.from('payout_logs').insert({
    user_id: user.id,
    amount: earned,
    status: 'completed',
    reason: `Quick task response - ${selected.book_title}`,
  });

  setSuccess(true);
  setSubmitting(false);
  setSelected(null);
  setChoice('');
  setComment('');
  loadTasks();
}

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
      Help authors make key decisions about their books. Vote on covers, titles, and blurbs.
      Each task takes under a minute and earns you instant credit.
    </p>

    {success && (
      <div className="bg-green-900/40 border border-green-500 text-green-300 rounded-lg p-4 mb-6">
        Response submitted! Your earnings have been added to your balance.
      </div>
    )}

    {/* MODAL */}
    {selected && (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded">
                {taskTypeLabel[selected.task_type] ?? selected.task_type}
              </span>
              <h2 className="text-lg font-bold mt-2">{selected.book_title}</h2>
              <p className="text-sm text-gray-400">by {selected.author_name}</p>
            </div>
            <button
              onClick={() => { setSelected(null); setChoice(''); setComment(''); }}
              className="text-gray-500 hover:text-white text-xl leading-none ml-4"
            >
              ✕
            </button>
          </div>

          {selected.notes && (
            <div className="bg-gray-800 rounded-lg p-3 mb-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Notes from author</p>
              <p className="text-sm text-gray-300">{selected.notes}</p>
            </div>
          )}

          <p className="text-sm font-medium text-gray-200 mb-3">Choose one:</p>
          <div className="space-y-2 mb-4">
            {getOptions(selected).map((opt, idx) => (
              <label key={idx} className="flex items-center gap-3 cursor-pointer bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-lg px-4 py-3 transition">
                <input
                  type="radio"
                  name="quick_task_choice"
                  value={opt}
                  checked={choice === opt}
                  onChange={() => setChoice(opt)}
                  className="accent-yellow-400"
                />
                <span className="text-sm text-gray-200">{opt}</span>
              </label>
            ))}
          </div>

          <div className="mb-6">
            <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">
              Why did you choose this? <span className="normal-case text-gray-600">(optional)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Share your reasoning..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 resize-none"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!choice || submitting}
            className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl hover:bg-yellow-300 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : `Submit & Earn $${(earnMap[selected.package_label] ?? 0.35).toFixed(2)}`}
          </button>
        </div>
      </div>
    )}

    {/* TASK LIST */}
    {tasks.length === 0 ? (
      <div className="text-center py-20 text-gray-500">
        No quick tasks available right now. Check back soon.
      </div>
    ) : (
      <div className="space-y-4">
        {tasks.map((task) => {
          const done = completedIds.has(task.id);
          const remaining = task.completions - (task.completions_count ?? 0);
          const payout = earnMap[task.package_label] ?? 0.35;
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
                </div>
                <div className="text-right shrink-0">
                  <p className="text-yellow-400 font-bold text-lg">${payout.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">{remaining} spots left</p>
                </div>
              </div>

              {done ? (
                <p className="mt-4 text-sm text-green-400">✓ Completed</p>
              ) : (
                <button
                  onClick={() => { setSelected(task); setChoice(''); setComment(''); setSuccess(false); }}
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
  </div>
);
}
