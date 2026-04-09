import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Plus, Trash2, CheckCircle } from 'lucide-react';

interface QuestionEntry {
  question: string;
  correct_answer: string;
  wrong_answer_1: string;
  wrong_answer_2: string;
  wrong_answer_3: string;
}

export const RequestBook = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [bookTitle, setBookTitle] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [questions, setQuestions] = useState<QuestionEntry[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        question: '',
        correct_answer: '',
        wrong_answer_1: '',
        wrong_answer_2: '',
        wrong_answer_3: '',
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (
    index: number,
    field: keyof QuestionEntry,
    value: string
  ) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !bookTitle.trim() || !authorName.trim()) return;
    setLoading(true);

    const cleanedQuestions = questions.filter(
      (q) => q.question.trim() && q.correct_answer.trim()
    );

    await supabase.from('book_requests').insert({
      user_id: user.id,
      book_title: bookTitle.trim(),
      author_name: authorName.trim(),
      questions: cleanedQuestions,
    });

    setSubmitted(true);
    setLoading(false);
  };

  // ─── Shared style tokens ───────────────────────────────────────────────────
  const bg = isDark ? '#0f172a' : '#F5F0E8';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const cardBorder = isDark ? '#334155' : '#e2d9c8';
  const inputBg = isDark ? '#0f172a' : '#F5F0E8';
  const inputBorder = isDark ? '#475569' : '#d1c9b8';
  const inputFocusBorder = '#D4A843';
  const textPrimary = isDark ? '#F5F0E8' : '#1B2A4A';
  const textSecondary = isDark ? '#94a3b8' : '#6b7280';
  const textMuted = isDark ? '#64748b' : '#9ca3af';
  const placeholder = isDark ? '#475569' : '#a8a29e';

  // ─── Submitted state ───────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: bg }}
      >
        <div className="text-center max-w-md">
          <CheckCircle
            className="w-16 h-16 mx-auto mb-4"
            style={{ color: '#D4A843' }}
          />
          <h2
            className="text-3xl font-serif mb-3"
            style={{ color: textPrimary }}
          >
            Request Submitted!
          </h2>
          <p className="mb-2" style={{ color: textSecondary }}>
            Thanks for the suggestion. We will review your request and add it
            to the library if it is a good fit.
          </p>
          {questions.length > 0 && (
            <p className="text-sm" style={{ color: textMuted }}>
              Your submitted questions will be considered when building the
              quiz.
            </p>
          )}
          <button
            onClick={() => {
              setSubmitted(false);
              setBookTitle('');
              setAuthorName('');
              setQuestions([]);
            }}
            className="mt-6 font-medium px-6 py-2.5 rounded-lg transition"
            style={{
              backgroundColor: '#1B2A4A',
              color: '#F5F0E8',
            }}
          >
            Submit Another
          </button>
        </div>
      </div>
    );
  }

  // ─── Main form ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ backgroundColor: bg }}>
      <div className="max-w-2xl mx-auto px-4 py-12">

        {/* Header */}
        <div className="mb-8">
          <h1
            className="font-serif text-3xl mb-2"
            style={{ color: textPrimary }}
          >
            Request a Book
          </h1>
          <p style={{ color: textSecondary }}>
            Do not see a book you have read? Let us know and we will try to add
            it. Bonus points if you submit some quiz questions too.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Book details card */}
          <div
            className="rounded-lg p-6 border space-y-4"
            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
          >
            {/* Book Title */}
            <div>
              <label
                className="block text-sm mb-1.5"
                style={{ color: textSecondary }}
              >
                Book Title{' '}
                <span style={{ color: '#D4A843' }}>*</span>
              </label>
              <input
                type="text"
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                placeholder="e.g. The Alchemist"
                required
                className="w-full rounded-lg px-4 py-2.5 focus:outline-none transition text-sm"
                style={{
                  backgroundColor: inputBg,
                  border: `1px solid ${inputBorder}`,
                  color: textPrimary,
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = inputFocusBorder)
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = inputBorder)
                }
              />
            </div>

            {/* Author Name */}
            <div>
              <label
                className="block text-sm mb-1.5"
                style={{ color: textSecondary }}
              >
                Author Name{' '}
                <span style={{ color: '#D4A843' }}>*</span>
              </label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="e.g. Paulo Coelho"
                required
                className="w-full rounded-lg px-4 py-2.5 focus:outline-none transition text-sm"
                style={{
                  backgroundColor: inputBg,
                  border: `1px solid ${inputBorder}`,
                  color: textPrimary,
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = inputFocusBorder)
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = inputBorder)
                }
              />
            </div>
          </div>

          {/* Quiz Questions section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2
                  className="font-medium"
                  style={{ color: textPrimary }}
                >
                  Quiz Questions
                </h2>
                <p className="text-xs mt-0.5" style={{ color: textMuted }}>
                  Optional - helps us add the book faster
                </p>
              </div>
              <button
                type="button"
                onClick={addQuestion}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition"
                style={{
                  backgroundColor: isDark
                    ? 'rgba(212,168,67,0.1)'
                    : 'rgba(27,42,74,0.06)',
                  border: `1px solid ${isDark ? 'rgba(212,168,67,0.3)' : '#d1c9b8'}`,
                  color: isDark ? '#D4A843' : '#1B2A4A',
                }}
              >
                <Plus className="w-4 h-4" />
                Add Question
              </button>
            </div>

            {/* Empty state */}
            {questions.length === 0 && (
              <div
                className="rounded-lg p-6 text-center border border-dashed"
                style={{
                  backgroundColor: cardBg,
                  borderColor: isDark ? '#334155' : '#d1c9b8',
                }}
              >
                <p className="text-sm" style={{ color: textMuted }}>
                  Press + to add a question (optional)
                </p>
              </div>
            )}

            {/* Question cards */}
            <div className="space-y-4">
              {questions.map((q, index) => (
                <div
                  key={index}
                  className="rounded-lg p-6 border"
                  style={{
                    backgroundColor: cardBg,
                    borderColor: cardBorder,
                  }}
                >
                  {/* Question header */}
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className="text-sm font-medium"
                      style={{ color: textSecondary }}
                    >
                      Question {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeQuestion(index)}
                      className="transition"
                      style={{ color: textMuted }}
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLButtonElement).style.color =
                          '#ef4444')
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLButtonElement).style.color =
                          textMuted)
                      }
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {/* Question text */}
                    <input
                      type="text"
                      value={q.question}
                      onChange={(e) =>
                        updateQuestion(index, 'question', e.target.value)
                      }
                      placeholder="Question"
                      className="w-full rounded-lg px-4 py-2.5 focus:outline-none transition text-sm"
                      style={{
                        backgroundColor: inputBg,
                        border: `1px solid ${inputBorder}`,
                        color: textPrimary,
                      }}
                      onFocus={(e) =>
                        (e.target.style.borderColor = inputFocusBorder)
                      }
                      onBlur={(e) =>
                        (e.target.style.borderColor = inputBorder)
                      }
                    />

                    {/* Correct answer - gold accent border */}
                    <input
                      type="text"
                      value={q.correct_answer}
                      onChange={(e) =>
                        updateQuestion(
                          index,
                          'correct_answer',
                          e.target.value
                        )
                      }
                      placeholder="Correct answer"
                      className="w-full rounded-lg px-4 py-2.5 focus:outline-none transition text-sm"
                      style={{
                        backgroundColor: inputBg,
                        border: `1px solid rgba(212,168,67,0.4)`,
                        color: textPrimary,
                      }}
                      onFocus={(e) =>
                        (e.target.style.borderColor = '#D4A843')
                      }
                      onBlur={(e) =>
                        (e.target.style.borderColor =
                          'rgba(212,168,67,0.4)')
                      }
                    />

                    {/* Wrong answers */}
                    {(
                      [
                        'wrong_answer_1',
                        'wrong_answer_2',
                        'wrong_answer_3',
                      ] as const
                    ).map((field, i) => (
                      <input
                        key={field}
                        type="text"
                        value={q[field]}
                        onChange={(e) =>
                          updateQuestion(index, field, e.target.value)
                        }
                        placeholder={`Wrong answer ${i + 1}`}
                        className="w-full rounded-lg px-4 py-2.5 focus:outline-none transition text-sm"
                        style={{
                          backgroundColor: inputBg,
                          border: `1px solid ${inputBorder}`,
                          color: textPrimary,
                        }}
                        onFocus={(e) =>
                          (e.target.style.borderColor = inputFocusBorder)
                        }
                        onBlur={(e) =>
                          (e.target.style.borderColor = inputBorder)
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Add another question link */}
            {questions.length > 0 && (
              <button
                type="button"
                onClick={addQuestion}
                className="mt-3 flex items-center gap-1.5 text-sm transition"
                style={{ color: textMuted }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.color =
                    '#D4A843')
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.color =
                    textMuted)
                }
              >
                <Plus className="w-4 h-4" />
                Add another question
              </button>
            )}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading || !bookTitle.trim() || !authorName.trim()}
            className="w-full font-medium py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: '#1B2A4A',
              color: '#F5F0E8',
            }}
          >
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>

        </form>
      </div>
    </div>
  );
};
