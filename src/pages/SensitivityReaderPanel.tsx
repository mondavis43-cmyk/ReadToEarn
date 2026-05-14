import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface SensitivityPanel {
id: string;
author_name: string;
book_title: string;
context: string;
chapter_text: string;
identity_areas: string[];
custom_questions: string;
readers: number;
completions_count: number;
notes: string;
payout_per_response: number | null;
}

interface Question {
id: string;
question: string;
required: boolean;
}

type Step = 'list' | 'read' | 'answer';

const ALL_IDENTITIES = [
'Black / African American',
'Latino / Hispanic',
'Asian / Asian American',
'Indigenous / Native American',
'Middle Eastern / North African',
'South Asian',
'East Asian',
'Southeast Asian',
'Mixed Race / Multiracial',
'Jewish',
'Muslim',
'Hindu',
'LGBTQ+',
'Gay / Lesbian',
'Bisexual',
'Transgender',
'Nonbinary / Gender Nonconforming',
'Disabled (Physical)',
'Disabled (Cognitive / Neurological)',
'Deaf / Hard of Hearing',
'Blind / Low Vision',
'Chronic Illness',
'Mental Health (lived experience)',
'Immigrant / First Generation',
'Working Class',
'Fat / Plus Size',
'Older Adult (60+)',
'Other (specify below)',
];

const DEFAULT_PAYOUT = 10.00;

export default function SensitivityReaderPanel() {
const { user } = useAuth();
const [panels, setPanels] = useState<SensitivityPanel[]>([]);
const [selected, setSelected] = useState<SensitivityPanel | null>(null);
const [questions, setQuestions] = useState<Question[]>([]);
const [step, setStep] = useState<Step>('list');
const [answers, setAnswers] = useState<Record<string, string>>({});
const [selectedIdentities, setSelectedIdentities] = useState<string[]>([]);
const [otherIdentity, setOtherIdentity] = useState('');
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
    .from('author_sensitivity_submissions')
    .select('*')
    .in('status', ['active', 'approved'])
    .order('created_at', { ascending: false });

  const open = (data ?? []).filter(
    (p: SensitivityPanel) => (p.completions_count ?? 0) < p.readers
  );

  if (user) {
    const { data: done } = await supabase
      .from('sensitivity_reader_responses')
      .select('submission_id')
      .eq('user_id', user.id);
    setCompletedIds(new Set((done ?? []).map((r: { submission_id: string }) => r.submission_id)));
  }

  setPanels(open);
  setLoading(false);
}

function getPayout(panel: SensitivityPanel): number {
  return panel.payout_per_response ?? DEFAULT_PAYOUT;
}

function openPanel(panel: SensitivityPanel) {
  let parsed: Question[] = [];
  try {
    parsed = JSON.parse(panel.custom_questions ?? '[]');
  } catch {
    parsed = [];
  }
  setQuestions(parsed);
  setAnswers({});
  setSelectedIdentities([]);
  setOtherIdentity('');
  setReaderEmail('');
  setManuscriptInterest('');
  setSelected(panel);
  setStep('read');
  setSuccess(false);
}

function toggleIdentity(identity: string) {
  setSelectedIdentities((prev) =>
    prev.includes(identity)
      ? prev.filter((i) => i !== identity)
      : [...prev, identity]
  );
}

function isValid() {
  const requiredAnswered = questions
    .filter((q) => q.required)
    .every((q) => (answers[q.id] ?? '').trim().length > 0);
  return requiredAnswered && selectedIdentities.length > 0;
}

