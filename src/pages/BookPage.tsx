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
}

interface Trope {
  id: string;
  name: string;
}

interface BookTrope {
  id: string;
  trope_id: string;
  tropes: { name: string };
}

interface TropeSuggestion {
  id: string;
  suggested_name: string;
  status: string;
}

export const BookPage = () => {
  const { user } = useAuth();
  const { navigateTo } = useNavigate();
  const { isDark } = useTheme();
  const [book, setBook] = useState<Book | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  const [bookTropes, setBookTropes] = useState<BookTrope[]>([]);
  const [allTropes, setAllTropes] = useState<Trope[]>([]);
  const [selectedTropeId, setSelectedTropeId] = useState('');
  const [customTrope, setCustomTrope] = useState('');
  const [userSuggestions, setUserSuggestions] = useState<TropeSuggestion[]>([]);
  const [tropeMessage, setTropeMessage] = useState('');

  const bookId = window.location.pathname.split('/').pop();
  const isAdmin = user?.email === 'mondavis43@gmail.com';

  useEffect(() => {
    loadBook();
  }, [user]);

  useEffect(() => {
    if (book) loadTropes();
  }, [book, user]);

  const loadBook = async () => {
    if (!user || !bookId) return;

    const [bookResult, completedResult] = await Promise.all([
      supabase.from('books').select('*').eq('id', bookId).maybeSingle(),
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

  const loadTropes = async () => {
    if (!book) return;

    const [bookTropesResult, allTropesResult, suggestionsResult] = await Promise.all([
      supabase
        .from('book_tropes')
        .select('id, trope_id, tropes(name)')
        .eq('book_id', book.id),
      supabase.from('tropes').select('*').order('name'),
      user
        ? supabase
            .from('trope_suggestions')
            .select('id, suggested_name, status')
            .eq('book_id', book.id)
            .eq('user_id', user.id)
        : Promise.resolve({ data: [] }),
    ]);

    if (bookTropesResult.data) setBookTropes(bookTropesResult.data as BookTrope[]);
    if (allTropesResult.data) setAllTropes(allTropesResult.data);
    if (suggestionsResult.data) setUserSuggestions(suggestionsResult.data);
  };

  const handleAddTrope = async () => {
    if (!book || !selectedTropeId) return;
    setTropeMessage('');

    const { error } = await supabase.from('book_tropes').insert({
      book_id: book.id,
      trope_id: selectedTropeId,
      added_by: user?.id,
      added_by_role: 'admin',
    });

    if (error) {
      setTropeMessage(error.message);
    } else {
      setSelectedTropeId('');
      loadTropes();
    }
  };

  const handleRemoveTrope = async (bookTropeId: string) => {
    await supabase.from('book_tropes').delete().eq('id', bookTropeId);
    loadTropes();
  };

  const handleSuggestTrope = async () => {
    if (!book || !customTrope.trim() || !user) return;
    setTropeMessage('');

    const { error } = await supabase.from('trope_suggestions').insert({
      book_id: book.id,
      user_id: user.id,
      suggested_name: customTrope.trim(),
    });

    if (error) {
      setTropeMessage(error.message);
    } else {
      setCustomTrope('');
      setTropeMessage('Suggestion submitted for review!');
      loadTropes();
    }
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
            <div className={`w-48 rounded-lg overflow-hidden border ${isDark ? 'border-[#F5F0E8]/10' : 'border-[#1B2A4A]/10'}`}>
              {book.cover_url ? (
                <img
                  src={book.cover_url}
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={`w-full aspect-[2/3] ${isDark ? 'bg-[#F5F0E8]/5' : 'bg-[#1B2A4A]/5'}`} />
              )}
            </div>
          </div>

          {/* Details */}
          <div className="flex-1">
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

            {/* Tropes Section */}
            <div className={`mb-8 pt-6 border-t ${isDark ? 'border-[#F5F0E8]/10' : 'border-[#1B2A4A]/10'}`}>
              <h3 className={`font-medium mb-3 ${isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]'}`}>
                Tropes
              </h3>

              {/* Approved trope tag cloud */}
              {bookTropes.length > 0 ? (
                <div className="flex flex-wrap gap-2 mb-4">
                  {bookTropes.map((bt) => (
                    <div
                      key={bt.id}
                      className={`flex items-center gap-1 text-sm px-3 py-1.5 rounded-full border transition ${
                        isDark
                          ? 'bg-[#F5F0E8]/10 border-[#F5F0E8]/20 text-[#F5F0E8]'
                          : 'bg-[#1B2A4A]/10 border-[#1B2A4A]/20 text-[#1B2A4A]'
                      }`}
                    >
                      <span>{bt.tropes.name}</span>
                      {isAdmin && (
                        <button
                          onClick={() => handleRemoveTrope(bt.id)}
                          className={`ml-1 text-xs transition hover:text-red-400 ${
                            isDark ? 'text-[#F5F0E8]/30' : 'text-[#1B2A4A]/30'
                          }`}
                        >
                          x
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`text-sm mb-4 ${isDark ? 'text-[#F5F0E8]/40' : 'text-[#1B2A4A]/40'}`}>
                  No tropes added yet.
                </p>
              )}

              {/* Admin: add from master list */}
              {isAdmin && (
                <div className="flex gap-2 mb-4">
                  <select
                    value={selectedTropeId}
                    onChange={(e) => setSelectedTropeId(e.target.value)}
                    className={`flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4A843] transition ${
                      isDark
                        ? 'bg-[#F5F0E8]/5 border-[#F5F0E8]/15 text-[#F5F0E8]'
                        : 'bg-white border-[#1B2A4A]/15 text-[#1B2A4A]'
                    }`}
                  >
                    <option value="">Select a trope to add...</option>
                    {allTropes
                      .filter((t) => !bookTropes.some((bt) => bt.trope_id === t.id))
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={handleAddTrope}
                    disabled={!selectedTropeId}
                    className="bg-[#1B2A4A] text-[#F5F0E8] text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#142038] transition disabled:opacity-40"
                  >
                    Add
                  </button>
                </div>
              )}

              {/* All users: suggest a custom trope */}
              {user && (
                <div>
                  <p className={`text-xs mb-2 ${isDark ? 'text-[#F5F0E8]/40' : 'text-[#1B2A4A]/40'}`}>
                    {isAdmin ? 'Or add a new trope to the master list:' : 'Don\'t see the right trope? Suggest one for review:'}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customTrope}
                      onChange={(e) => setCustomTrope(e.target.value)}
                      placeholder="e.g. Morally Grey Protagonist"
                      className={`flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4A843] transition ${
                        isDark
                          ? 'bg-[#F5F0E8]/5 border-[#F5F0E8]/15 text-[#F5F0E8] placeholder-[#F5F0E8]/30'
                          : 'bg-white border-[#1B2A4A]/15 text-[#1B2A4A] placeholder-[#1B2A4A]/30'
                      }`}
                    />
                    <button
                      onClick={handleSuggestTrope}
                      disabled={!customTrope.trim()}
                      className="bg-[#D4A843] text-[#1B2A4A] text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#bf9538] transition disabled:opacity-40"
                    >
                      {isAdmin ? 'Add New' : 'Suggest'}
                    </button>
                  </div>

                  {/* User pending suggestions */}
                  {!isAdmin && userSuggestions.filter((s) => s.status === 'pending').length > 0 && (
                    <div className="mt-3">
                      <p className={`text-xs mb-1 ${isDark ? 'text-[#F5F0E8]/40' : 'text-[#1B2A4A]/40'}`}>
                        Your pending suggestions:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {userSuggestions
                          .filter((s) => s.status === 'pending')
                          .map((s) => (
                            <span
                              key={s.id}
                              className="text-xs bg-[#D4A843]/10 border border-[#D4A843]/30 text-[#D4A843] px-3 py-1 rounded-full"
                            >
                              {s.suggested_name} (pending)
                            </span>
                          ))}
                      </div>
                    </div>
                  )}

                  {tropeMessage && (
                    <p className="text-sm text-[#D4A843] mt-2">{tropeMessage}</p>
                  )}
                </div>
              )}
            </div>

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
