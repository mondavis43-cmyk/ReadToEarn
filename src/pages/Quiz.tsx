import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Question {
  id: string;
  book_id: string;
  question_text: string;
  correct_answer: string;
  wrong_answer_1: string;
  wrong_answer_2: string;
  wrong_answer_3: string;
}

function seededShuffle<T>(arr: T[], seed: string): T[] {
  const result = [...arr];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  for (let i = result.length - 1; i > 0; i--) {
    hash = (hash * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(hash) % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export default function Quiz() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [shuffledOptions, setShuffledOptions] = useState<Record<string, string[]>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);

  useEffect(() => {
    if (bookId) loadQuiz();
  }, [bookId]);

  async function loadQuiz() {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('questions')
        .select('*')
        .eq('book_id', bookId);

      if (fetchError) throw fetchError;
      if (!data || data.length === 0) {
        setError('No questions found for this book.');
        return;
      }

      const questionPool = data.slice(0, 10) as Question[];
      setQuestions(questionPool);

      const opts: Record<string, string[]> = {};
      questionPool.forEach((q) => {
        opts[q.id] = seededShuffle(
          [q.correct_answer, q.wrong_answer_1, q.wrong_answer_2, q.wrong_answer_3],
          q.id
        );
      });
      setShuffledOptions(opts);
    } catch (err: any) {
      setError(err.message || 'Failed to load quiz.');
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(questionId: string, answer: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  }

  async function handleSubmit() {
    if (Object.keys(answers).length < questions.length) {
      setError('Please answer all questions before submitting.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const { data, error: submitError } = await supabase.functions.invoke('grade-quiz', {
        body: { bookId, answers },
      });

      if (submitError) throw submitError;

      setResult({ score: data.score, passed: data.passed });

      if (data.passed) {
        await supabase.from('user_books').upsert({
          user_id: user?.id,
          book_id: bookId,
          completed: true,
          score: data.score,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit quiz.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="p-8 text-center">Loading quiz…</div>;
  if (error && questions.length === 0) return <div className="p-8 text-center text-red-500">{error}</div>;

  if (result) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">{result.passed ? '🎉 You passed!' : '😞 Try again'}</h2>
        <p className="text-lg mb-6">Score: {result.score}%</p>
        <button
          onClick={() => navigate('/')}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Back to Library
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Book Quiz</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {questions.map((q, idx) => (
        <div key={q.id} className="mb-8">
          <p className="font-semibold mb-3">
            {idx + 1}. {q.question_text}
          </p>
          <div className="space-y-2">
            {(shuffledOptions[q.id] || []).map((option) => (
              <label key={option} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name={q.id}
                  value={option}
                  checked={answers[q.id] === option}
                  onChange={() => handleSelect(q.id, option)}
                  className="accent-blue-600"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="bg-blue-600 text-white px-8 py-3 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? 'Submitting…' : 'Submit Quiz'}
      </button>
    </div>
  );
}
