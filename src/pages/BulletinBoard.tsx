import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
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

const GENRES = ['All', 'Romance', 'Fantasy', 'Mystery', 'Thriller', 'Sci-Fi', 'Young Adult', 'Historical', 'Literary', 'Horror', 'Non-Fiction', 'Other'];

const ROTATIONS = [
  'rotate-[-1.5deg]', 'rotate-[1deg]', 'rotate-[-0.5deg]', 'rotate-[2deg]',
  'rotate-[-2deg]', 'rotate-[0.5deg]', 'rotate-[1.5deg]', 'rotate-[-1deg]',
];

export const BulletinBoard = () => {
  const { isDark } = useTheme();
  const [books, setBooks]           = useState<BulletinBook[]>([]);
  const [filtered, setFiltered]     = useState<BulletinBook[]>([]);
  const [sponsored, setSponsored]   = useState<SponsoredPin[]>([]);
  const [activeGenre, setActiveGenre] = useState('All');
  const [loading, setLoading]       = useState(true);

  const bg             = isDark ? '#0f172a'  : '#F5F0E8';
  const cardBg         = isDark ? '#1e293b'  : '#FFFDF7';
  const cardBorder     = isDark ? '#334155'  : '#e8e0d0';
  const textPrimary    = isDark ? '#f1f5f9'  : '#1B2A4A';
  const textSecondary  = isDark ? '#94a3b8'  : '#6b7280';
  const accent         = '#D4A843';
  const tabActiveBg    = isDark ? '#D4A843'  : '#1B2A4A';
  const tabActiveText  = '#FFFFFF';
  const tabInactiveBg  = isDark ? '#1e293b'  : '#FFFFFF';
  const tabInactiveText = isDark ? '#94a3b8' : '#6b7280';
  const tabBorder      = isDark ? '#334155'  : '#e2d9c8';
  const pinColor       = isDark ? '#ef4444'  : '#dc2626';
  const sponsorBg      = isDark ? '#1e293b'  : '#fffbf0';
  const sponsorBorder  = isDark ? '#D4A843'  : '#D4A843';

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (activeGenre === 'All') {
      setFiltered(books);
    } else {
      setFiltered(books.filter(b => b.genre === activeGenre));
    }
  }, [activeGenre, books]);

  const loadData = async () => {
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - 90);

    const [{ data: booksData }, { data: sponsoredData }] = await Promise.all([
      supabase
        .from('books')
        .select('id, title, author, cover_url, genre, release_date, blurb, is_listed, buy_link')
        .eq('on_bulletin', true)
        .gte('release_date', dateLimit.toISOString().split('T')[0])
        .order('release_date', { ascending: false }),
      supabase
        .from('sponsored_pins')
        .select('id, brand_name, tagline, image_url, site_url, category')
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
    ]);

    setBooks(booksData || []);
    setSponsored(sponsoredData || []);
    setLoading(false);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isFuture = (dateStr: string) =>
    new Date(dateStr + 'T00:00:00') > new Date();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: bg, transition: 'background 0.3s' }}>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${cardBorder}`, padding: '24px 16px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 20 }}>📌</span>
              <h1 style={{ fontFamily: 'serif', fontSize: 28, fontWeight: 700, color: textPrimary, margin: 0 }}>
                Bulletin Board
              </h1>
              <span style={{ fontSize: 20 }}>📌</span>
            </div>
            <p style={{ fontSize: 13, color: textSecondary, margin: 0 }}>
              New releases, upcoming books, and featured brands — all in one place.
            </p>
          </div>
          <button
            onClick={() => { window.history.pushState({}, '', '/bulletin-submit'); window.dispatchEvent(new PopStateEvent('popstate')); }}
            style={{ backgroundColor: accent, color: '#1B2A4A', fontWeight: 600, fontSize: 13, padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer' }}
          >
            + Post to Board
          </button>
        </div>
      </div>

      {/* Sponsored Pins Row */}
      {sponsored.length > 0 && (
        <div style={{ borderBottom: `1px solid ${cardBorder}`, padding: '16px', backgroundColor: isDark ? '#0f172a' : '#fffdf5' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Star size={13} color={accent} fill={accent} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: accent }}>
                Featured Sponsors
              </span>
            </div>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
              {sponsored.map(pin => (
                <a
                  key={pin.id}
                  href={pin.site_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flexShrink: 0,
                    width: 200,
                    backgroundColor: sponsorBg,
                    border: `1.5px solid ${sponsorBorder}`,
                    borderRadius: 12,
                    overflow: 'hidden',
                    textDecoration: 'none',
                    display: 'block',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 6px 20px ${accent}30`;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  }}
                >
                  {/* Sponsor image */}
                  <div style={{ width: '100%', height: 110, backgroundColor: isDark ? '#334155' : '#f0ebe0', overflow: 'hidden' }}>
                    {pin.image_url ? (
                      <img
                        src={pin.image_url}
                        alt={pin.brand_name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                        🛍️
                      </div>
                    )}
                  </div>
                  {/* Sponsor info */}
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 }}>
                        {pin.brand_name}
                      </span>
                      <ExternalLink size={11} color={accent} />
                    </div>
                    {pin.category && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: accent, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {pin.category}
                      </span>
                    )}
                    <p style={{ fontSize: 11, color: textSecondary, margin: '4px 0 0', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {pin.tagline}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Genre Tabs */}
      <div style={{ padding: '16px 16px 0', borderBottom: `1px solid ${cardBorder}` }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12 }}>
          {GENRES.map(g => (
            <button
              key={g}
              onClick={() => setActiveGenre(g)}
              style={{
                flexShrink: 0,
                padding: '6px 14px',
                borderRadius: 20,
                border: `1px solid ${tabBorder}`,
                backgroundColor: activeGenre === g ? tabActiveBg : tabInactiveBg,
                color: activeGenre === g ? tabActiveText : tabInactiveText,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Board */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: textSecondary }}>Loading board...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>📌</p>
            <p style={{ color: textSecondary, fontSize: 14 }}>No books in this genre yet.</p>
          </div>
        ) : (
          <div style={{
            columns: '4 220px',
            columnGap: 16,
          }}>
            {filtered.map((book, i) => {
              const rotation = ROTATIONS[i % ROTATIONS.length];
              return (
                <div
                  key={book.id}
                  className={`${rotation} hover:rotate-0`}
                  style={{
                    breakInside: 'avoid',
                    marginBottom: 20,
                    backgroundColor: cardBg,
                    border: `1px solid ${cardBorder}`,
                    borderRadius: 12,
                    overflow: 'hidden',
                    boxShadow: isDark
                      ? '0 4px 16px rgba(0,0,0,0.4)'
                      : '0 4px 16px rgba(0,0,0,0.08)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    cursor: book.buy_link ? 'pointer' : 'default',
                  }}
                >
                  {/* Pin */}
                  <div style={{ textAlign: 'center', paddingTop: 10 }}>
                    <span style={{ fontSize: 18, color: pinColor }}>📌</span>
                  </div>

                  {/* Cover */}
                  <div
                    style={{ margin: '8px 12px', borderRadius: 8, overflow: 'hidden', aspectRatio: '2/3', backgroundColor: isDark ? '#334155' : '#f0ebe0', cursor: book.buy_link ? 'pointer' : 'default' }}
                    onClick={() => book.buy_link && window.open(book.buy_link, '_blank')}
                  >
                    {book.cover_url ? (
                      <img src={book.cover_url} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>📚</div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ padding: '10px 12px 14px' }}>
                    {book.genre && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {book.genre}
                      </span>
                    )}
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, cursor: book.buy_link ? 'pointer' : 'default' }}
                      onClick={() => book.buy_link && window.open(book.buy_link, '_blank')}
                    >
                      <p style={{ fontFamily: 'serif', fontSize: 14, fontWeight: 700, color: textPrimary, margin: 0, lineHeight: 1.3 }}>
                        {book.title}
                      </p>
                      {book.buy_link && <ExternalLink size={11} color={accent} style={{ flexShrink: 0 }} />}
                    </div>
                    <p style={{ fontSize: 12, color: textSecondary, margin: '2px 0 6px' }}>{book.author}</p>
                    {book.blurb && (
                      <p style={{ fontSize: 12, color: textSecondary, margin: '0 0 6px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {book.blurb}
                      </p>
                    )}
                    {book.release_date && (
                      <p style={{ fontSize: 11, color: accent, margin: 0, fontWeight: 600 }}>
                        {isFuture(book.release_date) ? 'Releasing: ' : ''}{formatDate(book.release_date)}
                      </p>
                    )}
                    {book.is_listed && (
                      <span style={{ display: 'inline-block', marginTop: 6, fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', backgroundColor: accent, color: '#1B2A4A', padding: '2px 7px', borderRadius: 20 }}>
                        READ TO EARN
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
