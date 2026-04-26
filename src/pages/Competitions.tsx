import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from '../hooks/useNavigate';
import { Zap, BookOpen, Trophy, ArrowRight, Users, DollarSign, Clock, Plus } from 'lucide-react';
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
type FormatFilter = 'all' | 'sprint' | 'readathon' | 'elimination';
type FeeFilter = 'all' | '5' | '7' | '10+';

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
  isDark, textPrimary, textMuted, cardBg, navigateTo
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
      {tournaments.map((t) => {
        const icon = formatIcon(t.format);
        const label = formatLabel(t.format);
        return (
          <div key={t.id} className={`rounded-xl border p-5 transition-colors ${cardBg}`}>
            <div className="flex items-center gap-2 mb-2">
              {icon}
              <span className="text-xs font-semibold text-[#D4A843] uppercase tracking-wide">{label}</span>
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
        );
      })}
    </div>
  );
};

export const Competitions = () => {
  const { isDark, toggleTheme } = useTheme();
  const { navigateTo } = useNavigate();

  const textPrimary = isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]';
  const textMuted = isDark ? 'text-[#F5F0E8]/70' : 'text-[#1B2A4A]/70';
  const cardBg = isDark ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20' : 'bg-white border-[#D4A843]/30';

  const [tab, setTab] = useState<Tab>('upcoming');
  const [formatFilter, setFormatFilter] = useState<FormatFilter>('all');
  const [feeFilter, setFeeFilter] = useState<FeeFilter>('all');
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

  const filtered = competitions.filter((c) => {
    if (formatFilter !== 'all' && c.format !== formatFilter) return false;
    if (feeFilter === '5' && c.entry_fee !== 5) return false;
    if (feeFilter === '7' && c.entry_fee !== 7) return false;
    if (feeFilter === '10+' && c.entry_fee < 10) return false;
    return true;
  });

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

  const filterClass = (active: boolean) =>
    `px-3 py-1.5 text-xs rounded-full border transition-colors ${
      active
        ? 'bg-[#D4A843] text-[#1B2A4A] border-[#D4A843]'
        : isDark
        ? 'border-[#D4A843]/20 text-[#F5F0E8]/60 hover:border-[#D4A843]/40'
        : 'border-[#1B2A4A]/20 text-[#1B2A4A]/60 hover:border-[#1B2A4A]/40'
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
          <h1 className={`font-serif text-4xl md:text-5xl mb-4 ${textPrimary}`}>Compete. Read. Earn.</h1>
          <p className={`text-base max-w-xl mx-auto ${textMuted}`}>
            Every month brings three fresh competitions — a Sprint, a Read-A-Thon, and an Elimination Bracket. Entry fees are low. Prize pools are real.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button className={tabClass('active')} onClick={() => setTab('active')}>Active</button>
          <button className={tabClass('upcoming')} onClick={() => setTab('upcoming')}>Upcoming</button>
          <button className={tabClass('past')} onClick={() => setTab('past')}>Past Results</button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          <span className={`text-xs self-center mr-1 ${textMuted}`}>Format:</span>
          {(['all', 'sprint', 'readathon', 'elimination'] as FormatFilter[]).map(f => (
            <button key={f} className={filterClass(formatFilter === f)} onClick={() => setFormatFilter(f)}>
              {f === 'all' ? 'All' : f === 'sprint' ? 'Sprint' : f === 'readathon' ? 'Read-A-Thon' : 'Elimination'}
            </button>
          ))}
          <span className={`text-xs self-center ml-3 mr-1 ${textMuted}`}>Entry:</span>
          {(['all', '5', '7', '10+'] as FeeFilter[]).map(f => (
            <button key={f} className={filterClass(feeFilter === f)} onClick={() => setFeeFilter(f)}>
              {f === 'all' ? 'All' : f === '10+' ? '$10+' : `$${f}`}
            </button>
          ))}
        </div>

        {/* Competition Cards */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className={`rounded-xl border p-6 animate-pulse ${cardBg}`}>
                <div className={`h-4 w-1/3 rounded mb-3 ${isDark ? 'bg-[#D4A843]/10' : 'bg-[#1B2A4A]/10'}`} />
                <div className={`h-3 w-2/3 rounded mb-2 ${isDark ? 'bg-[#D4A843]/10' : 'bg-[#1B2A4A]/10'}`} />
                <div className={`h-3 w-1/2 rounded ${isDark ? 'bg-[#D4A843]/10' : 'bg-[#1B2A4A]/10'}`} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className={`rounded-xl border p-10 text-center transition-colors ${cardBg}`}>
            <p className={`text-sm ${textMuted}`}>No competitions found. Check back soon.</p>
          </div>
        ) : (
          <div className="space-y-4 mb-12">
            {filtered.map((c) => (
              <div key={c.id} className={`rounded-xl border p-6 transition-colors ${cardBg}`}>
                <div className="flex items-center gap-2 mb-3">
                  {formatIcon(c.format)}
                  <span className="text-xs font-semibold text-[#D4A843] uppercase tracking-wide">{formatLabel(c.format)}</span>
                  <span className={`text-xs ml-auto ${textMuted}`}>Entry: ${c.entry_fee}</span>
                </div>
                <h3 className={`font-serif text-lg mb-1 ${textPrimary}`}>{c.title}</h3>
                {c.book_title && (
                  <p className={`text-sm mb-3 ${textMuted}`}>Book: {c.book_title}{c.book_author ? ` — ${c.book_author}` : ''}</p>
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
            ))}
          </div>
        )}

        {/* Pre-Registration Info Box */}
        <div className={`rounded-xl border p-5 mb-16 transition-colors ${cardBg}`}>
          <p className={`text-sm font-semibold mb-2 ${textPrimary}`}>How pre-registration works</p>
          <p className={`text-sm ${textMuted}`}>
            Pre-registration is free and saves your spot. When the competition goes live, you'll get notified and have 48 hours to pay your entry fee before the competition launches. No payment required until then. If a competition is canceled due to low demand, you pay nothing.
          </p>
        </div>

        {/* Author-Sponsored */}
        <div className="mb-16">
          <h2 className={`font-serif text-3xl mb-2 ${textPrimary}`}>Free to Enter — Author-Sponsored</h2>
          <p className={`text-sm mb-8 ${textMuted}`}>
            Some competitions are fully funded by the author whose book is featured. No entry fee. Same real prize pool. Just read the book and take the quiz.
          </p>
          {sponsored.length === 0 ? (
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
                    <p className={`text-sm mb-3 ${textMuted}`}>Book: {c.book_title}{c.book_author ? ` — ${c.book_author}` : ''}</p>
                  )}
                  <div className="flex items-center gap-1.5 mb-4">
                    <DollarSign size={13} className="text-[#D4A843]" />
                    <span className={`text-xs ${textMuted}`}>Prize pool: ${c.prize_pool.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={() => tab === 'upcoming' ? handlePreRegister(c.id) : navigateTo(`/competition/${c.id}`)}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[#D4A843] hover:underline"
                  >
                    {tab === 'upcoming'
                      ? preRegged.has(c.id) ? '✓ Pre-Registered' : 'Pre-Register — Free'
                      : tab === 'active' ? 'Enter Now' : 'View Results'}
                    <ArrowRight size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User-Created Tournaments */}
<div className="mb-16">
  <h2 className={`font-serif text-3xl mb-2 ${textPrimary}`}>Run Your Own Tournament</h2>
  <p className={`text-sm mb-8 ${textMuted}`}>
    Any reader can create a public or private tournament. Set the book, format, and entry fee. Prize pool grows from entry fees — platform keeps 25%, same as official competitions.
  </p>

  {/* Create CTA */}
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

  {/* Public tournaments list */}
  <PublicTournaments isDark={isDark} textPrimary={textPrimary} textMuted={textMuted} cardBg={cardBg} navigateTo={navigateTo} />
          </div>
          </div>
        </div>

      </div>
    </div>
  );
};
