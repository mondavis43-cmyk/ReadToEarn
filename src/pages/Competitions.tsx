import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from '../hooks/useNavigate';
import { Zap, BookOpen, Trophy, ArrowRight, DollarSign, Clock, Plus, Users } from 'lucide-react';
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
pre_registration_count?: number;
};

type Tab = 'active' | 'upcoming' | 'past';

const formatIcon = (format: string) => {
if (format === 'sprint') return <Zap size={14} className="text-[#D4A843]" />;
if (format === 'readathon') return <BookOpen size={14} className="text-[#D4A843]" />;
return <Trophy size={14} className="text-[#D4A843]" />;
};

const formatLabel = (format: string) => {
if (format === 'sprint') return 'Sprint';
if (format === 'readathon') return 'Read-A-Thon';
return 'Elimination';
};

const PublicTournaments = ({
textPrimary,
textMuted,
cardBg,
navigateTo,
}: {
isDark: boolean;
textPrimary: string;
textMuted: string;
cardBg: string;
navigateTo: (path: string) => void;
}) => {
const [tournaments, setTournaments] = useState<any[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  supabase
    .from('tournaments')
    .select('*')
    .eq('is_public', true)
    .in('status', ['upcoming', 'active'])
    .order('starts_at', { ascending: true })
    .limit(5)
    .then(({ data }) => {
      setTournaments(data || []);
      setLoading(false);
    });
}, []);

if (loading) return null;

if (tournaments.length === 0) {
  return (
    <div className={`rounded-xl border p-6 text-center transition-colors ${cardBg}`}>
      <p className={`text-sm ${textMuted}`}>No public tournaments yet. Create the first one!</p>
    </div>
  );
}

return (
  <div className="space-y-3">
    <p className={`text-sm font-semibold ${textPrimary}`}>Open Tournaments</p>
    {tournaments.map((t) => (
      <div key={t.id} className={`rounded-xl border p-5 transition-colors ${cardBg}`}>
        <div className="flex items-center gap-2 mb-2">
          {formatIcon(t.format)}
          <span className="text-xs font-semibold text-[#D4A843] uppercase tracking-wide">{formatLabel(t.format)}</span>
          <span className={`text-xs ml-auto ${textMuted}`}>Entry: ${t.entry_fee}</span>
        </div>
        <h4 className={`font-serif text-base mb-1 ${textPrimary}`}>{t.title}</h4>
        <p className={`text-xs mb-3 ${textMuted}`}>
          {t.book_title}{t.book_author ? ` — ${t.book_author}` : ''}
        </p>
        <button
          onClick={() => navigateTo(`/tournament/${t.id}`)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#D4A843] hover:underline"
        >
          View Tournament <ArrowRight size={14} />
        </button>
      </div>
    ))}
  </div>
);
};

