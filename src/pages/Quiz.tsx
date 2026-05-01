import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../hooks/useNavigate';
import { useTheme } from '../contexts/ThemeContext';
import { ArrowLeft, PartyPopper, Timer, AlertCircle, Flag } from 'lucide-react';

interface Question {
id: string;
book_id: string;
question_text: string;
wrong_answer_1: string;
wrong_answer_2: string;
wrong_answer_3: string;
}

interface Book {
id: string;
title: string;
author: string;
bounty_amount: number;
page_count: number;
book_type: 'platform' | 'sponsored';
is_master_quiz: boolean;
}

interface QuizProps {
bookId: string;
competitionId?: string;
competitionRound?: number;
}

const QUIZ_DURATION = 8 * 60;
const MIN_QUIZ_TIME = 2 * 60 * 1000;

const ELIMINATION_PASS_THRESHOLD: Record<number, number> = {
1: 8,
2: 9,
};

const REPORT_REASONS = [
'Answer seems incorrect',
'Question is confusing or unclear',
'Typo or formatting issue',
'None of the answer choices seem right',
'Other',
];

const seededShuffle = <T,>(arr: T[], seed: string): T[] => {
const hash = seed.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
return [...arr].sort((a, b) => {
  const hashA = (JSON.stringify(a) + seed).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const hashB = (JSON.stringify(b) + seed).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return (hashA % 4) - (hashB % 4);
});
};

const formatTime = (seconds: number) => {
const m = Math.floor(seconds / 60);
const s = seconds % 60;
return `${m}:${s.toString().padStart(2, '0')}`;
};

