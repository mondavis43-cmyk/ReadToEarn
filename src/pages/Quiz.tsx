import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../hooks/useNavigate';
import { useTheme } from '../contexts/ThemeContext';
import { ArrowLeft, PartyPopper, Timer, AlertCircle, Flag, BookOpen, Zap } from 'lucide-react';

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
const STANDARD_PASS_THRESHOLD = 8;

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
  const result = [...arr];
  let s = seed.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const rand = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0x100000000; };
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

const formatMs = (ms: number) => {
const totalSec = Math.floor(ms / 1000);
const m = Math.floor(totalSec / 60);
const s = totalSec % 60;
return `${m}:${s.toString().padStart(2, '0')}`;
};

export function Quiz({ bookId, competitionId, competitionRound }: QuizProps) {
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
const [boostBalance, setBoostBalance] = useState(0);
const [boostUsedCount, setBoostUsedCount] = useState(0);
const [timeLeft, setTimeLeft] = useState(QUIZ_DURATION);
const [timedOut, setTimedOut] = useState(false);
const [streakBonus, setStreakBonus] = useState<number | null>(null);
const [earnedAmount, setEarnedAmount] = useState(0);
const [isSpeeding, setIsSpeeding] = useState(false);
const [pagesLogged, setPagesLogged] = useState(0);

// Readathon state
const [activeReadathon, setActiveReadathon] = useState<{ id: string; title: string } | null>(null);
const [isReadathonEntrant, setIsReadathonEntrant] = useState(false);
const [readathonGate, setReadathonGate] = useState(false);

// Sprint state
const [activeSprint, setActiveSprint] = useState<{ id: string; title: string } | null>(null);
const [isSprintEntrant, setIsSprintEntrant] = useState(false);
const [sprintGate, setSprintGate] = useState(false);
const [timeSpentMs, setTimeSpentMs] = useState(0);

const [reportOpen, setReportOpen] = useState<string | null>(null);
const [reportReason, setReportReason] = useState('');
const [reportSubmitted, setReportSubmitted] = useState<Set<string>>(new Set());
const [reportLoading, setReportLoading] = useState(false);

const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
const startTimeRef = useRef<number>(Date.now());
const boostsUsedRef = useRef(0);
const reportRef = useRef<HTMLDivElement | null>(null);
const submittedRef = useRef(false);
const isSubmittingRef = useRef(false); // prevents duplicate concurrent submissions

// ── isQuizUnlocked ──────────────────────────────────────────────────────────
const isQuizUnlocked = async (
  bookId: string,
  _bookType: 'platform' | 'sponsored'
): Promise<{
  unlocked: boolean;
  readathonActive: boolean;
  readathonEntrant: boolean;
  readathon: { id: string; title: string } | null;
  sprintActive: boolean;
  sprintEntrant: boolean;
  sprint: { id: string; title: string } | null;
}> => {
  const noSprint = { sprintActive: false, sprintEntrant: false, sprint: null };
  const noReadathon = { readathonActive: false, readathonEntrant: false, readathon: null };

  // Check active bounty
  const { data: bounty } = await supabase
    .from('bounties')
    .select('id')
    .eq('book_id', bookId)
    .eq('status', 'active')
    .gt('reader_pool', 0)
    .maybeSingle();
  if (bounty) return { unlocked: true, ...noReadathon, ...noSprint };

  // Check active competition containing this book (non-readathon)
  const { data: competitions } = await supabase
    .from('competitions')
    .select('book_ids')
    .eq('status', 'active');
  if (competitions) {
    for (const comp of competitions) {
      const ids: string[] = comp.book_ids ?? [];
      if (ids.includes(bookId)) return { unlocked: true, ...noReadathon, ...noSprint };
    }
  }

  // Check active sprint for this book
  const { data: sprint } = await supabase
    .from('sprints')
    .select('id, title')
    .eq('status', 'active')
    .eq('book_id', bookId)
    .maybeSingle();

  if (sprint) {
    const { data: sprintEntry } = await supabase
      .from('sprint_entries')
      .select('id')
      .eq('sprint_id', sprint.id)
      .eq('user_id', user!.id)
      .maybeSingle();

    const entrant = !!sprintEntry;
    return {
      unlocked: entrant,
      ...noReadathon,
      sprintActive: true,
      sprintEntrant: entrant,
      sprint: { id: sprint.id, title: sprint.title },
    };
  }

  // Check active readathon
  const { data: readathon } = await supabase
    .from('readathons')
    .select('id, title')
    .eq('status', 'active')
    .maybeSingle();

  if (readathon) {
    const { data: entry } = await supabase
      .from('readathon_entries')
      .select('id')
      .eq('readathon_id', readathon.id)
      .eq('user_id', user!.id)
      .maybeSingle();

    const entrant = !!entry;
    return {
      unlocked: entrant,
      readathonActive: true,
      readathonEntrant: entrant,
      readathon: { id: readathon.id, title: readathon.title },
      ...noSprint,
    };
  }

  return { unlocked: false, ...noReadathon, ...noSprint };
};

// ── loadQuiz ────────────────────────────────────────────────────────────────
const loadQuiz = async () => {
  if (!user) return;

  const { data: boostData } = await supabase
    .from('user_boosts')
    .select('balance')
    .eq('user_id', user.id)
    .maybeSingle();
  setBoostBalance(boostData?.balance ?? 0);

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

  if (!isCompetitionQuiz) {
    const result = await isQuizUnlocked(bookId, bookData.book_type);

    // Sprint gate
    if (result.sprintActive) {
      setActiveSprint(result.sprint);
      setIsSprintEntrant(result.sprintEntrant);
      if (!result.sprintEntrant) {
        setSprintGate(true);
        setLoading(false);
        return;
      }
    }

    // Readathon gate
    if (result.readathonActive) {
      setActiveReadathon(result.readathon);
      setIsReadathonEntrant(result.readathonEntrant);
      if (!result.readathonEntrant) {
        setReadathonGate(true);
        setLoading(false);
        return;
      }
    }

    if (!result.unlocked) {
      navigateTo('/library');
      return;
    }
  }

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

  const [questionsResult, completedResult] = await Promise.all([
    supabase.from('public_questions').select('*').eq('book_id', bookId),
    completedCheck,
  ]);

  if (questionsResult.data) {
    const allQuestions = questionsResult.data as Question[];
    const isMasterQuiz = bookData.is_master_quiz === true;

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

    const opts: Record<string, string[]> = {};
    questionPool.forEach((q) => {
      opts[q.id] = seededShuffle(
        [q.correct_answer, q.wrong_answer_1, q.wrong_answer_2, q.wrong_answer_3],
        q.id
      );
    });
    setShuffledOptions(opts);
  }

  if (completedResult.data) setAlreadyCompleted(true);
  setLoading(false);
};

// ── handleUseBoost ──────────────────────────────────────────────────────────
const handleUseBoost = async () => {
  if (boostBalance <= 0 || submitted) return;
  await supabase
    .from('user_boosts')
    .update({ balance: boostBalance - 1, updated_at: new Date().toISOString() })
    .eq('user_id', user!.id);
  setBoostBalance((b) => b - 1);
  boostsUsedRef.current += 1;
  setBoostUsedCount((c) => c + 1);
  setTimeLeft((t) => t + 120);
};

// ── handleSubmit ────────────────────────────────────────────────────────────
submittedRef.current = submitted;
const handleSubmit = async (fromTimer = false) => {
  // GUARD: prevent duplicate concurrent submissions
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

  setTimeSpentMs(timeSpent);

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
      // Don't overwrite score with 0 on error -- just show result screen as-is
      // (handles "already submitted" 400 from duplicate clicks gracefully)
      console.error('Quiz submission error:', result.error);
      setSubmitted(true);
      return;
    }

    setScore(result.score ?? 0);
    setPassed(result.passed ?? false);
    setEarnedAmount(result.earned_amount ?? 0);
    if (result.streak_bonus) setStreakBonus(result.streak_bonus);
    if (result.pages_logged) setPagesLogged(result.pages_logged);
    setSubmitted(true);

  } catch (err) {
    console.error('Quiz submission failed:', err);
    setSubmitted(true);
  }
};

