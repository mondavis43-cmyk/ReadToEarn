import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../hooks/useNavigate';
import { ArrowLeft, DollarSign, Gift } from 'lucide-react';

interface Profile {
  email: string;
  available_balance: number;
  birthday: string | null;
  birthday_bonus_last_claimed: number | null;
  streak_count: number | null;        // ADD
  last_quiz_date: string | null;      // ADD
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
      setBirthdayError('Failed to save birthday. Try again.');
    } else {
      setBirthdaySuccess(true);
      loadProfile();
      setTimeout(() => setBirthdaySuccess(false), 3000);
    }
    setSavingBirthday(false);
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

  const hasClaimedBonusThisYear = () => {
    if (!profile?.birthday_bonus_last_claimed) return false;
    return profile.birthday_bonus_last_claimed === new Date().getFullYear();
  };

  const handleClaimBirthdayBonus = async () => {
    if (!user || !profile) return;
    setClaimingBonus(true);

    const newBalance = Math.round((profile.available_balance + BIRTHDAY_BONUS) * 100) / 100;

    const { error } = await supabase
      .from('profiles')
      .update({
        available_balance: newBalance,
        birthday_bonus_last_claimed: new Date().getFullYear(),
      })
      .eq('id', user.id);

    if (!error) {
      setBonusClaimed(true);
      loadProfile();
    }
    setClaimingBonus(false);
  };

  const handleCashOut = () => {
    navigateTo('/cashout');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-white">Loading profile...</div>
      </div>
    );
  }

  const canCashOut = profile && profile.available_balance >= 5;
  const showBirthdayBanner = isBirthdayToday() && !hasClaimedBonusThisYear() && !bonusClaimed;

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <header className="border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <button
            onClick={() => navigateTo('/')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Library
          </button>
          <h1 className="font-serif text-3xl text-white">Your Profile</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">

        {/* Birthday bonus banner - only shows on their birthday if unclaimed */}
        {showBirthdayBanner && (
          <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-5 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Gift className="w-5 h-5 text-yellow-400" />
              <div>
                <p className="text-yellow-300 font-medium">Happy Birthday! 🎂</p>
                <p className="text-yellow-500 text-sm">You have a $0.25 birthday bonus waiting for you.</p>
              </div>
            </div>
            <button
              onClick={handleClaimBirthdayBonus}
              disabled={claimingBonus}
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-medium px-4 py-2 rounded-lg text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {claimingBonus ? 'Claiming...' : 'Claim $0.25'}
            </button>
          </div>
        )}

        {bonusClaimed && (
          <div className="bg-green-900/20 border border-green-900/50 rounded-lg p-4 mb-6 text-center">
            <p className="text-green-400 font-medium">🎉 $0.25 birthday bonus added to your balance!</p>
          </div>
        )}

        {/* Account details */}
        <div className="bg-[#1a1a1a] rounded-lg p-8 border border-gray-800 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-white mb-1">Account Details</h2>
              <p className="text-gray-400">{profile?.email}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400 mb-1">Available Balance</div>
              <div className="text-4xl font-serif text-white">
                ${profile?.available_balance.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-6">
            <button
              onClick={handleCashOut}
              disabled={!canCashOut}
              className={`w-full flex items-center justify-center gap-2 font-medium px-6 py-3 rounded-lg transition ${
                canCashOut
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
              title={!canCashOut ? 'Minimum $5.00 to cash out' : ''}
            >
              <DollarSign className="w-5 h-5" />
              Cash Out
            </button>
            {!canCashOut && (
              <p className="text-gray-500 text-sm text-center mt-2">
                Minimum $5.00 required to cash out
              </p>
            )}
          </div>
        </div>

{/* Streak display */}
{profile && (
  <div className="bg-[#1a1a1a] rounded-lg p-8 border border-gray-800 mb-6">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Reading Streak 🔥</h2>
        <p className="text-gray-400 text-sm">Pass a quiz every day to keep your streak alive.</p>
      </div>
      <div className="text-right">
        <div className="text-4xl font-serif text-orange-400">{profile.streak_count ?? 0}</div>
        <div className="text-gray-500 text-xs mt-1">day{profile.streak_count !== 1 ? 's' : ''}</div>
      </div>
    </div>
    <div className="mt-4 pt-4 border-t border-gray-800 flex gap-6">
      <div className="text-center">
        <p className="text-gray-500 text-xs mb-1">7-day bonus</p>
        <p className="text-white text-sm font-medium">$0.05</p>
      </div>
      <div className="text-center">
        <p className="text-gray-500 text-xs mb-1">30-day bonus</p>
        <p className="text-white text-sm font-medium">$0.25</p>
      </div>
      <div className="text-center">
        <p className="text-gray-500 text-xs mb-1">last quiz</p>
        <p className="text-white text-sm font-medium">
          {profile.last_quiz_date
            ? new Date(profile.last_quiz_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : 'none yet'}
        </p>
      </div>
    </div>
  </div>
)}
        
        {/* Birthday section */}
        <div className="bg-[#1a1a1a] rounded-lg p-8 border border-gray-800 mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="w-5 h-5 text-yellow-400" />
            <h2 className="text-xl font-semibold text-white">Birthday Bonus</h2>
          </div>
          <p className="text-gray-400 text-sm mb-5">
            Add your birthday and get a $0.25 bonus credited to your balance every year on your special day.
          </p>

          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-2">Your Birthday</label>
              <input
                type="date"
                value={birthdayInput}
                onChange={(e) => setBirthdayInput(e.target.value)}
                className="w-full px-4 py-3 bg-[#0f0f0f] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-500"
              />
            </div>
            <button
              onClick={handleSaveBirthday}
              disabled={savingBirthday || !birthdayInput}
              className="px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingBirthday ? 'Saving...' : profile?.birthday ? 'Update' : 'Save'}
            </button>
          </div>

          {birthdaySuccess && (
            <p className="text-green-400 text-sm mt-3">Birthday saved!</p>
          )}
          {birthdayError && (
            <p className="text-red-400 text-sm mt-3">{birthdayError}</p>
          )}

          {profile?.birthday && (
            <p className="text-gray-500 text-xs mt-3">
              🎂 Your birthday is set to {new Date(profile.birthday + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
            </p>
          )}
        </div>

        {/* Completed books */}
        <div>
          <h2 className="text-2xl font-semibold text-white mb-6">
            Your Library ({completedBooks.length} {completedBooks.length === 1 ? 'book' : 'books'})
          </h2>

          {completedBooks.length === 0 ? (
            <div className="bg-[#1a1a1a] rounded-lg p-12 border border-gray-800 text-center">
              <p className="text-gray-400">
                You haven't completed any books yet. Start reading to earn rewards!
              </p>
              <button
                onClick={() => navigateTo('/')}
                className="mt-4 bg-white text-black font-medium px-6 py-3 rounded-lg hover:bg-gray-200 transition"
              >
                Browse Books
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {completedBooks.map((cb) => (
                <div
                  key={cb.book_id}
                  className="bg-[#1a1a1a] rounded-lg overflow-hidden border border-gray-800"
                >
                  <div className="aspect-[2/3] relative bg-gray-900">
                    {cb.books.cover_url && (
                      <img
                        src={cb.books.cover_url}
                        alt={cb.books.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-serif text-sm text-white line-clamp-2 mb-1">
                      {cb.books.title}
                    </h3>
                    <p className="text-gray-400 text-xs">{cb.books.author}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
