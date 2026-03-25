import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../hooks/useNavigate';
import { ArrowLeft, Check, ExternalLink } from 'lucide-react';

interface Book {
  id: number;
  title: string;
  author: string;
  cover_url: string | null;
  bounty_amount: number;
  page_count: number;
  description: string | null;
  geniuslink_url: string | null;
}

export const BookPage = () => {
  const { user } = useAuth();
  const { navigateTo } = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  // get book id from URL
  const bookId = window.location.pathname.split('/').pop();

  useEffect(() => {
    loadBook();
  }, [user]);

  const loadBook = async () => {
    if (!user || !bookId) return;

    const [bookResult, completedResult] = await Promise.all([
      supabase.from('books').select('*').eq('id', bookId).single(),
      supabase
        .from('completed_books')
        .select('id')
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .single(),
    ]);

    if (bookResult.data) setBook(bookResult.data);
    setIsCompleted(!!completedResult.data);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <p className="text-red-400">Book not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <header className="border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center gap-4">
          <button
            onClick={() => navigateTo('/')}
            className="text-gray-400 hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-serif text-3xl text-white">Book Details</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row gap-10">
          {/* Cover */}
          <div className="flex-shrink-0">
            <div className="w-48 rounded-lg overflow-hidden border border-gray-800">
              {book.cover_url ? (
                <img
                  src={book.cover_url}
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full aspect-[2/3] bg-gray-900" />
              )}
            </div>
          </div>

          {/* Details */}
          <div className="flex-1">
            <h2 className="font-serif text-4xl text-white mb-2">{book.title}</h2>
            <p className="text-gray-400 text-lg mb-1">{book.author}</p>
            <p className="text-gray-500 text-sm mb-6">{book.page_count} pages</p>

            {/* Bounty */}
            <div className="inline-flex items-center gap-2 bg-green-900/20 border border-green-900/50 rounded-lg px-4 py-3 mb-6">
              <span className="text-green-400 text-lg font-semibold">
                Earn ${book.bounty_amount.toFixed(2)}
              </span>
              <span className="text-gray-500 text-sm">
                ({book.page_count} pages × $0.0085)
              </span>
            </div>

            {/* Description */}
            {book.description && (
              <div className="mb-8">
                <h3 className="text-white font-medium mb-2">About this book</h3>
                <p className="text-gray-400 leading-relaxed">{book.description}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Buy link */}
              {book.geniuslink_url && !isCompleted && (
                <a
                  href={book.geniuslink_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-[#1a1a1a] border border-gray-700 hover:border-gray-500 text-white rounded-lg transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  Buy This Book
                </a>
              )}

              {/* Quiz button */}
              {isCompleted ? (
                <div className="flex items-center justify-center gap-2 px-6 py-3 bg-green-900/20 border border-green-900/50 rounded-lg text-green-400 font-medium">
                  <Check className="w-4 h-4" />
                  Completed
                </div>
              ) : (
                <button
                  onClick={() => navigateTo(`/quiz/${book.id}`)}
                  className="px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-gray-200 transition"
                >
                  Take the Quiz
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
