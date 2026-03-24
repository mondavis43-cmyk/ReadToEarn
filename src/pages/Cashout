import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../hooks/useNavigate';
import { ArrowLeft } from 'lucide-react';

const GIFT_CARD_BRANDS = [
  'Amazon',
  'Target',
  'Walmart',
  'DoorDash',
  'Uber Eats',
  'Starbucks',
  'Barnes & Noble',
  'Netflix',
  'Apple',
  'Google Play',
];

export const Cashout = () => {
  const { user } = useAuth();
  const { navigateTo } = useNavigate();
  const [balance, setBalance] = useState(0);
  const [payoutType, setPayoutType] = useState<'paypal' | 'venmo' | 'gift_card'>('gift_card');
  const [payoutDetails, setPayoutDetails] = useState('');
  const [giftCardBrand, setGiftCardBrand] = useState(GIFT_CARD_BRANDS[0]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pastRequests, setPastRequests] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    const [profileResult, requestsResult] = await Promise.all([
      supabase.from('profiles').select('available_balance').eq('id', user.id).single(),
      supabase
        .from('cashout_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ]);

    if (profileResult.data) {
      setBalance(profileResult.data.available_balance);
    }

    if (requestsResult.data) {
      setPastRequests(requestsResult.data);
    }

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (balance < 5) {
      setError('You need at least $5.00 to cash out.');
      return;
    }

    if (!payoutDetails.trim()) {
      setError(
        payoutType === 'paypal'
          ? 'Please enter your PayPal email.'
          : payoutType === 'venmo'
          ? 'Please enter your Venmo username.'
          : 'Please select a gift card brand.'
      );
      return;
    }

    setSubmitting(true);

    const { error: insertError } = await supabase.from('cashout_requests').insert({
      user_id: user!.id,
      amount: balance,
      payout_type: payoutType,
      payout_details: payoutType === 'gift_card' ? giftCardBrand : payoutDetails,
      gift_card_brand: payoutType === 'gift_card' ? giftCardBrand : null,
      status: 'pending',
    });

    if (insertError) {
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
      return;
    }

    // Deduct balance after successful request
    await supabase
      .from('profiles')
      .update({ available_balance: 0 })
      .eq('id', user!.id);

    setSuccess(true);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="font-serif text-3xl text-white mb-4">Request Submitted!</h1>
          <div className="bg-[#1a1a1a] rounded-lg p-8 border border-gray-800">
            <p className="text-gray-300 mb-2">Your cashout request for</p>
            <p className="text-white text-2xl font-semibold mb-2">${balance.toFixed(2)}</p>
            <p className="text-gray-400 text-sm mb-6">
              has been submitted. You'll receive your{' '}
              {payoutType === 'gift_card'
                ? `${giftCardBrand} gift card`
                : payoutType === 'paypal'
                ? 'PayPal payment'
                : 'Venmo payment'}{' '}
              within 1-3 business days.
            </p>
            <button
              onClick={() => navigateTo('/')}
              className="w-full bg-white text-black font-medium py-3 rounded-lg hover:bg-gray-200 transition"
            >
              Back to Library
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center gap-4">
          <button
            onClick={() => navigateTo('/')}
            className="text-gray-400 hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-serif text-3xl text-white">Cash Out</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-12">
        {/* Balance Card */}
        <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800 mb-8 text-center">
          <p className="text-gray-400 text-sm mb-1">Available Balance</p>
          <p className="text-4xl font-semibold text-white">${balance.toFixed(2)}</p>
          {balance < 5 && (
            <p className="text-yellow-500 text-sm mt-2">
              Minimum cashout is $5.00 — keep reading to earn more!
            </p>
          )}
        </div>

        {balance >= 5 ? (
          <form onSubmit={handleSubmit} className="bg-[#1a1a1a] rounded-lg p-8 border border-gray-800">
            {error && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-900/50 rounded text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Payout Type */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                How would you like to be paid?
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['gift_card', 'paypal', 'venmo'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setPayoutType(type);
                      setPayoutDetails('');
                    }}
                    className={`py-3 px-2 rounded-lg border text-sm font-medium transition ${
                      payoutType === type
                        ? 'bg-white text-black border-white'
                        : 'bg-transparent text-gray-300 border-gray-700 hover:border-gray-500'
                    }`}
                  >
                    {type === 'gift_card' ? 'Gift Card' : type === 'paypal' ? 'PayPal' : 'Venmo'}
                  </button>
                ))}
              </div>
            </div>

            {/* Gift Card Brand Selector */}
            {payoutType === 'gift_card' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select a gift card
                </label>
                <select
                  value={giftCardBrand}
                  onChange={(e) => setGiftCardBrand(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0f0f0f] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-500 transition"
                >
                  {GIFT_CARD_BRANDS.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
                <p className="text-gray-500 text-xs mt-2">
                  Gift card will be delivered to your email on file.
                </p>
              </div>
            )}

            {/* PayPal Email */}
            {payoutType === 'paypal' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  PayPal Email
                </label>
                <input
                  type="email"
                  value={payoutDetails}
                  onChange={(e) => setPayoutDetails(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 bg-[#0f0f0f] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-500 transition"
                  required
                />
              </div>
            )}

            {/* Venmo Username */}
            {payoutType === 'venmo' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Venmo Username
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">@</span>
                  <input
                    type="text"
                    value={payoutDetails}
                    onChange={(e) => setPayoutDetails(e.target.value)}
                    placeholder="username"
                    className="w-full pl-8 pr-4 py-3 bg-[#0f0f0f] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-500 transition"
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-white text-black font-medium py-3 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : `Request $${balance.toFixed(2)} Cashout`}
            </button>
          </form>
        ) : (
          <div className="bg-[#1a1a1a] rounded-lg p-8 border border-gray-800 text-center">
            <p className="text-gray-400 mb-4">You need ${(5 - balance).toFixed(2)} more to cash out.</p>
            <button
              onClick={() => navigateTo('/')}
              className="bg-white text-black font-medium py-3 px-6 rounded-lg hover:bg-gray-200 transition"
            >
              Keep Reading
            </button>
          </div>
        )}

        {/* Past Requests */}
        {pastRequests.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-semibold text-white mb-4">Past Requests</h2>
            <div className="space-y-3">
              {pastRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-[#1a1a1a] rounded-lg p-4 border border-gray-800 flex justify-between items-center"
                >
                  <div>
                    <p className="text-white text-sm font-medium">
                      {req.payout_type === 'gift_card'
                        ? `${req.gift_card_brand} Gift Card`
                        : req.payout_type === 'paypal'
                        ? 'PayPal'
                        : 'Venmo'}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {new Date(req.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-semibold">${req.amount.toFixed(2)}</p>
                    <p
                      className={`text-xs mt-0.5 ${
                        req.status === 'completed'
                          ? 'text-green-400'
                          : req.status === 'failed'
                          ? 'text-red-400'
                          : 'text-yellow-400'
                      }`}
                    >
                      {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
