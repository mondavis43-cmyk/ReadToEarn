import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface QuickTask {
id: string;
title: string;
author_name: string | null;
task_type: string;
description: string | null;
options: string[] | null;
payout_per_response: number;
max_responses: number;
responses_count: number;
additional_notes: string | null;
status: string;
}

const taskTypeLabel: Record<string, string> = {
cover_vote: 'Cover Vote',
title_test: 'Title Test',
blurb_test: 'Blurb Test',
};

export default function QuickTasks() {
const { user } = useAuth();
const [tasks, setTasks] = useState<QuickTask[]>([]);
const [selected, setSelected] = useState<QuickTask | null>(null);
const [choice, setChoice] = useState('');
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
    .from('quick_tasks')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  const open = (data ?? []).filter(
    (t: QuickTask) => (t.responses_count ?? 0) < t.max_responses
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
  if (Array.isArray(task.options)) return task.options;
  try {
    const parsed = JSON.parse(task.options as unknown as string ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function handleSubmit() {
  if (!selected || !choice || !user) return;
  setSubmitting(true);

  const { data: current } = await supabase
    .from('quick_tasks')
    .select('responses_count, max_responses, payout_per_response')
    .eq('id', selected.id)
    .single();

  if (!current || (current.responses_count ?? 0) >= current.max_responses) {
    alert('This task is no longer accepting responses.');
    setSubmitting(false);
    return;
  }

  const earned = current.payout_per_response ?? selected.payout_per_response ?? 0.35;

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
    reason: `Quick task response - ${selected.title}`,
  });

  setSuccess(true);
  setSubmitting(false);
  setSelected(null);
  setChoice('');
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
              <h2 className="text-lg font-bold mt-2">{selected.title}</h2>
              {selected.author_name && (
                <p className="text-sm text-gray-400">by {selected.author_name}</p>
              )}
            </div>
            <button
              onClick={() => { setSelected(null); setChoice(''); }}
              className="text-gray-500 hover:text-white text-xl leading-none ml-4"
            >
              ✕
            </button>
          </div>

          {selected.description && (
            <p className="text-sm text-gray-400 mb-4">{selected.description}</p>
          )}

          {selected.additional_notes && (
            <div className="bg-gray-800 rounded-lg p-3 mb-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-gray-300">{selected.additional_notes}</p>
            </div>
          )}

          <p className="text-sm font-medium text-gray-200 mb-3">Choose one:</p>
          <div className="space-y-2 mb-6">
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

          <button
            onClick={handleSubmit}
            disabled={!choice || submitting}
            className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl hover:bg-yellow-300 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : `Submit & Earn $${(selected.payout_per_response ?? 0.35).toFixed(2)}`}
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
          const remaining = task.max_responses - (task.responses_count ?? 0);
          const payout = task.payout_per_response ?? 0.35;
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
                  <h2 className="text-lg font-semibold mt-2">{task.title}</h2>
                  {task.author_name && (
                    <p className="text-sm text-gray-400">by {task.author_name}</p>
                  )}
                  {task.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                  )}
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
                  onClick={() => { setSelected(task); setChoice(''); setSuccess(false); }}
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
