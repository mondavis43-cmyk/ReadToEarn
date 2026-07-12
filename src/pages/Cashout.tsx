import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../hooks/useNavigate';
import { ArrowLeft } from 'lucide-react';


export const Cashout = () => {
  const { user } = useAuth();
  const { navigateTo } = useNavigate();
  const [balance, setBalance]             = useState(0);
  const [isUpgraded, setIsUpgraded]       = useState(false);
  const [payoutType, setPayoutType]       = useState<'wise' | 'bank_transfer' | 'paypal'>('wise');
  const [payoutDetails, setPayoutDetails] = useState('');
  const [bankRegion, setBankRegion]       = useState<'us' | 'international'>('us');
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ibanNumber, setIbanNumber]       = useState('');
  const [swiftCode, setSwiftCode]         = useState('');
  const [accountName, setAccountName]     = useState('');
  const [loading, setLoading]             = useState(true);
  const [submitting, setSubmitting]       = useState(false);
  const [error, setError]                 = useState('');
  const [success, setSuccess]             = useState(false);
  const [pastRequests, setPastRequests]   = useState<any[]>([]);
  const [cashoutAmount, setCashoutAmount]   = useState<string>('');

  const MIN_CASHOUT = isUpgraded ? 5 : 10;
  const parsedAmount = parseFloat(cashoutAmount);
  const validAmount = !isNaN(parsedAmount) && parsedAmount >= MIN_CASHOUT && parsedAmount <= balance;

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    const [profileResult, requestsResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('available_balance, is_upgraded, payout_email, payout_method, bank_region, bank_account_holder_name, bank_routing_number, bank_account_number, bank_iban, bank_swift')
        .eq('id', user.id)
        .single(),
      supabase
        .from('cashout_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ]);

    if (profileResult.error) {
      console.error('Failed to load balance:', profileResult.error);
      setLoading(false);
      return;
    }
    if (requestsResult.error) {
      console.error('Failed to load cashout history:', requestsResult.error);
    }

    if (profileResult.data) {
      setBalance(profileResult.data.available_balance);
      setIsUpgraded(profileResult.data.is_upgraded ?? false);
      if (profileResult.data.payout_email) setPayoutDetails(profileResult.data.payout_email);
      if (profileResult.data.payout_method && profileResult.data.payout_method !== 'paypal') {
        setPayoutType(profileResult.data.payout_method as 'wise' | 'bank_transfer');
      }
      // Pre-fill bank details if saved
      if (profileResult.data.bank_region) setBankRegion(profileResult.data.bank_region);
      if (profileResult.data.bank_account_holder_name) setAccountName(profileResult.data.bank_account_holder_name);
      if (profileResult.data.bank_routing_number) setRoutingNumber(profileResult.data.bank_routing_number);
      if (profileResult.data.bank_account_number) setAccountNumber(profileResult.data.bank_account_number);
      if (profileResult.data.bank_iban) setIbanNumber(profileResult.data.bank_iban);
      if (profileResult.data.bank_swift) setSwiftCode(profileResult.data.bank_swift);
    }
    if (requestsResult.data) setPastRequests(requestsResult.data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (balance < MIN_CASHOUT) {
      setError(`You need at least $${MIN_CASHOUT.toFixed(2)} to cash out.`);
      return;
    }

    if (!validAmount) {
      setError(`Enter an amount between $${MIN_CASHOUT.toFixed(2)} and $${balance.toFixed(2)}.`);
      return;
    }

    if (payoutType === 'wise' && !payoutDetails.trim()) {
      setError('Please enter your Wise email.');
      return;
    }
    if (payoutType === 'bank_transfer') {
      if (!accountName.trim()) { setError('Please enter the account holder name.'); return; }
      if (bankRegion === 'us' && (!routingNumber.trim() || !accountNumber.trim())) {
        setError('Please enter your routing number and account number.');
        return;
      }
      if (bankRegion === 'international' && (!ibanNumber.trim() || !swiftCode.trim())) {
        setError('Please enter your IBAN and SWIFT/BIC code.');
        return;
      }
    }

    setSubmitting(true);

    const { error: rpcError } = await supabase.rpc('submit_cashout_request', {
      p_user_id:           user!.id,
      p_email:             user!.email ?? '',
      p_amount:            parsedAmount,
      p_payout_type:       payoutType,
      p_payout_details:    payoutType === 'bank_transfer'
        ? bankRegion === 'us'
          ? `Name: ${accountName} | Routing: ${routingNumber} | Account: ${accountNumber}`
          : `Name: ${accountName} | IBAN: ${ibanNumber} | SWIFT: ${swiftCode}`
        : payoutDetails,
      p_gift_card_brand:   null,
    });

    if (rpcError) {
      setError(
        rpcError.message.includes('Insufficient balance')
          ? 'Your balance has changed. Please refresh and try again.'
          : rpcError.message
      );
      setSubmitting(false);
      return;
    }

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
            <p className="text-white text-2xl font-semibold mb-2">${parsedAmount.toFixed(2)}</p>
            <p className="text-gray-400 text-sm mb-6">
              has been submitted. You'll receive your{' '}
              {payoutType === 'bank_transfer' ? 'bank transfer' : payoutType === 'wise' ? 'Wise payment' : 'PayPal payment'}{' '}
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
          <button onClick={() => navigateTo('/')} className="text-gray-400 hover:text-white transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-serif text-3xl text-white">Cash Out</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-12">
        <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800 mb-8 text-center">
          <p className="text-gray-400 text-sm mb-1">Available Balance</p>
          <p className="text-4xl font-semibold text-white">${balance.toFixed(2)}</p>
          {balance >= MIN_CASHOUT && (
            <div className="mt-4">
              <label className="block text-sm text-gray-400 mb-2">Amount to cash out</label>
              <div className="flex items-center gap-2 justify-center">
                <span className="text-gray-400">$</span>
                <input
                  type="number"
                  min={MIN_CASHOUT}
                  max={balance}
                  step="0.01"
                  value={cashoutAmount}
                  onChange={(e) => setCashoutAmount(e.target.value)}
                  placeholder={balance.toFixed(2)}
                  className="w-32 px-3 py-2 bg-[#0f0f0f] border border-gray-700 rounded-lg text-white text-center focus:outline-none focus:border-gray-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setCashoutAmount(balance.toFixed(2))}
                  className="text-xs text-[#D4A843] hover:underline"
                >
                  Max
                </button>
              </div>
              {cashoutAmount && !validAmount && (
                <p className="text-red-400 text-xs mt-1">Must be between ${MIN_CASHOUT.toFixed(2)} and ${balance.toFixed(2)}</p>
              )}
            </div>
          )}
          {isUpgraded && (
            <p className="text-[#D4A843] text-xs mt-1">⭐ Subscriber minimum: $5.00</p>
          )}
          {balance < MIN_CASHOUT && (
            <p className="text-yellow-500 text-sm mt-2">
              Minimum cashout is ${MIN_CASHOUT.toFixed(2)} — keep reading to earn more!
            </p>
          )}
        </div>

        {balance >= MIN_CASHOUT ? (
          <form onSubmit={handleSubmit} className="bg-[#1a1a1a] rounded-lg p-8 border border-gray-800">
            {error && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-900/50 rounded text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                How would you like to be paid?
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  disabled
                  className="py-3 px-2 rounded-lg border text-sm font-medium bg-transparent text-gray-600 border-gray-800 cursor-not-allowed relative"
                >
                  PayPal
                  <span className="block text-xs text-gray-600 mt-0.5">Unavailable</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setPayoutType('wise'); setPayoutDetails(''); }}
                  className={`py-3 px-2 rounded-lg border text-sm font-medium transition ${
                    payoutType === 'wise'
                      ? 'bg-white text-black border-white'
                      : 'bg-transparent text-gray-300 border-gray-700 hover:border-gray-500'
                  }`}
                >
                  Wise
                </button>
                <button
                  type="button"
                  onClick={() => { setPayoutType('bank_transfer'); setPayoutDetails(''); }}
                  className={`py-3 px-2 rounded-lg border text-sm font-medium transition ${
                    payoutType === 'bank_transfer'
                      ? 'bg-white text-black border-white'
                      : 'bg-transparent text-gray-300 border-gray-700 hover:border-gray-500'
                  }`}
                >
                  Bank Transfer
                </button>
              </div>
            </div>


            {payoutType === 'wise' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">Wise Email</label>
                <input
                  type="email"
                  value={payoutDetails}
                  onChange={(e) => setPayoutDetails(e.target.value)}
                  placeholder="Email linked to your Wise account"
                  className="w-full px-4 py-3 bg-[#0f0f0f] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-500 transition"
                />
                <p className="text-xs text-gray-500 mt-2">
                  You <strong className="text-gray-400">must have a free Wise account</strong> — enter the email registered to it.{' '}
                  Don't have one?{' '}
                  <a href="https://wise.com/register" target="_blank" rel="noopener noreferrer" className="text-green-400 underline hover:opacity-80">
                    Create a free Wise account
                  </a>
                </p>
              </div>
            )}

            {payoutType === 'bank_transfer' && (
              <div className="mb-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Account Holder Name</label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Full name on bank account"
                    className="w-full px-4 py-3 bg-[#0f0f0f] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Account Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setBankRegion('us')}
                      className={`py-2 px-3 rounded-lg border text-sm font-medium transition ${
                        bankRegion === 'us'
                          ? 'bg-white text-black border-white'
                          : 'bg-transparent text-gray-300 border-gray-700 hover:border-gray-500'
                      }`}
                    >
                      US Bank Account
                    </button>
                    <button
                      type="button"
                      onClick={() => setBankRegion('international')}
                      className={`py-2 px-3 rounded-lg border text-sm font-medium transition ${
                        bankRegion === 'international'
                          ? 'bg-white text-black border-white'
                          : 'bg-transparent text-gray-300 border-gray-700 hover:border-gray-500'
                      }`}
                    >
                      International
                    </button>
                  </div>
                </div>
                {bankRegion === 'us' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Routing Number</label>
                      <input
                        type="text"
                        value={routingNumber}
                        onChange={(e) => setRoutingNumber(e.target.value)}
                        placeholder="9-digit routing number"
                        maxLength={9}
                        className="w-full px-4 py-3 bg-[#0f0f0f] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Account Number</label>
                      <input
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="Bank account number"
                        className="w-full px-4 py-3 bg-[#0f0f0f] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-500 transition"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">IBAN</label>
                      <input
                        type="text"
                        value={ibanNumber}
                        onChange={(e) => setIbanNumber(e.target.value.toUpperCase())}
                        placeholder="e.g. GB29NWBK60161331926819"
                        className="w-full px-4 py-3 bg-[#0f0f0f] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">SWIFT / BIC Code</label>
                      <input
                        type="text"
                        value={swiftCode}
                        onChange={(e) => setSwiftCode(e.target.value.toUpperCase())}
                        placeholder="e.g. NWBKGB2L"
                        className="w-full px-4 py-3 bg-[#0f0f0f] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-500 transition"
                      />
                    </div>
                  </>
                )}
                <p className="text-xs text-gray-500">Your bank details are stored securely and only used to process your payout.</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !validAmount}
              className="w-full bg-white text-black font-medium py-3 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : `Request $${validAmount ? parsedAmount.toFixed(2) : '—'} Cashout`}
            </button>
          </form>
        ) : (
          <div className="bg-[#1a1a1a] rounded-lg p-8 border border-gray-800 text-center">
            <p className="text-gray-400 mb-4">
              You need ${(MIN_CASHOUT - balance).toFixed(2)} more to cash out.
            </p>
            <button
              onClick={() => navigateTo('/')}
              className="bg-white text-black font-medium py-3 px-6 rounded-lg hover:bg-gray-200 transition"
            >
              Keep Reading
            </button>
          </div>
        )}

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
                      {req.payout_type === 'bank_transfer' ? 'Bank Transfer' : req.payout_type === 'wise' ? 'Wise' : 'PayPal'}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {new Date(req.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-semibold">${req.amount.toFixed(2)}</p>
                    <p className={`text-xs mt-0.5 ${
                      req.status === 'completed'
                        ? 'text-green-400'
                        : req.status === 'failed'
                        ? 'text-red-400'
                        : 'text-yellow-400'
                    }`}>
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