// ── handleReport ────────────────────────────────────────────────────────────
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

// ── useEffects ──────────────────────────────────────────────────────────────
useEffect(() => {
  loadQuiz();
  return () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (boostsUsedRef.current > 0 && !submittedRef.current) {
      supabase
        .from('user_boosts')
        .select('balance')
        .eq('user_id', user?.id)
        .single()
        .then(({ data }) => {
          if (data) {
            supabase
              .from('user_boosts')
              .update({ balance: data.balance + boostsUsedRef.current })
              .eq('user_id', user?.id);
          }
        });
    }
  };
}, [bookId]);

useEffect(() => {
  if (!loading && !submitted && !readathonGate && !sprintGate) {
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
}, [loading, submitted, readathonGate, sprintGate]);

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

// ── Theme ───────────────────────────────────────────────────────────────────
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

// ── Loading ─────────────────────────────────────────────────────────────────
if (loading) return (
  <div className={`min-h-screen ${bg} flex items-center justify-center transition-colors duration-300`}>
    <div className="w-8 h-8 border-2 border-[#D4A843] border-t-transparent rounded-full animate-spin" />
  </div>
);

// ── Sprint gate -- user not entered ─────────────────────────────────────────
if (sprintGate && activeSprint) return (
  <div className={`min-h-screen ${bg} flex items-center justify-center px-4 transition-colors duration-300`}>
    <div className={`${cardBg} border ${cardBorder} rounded-2xl p-8 max-w-md w-full text-center space-y-5`}>
      <div className="w-14 h-14 rounded-full bg-[#D4A843]/15 flex items-center justify-center mx-auto">
        <Zap size={28} className="text-[#D4A843]" />
      </div>
      <div>
        <h2 className={`text-xl font-bold ${headingColor} mb-2`}>Sprint in Progress</h2>
        <p className={`${subColor} text-sm leading-relaxed`}>
          <span className="font-semibold text-[#D4A843]">{activeSprint.title}</span> is currently active.
          This quiz is locked to sprint participants only.
        </p>
      </div>
      <div className={`${isDark ? 'bg-[#1B2A4A]' : 'bg-[#F5F0E8]'} rounded-xl p-4 text-sm ${subColor} leading-relaxed`}>
        Enter the sprint to compete for the prize pool. Winner takes all -- fastest reader with the highest score wins.
      </div>
      <div className="flex flex-col gap-3">
        <button
          onClick={() => navigateTo('/sprints')}
          className="w-full py-3 rounded-xl bg-[#D4A843] text-white font-semibold hover:bg-[#c49a3a] transition-colors"
        >
          View Sprint
        </button>
        <button
          onClick={() => navigateTo('/library')}
          className={`w-full py-3 rounded-xl border ${cardBorder} ${subColor} text-sm hover:opacity-70 transition-opacity`}
        >
          Back to Library
        </button>
      </div>
    </div>
  </div>
);

// ── Readathon gate -- user not entered ──────────────────────────────────────
if (readathonGate && activeReadathon) return (
  <div className={`min-h-screen ${bg} flex items-center justify-center px-4 transition-colors duration-300`}>
    <div className={`${cardBg} border ${cardBorder} rounded-2xl p-8 max-w-md w-full text-center space-y-5`}>
      <div className="w-14 h-14 rounded-full bg-[#D4A843]/15 flex items-center justify-center mx-auto">
        <BookOpen size={28} className="text-[#D4A843]" />
      </div>
      <div>
        <h2 className={`text-xl font-bold ${headingColor} mb-2`}>Readathon in Progress</h2>
        <p className={`${subColor} text-sm leading-relaxed`}>
          <span className="font-semibold text-[#D4A843]">{activeReadathon.title}</span> is currently active.
          All quizzes on the platform are unlocked for registered participants.
        </p>
      </div>
      <div className={`${isDark ? 'bg-[#1B2A4A]' : 'bg-[#F5F0E8]'} rounded-xl p-4 text-sm ${subColor} leading-relaxed`}>
        Enter the readathon to take this quiz and have your pages counted toward the leaderboard.
        Winners take home cash prizes.
      </div>
      <div className="flex flex-col gap-3">
        <button
          onClick={() => navigateTo('/readathon')}
          className="w-full py-3 rounded-xl bg-[#D4A843] text-white font-semibold hover:bg-[#c49a3a] transition-colors"
        >
          Join the Readathon
        </button>
        <button
          onClick={() => navigateTo('/library')}
          className={`w-full py-3 rounded-xl border ${cardBorder} ${subColor} text-sm hover:opacity-70 transition-opacity`}
        >
          Back to Library
        </button>
      </div>
    </div>
  </div>
);

// ── renderResult ────────────────────────────────────────────────────────────
const renderResult = () => {
  if (isCompetitionQuiz) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center px-4`}>
        <div className={`${cardBg} border ${cardBorder} rounded-2xl p-8 max-w-md w-full text-center space-y-4`}>
          {passed ? (
            <>
              <PartyPopper size={40} className="text-[#D4A843] mx-auto" />
              <h2 className={`text-2xl font-bold ${headingColor}`}>Round Passed!</h2>
              <p className={subColor}>Score: {score}/{questions.length}</p>
              {isFinalRound && <p className={`text-sm ${subColor}`}>You've completed the final round. Results will be announced soon.</p>}
            </>
          ) : (
            <>
              <AlertCircle size={40} className="text-red-400 mx-auto" />
              <h2 className={`text-2xl font-bold ${headingColor}`}>Eliminated</h2>
              <p className={subColor}>Score: {score}/{questions.length}</p>
              <p className={`text-sm ${subColor}`}>You needed {ELIMINATION_PASS_THRESHOLD[competitionRound ?? 1] ?? 8} correct to advance.</p>
            </>
          )}
          <button
            onClick={() => navigateTo(`/competition/${competitionId}`)}
            className="mt-4 px-6 py-2 rounded-xl bg-[#D4A843] text-white font-semibold hover:bg-[#c49a3a] transition-colors"
          >
            Back to Competition
          </button>
        </div>
      </div>
    );
  }

  // Sprint result
  if (activeSprint && isSprintEntrant) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center px-4`}>
        <div className={`${cardBg} border ${cardBorder} rounded-2xl p-8 max-w-md w-full text-center space-y-4`}>
          {passed ? (
            <>
              <PartyPopper size={40} className="text-[#D4A843] mx-auto" />
              <h2 className={`text-2xl font-bold ${headingColor}`}>Sprint Complete!</h2>
              <p className={subColor}>Score: {score}/{questions.length}</p>
              <div className={`${isDark ? 'bg-[#1B2A4A]' : 'bg-[#F5F0E8]'} rounded-xl p-4 space-y-2`}>
                <p className={`text-sm font-semibold ${headingColor}`}>
                  ⚡ {activeSprint.title}
                </p>
                <p className={`text-sm ${subColor}`}>
                  Time: {formatMs(timeSpentMs)}
                </p>
                <p className={`text-xs ${subColor}`}>
                  Leaderboard ranks by score first, then fastest time. Check your standing below.
                </p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle size={40} className="text-red-400 mx-auto" />
              <h2 className={`text-2xl font-bold ${headingColor}`}>Quiz Failed</h2>
              <p className={subColor}>Score: {score}/{questions.length} -- need {STANDARD_PASS_THRESHOLD} to pass</p>
              <p className={`text-sm ${subColor}`}>You can retake the quiz to improve your score and time.</p>
            </>
          )}
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => navigateTo('/library')}
              className={`flex-1 py-2 rounded-xl border ${cardBorder} ${subColor} text-sm hover:opacity-70 transition-opacity`}
            >
              Library
            </button>
            <button
              onClick={() => navigateTo('/sprints')}
              className="flex-1 py-2 rounded-xl bg-[#D4A843] text-white font-semibold hover:bg-[#c49a3a] transition-colors text-sm"
            >
              Leaderboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Readathon result
  if (activeReadathon && isReadathonEntrant) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center px-4`}>
        <div className={`${cardBg} border ${cardBorder} rounded-2xl p-8 max-w-md w-full text-center space-y-4`}>
          {passed ? (
            <>
              <PartyPopper size={40} className="text-[#D4A843] mx-auto" />
              <h2 className={`text-2xl font-bold ${headingColor}`}>Quiz Passed!</h2>
              <p className={subColor}>Score: {score}/{questions.length}</p>
              <div className={`${isDark ? 'bg-[#1B2A4A]' : 'bg-[#F5F0E8]'} rounded-xl p-4 space-y-2`}>
                <p className={`text-sm font-semibold ${headingColor}`}>
                  📖 +{pagesLogged} pages added to your readathon total
                </p>
                {earnedAmount > 0 && (
                  <p className={`text-sm ${subColor}`}>
                    +${earnedAmount.toFixed(2)} bounty earned
                  </p>
                )}
              </div>
              <p className={`text-xs ${subColor}`}>Check the leaderboard to see your standing.</p>
            </>
          ) : (
            <>
              <AlertCircle size={40} className="text-red-400 mx-auto" />
              <h2 className={`text-2xl font-bold ${headingColor}`}>Quiz Failed</h2>
              <p className={subColor}>Score: {score}/{questions.length} -- need {STANDARD_PASS_THRESHOLD} to pass</p>
              <p className={`text-sm ${subColor}`}>No pages counted for failed quizzes. Try another book!</p>
            </>
          )}
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => navigateTo('/library')}
              className={`flex-1 py-2 rounded-xl border ${cardBorder} ${subColor} text-sm hover:opacity-70 transition-opacity`}
            >
              More Books
            </button>
            <button
              onClick={() => navigateTo('/readathon')}
              className="flex-1 py-2 rounded-xl bg-[#D4A843] text-white font-semibold hover:bg-[#c49a3a] transition-colors text-sm"
            >
              Leaderboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Standard result
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
            <p className={subColor}>Score: {score}/{questions.length} -- need {STANDARD_PASS_THRESHOLD} to pass</p>
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
};

if (submitted) return renderResult();

// ── Quiz UI ─────────────────────────────────────────────────────────────────
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
        {!submitted && !alreadyCompleted && boostBalance > 0 && (
          <button
            onClick={handleUseBoost}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4A843]/15 border border-[#D4A843]/40 text-[#D4A843] text-xs font-semibold hover:bg-[#D4A843]/25 transition"
          >
            <Zap size={13} />
            +2 min ({boostBalance} left)
          </button>
        )}
        <div className={`flex items-center gap-1.5 text-sm font-mono font-semibold ${timeLeft < 60 ? 'text-red-400' : headingColor}`}>
          <Timer size={15} />
          {formatTime(timeLeft)}
        </div>
      </div>
    </div>

    {/* Sprint banner */}
    {activeSprint && isSprintEntrant && (
      <div className="bg-[#D4A843]/10 border-b border-[#D4A843]/20 px-4 py-2 text-center">
        <p className="text-xs text-[#D4A843] font-medium">
          ⚡ Sprint: {activeSprint.title} -- score high and finish fast to win the prize pool
        </p>
      </div>
    )}

    {/* Readathon banner */}
    {activeReadathon && isReadathonEntrant && (
      <div className="bg-[#D4A843]/10 border-b border-[#D4A843]/20 px-4 py-2 text-center">
        <p className="text-xs text-[#D4A843] font-medium">
          📖 Readathon: {activeReadathon.title} -- pages count toward your total on pass
        </p>
      </div>
    )}

    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

      {/* Already completed notice */}
      {alreadyCompleted && (
        <div className={`${cardBg} border ${cardBorder} rounded-xl p-4 flex items-start gap-3`}>
          <AlertCircle size={18} className="text-amber-400 mt-0.5 shrink-0" />
          <p className={`text-sm ${subColor}`}>You've already completed this quiz. You can review the questions but won't earn again.</p>
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
          <p className="text-sm text-amber-400">Please take your time reading the questions carefully.</p>
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
}
