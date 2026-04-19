import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';

const GENRES = ['Romance', 'Fantasy', 'Mystery', 'Thriller', 'Sci-Fi', 'Young Adult', 'Historical', 'Literary', 'Horror', 'Non-Fiction', 'Other'];

export const BulletinSubmit = () => {
  const { isDark } = useTheme();

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
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

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
      setError('Title and author are required.');
      return;
    }
    if (form.blurb.length > 150) {
      setError('Blurb must be 150 characters or fewer.');
      return;
    }

    setSubmitting(true);

    try {
      let cover_url = form.cover_url || null;

      // Upload cover if provided
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

        cover_url = urlData.publicUrl;
      }

      // Insert book row — Path A (no account)
      const { error: insertError } = await supabase.from('books').insert({
        title: form.title.trim(),
        author: form.author.trim(),
        genre: form.genre || null,
        release_date: form.release_date || null,
        blurb: form.blurb.trim() || null,
        contact_email: form.contact_email.trim() || null,
        cover_url,
        on_bulletin: true,
        is_listed: false,
        author_id: null,
        // Required fields with defaults
        bounty_amount: 0,
        page_count: 0,
      });

      if (insertError) throw insertError;

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ backgroundColor: bg, minHeight: '100vh' }} className="flex items-center justify-center px-4">
        <div
          className="max-w-md w-full rounded-xl border p-8 text-center"
          style={{ backgroundColor: cardBg, borderColor: cardBorder }}
        >
          <div className="text-5xl mb-4">📌</div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: textPrimary }}>
            You are on the board!
          </h2>
          <p className="text-sm mb-6" style={{ color: textSecondary }}>
            Your book has been pinned to the bulletin board. Readers can discover it right now.
          </p>
          <div className="flex flex-col gap-3">
            <a
              href="/bulletin-board"
              className="block w-full py-2.5 rounded-lg text-sm font-semibold text-center transition hover:opacity-90"
              style={{ backgroundColor: accent, color: '#1B2A4A' }}
            >
              View the Bulletin Board
            </a>
            <a
              href="/signup"
              className="block w-full py-2.5 rounded-lg text-sm font-semibold text-center border transition hover:opacity-80"
              style={{ borderColor: cardBorder, color: textSecondary }}
            >
              Create an Account to Manage Your Listing
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: bg, minHeight: '100vh' }} className="py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center gap-2 mb-3">
            {['#ef4444', '#3b82f6', '#22c55e'].map((color, i) => (
              <svg key={i} width="12" height="18" viewBox="0 0 12 18" fill="none">
                <circle cx="6" cy="5" r="5" fill={color} />
                <rect x="5" y="9" width="2" height="9" rx="1" fill={color} opacity="0.6" />
              </svg>
            ))}
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: textPrimary }}>
            Pin Your Book
          </h1>
          <p className="text-sm" style={{ color: textSecondary }}>
            Free for all authors. No account required. Your book goes live immediately.
          </p>
        </div>

        {/* Form Card */}
        <div
          className="rounded-xl border p-6 shadow-sm"
          style={{ backgroundColor: cardBg, borderColor: cardBorder }}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: labelColor }}>
                Book Title <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="The Name of the Wind"
                required
                className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition"
                style={{
                  backgroundColor: inputBg,
                  borderColor: inputBorder,
                  color: textPrimary,
                }}
                onFocus={e => (e.target.style.borderColor = accent)}
                onBlur={e => (e.target.style.borderColor = inputBorder)}
              />
            </div>

            {/* Author */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: labelColor }}>
                Author Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                name="author"
                value={form.author}
                onChange={handleChange}
                placeholder="Patrick Rothfuss"
                required
                className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition"
                style={{
                  backgroundColor: inputBg,
                  borderColor: inputBorder,
                  color: textPrimary,
                }}
                onFocus={e => (e.target.style.borderColor = accent)}
                onBlur={e => (e.target.style.borderColor = inputBorder)}
              />
            </div>

            {/* Genre + Release Date row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: labelColor }}>
                  Genre
                </label>
                <select
                  name="genre"
                  value={form.genre}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
                  style={{
                    backgroundColor: inputBg,
                    borderColor: inputBorder,
                    color: form.genre ? textPrimary : textSecondary,
                  }}
                >
                  <option value="">Select genre</option>
                  {GENRES.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: labelColor }}>
                  Release Date
                </label>
                <input
                  type="date"
                  name="release_date"
                  value={form.release_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
                  style={{
                    backgroundColor: inputBg,
                    borderColor: inputBorder,
                    color: textPrimary,
                  }}
                />
              </div>
            </div>

            {/* Blurb */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: labelColor }}>
                One-Liner Blurb
                <span className="ml-1 font-normal" style={{ color: textSecondary }}>
                  ({form.blurb.length}/150)
                </span>
              </label>
              <textarea
                name="blurb"
                value={form.blurb}
                onChange={handleChange}
                placeholder="A young man grows up to become the most notorious wizard his world has ever seen."
                rows={2}
                maxLength={150}
                className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none resize-none"
                style={{
                  backgroundColor: inputBg,
                  borderColor: inputBorder,
                  color: textPrimary,
                }}
                onFocus={e => (e.target.style.borderColor = accent)}
                onBlur={e => (e.target.style.borderColor = inputBorder)}
              />
            </div>

            {/* Cover Upload */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: labelColor }}>
                Cover Image
              </label>
              <div className="flex items-start gap-4">
                {coverPreview && (
                  <img
                    src={coverPreview}
                    alt="Cover preview"
                    className="w-16 h-24 object-cover rounded border"
                    style={{ borderColor: cardBorder }}
                  />
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverChange}
                    className="w-full text-sm"
                    style={{ color: textSecondary }}
                  />
                  <p className="text-xs mt-1" style={{ color: textSecondary }}>
                    JPG or PNG. Recommended: 2:3 ratio (book cover proportions).
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Email (optional, for Path D claim-back) */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: labelColor }}>
                Your Email <span className="font-normal" style={{ color: textSecondary }}>(optional)</span>
              </label>
              <input
                type="email"
                name="contact_email"
                value={form.contact_email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
                style={{
                  backgroundColor: inputBg,
                  borderColor: inputBorder,
                  color: textPrimary,
                }}
                onFocus={e => (e.target.style.borderColor = accent)}
                onBlur={e => (e.target.style.borderColor = inputBorder)}
              />
              <p className="text-xs mt-1" style={{ color: textSecondary }}>
                Add your email so you can claim this listing if you create an account later.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-lg text-sm font-bold transition hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: accent, color: '#1B2A4A' }}
            >
              {submitting ? 'Pinning your book...' : '📌 Pin to Bulletin Board'}
            </button>

            <p className="text-xs text-center" style={{ color: textSecondary }}>
              Your book goes live immediately. No review required.
            </p>
          </form>
        </div>

        {/* Already have an account? */}
        <p className="text-center text-sm mt-4" style={{ color: textSecondary }}>
          Have a ReadToEarn account?{' '}
          <a href="/author-dashboard" style={{ color: accent }} className="font-medium hover:underline">
            Post from your dashboard instead
          </a>
        </p>
      </div>
    </div>
  );
};
