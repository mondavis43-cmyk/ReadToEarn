import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Survey {
  id: string;
  source: 'author' | 'admin';
  author_name: string;
  title: string;
  description: string | null;
  notes: string | null;
  questions: Question[];
  max_responses: number;
  responses_count: number;
  payout_per_response: number;
}

interface Question {
  id?: string;
  question_text?: string;
  question?: string;
  required: boolean;
  order_index?: number;
}

function getQuestionText(q: Question): string {
  return q.question_text ?? q.question ?? '';
}

function getQuestionId(q: Question, idx: number): string {
  return q.id ?? String(idx);
}

function parseQuestions(raw: any): Question[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }
  return [];
}

function normalizeAuthorSurvey(s: any): Survey {
  return {
    id: s.id,
    source: 'author',
    author_name: s.author_name ?? '',
    title: s.book_title ?? s.title ?? '',
    description: s.survey_focus ?? null,
    notes: s.notes ?? null,
    questions: parseQuestions(s.custom_questions),
    max_responses: s.responses ?? s.max_responses ?? 0,
    responses_count: s.completions_count ?? s.responses_count ?? 0,
    payout_per_response: s.payout_per_response ?? 1.00,
  };
}

function normalizeAdminSurvey(s: any): Survey {
  return {
    id: s.id,
    source: 'admin',
    author_name: s.author_name ?? '',
    title: s.title ?? '',
    description: s.description ?? null,
    notes: s.additional_notes ?? null,
    questions: parseQuestions(s.questions),
    max_responses: s.max_responses ?? 0,
    responses_count: s.responses_count ?? 0,
    payout_per_response: s.payout_per_response ?? 1.00,
  };
}

export default function SurveyFeed() {
  const { user } = useAuth();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selected, setSelected] = useState<Survey | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadSurveys(); }, []);

  async function loadSurveys() {
    setLoading(true);

    const [{ data: authorData }, { data: adminData }] = await Promise.all([
      supabase
        .from('author_survey_submissions')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false }),
      supabase
        .from('surveys')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false }),
    ]);

    const authorSurveys = (authorData ?? [])
      .map(normalizeAuthorSurvey)
      .filter((s) => s.responses_count < s.max_responses);

    const adminSurveys = (adminData ?? [])
      .map(normalizeAdminSurvey)
      .filter((s) => s.responses_count < s.max_responses);

    const all = [...authorSurveys, ...adminSurveys];

    if (user) {
      const { data: done } = await supabase
        .from('survey_responses')
        .select('survey_id')
        .eq('user_id', user.id);
      setCompletedIds(new Set((done ?? []).map((r: any) => r.survey_id)));
    }

    setSurveys(all);
    setLoading(false);
  }

  function openSurvey(survey: Survey) {
    setAnswers({});
    setSelected(survey);
    setSuccess(false);
  }

  function isValid() {
    if (!selected) return false;
    return selected.questions
      .filter((q) => q.required)
      .every((q, idx) => (answers[getQuestionId(q, idx)] ?? '').trim().length > 0);
  }

  async function handleSubmit() {
    if (!selected || !user || !isValid()) return;
    setSubmitting(true);

    // Re-check capacity from correct table
    const table = selected.source === 'admin'
      ? 'surveys'
      : 'author_survey_submissions';
    const capacityCol = selected.source === 'admin' ? 'max_responses' : 'responses';
    const countCol = selected.source === 'admin' ? 'responses_count' : 'completions_count';

    const { data: current } = await supabase
      .from(table)
      .select(`${capacityCol}, ${countCol}, payout_per_response`)
      .eq('id', selected.id)
      .single();

    if (!current || (current[countCol] ?? 0) >= current[capacityCol]) {
      alert('This survey is no longer accepting responses.');
      setSubmitting(false);
      return;
    }

    const earned = current.payout_per_response ?? 1.00;

    const responsePayload = selected.questions.map((q, idx) => ({
      question: getQuestionText(q),
      answer: answers[getQuestionId(q, idx)] ?? '',
    }));

    const { error } = await supabase.from('survey_responses').insert({
      survey_id: selected.id,
      user_id: user.id,
      answers: responsePayload,
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
      reason: `Survey response - ${selected.title}`,
    });

    setSuccess(true);
    setSubmitting(false);
    setSelected(null);
    loadSurveys();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Loading surveys...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 py-10 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-yellow-400 mb-2">Author Surveys</h1>
      <p className="text-gray-400 mb-8">
        Share your honest feedback with authors about their books. No right or wrong answers.
        Earn per completed survey.
      </p>

      {success && (
        <div className="bg-green-900/40 border border-green-500 text-green-300 rounded-lg p-4 mb-6">
          Survey submitted! Your earnings have been added to your balance.
        </div>
      )}

      {surveys.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          No surveys available right now. Check back soon.
        </div>
      ) : (
        <div className="space-y-4">
          {surveys.map((survey) => {
            const done = completedIds.has(survey.id);
            const remaining = survey.max_responses - survey.responses_count;
            const payout = survey.payout_per_response ?? 1.00;
            return (
              <div key={survey.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">{survey.title}</h2>
                    {survey.author_name && (
                      <p className="text-sm text-gray-400">by {survey.author_name}</p>
                    )}
                    {survey.description && (
                      <p className="text-sm text-gray-500 mt-1">{survey.description}</p>
                    )}
                    {survey.notes && (
                      <p className="text-sm text-gray-500 italic mt-1">"{survey.notes}"</p>
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
                    onClick={() => openSurvey(survey)}
                    className="mt-4 bg-yellow-400 text-black font-semibold px-4 py-2 rounded-lg hover:bg-yellow-300 transition text-sm"
                  >
                    Take Survey
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Survey Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">{selected.title}</h2>
                {selected.author_name && (
                  <p className="text-sm text-gray-400">by {selected.author_name}</p>
                )}
                {selected.description && (
                  <p className="text-sm text-yellow-400/80 mt-1">{selected.description}</p>
                )}
              </div>
              <button
                onClick={() => { setSelected(null); setAnswers({}); }}
                className="text-gray-500 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            {selected.notes && (
              <p className="text-sm text-gray-400 italic mb-5 border-l-2 border-yellow-400/40 pl-3">
                {selected.notes}
              </p>
            )}

            <p className="text-xs text-gray-500 mb-5">
              Answer as thoroughly or briefly as you like. There are no right or wrong answers.
            </p>

            <div className="space-y-5 mb-6">
              {selected.questions.map((q, idx) => {
                const qid = getQuestionId(q, idx);
                return (
                  <div key={qid}>
                    <label className="block text-sm font-medium text-gray-200 mb-1">
                      {getQuestionText(q)}
                      {q.required && <span className="text-yellow-400 ml-1">*</span>}
                    </label>
                    <textarea
                      value={answers[qid] ?? ''}
                      onChange={(e) =>
                        setAnswers((prev) => ({ ...prev, [qid]: e.target.value }))
                      }
                      rows={4}
                      placeholder="Your thoughts..."
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 resize-none"
                    />
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleSubmit}
              disabled={!isValid() || submitting}
              className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl hover:bg-yellow-300 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting
                ? 'Submitting...'
                : `Submit & Earn $${(selected.payout_per_response ?? 1.00).toFixed(2)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
