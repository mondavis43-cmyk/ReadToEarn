import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from '../hooks/useNavigate';
import { Trophy, ArrowRight, Users, DollarSign, Clock } from 'lucide-react';
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

export const Elimination = () => {
const { isDark, toggleTheme } = useTheme();
const { navigateTo } = useNavigate();

const textPrimary = isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]';
const textMuted = isDark ? 'text-[#F5F0E8]/70' : 'text-[#1B2A4A]/70';
const cardBg = isDark ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20' : 'bg-white border-[#D4A843]/30';

const [tab, setTab] = useState<Tab>('upcoming');
const [competitions, setCompetitions] = useState<Competition[]>([]);
const [sponsored, setSponsored] = useState<Competition[]>([]);
const [loading, setLoading] = useState(true);
const [preRegged, setPreRegged] = useState<Set<string>>(new Set());
const [userId, setUserId] = useState<string | null>(null);

useEffect(() => {
  const load = async () => {
    setLoading(true);
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
      .eq('format', 'elimination')
      .in('status', statusMap[tab])
      .order('starts_at', { ascending: true });

    if (data) {
      setCompetitions(data.filter((c: Competition) => !c.is_sponsored));
      setSponsored(data.filter((c: Competition) => c.is_sponsored));
    }

    if (user) {
      const { data: regs } = await supabase
        .from('pre_registrations')
        .select('competition_id')
        .eq('user_id', user.id);
      if (regs) setPreRegged(new Set(regs.map((r: any) => r.competition_id)));
    }

    setLoading(false);
  };
  load();
}, [tab]);

const handlePreRegister = async (competitionId: string) => {
  if (!userId) { navigateTo('/signup'); return; }
  if (preRegged.has(competitionId)) return;
  await supabase.from('pre_registrations').insert({ user_id: userId, competition_id: competitionId });
  setPreRegged(prev => new Set([...prev, competitionId]));
};

const tabClass = (t: Tab) =>
  `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
    tab === t
      ? 'bg-[#D4A843] text-[#1B2A4A]'
      : isDark
      ? 'text-[#F5F0E8]/60 hover:text-[#F5F0E8]'
      : 'text-[#1B2A4A]/60 hover:text-[#1B2A4A]'
  }`;

const renderCard = (c: Competition) => (
  <div key={c.id} className={`rounded-xl border p-6 transition-colors ${cardBg}`}>
    <div className="flex items-center gap-2 mb-3">
      <Trophy size={14} className="text-[#D4A843]" />
      <span className="text-xs font-semibold text-[#D4A843] uppercase tracking-wide">Elimination Bracket</span>
      {c.is_sponsored
        ? <span className="text-xs ml-auto font-semibold text-[#D4A843]">Free Entry</span>
        : <span className={`text-xs ml-auto ${textMuted}`}>Entry: ${c.entry_fee}</span>
      }
    </div>
    <h3 className={`font-serif text-lg mb-1 ${textPrimary}`}>{c.title}</h3>
    {c.book_title && (
      <p className={`text-sm mb-3 ${textMuted}`}>
        Books: {c.book_title}{c.book_author ? ` — ${c.book_author}` : ''}
      </p>
    )}
    <div className="flex flex-wrap gap-4 mb-4">
      <div className="flex items-center gap-1.5">
        <Clock size={13} className="text-[#D4A843]" />
        <span className={`text-xs ${textMuted}`}>
          {tab === 'past'
            ? `Ended ${new Date(c.ends_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
            : `Opens ${new Date(c.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <DollarSign size={13} className="text-[#D4A843]" />
        <span className={`text-xs ${textMuted}`}>Prize pool: ${c.prize_pool.toFixed(2)}</span>
      </div>
      {c.pre_registration_count !== undefined && tab === 'upcoming' && (
        <div className="flex items-center gap-1.5">
          <Users size={13} className="text-[#D4A843]" />
          <span className={`text-xs ${textMuted}`}>{c.pre_registration_count} pre-registered</span>
        </div>
      )}
    </div>
    {tab === 'upcoming' && (
      <button
        onClick={() => handlePreRegister(c.id)}
        className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${
          preRegged.has(c.id)
            ? 'text-[#D4A843]/50 cursor-default'
            : 'text-[#D4A843] hover:underline'
        }`}
      >
        {preRegged.has(c.id) ? '✓ Pre-Registered' : 'Pre-Register — Free'}
        {!preRegged.has(c.id) && <ArrowRight size={14} />}
      </button>
    )}
    {tab === 'active' && (
      <button
        onClick={() => navigateTo(`/competition/${c.id}`)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#D4A843] hover:underline"
      >
        Enter Now <ArrowRight size={14} />
      </button>
    )}
    {tab === 'past' && (
      <button
        onClick={() => navigateTo(`/competition/${c.id}`)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#D4A843] hover:underline"
      >
        View Results <ArrowRight size={14} />
      </button>
    )}
  </div>
);

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
        <div className="flex justify-center mb-4">
          <Trophy size={36} className="text-[#D4A843]" />
        </div>
        <h1 className={`font-serif text-4xl md:text-5xl mb-4 ${textPrimary}`}>Elimination Bracket</h1>
        <p className={`text-base max-w-xl mx-auto ${textMuted}`}>
          Three books. Three rounds. One winner. Survive each round by outscoring your competition — the last reader standing takes the prize pool.
        </p>
        <button
          onClick={() => navigateTo('/how-it-works')}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#D4A843] hover:underline"
        >
          How it works <ArrowRight size={14} />
        </button>
      </div>

      {/* How it works quick summary */}
      <div className={`rounded-xl border p-5 mb-10 transition-colors ${cardBg}`}>
        <p className={`text-sm font-semibold mb-3 ${textPrimary}`}>The format</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { round: 'Round 1', desc: 'All entrants read Book 1 and take the quiz. Bottom half eliminated.' },
            { round: 'Round 2', desc: 'Survivors read Book 2. Bottom half eliminated again.' },
            { round: 'Final', desc: 'Last readers standing face Book 3. Highest score wins the prize pool.' },
          ].map(({ round, desc }) => (
            <div key={round}>
              <p className="text-xs font-semibold text-[#D4A843] mb-1">{round}</p>
              <p className={`text-xs ${textMuted}`}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        <button className={tabClass('active')} onClick={() => setTab('active')}>Active</button>
        <button className={tabClass('upcoming')} onClick={() => setTab('upcoming')}>Upcoming</button>
        <button className={tabClass('past')} onClick={() => setTab('past')}>Past Results</button>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className={`rounded-xl border p-6 animate-pulse ${cardBg}`}>
              <div className={`h-4 w-1/3 rounded mb-3 ${isDark ? 'bg-[#D4A843]/10' : 'bg-[#1B2A4A]/10'}`} />
              <div className={`h-3 w-2/3 rounded mb-2 ${isDark ? 'bg-[#D4A843]/10' : 'bg-[#1B2A4A]/10'}`} />
              <div className={`h-3 w-1/2 rounded ${isDark ? 'bg-[#D4A843]/10' : 'bg-[#1B2A4A]/10'}`} />
            </div>
          ))}
        </div>
      ) : competitions.length === 0 && sponsored.length === 0 ? (
        <div className={`rounded-xl border p-10 text-center transition-colors ${cardBg}`}>
          <p className={`text-sm ${textMuted}`}>No elimination brackets right now. Check back soon.</p>
        </div>
      ) : (
        <div className="space-y-4 mb-12">
          {competitions.map(renderCard)}
        </div>
      )}

      {/* Pre-Registration Info */}
      <div className={`rounded-xl border p-5 mb-16 transition-colors ${cardBg}`}>
        <p className={`text-sm font-semibold mb-2 ${textPrimary}`}>How pre-registration works</p>
        <p className={`text-sm ${textMuted}`}>
          Pre-registration is free and saves your spot. When the bracket goes live, you'll get notified and have 48 hours to pay your entry fee. No payment required until then. If a bracket is canceled due to low demand, you pay nothing.
        </p>
      </div>

      {/* Author-Sponsored */}
      {sponsored.length > 0 && (
        <div className="mb-16">
          <h2 className={`font-serif text-3xl mb-2 ${textPrimary}`}>Free to Enter — Author-Sponsored</h2>
          <p className={`text-sm mb-8 ${textMuted}`}>
            Fully funded by the author whose books are featured. No entry fee. Same real prize pool.
          </p>
          <div className="space-y-4">
            {sponsored.map(renderCard)}
          </div>
        </div>
      )}

    </div>
  </div>
);
};