export const Competitions = () => {
const { isDark, toggleTheme } = useTheme();
const { navigateTo } = useNavigate();

const textPrimary = isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]';
const textMuted = isDark ? 'text-[#F5F0E8]/70' : 'text-[#1B2A4A]/70';
const cardBg = isDark ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20' : 'bg-white border-[#D4A843]/30';

const [sponsoredTab, setSponsoredTab] = useState<Tab>('active');
const [sponsored, setSponsored] = useState<Competition[]>([]);
const [loadingSponsored, setLoadingSponsored] = useState(true);
const [preRegged, setPreRegged] = useState<Set<string>>(new Set());
const [userId, setUserId] = useState<string | null>(null);

useEffect(() => {
  const load = async () => {
    setLoadingSponsored(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);

    const statusMap: Record<Tab, string[]> = {
      active: ['active'],
      upcoming: ['upcoming'],
      past: ['completed', 'canceled'],
    };

    const { data } = await supabase
      .from('competitions')
      .select('*')
      .eq('is_sponsored', true)
      .in('status', statusMap[sponsoredTab])
      .order('starts_at', { ascending: true });

    setSponsored(data || []);

    if (user) {
      const { data: regs } = await supabase
        .from('pre_registrations')
        .select('competition_id')
        .eq('user_id', user.id);
      if (regs) setPreRegged(new Set(regs.map((r: any) => r.competition_id)));
    }

    setLoadingSponsored(false);
  };
  load();
}, [sponsoredTab]);

const handlePreRegister = async (competitionId: string) => {
  if (!userId) { navigateTo('/signup'); return; }
  if (preRegged.has(competitionId)) return;
  await supabase.from('pre_registrations').insert({ user_id: userId, competition_id: competitionId });
  setPreRegged(prev => new Set([...prev, competitionId]));
};

const tabClass = (t: Tab) =>
  `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
    sponsoredTab === t
      ? 'bg-[#D4A843] text-[#1B2A4A]'
      : isDark
      ? 'text-[#F5F0E8]/60 hover:text-[#F5F0E8]'
      : 'text-[#1B2A4A]/60 hover:text-[#1B2A4A]'
  }`;

return (
  <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#0f1623]' : 'bg-[#F5F0E8]'}`}>

    {/* Header */}
    <div className={`border-b transition-colors duration-300 ${isDark ? 'border-[#1B2A4A] bg-[#0f1623]' : 'border-[#D4A843]/30 bg-[#F5F0E8]'}`}>
      <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
        <button
          onClick={() => navigateTo('/')}
          className={`font-serif text-lg font-bold transition-colors ${isDark ? 'text-[#D4A843]' : 'text-[#1B2A4A]'}`}
        >
          Read to Earn
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

    <div className="max-w-3xl mx-auto px-4 py-16">

      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className={`font-serif text-4xl md:text-5xl mb-4 ${textPrimary}`}>Competitions</h1>
        <p className={`text-base max-w-xl mx-auto mb-8 ${textMuted}`}>
          Browse all ways to compete. Each format has its own page — pick your style.
        </p>

        {/* Format nav cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          <button
            onClick={() => navigateTo('/sprints')}
            className={`rounded-xl border p-5 text-left transition-colors hover:border-[#D4A843]/60 ${cardBg}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Zap size={16} className="text-[#D4A843]" />
              <span className="text-xs font-semibold text-[#D4A843] uppercase tracking-wide">Sprint</span>
            </div>
            <p className={`text-sm font-medium mb-1 ${textPrimary}`}>Speed Quiz</p>
            <p className={`text-xs ${textMuted}`}>One book. Fastest perfect score wins.</p>
            <span className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-[#D4A843]">
              View Sprints <ArrowRight size={12} />
            </span>
          </button>

          <button
            onClick={() => navigateTo('/readathon')}
            className={`rounded-xl border p-5 text-left transition-colors hover:border-[#D4A843]/60 ${cardBg}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <BookOpen size={16} className="text-[#D4A843]" />
              <span className="text-xs font-semibold text-[#D4A843] uppercase tracking-wide">Read-A-Thon</span>
            </div>
            <p className={`text-sm font-medium mb-1 ${textPrimary}`}>Read the Most</p>
            <p className={`text-xs ${textMuted}`}>Most pages from passed quizzes wins.</p>
            <span className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-[#D4A843]">
              View Readathons <ArrowRight size={12} />
            </span>
          </button>

          <button
            onClick={() => navigateTo('/elimination')}
            className={`rounded-xl border p-5 text-left transition-colors hover:border-[#D4A843]/60 ${cardBg}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Trophy size={16} className="text-[#D4A843]" />
              <span className="text-xs font-semibold text-[#D4A843] uppercase tracking-wide">Elimination</span>
            </div>
            <p className={`text-sm font-medium mb-1 ${textPrimary}`}>Survive the Bracket</p>
            <p className={`text-xs ${textMuted}`}>Three rounds. Last reader standing wins.</p>
            <span className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-[#D4A843]">
              View Brackets <ArrowRight size={12} />
            </span>
          </button>
        </div>
      </div>

      {/* Author-Sponsored */}
      <div className="mb-16">
        <h2 className={`font-serif text-3xl mb-2 ${textPrimary}`}>Free to Enter — Author-Sponsored</h2>
        <p className={`text-sm mb-6 ${textMuted}`}>
          Fully funded by the author whose book is featured. No entry fee. Same real prize pool. Just read and take the quiz.
        </p>

        <div className="flex gap-2 mb-6">
          <button className={tabClass('active')} onClick={() => setSponsoredTab('active')}>Active</button>
          <button className={tabClass('upcoming')} onClick={() => setSponsoredTab('upcoming')}>Upcoming</button>
          <button className={tabClass('past')} onClick={() => setSponsoredTab('past')}>Past</button>
        </div>

        {loadingSponsored ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className={`rounded-xl border p-6 animate-pulse ${cardBg}`}>
                <div className={`h-4 w-1/3 rounded mb-3 ${isDark ? 'bg-[#D4A843]/10' : 'bg-[#1B2A4A]/10'}`} />
                <div className={`h-3 w-2/3 rounded ${isDark ? 'bg-[#D4A843]/10' : 'bg-[#1B2A4A]/10'}`} />
              </div>
            ))}
          </div>
        ) : sponsored.length === 0 ? (
          <div className={`rounded-xl border p-8 text-center transition-colors ${cardBg}`}>
            <p className={`text-sm ${textMuted}`}>No sponsored competitions right now. Check back soon.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sponsored.map((c) => (
              <div key={c.id} className={`rounded-xl border p-6 transition-colors ${cardBg}`}>
                <div className="flex items-center gap-2 mb-3">
                  {formatIcon(c.format)}
                  <span className="text-xs font-semibold text-[#D4A843] uppercase tracking-wide">{formatLabel(c.format)}</span>
                  <span className="text-xs ml-auto font-semibold text-[#D4A843]">Free Entry</span>
                </div>
                <h3 className={`font-serif text-lg mb-1 ${textPrimary}`}>{c.title}</h3>
                {c.book_title && (
                  <p className={`text-sm mb-3 ${textMuted}`}>
                    {c.book_title}{c.book_author ? ` — ${c.book_author}` : ''}
                  </p>
                )}
                <div className="flex flex-wrap gap-4 mb-4">
                  <div className="flex items-center gap-1.5">
                    <Clock size={13} className="text-[#D4A843]" />
                    <span className={`text-xs ${textMuted}`}>
                      {sponsoredTab === 'past'
                        ? `Ended ${new Date(c.ends_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                        : `Opens ${new Date(c.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <DollarSign size={13} className="text-[#D4A843]" />
                    <span className={`text-xs ${textMuted}`}>Prize pool: ${c.prize_pool.toFixed(2)}</span>
                  </div>
                  {c.pre_registration_count !== undefined && sponsoredTab === 'upcoming' && (
                    <div className="flex items-center gap-1.5">
                      <Users size={13} className="text-[#D4A843]" />
                      <span className={`text-xs ${textMuted}`}>{c.pre_registration_count} pre-registered</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => sponsoredTab === 'upcoming' ? handlePreRegister(c.id) : navigateTo(`/competition/${c.id}`)}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[#D4A843] hover:underline"
                >
                  {sponsoredTab === 'upcoming'
                    ? preRegged.has(c.id) ? '✓ Pre-Registered' : 'Pre-Register — Free'
                    : sponsoredTab === 'active' ? 'Enter Now' : 'View Results'}
                  <ArrowRight size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pre-Registration Info */}
      <div className={`rounded-xl border p-5 mb-16 transition-colors ${cardBg}`}>
        <p className={`text-sm font-semibold mb-2 ${textPrimary}`}>How pre-registration works</p>
        <p className={`text-sm ${textMuted}`}>
          Pre-registration is free and saves your spot. When the competition goes live, you'll get notified and have 48 hours to pay your entry fee before it launches. No payment required until then. If a competition is canceled due to low demand, you pay nothing.
        </p>
      </div>

      {/* User-Created Tournaments */}
      <div className="mb-16">
        <h2 className={`font-serif text-3xl mb-2 ${textPrimary}`}>Run Your Own Tournament</h2>
        <p className={`text-sm mb-8 ${textMuted}`}>
          Any reader can create a public or private tournament. Set the book, format, and entry fee. Prize pool grows from entry fees — platform keeps 25%.
        </p>

        <div className={`rounded-xl border p-6 mb-6 transition-colors ${cardBg}`}>
          <div className="flex items-center gap-3 mb-3">
            <Plus className="text-[#D4A843]" size={20} />
            <h3 className={`font-serif text-lg ${textPrimary}`}>Create a Tournament</h3>
          </div>
          <p className={`text-sm mb-4 ${textMuted}`}>
            Choose your book, pick a format, set your entry fee, and decide if it's public or invite-only. Share your invite code and let the competition begin.
          </p>
          <button
            onClick={() => navigateTo('/tournaments/create')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1B2A4A] bg-[#D4A843] px-4 py-2 rounded-lg hover:bg-[#c49a3a] transition"
          >
            Create a Tournament <ArrowRight size={14} />
          </button>
        </div>

        <PublicTournaments
          isDark={isDark}
          textPrimary={textPrimary}
          textMuted={textMuted}
          cardBg={cardBg}
          navigateTo={navigateTo}
        />
      </div>

    </div>
  </div>
);
};