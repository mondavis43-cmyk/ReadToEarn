import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../hooks/useNavigate';
import { useTheme } from '../contexts/ThemeContext';
import { ArrowLeft, Check, ExternalLink } from 'lucide-react';

interface Book {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  bounty_amount: number;
  page_count: number;
  description: string | null;
  geniuslink_url: string | null;
  book_type: 'platform' | 'sponsored';
}

export const BookPage = () => {
  const { user } = useAuth();
  const { navigateTo } = useNavigate();
  const { isDark } = useTheme();
  const [book, setBook] = useState<Book | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  const bookId = window.location.pathname.split('/').pop();

  useEffect(() => {
    loadBook();
  }, [user]);

  const loadBook = async () => {
    if (!user || !bookId) return;

    const [bookResult, completedResult] = await Promise.all([
      supabase
        .from('books')
        .select('id, title, author, cover_url, bounty_amount, page_count, description, geniuslink_url, book_type')
        .eq('id', bookId)
        .maybeSingle(),
      supabase
        .from('completed_books')
        .select('id')
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .maybeSingle(),
    ]);

    if (bookResult.data) setBook(bookResult.data);
    setIsCompleted(!!completedResult.data);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#1B2A4A]' : 'bg-[#F5F0E8]'}`}>
        <div className={isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]'}>Loading...</div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#1B2A4A]' : 'bg-[#F5F0E8]'}`}>
        <p className="text-red-400">Book not found.</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#1B2A4A]' : 'bg-[#F5F0E8]'}`}>
      {/* Header */}
      <header className={`border-b ${isDark ? 'border-[#F5F0E8]/10' : 'border-[#1B2A4A]/10'}`}>
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center gap-4">
          <button
            onClick={() => navigateTo('/')}
            className={`transition ${isDark ? 'text-[#F5F0E8]/50 hover:text-[#F5F0E8]' : 'text-[#1B2A4A]/50 hover:text-[#1B2A4A]'}`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className={`font-serif text-3xl ${isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]'}`}>
            Book Details
          </h1>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row gap-10">

          {/* Cover */}
          <div className="flex-shrink-0">
            <div className={`w-48 rounded-lg overflow-hidden border relative ${isDark ? 'border-[#F5F0E8]/10' : 'border-[#1B2A4A]/10'}`}>
              {book.cover_url ? (
                <img
                  src={book.cover_url}
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={`w-full aspect-[2/3] ${isDark ? 'bg-[#F5F0E8]/5' : 'bg-[#1B2A4A]/5'}`} />
              )}

              {/* Book type badge - top left over cover */}
              <div className="absolute top-2 left-2">
                {book.book_type === 'sponsored' ? (
                  <span className="bg-[#1B2A4A] text-[#D4A843] text-[0.6rem] font-bold tracking-wider px-2 py-1 rounded uppercase">
                    Sponsored
                  </span>
                ) : (
                  <span className="bg-[#F5F0E8] text-[#1B2A4A] text-[0.6rem] font-bold tracking-wider px-2 py-1 rounded uppercase">
                    Platform
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="flex-1">

            {/* Book type badge - inline above title (secondary placement) */}
            <div className="mb-3">
              {book.book_type === 'sponsored' ? (
                <span className="bg-[#1B2A4A] text-[#D4A843] text-[0.65rem] font-bold tracking-wider px-2.5 py-1 rounded uppercase">
                  Sponsored
                </span>
              ) : (
                <span className="bg-[#F5F0E8] text-[#1B2A4A] text-[0.65rem] font-bold tracking-wider px-2.5 py-1 rounded uppercase border border-[#1B2A4A]/15">
                  Platform
                </span>
              )}
            </div>

            <h2 className={`font-serif text-4xl mb-2 ${isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]'}`}>
              {book.title}
            </h2>
            <p className={`text-lg mb-1 ${isDark ? 'text-[#F5F0E8]/60' : 'text-[#1B2A4A]/60'}`}>
              {book.author}
            </p>
            <p className={`text-sm mb-6 ${isDark ? 'text-[#F5F0E8]/40' : 'text-[#1B2A4A]/40'}`}>
              {book.page_count} pages
            </p>

            {/* Bounty */}
            <div className={`inline-flex items-center gap-2 rounded-lg px-4 py-3 mb-6 border ${
              isDark
                ? 'bg-[#D4A843]/10 border-[#D4A843]/30'
                : 'bg-[#D4A843]/15 border-[#D4A843]/40'
            }`}>
              <span className="text-[#D4A843] text-lg font-semibold">
                Earn ${book.bounty_amount.toFixed(2)}
              </span>
              <span className={`text-sm ${isDark ? 'text-[#F5F0E8]/40' : 'text-[#1B2A4A]/40'}`}>
                ({book.page_count} pages x $0.0085)
              </span>
            </div>

            {/* Description */}
            {book.description && (
              <div className="mb-8">
                <h3 className={`font-medium mb-2 ${isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]'}`}>
                  About this book
                </h3>
                <p className={`leading-relaxed ${isDark ? 'text-[#F5F0E8]/60' : 'text-[#1B2A4A]/60'}`}>
                  {book.description}
                </p>
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
                  className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg border transition ${
                    isDark
                      ? 'bg-[#F5F0E8]/5 border-[#F5F0E8]/15 hover:border-[#F5F0E8]/30 text-[#F5F0E8]'
                      : 'bg-[#1B2A4A]/5 border-[#1B2A4A]/15 hover:border-[#1B2A4A]/30 text-[#1B2A4A]'
                  }`}
                >
                  <ExternalLink className="w-4 h-4" />
                  Buy This Book
                </a>
              )}

              {/* Quiz button or completed state */}
              {isCompleted ? (
                <div className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg border ${
                  isDark
                    ? 'bg-[#D4A843]/10 border-[#D4A843]/30 text-[#D4A843]'
                    : 'bg-[#D4A843]/15 border-[#D4A843]/40 text-[#D4A843]'
                }`}>
                  <Check className="w-4 h-4" />
                  Completed
                </div>
              ) : (
                <button
                  onClick={() => navigateTo(`/quiz/${book.id}`)}
                  className="px-6 py-3 bg-[#D4A843] text-[#1B2A4A] font-semibold rounded-lg hover:bg-[#D4A843]/90 transition"
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
