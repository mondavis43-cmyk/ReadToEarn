import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from '../hooks/useNavigate';
import { Zap, ClipboardList, MessageSquare, BookOpen, Eye, ArrowRight } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);

      const [
        { data: bData },
        { data: tData },
        { data: sData },
        { data: bpData },
        { data: spData },
      ] = await Promise.all([
        supabase.from('bounties').select('*, books(title, author, cover_url)').eq('status', 'active').limit(3),
        supabase.from('quick_tasks').select('*').eq('status', 'active').limit(4),
        supabase.from('surveys').select('*').eq('status', 'active').limit(3),
        supabase.from('beta_panels').select('*').eq('status', 'active').limit(3),
        supabase.from('sensitivity_panels').select('*').eq('status', 'active').limit(3),
      ]);

      if (bData) setBounties(bData);
      if (tData) setTasks(tData);
      if (sData) setSurveys(sData);
      if (bpData) setBetaPanels(bpData);
      if (spData) setSensitivityPanels(spData);

      setLoading(false);
    };
    load();
  }, []);

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
            Competitions are the main event, but there's always something to do between them. Surveys, quick tasks, bounties, and beta panels keep the earnings coming in all month.
          </p>
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
            <div className={`rounded-xl border p-8 text-center transition-colors ${cardBg}`}>
              <p className={`text-sm ${textMuted} mb-3`}>No open tasks right now. Check back soon.</p>
              <button
                onClick={() => navigateTo('/quick-tasks')}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#D4A843] hover:underline"
              >
                View task page <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {(() => {
                const t = tasks[0];
                const spotsLeft = t.max_responses - t.responses_count;
                return (
                  <div className={`rounded-xl border p-5 flex items-center justify-between transition-colors ${cardBg}`}>
                    <div>
                      <p className={`text-sm font-medium ${textPrimary}`}>{t.title}</p>
                      <p className={`text-xs ${textMuted}`}>{taskTypeLabel(t.task_type)} · {spotsLeft} spots left</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#D4A843]">${t.payout_per_response.toFixed(2)}</p>
                    </div>
                  </div>
                );
              })()}
              <button
                onClick={() => navigateTo('/quick-tasks')}
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
            <div className={`rounded-xl border p-8 text-center transition-colors ${cardBg}`}>
              <p className={`text-sm ${textMuted} mb-3`}>No open surveys right now. Check back soon.</p>
              <button
                onClick={() => navigateTo('/surveys')}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#D4A843] hover:underline"
              >
                View survey page <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {(() => {
                const s = surveys[0];
                const spotsLeft = s.max_responses - s.responses_count;
                return (
                  <div className={`rounded-xl border p-5 flex items-center justify-between transition-colors ${cardBg}`}>
                    <div>
                      <p className={`text-sm font-medium ${textPrimary}`}>{s.title}</p>
                      <p className={`text-xs ${textMuted}`}>{spotsLeft} spots left</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#D4A843]">$1.00</p>
                    </div>
                  </div>
                );
              })()}
              <button
                onClick={() => navigateTo('/surveys')}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#D4A843] hover:underline mt-2"
              >
                See all open surveys <ArrowRight size={14} />
              </button>
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
            <div className={`rounded-xl border p-8 text-center transition-colors ${cardBg}`}>
              <p className={`text-sm ${textMuted} mb-3`}>No open beta panels right now. Check back soon.</p>
              <button
                onClick={() => navigateTo('/beta-reader-panels')}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#D4A843] hover:underline"
              >
                View beta panel page <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {(() => {
                const p = betaPanels[0];
                const spotsLeft = p.max_responses - p.responses_count;
                return (
                  <div className={`rounded-xl border p-5 flex items-center justify-between transition-colors ${cardBg}`}>
                    <div>
                      <p className={`text-sm font-medium ${textPrimary}`}>{p.title}</p>
                      <p className={`text-xs ${textMuted}`}>{p.genre} · {spotsLeft} spots left</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#D4A843]">$1.50</p>
                    </div>
                  </div>
                );
              })()}
              <button
                onClick={() => navigateTo('/beta-reader-panels')}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#D4A843] hover:underline mt-2"
              >
                See all open panels <ArrowRight size={14} />
              </button>
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
            <div className={`rounded-xl border p-8 text-center transition-colors ${cardBg}`}>
              <p className={`text-sm ${textMuted} mb-3`}>No open sensitivity panels right now. Check back soon.</p>
              <button
                onClick={() => navigateTo('/sensitivity-reader-panels')}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#D4A843] hover:underline"
              >
                View sensitivity panel page <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {(() => {
                const p = sensitivityPanels[0];
                const spotsLeft = p.max_responses - p.responses_count;
                return (
                  <div className={`rounded-xl border p-5 transition-colors ${cardBg}`}>
                    <div className="flex items-start justify-between mb-2">
                      <p className={`text-sm font-medium ${textPrimary}`}>{p.title}</p>
                      <p className="text-sm font-semibold text-[#D4A843]">$10.00</p>
                    </div>
                    <p className={`text-xs mb-3 ${textMuted}`}>Looking for: {p.identity_requirements}</p>
                    <p className={`text-xs ${textMuted}`}>{spotsLeft} spots left</p>
                  </div>
                );
              })()}
              <button
                onClick={() => navigateTo('/sensitivity-reader-panels')}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#D4A843] hover:underline mt-2"
              >
                See all open panels <ArrowRight size={14} />
              </button>
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
