import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { ExternalLink } from 'lucide-react'; // Ensure lucide-react is installed

interface BulletinBook {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  genre: string | null;
  release_date: string | null;
  blurb: string | null;
  is_listed: boolean;
  buy_link?: string | null; // Added buy_link to interface
}

const GENRES = ['All', 'Romance', 'Fantasy', 'Mystery', 'Thriller', 'Sci-Fi', 'Young Adult', 'Historical', 'Literary', 'Horror', 'Non-Fiction', 'Other'];

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
    
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const dateLimit = ninetyDaysAgo.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('books')
      .select('id, title, author, cover_url, genre, release_date, blurb, is_listed, buy_link') // Added buy_link to select
      .eq('on_bulletin', true)
      .gte('release_date', dateLimit) 
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
    const isFuture = new Date(dateStr) > new Date();
    const prefix = isFuture ? 'Releasing: ' : '';
    return prefix + date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <div style={{ backgroundColor: bg, minHeight: '100vh' }} className="pb-16">
      <div className="max-w-6xl mx-auto px-4 pt-10 pb-6">
        <div className="flex flex-col items-center text-center mb-2">
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
            Fresh finds and upcoming releases. Browse what's new in books from the last 90 days.
          </p>
        </div>

        <div className="flex justify-center mt-4">
          <a
            href="/bulletin-submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:opacity-90 shadow-sm"
            style={{ backgroundColor: accent, color: '#1B2A4A' }}
          >
            📌 Post Your New Release — Free
          </a>
        </div>
      </div>

      {/* Genre Tabs */}
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

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: accent, borderTopColor: 'transparent' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 gap-3">
          <span className="text-5xl">📌</span>
          <p className="text-lg font-medium" style={{ color: textPrimary }}>Nothing pinned yet</p>
          <p className="text-sm text-center max-w-xs" style={{ color: textSecondary }}>
            {activeGenre !== 'All' 
              ? `No ${activeGenre} books have been posted in the last 90 days.` 
              : 'Be the first to share your upcoming or recent release with our community.'}
          </p>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto px-4">
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-5" style={{ columnGap: '20px' }}>
            {filtered.map((book, index) => (
              <div
                key={book.id}
                className={`break-inside-avoid mb-5 inline-block w-full ${ROTATIONS[index % ROTATIONS.length]} transition-transform hover:rotate-0 hover:scale-[1.02]`}
                style={{ transformOrigin: 'top center' }}
              >
                <div
                  className="relative rounded-sm shadow-md border overflow-hidden"
                  style={{
                    backgroundColor: cardBg,
                    borderColor: cardBorder,
                    boxShadow: isDark
                      ? '0 2px 8px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.03)'
                      : '0 2px 8px rgba(0,0,0,0.12), inset 0 0 0 1px rgba(0,0,0,0.04)',
                  }}
                >
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
                    <svg width="16" height="22" viewBox="0 0 16 22" fill="none">
                      <circle cx="8" cy="6" r="6" fill={pinColor} />
                      <circle cx="8" cy="6" r="3" fill="rgba(255,255,255,0.3)" />
                      <rect x="7" y="11" width="2" height="11" rx="1" fill={pinColor} opacity="0.7" />
                    </svg>
                  </div>

                  {/* Wrapper for Clickable Image */}
                  <a 
                    href={book.buy_link || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`block w-full pt-6 ${!book.buy_link ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    {book.cover_url ? (
                      <div className="w-full" style={{ aspectRatio: '2/3', maxHeight: '220px', overflow: 'hidden' }}>
                        <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover transition-opacity hover:opacity-90" />
                      </div>
                    ) : (
                      <div className="w-full flex items-center justify-center" style={{ height: '160px', backgroundColor: isDark ? '#0f172a' : '#e8e0d0' }}>
                        <span className="text-4xl">📖</span>
                      </div>
                    )}
                  </a>

                  <div className="p-3 pt-2">
                    {book.genre && (
                      <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-1.5" style={{ backgroundColor: accent + '22', color: accent }}>
                        {book.genre}
                      </span>
                    )}

                    {/* Wrapper for Clickable Title */}
                    <a 
                      href={book.buy_link || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`block group/title ${!book.buy_link ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <h3 className="font-bold text-sm leading-snug mb-0.5 transition-colors group-hover/title:text-[#D4A843]" style={{ color: textPrimary }}>
                        {book.title}
                        {book.buy_link && <ExternalLink className="inline-block ml-1 w-2.5 h-2.5 opacity-0 group-hover/title:opacity-100 transition-opacity" />}
                      </h3>
                    </a>

                    <p className="text-xs mb-1.5" style={{ color: textSecondary }}>by {book.author}</p>
                    {book.blurb && <p className="text-xs leading-relaxed mb-2 line-clamp-3" style={{ color: textSecondary }}>{book.blurb}</p>}
                    
                    <div className="flex items-center justify-between mt-1 flex-wrap gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: accent }}>
                        {formatReleaseDate(book.release_date)}
                      </span>

                      {book.is_listed && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: badgeBg, color: '#D4A843', border: '1px solid #D4A843' }}>
                          READ TO EARN
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
