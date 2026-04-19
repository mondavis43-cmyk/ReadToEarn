import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';

const GENRES = ['Romance', 'Fantasy', 'Mystery', 'Thriller', 'Sci-Fi', 'Young Adult', 'Historical', 'Literary', 'Horror', 'Non-Fiction', 'Other'];

export const BulletinSubmit = () => {
  const { isDark } = useTheme();

  // State for the current logged-in user
  const [userId, setUserId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    author: '',
    genre: '',
    release_date: '',
    blurb: '',
    contact_email: '',
    cover_url: '',
  });

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [buyLink, setBuyLink] = useState(''); // Correctly initialized
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Check for auth session on load
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        setForm(prev => ({ ...prev, contact_email: session.user.email || '' }));
      }
    };
    getSession();
  }, []);

  // Theme tokens
  const bg = isDark ? '#0f172a' : '#F5F0E8';
  const cardBg = isDark ? '#1e293b' : '#FFFFFF';
  const cardBorder = isDark ? '#334155' : '#e2d9c8';
  const textPrimary = isDark ? '#f1f5f9' : '#1B2A4A';
  const textSecondary = isDark ? '#94a3b8' : '#6b7280';
  const inputBg = isDark ? '#0f172a' : '#FAFAF8';
  const inputBorder = isDark ? '#334155' : '#d1c9b8';
  const accent = '#D4A843';
  const labelColor = isDark ? '#cbd5e1' : '#374151';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.title.trim() || !form.author.trim()) {
      setError('Title and author name are required.');
      return;
    }

    setSubmitting(true);

    try {
      let final_cover_url = form.cover_url || null;

      if (coverFile) {
        const ext = coverFile.name.split('.').pop();
        const fileName = `bulletin-${Date.now()}.${ext}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('book-covers')
          .upload(fileName, coverFile, { upsert: false });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('book-covers')
          .getPublicUrl(uploadData.path);

        final_cover_url = urlData.publicUrl;
      }

      // THE UNIFIED DATA OBJECT
      const { error: insertError } = await supabase.from('books').insert({
        title: form.title.trim(),
        author: form.author.trim(),
        user_id: userId || null,
        genre: form.genre || null,
        release_date: form.release_date || null,
        blurb: form.blurb.trim() || null,
        buy_link: buyLink.trim() || null, // Correctly linked
        contact_email: form.contact_email.trim() || null,
        cover_url: final_cover_url,
        on_bulletin: true,
        is_listed: false,
        bounty_amount: 0,
        page_count: 0,
      });

      if (insertError) throw insertError;
      setSubmitted(true);
    } catch (err: any) {
      console.error("Submission Error:", err);
      setError(err.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ backgroundColor: bg, minHeight: '100vh' }} className="flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-xl border p-8 text-center" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
          <div className="text-5xl mb-4">📌</div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: textPrimary }}>You are on the board!</h2>
          <p className="text-sm mb-6" style={{ color: textSecondary }}>Your book has been pinned. If you have an account, it will appear in your dashboard soon.</p>
          <div className="flex flex-col gap-3">
            <a href="/bulletin-board" className="block w-full py-2.5 rounded-lg text-sm font-semibold text-center transition hover:opacity-90" style={{ backgroundColor: accent, color: '#1B2A4A' }}>View the Bulletin Board</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: bg, minHeight: '100vh' }} className="py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: textPrimary }}>Pin Your Book</h1>
          <p className="text-sm" style={{ color: textSecondary }}>Promote your work for free. Claim it later by creating an account with your email.</p>
        </div>

        <div className="rounded-xl border p-6 shadow-sm" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Title & Author fields remain the same */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: labelColor }}>Book Title <span style={{ color: '#ef4444' }}>*</span></label>
              <input type="text" name="title" value={form.title} onChange={handleChange} required className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none" style={{ backgroundColor: inputBg, borderColor: inputBorder, color: textPrimary }} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: labelColor }}>Author Name <span style={{ color: '#ef4444' }}>*</span></label>
              <input type="text" name="author" value={form.author} onChange={handleChange} required className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none" style={{ backgroundColor: inputBg, borderColor: inputBorder, color: textPrimary }} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: labelColor }}>Genre</label>
                <select name="genre" value={form.genre} onChange={handleChange} className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none" style={{ backgroundColor: inputBg, borderColor: inputBorder, color: textPrimary }}>
                  <option value="">Select genre</option>
                  {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: labelColor }}>Release Date</label>
                <input type="date" name="release_date" value={form.release_date} onChange={handleChange} className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none" style={{ backgroundColor: inputBg, borderColor: inputBorder, color: textPrimary }} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: labelColor }}>One-Liner Blurb (max 150)</label>
              <textarea name="blurb" value={form.blurb} onChange={handleChange} maxLength={150} rows={2} className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none resize-none" style={{ backgroundColor: inputBg, borderColor: inputBorder, color: textPrimary }} />
            </div>

            {/* STEP C: UI Input Field added here */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: labelColor }}>
                Purchase/Pre-order Link
              </label>
              <input
                type="url"
                placeholder="https://amazon.com/your-book"
                value={buyLink}
                onChange={(e) => setBuyLink(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
                style={{ backgroundColor: inputBg, borderColor: inputBorder, color: textPrimary }}
              />
              <p className="text-[10px] mt-1 opacity-60" style={{ color: textSecondary }}>
                Include https:// at the start (e.g., https://amazon.com)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: labelColor }}>Cover Image</label>
              <div className="flex items-start gap-4">
                {coverPreview && <img src={coverPreview} className="w-16 h-24 object-cover rounded border" alt="Preview" />}
                <input type="file" accept="image/*" onChange={handleCoverChange} className="text-sm" style={{ color: textSecondary }} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: labelColor }}>Your Contact Email (optional)</label>
              <input type="email" name="contact_email" value={form.contact_email} onChange={handleChange} placeholder="Required to claim listing later" className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none" style={{ backgroundColor: inputBg, borderColor: inputBorder, color: textPrimary }} />
            </div>

            {error && <div className="text-sm p-3 rounded bg-red-50 text-red-600">{error}</div>}

            <button type="submit" disabled={submitting} className="w-full py-3 rounded-lg text-sm font-bold transition hover:opacity-90 disabled:opacity-60" style={{ backgroundColor: accent, color: '#1B2A4A' }}>
              {submitting ? 'Pinning...' : '📌 Pin to Bulletin Board'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
