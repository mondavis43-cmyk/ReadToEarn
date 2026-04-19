import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useTheme } from '../contexts/ThemeContext';

interface BulletinBook {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  genre: string | null;
  release_date: string | null;
  blurb: string | null;
  is_listed: boolean;
}

const GENRES = ['All', 'Romance', 'Fantasy', 'Mystery', 'Thriller', 'Sci-Fi', 'Historical', 'Literary', 'Horror', 'Non-Fiction', 'Other'];

// Subtle rotation classes for the pin-board feel
const ROTATIONS = [
  'rotate-[-1.5deg]',
  'rotate-[1deg]',
  'rotate-[-0.5deg]',
  'rotate-[2deg]',
  'rotate-[-2deg]',
  'rotate-[0.5deg]',
  'rotate-[1.5deg]',
  'rotate-[-1deg]',
];

export const BulletinBoard = () => {
  const { isDark } = useTheme();
  const [books, setBooks] = useState<BulletinBook[]>([]);
  const [filtered, setFiltered] = useState<BulletinBook[]>([]);
  const [activeGenre, setActiveGenre] = useState('All');
  const [loading, setLoading] = useState(true);

  // Theme tokens
  const bg = isDark ? '#0f172a' : '#F5F0E8';
  const cardBg = isDark ? '#1e293b' : '#FFFDF7';
  const cardBorder = isDark ? '#334155' : '#e8e0d0';
  const textPrimary = isDark ? '#f1f5f9' : '#1B2A4A';
  const textSecondary = isDark ? '#94a3b8' : '#6b7280';
  const accent = '#D4A843';
  const tabActiveBg = isDark ? '#D4A843' : '#1B2A4A';
  const tabActiveText = '#FFFFFF';
  const tabInactiveBg = isDark ? '#1e293b' : '#FFFFFF';
  const tabInactiveText = isDark ? '#94a3b8' : '#6b7280';
  const tabBorder = isDark ? '#334155' : '#e2d9c8';
  const badgeBg = isDark ? '#1B2A4A' : '#1B2A4A';
  const pinColor = isDark ? '#ef4444' : '#dc2626';

  useEffect(() => {
    loadBooks();
  }, []);

  useEffect(() => {
    if (activeGenre === 'All') {
      setFiltered(books);
    } else {
      setFiltered(books.filter(b => b.genre === activeGenre));
    }
  }, [activeGenre, books]);

  const loadBooks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('books')
      .select('id, title, author, cover_url, genre, release_date, blurb, is_listed')
      .eq('on_bulletin', true)
      .order('release_date', { ascending: false });

    if (!error && data) {
      setBooks(data);
      setFiltered(data);
    }
    setLoading(false);
  };

  const formatReleaseDate = (dateStr: string | null) => {
    if (!dateStr) return 'Coming Soon';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <div style={{ backgroundColor: bg, minHeight: '100vh' }} className="pb-16">
      {/* Header */}
      <div className="max-w-6xl mx-auto px-4 pt-10 pb-6">
        <div className="flex flex-col items-center text-center mb-2">
          {/* Decorative pushpin row */}
          <div className="flex gap-3 mb-4">
            {['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'].map((color, i) => (
              <svg key={i} width="14" height="20" viewBox="0 0 14 20" fill="none">
                <circle cx="7" cy="5" r="5" fill={color} />
                <rect x="6" y="9" width="2" height="11" rx="1" fill={color} opacity="0.6" />
              </svg>
            ))}
          </div>
          <h1 className="text-4xl font-bold mb-2" style={{ color: textPrimary }}>
            Bulletin Board
          </h1>
          <p className="text-base max-w-md" style={{ color: textSecondary }}>
            New releases and upcoming books from indie authors. Browse what is coming next.
          </p>
        </div>

        {/* Post Your Book CTA */}
        <div className="flex justify-center mt-4">
          <a
            href="/bulletin-submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:opacity-90"
            style={{ backgroundColor: accent, color: '#1B2A4A' }}
          >
            📌 Post Your Book — Free
          </a>
        </div>
      </div>

      {/* Genre Filter Tabs */}
      <div className="max-w-6xl mx-auto px-4 mb-8">
        <div className="flex flex-wrap gap-2 justify-center">
          {GENRES.map(genre => (
            <button
              key={genre}
              onClick={() => setActiveGenre(genre)}
              className="px-4 py-1.5 rounded-full text-sm font-medium border transition-all"
              style={{
                backgroundColor: activeGenre === genre ? tabActiveBg : tabInactiveBg,
                color: activeGenre === genre ? tabActiveText : tabInactiveText,
                borderColor: activeGenre === genre ? tabActiveBg : tabBorder,
              }}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: accent, borderTopColor: 'transparent' }} />
        </div>
      )}

      {/* Empty State */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center py-20 gap-3">
          <span className="text-5xl">📌</span>
          <p className="text-lg font-medium" style={{ color: textPrimary }}>Nothing pinned yet</p>
          <p className="text-sm" style={{ color: textSecondary }}>
            {activeGenre !== 'All' ? `No ${activeGenre} books posted yet.` : 'Be the first to post your book.'}
          </p>
          <a
            href="/bulletin-submit"
            className="mt-2 px-5 py-2 rounded-full text-sm font-semibold"
            style={{ backgroundColor: accent, color: '#1B2A4A' }}
          >
            Post Your Book
          </a>
        </div>
      )}

      {/* Masonry Pin Grid */}
      {!loading && filtered.length > 0 && (
        <div className="max-w-6xl mx-auto px-4">
          <div
            className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-5"
            style={{ columnGap: '20px' }}
          >
            {filtered.map((book, index) => (
              <div
                key={book.id}
                className={`break-inside-avoid mb-5 inline-block w-full ${ROTATIONS[index % ROTATIONS.length]} transition-transform hover:rotate-0 hover:scale-[1.02]`}
                style={{ transformOrigin: 'top center' }}
              >
                {/* Card */}
                <div
                  className="relative rounded-sm shadow-md border overflow-hidden"
                  style={{
                    backgroundColor: cardBg,
                    borderColor: cardBorder,
                    // Subtle index card texture via box shadow
                    boxShadow: isDark
                      ? '0 2px 8px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.03)'
                      : '0 2px 8px rgba(0,0,0,0.12), inset 0 0 0 1px rgba(0,0,0,0.04)',
                  }}
                >
                  {/* Pushpin */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
                    <svg width="16" height="22" viewBox="0 0 16 22" fill="none">
                      <circle cx="8" cy="6" r="6" fill={pinColor} />
                      <circle cx="8" cy="6" r="3" fill="rgba(255,255,255,0.3)" />
                      <rect x="7" y="11" width="2" height="11" rx="1" fill={pinColor} opacity="0.7" />
                    </svg>
                  </div>

                  {/* Cover Image */}
                  {book.cover_url ? (
                    <div className="w-full pt-6" style={{ aspectRatio: '2/3', maxHeight: '220px', overflow: 'hidden' }}>
                      <img
                        src={book.cover_url}
                        alt={book.title}
                        className="w-full h-full object-cover"
                        style={{ display: 'block' }}
                      />
                    </div>
                  ) : (
                    <div
                      className="w-full pt-6 flex items-center justify-center"
                      style={{
                        height: '160px',
                        backgroundColor: isDark ? '#0f172a' : '#e8e0d0',
                      }}
                    >
                      <span className="text-4xl">📖</span>
                    </div>
                  )}

                  {/* Card Body */}
                  <div className="p-3 pt-2">
                    {/* Genre Tag */}
                    {book.genre && (
                      <span
                        className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-1.5"
                        style={{ backgroundColor: accent + '22', color: accent }}
                      >
                        {book.genre}
                      </span>
                    )}

                    {/* Title */}
                    <h3 className="font-bold text-sm leading-snug mb-0.5" style={{ color: textPrimary }}>
                      {book.title}
                    </h3>

                    {/* Author */}
                    <p className="text-xs mb-1.5" style={{ color: textSecondary }}>
                      by {book.author}
                    </p>

                    {/* Blurb */}
                    {book.blurb && (
                      <p className="text-xs leading-relaxed mb-2" style={{ color: textSecondary }}>
                        {book.blurb}
                      </p>
                    )}

                    {/* Footer row */}
                    <div className="flex items-center justify-between mt-1 flex-wrap gap-1">
                      {/* Release Date */}
                      <span className="text-xs font-medium" style={{ color: accent }}>
                        {formatReleaseDate(book.release_date)}
                      </span>

                      {/* Available on ReadToEarn badge */}
                      {book.is_listed && (
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: badgeBg, color: '#D4A843' }}
                        >
                          ✓ On ReadToEarn
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
