import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../hooks/useNavigate';
import { Check } from 'lucide-react';

interface Book {
  id: number;
  title: string;
  author: string;
  cover_url: string | null;
  bounty_amount: number;
}

export const Home = () => {
  const { user } = useAuth();
  const { navigateTo } = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [completedBookIds, setCompletedBookIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    const [booksResult, completedResult] = await Promise.all([
      supabase.from('books').select('*'),
      supabase.from('completed_books').select('book_id').eq('user_id', user.id),
    ]);

    if (booksResult.data) {
      setBooks(booksResult.data);
    }

    if (completedResult.data) {
      setCompletedBookIds(new Set(completedResult.data.map((cb) => cb.book_id)));
    }

    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigateTo('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="font-serif text-3xl text-white">Read to Earn</h1>
          <div className="flex gap-4">
            <button
              onClick={() => navigateTo('/profile')}
              className="text-gray-300 hover:text-white transition"
            >
              Profile
            </button>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-gray-300 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-semibold text-white mb-2">Book Library</h2>
        <p className="text-gray-400 mb-8">
          Read classic literature and take quizzes to earn rewards
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {books.map((book) => {
            const isCompleted = completedBookIds.has(book.id);

            return (
              <div
                key={book.id}
                className="bg-[#1a1a1a] rounded-lg overflow-hidden border border-gray-800 hover:border-gray-700 transition group"
              >
                <div className="aspect-[2/3] relative overflow-hidden bg-gray-900">
                  {book.cover_image_url && (
                    <img
                      src={book.cover_image_url}
                      alt={book.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  )}
                  <div className="absolute top-3 right-3">
                    <div className="bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                      Earn ${book.bounty_amount.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-serif text-lg text-white mb-1 line-clamp-2">
                    {book.title}
                  </h3>
                  <p className="text-gray-400 text-sm mb-4">{book.author}</p>

                  {isCompleted ? (
                    <div className="flex items-center justify-center gap-2 py-2.5 bg-green-900/20 border border-green-900/50 rounded-lg text-green-400 text-sm font-medium">
                      <Check className="w-4 h-4" />
                      Completed
                    </div>
                  ) : (
                    <button
                      onClick={() => navigateTo(`/quiz/${book.id}`)}
                      className="w-full bg-white text-black font-medium py-2.5 rounded-lg hover:bg-gray-200 transition"
                    >
                      Take Quiz
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};