export const Quiz = ({ bookId, competitionId, competitionRound }: QuizProps) => {
const { user } = useAuth();
const { navigateTo } = useNavigate();
const { isDark } = useTheme();

const isCompetitionQuiz = !!competitionId && !!competitionRound;
const isFinalRound = isCompetitionQuiz && competitionRound === 3;

const [book, setBook] = useState<Book | null>(null);
const [questions, setQuestions] = useState<Question[]>([]);
const [shuffledOptions, setShuffledOptions] = useState<Record<string, string[]>>({});
const [answers, setAnswers] = useState<Record<string, string>>({});
const [submitted, setSubmitted] = useState(false);
const [score, setScore] = useState(0);
const [passed, setPassed] = useState(false);
const [alreadyCompleted, setAlreadyCompleted] = useState(false);
const [loading, setLoading] = useState(true);
const [timeLeft, setTimeLeft] = useState(QUIZ_DURATION);
const [timedOut, setTimedOut] = useState(false);
const [streakBonus, setStreakBonus] = useState<number | null>(null);
const [earnedAmount, setEarnedAmount] = useState(0);
const [isSpeeding, setIsSpeeding] = useState(false);

const [reportOpen, setReportOpen] = useState<string | null>(null);
const [reportReason, setReportReason] = useState('');
const [reportSubmitted, setReportSubmitted] = useState<Set<string>>(new Set());
const [reportLoading, setReportLoading] = useState(false);

const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
const startTimeRef = useRef<number>(Date.now());
const reportRef = useRef<HTMLDivElement | null>(null);

useEffect(() => {
  loadQuiz();
  return () => { if (timerRef.current) clearInterval(timerRef.current); };
}, [bookId]);

useEffect(() => {
  if (!loading && !submitted) {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }
  return () => { if (timerRef.current) clearInterval(timerRef.current); };
}, [loading, submitted]);

useEffect(() => {
  const handler = (e: MouseEvent) => {
    if (reportRef.current && !reportRef.current.contains(e.target as Node)) {
      setReportOpen(null);
      setReportReason('');
    }
  };
  if (reportOpen) document.addEventListener('mousedown', handler);
  return () => document.removeEventListener('mousedown', handler);
}, [reportOpen]);

const loadQuiz = async () => {
  if (!user) return;

  // ── BOUNTY ACTIVE CHECK ──────────────────────────────────────────────
  if (!isCompetitionQuiz && book?.book_type === 'sponsored') {
    const { data: bounty } = await supabase
      .from('bounties')
      .select('status, reader_pool')
      .eq('book_id', bookId)
      .maybeSingle();

    if (!bounty || bounty.status !== 'active' || bounty.reader_pool <= 0) {
      navigateTo('/library');
      return;
    }
  }

  // ── PAYMENT GATE (competition quizzes only) ──────────────────────────
  if (isCompetitionQuiz) {
    const { data: entry, error: entryError } = await supabase
      .from('competition_entries')
      .select('id')
      .eq('competition_id', competitionId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (entryError || !entry) {
      navigateTo(`/competition/${competitionId}`);
      return;
    }

    // ── ROUND GATING ──────────────────────────────────────────────────
    if (competitionRound && competitionRound > 1) {
      const { data: prevRound } = await supabase
        .from('elimination_progress')
        .select('passed')
        .eq('competition_id', competitionId)
        .eq('user_id', user.id)
        .eq('round', competitionRound - 1)
        .maybeSingle();

      if (!prevRound?.passed) {
        navigateTo(`/competition/${competitionId}`);
        return;
      }
    }
  }

  const completedCheck = isCompetitionQuiz
    ? supabase
        .from('elimination_progress')
        .select('id')
        .eq('competition_id', competitionId)
        .eq('user_id', user.id)
        .eq('round', competitionRound)
        .maybeSingle()
    : supabase
        .from('completed_books')
        .select('id, passed')
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .maybeSingle();

  // ── FETCH FROM public_questions VIEW (no correct_answer exposed) ─────
  const [bookResult, questionsResult, completedResult] = await Promise.all([
    supabase.from('books').select('*').eq('id', bookId).single(),
    supabase.from('public_questions').select('*').eq('book_id', bookId),
    completedCheck,
  ]);

  if (bookResult.data) setBook(bookResult.data);

  if (questionsResult.data) {
    const allQuestions = questionsResult.data as Question[];
    const isMasterQuiz = bookResult.data?.is_master_quiz === true;

    const questionPool = isMasterQuiz
      ? allQuestions
      : (() => {
          const seed = (user?.id ?? '') + bookId;
          const seedNum = seed.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
          const shuffled = [...allQuestions].sort((a, b) => {
            const hashA = (a.id + seed).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
            const hashB = (b.id + seed).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
            return (hashA % (seedNum || 7)) - (hashB % (seedNum || 7));
          });
          return shuffled.slice(0, 10);
        })();

    setQuestions(questionPool);

    // Shuffle wrong answers only — correct_answer never sent to client
    const opts: Record<string, string[]> = {};
    questionPool.forEach((q) => {
      opts[q.id] = seededShuffle(
        [q.wrong_answer_1, q.wrong_answer_2, q.wrong_answer_3, '__CORRECT__'],
        q.id
      );
    });
    setShuffledOptions(opts);
  }

  if (completedResult.data) setAlreadyCompleted(true);
  setLoading(false);
};

const handleSubmit = async (fromTimer = false) => {
  const timeSpent = Date.now() - startTimeRef.current;
  if (!fromTimer && timeSpent < MIN_QUIZ_TIME) {
    setIsSpeeding(true);
    setTimeout(() => setIsSpeeding(false), 3000);
    return;
  }

  if (timerRef.current) clearInterval(timerRef.current);
  if (fromTimer) setTimedOut(true);

  if (!user || !book) return;

  // Build answer payload for Edge Function
  // answers state: { [question_id]: selected_option_text }
  const answerPayload = Object.entries(answers).map(([question_id, selected_answer]) => ({
    question_id,
    selected_answer,
  }));

  try {
    const { data: { session } } = await supabase.auth.getSession();

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-quiz`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          book_id: bookId,
          answers: answerPayload,
          competition_id: competitionId,
          competition_round: competitionRound,
          is_final_round: isFinalRound,
          time_spent_ms: timeSpent,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error('Quiz submission error:', result.error);
      return;
    }

    setScore(result.score ?? 0);
    setPassed(result.passed ?? false);
    setEarnedAmount(result.earned_amount ?? 0);
    if (result.streak_bonus) setStreakBonus(result.streak_bonus);
    setSubmitted(true);

  } catch (err) {
    console.error('Quiz submission failed:', err);
  }
};

const handleReport = async (questionId: string) => {
  if (!user || !reportReason) return;
  setReportLoading(true);
  await supabase.from('question_reports').insert({
    question_id: questionId,
    user_id: user.id,
    reason: reportReason,
  });
  setReportSubmitted(prev => new Set([...prev, questionId]));
  setReportOpen(null);
  setReportReason('');
  setReportLoading(false);
};

// Theme tokens
const bg = isDark ? 'bg-[#1B2A4A]' : 'bg-[#F5F0E8]';
const cardBg = isDark ? 'bg-[#162238]' : 'bg-white';
const cardBorder = isDark ? 'border-[#F5F0E8]/10' : 'border-[#1B2A4A]/10';
const headingColor = isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]';
const subColor = isDark ? 'text-[#F5F0E8]/50' : 'text-[#1B2A4A]/50';
const dividerColor = isDark ? 'border-[#F5F0E8]/10' : 'border-[#1B2A4A]/10';
const optionBg = isDark ? 'bg-[#1B2A4A]' : 'bg-[#F5F0E8]';
const optionBorder = isDark ? 'border-[#F5F0E8]/15 hover:border-[#D4A843]/50' : 'border-[#1B2A4A]/15 hover:border-[#D4A843]/50';
const optionText = isDark ? 'text-[#F5F0E8]/80' : 'text-[#1B2A4A]/80';
const popoverBg = isDark ? 'bg-[#0f1623] border-[#D4A843]/20' : 'bg-white border-[#1B2A4A]/15';

if (loading) return (
  <div className={`min-h-screen ${bg} flex items-center justify-center transition-colors duration-300`}>
    <div className="w-8 h-8 border-2 border-[#D4A843] border-t-transparent rounded-full animate-spin" />
  </div>
);

const renderResult = () => {
  if (isCompetitionQuiz) {
    if (isFinalRound) {
      return (
        <>
          <div className="flex items-center gap-3 mb-2">
            <PartyPopper className="w-6 h-6 text-[#D4A843]" />
            <h2 className={`text-3xl font-serif ${headingColor}`}>Final round submitted!</h2>
          </div>
          <p className={`${subColor} mb-6`}>
            You scored {score} out of {questions.length}. Winners are announced when the competition closes.
          </p>
          <button
            onClick={() => navigateTo(`/competition/${competitionId}`)}
            className="bg-[#D4A843] text-[#1B2A4A] font-medium px-6 py-2.5 rounded-lg hover:bg-[#c49a38] transition"
          >
            Back to Competition
          </button>
        </>
      );
    }

    if (passed) {
      return (
        <>
          <div className="flex items-center gap-3 mb-2">
            <PartyPopper className="w-6 h-6 text-[#D4A843]" />
            <h2 className={`text-3xl font-serif ${headingColor}`}>
              Round {competitionRound} passed!
            </h2>
          </div>
          <p className={`${subColor} mb-6`}>
            {score} out of {questions.length} correct. You advance to Round {competitionRound! + 1}.
          </p>
          <button
            onClick={() => navigateTo(`/competition/${competitionId}`)}
            className="bg-[#D4A843] text-[#1B2A4A] font-medium px-6 py-2.5 rounded-lg hover:bg-[#c49a38] transition"
          >
            Back to Competition
          </button>
        </>
      );
    }

    return (
      <>
        <h2 className={`text-3xl font-serif ${headingColor} mb-2`}>
          {timedOut ? 'Time is up' : 'Eliminated'}
        </h2>
        <p className={`${subColor} mb-6`}>
          {score} out of {questions.length} correct.{' '}
          {ELIMINATION_PASS_THRESHOLD[competitionRound!]
            ? `${ELIMINATION_PASS_THRESHOLD[competitionRound!]} required to advance.`
            : ''}
        </p>
        <button
          onClick={() => navigateTo(`/competition/${competitionId}`)}
          className="bg-[#D4A843] text-[#1B2A4A] font-medium px-6 py-2.5 rounded-lg hover:bg-[#c49a38] transition"
        >
          Back to Competition
        </button>
      </>
    );
  }

  return passed ? (
    <>
      <div className="flex items-center gap-3 mb-2">
        <PartyPopper className="w-6 h-6 text-[#D4A843]" />
        <h2 className={`text-3xl font-serif ${headingColor}`}>You passed!</h2>
      </div>
      <p className={`${subColor} mb-6`}>{score} out of {questions.length} correct</p>
      {!alreadyCompleted && (
        <div className="bg-[#D4A843]/10 border border-[#D4A843]/30 rounded-lg p-4 mb-3">
          <p className="text-[#D4A843] font-medium text-sm">+${earnedAmount.toFixed(2)} added to balance</p>
        </div>
      )}
      {streakBonus && (
        <div className="bg-[#D4A843]/10 border border-[#D4A843]/30 rounded-lg p-4 mb-3">
          <p className="text-[#D4A843] font-medium text-sm">{streakBonus}-day streak bonus! +$0.10</p>
        </div>
      )}
      <div className="flex gap-3 mt-6">
        <button
          onClick={() => navigateTo('/library')}
          className="bg-[#D4A843] text-[#1B2A4A] font-medium px-6 py-2.5 rounded-lg hover:bg-[#c49a38] transition"
        >
          Back to Library
        </button>
      </div>
    </>
  ) : (
    <>
      <h2 className={`text-3xl font-serif ${headingColor} mb-2`}>
        {timedOut ? 'Time is up' : 'Not quite'}
      </h2>
      <p className={`${subColor} mb-6`}>{score} out of {questions.length} correct. (8 required)</p>
      <div className="flex gap-3 mt-6">
        <button
          onClick={() => navigateTo('/library')}
          className="bg-[#D4A843] text-[#1B2A4A] font-medium px-6 py-2.5 rounded-lg hover:bg-[#c49a38] transition"
        >
          Back to Library
        </button>
        <button
          onClick={() => {
            setSubmitted(false);
            setAnswers({});
            setScore(0);
            setPassed(false);
            setTimedOut(false);
            setTimeLeft(QUIZ_DURATION);
            startTimeRef.current = Date.now();
          }}
          className={`${isDark ? 'bg-[#F5F0E8]/10 text-[#F5F0E8]' : 'bg-[#1B2A4A]/10 text-[#1B2A4A]'} font-medium px-6 py-2.5 rounded-lg transition`}
        >
          Try Again
        </button>
      </div>
    </>
  );
};

return (
  <div className={`min-h-screen ${bg} transition-colors duration-300`}>
    {/* Header */}
    <div className={`border-b ${dividerColor} px-4 py-4 sticky top-0 z-10 ${isDark ? 'bg-[#1B2A4A]' : 'bg-[#F5F0E8]'}`}>
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => isCompetitionQuiz ? navigateTo(`/competition/${competitionId}`) : navigateTo('/library')}
            className={`${subColor} hover:text-[#D4A843] transition flex-shrink-0`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className={`font-serif text-lg ${headingColor} truncate`}>{book?.title}</h1>
            <p className={`text-xs ${subColor} truncate`}>
              {isCompetitionQuiz ? `Round ${competitionRound} — ${book?.author}` : book?.author}
            </p>
          </div>
        </div>
        {!submitted && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-mono flex-shrink-0 transition-colors ${
            timeLeft <= 30
              ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : 'bg-[#162238] border-[#F5F0E8]/10 text-[#F5F0E8]/60'
          }`}>
            <Timer className="w-3.5 h-3.5" />
            {formatTime(timeLeft)}
          </div>
        )}
      </div>
    </div>

    <div className="max-w-2xl mx-auto px-4 py-8">
      {alreadyCompleted && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6 text-yellow-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {isCompetitionQuiz
            ? `You have already submitted Round ${competitionRound}.`
            : 'You have already used your attempt for this book.'}
        </div>
      )}

      {submitted ? (
        <div className={`${cardBg} rounded-lg p-8 border ${cardBorder}`}>
          {renderResult()}
        </div>
      ) : (
        <div className="space-y-6">
          {questions.map((q, idx) => (
            <div key={q.id} className={`${cardBg} rounded-lg p-6 border ${cardBorder}`}>
              <div className="flex items-start justify-between gap-3 mb-4">
                <p className={`font-medium ${headingColor}`}>
                  <span className="text-[#D4A843] mr-2">{idx + 1}.</span>{q.question_text}
                </p>
                <div className="relative shrink-0" ref={reportOpen === q.id ? reportRef : null}>
                  {reportSubmitted.has(q.id) ? (
                    <span className={`text-xs ${subColor}`}>Reported</span>
                  ) : (
                    <button
                      onClick={() => {
                        setReportOpen(reportOpen === q.id ? null : q.id);
                        setReportReason('');
                      }}
                      title="Report an issue with this question"
                      className={`p-1.5 rounded-md transition-colors ${
                        reportOpen === q.id
                          ? 'text-[#D4A843] bg-[#D4A843]/10'
                          : `${subColor} hover:text-[#D4A843] hover:bg-[#D4A843]/10`
                      }`}
                    >
                      <Flag className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {reportOpen === q.id && (
                    <div className={`absolute right-0 top-8 z-20 w-56 rounded-xl border shadow-xl p-3 ${popoverBg}`}>
                      <p className={`text-xs font-semibold mb-2 ${headingColor}`}>Report an issue</p>
                      <div className="space-y-1 mb-3">
                        {REPORT_REASONS.map((reason) => (
                          <button
                            key={reason}
                            onClick={() => setReportReason(reason)}
                            className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                              reportReason === reason
                                ? 'bg-[#D4A843]/15 text-[#D4A843]'
                                : `${subColor} hover:bg-[#D4A843]/10 hover:text-[#D4A843]`
                            }`}
                          >
                            {reason}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => handleReport(q.id)}
                        disabled={!reportReason || reportLoading}
                        className="w-full text-xs font-medium bg-[#D4A843] text-[#1B2A4A] py-1.5 rounded-lg hover:bg-[#c49a38] transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {reportLoading ? 'Submitting...' : 'Submit Report'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {(shuffledOptions[q.id] ?? []).map((opt, i) => (
                  <label key={i} className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    answers[q.id] === opt
                      ? 'border-[#D4A843] bg-[#D4A843]/10'
                      : `${optionBg} ${optionBorder}`
                  }`}>
                    <input
                      type="radio"
                      name={q.id}
                      value={opt}
                      checked={answers[q.id] === opt}
                      onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                      className="mt-0.5 accent-[#D4A843] flex-shrink-0"
                    />
                    <span className={`text-sm ${answers[q.id] === opt ? (isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]') : optionText}`}>
                      <span className="font-medium mr-2">{['A', 'B', 'C', 'D'][i]}.</span>{opt}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div className="flex flex-col items-end gap-2 pt-2 pb-8">
            {isSpeeding && (
              <p className="text-red-400 text-xs animate-pulse">
                Wait! We verify reading time. Please review your answers for a moment.
              </p>
            )}
            <div className="flex items-center justify-between w-full">
              <p className={`text-sm ${subColor}`}>
                {Object.keys(answers).length} of {questions.length} answered
              </p>
              <button
                onClick={() => handleSubmit(false)}
                disabled={Object.keys(answers).length < questions.length || isSpeeding}
                className="bg-[#D4A843] text-[#1B2A4A] font-medium px-8 py-3 rounded-lg hover:bg-[#c49a38] transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Submit Quiz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
};
