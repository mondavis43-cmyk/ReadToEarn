import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface BetaPanel {
  id: string;
  author_name: string;
  book_title: string;
  genre: string;
  blurb: string;
  excerpt: string;
  custom_questions: string;
  readers: number;
  completions_count: number;
  notes: string;
}

interface Question {
  id: string;
  question: string;
  required: boolean;
}

type Step = 'list' | 'read' | 'answer';

export default function BetaReaderPanel() {
  const { user } = useAuth();
  const [panels, setPanels] = useState<BetaPanel[]>([]);
  const [selected, setSelected] = useState<BetaPanel | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [step, setStep] = useState<Step>('list');
  const [answers, setAnswers] = useState<Record<string, string>>({});
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
      .from('author_beta_reader_submissions')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    const open = (data ?? []).filter(
      (p: BetaPanel) => (p.completions_count ?? 0) < p.readers
    );

    if (user) {
      const { data: done } = await supabase
        .from('beta_reader_responses')
        .select('submission_id')
        .eq('user_id', user.id);
      setCompletedIds(new Set((done ?? []).map((r: { submission_id: string }) => r.submission_id)));
    }

    setPanels(open);
    setLoading(false);
  }

  function openPanel(panel: BetaPanel) {
    let parsed: Question[] = [];
    try {
      parsed = JSON.parse(panel.custom_questions ?? '[]');
    } catch {
      parsed = [];
    }
    setQuestions(parsed);
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
      .every((q) => (answers[q.id] ?? '').trim().length > 0);
  }

  async function handleSubmit() {
    if (!selected || !user || !isValid()) return;
    setSubmitting(true);

    const { data: current } = await supabase
      .from('author_beta_reader_submissions')
      .select('completions_count, readers')
      .eq('id', selected.id)
      .single();

    if (!current || (current.completions_count ?? 0) >= current.readers) {
      alert('This panel is no longer accepting readers.');
      setSubmitting(false);
      return;
    }

    const responsePayload = questions.map((q) => ({
      question: q.question,
      answer: answers[q.id] ?? '',
    }));

    const { error } = await supabase.from('beta_reader_responses').insert({
      submission_id: selected.id,
      user_id: user.id,
      responses: responsePayload,
      reader_email: readerEmail || null,
      manuscript_interest: manuscriptInterest || null,
      earned: 1.50,
    });

    if (error) {
      alert('Something went wrong. Please try again.');
      setSubmitting(false);
      return;
    }

    await supabase.rpc('increment_site_credit', { user_id: user.id, amount: 1.50 });

    await supabase.from('payout_logs').insert({
      user_id: user.id,
      amount: 1.50,
      status: 'completed',
      reason: `Beta reader response - ${selected.book_title}`,
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
          Authors use your input to shape their work before publication. Earn $1.50 per panel.
        </p>

        {success && (
          <div className="bg-green-900/40 border border-green-500 text-green-300 rounded-lg p-4 mb-6">
            Feedback submitted! $1.50 has been added to your balance.
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
              const remaining = panel.readers - (panel.completions_count ?? 0);
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
                      <h2 className="text-lg font-semibold mt-2">{panel.book_title}</h2>
                      <p className="text-sm text-gray-400">by {panel.author_name}</p>
                      {panel.blurb && (
                        <p className="text-sm text-gray-500 mt-2 line-clamp-2">{panel.blurb}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-yellow-400 font-bold text-lg">$1.50</p>
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
          <h1 className="text-2xl font-bold">{selected.book_title}</h1>
          <p className="text-gray-400">by {selected.author_name}</p>
          {selected.genre && (
            <span className="text-xs font-semibold uppercase tracking-wide text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded mt-2 inline-block">
              {selected.genre}
            </span>
          )}
        </div>

        {selected.blurb && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">About this book</p>
            <p className="text-gray-300 text-sm leading-relaxed">{selected.blurb}</p>
          </div>
        )}

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-4">First Chapter / Excerpt</p>
          <div className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap font-serif">
            {selected.excerpt}
          </div>
        </div>

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
    return (
      <div className="min-h-screen bg-gray-950 text-white px-4 py-10 max-w-2xl mx-auto">
        <button
          onClick={() => setStep('read')}
          className="text-gray-400 hover:text-white text-sm mb-6 flex items-center gap-1"
        >
          ← Back to excerpt
        </button>

        <h1 className="text-2xl font-bold mb-1">{selected.book_title}</h1>
        <p className="text-gray-400 text-sm mb-6">by {selected.author_name}</p>

        <p className="text-xs text-gray-500 mb-6">
          Answer as thoroughly or briefly as you like. There are no right or wrong answers.
        </p>

        <div className="space-y-6 mb-8">
          {questions.map((q) => (
            <div key={q.id}>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                {q.question}
                {q.required && <span className="text-yellow-400 ml-1">*</span>}
              </label>
              <textarea
                value={answers[q.id] ?? ''}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                }
                rows={4}
                placeholder="Your thoughts..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 resize-none"
              />
            </div>
          ))}
        </div>

        {/* Manuscript interest */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-8">
          <p className="text-sm font-semibold text-white mb-1">
            Interested in reading the full manuscript?
          </p>
          <p className="text-xs text-gray-500 mb-4">
            The author may reach out through the Author Hub if you're open to it. Completely optional — you earn $1.50 either way.
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
          {submitting ? 'Submitting...' : 'Submit Feedback & Earn $1.50'}
        </button>
      </div>
    );
  }

  return null;
}
