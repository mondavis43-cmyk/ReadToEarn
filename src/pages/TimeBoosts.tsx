import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from '../hooks/useNavigate';
import { Zap, Clock, TrendingUp, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

type BoostBundle = {
  id: string;
  label: string;
  boosts: number;
  amount: number; // cents
  price: string;  // display
  description: string;
  popular?: boolean;
};

const BUNDLES: BoostBundle[] = [
  {
    id: 'boost_single',
    label: 'Single',
    boosts: 1,
    amount: 99,
    price: '$0.99',
    description: 'Try it out. 1 boost to use whenever you need extra time.',
  },
  {
    id: 'boost_starter',
    label: 'Starter Pack',
    boosts: 6,
    amount: 499,
    price: '$4.99',
    description: '6 boosts at a better rate.',
    popular: true,
  },
  {
    id: 'boost_pro',
    label: 'Pro Pack',
    boosts: 15,
    amount: 999,
    price: '$9.99',
    description: '15 boosts. Never run out mid-quiz.',
  },
];

export const TimeBoosts = () => {
  const { isDark, toggleTheme } = useTheme();
  const { navigateTo } = useNavigate();

  const textPrimary = isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]';
  const textMuted = isDark ? 'text-[#F5F0E8]/70' : 'text-[#1B2A4A]/70';
  const cardBg = isDark ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20' : 'bg-white border-[#D4A843]/30';

  const [userId, setUserId] = useState<string | null>(null);
  const [boostBalance, setBoostBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoadingBalance(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data } = await supabase
          .from('user_boosts')
          .select('balance')
          .eq('user_id', user.id)
          .maybeSingle();
        setBoostBalance(data?.balance ?? 0);
      }
      setLoadingBalance(false);
    };
    load();
  }, []);

  const handleBuy = (bundle: BoostBundle) => {
    if (!userId) { navigateTo('/signup'); return; }

    (window as any).__checkoutItem = {
      type: 'time_boost',
      label: `Time Boosts — ${bundle.label} (${bundle.boosts} boosts)`,
      amount: bundle.amount,
      metadata: {
        bundle_id: bundle.id,
        boosts: bundle.boosts,
      },
    };

    (window as any).__pendingSubmission = {
      table: 'user_boost_purchases',
      data: {
        user_id: userId,
        bundle_id: bundle.id,
        boosts_purchased: bundle.boosts,
        amount_cents: bundle.amount,
      },
    };

    window.history.pushState({}, '', '/checkout');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

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

      <div className="max-w-2xl mx-auto px-4 py-16">

        {/* Hero */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <Zap size={36} className="text-[#D4A843]" />
          </div>
          <h1 className={`font-serif text-4xl md:text-5xl mb-4 ${textPrimary}`}>Time Boosts</h1>
          <p className={`text-base max-w-md mx-auto ${textMuted}`}>
            Running low on time during a quiz? A boost adds 2 minutes instantly. Buy a pack and keep them in your inventory. Use them whenever you need.
          </p>
        </div>

        {/* Current balance */}
        <div className={`rounded-xl border p-5 mb-10 flex items-center justify-between ${cardBg}`}>
          <div className="flex items-center gap-3">
            <Clock size={20} className="text-[#D4A843]" />
            <div>
              <p className={`text-sm font-semibold ${textPrimary}`}>Your Boost Balance</p>
              <p className={`text-xs ${textMuted}`}>Available to use on any quiz</p>
            </div>
          </div>
          {loadingBalance ? (
            <div className="w-10 h-6 rounded bg-[#D4A843]/10 animate-pulse" />
          ) : (
            <p className="text-[#D4A843] font-bold text-2xl">
              {boostBalance ?? 0}
            </p>
          )}
        </div>

        {/* How it works */}
        <div className="mb-10">
          <h2 className={`font-serif text-2xl mb-5 ${textPrimary}`}>How it works</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: <Zap size={18} className="text-[#D4A843]" />, title: 'Buy a pack', body: 'Choose a bundle below. Boosts are added to your account instantly after payment.' },
              { icon: <Clock size={18} className="text-[#D4A843]" />, title: 'Use during a quiz', body: 'Hit the boost if you fear you may run low on time. Each boost adds 2 minutes.' },
              { icon: <TrendingUp size={18} className="text-[#D4A843]" />, title: 'Earn more', body: 'Boosts never expire. Stack them up and use them when it counts most.' },
            ].map((item) => (
              <div key={item.title} className={`rounded-xl border p-4 ${cardBg}`}>
                <div className="mb-2">{item.icon}</div>
                <p className={`text-sm font-semibold mb-1 ${textPrimary}`}>{item.title}</p>
                <p className={`text-xs leading-relaxed ${textMuted}`}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bundles */}
        <div className="mb-12">
          <h2 className={`font-serif text-2xl mb-6 ${textPrimary}`}>Choose a Pack</h2>
          <div className="space-y-4">
            {BUNDLES.map((bundle) => (
              <div
                key={bundle.id}
                className={`rounded-xl border p-6 transition-colors relative ${cardBg} ${
                  bundle.popular ? 'border-[#D4A843]/60' : ''
                }`}
              >
                {bundle.popular && (
                  <span className="absolute top-4 right-4 text-xs font-semibold px-2 py-0.5 rounded-full bg-[#D4A843]/15 text-[#D4A843] border border-[#D4A843]/30">
                    Most Popular
                  </span>
                )}
                <div className="flex items-start justify-between mb-3 pr-24">
                  <div>
                    <p className={`font-serif text-xl mb-0.5 ${textPrimary}`}>{bundle.label}</p>
                    <p className={`text-xs ${textMuted}`}>{bundle.description}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-[#D4A843] font-bold text-2xl">{bundle.price}</span>
                    <span className={`text-sm ${textMuted}`}>
                      {bundle.boosts} boost{bundle.boosts > 1 ? 's' : ''}
                      <span className="ml-1 text-xs">
                        (${(bundle.amount / bundle.boosts / 100).toFixed(2)} each)
                      </span>
                    </span>
                  </div>
                  <button
                    onClick={() => handleBuy(bundle)}
                    className="inline-flex items-center gap-1.5 bg-[#D4A843] text-[#1B2A4A] font-semibold px-5 py-2.5 rounded-xl hover:bg-[#c49a3a] transition text-sm"
                  >
                    Buy <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className={`rounded-xl border p-6 ${cardBg}`}>
          <h2 className={`font-serif text-xl mb-4 ${textPrimary}`}>Questions</h2>
          <div className="space-y-4">
            {[
              {
                q: 'Do boosts expire?',
                a: 'No. Once purchased, boosts stay in your account until you use them.',
              },
              {
                q: 'Can I use more than one boost per quiz?',
                a: 'Yes. You can use as many boosts as you have in your inventory during a single quiz session.',
              },
              {
                q: 'What happens if I run out of boosts mid-quiz?',
                a: "You can't purchase more during an active quiz. Buy a pack before you start if you're worried about time.",
              },
              {
                q: 'Do boosts help in competitions?',
                a: 'Yes. Boosts work in competition quizzes the same as author bounties ones.',
              },
            ].map((item) => (
              <div key={item.q}>
                <p className={`text-sm font-semibold mb-1 ${textPrimary}`}>{item.q}</p>
                <p className={`text-sm ${textMuted}`}>{item.a}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
