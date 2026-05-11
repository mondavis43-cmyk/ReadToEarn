import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const REDIRECT_MAP: Record<string, string> = {
  listing:               '/author-dashboard',
  bounty:                '/author-dashboard',
  competition_sponsored: '/author-dashboard',
  quick_task:            '/author-dashboard',
  survey:                '/author-dashboard',
  beta_reader:           '/author-dashboard',
  sensitivity_reader:    '/author-dashboard',
  subscription:          '/profile',
  time_boost:            '/profile',
  competition_entry:     '/elimination',
  tournament_entry:      '/elimination',
  sprint_entry:          '/sprints',
  readathon_entry:       '/readathon',
};

const goTo = (path: string) => {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

type Status = 'processing' | 'success' | 'error';

export const CheckoutSuccess = () => {
  const [status, setStatus]   = useState<Status>('processing');
  const [message, setMessage] = useState('Confirming your payment...');

  useEffect(() => {
    handleCapture();
  }, []);

  async function handleCapture() {
    try {
      // 1. Get PayPal order ID from URL (?token=XXXX)
      const params  = new URLSearchParams(window.location.search);
      const orderId = params.get('token');
      if (!orderId) throw new Error('No PayPal order ID found in URL.');

      // 2. Get logged-in user — wait up to 5s for session to restore after redirect
      let user = null;
      for (let i = 0; i < 10; i++) {
        const { data } = await supabase.auth.getUser();
        if (data.user) { user = data.user; break; }
        await new Promise(r => setTimeout(r, 500));
      }
      if (!user) throw new Error('You must be logged in.');

      // 3. Capture the PayPal order (call directly with anon key so it works even if JWT is still loading)
      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/capture-paypal-order`;
      const captureRes = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ order_id: orderId }),
      });
      const capture = await captureRes.json();
      if (!captureRes.ok) throw new Error(capture?.error || 'Capture request failed.');
      if (capture?.status !== 'COMPLETED') throw new Error(`Payment not completed (status: ${capture?.status ?? 'unknown'}).`);

      // 4. Pull item + pending submission from sessionStorage
      const item    = JSON.parse(sessionStorage.getItem('checkoutItem')    ?? 'null');
      const pending = JSON.parse(sessionStorage.getItem('pendingSubmission') ?? 'null');

      if (!item) throw new Error('Checkout item missing from session.');

      // 5. Log payment to DB
      await supabase.from('payments').insert({
        user_id:              user.id,
        paypal_order_id:      orderId,
        amount:               item.amount,
        type:                 item.type,
        label:                item.label,
        metadata:             { ...(item.metadata ?? {}), is_late: pending?.is_late ?? false },
        status:               'succeeded',
      });

      // 6. Insert pending submission
      if (pending) {
        if (item.type === 'listing') {
          await supabase.from('author_submissions').insert(pending);

        } else if (item.type === 'readathon_entry') {
          await supabase.from('readathon_entries').insert({
            readathon_id:   pending.readathon_id,
            user_id:        user.id,
            entry_fee_paid: item.amount / 100,
            paid_at:        new Date().toISOString(),
          });

          const entryFee    = item.amount / 100;
          const readerShare = entryFee - entryFee * 0.25;
          const { data: readathonData } = await supabase
            .from('readathons')
            .select('prize_pool')
            .eq('id', pending.readathon_id)
            .single();
          if (readathonData) {
            await supabase
              .from('readathons')
              .update({ prize_pool: (readathonData.prize_pool ?? 0) + readerShare })
              .eq('id', pending.readathon_id);
          }

        } else if (item.type === 'sprint_entry') {
          await supabase.from('sprint_entries').insert({
            sprint_id: pending.sprint_id,
            user_id:   user.id,
            paid_at:   new Date().toISOString(),
            status:    'active',
          });

          const entryFee    = item.amount / 100;
          const readerShare = entryFee - entryFee * 0.25;
          const { data: sprintData } = await supabase
            .from('sprints')
            .select('prize_pool')
            .eq('id', pending.sprint_id)
            .single();
          if (sprintData) {
            await supabase
              .from('sprints')
              .update({ prize_pool: (sprintData.prize_pool ?? 0) + readerShare })
              .eq('id', pending.sprint_id);
          }

        } else if (item.type === 'competition_entry') {
          await supabase.from('competition_entries').insert({
            competition_id: pending.competition_id,
            user_id:        user.id,
            entry_fee_paid: item.amount / 100,
            is_late_entry:  pending.is_late_entry ?? false,
            paid_at:        new Date().toISOString(),
            status:         'active',
          });

          const entryFee    = item.amount / 100;
          const readerShare = entryFee - entryFee * 0.25;
          const { data: comp } = await supabase
            .from('competitions')
            .select('prize_pool')
            .eq('id', pending.competition_id)
            .single();
          if (comp) {
            await supabase.rpc('increment_prize_pool', {
              p_competition_id: pending.competition_id,
              p_amount:         readerShare,
            });
          }

        } else if (item.type === 'time_boost') {
          const boostCount = pending.boosts ?? item.metadata?.boosts ?? 0;
          const { data: existing } = await supabase
            .from('user_boosts')
            .select('balance')
            .eq('user_id', user.id)
            .maybeSingle();
          if (existing) {
            await supabase
              .from('user_boosts')
              .update({ balance: existing.balance + boostCount, updated_at: new Date().toISOString() })
              .eq('user_id', user.id);
          } else {
            await supabase.from('user_boosts').insert({ user_id: user.id, balance: boostCount });
          }

        } else if (pending.table) {
          await supabase.from(pending.table).insert(pending.data);
        }

        sessionStorage.removeItem('pendingSubmission');
        sessionStorage.removeItem('checkoutItem');
        sessionStorage.removeItem('paypalItemType');
      }

      // 7. Done
      setStatus('success');
      setMessage('Payment confirmed!');
      setTimeout(() => goTo(REDIRECT_MAP[item.type] ?? '/profile'), 2500);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      console.error('[CheckoutSuccess] Error:', msg, err);
      setStatus('error');
      setMessage(msg);
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        {status === 'processing' && (
          <>
            <div className="w-12 h-12 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <p className="text-gray-400">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-green-400 mb-2">Payment Successful!</h2>
            <p className="text-gray-500">Redirecting you now...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-red-400 mb-2">Payment Failed</h2>
            <p className="text-gray-500 mb-6">{message}</p>
            <button
              onClick={() => goTo('/checkout')}
              className="bg-white text-black font-medium px-6 py-3 rounded-lg hover:bg-gray-200 transition"
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default CheckoutSuccess;
