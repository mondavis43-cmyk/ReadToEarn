import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../hooks/useNavigate';
import { ArrowLeft, PartyPopper } from 'lucide-react';

interface Question {
  id: string;
  book_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
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

export const Quiz = ({ bookId }: QuizProps) => {
  const { user } = useAuth();
  const { navigateTo } = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [passed, setPassed] = useState(false);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuiz();
  }, [bookId, user]);

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

    if (bookResult.data) {
      setBook(bookResult.data);
    }

    if (questionsResult.data) {
      setQuestions(questionsResult.data);
    }

    if (completedResult.data) {
      setAlreadyCompleted(true);
    }

    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!user || !book) return;

    let correctCount = 0;
    questions.forEach((q) => {
      if (answers[q.id] === q.correct_answer) {
        correctCount++;
      }
    });

    const userPassed = correctCount >= 8;
    setScore(correctCount);
    setPassed(userPassed);
    setSubmitted(true);

    await supabase.from('quiz_attempts').insert({
      user_id: user.id,
      book_id: book.id,
      score: correctCount,
      passed: userPassed,
    });

    if (userPassed && !alreadyCompleted) {
      const [profileResult] = await Promise.all([
        supabase.from('profiles').select('available_balance').eq('id', user.id).single(),
      ]);

      if (profileResult.data) {
        const newBalance = Number(profileResult.data.available_balance) + Number(book.bounty_amount);

        await Promise.all([
          supabase
            .from('profiles')
            .update({ available_balance: newBalance })
            .eq('id', user.id),
          supabase.from('completed_books').insert({
            user_id: user.id,
            book_id: book.id,
          }),
        ]);
      }
    }
  };

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
          <h1 className="font-serif text-3xl text-white mb-1">{book.title}</h1>
          <p className="text-gray-400">{book.author}</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        {!submitted ? (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-2">
                Quiz: {book.title}
              </h2>
              <p className="text-gray-400">
                Answer at least 8 out of 10 questions correctly to earn ${book.bounty_amount.toFixed(2)}
              </p>
            </div>

            <div className="space-y-8">
              {questions.map((question, index) => (
                <div key={question.id} className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
                  <h3 className="text-white font-medium mb-4">
                    {index + 1}. {question.question_text}
                  </h3>

                  <div className="space-y-3">
                    {['A', 'B', 'C', 'D'].map((option) => {
                      const optionKey = `option_${option.toLowerCase()}` as keyof Question;
                      const optionText = question[optionKey] as string;

                      return (
                        <label
                          key={option}
                          className="flex items-start gap-3 p-4 bg-[#0f0f0f] rounded-lg border border-gray-700 hover:border-gray-600 cursor-pointer transition"
                        >
                          <input
                            type="radio"
                            name={`question-${question.id}`}
                            value={option}
                            checked={answers[question.id] === option}
                            onChange={() =>
                              setAnswers({ ...answers, [question.id]: option })
                            }
                            className="mt-1 w-4 h-4 accent-white"
                          />
                          <span className="text-gray-300 flex-1">
                            <span className="font-medium text-white">{option}.</span> {optionText}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-center">
              <button
                onClick={handleSubmit}
                disabled={Object.keys(answers).length !== questions.length}
                className="bg-white text-black font-medium px-8 py-3 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Quiz
              </button>
            </div>
          </>
        ) : (
          <div className="bg-[#1a1a1a] rounded-lg p-8 border border-gray-800 text-center max-w-2xl mx-auto">
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
