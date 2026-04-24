import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../hooks/useNavigate';
import { useTheme } from '../contexts/ThemeContext';
import { ArrowLeft, Check, ExternalLink, Trophy, Zap, Bell, BellOff } from 'lucide-react';

interface Book {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  page_count: number;
  book_type: 'platform' | 'sponsored';
  description: string | null;
  genre: string | null;
  geniuslink_url: string | null;
}

interface Trope {
  id: string;
  name: string;
}

interface BookTrope {
  id: string;
  trope_id: string;
  tropes: { name: string };
}

interface TropeSuggestion {
  id: string;
  suggested_name: string;
  status: string;
}

interface Competition {
  id: string;
  title: string;
  format: string;
  entry_fee: number;
  prize_pool: number;
  status: string;
  ends_at: string | null;
}

interface Bounty {
  id: string;
  pool_amount: number;
  per_pass_amount: number;
  passes_remaining: number;
  status: string;
}

export const BookPage = () => {
  const { user } = useAuth();
  const { navigateTo } = useNavigate();
  const { isDark } = useTheme();

  const [book, setBook] = useState<Book | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  const [bookTropes, setBookTropes] = useState<BookTrope[]>([]);
  const [allTropes, setAllTropes] = useState<Trope[]>([]);
  const [selectedTropeId, setSelectedTropeId] = useState('');
  const [customTrope, setCustomTrope] = useState('');
  const [userSuggestions, setUserSuggestions] = useState<TropeSuggestion[]>([]);
  const [tropeMessage, setTropeMessage] = useState('');

  const [activeBounty, setActiveBounty] = useState<Bounty | null>(null);
  const [activeCompetitions, setActiveCompetitions] = useState<Competition[]>([]);
  const [pastCompetitions, setPastCompetitions] = useState<Competition[]>([]);
  const [isNotified, setIsNotified] = useState(false);
  const [notifyLoading, setNotifyLoading] = useState(false);

  const bookId = window.location.pathname.split('/').pop();
  const isAdmin = user?.email === 'mondavis43@gmail.com';

  // Quiz is unlocked only when there's an active bounty or active competition
  const quizUnlocked = !!activeBounty || activeCompetitions.length > 0;

  // Theme helpers
  const bg = isDark ? 'bg-[#0f1623]' : 'bg-[#F5F0E8]';
  const textPrimary = isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]';
  const textMuted = isDark ? 'text-[#F5F0E8]/60' : 'text-[#1B2A4A]/60';
  const textFaint = isDark ? 'text-[#F5F0E8]/40' : 'text-[#1B2A4A]/40';
  const borderFaint = isDark ? 'border-[#F5F0E8]/10' : 'border-[#1B2A4A]/10';
  const cardBg = isDark
    ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20'
    : 'bg-white border-[#D4A843]/30';
  const inputCls = `flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4A843] transition ${
    isDark
      ? 'bg-[#F5F0E8]/5 border-[#F5F0E8]/15 text-[#F5F0E8] placeholder-[#F5F0E8]/30'
      : 'bg-white border-[#1B2A4A]/15 text-[#1B2A4A] placeholder-[#1B2A4A]/30'
  }`;

  useEffect(() => {
    loadBook();
  }, [user]);

  useEffect(() => {
    if (book) {
      loadTropes();
      loadEarningEvents();
      loadNotifyStatus();
    }
  }, [book, user]);

  const loadBook = async () => {
    if (!user || !bookId) return;

    const [bookResult, completedResult] = await Promise.all([
      supabase.from('books').select('*').eq('id', bookId).maybeSingle(),
      supabase
        .from('completed_books')
        .select('id')
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .maybeSingle(),
    ]);

    if (bookResult.data) setBook(bookResult.data);
    setIsCompleted(!!completedResult.data);
    setLoading(false);
  };

  const loadTropes = async () => {
    if (!book) return;

    const [bookTropesResult, allTropesResult, suggestionsResult] = await Promise.all([
      supabase.from('book_tropes').select('id, trope_id, tropes(name)').eq('book_id', book.id),
      supabase.from('tropes').select('*').order('name'),
      user
        ? supabase
            .from('trope_suggestions')
            .select('id, suggested_name, status')
            .eq('book_id', book.id)
            .eq('user_id', user.id)
        : Promise.resolve({ data: [] }),
    ]);

    if (bookTropesResult.data) setBookTropes(bookTropesResult.data as BookTrope[]);
    if (allTropesResult.data) setAllTropes(allTropesResult.data);
    if (suggestionsResult.data) setUserSuggestions(suggestionsResult.data);
  };

  const loadEarningEvents = async () => {
    if (!book) return;

    const [bountyResult, activeCompResult, pastCompResult] = await Promise.all([
      supabase
        .from('bounties')
        .select('id, pool_amount, per_pass_amount, passes_remaining, status')
        .eq('book_id', book.id)
        .eq('status', 'active')
        .maybeSingle(),
      supabase
        .from('competitions')
        .select('id, title, format, entry_fee, prize_pool, status, ends_at')
        .contains('book_ids', [book.id])
        .eq('status', 'active'),
      supabase
        .from('competitions')
        .select('id, title, format, entry_fee, prize_pool, status, ends_at')
        .contains('book_ids', [book.id])
        .eq('status', 'completed')
        .order('ends_at', { ascending: false })
        .limit(3),
    ]);

    if (bountyResult.data) setActiveBounty(bountyResult.data);
    if (activeCompResult.data) setActiveCompetitions(activeCompResult.data);
    if (pastCompResult.data) setPastCompetitions(pastCompResult.data);
  };

  const loadNotifyStatus = async () => {
    if (!user || !book) return;
    const { data } = await supabase
      .from('book_notifications')
      .select('id')
      .eq('user_id', user.id)
      .eq('book_id', book.id)
      .maybeSingle();
    setIsNotified(!!data);
  };

  const handleToggleNotify = async () => {
    if (!user || !book) return;
    setNotifyLoading(true);

    if (isNotified) {
      await supabase
        .from('book_notifications')
        .delete()
        .eq('user_id', user.id)
        .eq('book_id', book.id);
      setIsNotified(false);
    } else {
      await supabase.from('book_notifications').insert({
        user_id: user.id,
        book_id: book.id,
      });
      setIsNotified(true);
    }

    setNotifyLoading(false);
  };

  const handleAddTrope = async () => {
    if (!book || !selectedTropeId) return;
    setTropeMessage('');

    const { error } = await supabase.from('book_tropes').insert({
      book_id: book.id,
      trope_id: selectedTropeId,
      added_by: user?.id,
      added_by_role: 'admin',
    });

    if (error) {
      setTropeMessage(error.message);
    } else {
      setSelectedTropeId('');
      loadTropes();
    }
  };

  const handleRemoveTrope = async (bookTropeId: string) => {
    await supabase.from('book_tropes').delete().eq('id', bookTropeId);
    loadTropes();
  };

  const handleSuggestTrope = async () => {
    if (!book || !customTrope.trim() || !user) return;
    setTropeMessage('');

    const { error } = await supabase.from('trope_suggestions').insert({
      book_id: book.id,
      user_id: user.id,
      suggested_name: customTrope.trim(),
    });

    if (error) {
      setTropeMessage(error.message);
    } else {
      setCustomTrope('');
      setTropeMessage('Suggestion submitted for review!');
      loadTropes();
    }
  };

  const formatCompFormat = (format: string) => {
    if (format === 'sprint') return 'Sprint';
    if (format === 'readathon') return 'Read-A-Thon';
    if (format === 'elimination') return 'Elimination Bracket';
    return format;
  };

  const formatTimeLeft = (endsAt: string | null) => {
    if (!endsAt) return null;
    const diff = new Date(endsAt).getTime() - Date.now();
    if (diff <= 0) return 'Ending soon';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d left`;
    return `${hours}h left`;
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${bg}`}>
        <div className={textPrimary}>Loading...</div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${bg}`}>
        <p className="text-red-400">Book not found.</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${bg}`}>

      {/* Header */}
      <header className={`border-b ${borderFaint}`}>
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center gap-4">
          <button
            onClick={() => navigateTo('/')}
            className={`transition ${textFaint} hover:${textPrimary}`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className={`font-serif text-3xl ${textPrimary}`}>Book Details</h1>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row gap-10">

          {/* Cover */}
          <div className="flex-shrink-0">
            <div className={`w-48 rounded-lg overflow-hidden border ${borderFaint}`}>
              {book.cover_url ? (
                <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full aspect-[2/3] ${isDark ? 'bg-[#F5F0E8]/5' : 'bg-[#1B2A4A]/5'}`} />
              )}
            </div>
          </div>

          {/* Details */}
          <div className="flex-1">
            <h2 className={`font-serif text-4xl mb-2 ${textPrimary}`}>{book.title}</h2>
            <p className={`text-lg mb-1 ${textMuted}`}>{book.author}</p>
            <div className={`flex items-center gap-3 text-sm mb-6 ${textFaint}`}>
              <span>{book.page_count} pages</span>
              {book.genre && (
                <>
                  <span>·</span>
                  <span>{book.genre}</span>
                </>
              )}
            </div>

            {/* Earning Events */}
            <div className="space-y-3 mb-8">

              {/* Active Bounty */}
              {activeBounty && (
                <div className={`rounded-xl border p-4 ${cardBg}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className="w-4 h-4 text-[#D4A843]" />
                        <span className="text-xs font-semibold uppercase tracking-wide text-[#D4A843]">
                          Active Bounty
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-[#D4A843]">
                        ${activeBounty.per_pass_amount.toFixed(2)}{' '}
                        <span className={`text-sm font-normal ${textMuted}`}>per quiz pass</span>
                      </p>
                      <p className={`text-sm mt-1 ${textMuted}`}>
                        ${activeBounty.pool_amount.toFixed(0)} pool · {activeBounty.passes_remaining} passes remaining
                      </p>
                    </div>
                    <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-1 rounded-full font-medium shrink-0">
                      Live
                    </span>
                  </div>
                </div>
              )}

              {/* Active Competitions */}
              {activeCompetitions.length > 0 && (
                <div className={`rounded-xl border p-4 ${cardBg}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="w-4 h-4 text-[#D4A843]" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#D4A843]">
                      Featured in {activeCompetitions.length === 1 ? 'a Competition' : `${activeCompetitions.length} Competitions`}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {activeCompetitions.map((comp) => (
                      <div key={comp.id} className="flex items-center justify-between text-sm">
                        <div>
                          <span className={`font-medium ${textPrimary}`}>{comp.title}</span>
                          <span className={`ml-2 text-xs ${textFaint}`}>{formatCompFormat(comp.format)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[#D4A843] font-semibold">
                            ${comp.prize_pool.toFixed(0)} pool
                          </span>
                          {comp.ends_at && (
                            <span className={`text-xs ${textFaint}`}>{formatTimeLeft(comp.ends_at)}</span>
                          )}
                          <button
                            onClick={() => navigateTo(`/competition/${comp.id}`)}
                            className={`text-xs px-3 py-1 rounded-full border transition ${
                              isDark
                                ? 'border-[#D4A843]/30 text-[#D4A843] hover:bg-[#D4A843]/10'
                                : 'border-[#D4A843]/50 text-[#D4A843] hover:bg-[#D4A843]/10'
                            }`}
                          >
                            Enter
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quiz locked state */}
              {!quizUnlocked && !isCompleted && (
                <div className={`rounded-xl border p-5 ${isDark ? 'bg-[#1B2A4A]/30 border-[#F5F0E8]/10' : 'bg-[#1B2A4A]/5 border-[#1B2A4A]/10'}`}>
                  <p className={`text-sm font-medium mb-1 ${textPrimary}`}>
                    Quiz unlocks when this book enters a competition or bounty.
                  </p>
                  <p className={`text-xs mb-4 ${textFaint}`}>
                    Get notified the moment this book goes live for earning.
                  </p>
                  <button
                    onClick={handleToggleNotify}
                    disabled={notifyLoading}
                    className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border transition disabled:opacity-50 ${
                      isNotified
                        ? isDark
                          ? 'bg-[#D4A843]/10 border-[#D4A843]/30 text-[#D4A843]'
                          : 'bg-[#D4A843]/15 border-[#D4A843]/40 text-[#D4A843]'
                        : isDark
                        ? 'bg-[#F5F0E8]/5 border-[#F5F0E8]/15 text-[#F5F0E8] hover:border-[#D4A843]/40'
                        : 'bg-white border-[#1B2A4A]/15 text-[#1B2A4A] hover:border-[#D4A843]'
                    }`}
                  >
                    {isNotified ? (
                      <>
                        <BellOff className="w-4 h-4" />
                        Notifications On — tap to remove
                      </>
                    ) : (
                      <>
                        <Bell className="w-4 h-4" />
                        Notify Me
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Description */}
            {book.description && (
              <div className="mb-8">
                <h3 className={`font-medium mb-2 ${textPrimary}`}>About this book</h3>
                <p className={`leading-relaxed ${textMuted}`}>{book.description}</p>
              </div>
            )}

            {/* Past Competitions */}
            {pastCompetitions.length > 0 && (
              <div className={`mb-8 pt-6 border-t ${borderFaint}`}>
                <h3 className={`font-medium mb-3 ${textPrimary}`}>Past Competitions</h3>
                <div className="space-y-2">
                  {pastCompetitions.map((comp) => (
                    <div key={comp.id} className={`flex items-center justify-between text-sm ${textMuted}`}>
                      <span>{comp.title}</span>
                      <span className={`text-xs ${textFaint}`}>{formatCompFormat(comp.format)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tropes */}
            <div className={`mb-8 pt-6 border-t ${borderFaint}`}>
              <h3 className={`font-medium mb-3 ${textPrimary}`}>Tropes</h3>

              {bookTropes.length > 0 ? (
                <div className="flex flex-wrap gap-2 mb-4">
                  {bookTropes.map((bt) => (
                    <div
                      key={bt.id}
                      className={`flex items-center gap-1 text-sm px-3 py-1.5 rounded-full border transition ${
                        isDark
                          ? 'bg-[#F5F0E8]/10 border-[#F5F0E8]/20 text-[#F5F0E8]'
                          : 'bg-[#1B2A4A]/10 border-[#1B2A4A]/20 text-[#1B2A4A]'
                      }`}
                    >
                      <span>{bt.tropes.name}</span>
                      {isAdmin && (
                        <button
                          onClick={() => handleRemoveTrope(bt.id)}
                          className={`ml-1 text-xs transition hover:text-red-400 ${textFaint}`}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`text-sm mb-4 ${textFaint}`}>No tropes added yet.</p>
              )}

              {isAdmin && (
                <div className="flex gap-2 mb-4">
                  <select
                    value={selectedTropeId}
                    onChange={(e) => setSelectedTropeId(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Select a trope to add...</option>
                    {allTropes
                      .filter((t) => !bookTropes.some((bt) => bt.trope_id === t.id))
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={handleAddTrope}
                    disabled={!selectedTropeId}
                    className="bg-[#1B2A4A] text-[#F5F0E8] text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#142038] transition disabled:opacity-40"
                  >
                    Add
                  </button>
                </div>
              )}

              {user && (
                <div>
                  <p className={`text-xs mb-2 ${textFaint}`}>
                    {isAdmin
                      ? 'Or add a new trope to the master list:'
                      : "Don't see the right trope? Suggest one for review:"}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customTrope}
                      onChange={(e) => setCustomTrope(e.target.value)}
                      placeholder="e.g. Morally Grey Protagonist"
                      className={inputCls}
                    />
                    <button
                      onClick={handleSuggestTrope}
                      disabled={!customTrope.trim()}
                      className="bg-[#D4A843] text-[#1B2A4A] text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#bf9538] transition disabled:opacity-40"
                    >
                      {isAdmin ? 'Add New' : 'Suggest'}
                    </button>
                  </div>

                  {!isAdmin && userSuggestions.filter((s) => s.status === 'pending').length > 0 && (
                    <div className="mt-3">
                      <p className={`text-xs mb-1 ${textFaint}`}>Your pending suggestions:</p>
                      <div className="flex flex-wrap gap-2">
                        {userSuggestions
                          .filter((s) => s.status === 'pending')
                          .map((s) => (
                            <span
                              key={s.id}
                              className="text-xs bg-[#D4A843]/10 border border-[#D4A843]/30 text-[#D4A843] px-3 py-1 rounded-full"
                            >
                              {s.suggested_name} (pending)
                            </span>
                          ))}
                      </div>
                    </div>
                  )}

                  {tropeMessage && (
                    <p className="text-sm text-[#D4A843] mt-2">{tropeMessage}</p>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              {book.geniuslink_url && (
                <a
                  href={book.geniuslink_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg border transition ${
                    isDark
                      ? 'bg-[#F5F0E8]/5 border-[#F5F0E8]/15 hover:border-[#F5F0E8]/30 text-[#F5F0E8]'
                      : 'bg-[#1B2A4A]/5 border-[#1B2A4A]/15 hover:border-[#1B2A4A]/30 text-[#1B2A4A]'
                  }`}
                >
                  <ExternalLink className="w-4 h-4" />
                  Buy This Book
                </a>
              )}

              {isCompleted ? (
                <div
                  className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg border ${
                    isDark
                      ? 'bg-[#D4A843]/10 border-[#D4A843]/30 text-[#D4A843]'
                      : 'bg-[#D4A843]/15 border-[#D4A843]/40 text-[#D4A843]'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  Completed
                </div>
              ) : quizUnlocked ? (
                <button
                  onClick={() => navigateTo(`/quiz/${book.id}`)}
                  className="px-6 py-3 bg-[#D4A843] text-[#1B2A4A] font-semibold rounded-lg hover:bg-[#D4A843]/90 transition"
                >
                  Take the Quiz
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
