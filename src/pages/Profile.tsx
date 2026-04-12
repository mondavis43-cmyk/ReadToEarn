import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../hooks/useNavigate';
import { useTheme } from '../contexts/ThemeContext';
import { ArrowLeft, DollarSign, Gift, BookOpen } from 'lucide-react';

interface Profile {
  email: string;
  available_balance: number;
  birthday: string | null;
  birthday_bonus_last_claimed: number | null;
  streak_count: number | null;
  last_quiz_date: string | null;
  subscription_tier: 'free' | 'casual' | 'avid' | 'voracious' | null;
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

const TIER_CONFIG = {
  free:      { label: 'Free',      payout: '$0.50', color: '#9CA3AF', bg: 'bg-gray-500/10',   border: 'border-gray-500/30'   },
  casual:    { label: 'Casual',    payout: '$0.65', color: '#60A5FA', bg: 'bg-blue-400/10',   border: 'border-blue-400/30'   },
  avid:      { label: 'Avid',      payout: '$0.80', color: '#A78BFA', bg: 'bg-violet-400/10', border: 'border-violet-400/30' },
  voracious: { label: 'Voracious', payout: '$0.95', color: '#D4A843', bg: 'bg-[#D4A843]/10',  border: 'border-[#D4A843]/30'  },
};

export const Profile = () => {
  const { user } = useAuth();
  const { navigateTo } = useNavigate();
  const { isDark } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [completedBooks, setCompletedBooks] = useState<CompletedBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [birthdayInput, setBirthdayInput] = useState('');
  const [savingBirthday, setSavingBirthday] = useState(false);
  const [birthdaySuccess, setBirthdaySuccess] = useState(false);
  const [birthdayError, setBirthdayError] = useState('');
  const [claimingBonus, setClaimingBonus] = useState(false);
  const [bonusClaimed, setBonusClaimed] = useState(false);

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
        .eq('user_id', user.id),
    ]);

    if (profileResult.data) {
      setProfile(profileResult.data);
      if (profileResult.data.birthday) {
        setBirthdayInput(profileResult.data.birthday);
      }
    }

    if (completedResult.data) {
      setCompletedBooks(completedResult.data as CompletedBook[]);
    }

    setLoading(false);
  };

  const isBirthdayToday = () => {
    if (!profile?.birthday) return false;
    const today = new Date();
    const bday = new Date(profile.birthday);
    return (
      today.getMonth() === bday.getMonth() &&
      today.getDate() === bday.getDate()
    );
  };

  const hasClaimed = () => {
    if (!profile?.birthday_bonus_last_claimed) return false;
    return profile.birthday_bonus_last_claimed === new Date().getFullYear();
  };

  const handleSaveBirthday = async () => {
    if (!user || !birthdayInput) return;
    setSavingBirthday(true);
    setBirthdayError('');
    setBirthdaySuccess(false);

    const { error } = await supabase
      .from('profiles')
      .update({ birthday: birthdayInput })
      .eq('id', user.id);

    if (error) {
      setBirthdayError('Could not save birthday. Please try again.');
    } else {
      setBirthdaySuccess(true);
      await loadProfile();
    }
    setSavingBirthday(false);
  };

  const handleClaimBirthdayBonus = async () => {
    if (!user || !profile) return;
    setClaimingBonus(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        available_balance: profile.available_balance + BIRTHDAY_BONUS,
        birthday_bonus_last_claimed: new Date().getFullYear(),
      })
      .eq('id', user.id);

    if (!error) {
      setBonusClaimed(true);
      await loadProfile();
    }
    setClaimingBonus(false);
  };

  const handleCashOut = () => {
    navigateTo('/cashout');
  };

  // Theme tokens
  const bg = isDark ? 'bg-[#1B2A4A]' : 'bg-[#F5F0E8]';
  const cardBg = isDark ? 'bg-[#162238]' : 'bg-white';
  const cardBorder = isDark ? 'border-[#F5F0E8]/10' : 'border-[#1B2A4A]/10';
  const headingColor = isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]';
  const subColor = isDark ? 'text-[#F5F0E8]/50' : 'text-[#1B2A4A]/50';
  const labelColor = isDark ? 'text-[#F5F0E8]/70' : 'text-[#1B2A4A]/70';
  const inputBg = isDark ? 'bg-[#1B2A4A]' : 'bg-[#F5F0E8]';
  const inputBorder = isDark
    ? 'border-[#F5F0E8]/15 focus:border-[#D4A843]'
    : 'border-[#1B2A4A]/20 focus:border-[#D4A843]';
  const inputText = isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]';
  const dividerColor = isDark ? 'border-[#F5F0E8]/10' : 'border-[#1B2A4A]/10';

  const tier = profile?.subscription_tier ?? 'free';
  const tierConfig = TIER_CONFIG[tier] ?? TIER_CONFIG.free;

  if (loading) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center transition-colors duration-300`}>
        <div className="w-8 h-8 border-2 border-[#D4A843] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300`}>
      {/* Header */}
      <div className={`border-b ${dividerColor} px-4 py-4`}>
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigateTo('/')}
            className={`${subColor} hover:text-[#D4A843] transition`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className={`font-serif text-3xl ${headingColor}`}>Your Profile</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Birthday Bonus Banner */}
        {isBirthdayToday() && !hasClaimed() && !bonusClaimed && (
          <div className="bg-[#D4A843]/10 border border-[#D4A843]/40 rounded-lg p-5">
            <div className="flex items-start gap-3">
              <Gift className="w-5 h-5 text-[#D4A843] mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-[#D4A843]">Happy Birthday!</p>
                <p className={`text-sm mt-1 ${subColor}`}>
                  You have a $0.25 birthday bonus waiting. Claim it before midnight.
                </p>
                <button
                  onClick={handleClaimBirthdayBonus}
                  disabled={claimingBonus}
                  className="mt-3 bg-[#D4A843] text-[#1B2A4A] font-medium px-4 py-2 rounded-lg text-sm hover:bg-[#c49a38] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {claimingBonus ? 'Claiming...' : 'Claim $0.25 Bonus'}
                </button>
              </div>
            </div>
          </div>
        )}

        {bonusClaimed && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <p className="text-green-400 text-sm font-medium">
              Birthday bonus claimed! $0.25 added to your balance.
            </p>
          </div>
        )}

        {/* Account Details */}
        <div className={`${cardBg} rounded-lg p-8 border ${cardBorder}`}>
          <h2 className={`text-2xl font-semibold ${headingColor} mb-1`}>Account</h2>
          <p className={`${subColor} text-sm mb-6`}>{profile?.email}</p>

          <div className={`border-t ${dividerColor} pt-6`}>
            <p className={`text-sm ${labelColor} mb-1`}>Available Balance</p>
            <p className={`text-4xl font-serif ${headingColor} mb-4`}>
              ${profile?.available_balance?.toFixed(2) ?? '0.00'}
            </p>
            <button
              onClick={handleCashOut}
              disabled={!profile || profile.available_balance < 10}
              className="flex items-center gap-2 bg-[#D4A843] text-[#1B2A4A] font-medium px-5 py-2.5 rounded-lg hover:bg-[#c49a38] transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <DollarSign className="w-4 h-4" />
              Cash Out
            </button>
            {profile && profile.available_balance < 10 && (
              <p className={`mt-2 text-xs ${subColor}`}>
                Minimum cashout is $10.00
                {profile.available_balance > 0 &&
                  ` — $${(10 - profile.available_balance).toFixed(2)} to go`}
              </p>
            )}
          </div>
        </div>

        {/* Subscription Tier */}
        <div className={`${cardBg} rounded-lg p-8 border ${cardBorder}`}>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-4 h-4" style={{ color: tierConfig.color }} />
            <h2 className={`text-xl font-semibold ${headingColor}`}>Membership</h2>
          </div>
          <p className={`${subColor} text-sm mb-6`}>
            Your plan determines how much you earn per book quiz.
          </p>

          <div className={`rounded-lg p-4 border ${tierConfig.bg} ${tierConfig.border} mb-5`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: tierConfig.color }}>
                  Current Plan
                </p>
                <p className="text-2xl font-serif mt-0.5" style={{ color: tierConfig.color }}>
                  {tierConfig.label}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: tierConfig.color }}>
                  Payout per book
                </p>
                <p className="text-2xl font-serif mt-0.5" style={{ color: tierConfig.color }}>
                  {tierConfig.payout}
                </p>
              </div>
            </div>
          </div>

          <div className={`border-t ${dividerColor} pt-5 grid grid-cols-4 gap-2`}>
            {(Object.entries(TIER_CONFIG) as [string, typeof TIER_CONFIG.free][]).map(([key, config]) => (
              <div
                key={key}
                className={`rounded-lg p-3 border text-center ${
                  tier === key
                    ? `${config.bg} ${config.border}`
                    : isDark
                    ? 'bg-white/5 border-white/10'
                    : 'bg-black/5 border-black/10'
                }`}
              >
                <p
                  className="text-xs font-semibold"
                  style={{ color: tier === key ? config.color : undefined }}
                >
                  {config.label}
                </p>
                <p
                  className={`text-sm font-serif mt-0.5 ${tier === key ? '' : subColor}`}
                  style={{ color: tier === key ? config.color : undefined }}
                >
                  {config.payout}
                </p>
              </div>
            ))}
          </div>

          <p className={`text-xs ${subColor} mt-4`}>
            Upgrade your plan to earn more per book.{' '}
            <button
              onClick={() => navigateTo('/pricing')}
              className="text-[#D4A843] hover:underline"
            >
              View plans →
            </button>
          </p>
        </div>

        {/* Reading Streak */}
        <div className={`${cardBg} rounded-lg p-8 border ${cardBorder}`}>
          <h2 className={`text-xl font-semibold ${headingColor} mb-1`}>Reading Streak</h2>
          <p className={`${subColor} text-sm mb-6`}>
            Pass at least one quiz per day to keep your streak alive.
          </p>

          <div className="flex items-end gap-6 mb-6">
            <div>
              <p className="text-4xl font-serif text-[#D4A843]">
                {profile?.streak_count ?? 0}
              </p>
              <p className={`text-xs ${subColor} mt-1`}>day streak</p>
            </div>
            {profile?.last_quiz_date && (
              <p className={`text-xs ${subColor} mb-1`}>
                Last quiz: {new Date(profile.last_quiz_date).toLocaleDateString()}
              </p>
            )}
          </div>

          <div className={`border-t ${dividerColor} pt-5 grid grid-cols-2 gap-4`}>
            <div>
              <p className={`text-xs ${subColor} mb-1`}>7-day bonus</p>
              <p className={`text-sm font-medium ${headingColor}`}>+$0.10</p>
            </div>
            <div>
              <p className={`text-xs ${subColor} mb-1`}>30-day bonus</p>
              <p className={`text-sm font-medium ${headingColor}`}>+$0.10</p>
            </div>
          </div>
        </div>

        {/* Birthday Bonus */}
        <div className={`${cardBg} rounded-lg p-8 border ${cardBorder}`}>
          <div className="flex items-center gap-2 mb-1">
            <Gift className="w-4 h-4 text-[#D4A843]" />
            <h2 className={`text-xl font-semibold ${headingColor}`}>Birthday Bonus</h2>
          </div>
          <p className={`${subColor} text-sm mb-6`}>
            Add your birthday to receive a $0.25 bonus every year on your special day.
          </p>

          <div className="space-y-3">
            <div>
              <label className={`block text-sm font-medium ${labelColor} mb-2`}>
                Date of Birth
              </label>
              <input
                type="date"
                value={birthdayInput}
                onChange={(e) => setBirthdayInput(e.target.value)}
                className={`w-full px-4 py-3 ${inputBg} border ${inputBorder} rounded-lg ${inputText} focus:outline-none transition`}
              />
            </div>

            {profile?.birthday && (
              <p className={`text-xs ${subColor}`}>
                Saved: {new Date(profile.birthday).toLocaleDateString()}
              </p>
            )}

            {birthdaySuccess && (
              <p className="text-green-400 text-sm">Birthday saved!</p>
            )}
            {birthdayError && (
              <p className="text-red-400 text-sm">{birthdayError}</p>
            )}

            <button
              onClick={handleSaveBirthday}
              disabled={savingBirthday || !birthdayInput}
              className="bg-[#D4A843] text-[#1B2A4A] font-medium px-5 py-2.5 rounded-lg hover:bg-[#c49a38] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingBirthday ? 'Saving...' : profile?.birthday ? 'Update Birthday' : 'Save Birthday'}
            </button>
          </div>
        </div>

        {/* Completed Books */}
        <div>
          <h2 className={`text-2xl font-semibold ${headingColor} mb-4`}>Your Library</h2>

          {completedBooks.length === 0 ? (
            <div className={`${cardBg} rounded-lg p-12 border ${cardBorder} text-center`}>
              <p className={`${subColor} mb-4`}>No books completed yet.</p>
              <button
                onClick={() => navigateTo('/books')}
                className="bg-[#D4A843] text-[#1B2A4A] font-medium px-5 py-2.5 rounded-lg hover:bg-[#c49a38] transition"
              >
                Browse Books
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {completedBooks.map((cb) => (
                <div
                  key={cb.book_id}
                  className={`${cardBg} rounded-lg overflow-hidden border ${cardBorder}`}
                >
                  <div className={`aspect-[2/3] ${isDark ? 'bg-[#1B2A4A]' : 'bg-[#F5F0E8]'} flex items-center justify-center`}>
                    {cb.books.cover_url ? (
                      <img
                        src={cb.books.cover_url}
                        alt={cb.books.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className={`text-xs ${subColor} text-center px-2`}>No cover</span>
                    )}
                  </div>
                  <div className="p-2">
                    <p className={`font-serif text-sm ${headingColor} line-clamp-2`}>
                      {cb.books.title}
                    </p>
                    <p className={`text-xs ${subColor} mt-0.5`}>{cb.books.author}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
