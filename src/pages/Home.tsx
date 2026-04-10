import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../hooks/useNavigate';
import { useTheme } from '../contexts/ThemeContext';
import { Check, Sun, Moon, ChevronDown } from 'lucide-react';

interface Book {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  bounty_amount: number;
  book_tropes: { trope_id: string }[];
}

interface Trope {
  id: string;
  name: string;
}

export const Home = () => {
  const { user } = useAuth();
  const { navigateTo } = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [books, setBooks] = useState<Book[]>([]);
  const [completedBookIds, setCompletedBookIds] = useState<Set<string>>(new Set());
  const [allTropes, setAllTropes] = useState<Trope[]>([]);
  const [selectedTropes, setSelectedTropes] = useState<Set<string>>(new Set());
  const [showTropeFilter, setShowTropeFilter] = useState(false);
  const [loading, setLoading] = useState(true);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowTropeFilter(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = async () => {
    if (!user) return;

    const [booksResult, completedResult, tropesResult] = await Promise.all([
      supabase.from('books').select('*, book_tropes(trope_id)'),
      supabase
        .from('completed_books')
        .select('book_id')
        .eq('user_id', user.id),
      supabase.from('tropes').select('*').order('name'),
    ]);

    if (booksResult.data) setBooks(booksResult.data as Book[]);
    if (completedResult.data) {
      setCompletedBookIds(new Set(completedResult.data.map((cb) => cb.book_id)));
    }
    if (tropesResult.data) setAllTropes(tropesResult.data);
    setLoading(false);
  };

  const toggleTrope = (tropeId: string) => {
    setSelectedTropes((prev) => {
      const next = new Set(prev);
      if (next.has(tropeId)) {
        next.delete(tropeId);
      } else {
        next.add(tropeId);
      }
      return next;
    });
  };

  const filteredBooks =
    selectedTropes.size === 0
      ? books
      : books.filter((book) =>
          [...selectedTropes].every((tid) =>
            book.book_tropes?.some((bt) => bt.trope_id === tid)
          )
        );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigateTo('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] dark:bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-[#1B2A4A] dark:text-[#F5F0E8] font-medium">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] dark:bg-[#0f0f0f]">
      <header className="bg-[#1B2A4A] dark:bg-[#111111] border-b border-[#142038] dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="font-serif text-3xl text-[#F5F0E8]">Read to Earn</h1>
          <div className="flex gap-4 items-center">
            <button
              onClick={toggleTheme}
              className="text-[#F5F0E8]/60 hover:text-[#F5F0E8] transition"
              aria-label="Toggle dark mode"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => navigateTo('/profile')}
              className="text-[#F5F0E8]/80 hover:text-[#F5F0E8] transition"
            >
              Profile
            </button>
            <button
              onClick={() => navigateTo('/cashout')}
              className="bg-[#D4A843] hover:bg-[#bf9538] text-[#1B2A4A] text-sm font-semibold px-4 py-2 rounded-lg transition"
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
        {/* Title row with filter */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <h2 className="text-2xl font-semibold text-[#1B2A4A] dark:text-[#F5F0E8]">
              Book Library
            </h2>
            <p className="text-[#2C2C2C]/60 dark:text-gray-400 mt-1">
              Read classic literature and take quizzes to earn rewards
            </p>
          </div>

          {/* Trope filter dropdown */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setShowTropeFilter((v) => !v)}
              className="flex items-center gap-2 border border-[#e8e0d5] dark:border-gray-700 bg-white dark:bg-[#1a1a1a] text-[#2C2C2C] dark:text-[#F5F0E8] text-sm px-4 py-2 rounded-lg hover:border-[#D4A843] transition"
            >
              <span>Filter by Trope</span>
              {selectedTropes.size > 0 && (
                <span className="bg-[#D4A843] text-[#1B2A4A] text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {selectedTropes.size}
                </span>
              )}
              <ChevronDown
                className={`w-4 h-4 text-[#2C2C2C]/40 dark:text-gray-500 transition-transform ${
                  showTropeFilter ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showTropeFilter && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-[#1a1a1a] border border-[#e8e0d5] dark:border-gray-700 rounded-xl shadow-lg z-10 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-[#1B2A4A] dark:text-[#F5F0E8]">
                    Tropes
                  </span>
                  {selectedTropes.size > 0 && (
                    <button
                      onClick={() => setSelectedTropes(new Set())}
                      className="text-xs text-[#D4A843] hover:underline"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {allTropes.length === 0 ? (
                  <p className="text-xs text-[#2C2C2C]/50 dark:text-gray-500">
                    No tropes added yet.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
                    {allTropes.map((trope) => {
                      const active = selectedTropes.has(trope.id);
                      return (
                        <button
                          key={trope.id}
                          onClick={() => toggleTrope(trope.id)}
                          className={`text-xs px-3 py-1.5 rounded-full border transition ${
                            active
                              ? 'bg-[#1B2A4A] text-[#F5F0E8] border-[#1B2A4A] dark:bg-[#D4A843] dark:text-[#1B2A4A] dark:border-[#D4A843]'
                              : 'bg-white dark:bg-[#1a1a1a] text-[#2C2C2C] dark:text-[#F5F0E8] border-[#e8e0d5] dark:border-gray-700 hover:border-[#D4A843]'
                          }`}
                        >
                          {trope.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Empty state when filter returns nothing */}
        {filteredBooks.length === 0 && selectedTropes.size > 0 && (
          <div className="text-center py-16 text-[#2C2C2C]/50 dark:text-gray-500">
            No books match the selected tropes.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mt-8">
          {filteredBooks.map((book) => {
            const isCompleted = completedBookIds.has(book.id);

            return (
              <div
                key={book.id}
                onClick={() => navigateTo(`/book/${book.id}`)}
                className="bg-white dark:bg-[#1a1a1a] rounded-lg overflow-hidden border border-[#e8e0d5] dark:border-gray-800 hover:border-[#D4A843] dark:hover:border-[#D4A843] transition group cursor-pointer shadow-sm hover:shadow-md"
              >
                <div className="aspect-[2/3] relative overflow-hidden bg-[#ede8e0] dark:bg-[#2a2a2a]">
                  {book.cover_url && (
                    <img
                      src={book.cover_url}
                      alt={book.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  )}
                  <div className="absolute top-3 right-3">
                    <div className="bg-[#D4A843] text-[#1B2A4A] text-xs font-semibold px-3 py-1.5 rounded-full">
                      Earn ${book.bounty_amount.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-serif text-lg text-[#2C2C2C] dark:text-[#F5F0E8] mb-1 line-clamp-2">
                    {book.title}
                  </h3>
                  <p className="text-[#2C2C2C]/50 dark:text-gray-500 text-sm mb-4">
                    {book.author}
                  </p>

                  {isCompleted ? (
                    <div className="flex items-center justify-center gap-2 py-2.5 bg-[#D4A843]/10 border border-[#D4A843]/40 rounded-lg text-[#D4A843] text-sm font-medium">
                      <Check className="w-4 h-4" />
                      Completed
                    </div>
                  ) : (
                    <div className="w-full bg-[#1B2A4A] dark:bg-[#D4A843] dark:text-[#1B2A4A] text-[#F5F0E8] font-medium py-2.5 rounded-lg text-center text-sm hover:bg-[#142038] dark:hover:bg-[#bf9538] transition">
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