async function handleSubmit() {
  if (!selected || !user || !isValid()) return;
  setSubmitting(true);

  const { data: current } = await supabase
    .from('author_sensitivity_submissions')
    .select('completions_count, readers, payout_per_response')
    .eq('id', selected.id)
    .single();

  if (!current || (current.completions_count ?? 0) >= current.readers) {
    alert('This panel is no longer accepting readers.');
    setSubmitting(false);
    return;
  }

  const earned = current.payout_per_response ?? DEFAULT_PAYOUT;

  const finalIdentities = selectedIdentities.includes('Other (specify below)') && otherIdentity
    ? [...selectedIdentities.filter((i) => i !== 'Other (specify below)'), `Other: ${otherIdentity}`]
    : selectedIdentities;

  const responsePayload = questions.map((q) => ({
    question: q.question,
    answer: answers[q.id] ?? '',
  }));

  const { error } = await supabase.from('sensitivity_reader_responses').insert({
    submission_id: selected.id,
    user_id: user.id,
    selected_identities: finalIdentities,
    responses: responsePayload,
    reader_email: readerEmail || null,
    manuscript_interest: manuscriptInterest || null,
    earned,
  });

  if (error) {
    alert('Something went wrong. Please try again.');
    setSubmitting(false);
    return;
  }

  await supabase.rpc('increment_site_credit', { user_id: user.id, amount: earned });

  await supabase.from('payout_logs').insert({
    user_id: user.id,
    amount: earned,
    status: 'completed',
    reason: `Sensitivity reader response - ${selected.book_title}`,
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
      <h1 className="text-3xl font-bold text-yellow-400 mb-2">Sensitivity Reader Panels</h1>
      <p className="text-gray-400 mb-8">
        Read a sample chapter and provide feedback from your lived experience.
        Authors are looking for readers from specific identity backgrounds to help
        them write authentically.
      </p>

      {success && (
        <div className="bg-green-900/40 border border-green-500 text-green-300 rounded-lg p-4 mb-6">
          Feedback submitted! Your earnings have been added to your balance.
        </div>
      )}

      {panels.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          No sensitivity reader panels available right now. Check back soon.
        </div>
      ) : (
        <div className="space-y-4">
          {panels.map((panel) => {
            const done = completedIds.has(panel.id);
            const remaining = panel.readers - (panel.completions_count ?? 0);
            const payout = getPayout(panel);
            const identities = Array.isArray(panel.identity_areas)
              ? panel.identity_areas
              : [];
            return (
              <div
                key={panel.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold">{panel.book_title}</h2>
                    <p className="text-sm text-gray-400">by {panel.author_name}</p>
                    {panel.context && (
                      <p className="text-sm text-gray-500 mt-1 italic">"{panel.context}"</p>
                    )}
                    {identities.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {identities.slice(0, 5).map((id) => (
                          <span
                            key={id}
                            className="text-xs bg-gray-800 border border-gray-700 text-gray-300 px-2 py-0.5 rounded-full"
                          >
                            {id}
                          </span>
                        ))}
                        {identities.length > 5 && (
                          <span className="text-xs text-gray-500 px-2 py-0.5">
                            +{identities.length - 5} more
                          </span>
                        )}
                      </div>
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
  const identities = Array.isArray(selected.identity_areas) ? selected.identity_areas : [];
  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 py-10 max-w-2xl mx-auto">
      <button
        onClick={() => setStep('list')}
        className="text-gray-400 hover:text-white text-sm mb-6 flex items-center gap-1"
      >
        ← Back to panels
      </button>

      <h1 className="text-2xl font-bold mb-1">{selected.book_title}</h1>
      <p className="text-gray-400 text-sm mb-4">by {selected.author_name}</p>

      {identities.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
            Seeking feedback from
          </p>
          <div className="flex flex-wrap gap-1">
            {identities.map((id) => (
              <span
                key={id}
                className="text-xs bg-yellow-400/10 border border-yellow-400/30 text-yellow-300 px-2 py-0.5 rounded-full"
              >
                {id}
              </span>
            ))}
          </div>
        </div>
      )}

      {selected.context && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Author's context</p>
          <p className="text-gray-300 text-sm leading-relaxed">{selected.context}</p>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-4">Sample Chapter</p>
        <div className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap font-serif">
          {selected.chapter_text}
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
  const payout = getPayout(selected);
  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 py-10 max-w-2xl mx-auto">
      <button
        onClick={() => setStep('read')}
        className="text-gray-400 hover:text-white text-sm mb-6 flex items-center gap-1"
      >
        ← Back to chapter
      </button>

      <h1 className="text-2xl font-bold mb-1">{selected.book_title}</h1>
      <p className="text-gray-400 text-sm mb-6">by {selected.author_name}</p>

      {/* Identity selection */}
      <div className="mb-8">
        <p className="text-sm font-semibold text-white mb-1">
          Which identities do you represent? <span className="text-yellow-400">*</span>
        </p>
        <p className="text-xs text-gray-500 mb-3">
          Select all that apply. This helps the author understand whose perspective they're receiving.
        </p>
        <div className="flex flex-wrap gap-2">
          {ALL_IDENTITIES.map((identity) => (
            <button
              key={identity}
              onClick={() => toggleIdentity(identity)}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${
                selectedIdentities.includes(identity)
                  ? 'bg-yellow-400 text-black border-yellow-400 font-semibold'
                  : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-gray-500'
              }`}
            >
              {identity}
            </button>
          ))}
        </div>
        {selectedIdentities.includes('Other (specify below)') && (
          <input
            type="text"
            value={otherIdentity}
            onChange={(e) => setOtherIdentity(e.target.value)}
            placeholder="Please specify..."
            className="mt-3 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
          />
        )}
      </div>

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
          The author may reach out through the Author Hub if you're open to it. Completely optional — you earn ${payout.toFixed(2)} either way.
        </p>
        <div className="space-y-2 mb-4">
          {(
            [
              { value: 'unpaid', label: 'Yes — interested as an unpaid sensitivity reader' },
              { value: 'paid',   label: 'Yes — interested as a paid sensitivity reader' },
              { value: 'none',   label: 'Not interested' },
            ] as const
          ).map(opt => (
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