import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from '../hooks/useNavigate';
import { ChevronLeft, Zap, BookOpen, Trophy, Users, DollarSign, Clock, Copy, Check, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Tournament = {
  id: string;
  creator_id: string;
  title: string;
  book_title: string;
  book_author: string | null;
  format: 'sprint' | 'readathon' | 'elimination';
  entry_fee: number;
  prize_pool: number;
  is_public: boolean;
  invite_code: string;
  status: 'upcoming' | 'active' | 'completed';
  start_date: string;
  end_date: string;
  max_participants: number | null;
  profiles?: { display_name: string | null; username: string | null } | null;
};

type Participant = {
  id: string;
  user_id: string;
  display_name: string | null;
  username: string | null;
  joined_at: string;
  rank: number | null;
  score: number | null;
};

const resolveName = (username?: string | null, displayName?: string | null, fallback = 'Reader') => {
  if (username) return `@${username}`;
  return displayName || fallback;
};

const resolveInitial = (username?: string | null, displayName?: string | null) => {
  if (username) return username[0].toUpperCase();
  if (displayName) return displayName[0].toUpperCase();
  return 'R';
};

const formatLabel = (format: string) => {
  if (format === 'sprint') return 'Sprint';
  if (format === 'readathon') return 'Read-A-Thon';
  return 'Elimination';
};

const formatIcon = (format: string) => {
  if (format === 'sprint') return <Zap size={14} className="text-[#D4A843]" />;
  if (format === 'readathon') return <BookOpen size={14} className="text-[#D4A843]" />;
  return <Trophy size={14} className="text-[#D4A843]" />;
};

const prizeBreakdown = (format: string, pool: number) => {
  if (format === 'sprint') return [{ place: '1st', pct: 100, amount: pool }];
  return [
    { place: '1st', pct: 50, amount: pool * 0.5 },
    { place: '2nd', pct: 30, amount: pool * 0.3 },
    { place: '3rd', pct: 20, amount: pool * 0.2 },
  ];
};

export const TournamentDetail = ({ tournamentId }: { tournamentId: string }) => {
  const { isDark } = useTheme();
  const { navigateTo } = useNavigate();

  const textPrimary = isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]';
  const textMuted   = isDark ? 'text-[#F5F0E8]/70' : 'text-[#1B2A4A]/70';
  const cardBg      = isDark ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20' : 'bg-white border-[#D4A843]/30';

  const [tournament, setTournament]       = useState<Tournament | null>(null);
  const [participants, setParticipants]   = useState<Participant[]>([]);
  const [user, setUser]                   = useState<any>(null);
  const [userProfile, setUserProfile]     = useState<any>(null);
  const [loading, setLoading]             = useState(true);
  const [hasJoined, setHasJoined]         = useState(false);
  const [copied, setCopied]               = useState(false);
  const [inviteInput, setInviteInput]     = useState('');
  const [inviteError, setInviteError]     = useState('');
  const [isCreator, setIsCreator]         = useState(false);
  const [distributing, setDistributing]   = useState(false);
  const [prizeDistributed, setPrizeDistributed] = useState(false);

  useEffect(() => {
    loadAll();
  }, [tournamentId]);

  async function loadAll() {
    setLoading(true);
    const { data: { user: u } } = await supabase.auth.getUser();
    setUser(u);

    if (u) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('id', u.id)
        .single();
      setUserProfile(profile);
    }

    const [{ data: t }, { data: p }] = await Promise.all([
      supabase
        .from('tournaments')
        .select('*, profiles(display_name, username)')
        .eq('id', tournamentId)
        .single(),
      supabase
        .from('tournament_participants')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('rank', { ascending: true, nullsFirst: false }),
    ]);

    setTournament(t);
    setParticipants(p || []);
    if (u && t) setIsCreator(u.id === t.creator_id);
    if (u && p) setHasJoined(p.some((pt: Participant) => pt.user_id === u.id));
    setLoading(false);
  }

  const handleJoin = () => {
    if (!tournament) return;
    if (!user) { navigateTo('/login'); return; }

    if (!tournament.is_public && inviteInput.trim().toUpperCase() !== tournament.invite_code) {
      setInviteError('Invalid invite code.');
      return;
    }

    sessionStorage.setItem('checkoutItem', JSON.stringify({
      type:   'tournament_entry',
      label:  `Tournament Entry — ${tournament.title}`,
      amount: tournament.entry_fee * 100,
      metadata: { tournament_id: tournament.id },
    }));

    sessionStorage.setItem('pendingSubmission', JSON.stringify({
      table: 'tournament_participants',
      data: {
        tournament_id: tournament.id,
        user_id:       user.id,
        display_name:  userProfile?.display_name || user.email,
        username:      userProfile?.username || null,
      },
    }));

    window.history.pushState({}, '', '/checkout');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/tournament/${tournamentId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDistributePrizes = async () => {
    if (!tournament || distributing) return;
    const confirmed = window.confirm(
      'This will close the tournament and pay out winners. This cannot be undone. Continue?'
    );
    if (!confirmed) return;

    setDistributing(true);
    try {
      const { data, error } = await supabase.functions.invoke('distribute-tournament-prizes', {
        body: { tournament_id: tournament.id },
      });
      if (error) throw new Error(error.message);
      setPrizeDistributed(true);
      await loadAll(); // was loadTournament() -- fixed
    } catch (err: any) {
      alert('Failed to distribute prizes: ' + err.message);
    } finally {
      setDistributing(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-[#0F1923]' : 'bg-[#FAF8F5]'} flex items-center justify-center`}>
        <div className="w-8 h-8 border-2 border-[#D4A843] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-[#0F1923]' : 'bg-[#FAF8F5]'} flex items-center justify-center`}>
        <p className={textMuted}>Tournament not found.</p>
      </div>
    );
  }

  const breakdown       = prizeBreakdown(tournament.format, tournament.prize_pool);
  const creatorName     = resolveName(tournament.profiles?.username, tournament.profiles?.display_name, 'a reader');
  const participantCount = participants.length;
  const spotsLeft       = tournament.max_participants ? tournament.max_participants - participantCount : null;
  const isFull          = spotsLeft !== null && spotsLeft <= 0;
  const canJoin         = !hasJoined && !isFull && tournament.status === 'upcoming' && !isCreator;

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0F1923]' : 'bg-[#FAF8F5]'}`}>
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Back */}
        <button
          onClick={() => navigateTo('/competitions')}
          className={`flex items-center gap-1 text-sm ${textMuted} hover:text-[#D4A843] transition mb-6`}
        >
          <ChevronLeft size={16} /> Back to Competitions
        </button>

        {/* Header card */}
        <div className={`rounded-2xl border ${cardBg} p-6 mb-5`}>
          <div className="flex items-center gap-2 mb-3">
            {formatIcon(tournament.format)}
            <span className="text-xs font-semibold text-[#D4A843] uppercase tracking-wide">{formatLabel(tournament.format)}</span>
            {!tournament.is_public && (
              <span className="flex items-center gap-1 text-xs text-[#D4A843]/60 ml-auto">
                <Lock size={11} /> Private
              </span>
            )}
            <span className={`text-xs ml-auto px-2 py-0.5 rounded-full font-medium ${
              tournament.status === 'active'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : tournament.status === 'completed'
                ? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                : 'bg-[#D4A843]/15 text-[#D4A843]'
            }`}>
              {tournament.status === 'active' ? 'Live' : tournament.status === 'completed' ? 'Ended' : 'Upcoming'}
            </span>
          </div>

          <h1 className={`font-serif text-2xl mb-1 ${textPrimary}`}>{tournament.title}</h1>
          <p className={`text-sm ${textMuted} mb-4`}>
            Created by {creatorName} · {tournament.book_title}{tournament.book_author ? ` by ${tournament.book_author}` : ''}
          </p>

          <div className="flex flex-wrap gap-4 mb-5">
            <div className="flex items-center gap-1.5">
              <DollarSign size={13} className="text-[#D4A843]" />
              <span className={`text-xs ${textMuted}`}>Entry: ${tournament.entry_fee}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <DollarSign size={13} className="text-[#D4A843]" />
              <span className={`text-xs ${textMuted}`}>Prize pool: ${tournament.prize_pool.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users size={13} className="text-[#D4A843]" />
              <span className={`text-xs ${textMuted}`}>
                {participantCount} joined{spotsLeft !== null ? ` · ${spotsLeft} spots left` : ''}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={13} className="text-[#D4A843]" />
              <span className={`text-xs ${textMuted}`}>
                {tournament.status === 'completed'
                  ? `Ended ${new Date(tournament.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                  : `${tournament.status === 'active' ? 'Ends' : 'Starts'} ${new Date(tournament.status === 'active' ? tournament.end_date : tournament.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`}
              </span>
            </div>
          </div>

          {/* Prize breakdown */}
          <div className={`rounded-xl p-4 mb-5 ${isDark ? 'bg-[#0F1923]/60' : 'bg-[#FAF8F5]'}`}>
            <p className={`text-xs font-semibold mb-2 ${textMuted}`}>Prize Breakdown</p>
            <div className="flex gap-3">
              {breakdown.map((b) => (
                <div key={b.place} className="flex-1 text-center">
                  <p className="text-xs text-[#D4A843] font-bold">{b.place}</p>
                  <p className={`text-sm font-semibold ${textPrimary}`}>${b.amount.toFixed(2)}</p>
                  <p className={`text-xs ${textMuted}`}>{b.pct}%</p>
                </div>
              ))}
            </div>
            {tournament.prize_pool === 0 && (
              <p className={`text-xs text-center mt-2 ${textMuted}`}>Prize pool grows as participants join.</p>
            )}
          </div>

          {/* Join / status */}
          {canJoin && (
            <div>
              {!tournament.is_public && (
                <div className="mb-3">
                  <input
                    type="text"
                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'border-[#D4A843]/20 bg-[#0F1923] text-[#F5F0E8]' : 'border-[#1B2A4A]/20 bg-white text-[#1B2A4A]'} text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A843]/40 uppercase tracking-widest`}
                    placeholder="Enter invite code"
                    value={inviteInput}
                    onChange={(e) => { setInviteInput(e.target.value); setInviteError(''); }}
                    maxLength={6}
                  />
                  {inviteError && <p className="text-xs text-red-500 mt-1">{inviteError}</p>}
                </div>
              )}
              <button
                onClick={handleJoin}
                className="w-full py-3 bg-[#D4A843] text-[#1B2A4A] rounded-xl font-semibold text-sm hover:bg-[#c49a3a] transition"
              >
                Join Tournament — ${tournament.entry_fee}
              </button>
            </div>
          )}

          {hasJoined && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 font-medium">
              <Check size={16} /> You're in! Good luck.
            </div>
          )}

          {isFull && !hasJoined && (
            <p className={`text-sm ${textMuted}`}>This tournament is full.</p>
          )}

          {tournament.status !== 'upcoming' && !hasJoined && !isFull && (
            <p className={`text-sm ${textMuted}`}>Registration is closed.</p>
          )}

          {isCreator && (
            <div className="flex items-center gap-3 mt-2">
              <div className={`flex-1 rounded-lg border px-3 py-2 ${isDark ? 'border-[#D4A843]/20 bg-[#0F1923]' : 'border-[#D4A843]/30 bg-[#FAF8F5]'}`}>
                <p className={`text-xs ${textMuted}`}>Your invite code</p>
                <p className="text-lg font-bold tracking-widest text-[#D4A843]">{tournament.invite_code}</p>
              </div>
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-2 px-4 py-2.5 border border-[#D4A843] text-[#D4A843] rounded-xl text-sm font-medium hover:bg-[#D4A843]/10 transition"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy Link'}
              </button>
            </div>
          )}
        </div>

        {isCreator && tournament.status === 'active' && (
          <button
            onClick={handleDistributePrizes}
            disabled={distributing}
            className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-3 bg-[#D4A843] text-[#1B2A4A] rounded-xl text-sm font-semibold hover:bg-[#c49a3a] transition disabled:opacity-50"
          >
            <Trophy size={15} />
            {distributing ? 'Distributing...' : 'Close & Distribute Prizes'}
          </button>
        )}

        {prizeDistributed && (
          <div className="mt-3 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm text-center">
            ✓ Prizes distributed successfully
          </div>
        )}

        {/* Participants / Leaderboard */}
        <div className={`rounded-2xl border ${cardBg} p-6`}>
          <h2 className={`font-semibold mb-4 ${textPrimary}`}>
            {tournament.status === 'completed' ? 'Final Results' : 'Participants'}
            <span className={`ml-2 text-sm font-normal ${textMuted}`}>({participantCount})</span>
          </h2>

          {participants.length === 0 ? (
            <p className={`text-sm ${textMuted} text-center py-6`}>No participants yet. Be the first to join!</p>
          ) : (
            <div className="space-y-3">
              {participants.map((p, i) => {
                const name    = resolveName(p.username, p.display_name);
                const initial = resolveInitial(p.username, p.display_name);
                const rank    = p.rank ?? i + 1;
                const isMe    = user && p.user_id === user.id;

                return (
                  <div key={p.id} className={`flex items-center gap-3 py-2 ${i < participants.length - 1 ? `border-b ${isDark ? 'border-[#D4A843]/10' : 'border-[#1B2A4A]/10'}` : ''}`}>
                    <span className={`w-6 text-center text-sm font-bold ${rank <= 3 ? 'text-[#D4A843]' : textMuted}`}>
                      {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-[#D4A843]/20 flex items-center justify-center text-xs font-bold text-[#D4A843]">
                      {initial}
                    </div>
                    <span className={`text-sm flex-1 ${textPrimary}`}>
                      {name}
                      {isMe && <span className="ml-1 text-[#D4A843] text-xs">(you)</span>}
                    </span>
                    {p.score !== null && (
                      <span className={`text-xs font-medium ${textMuted}`}>{p.score} pts</span>
                    )}
                    {tournament.status === 'completed' && p.rank && p.rank <= breakdown.length && (
                      <span className="text-xs font-semibold text-[#D4A843]">
                        ${breakdown[p.rank - 1]?.amount.toFixed(2)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
