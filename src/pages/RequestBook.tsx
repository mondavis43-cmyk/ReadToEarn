import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
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
  const [bookTitle, setBookTitle] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [questions, setQuestions] = useState<QuestionEntry[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      { question: '', correct_answer: '', wrong_answer_1: '', wrong_answer_2: '', wrong_answer_3: '' },
    ]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: keyof QuestionEntry, value: string) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !bookTitle.trim() || !authorName.trim()) return;
    setLoading(true);

    // Filter out empty question entries
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

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-3xl font-serif text-white mb-3">Request Submitted!</h2>
          <p className="text-gray-400 mb-2">
            Thanks for the suggestion. We'll review your request and add it to the library if it's a good fit.
          </p>
          {questions.length > 0 && (
            <p className="text-gray-500 text-sm">
              Your submitted questions will be considered when building the quiz.
            </p>
          )}
          <button
            onClick={() => {
              setSubmitted(false);
              setBookTitle('');
              setAuthorName('');
              setQuestions([]);
            }}
            className="mt-6 bg-white text-black font-medium px-6 py-2.5 rounded-lg hover:bg-gray-200 transition"
          >
            Submit Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="font-serif text-3xl text-white mb-2">Request a Book</h1>
          <p className="text-gray-400">
            Don't see a book you've read? Let us know and we'll try to add it. Bonus points if you submit some quiz questions too.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Book details */}
          <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800 space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Book Title <span className="text-white">*</span></label>
              <input
                type="text"
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                placeholder="e.g. The Alchemist"
                required
                className="w-full bg-[#0f0f0f] border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 transition"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Author Name <span className="text-white">*</span></label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="e.g. Paulo Coelho"
                required
                className="w-full bg-[#0f0f0f] border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 transition"
              />
            </div>
          </div>

          {/* Questions section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-white font-medium">Quiz Questions</h2>
                <p className="text-gray-500 text-xs mt-0.5">Optional — but helps us add the book faster</p>
              </div>
              <button
                type="button"
                onClick={addQuestion}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-gray-700 text-gray-300 hover:text-white rounded-lg text-sm transition"
              >
                <Plus className="w-4 h-4" />
                Add Question
              </button>
            </div>

            {questions.length === 0 && (
              <div className="bg-[#1a1a1a] border border-dashed border-gray-700 rounded-lg p-6 text-center">
                <p className="text-gray-600 text-sm">Press + to add a question (optional)</p>
              </div>
            )}

            <div className="space-y-4">
              {questions.map((q, index) => (
                <div key={index} className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-400 text-sm font-medium">Question {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeQuestion(index)}
                      className="text-gray-600 hover:text-red-400 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={q.question}
                      onChange={(e) => updateQuestion(index, 'question', e.target.value)}
                      placeholder="Question"
                      className="w-full bg-[#0f0f0f] border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 transition text-sm"
                    />
                    <input
                      type="text"
                      value={q.correct_answer}
                      onChange={(e) => updateQuestion(index, 'correct_answer', e.target.value)}
                      placeholder="Correct answer"
                      className="w-full bg-[#0f0f0f] border border-green-900/50 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-green-700 transition text-sm"
                    />
                    <input
                      type="text"
                      value={q.wrong_answer_1}
                      onChange={(e) => updateQuestion(index, 'wrong_answer_1', e.target.value)}
                      placeholder="Wrong answer 1"
                      className="w-full bg-[#0f0f0f] border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 transition text-sm"
                    />
                    <input
                      type="text"
                      value={q.wrong_answer_2}
                      onChange={(e) => updateQuestion(index, 'wrong_answer_2', e.target.value)}
                      placeholder="Wrong answer 2"
                      className="w-full bg-[#0f0f0f] border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 transition text-sm"
                    />
                    <input
                      type="text"
                      value={q.wrong_answer_3}
                      onChange={(e) => updateQuestion(index, 'wrong_answer_3', e.target.value)}
                      placeholder="Wrong answer 3"
                      className="w-full bg-[#0f0f0f] border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 transition text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>

            {questions.length > 0 && (
              <button
                type="button"
                onClick={addQuestion}
                className="mt-3 flex items-center gap-1.5 text-gray-500 hover:text-gray-300 text-sm transition"
              >
                <Plus className="w-4 h-4" />
                Add another question
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !bookTitle.trim() || !authorName.trim()}
            className="w-full bg-white text-black font-medium py-3 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      </div>
    </div>
  );
};
