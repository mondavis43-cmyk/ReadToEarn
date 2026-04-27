import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from '../hooks/useNavigate';
import { Zap, BookOpen, Trophy, Clock, DollarSign, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Competition = {
  id: string;
  title: string;
  type: 'sprint' | 'readathon' | 'elimination';
  book_ids: string[];
  book_title?: string;
  book_author?: string;
  entry_fee: number;
  prize_pool: number;
  status: 'upcoming' | 'active' | 'completed' | 'canceled';
  is_sponsored: boolean;
  start_date: string;
  end_date: string;
  description?: string;
  rules?: string;
  pre_registration_count?: number;
};

type EliminationRound = {
  round: number;
  score: number;
  passed: boolean;
  submitted_at: string;
};

const formatIcon = (type: string) => {
  if (type === 'sprint') return <Zap size={20} className="text-[#D4A843]" />;
  if (type === 'readathon') return <BookOpen size={20} className="text-[#D4A843]" />;
  return <Trophy size={20} className="text-[#D4A843]" />;
};

const formatLabel = (type: string) => {
  if (type === 'sprint') return 'Sprint';
  if (type === 'readathon') return 'Read-A-Thon';
  return 'Elimination';
};

const LATE_FEE_MULTIPLIER = 2;

export const CompetitionDetail = () => {
  const { isDark, toggleTheme } = useTheme();
  const { navigateTo } = useNavigate();

  const id = window.location.pathname.split('/competition/')[1];

  const textPrimary = isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]';
  const textMuted = isDark ? 'text-[#F5F0E8]/70' : 'text-[#1B2A4A]/70';
  const cardBg = isDark ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20' : 'bg-white border-[#D4A843]/30';

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [alreadyEntered, setAlreadyEntered] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [preRegistered, setPreRegistered] = useState(false);
  const [preRegLoading, setPreRegLoading] = useState(false);
  // Elimination-specific
  const [elimProgress, setElimProgress] = useState<EliminationRound[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);

        const { data: entry } = await supabase
          .from('competition_entries')
          .select('id')
          .eq('competition_id', id)
          .eq('user_id', user.id)
          .maybeSingle();
        if (entry) setAlreadyEntered(true);

        // Check if user already pre-registered
const { data: preReg } = await supabase
  .from('pre_registrations')
  .select('id')
  .eq('competition_id', id)
  .eq('user_id', user.id)
  .maybeSingle();
if (preReg) setPreRegistered(true);

        // Load elimination progress if any
        const { data: progress } = await supabase
          .from('elimination_progress')
          .select('round, score, passed, submitted_at')
          .eq('competition_id', id)
          .eq('user_id', user.id)
          .order('round', { ascending: true });
        if (progress) setElimProgress(progress as EliminationRound[]);
      }

      const { data, error } = await supabase
        .from('competitions')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
      } else {
        setCompetition(data);
      }

      setLoading(false);
    };
    load();
  }, [id]);

  // Determine which round the user is on for elimination
  const getCurrentElimRound = (): number => {
    if (!elimProgress.length) return 1;
    const lastPassed = [...elimProgress].reverse().find(r => r.passed);
    if (!lastPassed) return 1; // failed round 1, can't advance
    return Math.min(lastPassed.round + 1, 3);
  };

  const isElimEliminated = (): boolean => {
    return elimProgress.some(r => !r.passed);
  };

  const isElimFinished = (): boolean => {
    return elimProgress.some(r => r.round === 3);
  };

  const handleEnter = async () => {
  if (!userId) { navigateTo('/signup'); return; }
  if (!competition) return;
  setError('');

  // Check if user pre-registered — if so, always use base fee
  const { data: preReg } = await supabase
    .from('pre_registrations')
    .select('id')
    .eq('competition_id', competition.id)
    .eq('user_id', userId)
    .maybeSingle();

  const now = new Date();
  const starts = new Date(competition.start_date);
  const isLate = now > starts && !preReg; // pre-registered users are never "late"
  const baseFee = competition.entry_fee;
  const actualFee = isLate ? baseFee * LATE_FEE_MULTIPLIER : baseFee;
  const amountCents = Math.round(actualFee * 100);

  (window as any).__checkoutItem = {
    type: 'competition_entry',
    label: isLate
      ? `Competition Entry (Late Fee) — ${competition.title}`
      : `Competition Entry — ${competition.title}`,
    amount: amountCents,
    metadata: {
      competition_id: competition.id,
      format: competition.type,
      title: competition.title,
      is_late_entry: isLate ? 'true' : 'false',
    },
  };

  (window as any).__pendingSubmission = {
    competition_id: competition.id,
    is_late_entry: isLate,
  };

  // Mark pre-registration as converted
  if (preReg) {
    await supabase
      .from('pre_registrations')
      .update({ converted: true })
      .eq('id', preReg.id);
  }

  window.history.pushState({}, '', '/checkout');
  window.dispatchEvent(new PopStateEvent('popstate'));
};

    const handlePreRegister = async () => {
  if (!userId) { navigateTo('/signup'); return; }
  if (!competition) return;
  setPreRegLoading(true);
  setError('');

  const { error } = await supabase
    .from('pre_registrations')
    .insert({
      competition_id: competition.id,
      user_id: userId,
      converted: false,
    });

  if (error) {
    setError('Could not pre-register. Please try again.');
  } else {
    setPreRegistered(true);
    // Increment the display count
    await supabase
      .from('competitions')
      .update({ pre_registration_count: (competition.pre_registration_count ?? 0) + 1 })
      .eq('id', competition.id);
  }
  setPreRegLoading(false);
};

    const now = new Date();
    const starts = new Date(competition.start_date);
    const isLate = now > starts;
    const baseFee = competition.entry_fee;
    const actualFee = isLate ? baseFee * LATE_FEE_MULTIPLIER : baseFee;
    const amountCents = Math.round(actualFee * 100);

    (window as any).__checkoutItem = {
      type: 'competition_entry',
      label: isLate
        ? `Competition Entry (Late Fee) — ${competition.title}`
        : `Competition Entry — ${competition.title}`,
      amount: amountCents,
      metadata: {
        competition_id: competition.id,
        format: competition.type,
        title: competition.title,
        is_late_entry: isLate ? 'true' : 'false',
      },
    };

    (window as any).__pendingSubmission = {
      competition_id: competition.id,
      is_late_entry: isLate,
    };

    window.history.pushState({}, '', '/checkout');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleTakeQuiz = () => {
    if (!competition) return;
    const round = getCurrentElimRound();
    // book_ids is 1-indexed in meaning but 0-indexed in array
    const bookId = competition.book_ids?.[round - 1];
    if (!bookId) return;

    if (competition.type === 'elimination') {
      navigateTo(`/quiz/${bookId}?competition=${competition.id}&round=${round}`);
    } else {
      // Sprint / Read-A-Thon — use first book
      const sprintBookId = competition.book_ids?.[0];
      if (!sprintBookId) return;
      navigateTo(`/quiz/${sprintBookId}?competition=${competition.id}&round=1`);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#0f1623]' : 'bg-[#F5F0E8]'}`}>
        <div className="w-8 h-8 border-2 border-[#D4A843] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !competition) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#0f1623]' : 'bg-[#F5F0E8]'}`}>
        <div className="text-center">
          <p className={`font-serif text-2xl mb-3 ${textPrimary}`}>Competition not found</p>
          <p className={`text-sm mb-6 ${textMuted}`}>It may have ended or the link is invalid.</p>
          <button
            onClick={() => navigateTo('/competitions')}
            className="bg-[#D4A843] text-[#1B2A4A] font-semibold px-6 py-3 rounded-xl hover:bg-[#c49a3a] transition"
          >
            Browse Competitions
          </button>
        </div>
      </div>
    );
  }

  const starts = new Date(competition.start_date);
  const ends = new Date(competition.end_date);
  const now = new Date();
  const isActive = competition.status === 'active';
  const isUpcoming = competition.status === 'upcoming';
  const isCompleted = competition.status === 'completed' || competition.status === 'canceled';
  const isLateEntry = isActive && now > starts;
  const lateFee = competition.entry_fee * LATE_FEE_MULTIPLIER;

  const timeLabel = isCompleted
    ? `Ended ${ends.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
    : isActive
    ? `Ends ${ends.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} at ${ends.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    : `Opens ${starts.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} at ${starts.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;

  const currentRound = getCurrentElimRound();
  const eliminated = isElimEliminated();
  const elimDone = isElimFinished();

  // Elimination round status labels
  const roundLabels = ['Round 1', 'Round 2', 'Final Round'];
  const roundThresholds = ['8/10 to advance', '9/10 to advance', 'Highest score wins'];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#0f1623]' : 'bg-[#F5F0E8]'}`}>

      {/* Header */}
      <div className={`border-b transition-colors duration-300 ${isDark ? 'border-[#1B2A4A] bg-[#0f1623]' : 'border-[#D4A843]/30 bg-[#F5F0E8]'}`}>
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <button
            onClick={() => navigateTo('/competitions')}
            className={`font-serif text-lg font-bold transition-colors ${isDark ? 'text-[#D4A843]' : 'text-[#1B2A4A]'}`}
          >
            ← Competitions
          </button>
          <button
            onClick={toggleTheme}
            className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
              isDark
                ? 'border-[#D4A843]/40 text-[#D4A843] hover:bg-[#D4A843]/10'
                : 'border-[#1B2A4A]/30 text-[#1B2A4A] hover:bg-[#1B2A4A]/10'
            }`}
          >
            {isDark ? '☀ Light' : '☾ Dark'}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-16">

        {/* Format badge + title */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            {formatIcon(competition.type)}
            <span className="text-xs font-semibold text-[#D4A843] uppercase tracking-wide">
              {formatLabel(competition.type)}
            </span>
            {competition.is_sponsored && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#D4A843]/15 text-[#D4A843] border border-[#D4A843]/30 ml-1">
                Free Entry
              </span>
            )}
            <span className={`text-xs ml-auto px-2 py-0.5 rounded-full border ${
              isActive
                ? 'border-green-500/40 text-green-400 bg-green-500/10'
                : isUpcoming
                ? 'border-[#D4A843]/40 text-[#D4A843] bg-[#D4A843]/10'
                : 'border-[#F5F0E8]/20 text-[#F5F0E8]/40 bg-transparent'
            }`}>
              {isActive ? 'Live' : isUpcoming ? 'Upcoming' : 'Ended'}
            </span>
          </div>
          <h1 className={`font-serif text-4xl mb-2 ${textPrimary}`}>{competition.title}</h1>
          {competition.book_title && (
            <p className={`text-base ${textMuted}`}>
              {competition.book_title}{competition.book_author ? ` — ${competition.book_author}` : ''}
            </p>
          )}
        </div>

        {/* Stats row */}
        <div className={`rounded-xl border p-5 mb-8 grid grid-cols-3 gap-4 ${cardBg}`}>
          <div className="text-center">
            <DollarSign size={16} className="text-[#D4A843] mx-auto mb-1" />
            <p className="text-[#D4A843] font-bold text-xl">
              {competition.is_sponsored ? 'Free' : `$${competition.entry_fee}`}
            </p>
            <p className={`text-xs ${textMuted}`}>Entry Fee</p>
          </div>
          <div className="text-center">
            <Trophy size={16} className="text-[#D4A843] mx-auto mb-1" />
            <p className="text-[#D4A843] font-bold text-xl">${competition.prize_pool.toFixed(0)}</p>
            <p className={`text-xs ${textMuted}`}>Prize Pool</p>
          </div>
          <div className="text-center">
            <Clock size={16} className="text-[#D4A843] mx-auto mb-1" />
            <p className={`font-semibold text-sm ${textPrimary}`}>{timeLabel}</p>
            <p className={`text-xs ${textMuted}`}>{isActive ? 'Deadline' : isUpcoming ? 'Opens' : 'Ended'}</p>
          </div>
        </div>

        {/* Elimination round tracker — only shown for elimination format */}
        {competition.type === 'elimination' && alreadyEntered && (
          <div className={`rounded-xl border p-6 mb-8 ${cardBg}`}>
            <h2 className={`font-serif text-xl mb-4 ${textPrimary}`}>Your Progress</h2>
            <div className="space-y-3">
              {[1, 2, 3].map((round) => {
                const progress = elimProgress.find(r => r.round === round);
                const isCurrentRound = !eliminated && !elimDone && currentRound === round;
                const isFuture = !progress && !isCurrentRound;
                return (
                  <div key={round} className={`flex items-center justify-between p-3 rounded-lg border ${
                    progress?.passed
                      ? 'border-green-500/30 bg-green-500/10'
                      : progress && !progress.passed
                      ? 'border-red-500/30 bg-red-500/10'
                      : isCurrentRound
                      ? 'border-[#D4A843]/40 bg-[#D4A843]/10'
                      : 'border-white/10 opacity-40'
                  }`}>
                    <div>
                      <p className={`text-sm font-semibold ${textPrimary}`}>{roundLabels[round - 1]}</p>
                      <p className={`text-xs ${textMuted}`}>{roundThresholds[round - 1]}</p>
                    </div>
                    <div className="text-right">
                      {progress ? (
                        <>
                          <p className={`text-sm font-bold ${progress.passed ? 'text-green-400' : 'text-red-400'}`}>
                            {progress.score}/{round === 3 ? 20 : 10}
                          </p>
                          <p className={`text-xs ${progress.passed ? 'text-green-400/70' : 'text-red-400/70'}`}>
                            {progress.passed ? (round === 3 ? 'Submitted' : 'Advanced') : 'Eliminated'}
                          </p>
                        </>
                      ) : isCurrentRound ? (
                        <p className="text-xs text-[#D4A843]">Up next</p>
                      ) : (
                        <p className={`text-xs ${textMuted}`}>Locked</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Description */}
        {competition.description && (
          <div className="mb-8">
            <h2 className={`font-serif text-2xl mb-3 ${textPrimary}`}>About This Competition</h2>
            <p className={`text-sm leading-relaxed ${textMuted}`}>{competition.description}</p>
          </div>
        )}

        {/* Rules */}
        {competition.rules && (
          <div className={`rounded-xl border p-6 mb-8 ${cardBg}`}>
            <h2 className={`font-serif text-xl mb-3 ${textPrimary}`}>Rules</h2>
            <p className={`text-sm leading-relaxed whitespace-pre-line ${textMuted}`}>{competition.rules}</p>
          </div>
        )}

        {/* Prize breakdown */}
        <div className={`rounded-xl border p-6 mb-8 ${cardBg}`}>
          <h2 className={`font-serif text-xl mb-4 ${textPrimary}`}>Prize Breakdown</h2>
          {competition.type === 'sprint' ? (
            <>
              <div className="flex justify-between text-sm mb-3">
                <span className={textMuted}>🥇 Winner takes all</span>
                <span className={`font-semibold ${textPrimary}`}>
                  ${competition.prize_pool.toFixed(2)} <span className={`font-normal ${textMuted}`}>(100%)</span>
                </span>
              </div>
              <p className={`text-xs ${textMuted}`}>
                Sprint competitions have one winner. In the event of a tie, the prize pool is split equally among tied participants.
              </p>
            </>
          ) : (
            <>
              <div className="space-y-2 mb-3">
                {[
                  { place: '🥇 1st Place', pct: 0.5 },
                  { place: '🥈 2nd Place', pct: 0.3 },
                  { place: '🥉 3rd Place', pct: 0.2 },
                ].map((row) => (
                  <div key={row.place} className="flex justify-between text-sm">
                    <span className={textMuted}>{row.place}</span>
                    <span className={`font-semibold ${textPrimary}`}>
                      ${(competition.prize_pool * row.pct).toFixed(2)}{' '}
                      <span className={`font-normal ${textMuted}`}>({Math.round(row.pct * 100)}%)</span>
                    </span>
                  </div>
                ))}
              </div>
              <p className={`text-xs ${textMuted}`}>
                Platform keeps 25% of the prize pool. Payouts processed within 5 business days of competition close.
              </p>
            </>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* ── CTA ── */}

        {/* Active + paid + entered + elimination */}
        {isActive && !competition.is_sponsored && alreadyEntered && competition.type === 'elimination' && (
          eliminated ? (
            <div className={`rounded-xl border p-5 text-center ${cardBg}`}>
              <p className="text-red-400 font-semibold text-lg mb-1">Eliminated</p>
              <p className={`text-sm ${textMuted}`}>You didn't make the cut this round. Better luck next time!</p>
            </div>
          ) : elimDone ? (
            <div className={`rounded-xl border p-5 text-center ${cardBg}`}>
              <p className="text-[#D4A843] font-semibold text-lg mb-1">✓ Final round submitted</p>
              <p className={`text-sm ${textMuted}`}>Results will be posted when the competition closes.</p>
            </div>
          ) : (
            <button
              onClick={handleTakeQuiz}
              className="w-full bg-[#D4A843] text-[#1B2A4A] font-semibold py-4 rounded-xl hover:bg-[#c49a3a] transition text-lg flex items-center justify-center gap-2"
            >
              Take {roundLabels[currentRound - 1]} Quiz <ArrowRight size={18} />
            </button>
          )
        )}

        {/* Active + paid + entered + sprint or readathon */}
        {isActive && !competition.is_sponsored && alreadyEntered && competition.type !== 'elimination' && (
          <div className="space-y-3">
            <div className={`rounded-xl border p-5 text-center ${cardBg}`}>
              <p className="text-[#D4A843] font-semibold text-lg mb-1">✓ You're entered</p>
              <p className={`text-sm ${textMuted}`}>Good luck! Take the quiz to submit your entry.</p>
            </div>
            <button
              onClick={handleTakeQuiz}
              className="w-full bg-[#D4A843] text-[#1B2A4A] font-semibold py-4 rounded-xl hover:bg-[#c49a3a] transition text-lg flex items-center justify-center gap-2"
            >
              Take the Quiz <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* Active + paid + not entered */}
        {isActive && !competition.is_sponsored && !alreadyEntered && (
          <>
            {isLateEntry && (
              <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 mb-4">
                <p className="text-yellow-400 font-semibold text-sm mb-1">⚠ Late Entry Fee Applies</p>
                <p className="text-yellow-400/80 text-xs">
                  This competition has already started. The late entry fee is{' '}
                  <strong>${lateFee}</strong> (double the standard ${competition.entry_fee} entry fee).
                </p>
              </div>
            )}
            <button
              onClick={handleEnter}
              className="w-full bg-[#D4A843] text-[#1B2A4A] font-semibold py-4 rounded-xl hover:bg-[#c49a3a] transition text-lg"
            >
              {isLateEntry
                ? `Enter Now — Late Fee $${lateFee}`
                : `Enter Now — Pay $${competition.entry_fee}`}
            </button>
            <p className={`text-xs text-center mt-3 ${textMuted}`}>
              You'll be taken to secure checkout. Entry is confirmed on payment.
            </p>
          </>
        )}

        {/* Active + sponsored + entered */}
        {isActive && competition.is_sponsored && alreadyEntered && (
          <div className="space-y-3">
            <div className={`rounded-xl border p-5 text-center ${cardBg}`}>
              <p className="text-[#D4A843] font-semibold text-lg mb-1">✓ You're entered</p>
              <p className={`text-sm ${textMuted}`}>Good luck! Take the quiz to submit your entry.</p>
            </div>
            <button
              onClick={handleTakeQuiz}
              className="w-full bg-[#D4A843] text-[#1B2A4A] font-semibold py-4 rounded-xl hover:bg-[#c49a3a] transition text-lg flex items-center justify-center gap-2"
            >
              Take the Quiz <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* Active + sponsored + not entered */}
        {isActive && competition.is_sponsored && !alreadyEntered && (
          <button
            onClick={() => {
              if (!userId) { navigateTo('/signup'); return; }
              supabase.from('competition_entries').insert({
                competition_id: competition.id,
                user_id: userId,
                entry_fee_paid: 0,
                is_late_entry: false,
                status: 'active',
              }).then(() => setAlreadyEntered(true));
            }}
            className="w-full bg-[#D4A843] text-[#1B2A4A] font-semibold py-4 rounded-xl hover:bg-[#c49a3a] transition text-lg"
          >
            Enter Now — Free
          </button>
        )}

        {isUpcoming && (
          <div className={`rounded-xl border p-5 text-center ${cardBg}`}>
            <p className={`font-semibold mb-1 ${textPrimary}`}>Not open yet</p>
            <p className={`text-sm ${textMuted}`}>
              Pre-register on the{' '}
              <button onClick={() => navigateTo('/competitions')} className="text-[#D4A843] hover:underline">
                competitions page
              </button>{' '}
              to get notified when this goes live.
            </p>
          </div>
        )}

        {isCompleted && (
          <div className={`rounded-xl border p-5 text-center ${cardBg}`}>
            <p className={`font-semibold mb-1 ${textPrimary}`}>This competition has ended</p>
            <p className={`text-sm mb-4 ${textMuted}`}>Browse current competitions below.</p>
            <button
              onClick={() => navigateTo('/competitions')}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#D4A843] hover:underline"
            >
              Browse Competitions <ArrowRight size={14} />
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
