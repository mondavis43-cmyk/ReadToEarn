import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../hooks/useNavigate';
import { useTheme } from '../contexts/ThemeContext';
import { ArrowLeft, DollarSign, Gift, Trophy, Target, BookCheck, Star, Wallet } from 'lucide-react';

interface Profile {
  email: string;
  available_balance: number;
  site_credit: number;
  birthday: string | null;
  birthday_bonus_last_claimed: number | null;
  streak_count: number | null;
  is_upgraded: boolean;
  accuracy_rate: number;
  wins_count: number;
  completed_this_month: number;
  payout_email: string | null;
  payout_method: 'paypal' | 'wise' | null;
}

interface CompletedBook {
  book_id: string;
  books: {
    title: string;
    author: string;
    cover_url: string | null;
  };
}

const BIRTHDAY_BONUS = 0.25;

export const Profile = () => {
  const { user } = useAuth();
  const { navigateTo } = useNavigate();
  const { isDark } = useTheme();

  const [profile, setProfile]                   = useState<Profile | null>(null);
  const [completedBooks, setCompletedBooks]     = useState<CompletedBook[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [birthdayInput, setBirthdayInput]       = useState('');
  const [savingBirthday, setSavingBirthday]     = useState(false);
  const [birthdaySuccess, setBirthdaySuccess]   = useState(false);
  const [birthdayError, setBirthdayError]       = useState('');

  // Payout state
  const [payoutEmail, setPayoutEmail]           = useState('');
  const [payoutMethod, setPayoutMethod]         = useState<'paypal' | 'wise'>('paypal');
  const [savingPayout, setSavingPayout]         = useState(false);
  const [payoutSaved, setPayoutSaved]           = useState(false);
  const [payoutError, setPayoutError]           = useState('');

  const get1099Warning = () => {
    if (!profile) return null;
    const earned = profile.available_balance;
    if (earned >= 550) return 'critical';
    if (earned >= 500) return 'warning';
    return null;
  };

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    const [profileResult, completedResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase
        .from('completed_books')
        .select('book_id, books(title, author, cover_url)')
        .eq('user_id', user.id)
        .limit(10),
    ]);

    if (profileResult.data) {
      setProfile(profileResult.data);
      if (profileResult.data.birthday) setBirthdayInput(profileResult.data.birthday);
      if (profileResult.data.payout_email)  setPayoutEmail(profileResult.data.payout_email);
      if (profileResult.data.payout_method) setPayoutMethod(profileResult.data.payout_method);
    }

    if (completedResult.data) {
      setCompletedBooks(completedResult.data as CompletedBook[]);
    }

    setLoading(false);
  };

  const handleSaveBirthday = async () => {
    if (!user || !birthdayInput) return;
    setSavingBirthday(true);
    const { error } = await supabase
      .from('profiles')
      .update({ birthday: birthdayInput })
      .eq('id', user.id);
    if (!error) {
      setBirthdaySuccess(true);
      await loadProfile();
    } else {
      setBirthdayError('Could not save birthday.');
    }
    setSavingBirthday(false);
  };

  const handleSavePayout = async () => {
    if (!user) return;
    if (!payoutEmail.trim()) { setPayoutError('Please enter an email address.'); return; }
    setSavingPayout(true);
    setPayoutError('');
    const { error } = await supabase
      .from('profiles')
      .update({ payout_email: payoutEmail.trim(), payout_method: payoutMethod })
      .eq('id', user.id);
    if (!error) {
      setPayoutSaved(true);
      setTimeout(() => setPayoutSaved(false), 2500);
      await loadProfile();
    } else {
      setPayoutError('Could not save payout info.');
    }
    setSavingPayout(false);
  };

  const handleUpgrade = () => {
    sessionStorage.setItem('checkoutItem', JSON.stringify({
      type: 'subscription',
      label: 'Membership — Monthly',
      amount: 499,
      metadata: { plan: 'monthly', user_id: user?.id },
    }));
    sessionStorage.setItem('pendingSubmission', JSON.stringify({
      table: 'subscriptions',
      data: { user_id: user?.id, plan: 'monthly', status: 'active' },
    }));
    window.history.pushState({}, '', '/checkout');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  // Theme tokens
  const bg           = isDark ? 'bg-[#1B2A4A]'       : 'bg-[#F5F0E8]';
  const cardBg       = isDark ? 'bg-[#162238]'        : 'bg-white';
  const cardBorder   = isDark ? 'border-[#F5F0E8]/10' : 'border-[#1B2A4A]/10';
  const headingColor = isDark ? 'text-[#F5F0E8]'      : 'text-[#1B2A4A]';
  const subColor     = isDark ? 'text-[#F5F0E8]/50'   : 'text-[#1B2A4A]/50';
  const dividerColor = isDark ? 'border-[#F5F0E8]/10' : 'border-[#1B2A4A]/10';
  const inputClass   = isDark
    ? 'bg-[#1B2A4A] border-white/10 text-white placeholder-white/30'
    : 'bg-gray-50 border-black/10 text-[#1B2A4A] placeholder-black/30';

  if (loading) return (
    <div className={`min-h-screen ${bg} flex items-center justify-center`}>
      <div className="w-8 h-8 border-2 border-[#D4A843] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className={`min-h-screen ${bg} pb-12 transition-colors duration-300`}>

      {/* Header */}
      <div className={`border-b ${dividerColor} px-4 py-4 mb-8`}>
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigateTo('/')} className={`${subColor} hover:text-[#D4A843]`}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className={`font-serif text-3xl ${headingColor}`}>Profile</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-6">

        {/* 1099 Warning */}
        {get1099Warning() && (
          <div className={`${get1099Warning() === 'critical' ? 'bg-red-500/10 border-red-500/30' : 'bg-yellow-500/10 border-yellow-500/30'} border rounded-lg p-4`}>
            <p className={`${get1099Warning() === 'critical' ? 'text-red-400' : 'text-yellow-400'} font-medium text-sm`}>
              {get1099Warning() === 'critical' ? '⚠️ Action Required: Tax Info Needed' : '📋 Approaching Tax Threshold'}
            </p>
            <p className={`text-xs ${subColor} mt-1`}>
              You've earned ${profile?.available_balance.toFixed(2)}. To keep earning past $600, we'll need your tax info soon for 1099 reporting.
            </p>
          </div>
        )}

        {/* Giveaway Banner */}
        {profile?.is_upgraded && (
          <div className="rounded-xl border border-[#D4A843]/40 bg-[#D4A843]/10 p-4 flex items-center gap-3">
            <Gift className="w-5 h-5 text-[#D4A843] flex-shrink-0" />
            <div>
              <p className={`text-sm font-semibold ${headingColor}`}>
                You're entered in this month's giveaway 🎉
              </p>
              <p className={`text-xs ${subColor} mt-0.5`}>
                3 winners drawn monthly — prizes credited directly to your balance. No action needed.
              </p>
            </div>
          </div>
        )}

        {/* Earning Overview */}
        <div className={`${cardBg} rounded-xl p-8 border ${cardBorder} shadow-sm`}>
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider ${subColor} mb-1`}>Cash Balance</p>
            <p className={`text-4xl font-serif ${headingColor}`}>${profile?.available_balance?.toFixed(2) ?? '0.00'}</p>
            <button
              onClick={() => navigateTo('/cashout')}
              disabled={!profile || profile.available_balance < 10}
              className="mt-4 flex items-center gap-2 bg-[#D4A843] text-[#1B2A4A] font-bold px-4 py-2 rounded-lg text-sm hover:bg-[#c49a38] disabled:opacity-40"
            >
              <DollarSign className="w-4 h-4" /> Cash Out
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className={`${cardBg} p-4 border ${cardBorder} rounded-xl text-center`}>
            <BookCheck className="w-5 h-5 mx-auto mb-2 text-green-500" />
            <p className={`text-xl font-serif ${headingColor}`}>{profile?.completed_this_month ?? 0}</p>
            <p className={`text-[10px] uppercase ${subColor}`}>Books this Month</p>
          </div>
          <div className={`${cardBg} p-4 border ${cardBorder} rounded-xl text-center`}>
            <Target className="w-5 h-5 mx-auto mb-2 text-blue-500" />
            <p className={`text-xl font-serif ${headingColor}`}>{profile?.accuracy_rate ?? 0}%</p>
            <p className={`text-[10px] uppercase ${subColor}`}>Accuracy Rate</p>
          </div>
          <div className={`${cardBg} p-4 border ${cardBorder} rounded-xl text-center`}>
            <Trophy className="w-5 h-5 mx-auto mb-2 text-[#D4A843]" />
            <p className={`text-xl font-serif ${headingColor}`}>{profile?.wins_count ?? 0}</p>
            <p className={`text-[10px] uppercase ${subColor}`}>Competition Wins</p>
          </div>
        </div>

        {/* Membership */}
        <div className={`${cardBg} rounded-xl p-6 border-2 ${profile?.is_upgraded ? 'border-[#D4A843]' : 'border-dashed ' + cardBorder}`}>
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Star className={`w-5 h-5 ${profile?.is_upgraded ? 'text-[#D4A843] fill-[#D4A843]' : subColor}`} />
                <h3 className={`font-bold ${headingColor}`}>
                  {profile?.is_upgraded ? 'Upgraded Member' : 'Standard Account'}
                </h3>
              </div>
              <p className={`text-xs ${subColor}`}>
                {profile?.is_upgraded
                  ? 'Active: Enjoy ad-free reading, priority survey access, monthly giveaway entry, and 30% off entries.'
                  : 'Upgrade for $4.99/mo to unlock ad-free reading, priority survey queues, monthly giveaway entry, entry discounts, and more.'}
              </p>
            </div>
            {!profile?.is_upgraded && (
              <button
                onClick={handleUpgrade}
                className="bg-[#1B2A4A] text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-black transition"
              >
                Upgrade
              </button>
            )}
          </div>
        </div>

        {/* Payout Settings */}
        <div className={`${cardBg} rounded-xl p-6 border ${cardBorder}`}>
          <h3 className={`text-sm font-bold ${headingColor} mb-1 flex items-center gap-2`}>
            <Wallet className="w-4 h-4 text-[#D4A843]" /> Payout Settings
          </h3>
          <p className={`text-xs ${subColor} mb-4`}>
            Where should we send your earnings? Used for cashouts, bounty rewards, and competition prizes.
          </p>

          {/* Method picker */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setPayoutMethod('paypal')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition ${
                payoutMethod === 'paypal'
                  ? 'bg-[#FFC439] text-[#003087] border-[#FFC439]'
                  : isDark
                    ? 'bg-transparent text-white/50 border-white/10 hover:border-white/30'
                    : 'bg-transparent text-black/40 border-black/10 hover:border-black/30'
              }`}
            >
              🅿 PayPal
            </button>
            <button
              onClick={() => setPayoutMethod('wise')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition ${
                payoutMethod === 'wise'
                  ? 'bg-[#9FE870] text-[#163300] border-[#9FE870]'
                  : isDark
                    ? 'bg-transparent text-white/50 border-white/10 hover:border-white/30'
                    : 'bg-transparent text-black/40 border-black/10 hover:border-black/30'
              }`}
            >
              🌍 Wise
            </button>
          </div>

          {/* Email input */}
          <div className="mb-4">
            <label className={`block text-xs font-medium ${subColor} mb-1.5`}>
              {payoutMethod === 'paypal' ? 'PayPal Email' : 'Wise Email'}
            </label>
            <input
              type="email"
              value={payoutEmail}
              onChange={(e) => { setPayoutEmail(e.target.value); setPayoutError(''); }}
              placeholder={`Email linked to your ${payoutMethod === 'paypal' ? 'PayPal' : 'Wise'} account`}
              className={`w-full p-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A843]/40 ${inputClass}`}
            />
          </div>

          {payoutError && <p className="text-red-400 text-xs mb-3">{payoutError}</p>}

          <button
            onClick={handleSavePayout}
            disabled={savingPayout}
            className="w-full py-2.5 bg-[#D4A843] text-[#1B2A4A] font-bold rounded-lg text-sm hover:bg-[#c49a38] transition disabled:opacity-50"
          >
            {savingPayout ? 'Saving...' : payoutSaved ? '✓ Saved' : 'Save Payout Info'}
          </button>

          {payoutMethod === 'wise' && (
            <p className={`text-xs ${subColor} mt-2`}>
              Wise is used for international payouts. Make sure the email matches your Wise account exactly.
            </p>
          )}
        </div>

        {/* Birthday & Streak */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={`${cardBg} rounded-xl p-6 border ${cardBorder}`}>
            <h3 className={`text-sm font-bold ${headingColor} mb-4 flex items-center gap-2`}>
              <Gift className="w-4 h-4 text-[#D4A843]" /> Birthday Bonus
            </h3>
            <input
              type="date"
              value={birthdayInput}
              onChange={(e) => setBirthdayInput(e.target.value)}
              className={`w-full mb-3 p-2 rounded border ${isDark ? 'bg-[#1B2A4A] border-white/10 text-white' : 'bg-gray-50 border-black/10'}`}
            />
            {birthdayError   && <p className="text-red-400 text-xs mb-2">{birthdayError}</p>}
            {birthdaySuccess && <p className="text-green-400 text-xs mb-2">Birthday saved!</p>}
            <button
              onClick={handleSaveBirthday}
              disabled={savingBirthday}
              className="text-xs font-bold text-[#D4A843] hover:underline disabled:opacity-50"
            >
              {savingBirthday ? 'Saving...' : 'Update Birthday'}
            </button>
          </div>

          <div className={`${cardBg} rounded-xl p-6 border ${cardBorder} flex flex-col justify-center items-center text-center`}>
            <p className="text-3xl font-serif text-[#D4A843]">{profile?.streak_count ?? 0}</p>
            <p className={`text-xs font-bold ${headingColor} uppercase`}>Day Reading Streak</p>
            <p className={`text-[10px] ${subColor} mt-1`}>Keep reading to earn site credits!</p>
          </div>
        </div>

      </div>
    </div>
  );
};
