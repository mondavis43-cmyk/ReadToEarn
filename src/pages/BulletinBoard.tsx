import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { ExternalLink, Star } from 'lucide-react';

interface BulletinBook {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  genre: string | null;
  release_date: string | null;
  blurb: string | null;
  is_listed: boolean;
  buy_link?: string | null;
}

interface SponsoredPin {
  id: string;
  brand_name: string;
  tagline: string;
  image_url: string | null;
  site_url: string;
  category: string | null;
}

const GENRES = [
  'All', 'Romance', 'Fantasy', 'Mystery', 'Thriller', 'Sci-Fi',
  'Young Adult', 'Historical', 'Literary', 'Horror', 'Non-Fiction', 'Other',
];

const ROTATIONS = [
  'rotate-[-1.5deg]', 'rotate-[1deg]', 'rotate-[-0.5deg]', 'rotate-[2deg]',
  'rotate-[-2deg]', 'rotate-[0.5deg]', 'rotate-[1.5deg]', 'rotate-[-1deg]',
];

export const BulletinBoard = () => {
  const { isDark } = useTheme();
  const { user }   = useAuth();

  const [books, setBooks]           = useState<BulletinBook[]>([]);
  const [filtered, setFiltered]     = useState<BulletinBook[]>([]);
  const [sponsored, setSponsored]   = useState<SponsoredPin[]>([]);
  const [activeGenre, setActiveGenre] = useState('All');
  const [loading, setLoading]       = useState(true);
  const [isUpgraded, setIsUpgraded] = useState(false);

  const bg              = isDark ? '#0f172a'  : '#F5F0E8';
  const cardBg          = isDark ? '#1e293b'  : '#FFFDF7';
  const cardBorder      = isDark ? '#334155'  : '#e8e0d0';
  const textPrimary     = isDark ? '#f1f5f9'  : '#1B2A4A';
  const textSecondary   = isDark ? '#94a3b8'  : '#6b7280';
  const accent          = '#D4A843';
  const tabActiveBg     = isDark ? '#D4A843'  : '#1B2A4A';
  const tabActiveText   = '#FFFFFF';
  const tabInactiveBg   = isDark ? '#1e293b'  : '#FFFFFF';
  const tabInactiveText = isDark ? '#94a3b8'  : '#6b7280';
  const tabBorder       = isDark ? '#334155'  : '#e2d9c8';
  const pinColor        = isDark ? '#ef4444'  : '#dc2626';
  const sponsorBg       = isDark ? '#1e293b'  : '#FFFDF7';

  const loadData = async () => {
    setLoading(true);

    // 1. check upgrade status first
    let upgraded = false;
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_upgraded')
        .eq('id', user.id)
        .single();
      upgraded = profile?.is_upgraded ?? false;
      setIsUpgraded(upgraded);
    }

    // 2. fetch books (always shown to everyone)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const dateLimit = ninetyDaysAgo.toISOString().split('T')[0];

    const { data: booksData } = await supabase
      .from('books')
      .select('id, title, author, cover_url, genre, release_date, blurb, is_listed, buy_link')
      .eq('on_bulletin', true)
      .gte('release_date', dateLimit)
      .order('release_date', { ascending: false });

    setBooks(booksData ?? []);
    setFiltered(booksData ?? []);

    // 3. fetch sponsored pins only for non-upgraded users
    if (!upgraded) {
      const { data: sponsoredData } = await supabase
        .from('sponsored_pins')
        .select('id, brand_name, tagline, image_url, site_url, category')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      setSponsored(sponsoredData ?? []);
    } else {
      setSponsored([]);
    }

    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user]);

  useEffect(() => {
    if (activeGenre === 'All') {
      setFiltered(books);
    } else {
      setFiltered(books.filter(b => b.genre === activeGenre));
    }
  }, [activeGenre, books]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isFuture = (dateStr: string | null) => {
    if (!dateStr) return false;
    return new Date(dateStr + 'T00:00:00') > new Date();
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: bg, paddingBottom: '80px' }}>

      {/* Header */}
      <div style={{
        padding: '24px 16px 16px',
        borderBottom: `1px solid ${isDark ? '#334155' : '#e8e0d0'}`,
        backgroundColor: isDark ? '#1e293b' : '#FFFDF7',
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 700, color: textPrimary, margin: 0 }}>
                📌 Bulletin Board
              </h1>
              <p style={{ fontSize: '13px', color: textSecondary, marginTop: '4px' }}>
                New releases, upcoming books, and community picks
              </p>
            </div>
            <a
              href="/bulletin-submit"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: '8px', fontSize: '13px',
                fontWeight: 600, textDecoration: 'none',
                backgroundColor: accent, color: '#1B2A4A',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              <Star size={14} /> Post to Board
            </a>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px 16px' }}>

        {/* Sponsored Pins — hidden for upgraded users */}
        {!isUpgraded && sponsored.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: textSecondary, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
              Sponsored
            </p>
            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
              {sponsored.map(pin => (
                <a
                  key={pin.id}
                  href={pin.site_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flexShrink: 0, width: '160px', borderRadius: '12px',
                    border: `1.5px solid ${accent}`,
                    backgroundColor: sponsorBg,
                    padding: '12px', textDecoration: 'none',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    display: 'flex', flexDirection: 'column', gap: '8px',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = `0 4px 16px ${accent}40`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {pin.image_url && (
                    <img
                      src={pin.image_url}
                      alt={pin.brand_name}
                      style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '8px' }}
                    />
                  )}
                  <div>
                    <p style={{ fontSize: '12px', fontWeight: 700, color: textPrimary, margin: 0 }}>{pin.brand_name}</p>
                    {pin.category && (
                      <p style={{ fontSize: '10px', color: accent, margin: '2px 0 0', fontWeight: 600 }}>{pin.category}</p>
                    )}
                    <p style={{ fontSize: '11px', color: textSecondary, margin: '4px 0 0', lineHeight: 1.4 }}>{pin.tagline}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: 'auto' }}>
                    <ExternalLink size={11} color={accent} />
                    <span style={{ fontSize: '10px', color: accent, fontWeight: 600 }}>Visit</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Genre Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '20px' }}>
          {GENRES.map(genre => (
            <button
              key={genre}
              onClick={() => setActiveGenre(genre)}
              style={{
                flexShrink: 0, padding: '6px 14px', borderRadius: '20px',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${tabBorder}`,
                backgroundColor: activeGenre === genre ? tabActiveBg : tabInactiveBg,
                color: activeGenre === genre ? tabActiveText : tabInactiveText,
                transition: 'all 0.2s',
              }}
            >
              {genre}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: textSecondary }}>
            Loading board...
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '60px 20px',
            borderRadius: '16px', border: `1px dashed ${cardBorder}`,
            backgroundColor: cardBg,
          }}>
            <p style={{ fontSize: '32px', margin: '0 0 12px' }}>📌</p>
            <p style={{ color: textPrimary, fontWeight: 600, margin: '0 0 6px' }}>Nothing pinned yet</p>
            <p style={{ color: textSecondary, fontSize: '13px', margin: 0 }}>
              {activeGenre === 'All' ? 'No books on the board right now.' : `No ${activeGenre} books on the board.`}
            </p>
          </div>
        )}

        {/* Book Cards — masonry columns */}
        {!loading && filtered.length > 0 && (
          <div style={{ columns: '220px', columnGap: '16px' }}>
            {filtered.map((book, i) => (
              <div
                key={book.id}
                className={ROTATIONS[i % ROTATIONS.length]}
                style={{
                  breakInside: 'avoid', marginBottom: '16px',
                  borderRadius: '12px', border: `1px solid ${cardBorder}`,
                  backgroundColor: cardBg, overflow: 'hidden',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  position: 'relative',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'rotate(0deg) translateY(-3px)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 24px ${isDark ? '#00000060' : '#1B2A4A20'}`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = '';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '';
                }}
              >
                {/* Pin emoji */}
                <div style={{
                  position: 'absolute', top: '-8px', left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '18px', zIndex: 10,
                  filter: `drop-shadow(0 2px 3px ${pinColor}60)`,
                }}>
                  📌
                </div>

                {/* Cover */}
                {book.cover_url && (
                  <img
                    src={book.cover_url}
                    alt={book.title}
                    style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', display: 'block' }}
                  />
                )}

                <div style={{ padding: '12px' }}>
                  {/* Genre tag */}
                  {book.genre && (
                    <span style={{
                      display: 'inline-block', fontSize: '10px', fontWeight: 700,
                      color: accent, backgroundColor: `${accent}18`,
                      padding: '2px 8px', borderRadius: '20px', marginBottom: '6px',
                      letterSpacing: '0.04em', textTransform: 'uppercase',
                    }}>
                      {book.genre}
                    </span>
                  )}

                  <p style={{ fontSize: '13px', fontWeight: 700, color: textPrimary, margin: '0 0 2px', lineHeight: 1.3 }}>
                    {book.title}
                  </p>
                  <p style={{ fontSize: '11px', color: textSecondary, margin: '0 0 8px' }}>
                    by {book.author}
                  </p>

                  {book.blurb && (
                    <p style={{
                      fontSize: '11px', color: textSecondary, margin: '0 0 8px',
                      lineHeight: 1.5, display: '-webkit-box',
                      WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {book.blurb}
                    </p>
                  )}

                  {/* Release date */}
                  {book.release_date && (
                    <p style={{ fontSize: '10px', color: isFuture(book.release_date) ? accent : textSecondary, margin: '0 0 8px', fontWeight: isFuture(book.release_date) ? 700 : 400 }}>
                      {isFuture(book.release_date) ? '🗓 Coming ' : '📅 Released '}{formatDate(book.release_date)}
                    </p>
                  )}

                  {/* READ TO EARN badge */}
                  {book.is_listed && (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      fontSize: '10px', fontWeight: 700,
                      color: '#1B2A4A', backgroundColor: accent,
                      padding: '3px 8px', borderRadius: '20px', marginBottom: '8px',
                    }}>
                      <Star size={10} fill="#1B2A4A" /> READ TO EARN
                    </div>
                  )}

                  {/* Buy link */}
                  {book.buy_link && (
                    <a
                      href={book.buy_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        fontSize: '11px', fontWeight: 600, color: accent,
                        textDecoration: 'none',
                      }}
                    >
                      <ExternalLink size={11} /> Get this book
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
