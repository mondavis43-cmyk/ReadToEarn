import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../hooks/useNavigate';
import { ArrowLeft, PartyPopper, Timer } from 'lucide-react';

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
}

interface QuizProps {
  bookId: string;
}

const QUIZ_DURATION = 8 * 60; // 8 minutes in seconds

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
  const [timerStarted, setTimerStarted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadQuiz();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [bookId, user]);

  // Start timer once quiz loads
  useEffect(() => {
    if (!loading && !submitted && !timerStarted && questions.length > 0) {
      setTimerStarted(true);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setTimedOut(true);
            handleSubmit(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, [loading, submitted, timerStarted, questions]);

  const loadQuiz = async () => {
    if (!user) return;

    const [bookResult, questionsResult, completedResult] = await Promise.all([
      supabase.from('books').select('*').eq('id', bookId).maybeSingle(),
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
      const optionsMap: Record<string, string[]> = {};
      qs.forEach((q) => {
        const opts = [q.correct_answer, q.wrong_answer_1, q.wrong_answer_2, q.wrong_answer_3];
        optionsMap[q.id] = seededShuffle(opts, q.id);
      });
      setShuffledOptions(optionsMap);
    }

    if (completedResult.data) setAlreadyCompleted(true);
    setLoading(false);
  };

  const handleSubmit = async (fromTimer = false) => {
    if (!user || !book) return;
    if (timerRef.current) clearInterval(timerRef.current);

    // Use a ref-safe snapshot of answers when called from timer
    setAnswers((currentAnswers) => {
      const answersToScore = fromTimer ? currentAnswers : answers;

      let correctCount = 0;
      questions.forEach((q) => {
        if (answersToScore[q.id] === q.correct_answer) correctCount++;
      });

      const userPassed = correctCount >= 8;
      setScore(correctCount);
      setPassed(userPassed);
      setSubmitted(true);

      supabase.from('quiz_attempts').insert({
        user_id: user.id,
        book_id: book.id,
        score: correctCount,
        passed: userPassed,
      });

      if (userPassed && !alreadyCompleted) {
        supabase
          .from('profiles')
          .select('available_balance')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              const newBalance = Number(data.available_balance) + Number(book.bounty_amount);
              Promise.all([
                supabase.from('profiles').update({ available_balance: newBalance }).eq('id', user.id),
                supabase.from('completed_books').insert({ user_id: user.id, book_id: book.id }),
              ]);
            }
          });
      }

      return currentAnswers;
    });
  };

  const isWarning = timeLeft <= 60;
  const isCritical = timeLeft <= 30;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-white">Loading quiz...</div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-white">Book not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <header className="border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <button
            onClick={() => navigateTo('/')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Library
          </button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-serif text-3xl text-white mb-1">{book.title}</h1>
              <p className="text-gray-400">{book.author}</p>
            </div>
            {/* Timer - only shows during active quiz */}
            {!submitted && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
                isCritical
                  ? 'bg-red-900/30 border-red-700/50 text-red-400'
                  : isWarning
                  ? 'bg-yellow-900/30 border-yellow-700/50 text-yellow-400'
                  : 'bg-[#1a1a1a] border-gray-700 text-gray-300'
              }`}>
                <Timer className="w-4 h-4" />
                <span className="font-mono font-medium text-lg">{formatTime(timeLeft)}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        {!submitted ? (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-2">Quiz: {book.title}</h2>
              <p className="text-gray-400 mb-3">
                Answer at least 8 out of 10 questions correctly to earn ${book.bounty_amount.toFixed(2)}
              </p>
              {/* Timer explanation - subtle, one line */}
              <p className="text-gray-600 text-xs flex items-center gap-1">
                <Timer className="w-3 h-3" />
                8-minute time limit is here to combat cheating like Googling or using AI to find answers. This is how we keep things fair for everyone.
              </p>
            </div>

            <div className="space-y-8">
              {questions.map((question, index) => {
                const options = shuffledOptions[question.id] || [];
                return (
                  <div key={question.id} className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
                    <h3 className="text-white font-medium mb-4">
                      {index + 1}. {question.question_text}
                    </h3>
                    <div className="space-y-3">
                      {options.map((option, optIndex) => {
                        const displayLabel = ['A', 'B', 'C', 'D'][optIndex];
                        return (
                          <label
                            key={optIndex}
                            className="flex items-start gap-3 p-4 bg-[#0f0f0f] rounded-lg border border-gray-700 hover:border-gray-600 cursor-pointer transition"
                          >
                            <input
                              type="radio"
                              name={`question-${question.id}`}
                              value={option}
                              checked={answers[question.id] === option}
                              onChange={() => setAnswers({ ...answers, [question.id]: option })}
                              className="mt-1 w-4 h-4 accent-white"
                            />
                            <span className="text-gray-300 flex-1">
                              <span className="font-medium text-white">{displayLabel}.</span> {option}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex justify-center">
              <button
                onClick={() => handleSubmit(false)}
                disabled={Object.keys(answers).length !== questions.length}
                className="bg-white text-black font-medium px-8 py-3 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Quiz
              </button>
            </div>
          </>
        ) : (
          <div className="bg-[#1a1a1a] rounded-lg p-8 border border-gray-800 text-center max-w-2xl mx-auto">
            {timedOut && (
              <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3 mb-6">
                <p className="text-yellow-400 text-sm">Time's up — your answers were automatically submitted.</p>
              </div>
            )}
            {passed ? (
              <>
                <div className="flex justify-center mb-4">
                  <PartyPopper className="w-16 h-16 text-green-500" />
                </div>
                <h2 className="text-3xl font-serif text-white mb-2">You Passed!</h2>
                <p className="text-gray-300 mb-6">
                  You scored {score} out of {questions.length}
                </p>
                {!alreadyCompleted && (
                  <div className="bg-green-900/20 border border-green-900/50 rounded-lg p-4 mb-6">
                    <p className="text-green-400 font-medium">
                      ${book.bounty_amount.toFixed(2)} has been added to your balance!
                    </p>
                  </div>
                )}
                {alreadyCompleted && (
                  <div className="bg-gray-800 rounded-lg p-4 mb-6">
                    <p className="text-gray-400 text-sm">
                      You've already completed this quiz and earned the bounty.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <h2 className="text-3xl font-serif text-white mb-2">Not quite there</h2>
                <p className="text-gray-300 mb-6">
                  You scored {score} out of {questions.length}. You need at least 8 correct answers to pass.
                </p>
              </>
            )}

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => navigateTo('/')}
                className="bg-white text-black font-medium px-6 py-3 rounded-lg hover:bg-gray-200 transition"
              >
                Back to Library
              </button>
              {!passed && (
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setAnswers({});
                    setScore(0);
                    setTimedOut(false);
                    setTimeLeft(QUIZ_DURATION);
                    setTimerStarted(false);
                  }}
                  className="bg-gray-700 text-white font-medium px-6 py-3 rounded-lg hover:bg-gray-600 transition"
                >
                  Try Again
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
