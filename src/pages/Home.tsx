import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import {
  Zap, BookOpen, Trophy, DollarSign,
  ClipboardList, MessageSquare, Star, Users,
  ArrowRight, ChevronDown
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────
type Competition = {
  id: string;
  title: string;
  type: 'sprint' | 'read_a_thon' | 'elimination';
  entry_fee: number;
  prize_pool: number;
  start_date: string;
  end_date: string;
  status: string;
};

// ── Ticker data (replace with DB query when winners table exists) ──────────
const TICKER_ITEMS = [
  '🏅 October Sprint Winner: @readfast_jenna',
  '📚 Read-A-Thon Champion: @pages4days',
  '🔥 Elimination Bracket: @bookslayer99',
  '🔐 Subscriber Champion: @quietreader_k',
  '🏅 November Sprint Winner: @inkandpages',
  '📚 Read-A-Thon Champion: @nightowlreads',
];

const COMPETITION_TYPE_LABELS: Record<string, string> = {
  sprint: 'Sprint',
  read_a_thon: 'Read-A-Thon',
  elimination: 'Elimination Bracket',
};

// ── Scrolling Ticker ───────────────────────────────────────────────────────
const Ticker = ({ isDark }: { isDark: boolean }) => {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div
      className="overflow-hidden py-3 border-y"
      style={{
        borderColor: isDark ? '#334155' : '#e2d9c8',
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
      }}
    >
      <div className="flex animate-marquee whitespace-nowrap gap-12">
        {items.map((item, i) => (
          <span
            key={i}
            className="text-sm font-medium flex-shrink-0"
            style={{ color: isDark ? '#94a3b8' : '#4a5568' }}
          >
            {item}
            <span className="mx-6" style={{ color: '#D4A843' }}>·</span>
          </span>
        ))}
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────
export const Home = () => {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const howItWorksRef = useRef<HTMLDivElement>(null);

  const [upcomingCompetitions, setUpcomingCompetitions] = useState<Competition[]>([]);

  useEffect(() => {
    loadUpcomingCompetitions();
  }, []);

  const loadUpcomingCompetitions = async () => {
    const { data } = await supabase
      .from('competitions')
      .select('id, title, type, entry_fee, prize_pool, start_date, end_date, status')
      .in('status', ['upcoming', 'active'])
      .neq('book_type', 'bulletin_board')
      .order('start_date', { ascending: true })
      .limit(3);

    if (data) setUpcomingCompetitions(data);
  };

  const scrollToHowItWorks = () => {
    howItWorksRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ── Shared styles ────────────────────────────────────────────────────────
  const bg          = isDark ? '#0f172a' : '#F5F0E8';
  const cardBg      = isDark ? '#1e293b' : '#ffffff';
  const cardBorder  = isDark ? '#334155' : '#e2d9c8';
  const textPrimary = isDark ? '#F5F0E8' : '#1B2A4A';
  const textMuted   = isDark ? '#94a3b8' : '#6b7280';
  const navy        = '#1B2A4A';
  const gold        = '#D4A843';

  const pillStyle = (color: string) => ({
    backgroundColor: `${color}20`,
    border: `1px solid ${color}40`,
    color,
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: bg }}>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 pt-24 pb-20 text-center">
        <div
          className="inline-block text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6"
          style={pillStyle(gold)}
        >
          Now Open
        </div>

        <h1
          className="font-serif text-5xl md:text-6xl leading-tight mb-6"
          style={{ color: textPrimary }}
        >
          Get Paid to<br />Read Books.
        </h1>

        <p className="text-lg max-w-xl mx-auto mb-8" style={{ color: textMuted }}>
          Compete in reading tournaments, pass book quizzes, and earn real money.
          ReadToEarn turns your reading habit into a reward.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <button
            onClick={() => navigate('/signup')}
            className="px-8 py-3.5 rounded-lg font-semibold text-sm transition flex items-center justify-center gap-2"
            style={{ backgroundColor: navy, color: '#F5F0E8' }}
          >
            Start Earning <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={scrollToHowItWorks}
            className="px-8 py-3.5 rounded-lg font-semibold text-sm transition flex items-center justify-center gap-2 border"
            style={{
              backgroundColor: 'transparent',
              borderColor: cardBorder,
              color: textPrimary,
            }}
          >
            See How It Works <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs" style={{ color: textMuted }}>
          Payouts via PayPal, Venmo, Wise & Gift Cards. Cash out at $10.
        </p>
      </section>

      {/* ── TICKER ────────────────────────────────────────────────────────── */}
      <Ticker isDark={isDark} />

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section ref={howItWorksRef} className="max-w-4xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="font-serif text-4xl mb-3" style={{ color: textPrimary }}>
            Three Steps. Real Money.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {[
            {
              icon: <BookOpen className="w-5 h-5" style={{ color: gold }} />,
              step: '01',
              title: 'Pick a Competition',
              body: 'Browse our monthly lineup of Sprints, Read-A-Thons, and Elimination Brackets. Pay your entry fee. A book is announced. You read it.',
            },
            {
              icon: <Zap className="w-5 h-5" style={{ color: gold }} />,
              step: '02',
              title: 'Pass the Quiz',
              body: 'Every competition comes down to a 10-question quiz. You have 8 minutes. Score high. Finish fast. Your rank is determined by accuracy first, speed second.',
            },
            {
              icon: <DollarSign className="w-5 h-5" style={{ color: gold }} />,
              step: '03',
              title: 'Collect Your Winnings',
              body: 'Top performers split the prize pool. Funds go to PayPal, Venmo, Wise, or a gift card — your choice.',
            },
          ].map(({ icon, step, title, body }) => (
            <div
              key={step}
              className="rounded-lg border p-6"
              style={{ backgroundColor: cardBg, borderColor: cardBorder }}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${gold}15` }}
                >
                  {icon}
                </div>
                <span
                  className="font-serif text-3xl"
                  style={{ color: isDark ? '#334155' : '#e2d9c8' }}
                >
                  {step}
                </span>
              </div>
              <h3 className="font-semibold mb-2" style={{ color: textPrimary }}>{title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: textMuted }}>{body}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={() => navigate('/competitions')}
            className="px-6 py-3 rounded-lg text-sm font-semibold transition"
            style={{ backgroundColor: gold, color: navy }}
          >
            Browse Upcoming Competitions
          </button>
        </div>
      </section>

      {/* ── COMPETITION TYPES ─────────────────────────────────────────────── */}
      <section
        className="py-20 border-y"
        style={{ borderColor: cardBorder, backgroundColor: isDark ? '#0d1829' : '#EDE8DF' }}
      >
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-serif text-4xl mb-3" style={{ color: textPrimary }}>
              Three Ways to Compete
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {[
              {
                emoji: '⚡',
                title: 'The Sprint',
                duration: '24–72 hours',
                body: 'One book. One quiz. The clock is running. Score the most, finish fastest.',
              },
              {
                emoji: '📚',
                title: 'The Read-A-Thon',
                duration: 'A weekend to a week',
                body: 'More pages, more money. Read every book you can within the window and pass the quizzes. Most pages read wins.',
              },
              {
                emoji: '🏆',
                title: 'The Elimination Bracket',
                duration: '1–2 weeks',
                body: 'Round by round. Score high enough to survive. One person takes the top prize.',
              },
            ].map(({ emoji, title, duration, body }) => (
              <div
                key={title}
                className="rounded-lg border p-6"
                style={{ backgroundColor: cardBg, borderColor: cardBorder }}
              >
                <div className="text-3xl mb-4">{emoji}</div>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold" style={{ color: textPrimary }}>{title}</h3>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full ml-2 flex-shrink-0"
                    style={pillStyle(gold)}
                  >
                    {duration}
                  </span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: textMuted }}>{body}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button
              onClick={() => navigate('/competitions')}
              className="px-6 py-3 rounded-lg text-sm font-semibold border transition"
              style={{ borderColor: navy, color: textPrimary, backgroundColor: 'transparent' }}
            >
              Explore All Competitions
            </button>
          </div>
        </div>
      </section>

      {/* ── EARN BEYOND TOURNAMENTS ───────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="font-serif text-4xl mb-3" style={{ color: textPrimary }}>
            Competitions Aren't the Only Way to Earn
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              icon: <DollarSign className="w-5 h-5" />,
              title: 'Author Bounties',
              body: 'Authors pay you directly to read and pass their book\'s quiz. No competition needed.',
            },
            {
              icon: <ClipboardList className="w-5 h-5" />,
              title: 'Quick Tasks',
              body: 'Vote on cover art, test titles, rate blurbs. 1–3 minutes per task.',
            },
            {
              icon: <MessageSquare className="w-5 h-5" />,
              title: 'Feedback Surveys',
              body: 'Share your reader opinion. Authors want to know what you think.',
            },
            {
              icon: <Star className="w-5 h-5" />,
              title: 'Daily Trivia',
              body: 'Answer one book question each day for site credit.',
            },
            {
              icon: <Users className="w-5 h-5" />,
              title: 'Beta Reader Panels',
              body: 'Read a first chapter. Give feedback. Get recruited.',
            },
          ].map(({ icon, title, body }) => (
            <div
              key={title}
              className="rounded-lg border p-5 flex gap-4"
              style={{ backgroundColor: cardBg, borderColor: cardBorder }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${gold}15`, color: gold }}
              >
                {icon}
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-1" style={{ color: textPrimary }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: textMuted }}>{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── MONTHLY SCHEDULE ──────────────────────────────────────────────── */}
      <section
        className="py-20 border-y"
        style={{ borderColor: cardBorder, backgroundColor: isDark ? '#0d1829' : '#EDE8DF' }}
      >
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-serif text-4xl mb-3" style={{ color: textPrimary }}>
              Something Is Always Happening
            </h2>
            <p style={{ color: textMuted }}>Every month follows the same structure.</p>
          </div>

          <div
            className="rounded-lg border overflow-hidden"
            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
          >
            {[
              { days: 'Days 1–3',   label: 'Flash Sprint',          detail: '$5 entry',              color: gold },
              { days: 'Days 4–7',   label: 'Break',                 detail: 'Bounties · Surveys · Quick Tasks · Author AMA', color: textMuted },
              { days: 'Days 8–15',  label: 'Read-A-Thon',           detail: '$7 entry',              color: '#60a5fa' },
              { days: 'Days 16–18', label: 'Break',                 detail: 'Bounties · Surveys · Quick Tasks · Author AMA', color: textMuted },
              { days: 'Days 19–31', label: 'Elimination Bracket',   detail: '$10 entry · multi-round', color: '#a78bfa' },
            ].map(({ days, label, detail, color }, i, arr) => (
              <div
                key={days}
                className="flex items-center gap-4 px-6 py-4"
                style={{
                  borderBottom: i < arr.length - 1 ? `1px solid ${cardBorder}` : 'none',
                }}
              >
                <span
                  className="text-xs font-mono w-20 flex-shrink-0"
                  style={{ color: textMuted }}
                >
                  {days}
                </span>
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="font-medium text-sm flex-1" style={{ color: textPrimary }}>
                  {label}
                </span>
                <span className="text-xs" style={{ color: textMuted }}>{detail}</span>
              </div>
            ))}
          </div>

          <p className="text-center text-sm mt-6" style={{ color: textMuted }}>
            Plus: subscriber-only competitions every month with guaranteed prize pools.
          </p>
        </div>
      </section>

      {/* ── LIVE UPCOMING COMPETITIONS ────────────────────────────────────── */}
      {upcomingCompetitions.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 py-20">
          <div className="text-center mb-10">
            <h2 className="font-serif text-4xl mb-3" style={{ color: textPrimary }}>
              Coming Up Next
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {upcomingCompetitions.map((comp) => (
              <div
                key={comp.id}
                className="rounded-lg border p-5 cursor-pointer hover:border-[#D4A843] transition"
                style={{ backgroundColor: cardBg, borderColor: cardBorder }}
                onClick={() => navigate('/competitions')}
              >
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={pillStyle(gold)}
                >
                  {COMPETITION_TYPE_LABELS[comp.type] ?? comp.type}
                </span>
                <h3
                  className="font-semibold mt-3 mb-1 text-sm"
                  style={{ color: textPrimary }}
                >
                  {comp.title}
                </h3>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs" style={{ color: textMuted }}>
                    Entry: ${comp.entry_fee}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: gold }}>
                    ${comp.prize_pool} pool
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button
              onClick={() => navigate('/competitions')}
              className="px-6 py-3 rounded-lg text-sm font-semibold transition"
              style={{ backgroundColor: gold, color: navy }}
            >
              See All Competitions
            </button>
          </div>
        </section>
      )}

      {/* ── BOTTOM CTA ────────────────────────────────────────────────────── */}
      <section
        className="py-24 text-center border-t"
        style={{ borderColor: cardBorder, backgroundColor: isDark ? '#0d1829' : '#EDE8DF' }}
      >
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="font-serif text-4xl mb-4" style={{ color: textPrimary }}>
            Your bookshelf is worth more than you think.
          </h2>
          <p className="text-lg mb-8" style={{ color: textMuted }}>
            Join ReadToEarn and start getting paid for what you already do.
          </p>
          <button
            onClick={() => navigate('/signup')}
            className="px-10 py-4 rounded-lg font-semibold text-sm transition flex items-center gap-2 mx-auto"
            style={{ backgroundColor: navy, color: '#F5F0E8' }}
          >
            Create Your Free Account <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-xs mt-4" style={{ color: textMuted }}>
            Free to join. Cash out at $10. No subscription required to start earning.
          </p>
        </div>
      </section>

      {/* ── MARQUEE ANIMATION ─────────────────────────────────────────────── */}
      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>

    </div>
  );
};
