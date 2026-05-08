import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { BookOpen, Star } from 'lucide-react';

const GENRES = ['Romance', 'Fantasy', 'Mystery', 'Thriller', 'Sci-Fi', 'Young Adult', 'Historical', 'Literary', 'Horror', 'Non-Fiction', 'Other'];
const SPONSOR_CATEGORIES = ['Reading Accessories', 'Book Subscription Box', 'Coffee & Tea', 'Candles & Ambiance', 'Stationery', 'Apparel', 'Digital Tools', 'Other'];

type Mode = 'author' | 'sponsor';

export const BulletinSubmit = () => {
  const { isDark } = useTheme();
  const [mode, setMode]             = useState<Mode>('author');
  const [userId, setUserId]         = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [error, setError]           = useState('');

  // Author form
  const [authorForm, setAuthorForm] = useState({
    title: '', author: '', genre: '', release_date: '',
    blurb: '', contact_email: '', cover_url: '',
  });
  const [coverFile, setCoverFile]         = useState<File | null>(null);
  const [coverPreview, setCoverPreview]   = useState<string | null>(null);
  const [buyLink, setBuyLink]             = useState('');

  // Sponsor form
  const [sponsorForm, setSponsorForm] = useState({
    brand_name: '', tagline: '', site_url: '',
    contact_email: '', category: '',
  });
  const [sponsorImageFile, setSponsorImageFile]       = useState<File | null>(null);
  const [sponsorImagePreview, setSponsorImagePreview] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        setAuthorForm(prev => ({ ...prev, contact_email: session.user.email || '' }));
        setSponsorForm(prev => ({ ...prev, contact_email: session.user.email || '' }));
      }
    });
  }, []);

  // Theme tokens
  const bg            = isDark ? '#0f172a'  : '#F5F0E8';
  const cardBg        = isDark ? '#1e293b'  : '#FFFFFF';
  const cardBorder    = isDark ? '#334155'  : '#e2d9c8';
  const textPrimary   = isDark ? '#f1f5f9'  : '#1B2A4A';
  const textSecondary = isDark ? '#94a3b8'  : '#6b7280';
  const inputBg       = isDark ? '#0f172a'  : '#FAFAF8';
  const inputBorder   = isDark ? '#334155'  : '#d1c9b8';
  const accent        = '#D4A843';
  const labelColor    = isDark ? '#cbd5e1'  : '#374151';

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: `1px solid ${inputBorder}`, backgroundColor: inputBg,
    color: textPrimary, fontSize: 14, outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600,
    color: labelColor, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em',
  };

  const handleAuthorChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setAuthorForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSponsorChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSponsorForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleSponsorImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSponsorImageFile(file);
    setSponsorImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async (file: File, bucket: string, folder: string): Promise<string | null> => {
    const ext      = file.name.split('.').pop();
    const filename = `${folder}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from(bucket).upload(filename, file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from(bucket).getPublicUrl(filename);
    return data.publicUrl;
  };

  const handleAuthorSubmit = async () => {
    if (!authorForm.title.trim() || !authorForm.author.trim()) {
      setError('Book title and author name are required.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      let cover_url = authorForm.cover_url || null;
      if (coverFile) cover_url = await uploadImage(coverFile, 'book-covers', 'bulletin');

      const { error: insertError } = await supabase.from('books').insert({
        title:         authorForm.title.trim(),
        author:        authorForm.author.trim(),
        user_id:       userId,
        genre:         authorForm.genre || null,
        release_date:  authorForm.release_date || null,
        blurb:         authorForm.blurb.trim() || null,
        buy_link:      buyLink.trim() || null,
        contact_email: authorForm.contact_email.trim() || null,
        cover_url,
        on_bulletin:   true,
        is_listed:     false,
        bounty_amount: 0,
        page_count:    0,
      });
      if (insertError) throw insertError;
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSponsorSubmit = async () => {
    if (!sponsorForm.brand_name.trim() || !sponsorForm.tagline.trim() || !sponsorForm.site_url.trim()) {
      setError('Brand name, tagline, and site URL are required.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      let image_url: string | null = null;
      if (sponsorImageFile) image_url = await uploadImage(sponsorImageFile, 'book-covers', 'sponsors');

      sessionStorage.setItem('checkoutItem', JSON.stringify({
        type:   'sponsored_pin',
        label:  `Sponsored Pin — ${sponsorForm.brand_name}`,
        amount: 5000, // $50.00
        metadata: { brand_name: sponsorForm.brand_name },
      }));

      sessionStorage.setItem('pendingSubmission', JSON.stringify({
        table: 'sponsored_pins',
        data: {
          brand_name:    sponsorForm.brand_name.trim(),
          tagline:       sponsorForm.tagline.trim(),
          site_url:      sponsorForm.site_url.trim(),
          contact_email: sponsorForm.contact_email.trim() || null,
          category:      sponsorForm.category || null,
          image_url,
          status:        'pending',
          is_active:     false,
        },
      }));

      window.history.pushState({}, '', '/checkout');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  // Success state (author only — sponsor goes to checkout)
  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <p style={{ fontSize: 48, marginBottom: 12 }}>📌</p>
          <h2 style={{ fontFamily: 'serif', fontSize: 28, color: textPrimary, marginBottom: 8 }}>You're on the board!</h2>
          <p style={{ color: textSecondary, fontSize: 14, marginBottom: 24 }}>
            Your book has been submitted and will appear on the Bulletin Board shortly.
          </p>
          <button
            onClick={() => { window.history.pushState({}, '', '/bulletin'); window.dispatchEvent(new PopStateEvent('popstate')); }}
            style={{ backgroundColor: accent, color: '#1B2A4A', fontWeight: 600, padding: '12px 28px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14 }}
          >
            View Bulletin Board
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: bg, transition: 'background 0.3s' }}>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${cardBorder}`, padding: '20px 16px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => { window.history.pushState({}, '', '/bulletin'); window.dispatchEvent(new PopStateEvent('popstate')); }}
            style={{ fontFamily: 'serif', fontSize: 16, fontWeight: 700, color: accent, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← Back
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 16px' }}>

        {/* Title */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: 'serif', fontSize: 36, color: textPrimary, margin: '0 0 8px' }}>Post to the Board</h1>
          <p style={{ fontSize: 13, color: textSecondary, margin: 0 }}>
            Promote your new release or get your brand in front of readers.
          </p>
        </div>

        {/* Mode Toggle */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 28, borderRadius: 12, overflow: 'hidden', border: `1px solid ${cardBorder}` }}>
          {([
            { key: 'author',  label: 'Author / Publisher', icon: <BookOpen size={15} />, sub: 'Free' },
            { key: 'sponsor', label: 'Brand Sponsor',       icon: <Star size={15} />,    sub: '$50/month' },
          ] as { key: Mode; label: string; icon: React.ReactNode; sub: string }[]).map(opt => (
            <button
              key={opt.key}
              onClick={() => { setMode(opt.key); setError(''); }}
              style={{
                flex: 1,
                padding: '14px 12px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: mode === opt.key ? accent : cardBg,
                color: mode === opt.key ? '#1B2A4A' : textSecondary,
                transition: 'all 0.15s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13 }}>
                {opt.icon} {opt.label}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.75 }}>{opt.sub}</span>
            </button>
          ))}
        </div>

        {/* ── AUTHOR FORM ── */}
        {mode === 'author' && (
          <div style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: 28 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              <div>
                <label style={labelStyle}>Book Title <span style={{ color: '#ef4444' }}>*</span></label>
                <input name="title" value={authorForm.title} onChange={handleAuthorChange} placeholder="Your book title" style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Author Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input name="author" value={authorForm.author} onChange={handleAuthorChange} placeholder="Author or publisher name" style={inputStyle} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Genre</label>
                  <select name="genre" value={authorForm.genre} onChange={handleAuthorChange} style={inputStyle}>
                    <option value="">Select genre</option>
                    {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Release Date</label>
                  <input name="release_date" type="date" value={authorForm.release_date} onChange={handleAuthorChange} style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>One-Liner Blurb <span style={{ color: textSecondary, fontWeight: 400, textTransform: 'none' }}>(max 150 chars)</span></label>
                <textarea
                  name="blurb" value={authorForm.blurb} onChange={handleAuthorChange}
                  placeholder="Hook readers in one sentence..."
                  maxLength={150} rows={2}
                  style={{ ...inputStyle, resize: 'none' }}
                />
                <p style={{ fontSize: 11, color: textSecondary, marginTop: 4 }}>{authorForm.blurb.length}/150</p>
              </div>

              <div>
                <label style={labelStyle}>Purchase / Pre-order Link</label>
                <input type="url" value={buyLink} onChange={e => setBuyLink(e.target.value)} placeholder="https://..." style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Cover Image</label>
                <input type="file" accept="image/*" onChange={handleCoverChange} style={{ fontSize: 13, color: textSecondary }} />
                {coverPreview && (
                  <img src={coverPreview} alt="Cover preview" style={{ marginTop: 10, height: 120, borderRadius: 6, objectFit: 'cover' }} />
                )}
              </div>

              <div>
                <label style={labelStyle}>Contact Email <span style={{ color: textSecondary, fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                <input name="contact_email" type="email" value={authorForm.contact_email} onChange={handleAuthorChange} placeholder="your@email.com" style={inputStyle} />
              </div>

              {error && (
                <div style={{ padding: '10px 14px', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleAuthorSubmit}
                disabled={submitting}
                style={{ backgroundColor: accent, color: '#1B2A4A', fontWeight: 700, fontSize: 15, padding: '14px', borderRadius: 12, border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1 }}
              >
                {submitting ? 'Submitting...' : '📌 Post to Bulletin Board — Free'}
              </button>
            </div>
          </div>
        )}

        {/* ── SPONSOR FORM ── */}
        {mode === 'sponsor' && (
          <div style={{ backgroundColor: cardBg, border: `1.5px solid ${accent}`, borderRadius: 16, padding: 28 }}>

            {/* Sponsor callout */}
            <div style={{ backgroundColor: isDark ? '#1B2A4A' : '#fffbf0', border: `1px solid ${accent}30`, borderRadius: 10, padding: '12px 16px', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Star size={13} color={accent} fill={accent} />
                <span style={{ fontSize: 12, fontWeight: 700, color: accent }}>Sponsored Pin — $50/month</span>
              </div>
              <p style={{ fontSize: 12, color: textSecondary, margin: 0, lineHeight: 1.5 }}>
                Your brand stays pinned at the top of the Bulletin Board for the full month. Includes your image, tagline, category badge, and a direct link to your site.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              <div>
                <label style={labelStyle}>Brand Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input name="brand_name" value={sponsorForm.brand_name} onChange={handleSponsorChange} placeholder="e.g. Cozy Reads Co." style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Tagline <span style={{ color: '#ef4444' }}>*</span></label>
                <input name="tagline" value={sponsorForm.tagline} onChange={handleSponsorChange} placeholder="One sentence that sells your brand..." style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Category</label>
                <select name="category" value={sponsorForm.category} onChange={handleSponsorChange} style={inputStyle}>
                  <option value="">Select category</option>
                  {SPONSOR_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Website URL <span style={{ color: '#ef4444' }}>*</span></label>
                <input name="site_url" type="url" value={sponsorForm.site_url} onChange={handleSponsorChange} placeholder="https://yourbrand.com" style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Brand Image / Product Photo</label>
                <input type="file" accept="image/*" onChange={handleSponsorImageChange} style={{ fontSize: 13, color: textSecondary }} />
                {sponsorImagePreview && (
                  <img src={sponsorImagePreview} alt="Brand preview" style={{ marginTop: 10, height: 100, borderRadius: 6, objectFit: 'cover' }} />
                )}
                <p style={{ fontSize: 11, color: textSecondary, marginTop: 4 }}>Recommended: 800×500px or wider. Will be cropped to landscape.</p>
              </div>

              <div>
                <label style={labelStyle}>Contact Email <span style={{ color: textSecondary, fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                <input name="contact_email" type="email" value={sponsorForm.contact_email} onChange={handleSponsorChange} placeholder="your@email.com" style={inputStyle} />
              </div>

              {error && (
                <div style={{ padding: '10px 14px', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleSponsorSubmit}
                disabled={submitting}
                style={{ backgroundColor: accent, color: '#1B2A4A', fontWeight: 700, fontSize: 15, padding: '14px', borderRadius: 12, border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1 }}
              >
                {submitting ? 'Processing...' : '⭐ Continue to Checkout — $50/month'}
              </button>
              <p style={{ fontSize: 11, color: textSecondary, textAlign: 'center', margin: '-12px 0 0' }}>
                Your pin goes live after payment is confirmed. Reviewed within 24 hours.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
