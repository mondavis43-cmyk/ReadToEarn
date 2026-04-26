import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from '../hooks/useNavigate';
import { Zap, BookOpen, Trophy, Clock, DollarSign, Users, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Competition = {
  id: string;
  title: string;
  format: 'sprint' | 'readathon' | 'elimination';
  book_title?: string;
  book_author?: string;
  entry_fee: number;
  prize_pool: number;
  status: 'upcoming' | 'active' | 'completed' | 'canceled';
  is_sponsored: boolean;
  starts_at: string;
  ends_at: string;
  description?: string;
  rules?: string;
  pre_registration_count?: number;
};

const formatIcon = (format: string) => {
  if (format === 'sprint') return <Zap size={20} className="text-[#D4A843]" />;
  if (format === 'readathon') return <BookOpen size={20} className="text-[#D4A843]" />;
  return <Trophy size={20} className="text-[#D4A843]" />;
};

const formatLabel = (format: string) => {
  if (format === 'sprint') return 'Sprint';
  if (format === 'readathon') return 'Read-A-Thon';
  return 'Elimination';
};

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

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        // Check if already entered
        const { data: entry } = await supabase
          .from('competition_entries')
          .select('id')
          .eq('competition_id', id)
          .eq('user_id', user.id)
          .maybeSingle();
        if (entry) setAlreadyEntered(true);
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

  const handleEnter = () => {
    if (!userId) { navigateTo('/signup'); return; }
    if (!competition) return;
    setError('');

    (window as any).__checkoutItem = {
      type: 'competition_entry',
      label: `Competition Entry — ${competition.title}`,
      amount: competition.entry_fee * 100, // entry_fee stored as dollars in DB
      metadata: {
        competition_id: competition.id,
        format: competition.format,
        title: competition.title,
      },
    };

    (window as any).__pendingSubmission = {
      table: 'competition_entries',
      data: {
        competition_id: competition.id,
        user_id: userId,
        status: 'active',
      },
    };

    window.history.pushState({}, '', '/checkout');
    window.dispatchEvent(new PopStateEvent('popstate'));
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

  const starts = new Date(competition.starts_at);
  const ends = new Date(competition.ends_at);
  const now = new Date();
  const isActive = competition.status === 'active';
  const isUpcoming = competition.status === 'upcoming';
  const isCompleted = competition.status === 'completed' || competition.status === 'canceled';

  const timeLabel = isCompleted
    ? `Ended ${ends.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
    : isActive
    ? `Ends ${ends.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} at ${ends.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    : `Opens ${starts.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} at ${starts.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;

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
            {formatIcon(competition.format)}
            <span className="text-xs font-semibold text-[#D4A843] uppercase tracking-wide">
              {formatLabel(competition.format)}
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
          <div className="space-y-2">
            {[
              { place: '🥇 1st Place', pct: '50%', amount: (competition.prize_pool * 0.5).toFixed(2) },
              { place: '🥈 2nd Place', pct: '30%', amount: (competition.prize_pool * 0.3).toFixed(2) },
              { place: '🥉 3rd Place', pct: '20%', amount: (competition.prize_pool * 0.2).toFixed(2) },
            ].map((row) => (
              <div key={row.place} className="flex justify-between text-sm">
                <span className={textMuted}>{row.place}</span>
                <span className={`font-semibold ${textPrimary}`}>${row.amount} <span className={`font-normal ${textMuted}`}>({row.pct})</span></span>
              </div>
            ))}
          </div>
          <p className={`text-xs mt-4 ${textMuted}`}>Platform keeps 25% of the prize pool. Payouts processed within 5 business days of competition close.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* CTA */}
        {isActive && !competition.is_sponsored && (
          alreadyEntered ? (
            <div className={`rounded-xl border p-5 text-center ${cardBg}`}>
              <p className="text-[#D4A843] font-semibold text-lg mb-1">✓ You're entered</p>
              <p className={`text-sm ${textMuted}`}>Good luck! Results posted when the competition closes.</p>
            </div>
          ) : (
            <>
              <button
                onClick={handleEnter}
                className="w-full bg-[#D4A843] text-[#1B2A4A] font-semibold py-4 rounded-xl hover:bg-[#c49a3a] transition text-lg"
              >
                Enter Now — Pay ${competition.entry_fee}
              </button>
              <p className={`text-xs text-center mt-3 ${textMuted}`}>
                You'll be taken to secure checkout. Entry is confirmed on payment.
              </p>
            </>
          )
        )}

        {isActive && competition.is_sponsored && (
          alreadyEntered ? (
            <div className={`rounded-xl border p-5 text-center ${cardBg}`}>
              <p className="text-[#D4A843] font-semibold text-lg mb-1">✓ You're entered</p>
              <p className={`text-sm ${textMuted}`}>Good luck! Results posted when the competition closes.</p>
            </div>
          ) : (
            <button
              onClick={() => {
                if (!userId) { navigateTo('/signup'); return; }
                // Free entry — direct DB insert, no checkout
                supabase.from('competition_entries').insert({
                  competition_id: competition.id,
                  user_id: userId,
                  status: 'active',
                }).then(() => setAlreadyEntered(true));
              }}
              className="w-full bg-[#D4A843] text-[#1B2A4A] font-semibold py-4 rounded-xl hover:bg-[#c49a3a] transition text-lg"
            >
              Enter Now — Free
            </button>
          )
        )}

        {isUpcoming && (
          <div className={`rounded-xl border p-5 text-center ${cardBg}`}>
            <p className={`font-semibold mb-1 ${textPrimary}`}>Not open yet</p>
            <p className={`text-sm ${textMuted}`}>
              Pre-register on the <button onClick={() => navigateTo('/competitions')} className="text-[#D4A843] hover:underline">competitions page</button> to get notified when this goes live.
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
