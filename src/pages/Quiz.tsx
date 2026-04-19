import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../hooks/useNavigate';
import { useTheme } from '../contexts/ThemeContext';
import { ArrowLeft, PartyPopper, Timer } from 'lucide-react';
import { calculatePayout, SubscriptionTier } from '../utils/calculatePayout';

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
}

interface QuizProps {
  bookId: string;
}

const QUIZ_DURATION = 8 * 60;

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

export const Quiz = ({ bookId }: QuizProps) => {
  const { user } = useAuth();
  const { navigateTo } = useNavigate();
  const { isDark } = useTheme();
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
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const loadQuiz = async () => {
    if (!user) return;

    const [bookResult, questionsResult, completedResult] = await Promise.all([
      supabase
        .from('books')
        .select('id, title, author, bounty_amount, page_count, book_type')
        .eq('id', bookId)
        .single(),
      supabase.from('questions').select('*').eq('book_id', bookId),
      supabase
        .from('completed_books')
        .select('id')
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .maybeSingle(),
    ]);

    if (bookResult.data) setBook(bookResult.data);

    if (questionsResult.data) {
      const qs = questionsResult.data as Question[];
      setQuestions(qs);
      const opts: Record<string, string[]> = {};
      qs.forEach((q) => {
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

    {alreadyCompleted && (
  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6 text-yellow-300 text-sm">
    {completedData?.passed 
      ? "You've already earned your reward for this book."
      : "You've already used your one attempt for this book. Each book allows one quiz attempt."}
  </div>
)}

const handleSubmit = async (fromTimer = false) => {
  if (timerRef.current) clearInterval(timerRef.current);
  if (fromTimer) setTimedOut(true);

  let correct = 0;
  questions.forEach((q) => {
    if (answers[q.id] === q.correct_answer) correct++;
  });

  setScore(correct);
  const pass = correct >= 8;
  setPassed(pass);
  setSubmitted(true);

  if (!user || !book) return;

  // Log every attempt for audit purposes
  await supabase.from('quiz_attempts').insert({
    user_id: user.id,
    book_id: bookId,
    score: correct,
    passed: pass,
  });

  // Only process payout on first attempt (pass or fail)
  if (!alreadyCompleted) {
    await supabase.from('completed_books').insert({
      user_id: user.id,
      book_id: bookId,
      passed: pass,
      score: correct,
      completed_at: new Date().toISOString(),
    });

    // Only award earnings if they passed
    if (pass) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('available_balance, streak_count, last_quiz_date, referred_by, subscription_tier')
        .eq('id', user.id)
        .single();

      if (profileData) {
        const today = new Date().toISOString().split('T')[0];
        const lastDate = profileData.last_quiz_date;
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const newStreak = lastDate === yesterday ? (profileData.streak_count ?? 0) + 1 : 1;

        let bonus = 0;
        if (newStreak === 7 || newStreak === 30) {
          bonus = 0.10;
          setStreakBonus(newStreak);
        }

        const payout = calculatePayout(
          book.book_type,
          book.page_count,
          (profileData.subscription_tier ?? 'free') as SubscriptionTier
        );
        setEarnedAmount(payout);

        await supabase
          .from('profiles')
          .update({
            available_balance: profileData.available_balance + payout + bonus,
            streak_count: newStreak,
            last_quiz_date: today,
          })
          .eq('id', user.id);

        if (profileData.referred_by) {
          const { data: referrerData } = await supabase
            .from('profiles')
            .select('available_balance')
            .eq('id', profileData.referred_by)
            .single();

          if (referrerData) {
            await supabase
              .from('profiles')
              .update({ available_balance: referrerData.available_balance + 0.50 })
              .eq('id', profileData.referred_by);
          }
        }
      }
    }
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

  const timerColor = () => {
    if (timeLeft <= 30) return isDark
      ? 'bg-red-900/20 border-red-500/40 text-red-400'
      : 'bg-red-50 border-red-300 text-red-600';
    if (timeLeft <= 60) return isDark
      ? 'bg-[#D4A843]/10 border-[#D4A843]/30 text-[#D4A843]'
      : 'bg-amber-50 border-amber-300 text-amber-600';
    return isDark
      ? 'bg-[#162238] border-[#F5F0E8]/10 text-[#F5F0E8]/60'
      : 'bg-white border-[#1B2A4A]/10 text-[#1B2A4A]/60';
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center transition-colors duration-300`}>
        <div className="w-8 h-8 border-2 border-[#D4A843] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300`}>
      {/* Header */}
      <div className={`border-b ${dividerColor} px-4 py-4 sticky top-0 z-10 ${isDark ? 'bg-[#1B2A4A]' : 'bg-[#F5F0E8]'}`}>
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigateTo('/books')}
              className={`${subColor} hover:text-[#D4A843] transition flex-shrink-0`}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className={`font-serif text-lg ${headingColor} truncate`}>{book?.title}</h1>
              <p className={`text-xs ${subColor} truncate`}>{book?.author}</p>
            </div>
          </div>

          {!submitted && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-mono flex-shrink-0 transition-colors ${timerColor()}`}>
              <Timer className="w-3.5 h-3.5" />
              {formatTime(timeLeft)}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Results Screen */}
        {submitted ? (
          <div className={`${cardBg} rounded-lg p-8 border ${cardBorder}`}>
            {passed ? (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <PartyPopper className="w-6 h-6 text-[#D4A843]" />
                  <h2 className={`text-3xl font-serif ${headingColor}`}>You passed!</h2>
                </div>
                <p className={`${subColor} mb-6`}>
                  {score} out of {questions.length} correct
                </p>

                {!alreadyCompleted && (
                  <div className="bg-[#D4A843]/10 border border-[#D4A843]/30 rounded-lg p-4 mb-3">
                    <p className="text-[#D4A843] font-medium text-sm">
                      +${earnedAmount.toFixed(2)} added to your balance
                    </p>
                  </div>
                )}

                {streakBonus && (
                  <div className="bg-[#D4A843]/10 border border-[#D4A843]/30 rounded-lg p-4 mb-3">
                    <p className="text-[#D4A843] font-medium text-sm">
                      {streakBonus}-day streak bonus! +$0.10 added to your balance
                    </p>
                  </div>
                )}

                {alreadyCompleted && (
                  <div className={`${isDark ? 'bg-[#1B2A4A]' : 'bg-[#F5F0E8]'} rounded-lg p-4 mb-3`}>
                    <p className={`text-sm ${subColor}`}>
                      You already completed this book. No additional payout.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <h2 className={`text-3xl font-serif ${headingColor} mb-2`}>
                  {timedOut ? 'Time is up' : 'Not quite'}
                </h2>
                <p className={`${subColor} mb-6`}>
                  {score} out of {questions.length} correct. You need 8 to pass.
                </p>

                {timedOut && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-3">
                    <p className="text-red-400 text-sm">
                      The quiz was submitted automatically when time ran out.
                    </p>
                  </div>
                )}
              </>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => navigateTo('/books')}
                className="bg-[#D4A843] text-[#1B2A4A] font-medium px-6 py-2.5 rounded-lg hover:bg-[#c49a38] transition"
              >
                Back to Library
              </button>
              {!passed && (
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setAnswers({});
                    setScore(0);
                    setPassed(false);
                    setTimedOut(false);
                    setTimeLeft(QUIZ_DURATION);
                  }}
                  className={`${isDark ? 'bg-[#F5F0E8]/10 text-[#F5F0E8] hover:bg-[#F5F0E8]/15' : 'bg-[#1B2A4A]/10 text-[#1B2A4A] hover:bg-[#1B2A4A]/15'} font-medium px-6 py-2.5 rounded-lg transition`}
                >
                  Try Again
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Questions */
          <div className="space-y-6">
            {questions.map((question, index) => (
              <div key={question.id} className={`${cardBg} rounded-lg p-6 border ${cardBorder}`}>
                <p className={`font-medium ${headingColor} mb-4`}>
                  <span className="text-[#D4A843] mr-2">{index + 1}.</span>
                  {question.question_text}
                </p>

                <div className="space-y-3">
                  {(shuffledOptions[question.id] ?? []).map((option, optIndex) => {
                    const labels = ['A', 'B', 'C', 'D'];
                    const isSelected = answers[question.id] === option;
                    return (
                      <label
                        key={optIndex}
                        className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-[#D4A843] bg-[#D4A843]/10'
                            : `${optionBg} ${optionBorder}`
                        }`}
                      >
                        <input
                          type="radio"
                          name={question.id}
                          value={option}
                          checked={isSelected}
                          onChange={() => setAnswers((prev) => ({ ...prev, [question.id]: option }))}
                          className="mt-0.5 accent-[#D4A843] flex-shrink-0"
                        />
                        <span className={`text-sm ${isSelected ? (isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]') : optionText}`}>
                          <span className="font-medium mr-2">{labels[optIndex]}.</span>
                          {option}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between pt-2 pb-8">
              <p className={`text-sm ${subColor}`}>
                {Object.keys(answers).length} of {questions.length} answered
              </p>
              <button
                onClick={() => handleSubmit(false)}
                disabled={Object.keys(answers).length < questions.length}
                className="bg-[#D4A843] text-[#1B2A4A] font-medium px-8 py-3 rounded-lg hover:bg-[#c49a38] transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Submit Quiz
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
   );
 );
);
