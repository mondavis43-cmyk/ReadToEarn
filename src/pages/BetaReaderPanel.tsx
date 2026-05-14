import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface BetaPanel {
id: string;
title: string;
author_name: string | null;
author_id: string | null;
genre: string | null;
chapter_text: string;
excerpt: string | null;
additional_notes: string | null;
questions: Question[];
max_responses: number;
responses_count: number;
payout_per_response: number;
status: string;
}

interface Question {
question_text: string;
required: boolean;
order_index: number;
}

type Step = 'list' | 'read' | 'answer';

export default function BetaReaderPanel() {
const { user } = useAuth();
const [panels, setPanels] = useState<BetaPanel[]>([]);
const [selected, setSelected] = useState<BetaPanel | null>(null);
const [questions, setQuestions] = useState<Question[]>([]);
const [step, setStep] = useState<Step>('list');
const [answers, setAnswers] = useState<Record<number, string>>({});
const [readerEmail, setReaderEmail] = useState('');
const [manuscriptInterest, setManuscriptInterest] = useState<'unpaid' | 'paid' | 'none' | ''>('');
const [submitting, setSubmitting] = useState(false);
const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
const [success, setSuccess] = useState(false);
const [loading, setLoading] = useState(true);

useEffect(() => {
  loadPanels();
}, []);

async function loadPanels() {
  setLoading(true);

  const { data } = await supabase
    .from('beta_panels')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  const open = (data ?? []).filter(
    (p: BetaPanel) => (p.responses_count ?? 0) < p.max_responses
  );

  if (user) {
    const { data: done } = await supabase
      .from('beta_panel_responses')
      .select('panel_id')
      .eq('user_id', user.id);
    setCompletedIds(new Set((done ?? []).map((r: { panel_id: string }) => r.panel_id)));
  }

  setPanels(open);
  setLoading(false);
}

function openPanel(panel: BetaPanel) {
  const qs: Question[] = Array.isArray(panel.questions) ? panel.questions : [];
  setQuestions(qs);
  setAnswers({});
  setReaderEmail('');
  setManuscriptInterest('');
  setSelected(panel);
  setStep('read');
  setSuccess(false);
}

function isValid() {
  return questions
    .filter((q) => q.required)
    .every((_, idx) => (answers[idx] ?? '').trim().length > 0);
}

async function handleSubmit() {
  if (!selected || !user || !isValid()) return;
  setSubmitting(true);

  const { data: current } = await supabase
    .from('beta_panels')
    .select('responses_count, max_responses')
    .eq('id', selected.id)
    .single();

  if (!current || (current.responses_count ?? 0) >= current.max_responses) {
    alert('This panel is no longer accepting readers.');
    setSubmitting(false);
    return;
  }

  const responsePayload = questions.map((q, idx) => ({
    question: q.question_text,
    answer: answers[idx] ?? '',
  }));

  const { error } = await supabase.from('beta_panel_responses').insert({
    panel_id: selected.id,
    user_id: user.id,
    answers: responsePayload,
    contact_email: readerEmail || null,
    wants_full_beta: manuscriptInterest === 'unpaid' || manuscriptInterest === 'paid' ? true : false,
    earned: selected.payout_per_response,
  });

  if (error) {
    alert('Something went wrong. Please try again.');
    setSubmitting(false);
    return;
  }

  await supabase.rpc('increment_site_credit', {
    user_id: user.id,
    amount: selected.payout_per_response,
  });

  await supabase.from('payout_logs').insert({
    user_id: user.id,
    amount: selected.payout_per_response,
    status: 'completed',
    reason: `Beta reader response - ${selected.title}`,
  });

  setSuccess(true);
  setSubmitting(false);
  setStep('list');
  setSelected(null);
  loadPanels();
}

if (loading) {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-400">Loading panels...</p>
    </div>
  );
}

