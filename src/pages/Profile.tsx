import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../hooks/useNavigate';
import { ArrowLeft, DollarSign } from 'lucide-react';

interface Profile {
  email: string;
  available_balance: number;
}

interface CompletedBook {
  book_id: number;
  books: {
    title: string;
    author: string;
    cover_url: string | null;
  };
}

export const Profile = () => {
  const { user } = useAuth();
  const { navigateTo } = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [completedBooks, setCompletedBooks] = useState<CompletedBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [cashingOut, setCashingOut] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

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
    }

    if (completedResult.data) {
      setCompletedBooks(completedResult.data as CompletedBook[]);
    }

    setLoading(false);
  };

  const handleCashOut = async () => {
    if (!user || !profile || profile.available_balance < 5) return;

    setCashingOut(true);

    await Promise.all([
      supabase.from('cashout_requests').insert({
        user_id: user.id,
        amount: profile.available_balance,
        status: 'pending',
      }),
      supabase.from('profiles').update({ available_balance: 0.0 }).eq('id', user.id),
    ]);

    setProfile({ ...profile, available_balance: 0.0 });
    setCashingOut(false);
    setShowSuccess(true);

    setTimeout(() => {
      setShowSuccess(false);
    }, 5000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-white">Loading profile...</div>
      </div>
    );
  }

  const canCashOut = profile && profile.available_balance >= 5;

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
        {showSuccess && (
          <div className="mb-6 p-4 bg-green-900/20 border border-green-900/50 rounded-lg">
            <p className="text-green-400 font-medium">
              Your cash out request has been submitted. You'll receive a gift card within 24 hours.
            </p>
          </div>
        )}

        <div className="bg-[#1a1a1a] rounded-lg p-8 border border-gray-800 mb-8">
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
              disabled={!canCashOut || cashingOut}
              className={`w-full flex items-center justify-center gap-2 font-medium px-6 py-3 rounded-lg transition ${
                canCashOut
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
              title={!canCashOut ? 'Minimum $5.00 to cash out' : ''}
            >
              <DollarSign className="w-5 h-5" />
              {cashingOut ? 'Processing...' : 'Cash Out'}
            </button>
            {!canCashOut && (
              <p className="text-gray-500 text-sm text-center mt-2">
                Minimum $5.00 required to cash out
              </p>
            )}
          </div>
        </div>

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
