import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from '../hooks/useNavigate';
import { supabase } from '../lib/supabase';
import { Trophy, Copy, Check, Zap, BookOpen, X, Search } from 'lucide-react';

type Format = 'sprint' | 'readathon' | 'elimination';

type Book = {
  id: string;
  title: string;
  author: string;
};

const generateInviteCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

// ─── Reusable searchable book picker ───────────────────────────────────────

const BookSearchInput = ({
  books,
  selected,
  onSelect,
  onRemove,
  multi = false,
  max = 1,
  isDark,
  textPrimary,
  textMuted,
}: {
  books: Book[];
  selected: Book[];
  onSelect: (book: Book) => void;
  onRemove: (id: string) => void;
  multi?: boolean;
  max?: number;
  isDark: boolean;
  textPrimary: string;
  textMuted: string;
}) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedIds = selected.map(b => b.id);

  const filtered = books.filter(b => {
    if (selectedIds.includes(b.id)) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q);
  });

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (book: Book) => {
    onSelect(book);
    setQuery('');
    if (!multi) setOpen(false);
  };

  const atMax = selected.length >= max;

  return (
    <div ref={ref} className="relative">
      {/* Selected tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selected.map(b => (
            <span
              key={b.id}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#D4A843]/20 text-[#D4A843] border border-[#D4A843]/30"
            >
              {b.title}
              <button
                onClick={() => onRemove(b.id)}
                className="hover:text-white transition-colors"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input — hide when single and already selected */}
      {(!atMax || multi) && (
        <div className="relative">
          <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
          <input
            className={`w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm transition-colors outline-none ${
              isDark
                ? 'bg-[#0f1623] border-[#D4A843]/20 text-[#F5F0E8] placeholder-[#F5F0E8]/30 focus:border-[#D4A843]/60'
                : 'bg-white border-[#1B2A4A]/20 text-[#1B2A4A] placeholder-[#1B2A4A]/30 focus:border-[#1B2A4A]/60'
            }`}
            placeholder={
              atMax
                ? `Max ${max} book${max > 1 ? 's' : ''} selected`
                : multi
                ? `Search books... (${selected.length}/${max} selected)`
                : 'Search by title or author...'
            }
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            disabled={atMax && !multi}
          />
        </div>
      )}

      {/* Dropdown */}
      {open && !atMax && (
        <div className={`absolute z-50 w-full mt-1 rounded-lg border shadow-lg overflow-hidden ${
          isDark ? 'bg-[#0f1623] border-[#D4A843]/20' : 'bg-white border-[#1B2A4A]/20'
        }`}>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className={`px-4 py-3 text-sm ${textMuted}`}>
                {query ? `No books found for "${query}" — not in our system yet.` : 'No more books to select.'}
              </div>
            ) : (
              filtered.slice(0, 50).map(b => (
                <button
                  key={b.id}
                  onMouseDown={() => handleSelect(b)}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors border-b last:border-b-0 ${
                    isDark
                      ? 'border-[#D4A843]/10 text-[#F5F0E8] hover:bg-[#D4A843]/10'
                      : 'border-[#1B2A4A]/10 text-[#1B2A4A] hover:bg-[#D4A843]/10'
                  }`}
                >
                  <span className="font-medium">{b.title}</span>
                  <span className={`ml-2 text-xs ${textMuted}`}>— {b.author}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main component ─────────────────────────────────────────────────────────

export const Tournaments = () => {
  const { isDark, toggleTheme } = useTheme();
  const { navigateTo } = useNavigate();

  const textPrimary = isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]';
  const textMuted = isDark ? 'text-[#F5F0E8]/70' : 'text-[#1B2A4A]/70';
  const cardBg = isDark ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20' : 'bg-white border-[#D4A843]/30';
  const inputClass = `w-full px-4 py-2.5 rounded-lg border text-sm transition-colors outline-none ${
    isDark
      ? 'bg-[#0f1623] border-[#D4A843]/20 text-[#F5F0E8] placeholder-[#F5F0E8]/30 focus:border-[#D4A843]/60'
      : 'bg-white border-[#1B2A4A]/20 text-[#1B2A4A] placeholder-[#1B2A4A]/30 focus:border-[#1B2A4A]/60'
  }`;

  const [books, setBooks] = useState<Book[]>([]);
  const [title, setTitle] = useState('');
  const [format, setFormat] = useState<Format>('sprint');

  // Sprint: single book
  const [sprintBook, setSprintBook] = useState<Book[]>([]);
  // Elimination: up to 3 books
  const [elimBooks, setElimBooks] = useState<Book[]>([]);

  const [entryFee, setEntryFee] = useState<5 | 7 | 10>(5);
  const [isPublic, setIsPublic] = useState(true);
  const [maxParticipants, setMaxParticipants] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [tournamentId, setTournamentId] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase
  .from('books')
  .select('id, title, author')
  .eq('on_bulletin', false)
  .order('title', { ascending: true })
  }, []);

  useEffect(() => {
    setSprintBook([]);
    setElimBooks([]);
  }, [format]);

  const handleSubmit = async () => {
    setError('');

    if (!title.trim()) { setError('Tournament title is required.'); return; }
    if (format === 'sprint' && sprintBook.length === 0) { setError('Please select a book for Sprint.'); return; }
    if (format === 'elimination' && elimBooks.length < 2) { setError('Please select 3 books for Elimination.'); return; }
    if (!startsAt || !endsAt) { setError('Start and end dates are required.'); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigateTo('/login'); return; }

    setSubmitting(true);
    const code = generateInviteCode();

    let bookTitle: string | null = null;
    let bookAuthor: string | null = null;
    let bookIds: string[] = [];

    if (format === 'sprint' && sprintBook[0]) {
      bookTitle = sprintBook[0].title;
      bookAuthor = sprintBook[0].author;
      bookIds = [sprintBook[0].id];
    } else if (format === 'elimination') {
      bookTitle = elimBooks.map(b => b.title).join(', ');
      bookAuthor = elimBooks.map(b => b.author).join(', ');
      bookIds = elimBooks.map(b => b.id);
    }

    const { data, error: insertError } = await supabase
      .from('tournaments')
      .insert({
        creator_id: user.id,
        title: title.trim(),
        format,
        book_title: bookTitle,
        book_author: bookAuthor,
        book_ids: bookIds,
        entry_fee: entryFee,
        is_public: isPublic,
        invite_code: code,
        max_participants: maxParticipants ? parseInt(maxParticipants) : null,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
        status: 'upcoming',
        prize_pool: 0,
      })
      .select()
      .single();

    setSubmitting(false);

    if (insertError || !data) {
      setError('Something went wrong. Please try again.');
      return;
    }

    setInviteCode(code);
    setTournamentId(data.id);
    setSuccess(true);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/tournament/${tournamentId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatOptions: { key: Format; label: string; icon: React.ReactNode; desc: string }[] = [
    { key: 'sprint', label: 'Sprint', icon: <Zap size={15} />, desc: 'One book, fastest accurate readers win. 100% of prize pool to 1st place.' },
    { key: 'readathon', label: 'Read-A-Thon', icon: <BookOpen size={15} />, desc: 'Readers track pages across any books they choose. Top 3 split 50/30/20.' },
    { key: 'elimination', label: 'Elimination', icon: <Trophy size={15} />, desc: 'Multi-book bracket. Pick 3 books. Top 3 split 50/30/20.' },
  ];

  if (success) {
    return (
      <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#0f1623]' : 'bg-[#F5F0E8]'}`}>
        <div className={`border-b transition-colors duration-300 ${isDark ? 'border-[#1B2A4A] bg-[#0f1623]' : 'border-[#D4A843]/30 bg-[#F5F0E8]'}`}>
          <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
            <button onClick={() => navigateTo('/')} className={`font-serif text-lg font-bold ${isDark ? 'text-[#D4A843]' : 'text-[#1B2A4A]'}`}>Read to Earn</button>
            <button onClick={toggleTheme} className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${isDark ? 'border-[#D4A843]/40 text-[#D4A843]' : 'border-[#1B2A4A]/30 text-[#1B2A4A]'}`}>{isDark ? '☀ Light' : '☾ Dark'}</button>
          </div>
        </div>
        <div className="max-w-xl mx-auto px-4 py-20 text-center">
          <div className="text-5xl mb-6">🏆</div>
          <h1 className={`font-serif text-3xl mb-3 ${textPrimary}`}>Tournament Created!</h1>
          <p className={`text-sm mb-8 ${textMuted}`}>Share the link or invite code with participants.</p>
          <div className={`rounded-xl border p-6 mb-6 ${cardBg}`}>
            <p className={`text-xs mb-1 ${textMuted}`}>Invite Code</p>
            <p className="font-mono text-3xl font-bold text-[#D4A843] mb-4">{inviteCode}</p>
            <button
              onClick={copyLink}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#D4A843] text-[#1B2A4A] text-sm font-semibold rounded-lg hover:bg-[#c49a3a] transition"
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? 'Copied!' : 'Copy Tournament Link'}
            </button>
          </div>
          <button onClick={() => navigateTo(`/tournament/${tournamentId}`)} className={`text-sm ${textMuted} hover:underline`}>
            View Tournament Page →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#0f1623]' : 'bg-[#F5F0E8]'}`}>
      <div className={`border-b transition-colors duration-300 ${isDark ? 'border-[#1B2A4A] bg-[#0f1623]' : 'border-[#D4A843]/30 bg-[#F5F0E8]'}`}>
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <button onClick={() => navigateTo('/')} className={`font-serif text-lg font-bold ${isDark ? 'text-[#D4A843]' : 'text-[#1B2A4A]'}`}>Read to Earn</button>
          <button onClick={toggleTheme} className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${isDark ? 'border-[#D4A843]/40 text-[#D4A843]' : 'border-[#1B2A4A]/30 text-[#1B2A4A]'}`}>{isDark ? '☀ Light' : '☾ Dark'}</button>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-16">
        <h1 className={`font-serif text-4xl mb-2 ${textPrimary}`}>Create a Tournament</h1>
        <p className={`text-sm mb-10 ${textMuted}`}>Any reader can create a public or private tournament. Pick the book, format, rules, and entry fee. Prize pool grows from entry fees — platform keeps 25%.</p>

        <div className="space-y-6">

          {/* Title */}
          <div>
            <label className={`block text-xs mb-1.5 ${textMuted}`}>Tournament Title</label>
            <input className={inputClass} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Summer Sprint Challenge" />
          </div>

          {/* Format */}
          <div>
            <label className={`block text-xs mb-2 ${textMuted}`}>Format</label>
            <div className="space-y-2">
              {formatOptions.map(({ key, label, icon, desc }) => (
                <button
                  key={key}
                  onClick={() => setFormat(key)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                    format === key
                      ? 'border-[#D4A843] bg-[#D4A843]/10'
                      : isDark
                      ? 'border-[#D4A843]/20 hover:border-[#D4A843]/40'
                      : 'border-[#1B2A4A]/20 hover:border-[#1B2A4A]/40'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[#D4A843]">{icon}</span>
                    <span className={`text-sm font-semibold ${textPrimary}`}>{label}</span>
                  </div>
                  <p className={`text-xs ${textMuted}`}>{desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Book — Sprint: single searchable */}
          {format === 'sprint' && (
            <div>
              <label className={`block text-xs mb-1.5 ${textMuted}`}>
                Book <span className="text-red-400">*</span>
              </label>
              <BookSearchInput
                books={books}
                selected={sprintBook}
                onSelect={b => setSprintBook([b])}
                onRemove={() => setSprintBook([])}
                multi={false}
                max={1}
                isDark={isDark}
                textPrimary={textPrimary}
                textMuted={textMuted}
              />
            </div>
          )}

          {/* Book — Read-A-Thon: open format, no selection */}
          {format === 'readathon' && (
            <div className={`rounded-lg border px-4 py-3 text-sm ${isDark ? 'border-[#D4A843]/20 text-[#F5F0E8]/60' : 'border-[#1B2A4A]/20 text-[#1B2A4A]/60'}`}>
              📚 Read-A-Thon is open format — participants track pages across any books they choose. No book selection needed.
            </div>
          )}

          {/* Book — Elimination: multi searchable up to 3 */}
          {format === 'elimination' && (
            <div>
              <label className={`block text-xs mb-1.5 ${textMuted}`}>
                Books <span className="text-red-400">*</span>
                <span className={`ml-2 ${textMuted}`}>(select 3 books)</span>
              </label>
              <BookSearchInput
                books={books}
                selected={elimBooks}
                onSelect={b => setElimBooks(prev => [...prev, b])}
                onRemove={id => setElimBooks(prev => prev.filter(b => b.id !== id))}
                multi={true}
                max={3}
                isDark={isDark}
                textPrimary={textPrimary}
                textMuted={textMuted}
              />
            </div>
          )}

          {/* Entry Fee */}
          <div>
            <label className={`block text-xs mb-2 ${textMuted}`}>Entry Fee</label>
            <div className="flex gap-2">
              {([5, 7, 10] as const).map(fee => (
                <button
                  key={fee}
                  onClick={() => setEntryFee(fee)}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-lg border transition-colors ${
                    entryFee === fee
                      ? 'bg-[#D4A843] text-[#1B2A4A] border-[#D4A843]'
                      : isDark
                      ? 'border-[#D4A843]/20 text-[#F5F0E8]/60 hover:border-[#D4A843]/40'
                      : 'border-[#1B2A4A]/20 text-[#1B2A4A]/60 hover:border-[#1B2A4A]/40'
                  }`}
                >
                  ${fee}
                </button>
              ))}
            </div>
          </div>

          {/* Visibility */}
          <div>
            <label className={`block text-xs mb-2 ${textMuted}`}>Visibility</label>
            <div className="flex gap-2">
              {[{ val: true, label: 'Public' }, { val: false, label: 'Private (invite only)' }].map(({ val, label }) => (
                <button
                  key={String(val)}
                  onClick={() => setIsPublic(val)}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
                    isPublic === val
                      ? 'bg-[#D4A843] text-[#1B2A4A] border-[#D4A843]'
                      : isDark
                      ? 'border-[#D4A843]/20 text-[#F5F0E8]/60 hover:border-[#D4A843]/40'
                      : 'border-[#1B2A4A]/20 text-[#1B2A4A]/60 hover:border-[#1B2A4A]/40'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Max Participants */}
          <div>
            <label className={`block text-xs mb-1.5 ${textMuted}`}>Max Participants <span className={textMuted}>(optional)</span></label>
            <input className={inputClass} type="number" min="2" value={maxParticipants} onChange={e => setMaxParticipants(e.target.value)} placeholder="Leave blank for unlimited" />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs mb-1.5 ${textMuted}`}>Start Date</label>
              <input className={inputClass} type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} />
            </div>
            <div>
              <label className={`block text-xs mb-1.5 ${textMuted}`}>End Date</label>
              <input className={inputClass} type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3 bg-[#D4A843] text-[#1B2A4A] font-semibold rounded-lg hover:bg-[#c49a3a] transition disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Tournament'}
          </button>

        </div>
      </div>
    </div>
  );
};
