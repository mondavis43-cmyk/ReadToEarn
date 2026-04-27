import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from '../hooks/useNavigate';
import { useTheme } from '../contexts/ThemeContext';

interface AMARequest {
  id: string;
  proposed_topic: string;
  proposed_date: string | null;
  bio_blurb: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
}

export const AMARequest = () => {
  const { navigateTo } = useNavigate();
  const { isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAuthor, setIsAuthor] = useState(false);
  const [existing, setExisting] = useState<AMARequest | null>(null);
  const [form, setForm] = useState({
    proposed_topic: '',
    proposed_date: '',
    bio_blurb: '',
  });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const textPrimary = isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]';
  const textMuted = isDark ? 'text-[#F5F0E8]/70' : 'text-[#1B2A4A]/70';
  const cardBg = isDark ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20' : 'bg-white border-[#D4A843]/30';
  const inputClass = 'w-full px-3 py-2 rounded-lg border border-[#e8e0d5] dark:border-gray-700 bg-white dark:bg-gray-800 text-[#1B2A4A] dark:text-[#F5F0E8] text-sm focus:outline-none focus:ring-2';

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigateTo('/login'); return; }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'author') {
      setIsAuthor(false);
      setLoading(false);
      return;
    }
    setIsAuthor(true);

    const { data: req } = await supabase
      .from('ama_requests')
      .select('*')
      .eq('author_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    setExisting(req ?? null);
    setLoading(false);
  }

  async function handleSubmit() {
    if (!form.proposed_topic.trim()) { setError('Please enter a proposed topic.'); return; }
    setSaving(true);
    setError('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error: err } = await supabase.from('ama_requests').insert({
      author_id: user.id,
      proposed_topic: form.proposed_topic.trim(),
      proposed_date: form.proposed_date || null,
      bio_blurb: form.bio_blurb.trim() || null,
      status: 'pending',
    });

    if (err) {
      setError(err.code === '23505'
        ? 'You already have a pending AMA request.'
        : 'Failed to submit. Please try again.');
      setSaving(false);
      return;
    }

    setSuccess('Request submitted! We\'ll review it and get back to you.');
    setSaving(false);
    loadData();
  }

  const statusBadge = (status: string) => {
    if (status === 'pending') return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    if (status === 'approved') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
  };

  if (loading) return (
    <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#0f1623]' : 'bg-[#F5F0E8]'}`}>
      <p className={textMuted}>Loading...</p>
    </div>
  );

  if (!isAuthor) return (
    <div className={`min-h-screen flex flex-col items-center justify-center gap-4 ${isDark ? 'bg-[#0f1623]' : 'bg-[#F5F0E8]'}`}>
      <p className={`text-lg font-semibold ${textPrimary}`}>Author accounts only</p>
      <p className={textMuted}>You need an author account to request an AMA.</p>
      <button onClick={() => navigateTo('/')} className="text-sm text-[#D4A843] hover:underline">Back to home</button>
    </div>
  );

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#0f1623]' : 'bg-[#F5F0E8]'}`}>
      {/* Header */}
      <div className={`border-b ${isDark ? 'border-[#1B2A4A] bg-[#0f1623]' : 'border-[#D4A843]/30 bg-[#F5F0E8]'}`}>
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigateTo('/authors')} className={`text-sm ${textMuted} hover:${textPrimary} transition-colors`}>
            ← Authors
          </button>
          <span className={textMuted}>/</span>
          <span className={`text-sm font-medium ${textPrimary}`}>Request an AMA</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
        <div>
          <h1 className={`text-2xl font-bold font-serif ${textPrimary}`}>Request an Author AMA</h1>
          <p className={`mt-2 text-sm ${textMuted}`}>
            AMAs are free for authors. Readers submit questions, you answer them — creating a live event-like experience on the platform. We'll review your request and reach out to schedule it.
          </p>
        </div>

        {/* Existing request status */}
        {existing && (
          <div className={`rounded-xl border p-5 space-y-3 ${cardBg}`}>
            <div className="flex items-center justify-between">
              <p className={`text-sm font-semibold ${textPrimary}`}>Your current request</p>
              <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${statusBadge(existing.status)}`}>
                {existing.status}
              </span>
            </div>
            <p className={`text-sm ${textMuted}`}><span className="font-medium">Topic:</span> {existing.proposed_topic}</p>
            {existing.proposed_date && (
              <p className={`text-sm ${textMuted}`}><span className="font-medium">Preferred date:</span> {new Date(existing.proposed_date).toLocaleDateString()}</p>
            )}
            {existing.bio_blurb && (
              <p className={`text-sm ${textMuted}`}><span className="font-medium">Bio blurb:</span> {existing.bio_blurb}</p>
            )}
            {existing.status === 'rejected' && existing.admin_note && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-xs text-red-600 dark:text-red-400"><span className="font-semibold">Note from team:</span> {existing.admin_note}</p>
              </div>
            )}
            {existing.status === 'approved' && (
              <p className="text-xs text-green-600 dark:text-green-400">🎉 Approved! We'll be in touch to finalize your AMA date.</p>
            )}
          </div>
        )}

        {/* Form — only show if no pending request */}
        {(!existing || existing.status === 'rejected') && (
          <div className={`rounded-xl border p-6 space-y-5 ${cardBg}`}>
            <h2 className={`text-base font-semibold ${textPrimary}`}>
              {existing?.status === 'rejected' ? 'Submit a new request' : 'Tell us about your AMA'}
            </h2>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
            {success && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3">
                <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
              </div>
            )}

            <div>
              <label className={`text-xs font-medium ${textMuted} mb-1 block`}>Proposed topic <span className="text-red-400">*</span></label>
              <input
                className={inputClass}
                placeholder="e.g. Writing dark fantasy, my publishing journey, world-building tips..."
                value={form.proposed_topic}
                onChange={e => setForm({ ...form, proposed_topic: e.target.value })}
              />
            </div>

            <div>
              <label className={`text-xs font-medium ${textMuted} mb-1 block`}>Preferred date <span className={textMuted}>(optional)</span></label>
              <input
                type="date"
                className={inputClass}
                value={form.proposed_date}
                onChange={e => setForm({ ...form, proposed_date: e.target.value })}
              />
            </div>

            <div>
              <label className={`text-xs font-medium ${textMuted} mb-1 block`}>Short bio blurb <span className={textMuted}>(optional — shown to readers)</span></label>
              <textarea
                className={`${inputClass} resize-none`}
                rows={3}
                placeholder="A sentence or two about you and your work..."
                value={form.bio_blurb}
                onChange={e => setForm({ ...form, bio_blurb: e.target.value })}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={saving}
              className="w-full py-2.5 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-sm font-semibold hover:bg-[#c49a3a] disabled:opacity-50 transition-colors"
            >
              {saving ? 'Submitting...' : 'Submit AMA Request'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
