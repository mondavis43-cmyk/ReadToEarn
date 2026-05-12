import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../hooks/useNavigate';
import { useTheme } from '../contexts/ThemeContext';
import { Check, Sun, Moon, ChevronDown, Search, X, Lock } from 'lucide-react';
import { GENRES } from './Admin';

interface Book {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  page_count: number;
  book_type: string;
  genres: string[];
  book_tropes: { trope_id: string }[];
}

interface ActiveBounty {
  book_id: string;
  per_pass_amount: number;
}

interface ActiveCompetition {
  book_ids: string[];
}

interface Trope {
  id: string;
  name: string;
}

type SortOption =
  | 'newest'
  | 'title_asc'
  | 'author_asc'
  | 'pages_asc'
  | 'pages_desc';

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Newest',
  title_asc: 'Title (A–Z)',
  author_asc: 'Author (A–Z)',
  pages_asc: 'Shortest',
  pages_desc: 'Longest',
};

export const Library = () => {
  const { user } = useAuth();
  const { navigateTo } = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const [books, setBooks] = useState<Book[]>([]);
  const [activeBounties, setActiveBounties] = useState<ActiveBounty[]>([]);
  const [activeCompetitionBookIds, setActiveCompetitionBookIds] = useState<Set<string>>(new Set());
  const [completedBookIds, setCompletedBookIds] = useState<Set<string>>(new Set());
  const [allTropes, setAllTropes] = useState<Trope[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & sort
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
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
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setShowSortMenu(false);
      if (tropeRef.current && !tropeRef.current.contains(e.target as Node)) setShowTropeFilter(false);
      if (genreRef.current && !genreRef.current.contains(e.target as Node)) setShowGenreFilter(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);

    const queries: Promise<any>[] = [
      supabase
        .from('books')
        .select('id, title, author, cover_url, page_count, book_type, genres, book_tropes(trope_id)')
        .eq('is_listed', true)
        .neq('book_type', 'bulletin_board')
        .order('created_at', { ascending: false }),
      supabase
        .from('bounties')
        .select('book_id, per_pass_amount')
        .eq('status', 'active'),
      supabase
        .from('competitions')
        .select('book_ids')
        .eq('status', 'active'),
      supabase.from('tropes').select('*').order('name'),
      user
        ? supabase.from('quiz_attempts').select('book_id').eq('user_id', user.id)
        : Promise.resolve({ data: [] }),
    ];

    const [
      { data: booksData },
      { data: bountiesData },
      { data: compsData },
      { data: tropesData },
      { data: attemptsData },
    ] = await Promise.all(queries);

    setBooks(booksData || []);
    setActiveBounties(bountiesData || []);
    setAllTropes(tropesData || []);
    setCompletedBookIds(new Set((attemptsData ?? []).map((a: { book_id: string }) => a.book_id)));

    // Flatten competition book_ids into a set
    const compBookIds = new Set<string>();
    (compsData || []).forEach((c: ActiveCompetition) => {
      (c.book_ids || []).forEach((id: string) => compBookIds.add(id));
    });
    setActiveCompetitionBookIds(compBookIds);

    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // Helpers
  const getActiveBounty = (bookId: string) =>
    activeBounties.find((b) => b.book_id === bookId);

  const isQuizUnlocked = (bookId: string) =>
    !!getActiveBounty(bookId) || activeCompetitionBookIds.has(bookId);

  // Filter + sort
  const filtered = books
    .filter((book) => {
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        if (!book.title.toLowerCase().includes(q) && !book.author.toLowerCase().includes(q)) return false;
      }
      if (selectedGenres.size > 0 && !book.genres?.some((g) => selectedGenres.has(g))) return false;
      if (selectedTropes.size > 0) {
        const bookTropeIds = new Set(book.book_tropes?.map((t) => t.trope_id));
        if (![...selectedTropes].every((id) => bookTropeIds.has(id))) return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'title_asc': return a.title.localeCompare(b.title);
        case 'author_asc': return a.author.localeCompare(b.author);
        case 'pages_asc': return a.page_count - b.page_count;
        case 'pages_desc': return b.page_count - a.page_count;
        default: return 0;
      }
    });

  const hasActiveFilters =
    debouncedSearch || selectedGenres.size > 0 || selectedTropes.size > 0 || sortBy !== 'newest';

  const clearFilters = () => {
    setSearch('');
    setSortBy('newest');
    setSelectedGenres(new Set());
    setSelectedTropes(new Set());
  };

  const toggleGenre = (g: string) =>
    setSelectedGenres((prev) => {
      const next = new Set(prev);
      next.has(g) ? next.delete(g) : next.add(g);
      return next;
    });

  const toggleTrope = (id: string) =>
    setSelectedTropes((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="min-h-screen bg-[#F5F0E8] dark:bg-[#1B2A4A]">

      {/* ── Main ── */}
      <main className="max-w-7xl mx-auto px-4 py-8">

        {/* Title */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#1B2A4A] dark:text-[#F5F0E8]">Book Library</h2>
          <p className="text-sm text-[#6B7280] dark:text-gray-400 mt-1">
            Browse books, take quizzes, and earn from active bounties and competitions.
          </p>
        </div>

        {/* ── Search + Filters ── */}
        <div className="flex flex-wrap gap-2 mb-6">

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
            <input
              type="text"
              placeholder="Search by title or author..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-[#e8e0d5] dark:border-gray-600 bg-white dark:bg-gray-800 text-[#1B2A4A] dark:text-[#F5F0E8] placeholder-[#6B7280] focus:outline-none focus:border-[#D4A843]"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#1B2A4A] dark:hover:text-[#F5F0E8]">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="relative" ref={sortRef}>
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-[#e8e0d5] dark:border-gray-600 bg-white dark:bg-gray-800 text-[#1B2A4A] dark:text-[#F5F0E8] hover:border-[#D4A843] transition"
            >
              {SORT_LABELS[sortBy]} <ChevronDown size={14} />
            </button>
            {showSortMenu && (
              <div className="absolute top-full mt-1 right-0 z-20 bg-white dark:bg-gray-800 border border-[#e8e0d5] dark:border-gray-700 rounded-xl shadow-lg overflow-hidden min-w-[160px]">
                {(Object.keys(SORT_LABELS) as SortOption[]).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { setSortBy(opt); setShowSortMenu(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition ${
                      sortBy === opt
                        ? 'bg-[#D4A843]/10 text-[#D4A843] font-medium'
                        : 'text-[#1B2A4A] dark:text-[#F5F0E8] hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {SORT_LABELS[opt]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Genre filter */}
          <div className="relative" ref={genreRef}>
            <button
              onClick={() => setShowGenreFilter(!showGenreFilter)}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition ${
                selectedGenres.size > 0
                  ? 'border-[#D4A843] bg-[#D4A843]/10 text-[#D4A843]'
                  : 'border-[#e8e0d5] dark:border-gray-600 bg-white dark:bg-gray-800 text-[#1B2A4A] dark:text-[#F5F0E8] hover:border-[#D4A843]'
              }`}
            >
              Genres {selectedGenres.size > 0 && `(${selectedGenres.size})`} <ChevronDown size={14} />
            </button>
            {showGenreFilter && (
              <div className="absolute top-full mt-1 right-0 z-20 bg-white dark:bg-gray-800 border border-[#e8e0d5] dark:border-gray-700 rounded-xl shadow-lg p-3 min-w-[200px] max-h-64 overflow-y-auto">
                {GENRES.map((g) => (
                  <label key={g} className="flex items-center gap-2 px-1 py-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                    <input
                      type="checkbox"
                      checked={selectedGenres.has(g)}
                      onChange={() => toggleGenre(g)}
                      className="accent-[#D4A843]"
                    />
                    <span className="text-sm text-[#1B2A4A] dark:text-[#F5F0E8]">{g}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Trope filter */}
          <div className="relative" ref={tropeRef}>
            <button
              onClick={() => setShowTropeFilter(!showTropeFilter)}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition ${
                selectedTropes.size > 0
                  ? 'border-[#D4A843] bg-[#D4A843]/10 text-[#D4A843]'
                  : 'border-[#e8e0d5] dark:border-gray-600 bg-white dark:bg-gray-800 text-[#1B2A4A] dark:text-[#F5F0E8] hover:border-[#D4A843]'
              }`}
            >
              Tropes {selectedTropes.size > 0 && `(${selectedTropes.size})`} <ChevronDown size={14} />
            </button>
            {showTropeFilter && (
              <div className="absolute top-full mt-1 right-0 z-20 bg-white dark:bg-gray-800 border border-[#e8e0d5] dark:border-gray-700 rounded-xl shadow-lg p-3 min-w-[220px] max-h-64 overflow-y-auto">
                {allTropes.length === 0 && (
                  <p className="text-xs text-[#6B7280] px-1">No tropes yet.</p>
                )}
                {allTropes.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 px-1 py-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                    <input
                      type="checkbox"
                      checked={selectedTropes.has(t.id)}
                      onChange={() => toggleTrope(t.id)}
                      className="accent-[#D4A843]"
                    />
                    <span className="text-sm text-[#1B2A4A] dark:text-[#F5F0E8]">{t.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-red-300 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
            >
              <X size={14} /> Clear
            </button>
          )}
        </div>

        {/* Results count */}
        <p className="text-xs text-[#6B7280] dark:text-gray-400 mb-4">
          {filtered.length} {filtered.length === 1 ? 'listing' : 'listings'}
        </p>

        {/* ── Loading ── */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array(10).fill(null).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[2/3] bg-gray-200 dark:bg-gray-700 rounded-xl mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-1" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-[#6B7280] dark:text-gray-400 mb-3">No books match your filters.</p>
            <button
              onClick={clearFilters}
              className="text-sm text-[#D4A843] hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* ── Book Grid ── */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((book) => {
              const unlocked = isQuizUnlocked(book.id);
              const bounty = getActiveBounty(book.id);
              const inCompetition = activeCompetitionBookIds.has(book.id);

              return (
                <div
                  key={book.id}
                  onClick={() => navigateTo(`/book/${book.id}`)}
                  className="group cursor-pointer"
                >
                  {/* Cover */}
                  <div className="relative aspect-[2/3] rounded-xl overflow-hidden border border-[#e8e0d5] dark:border-gray-700 group-hover:border-[#D4A843] group-hover:shadow-lg transition mb-2">
                    {book.cover_url ? (
                      <img
                        src={book.cover_url}
                        alt={book.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#1B2A4A] dark:bg-gray-700 flex items-center justify-center">
                        <span className="text-[#F5F0E8] text-xs text-center px-2 font-medium">{book.title}</span>
                      </div>
                    )}

                    {/* Bounty badge */}
                    {bounty && (
                      <div className="absolute top-2 right-2 bg-[#D4A843] text-[#1B2A4A] text-xs font-bold px-2 py-1 rounded-full shadow">
                        ${bounty.per_pass_amount}/pass
                      </div>
                    )}

                    {/* Competition badge */}
                    {!bounty && inCompetition && (
                      <div className="absolute top-2 right-2 bg-[#1B2A4A] text-[#F5F0E8] text-xs font-bold px-2 py-1 rounded-full shadow">
                        Competition
                      </div>
                    )}

                    {/* Done badge */}
                    {completedBookIds.has(book.id) && (
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-green-600 text-white text-xs font-semibold px-2 py-1 rounded-full shadow">
                        <Check size={10} /> Done
                      </div>
                    )}

                    {/* Locked overlay */}
                    {!unlocked && !completedBookIds.has(book.id) && (
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                        <Lock size={10} /> Quiz locked
                      </div>
                    )}

                  </div>

                  {/* Info */}
                  <p className="text-sm font-semibold text-[#1B2A4A] dark:text-[#F5F0E8] leading-tight line-clamp-2">
                    {book.title}
                  </p>
                  <p className="text-xs text-[#6B7280] dark:text-gray-400 mt-0.5 truncate">
                    {book.author}
                  </p>

                  {/* Genre tags */}
                  {book.genres?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {book.genres.slice(0, 2).map((g) => (
                        <span
                          key={g}
                          className="text-xs bg-[#1B2A4A]/10 dark:bg-[#F5F0E8]/10 text-[#1B2A4A] dark:text-[#F5F0E8] px-1.5 py-0.5 rounded-full"
                        >
                          {g}
                        </span>
                      ))}
                      {book.genres.length > 2 && (
                        <span className="text-xs text-[#6B7280] dark:text-gray-400">
                          +{book.genres.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
