import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Copy, Check, Gift } from 'lucide-react';

export const Refer = () => {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [referralCount, setReferralCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReferralData();
  }, [user]);

  const loadReferralData = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('referral_code')
      .eq('id', user.id)
      .single();

    if (data?.referral_code) {
      setReferralCode(data.referral_code);
      // Count how many users were referred by this code and claimed
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .eq('referred_by', data.referral_code)
        .eq('referral_bonus_claimed', true);
      setReferralCount(count ?? 0);
    }
    setLoading(false);
  };

  const referralLink = `${window.location.origin}?ref=${referralCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8 text-center">
          <Gift className="w-12 h-12 text-white mx-auto mb-4" />
          <h1 className="font-serif text-3xl text-white mb-2">Refer a Friend</h1>
          <p className="text-gray-400">
            Earn <span className="text-white font-medium">$0.50</span> for every friend you refer who passes their first quiz.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-[#1a1a1a] rounded-lg p-5 border border-gray-800 text-center">
            <div className="text-3xl font-serif text-white mb-1">{referralCount}</div>
            <div className="text-gray-500 text-sm">successful referrals</div>
          </div>
          <div className="bg-[#1a1a1a] rounded-lg p-5 border border-gray-800 text-center">
            <div className="text-3xl font-serif text-green-400 mb-1">
              ${(referralCount * 0.5).toFixed(2)}
            </div>
            <div className="text-gray-500 text-sm">earned from referrals</div>
          </div>
        </div>

        {/* Referral link */}
        <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800 mb-6">
          <label className="block text-sm text-gray-400 mb-3">Your referral link</label>
          <div className="flex gap-2">
            <div className="flex-1 bg-[#0f0f0f] border border-gray-700 rounded-lg px-4 py-2.5 text-gray-300 text-sm font-mono truncate">
              {referralLink}
            </div>
            <button
              onClick={copyLink}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-black rounded-lg hover:bg-gray-200 transition text-sm font-medium whitespace-nowrap"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
          <h2 className="text-white font-medium mb-4">How it works</h2>
          <div className="space-y-3">
            {[
              'Share your unique link with a friend',
              'They sign up using your link',
              'When they pass their first quiz, you earn $0.50',
              'No limit — refer as many friends as you want',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-white/10 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <p className="text-gray-400 text-sm">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
