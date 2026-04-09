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
      <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center">
        <div className="text-[#800020] font-medium">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      <header className="bg-[#800020] border-b border-[#6a001a]">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="font-serif text-3xl text-[#F5F0E8]">Read to Earn</h1>
          <div className="flex gap-4">
            <button
              onClick={() => navigateTo('/profile')}
              className="text-[#F5F0E8]/80 hover:text-[#F5F0E8] transition"
            >
              Profile
            </button>
            <button
              onClick={() => navigateTo('/cashout')}
              className="bg-[#C9A84C] hover:bg-[#b8963e] text-[#800020] text-sm font-semibold px-4 py-2 rounded-lg transition"
            >
              Cash Out
            </button>
            <button
              onClick={handleLogout}
              className="text-[#F5F0E8]/60 hover:text-[#F5F0E8]/80 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-semibold text-[#800020] mb-2">Book Library</h2>
        <p className="text-[#2C2C2C]/60 mb-8">
          Read classic literature and take quizzes to earn rewards
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {books.map((book) => {
            const isCompleted = completedBookIds.has(book.id);

            return (
              <div
                key={book.id}
                onClick={() => navigateTo(`/book/${book.id}`)}
                className="bg-white rounded-lg overflow-hidden border border-[#e8e0d5] hover:border-[#C9A84C] transition group cursor-pointer shadow-sm hover:shadow-md"
              >
                <div className="aspect-[2/3] relative overflow-hidden bg-[#ede8e0]">
                  {book.cover_url && (
                    <img
                      src={book.cover_url}
                      alt={book.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  )}
                  <div className="absolute top-3 right-3">
                    <div className="bg-[#C9A84C] text-[#800020] text-xs font-semibold px-3 py-1.5 rounded-full">
                      Earn ${book.bounty_amount.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-serif text-lg text-[#2C2C2C] mb-1 line-clamp-2">
                    {book.title}
                  </h3>
                  <p className="text-[#2C2C2C]/50 text-sm mb-4">{book.author}</p>

                  {isCompleted ? (
                    <div className="flex items-center justify-center gap-2 py-2.5 bg-[#C9A84C]/10 border border-[#C9A84C]/40 rounded-lg text-[#C9A84C] text-sm font-medium">
                      <Check className="w-4 h-4" />
                      Completed
                    </div>
                  ) : (
                    <div className="w-full bg-[#800020] text-[#F5F0E8] font-medium py-2.5 rounded-lg text-center text-sm hover:bg-[#6a001a] transition">
                      View Book
                    </div>
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
