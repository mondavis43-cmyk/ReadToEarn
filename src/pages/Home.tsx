import { useEffect, useState, useRef } from 'react';
import { FEATURES } from '../config/features';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import {
  Zap, BookOpen, ClipboardList, MessageSquare,
  Users, DollarSign, ArrowRight, ChevronDown
} from 'lucide-react';

// ── Ticker data ────────────────────────────────────────────────────────────
const TICKER_ITEMS = [
  '📋 Quick Task: "Which cover grabs you?" — 32 responses collected',
  '📝 Survey: "What tropes do you love?" — 18 responses collected',
  '📚 Panel: "Rate this first chapter" — 12 responses collected',
  '💰 Bounty: "Pass the quiz on Starfall" — 8 spots remaining',
  '📋 Quick Task: "Pick your favorite blurb" — 25 responses collected',
  '📝 Survey: "Ad creative testing" — 22 responses collected',
];

// ── Navigate helper ────────────────────────────────────────────────────────
const navigateTo = (path: string) => {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
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
  const howItWorksRef = useRef<HTMLDivElement>(null);

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
          Get Paid for Your<br />Reader Opinion.
        </h1>

        <p className="text-lg max-w-xl mx-auto mb-8" style={{ color: textMuted }}>
          Authors need real feedback. You get paid for your time. Complete quick tasks,
          take surveys, join panels, and earn — no competition required.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <button
            onClick={() => navigateTo('/signup')}
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
          Free to join. Cash out at $10. No subscription required to start earning.
        </p>
      </section>

      {/* ── TICKER ────────────────────────────────────────────────────────── */}
      <Ticker isDark={isDark} />

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section ref={howItWorksRef} className="max-w-4xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="font-serif text-4xl mb-3" style={{ color: textPrimary }}>
            How It Works
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {[
            {
              icon: <ClipboardList className="w-5 h-5" style={{ color: gold }} />,
              step: '01',
              title: 'Choose a Task',
              body: 'Browse open Quick Tasks, Surveys, and Panels. Each one takes 1–20 minutes. Pick what interests you and dive in.',
            },
            {
              icon: <Zap className="w-5 h-5" style={{ color: gold }} />,
              step: '02',
              title: 'Complete It',
              body: 'Vote on cover art, answer survey questions, or read a sample chapter and give feedback. Every completed task earns you money.',
            },
            {
              icon: <DollarSign className="w-5 h-5" style={{ color: gold }} />,
              step: '03',
              title: 'Get Paid',
              body: 'Earnings go straight to your account balance. Cash out via bank transfer or Wise once you hit $10.',
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
            onClick={() => navigateTo('/how-it-works')}
            className="px-6 py-3 rounded-lg text-sm font-semibold transition"
            style={{ backgroundColor: gold, color: navy }}
          >
            Learn More
          </button>
        </div>
      </section>

      {/* ── WAYS TO EARN ─────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="font-serif text-4xl mb-3" style={{ color: textPrimary }}>
            Ways to Earn
          </h2>
          <p className="text-lg max-w-xl mx-auto" style={{ color: textMuted }}>
            Authors pay for your feedback. Pick the format that fits your time.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              icon: <ClipboardList className="w-5 h-5" />,
              title: 'Quick Tasks',
              time: '1–3 min',
              body: 'Vote on cover art, test titles, rate blurbs. Fast decisions, instant pay.',
            },
            {
              icon: <MessageSquare className="w-5 h-5" />,
              title: 'Surveys',
              time: '5–15 min',
              body: 'Share your reader opinion on tropes, hooks, positioning, and more. Authors use your insights to make better books.',
            },
            {
              icon: <BookOpen className="w-5 h-5" />,
              title: 'Panels',
              time: '15–20 min',
              body: 'Read a first chapter or sample, answer structured questions, and earn. Get recruited for beta reading off-platform.',
            },
            {
              icon: <DollarSign className="w-5 h-5" />,
              title: 'Author Bounties',
              time: 'per quiz',
              body: 'Pass a book quiz on a Wide author\'s title and earn from their bounty pool. No competition — just read and pass.',
            },
            {
              icon: <Users className="w-5 h-5" />,
              title: 'Sensitivity Panels',
              time: '15–20 min',
              body: 'Authors with specific identity/experience needs pay for matched reader feedback on sample chapters. $10 per panel.',
            },
          ].map(({ icon, title, time, body }) => (
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
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-sm" style={{ color: textPrimary }}>{title}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={pillStyle(gold)}>{time}</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: textMuted }}>{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOR AUTHORS ──────────────────────────────────────────────────── */}
      <section
        className="py-20 border-y"
        style={{ borderColor: cardBorder, backgroundColor: isDark ? '#0d1829' : '#EDE8DF' }}
      >
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-serif text-4xl mb-3" style={{ color: textPrimary }}>
              Are You an Author?
            </h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: textMuted }}>
              Get real reader feedback before you publish. Test covers, blurbs, hooks, and concepts — or pay for verified quiz passes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {[
              {
                icon: <ClipboardList className="w-5 h-5" style={{ color: gold }} />,
                title: 'Research Marketplace',
                body: 'Quick Tasks, Surveys, and Panels give you real reader data on your packaging, positioning, and samples.',
              },
              {
                icon: <BookOpen className="w-5 h-5" style={{ color: gold }} />,
                title: 'Listings + Quizzes',
                body: 'List your book in the library with an always-available quiz. Readers discover you while browsing.',
              },
              {
                icon: <DollarSign className="w-5 h-5" style={{ color: gold }} />,
                title: 'Bounties (Wide)',
                body: 'Fund a quiz-pass bounty pool. Pay only for results — readers earn when they pass your book quiz.',
              },
            ].map(({ icon, title, body }) => (
              <div
                key={title}
                className="rounded-lg border p-6"
                style={{ backgroundColor: cardBg, borderColor: cardBorder }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${gold}15` }}
                >
                  {icon}
                </div>
                <h3 className="font-semibold mb-2" style={{ color: textPrimary }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: textMuted }}>{body}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button
              onClick={() => navigateTo('/authors')}
              className="px-6 py-3 rounded-lg text-sm font-semibold transition"
              style={{ backgroundColor: gold, color: navy }}
            >
              Author Sign Up
            </button>
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ────────────────────────────────────────────────────── */}
      <section
        className="py-24 text-center border-t"
        style={{ borderColor: cardBorder, backgroundColor: isDark ? '#0d1829' : '#EDE8DF' }}
      >
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="font-serif text-4xl mb-4" style={{ color: textPrimary }}>
            Your opinion is worth more than you think.
          </h2>
          <p className="text-lg mb-8" style={{ color: textMuted }}>
            Join ReadToEarn and start getting paid for your reader feedback.
          </p>
          <button
            onClick={() => navigateTo('/signup')}
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
