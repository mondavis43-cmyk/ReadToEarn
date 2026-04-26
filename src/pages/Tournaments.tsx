import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from '../hooks/useNavigate';
import { ChevronLeft, Zap, BookOpen, Trophy, Copy, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

const FORMAT_OPTIONS = [
  { value: 'sprint', label: 'Sprint', icon: <Zap size={16} />, desc: '100% of prize pool to 1st place. Ranked by quiz accuracy + speed.' },
  { value: 'readathon', label: 'Read-A-Thon', icon: <BookOpen size={16} />, desc: '50/30/20 split. Ranked by pages read.' },
  { value: 'elimination', label: 'Elimination', icon: <Trophy size={16} />, desc: '50/30/20 split. Ranked by survival rounds.' },
] as const;

const ENTRY_FEE_OPTIONS = [5, 7, 10];

export const Tournaments = () => {
  const { isDark } = useTheme();
  const { navigateTo } = useNavigate();

  const textPrimary = isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]';
  const textMuted = isDark ? 'text-[#F5F0E8]/70' : 'text-[#1B2A4A]/70';
  const cardBg = isDark ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20' : 'bg-white border-[#D4A843]/30';
  const inputClass = `w-full px-3 py-2.5 rounded-lg border ${isDark ? 'border-[#D4A843]/20 bg-[#0F1923] text-[#F5F0E8]' : 'border-[#1B2A4A]/20 bg-white text-[#1B2A4A]'} text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A843]/40`;

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{ id: string; invite_code: string; title: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [format, setFormat] = useState<'sprint' | 'readathon' | 'elimination'>('sprint');
  const [entryFee, setEntryFee] = useState<number>(5);
  const [isPublic, setIsPublic] = useState(true);
  const [maxParticipants, setMaxParticipants] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) { navigateTo('/login'); return; }
      setUser(u);
    });
  }, []);

  const generateInviteCode = () =>
    Math.random().toString(36).substring(2, 8).toUpperCase();

  const handleCreate = async () => {
    setError('');
    if (!title.trim()) { setError('Tournament name is required.'); return; }
    if (!bookTitle.trim()) { setError('Book title is required.'); return; }
    if (!startsAt) { setError('Start date is required.'); return; }
    if (!endsAt) { setError('End date is required.'); return; }
    if (new Date(endsAt) <= new Date(startsAt)) { setError('End date must be after start date.'); return; }

    setLoading(true);
    const invite_code = generateInviteCode();

    const { data, error: insertError } = await supabase
      .from('tournaments')
      .insert({
        creator_id: user.id,
        title: title.trim(),
        book_title: bookTitle.trim(),
        book_author: bookAuthor.trim() || null,
        format,
        entry_fee: entryFee,
        prize_pool: 0,
        is_public: isPublic,
        invite_code,
        status: 'upcoming',
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
        max_participants: maxParticipants ? parseInt(maxParticipants) : null,
      })
      .select()
      .single();

    setLoading(false);

    if (insertError) {
      setError('Failed to create tournament. Please try again.');
      return;
    }

    setCreated({ id: data.id, invite_code: data.invite_code, title: data.title });
  };

  const handleCopy = () => {
    if (!created) return;
    const link = `${window.location.origin}/tournament/${created.id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (created) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-[#0F1923]' : 'bg-[#FAF8F5]'} flex items-center justify-center px-4`}>
        <div className={`rounded-2xl border ${cardBg} p-8 max-w-md w-full text-center`}>
          <div className="w-14 h-14 rounded-full bg-[#D4A843]/20 flex items-center justify-center mx-auto mb-4">
            <Trophy size={24} className="text-[#D4A843]" />
          </div>
          <h2 className={`font-serif text-2xl mb-2 ${textPrimary}`}>Tournament Created!</h2>
          <p className={`text-sm ${textMuted} mb-6`}>
            <span className="font-semibold text-[#D4A843]">{created.title}</span> is live. Share the link or invite code to get participants.
          </p>

          <div className={`rounded-xl border ${isDark ? 'border-[#D4A843]/20 bg-[#0F1923]' : 'border-[#D4A843]/30 bg-[#FAF8F5]'} p-4 mb-4`}>
            <p className={`text-xs ${textMuted} mb-1`}>Invite Code</p>
            <p className="text-2xl font-bold tracking-widest text-[#D4A843]">{created.invite_code}</p>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-2 mx-auto px-5 py-2.5 bg-[#D4A843] text-[#1B2A4A] rounded-xl text-sm font-semibold hover:bg-[#c49a3a] transition mb-4"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? 'Copied!' : 'Copy Tournament Link'}
          </button>

          <button
            onClick={() => navigateTo(`/tournament/${created.id}`)}
            className={`text-sm ${textMuted} hover:text-[#D4A843] transition underline`}
          >
            View Tournament Page →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0F1923]' : 'bg-[#FAF8F5]'}`}>
      <div className="max-w-xl mx-auto px-4 py-10">

        <button
          onClick={() => navigateTo('/competitions')}
          className={`flex items-center gap-1 text-sm ${textMuted} hover:text-[#D4A843] transition mb-6`}
        >
          <ChevronLeft size={16} /> Back to Competitions
        </button>

        <div className="mb-8">
          <h1 className={`font-serif text-3xl mb-2 ${textPrimary}`}>Create a Tournament</h1>
          <p className={`text-sm ${textMuted}`}>
            Set the book, format, and entry fee. Prize pool grows as participants join. Platform keeps 25%.
          </p>
        </div>

        <div className="space-y-6">

          {/* Tournament name */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>Tournament Name</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. Summer Sprint Showdown"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
            />
          </div>

          {/* Book */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>Book Title</label>
            <input
              type="text"
              className={inputClass}
              placeholder="The book participants will read"
              value={bookTitle}
              onChange={(e) => setBookTitle(e.target.value)}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>Author <span className={`font-normal ${textMuted}`}>(optional)</span></label>
            <input
              type="text"
              className={inputClass}
              placeholder="Book author"
              value={bookAuthor}
              onChange={(e) => setBookAuthor(e.target.value)}
            />
          </div>

          {/* Format */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Format</label>
            <div className="space-y-2">
              {FORMAT_OPTIONS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFormat(f.value)}
                  className={`w-full flex items-start gap-3 p-4 rounded-xl border text-left transition ${
                    format === f.value
                      ? 'border-[#D4A843] bg-[#D4A843]/10'
                      : isDark
                      ? 'border-[#D4A843]/20 hover:border-[#D4A843]/40'
                      : 'border-[#1B2A4A]/15 hover:border-[#D4A843]/40'
                  }`}
                >
                  <span className="text-[#D4A843] mt-0.5">{f.icon}</span>
                  <div>
                    <p className={`text-sm font-semibold ${textPrimary}`}>{f.label}</p>
                    <p className={`text-xs ${textMuted}`}>{f.desc}</p>
                  </div>
                  {format === f.value && (
                    <span className="ml-auto text-[#D4A843] text-xs font-bold">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Entry fee */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Entry Fee</label>
            <div className="flex gap-2">
              {ENTRY_FEE_OPTIONS.map((fee) => (
                <button
                  key={fee}
                  onClick={() => setEntryFee(fee)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition ${
                    entryFee === fee
                      ? 'bg-[#D4A843] text-[#1B2A4A] border-[#D4A843]'
                      : isDark
                      ? 'border-[#D4A843]/20 text-[#F5F0E8]/70 hover:border-[#D4A843]/40'
                      : 'border-[#1B2A4A]/20 text-[#1B2A4A]/70 hover:border-[#D4A843]/40'
                  }`}
                >
                  ${fee}
                </button>
              ))}
            </div>
            <p className={`text-xs mt-2 ${textMuted}`}>
              Prize pool = entry fees collected × 75% (platform keeps 25%)
            </p>
          </div>

          {/* Visibility */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Visibility</label>
            <div className="flex gap-2">
              {[{ val: true, label: 'Public', desc: 'Listed on Competitions page' }, { val: false, label: 'Private', desc: 'Invite code only' }].map((opt) => (
                <button
                  key={String(opt.val)}
                  onClick={() => setIsPublic(opt.val)}
                  className={`flex-1 py-3 px-4 rounded-xl border text-left transition ${
                    isPublic === opt.val
                      ? 'border-[#D4A843] bg-[#D4A843]/10'
                      : isDark
                      ? 'border-[#D4A843]/20 hover:border-[#D4A843]/40'
                      : 'border-[#1B2A4A]/15 hover:border-[#D4A843]/40'
                  }`}
                >
                  <p className={`text-sm font-semibold ${textPrimary}`}>{opt.label}</p>
                  <p className={`text-xs ${textMuted}`}>{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Max participants */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>
              Max Participants <span className={`font-normal ${textMuted}`}>(optional)</span>
            </label>
            <input
              type="number"
              className={inputClass}
              placeholder="Leave blank for unlimited"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(e.target.value)}
              min={2}
              max={1000}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>Start Date</label>
              <input
                type="datetime-local"
                className={inputClass}
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>End Date</label>
              <input
                type="datetime-local"
                className={inputClass}
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full py-3 bg-[#D4A843] text-[#1B2A4A] rounded-xl font-semibold text-sm hover:bg-[#c49a3a] disabled:opacity-50 transition"
          >
            {loading ? 'Creating...' : 'Create Tournament'}
          </button>

          <p className={`text-xs text-center ${textMuted}`}>
            Once created, share your invite code or link. Participants pay the entry fee to join. Prize pool is distributed automatically when the tournament ends.
          </p>
        </div>
      </div>
    </div>
  );
};
