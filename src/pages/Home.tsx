import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../hooks/useNavigate';
import { useTheme } from '../contexts/ThemeContext';
import { Check, Sun, Moon, ChevronDown, Search, X } from 'lucide-react';
import { GENRES } from './Admin';

interface Book {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  bounty_amount: number;
  page_count: number;
  book_type: 'platform' | 'sponsored';
  genres: string[];
  book_tropes: { trope_id: string }[];
}

interface Trope {
  id: string;
  name: string;
}

type SortOption =
  | 'newest'
  | 'title_asc'
  | 'author_asc'
  | 'payout_desc'
  | 'pages_asc'
  | 'pages_desc';

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Newest',
  title_asc: 'Title (A–Z)',
  author_asc: 'Author (A–Z)',
  payout_desc: 'Highest Payout',
  pages_asc: 'Shortest',
  pages_desc: 'Longest',
};

export const Home = () => {
  const { user } = useAuth();
  const { navigateTo } = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const [books, setBooks] = useState<Book[]>([]);
  const [completedBookIds, setCompletedBookIds] = useState<Set<string>>(new Set());
  const [allTropes, setAllTropes] = useState<Trope[]>([]);
  const [loading, setLoading] = useState(true);
  const [booksLoading, setBooksLoading] = useState(false);

  // Filters & sort
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());
  const [selectedTropes, setSelectedTropes] = useState<Set<string>>(new Set());

  // Dropdowns
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showTropeFilter, setShowTropeFilter] = useState(false);
  const [showGenreFilter, setShowGenreFilter] = useState(false);

  const sortRef = useRef<HTMLDivElement>(null);
  const tropeRef = useRef<HTMLDivElement>(null);
  const genreRef = useRef<HTMLDivElement>(null);

  // Debounce search
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;
    loadStaticData();
  }, [user]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setShowSortMenu(false);
      if (tropeRef.current && !tropeRef.current.contains(e.target as Node)) setShowTropeFilter(false);
      if (genreRef.current && !genreRef.current.contains(e.target as Node)) setShowGenreFilter(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const loadStaticData = async () => {
    const [completedResult, tropesResult] = await Promise.all([
      supabase.from('completed_books').select('book_id').eq('user_id', user!.id),
      supabase.from('tropes').select('*').order('name'),
    ]);
    if (completedResult.data) {
      setCompletedBookIds(new Set(completedResult.data.map((cb) => cb.book_id)));
    }
    if (tropesResult.data) setAllTropes(tropesResult.data);
    await loadBooks('', 'newest', new Set(), new Set());
    setLoading(false);
  };

  const loadBooks = useCallback(
    async (
      searchVal: string,
      sort: SortOption,
      genres: Set<string>,
      tropes: Set<string>
    ) => {
      setBooksLoading(true);

      let query = supabase
        .from('books')
        .select('id, title, author, cover_url, bounty_amount, page_count, book_type, genres, book_tropes(trope_id)');

      // Search
      if (searchVal.trim()) {
        query = query.or(
          `title.ilike.%${searchVal.trim()}%,author.ilike.%${searchVal.trim()}%`
        );
      }

      // Genre filter (book must contain ALL selected genres)
      if (genres.size > 0) {
        query = query.contains('genres', [...genres]);
      }

      // Sort
      switch (sort) {
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'title_asc':
          query = query.order('title', { ascending: true });
          break;
        case 'author_asc':
          query = query.order('author', { ascending: true });
          break;
        case 'payout_desc':
          query = query.order('bounty_amount', { ascending: false });
          break;
        case 'pages_asc':
          query = query.order('page_count', { ascending: true });
          break;
        case 'pages_desc':
          query = query.order('page_count', { ascending: false });
          break;
      }

      const { data } = await query;
      let results = (data as Book[]) ?? [];

      // Trope filter is client-side (join table, can't do server-side easily)
      if (tropes.size > 0) {
        results = results.filter((book) =>
          [...tropes].every((tid) =>
            book.book_tropes?.some((bt) => bt.trope_id === tid)
          )
        );
      }

      setBooks(results);
      setBooksLoading(false);
    },
    []
  );

  // Re-query when sort or genres change
  useEffect(() => {
    if (loading) return;
    loadBooks(search, sortBy, selectedGenres, selectedTropes);
  }, [sortBy, selectedGenres, selectedTropes]);

  // Debounced search
  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      loadBooks(val, sortBy, selectedGenres, selectedTropes);
    }, 300);
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) => {
      const next = new Set(prev);
      next.has(genre) ? next.delete(genre) : next.add(genre);
      return next;
    });
  };

  const toggleTrope = (tropeId: string) => {
    setSelectedTropes((prev) => {
      const next = new Set(prev);
      next.has(tropeId) ? next.delete(tropeId) : next.add(tropeId);
      return next;
    });
  };

  const clearAllFilters = () => {
    setSearch('');
    setSortBy('newest');
    setSelectedGenres(new Set());
    setSelectedTropes(new Set());
    loadBooks('', 'newest', new Set(), new Set());
  };

  const hasActiveFilters =
    search.trim() !== '' ||
    sortBy !== 'newest' ||
    selectedGenres.size > 0 ||
    selectedTropes.size > 0;

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

  const activeFilterCount = selectedGenres.size + selectedTropes.size;

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

      <main className="max-w-7xl mx-auto px-4 py-10">
        {/* Title */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-[#1B2A4A] dark:text-[#F5F0E8]">
            Book Library
          </h2>
          <p className="text-[#2C2C2C]/60 dark:text-gray-400 mt-1">
            Read, Quiz, Earn.
          </p>
        </div>

        {/* Search + Sort + Filter row */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2C2C2C]/30 dark:text-gray-600 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by title or author..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 bg-white dark:bg-[#1a1a1a] border border-[#e8e0d5] dark:border-gray-700 rounded-lg text-[#2C2C2C] dark:text-[#F5F0E8] placeholder-[#2C2C2C]/30 dark:placeholder-gray-600 focus:outline-none focus:border-[#1B2A4A] dark:focus:border-[#D4A843] transition text-sm"
            />
            {search && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2C2C2C]/30 dark:text-gray-600 hover:text-[#2C2C2C] dark:hover:text-[#F5F0E8] transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort dropdown */}
          <div className="relative" ref={sortRef}>
            <button
              onClick={() => setShowSortMenu((v) => !v)}
              className="flex items-center gap-2 border border-[#e8e0d5] dark:border-gray-700 bg-white dark:bg-[#1a1a1a] text-[#2C2C2C] dark:text-[#F5F0E8] text-sm px-4 py-2.5 rounded-lg hover:border-[#1B2A4A] dark:hover:border-[#D4A843] transition whitespace-nowrap"
            >
              <span>{SORT_LABELS[sortBy]}</span>
              <ChevronDown
                className={`w-4 h-4 text-[#2C2C2C]/40 dark:text-gray-500 transition-transform ${
                  showSortMenu ? 'rotate-180' : ''
                }`}
              />
            </button>
            {showSortMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#1a1a1a] border border-[#e8e0d5] dark:border-gray-700 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSortBy(key);
                      setShowSortMenu(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition ${
                      sortBy === key
                        ? 'bg-[#1B2A4A]/5 dark:bg-[#D4A843]/10 text-[#1B2A4A] dark:text-[#D4A843] font-medium'
                        : 'text-[#2C2C2C] dark:text-[#F5F0E8] hover:bg-[#F5F0E8] dark:hover:bg-[#2a2a2a]'
                    }`}
                  >
                    {SORT_LABELS[key]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Genre filter dropdown */}
          <div className="relative" ref={genreRef}>
            <button
              onClick={() => setShowGenreFilter((v) => !v)}
              className="flex items-center gap-2 border border-[#e8e0d5] dark:border-gray-700 bg-white dark:bg-[#1a1a1a] text-[#2C2C2C] dark:text-[#F5F0E8] text-sm px-4 py-2.5 rounded-lg hover:border-[#1B2A4A] dark:hover:border-[#D4A843] transition whitespace-nowrap"
            >
              <span>Genre</span>
              {selectedGenres.size > 0 && (
                <span className="bg-[#D4A843] text-[#1B2A4A] text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {selectedGenres.size}
                </span>
              )}
              <ChevronDown
                className={`w-4 h-4 text-[#2C2C2C]/40 dark:text-gray-500 transition-transform ${
                  showGenreFilter ? 'rotate-180' : ''
                }`}
              />
            </button>
            {showGenreFilter && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-[#1a1a1a] border border-[#e8e0d5] dark:border-gray-700 rounded-xl shadow-lg z-20 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-[#1B2A4A] dark:text-[#F5F0E8]">
                    Genres
                  </span>
                  {selectedGenres.size > 0 && (
                    <button
                      onClick={() => setSelectedGenres(new Set())}
                      className="text-xs text-[#D4A843] hover:underline"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
                  {GENRES.map((genre) => {
                    const active = selectedGenres.has(genre);
                    return (
                      <button
                        key={genre}
                        onClick={() => toggleGenre(genre)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition ${
                          active
                            ? 'bg-[#1B2A4A] text-[#F5F0E8] border-[#1B2A4A] dark:bg-[#D4A843] dark:text-[#1B2A4A] dark:border-[#D4A843]'
                            : 'bg-white dark:bg-[#1a1a1a] text-[#2C2C2C] dark:text-[#F5F0E8] border-[#e8e0d5] dark:border-gray-700 hover:border-[#D4A843]'
                        }`}
                      >
                        {genre}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Trope filter dropdown */}
          <div className="relative" ref={tropeRef}>
            <button
              onClick={() => setShowTropeFilter((v) => !v)}
              className="flex items-center gap-2 border border-[#e8e0d5] dark:border-gray-700 bg-white dark:bg-[#1a1a1a] text-[#2C2C2C] dark:text-[#F5F0E8] text-sm px-4 py-2.5 rounded-lg hover:border-[#1B2A4A] dark:hover:border-[#D4A843] transition whitespace-nowrap"
            >
              <span>Trope</span>
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
              <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-[#1a1a1a] border border-[#e8e0d5] dark:border-gray-700 rounded-xl shadow-lg z-20 p-4">
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

        {/* Active filter chips */}
        {(selectedGenres.size > 0 || selectedTropes.size > 0) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {[...selectedGenres].map((genre) => (
              <button
                key={genre}
                onClick={() => toggleGenre(genre)}
                className="flex items-center gap-1.5 bg-[#1B2A4A] dark:bg-[#D4A843] text-[#F5F0E8] dark:text-[#1B2A4A] text-xs font-medium px-3 py-1.5 rounded-full transition hover:opacity-80"
              >
                {genre}
                <X className="w-3 h-3" />
              </button>
            ))}
            {[...selectedTropes].map((tid) => {
              const trope = allTropes.find((t) => t.id === tid);
              if (!trope) return null;
              return (
                <button
                  key={tid}
                  onClick={() => toggleTrope(tid)}
                  className="flex items-center gap-1.5 bg-[#1B2A4A]/70 dark:bg-[#D4A843]/70 text-[#F5F0E8] dark:text-[#1B2A4A] text-xs font-medium px-3 py-1.5 rounded-full transition hover:opacity-80"
                >
                  {trope.name}
                  <X className="w-3 h-3" />
                </button>
              );
            })}
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-[#2C2C2C]/50 dark:text-gray-500 hover:text-[#2C2C2C] dark:hover:text-[#F5F0E8] underline transition px-1"
              >
                Clear all
              </button>
            )}
          </div>
        )}

        {/* Results count + loading state */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-[#2C2C2C]/50 dark:text-gray-500">
            {booksLoading ? 'Searching...' : `${books.length} book${books.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Empty state */}
        {!booksLoading && books.length === 0 && (
          <div className="text-center py-20">
            <p className="text-[#2C2C2C]/50 dark:text-gray-500 text-base">
              No books match your filters.
            </p>
            <button
              onClick={clearAllFilters}
              className="mt-3 text-sm text-[#D4A843] hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Book grid */}
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 transition-opacity duration-150 ${
            booksLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'
          }`}
        >
          {books.map((book) => {
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
                      {book.book_type === 'sponsored'
                        ? `Earn $${book.bounty_amount.toFixed(2)}`
                        : 'Earn $0.50–$0.95'}
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-serif text-lg text-[#2C2C2C] dark:text-[#F5F0E8] mb-1 line-clamp-2">
                    {book.title}
                  </h3>
                  <p className="text-[#2C2C2C]/50 dark:text-gray-500 text-sm mb-3">
                    {book.author}
                  </p>
                  {book.genres && book.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {book.genres.slice(0, 2).map((g) => (
                        <span
                          key={g}
                          className="text-xs px-2 py-0.5 rounded-full bg-[#1B2A4A]/5 dark:bg-white/5 text-[#1B2A4A]/60 dark:text-[#F5F0E8]/50"
                        >
                          {g}
                        </span>
                      ))}
                      {book.genres.length > 2 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#1B2A4A]/5 dark:bg-white/5 text-[#1B2A4A]/60 dark:text-[#F5F0E8]/50">
                          +{book.genres.length - 2}
                        </span>
                      )}
                    </div>
                  )}
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