// LIST VIEW
if (step === 'list') {
  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 py-10 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-yellow-400 mb-2">Beta Reader Panels</h1>
      <p className="text-gray-400 mb-8">
        Read the first chapter of an unpublished book and share your honest feedback.
        Authors use your input to shape their work before publication.
      </p>

      {success && (
        <div className="bg-green-900/40 border border-green-500 text-green-300 rounded-lg p-4 mb-6">
          Feedback submitted! Your earnings have been added to your balance.
        </div>
      )}

      {panels.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          No beta reader panels available right now. Check back soon.
        </div>
      ) : (
        <div className="space-y-4">
          {panels.map((panel) => {
            const done = completedIds.has(panel.id);
            const remaining = panel.max_responses - (panel.responses_count ?? 0);
            const payout = panel.payout_per_response ?? 1.5;
            return (
              <div
                key={panel.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    {panel.genre && (
                      <span className="text-xs font-semibold uppercase tracking-wide text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded">
                        {panel.genre}
                      </span>
                    )}
                    <h2 className="text-lg font-semibold mt-2">{panel.title}</h2>
                    {panel.author_name && (
                      <p className="text-sm text-gray-400">by {panel.author_name}</p>
                    )}
                    {panel.chapter_text && (
                      <p className="text-sm text-gray-500 mt-2 line-clamp-2">{panel.chapter_text}</p>
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
                    onClick={() => openPanel(panel)}
                    className="mt-4 bg-yellow-400 text-black font-semibold px-4 py-2 rounded-lg hover:bg-yellow-300 transition text-sm"
                  >
                    Read & Give Feedback
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

// READ VIEW
if (step === 'read' && selected) {
  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 py-10 max-w-2xl mx-auto">
      <button
        onClick={() => setStep('list')}
        className="text-gray-400 hover:text-white text-sm mb-6 flex items-center gap-1"
      >
        ← Back to panels
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{selected.title}</h1>
        {selected.author_name && (
          <p className="text-gray-400">by {selected.author_name}</p>
        )}
        {selected.genre && (
          <span className="text-xs font-semibold uppercase tracking-wide text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded mt-2 inline-block">
            {selected.genre}
          </span>
        )}
      </div>

      {selected.chapter_text && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">About this book</p>
          <p className="text-gray-300 text-sm leading-relaxed">{selected.chapter_text}</p>
        </div>
      )}

      {selected.additional_notes && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Notes from the author</p>
          <p className="text-gray-300 text-sm leading-relaxed">{selected.additional_notes}</p>
        </div>
      )}

      {selected.excerpt && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-4">First Chapter / Excerpt</p>
          <div className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap font-serif">
            {selected.excerpt}
          </div>
        </div>
      )}

      <button
        onClick={() => setStep('answer')}
        className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl hover:bg-yellow-300 transition"
      >
        I've Read It — Answer Questions →
      </button>
    </div>
  );
}

// ANSWER VIEW
if (step === 'answer' && selected) {
  const payout = selected.payout_per_response ?? 1.5;
  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 py-10 max-w-2xl mx-auto">
      <button
        onClick={() => setStep('read')}
        className="text-gray-400 hover:text-white text-sm mb-6 flex items-center gap-1"
      >
        ← Back to excerpt
      </button>

      <h1 className="text-2xl font-bold mb-1">{selected.title}</h1>
      {selected.author_name && (
        <p className="text-gray-400 text-sm mb-6">by {selected.author_name}</p>
      )}

      <p className="text-xs text-gray-500 mb-6">
        Answer as thoroughly or briefly as you like. There are no right or wrong answers.
      </p>

      <div className="space-y-6 mb-8">
        {questions.map((q, idx) => (
          <div key={idx}>
            <label className="block text-sm font-medium text-gray-200 mb-1">
              {q.question_text}
              {q.required && <span className="text-yellow-400 ml-1">*</span>}
            </label>
            <textarea
              value={answers[idx] ?? ''}
              onChange={(e) =>
                setAnswers((prev) => ({ ...prev, [idx]: e.target.value }))
              }
              rows={4}
              placeholder="Your thoughts..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 resize-none"
            />
          </div>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-8">
        <p className="text-sm font-semibold text-white mb-1">
          Interested in reading the full manuscript?
        </p>
        <p className="text-xs text-gray-500 mb-4">
          The author may reach out to you if you're open to it. Completely optional — you earn ${payout.toFixed(2)} either way.
        </p>
        <div className="space-y-2 mb-4">
          {([
            { value: 'unpaid', label: 'Yes — interested as an unpaid beta reader' },
            { value: 'paid',   label: 'Yes — interested as a paid beta reader' },
            { value: 'none',   label: 'Not interested' },
          ] as const).map(opt => (
            <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="manuscript_interest"
                value={opt.value}
                checked={manuscriptInterest === opt.value}
                onChange={() => setManuscriptInterest(opt.value)}
                className="accent-yellow-400"
              />
              <span className="text-sm text-gray-200">{opt.label}</span>
            </label>
          ))}
        </div>
        {(manuscriptInterest === 'unpaid' || manuscriptInterest === 'paid') && (
          <input
            type="email"
            value={readerEmail}
            onChange={(e) => setReaderEmail(e.target.value)}
            placeholder="your@email.com (optional)"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
          />
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!isValid() || submitting}
        className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl hover:bg-yellow-300 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {submitting ? 'Submitting...' : `Submit Feedback & Earn $${payout.toFixed(2)}`}
      </button>
    </div>
  );
}

return null;
}