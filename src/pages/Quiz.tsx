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
  correct_answer: string;
  wrong_answer_1: string;
  wrong_answer_2: string;
  wrong_answer_3: string;
}

interface Book {
  id: string;
  title: string;
  author: string;
  page_count: number;
  book_type: 'standard' | 'bulletin_board';
}

const QUIZ_DURATION = 8 * 60;
const MIN_QUIZ_TIME = 2 * 60 * 1000;
const PASS_THRESHOLD = 8;

const REPORT_REASONS = [
  'Answer seems incorrect',
  'Question is confusing or unclear',
  'Typo or formatting issue',
  'None of the answer choices seem right',
  'Other',
];

const seededShuffle = <T,>(arr: T[], seed: string): T[] => {
  const result = [...arr];
  let s = 5381;
  for (let i = 0; i < seed.length; i++) {
    s = (((s << 5) + s) ^ seed.charCodeAt(i)) >>> 0;
  }
  if (s === 0) s = 1;
  const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0x100000000; };
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const Quiz = () => {
  const { user } = useAuth();
  const { navigateTo } = useNavigate();
  const { isDark } = useTheme();

  const bookId = window.location.pathname.split('/').pop();

  const [book, setBook] = useState<Book | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [shuffledOptions, setShuffledOptions] = useState<Record<string, string[]>>({});
  const sessionSaltRef = useRef(Math.random().toString(36).slice(2));
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
  const submittedRef = useRef(false);
  const isSubmittingRef = useRef(false);

  // ── loadQuiz ──────────────────────────────────────────────────────────────
  const loadQuiz = async () => {
    if (!user || !bookId) return;

    const { data: bookData, error: bookError } = await supabase
      .from('books')
      .select('*')
      .eq('id', bookId)
      .single();

    if (bookError || !bookData) {
      navigateTo('/library');
      return;
    }

    setBook(bookData);

    // Check if user already completed this quiz
    const { data: existingAttempt } = await supabase
      .from('quiz_attempts')
      .select('id')
      .eq('user_id', user.id)
      .eq('book_id', bookId)
      .maybeSingle();

    if (existingAttempt) setAlreadyCompleted(true);

    // Load questions
    const { data: questionsData } = await supabase
      .from('public_questions')
      .select('*')
      .eq('book_id', bookId);

    if (questionsData) {
      const allQuestions = questionsData as Question[];
      const isMasterQuiz = (bookData as any).is_master_quiz === true;

      const questionPool = isMasterQuiz
        ? allQuestions
        : seededShuffle(allQuestions, (user?.id ?? '') + bookId).slice(0, 10);

      setQuestions(questionPool);

      const opts: Record<string, string[]> = {};
      const userSeed = (user?.id ?? '') + sessionSaltRef.current;
      questionPool.forEach((q, idx) => {
        opts[q.id] = seededShuffle(
          [q.correct_answer, q.wrong_answer_1, q.wrong_answer_2, q.wrong_answer_3],
          userSeed + q.id + String(idx)
        );
      });
      setShuffledOptions(opts);
    }

    setLoading(false);
  };

  // ── handleSubmit ──────────────────────────────────────────────────────────
  submittedRef.current = submitted;
  const handleSubmit = async (fromTimer = false) => {
    if (isSubmittingRef.current || submittedRef.current) return;
    isSubmittingRef.current = true;

    const timeSpent = Date.now() - startTimeRef.current;
    if (!fromTimer && timeSpent < MIN_QUIZ_TIME) {
      isSubmittingRef.current = false;
      setIsSpeeding(true);
      setTimeout(() => setIsSpeeding(false), 3000);
      return;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (fromTimer) setTimedOut(true);

    if (!user || !book) {
      isSubmittingRef.current = false;
      return;
    }

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
            time_spent_ms: timeSpent,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        console.error('Quiz submission error:', result.error);
        setSubmitted(true);
        return;
      }

      setScore(result.score ?? 0);
      setPassed(result.passed ?? false);
      setEarnedAmount(result.earned_amount ?? 0);
      if (result.streak_bonus) setStreakBonus(result.streak_bonus);
      setSubmitted(true);

    } catch (err) {
      console.error('Quiz submission failed:', err);
      setSubmitted(true);
    }
  };

  // ── handleReport ──────────────────────────────────────────────────────────
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

  // ── useEffects ────────────────────────────────────────────────────────────
  useEffect(() => {
    loadQuiz();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
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

  // ── Theme ─────────────────────────────────────────────────────────────────
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

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className={`min-h-screen ${bg} flex items-center justify-center transition-colors duration-300`}>
      <div className="w-8 h-8 border-2 border-[#D4A843] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // ── Result screen ─────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center px-4`}>
        <div className={`${cardBg} border ${cardBorder} rounded-2xl p-8 max-w-md w-full text-center space-y-4`}>
          {passed ? (
            <>
              <PartyPopper size={40} className="text-[#D4A843] mx-auto" />
              <h2 className={`text-2xl font-bold ${headingColor}`}>Quiz Passed!</h2>
              <p className={subColor}>Score: {score}/{questions.length}</p>
              {earnedAmount > 0 && (
                <p className={`text-lg font-bold text-[#D4A843]`}>+${earnedAmount.toFixed(2)} earned</p>
              )}
              {streakBonus && (
                <p className={`text-sm ${subColor}`}>+${streakBonus.toFixed(2)} streak bonus</p>
              )}
            </>
          ) : (
            <>
              <AlertCircle size={40} className="text-red-400 mx-auto" />
              <h2 className={`text-2xl font-bold ${headingColor}`}>Quiz Failed</h2>
              <p className={subColor}>Score: {score}/{questions.length} — need {PASS_THRESHOLD} to pass</p>
            </>
          )}
          <button
            onClick={() => navigateTo('/library')}
            className="mt-4 px-6 py-2 rounded-xl bg-[#D4A843] text-white font-semibold hover:bg-[#c49a3a] transition-colors"
          >
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  // ── Quiz UI ───────────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen ${bg} pb-16 transition-colors duration-300`}>

      {/* Header */}
      <div className={`${cardBg} border-b ${dividerColor} px-4 py-3 flex items-center justify-between sticky top-0 z-10`}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigateTo('/library')} className={`${subColor} hover:opacity-70`}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <p className={`text-sm font-semibold ${headingColor} leading-tight`}>{book?.title}</p>
            <p className={`text-xs ${subColor}`}>{book?.author}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 text-sm font-mono font-semibold ${timeLeft < 60 ? 'text-red-400' : headingColor}`}>
            <Timer size={15} />
            {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Already completed notice */}
        {alreadyCompleted && (
          <div className={`${cardBg} border ${cardBorder} rounded-xl p-4 flex items-start gap-3`}>
            <AlertCircle size={18} className="text-amber-400 mt-0.5 shrink-0" />
            <p className={`text-sm ${subColor}`}>You've already taken the quiz for this book. You cannot earn from it again at this time.</p>
          </div>
        )}

        {/* Timed out notice */}
        {timedOut && (
          <div className={`${cardBg} border border-red-400/20 rounded-xl p-4 flex items-start gap-3`}>
            <Timer size={18} className="text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-400">Time's up! Your answers were submitted automatically.</p>
          </div>
        )}

        {/* Speed warning */}
        {isSpeeding && (
          <div className={`${cardBg} border border-amber-400/20 rounded-xl p-4 flex items-start gap-3`}>
            <AlertCircle size={18} className="text-amber-400 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-400">You're going too fast! Please take your time reading the questions carefully.</p>
          </div>
        )}

        {/* Questions */}
        {questions.map((q, idx) => (
          <div key={q.id} className={`${cardBg} border ${cardBorder} rounded-2xl p-5 space-y-4`}>
            <div className="flex items-start justify-between gap-3">
              <p className={`text-sm font-medium ${headingColor} leading-relaxed flex-1`}>
                <span className={`${subColor} mr-2`}>{idx + 1}.</span>
                {q.question_text}
              </p>
              <div className="relative shrink-0" ref={reportOpen === q.id ? reportRef : null}>
                <button
                  onClick={() => setReportOpen(reportOpen === q.id ? null : q.id)}
                  className={`${subColor} hover:text-red-400 transition-colors`}
                  title="Report question"
                >
                  <Flag size={14} />
                </button>
                {reportOpen === q.id && (
                  <div className={`absolute right-0 top-6 z-20 w-64 rounded-xl border ${popoverBg} p-3 shadow-xl space-y-2`}>
                    <p className={`text-xs font-semibold ${headingColor}`}>Report this question</p>
                    {reportSubmitted.has(q.id) ? (
                      <p className="text-xs text-green-400">Thanks for the report!</p>
                    ) : (
                      <>
                        {REPORT_REASONS.map((r) => (
                          <label key={r} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`report-${q.id}`}
                              value={r}
                              checked={reportReason === r}
                              onChange={() => setReportReason(r)}
                              className="accent-[#D4A843]"
                            />
                            <span className={`text-xs ${subColor}`}>{r}</span>
                          </label>
                        ))}
                        <button
                          onClick={() => handleReport(q.id)}
                          disabled={!reportReason || reportLoading}
                          className="w-full mt-1 py-1.5 rounded-lg bg-[#D4A843] text-white text-xs font-semibold disabled:opacity-40 hover:bg-[#c49a3a] transition-colors"
                        >
                          {reportLoading ? 'Submitting...' : 'Submit Report'}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {(shuffledOptions[q.id] ?? []).map((option) => {
                const selected = answers[q.id] === option;
                return (
                  <label
                    key={option}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      selected
                        ? 'border-[#D4A843] bg-[#D4A843]/10'
                        : `${optionBg} ${optionBorder}`
                    }`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={option}
                      checked={selected}
                      onChange={() => setAnswers(prev => ({ ...prev, [q.id]: option }))}
                      className="accent-[#D4A843] shrink-0"
                    />
                    <span className={`text-sm ${selected ? headingColor : optionText}`}>{option}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        {/* Submit */}
        <button
          onClick={() => handleSubmit(false)}
          disabled={Object.keys(answers).length < questions.length || alreadyCompleted}
          className="w-full py-4 rounded-2xl bg-[#D4A843] text-white font-bold text-base hover:bg-[#c49a3a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {Object.keys(answers).length < questions.length
            ? `Answer all questions (${Object.keys(answers).length}/${questions.length})`
            : 'Submit Quiz'}
        </button>

      </div>
    </div>
  );
};
