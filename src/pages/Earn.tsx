import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from '../hooks/useNavigate';
import { Zap, ClipboardList, MessageSquare, BookOpen, Star, Eye, ArrowRight, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Bounty = {
  id: string;
  book_id: string;
  pool_size: number;
  per_pass_amount: number;
  status: string;
  books?: { title: string; author: string; cover_url: string };
};

type QuickTask = {
  id: string;
  title: string;
  task_type: string;
  payout_per_response: number;
  responses_count: number;
  max_responses: number;
};

type Survey = {
  id: string;
  title: string;
  payout_per_response: number;
  responses_count: number;
  max_responses: number;
};

type BetaPanel = {
  id: string;
  title: string;
  genre: string;
  payout_per_response: number;
  responses_count: number;
  max_responses: number;
};

type SensitivityPanel = {
  id: string;
  title: string;
  identity_requirements: string;
  payout_per_response: number;
  responses_count: number;
  max_responses: number;
};

type TodayTrivia = {
  id: string;
  question: string;
  options: string[];
  book_title?: string;
  author_name?: string;
  trivia_date: string;
};

const taskTypeLabel = (type: string) => {
  if (type === 'cover_vote') return 'Cover Vote';
  if (type === 'title_test') return 'Title Test';
  return 'Blurb Rating';
};

export const Earn = () => {
  const { isDark, toggleTheme } = useTheme();
  const { navigateTo } = useNavigate();

  const textPrimary = isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]';
  const textMuted = isDark ? 'text-[#F5F0E8]/70' : 'text-[#1B2A4A]/70';
  const cardBg = isDark ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20' : 'bg-white border-[#D4A843]/30';

  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [tasks, setTasks] = useState<QuickTask[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [betaPanels, setBetaPanels] = useState<BetaPanel[]>([]);
  const [sensitivityPanels, setSensitivityPanels] = useState<SensitivityPanel[]>([]);
  const [trivia, setTrivia] = useState<TodayTrivia | null>(null);
  const [triviaAnswer, setTriviaAnswer] = useState<string | null>(null);
  const [triviaResult, setTriviaResult] = useState<'correct' | 'wrong' | null>(null);
  const [triviaAnswered, setTriviaAnswered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);

      const today = new Date().toISOString().split('T')[0];

      const [
        { data: bData },
        { data: tData },
        { data: sData },
        { data: bpData },
        { data: spData },
        { data: trivData },
      ] = await Promise.all([
        supabase.from('bounties').select('*, books(title, author, cover_url)').eq('status', 'active').limit(3),
        supabase.from('quick_tasks').select('*').eq('status', 'active').limit(4),
        supabase.from('surveys').select('*').eq('status', 'active').limit(3),
        supabase.from('beta_panels').select('*').eq('status', 'active').limit(3),
        supabase.from('sensitivity_panels').select('*').eq('status', 'active').limit(3),
        supabase.from('daily_trivia').select('*').eq('trivia_date', today).single(),
      ]);

      if (bData) setBounties(bData);
      if (tData) setTasks(tData);
      if (sData) setSurveys(sData);
      if (bpData) setBetaPanels(bpData);
      if (spData) setSensitivityPanels(spData);
      if (trivData) {
        setTrivia(trivData);
        if (user) {
          const { data: answered } = await supabase
            .from('daily_trivia_answers')
            .select('selected_answer, is_correct')
            .eq('trivia_id', trivData.id)
            .eq('user_id', user.id)
            .single();
          if (answered) {
            setTriviaAnswered(true);
            setTriviaAnswer(answered.selected_answer);
            setTriviaResult(answered.is_correct ? 'correct' : 'wrong');
          }
        }
      }

      setLoading(false);
    };
    load();
  }, []);

  const handleTriviaAnswer = async (option: string) => {
    if (!trivia || triviaAnswered) return;
    if (!userId) { navigateTo('/signup'); return; }

    const isCorrect = option === trivia.correct_answer;
    setTriviaAnswer(option);
    setTriviaResult(isCorrect ? 'correct' : 'wrong');
    setTriviaAnswered(true);

    await supabase.from('daily_trivia_answers').insert({
      trivia_id: trivia.id,
      user_id: userId,
      selected_answer: option,
      is_correct: isCorrect,
      credit_earned: isCorrect ? 0.10 : 0.00,
    });

    if (isCorrect) {
      await supabase.rpc('increment_site_credit', { user_id: userId, amount: 0.10 });
    }
  };

  const SectionHeader = ({ icon, title, payout, desc }: { icon: React.ReactNode; title: string; payout: string; desc: string }) => (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-2">
        {icon}
        <h2 className={`font-serif text-2xl ${textPrimary}`}>{title}</h2>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#D4A843]/15 text-[#D4A843] border border-[#D4A843]/30 ml-auto">
          {payout}
        </span>
      </div>
      <p className={`text-sm ${textMuted}`}>{desc}</p>
    </div>
  );

  const EmptyState = ({ message }: { message: string }) => (
    <div className={`rounded-xl border p-8 text-center transition-colors ${cardBg}`}>
      <p className={`text-sm ${textMuted}`}>{message}</p>
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
        <div className="text-center mb-16">
          <h1 className={`font-serif text-4xl md:text-5xl mb-4 ${textPrimary}`}>
            More Ways to Earn
          </h1>
          <p className={`text-base max-w-xl mx-auto ${textMuted}`}>
            Competitions are the main event, but there's always something to do between them. Surveys, quick tasks, bounties, beta panels, and daily trivia keep the earnings coming in all month.
          </p>
        </div>

        {/* Daily Trivia — always first, most time-sensitive */}
        <div className="mb-16">
          <SectionHeader
            icon={<Star className="text-[#D4A843]" size={22} />}
            title="Daily Trivia"
            payout="$0.10 site credit"
            desc="One book trivia question every day. Answer correctly and earn $0.10 in site credit — redeemable for competition entry discounts and more. Log in, answer, earn."
          />
          {loading ? (
            <div className={`rounded-xl border p-6 animate-pulse ${cardBg}`}>
              <div className={`h-4 w-3/4 rounded mb-4 ${isDark ? 'bg-[#D4A843]/10' : 'bg-[#1B2A4A]/10'}`} />
              <div className="space-y-2">
                {[1,2,3,4].map(i => <div key={i} className={`h-10 rounded ${isDark ? 'bg-[#D4A843]/10' : 'bg-[#1B2A4A]/10'}`} />)}
              </div>
            </div>
          ) : !trivia ? (
            <EmptyState message="No trivia today. Check back tomorrow." />
          ) : (
            <div className={`rounded-xl border p-6 transition-colors ${cardBg}`}>
              {trivia.book_title && (
                <p className={`text-xs mb-3 ${textMuted}`}>
                  From: <span className={textPrimary}>{trivia.book_title}</span>
                  {trivia.author_name ? ` by ${trivia.author_name}` : ''}
                </p>
              )}
              <p className={`text-base font-medium mb-5 ${textPrimary}`}>{trivia.question}</p>
              <div className="space-y-2">
                {trivia.options.map((option) => {
                  const isSelected = triviaAnswer === option;
                  const isCorrect = option === trivia.correct_answer;
                  let btnClass = `w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors `;
                  if (!triviaAnswered) {
                    btnClass += isDark
                      ? 'border-[#D4A843]/20 text-[#F5F0E8]/80 hover:border-[#D4A843]/50 hover:bg-[#D4A843]/5'
                      : 'border-[#1B2A4A]/20 text-[#1B2A4A]/80 hover:border-[#1B2A4A]/40 hover:bg-[#1B2A4A]/5';
                  } else if (isCorrect) {
                    btnClass += 'border-green-500 bg-green-500/10 text-green-400';
                  } else if (isSelected && !isCorrect) {
                    btnClass += 'border-red-400 bg-red-400/10 text-red-400';
                  } else {
                    btnClass += isDark ? 'border-[#D4A843]/10 text-[#F5F0E8]/30' : 'border-[#1B2A4A]/10 text-[#1B2A4A]/30';
                  }
                  return (
                    <button
                      key={option}
                      className={btnClass}
                      onClick={() => handleTriviaAnswer(option)}
                      disabled={triviaAnswered}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
              {triviaAnswered && (
                <div className={`mt-4 flex items-center gap-2 text-sm font-medium ${triviaResult === 'correct' ? 'text-green-400' : 'text-red-400'}`}>
                  <CheckCircle size={16} />
                  {triviaResult === 'correct'
                    ? '+$0.10 site credit added to your account!'
                    : `Not quite. The answer was: ${trivia.correct_answer}`}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Author Bounties */}
        <div className="mb-16">
          <SectionHeader
            icon={<Zap className="text-[#D4A843]" size={22} />}
            title="Author Bounties"
            payout="$0.50–$2.00+"
            desc="An author sets a pool. You read their book and pass the quiz. You get paid. No ranking. No competing. Pass = earn. Every bounty you claim pays based on the author's setup."
          />
          {loading ? (
            <div className={`rounded-xl border p-6 animate-pulse ${cardBg}`}><div className={`h-16 rounded ${isDark ? 'bg-[#D4A843]/10' : 'bg-[#1B2A4A]/10'}`} /></div>
          ) : bounties.length === 0 ? (
            <EmptyState message="No open bounties right now. Check back soon." />
          ) : (
            <div className="space-y-3">
              {bounties.map((b) => (
                <div key={b.id} className={`rounded-xl border p-5 flex items-center justify-between transition-colors ${cardBg}`}>
                  <div>
                    <p className={`text-sm font-medium ${textPrimary}`}>{b.books?.title ?? 'Untitled'}</p>
                    <p className={`text-xs ${textMuted}`}>{b.books?.author}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#D4A843]">${b.per_pass_amount.toFixed(2)}</p>
                    <p className={`text-xs ${textMuted}`}>per pass</p>
                  </div>
                </div>
              ))}
              <button
                onClick={() => navigateTo('/library')}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#D4A843] hover:underline mt-2"
              >
                See all open bounties <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Quick Tasks */}
        <div className="mb-16">
          <SectionHeader
            icon={<ClipboardList className="text-[#D4A843]" size={22} />}
            title="Quick Tasks"
            payout="$0.35–$0.42 each"
            desc="Authors need quick reader opinions before they commit to big creative decisions. Vote on a cover, test a title, rate a blurb. Tasks are short, fill fast, and pay instantly on completion."
          />
          {loading ? (
            <div className={`rounded-xl border p-6 animate-pulse ${cardBg}`}><div className={`h-16 rounded ${isDark ? 'bg-[#D4A843]/10' : 'bg-[#1B2A4A]/10'}`} /></div>
          ) : tasks.length === 0 ? (
            <EmptyState message="No open tasks right now. Check back soon." />
          ) : (
            <div className="space-y-3">
              {tasks.map((t) => {
                const spotsLeft = t.max_responses - t.responses_count;
                return (
                  <div key={t.id} className={`rounded-xl border p-5 flex items-center justify-between transition-colors ${cardBg}`}>
                    <div>
                      <p className={`text-sm font-medium ${textPrimary}`}>{t.title}</p>
                      <p className={`text-xs ${textMuted}`}>{taskTypeLabel(t.task_type)} · {spotsLeft} spots left</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#D4A843]">${t.payout_per_response.toFixed(2)}</p>
                    </div>
                  </div>
                );
              })}
              <button
                onClick={() => navigateTo('/earn')}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#D4A843] hover:underline mt-2"
              >
                See all open tasks <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Feedback Surveys */}
        <div className="mb-16">
          <SectionHeader
            icon={<MessageSquare className="text-[#D4A843]" size={22} />}
            title="Feedback Surveys"
            payout="$1.00 flat"
            desc="Authors pay to survey readers who've read their work. You qualify based on your reading history. If you've read the author before, you may be matched to their survey."
          />
          {loading ? (
            <div className={`rounded-xl border p-6 animate-pulse ${cardBg}`}><div className={`h-16 rounded ${isDark ? 'bg-[#D4A843]/10' : 'bg-[#1B2A4A]/10'}`} /></div>
          ) : surveys.length === 0 ? (
            <EmptyState message="No open surveys right now. Check back soon." />
          ) : (
            <div className="space-y-3">
              {surveys.map((s) => {
                const spotsLeft = s.max_responses - s.responses_count;
                return (
                  <div key={s.id} className={`rounded-xl border p-5 flex items-center justify-between transition-colors ${cardBg}`}>
                    <div>
                      <p className={`text-sm font-medium ${textPrimary}`}>{s.title}</p>
                      <p className={`text-xs ${textMuted}`}>{spotsLeft} spots left</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#D4A843]">$1.00</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Beta Panels */}
        <div className="mb-16">
          <SectionHeader
            icon={<BookOpen className="text-[#D4A843]" size={22} />}
            title="Beta Reader Panels"
            payout="$1.50 each"
            desc="Authors upload the first chapter of their unpublished book. You read it, answer structured questions, and optionally leave your email if you'd like to be a full beta reader. Takes 15–20 minutes."
          />
          {loading ? (
            <div className={`rounded-xl border p-6 animate-pulse ${cardBg}`}><div className={`h-16 rounded ${isDark ? 'bg-[#D4A843]/10' : 'bg-[#1B2A4A]/10'}`} /></div>
          ) : betaPanels.length === 0 ? (
            <EmptyState message="No open beta panels right now. Check back soon." />
          ) : (
            <div className="space-y-3">
              {betaPanels.map((p) => {
                const spotsLeft = p.max_responses - p.responses_count;
                return (
                  <div key={p.id} className={`rounded-xl border p-5 flex items-center justify-between transition-colors ${cardBg}`}>
                    <div>
                      <p className={`text-sm font-medium ${textPrimary}`}>{p.title}</p>
                      <p className={`text-xs ${textMuted}`}>{p.genre} · {spotsLeft} spots left</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#D4A843]">$1.50</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sensitivity Panels */}
        <div className="mb-16">
          <SectionHeader
            icon={<Eye className="text-[#D4A843]" size={22} />}
            title="Sensitivity Reader Panels"
            payout="$10.00 each"
            desc="Authors submitting diverse stories need readers from specific backgrounds. You read a sample chapter and answer structured questions about representation, accuracy, and authenticity. Your lived experience is the qualification."
          />
          {loading ? (
            <div className={`rounded-xl border p-6 animate-pulse ${cardBg}`}><div className={`h-16 rounded ${isDark ? 'bg-[#D4A843]/10' : 'bg-[#1B2A4A]/10'}`} /></div>
          ) : sensitivityPanels.length === 0 ? (
            <EmptyState message="No open sensitivity panels right now. Check back soon." />
          ) : (
            <div className="space-y-3">
              {sensitivityPanels.map((p) => {
                const spotsLeft = p.max_responses - p.responses_count;
                return (
                  <div key={p.id} className={`rounded-xl border p-5 transition-colors ${cardBg}`}>
                    <div className="flex items-start justify-between mb-2">
                      <p className={`text-sm font-medium ${textPrimary}`}>{p.title}</p>
                      <p className="text-sm font-semibold text-[#D4A843]">$10.00</p>
                    </div>
                    <p className={`text-xs mb-3 ${textMuted}`}>Looking for: {p.identity_requirements}</p>
                    <p className={`text-xs ${textMuted}`}>{spotsLeft} spots left</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="text-center">
          <h2 className={`font-serif text-3xl mb-3 ${textPrimary}`}>Ready to start earning?</h2>
          <p className={`text-sm mb-8 ${textMuted}`}>Create your free account and start earning today.</p>
          <button
            onClick={() => navigateTo('/signup')}
            className="inline-flex items-center gap-2 bg-[#D4A843] text-[#1B2A4A] font-semibold px-8 py-4 rounded-xl hover:bg-[#c49a3a] transition-colors text-lg"
          >
            Create Your Free Account <ArrowRight size={20} />
          </button>
        </div>

      </div>
    </div>
  );
};
