import { useEffect, useState } from 'react';
import { FEATURES } from '../config/features';
import { supabase } from '../lib/supabase';
import { logAudit } from '../lib/auditLog';

async function sendEmail(to: string, subject: string, html: string) {
  await supabase.functions.invoke('send-email', { body: { to, subject, html } });
}

function isValidCheckoutItem(obj: unknown): obj is { type: string; amount: number; label: string; metadata?: Record<string, string | number> } {
  if (!obj || typeof obj !== 'object') return false;
  const item = obj as Record<string, unknown>;
  return (
    typeof item.type === 'string' &&
    typeof item.amount === 'number' &&
    typeof item.label === 'string'
  );
}

function isValidPendingSubmission(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const pending = obj as Record<string, unknown>;
  return typeof pending.table === 'string' && pending.table.length > 0;
}

const REDIRECT_MAP: Record<string, string> = {
  listing: '/author-dashboard',
  bounty: '/author-dashboard',
  competition_sponsored: '/author-dashboard',
  quick_task: '/author-dashboard',
  survey: '/author-dashboard',
  beta_reader: '/author-dashboard',
  sensitivity_reader: '/author-dashboard',
  subscription: '/profile',
  time_boost: '/profile',
  sponsored_pin: '/bulletin-board',
  competition_entry: FEATURES.elimination ? '/elimination' : '/sprints',
  tournament_entry: FEATURES.elimination ? '/elimination' : '/sprints',
  sprint_entry: '/sprints',
  readathon_entry: FEATURES.readathon ? '/readathon' : '/profile',
};

const goTo = (path: string) => {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

type Status = 'processing' | 'success' | 'error';

export const CheckoutSuccess = () => {
  const [status, setStatus] = useState<Status>('processing');
  const [message, setMessage] = useState('Confirming your payment...');

  useEffect(() => {
    handleCapture();
  }, []);

  async function handleCapture() {
    try {
      const params = new URLSearchParams(window.location.search);
      const paypalOrderId = params.get('token');
      const isPayPal = !!paypalOrderId;

      // Get logged-in user — wait up to 5s for session to restore after redirect
      let user = null;
      for (let i = 0; i < 10; i++) {
        const { data } = await supabase.auth.getUser();
        if (data.user) { user = data.user; break; }
        await new Promise(r => setTimeout(r, 500));
      }
      if (!user) throw new Error('You must be logged in.');

      // ── PayPal: capture the order first ───────────────────────────────────
      if (isPayPal) {
        const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/capture-paypal-order`;
        const captureRes = await fetch(fnUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ order_id: paypalOrderId }),
        });
        const capture = await captureRes.json();
        if (!captureRes.ok) throw new Error(capture?.error || 'Capture request failed.');
        if (capture?.status !== 'COMPLETED') throw new Error(`Payment not completed (status: ${capture?.status ?? 'unknown'}).`);
      }

      // ── Both flows: read sessionStorage ───────────────────────────────────
      const rawItem = JSON.parse(sessionStorage.getItem('checkoutItem') ?? 'null');
      const rawPending = JSON.parse(sessionStorage.getItem('pendingSubmission') ?? 'null');
      const item = isValidCheckoutItem(rawItem) ? rawItem : null;
      const pending = isValidPendingSubmission(rawPending) ? rawPending : null;

      if (!item) throw new Error('Checkout item missing or invalid in session.');

      // ── Log payment ───────────────────────────────────────────────────────
      const { error: paymentLogError } = await supabase.from('payments').insert({
        user_id: user.id,
        ...(isPayPal ? { paypal_order_id: paypalOrderId } : {}),
        amount: item.amount,
        payment_type: item.type,
        label: item.label,
        metadata: { ...(item.metadata ?? {}), is_late: (rawPending as any)?.is_late ?? false },
        status: 'succeeded',
      });
      if (paymentLogError) console.error('[CheckoutSuccess] payments log error:', paymentLogError);

      // ── Subscription: flip is_upgraded + welcome email ────────────────────
      if (item.type === 'subscription') {
        const { error: upgradeError } = await supabase
          .from('profiles')
          .update({ is_upgraded: true })
          .eq('id', user.id);
        if (upgradeError) console.error('[CheckoutSuccess] is_upgraded flip error:', upgradeError);

        if (user.email) {
          const plan = item.metadata?.plan === 'annual' ? 'Annual' : 'Monthly';
          const amount = (item.amount / 100).toFixed(2);
          await sendEmail(
            user.email,
            'Welcome to ReadToEarn Premium! 🎉',
            `<p>Hi there,</p>
            <p>Your <strong>${plan} subscription</strong> is now active. You paid <strong>$${amount}</strong>.</p>
            <p>You now have access to:</p>
            <ul>
              <li>Early access to new bounties (2 hours before free members)</li>
              <li>Entry into the monthly subscriber giveaway</li>
              <li>Access to exclusive sprints and competitions</li>
            </ul>
            <p><a href="https://joinreadtoearn.com">Head to ReadToEarn to start earning →</a></p>
            <p>— The ReadToEarn Team</p>`
          );
        }
      }

      // ── Insert pending submission ─────────────────────────────────────────
      if (pending) {
        if (item.type === 'listing') {
          const { error } = await supabase.from('author_submissions').insert(pending);
          if (error) console.error('[CheckoutSuccess] listing insert error:', error);

          const bundleSize = pending.bundle_size || 1;
          const email = pending.email;
          if (email) {
            const { data: creditRow } = await supabase
              .from('author_credits')
              .select('credits_total, credits_used')
              .eq('email', email)
              .maybeSingle();

            if (creditRow) {
              await supabase
                .from('author_credits')
                .update({ credits_total: creditRow.credits_total + bundleSize })
                .eq('email', email);
            } else {
              await supabase
                .from('author_credits')
                .insert({ email, credits_total: bundleSize, credits_used: 1 });
            }
          }

          const tierMap: Record<number, string> = {
            1: 'single', 3: 'trilogy', 5: 'series', 10: 'catalog', 25: 'imprint',
          };
          const tier = tierMap[bundleSize] || 'single';

          const { error: ambError } = await supabase.functions.invoke(
            'process-ambassador-payout',
            { body: { buyer_id: user.id, listing_tier: tier } }
          );
          if (ambError) {
            await supabase
              .from('payments')
              .update({
                status: 'succeeded_needs_ambassador_retry',
                error_details: { error: ambError.message, attempted_at: new Date().toISOString() },
              })
              .eq('id', paymentLogError?.hint || '');
            console.warn('[CheckoutSuccess] Ambassador payout pending retry:', ambError.message);
          }

        } else if (item.type === 'readathon_entry') {
          const { error } = await supabase.from('readathon_entries').insert({
            readathon_id: pending.readathon_id,
            user_id: user.id,
            entry_fee_paid: item.amount / 100,
            paid_at: new Date().toISOString(),
          });
          if (error) console.error('[CheckoutSuccess] readathon_entry insert error:', error);

          const entryFee = item.amount / 100;
          const readerShare = entryFee - entryFee * 0.25;
          const { error: poolError } = await supabase.rpc('increment_prize_pool', {
            p_readathon_id: pending.readathon_id,
            p_sprint_id: null,
            p_competition_id: null,
            p_amount: readerShare,
          });
          if (poolError) throw new Error('Failed to process prize pool update: ' + poolError.message);

        } else if (item.type === 'sprint_entry') {
          const { error } = await supabase.from('sprint_entries').insert({
            sprint_id: pending.sprint_id,
            user_id: user.id,
            paid_at: new Date().toISOString(),
            status: 'active',
          });
          if (error) console.error('[CheckoutSuccess] sprint_entry insert error:', error);

          const entryFee = item.amount / 100;
          const readerShare = entryFee - entryFee * 0.25;
          const { error: poolError } = await supabase.rpc('increment_prize_pool', {
            p_sprint_id: pending.sprint_id,
            p_readathon_id: null,
            p_competition_id: null,
            p_amount: readerShare,
          });
          if (poolError) throw new Error('Failed to process prize pool update: ' + poolError.message);

        } else if (item.type === 'competition_entry') {
          const { error } = await supabase.from('competition_entries').insert({
            competition_id: pending.competition_id,
            user_id: user.id,
            entry_fee_paid: item.amount / 100,
            is_late_entry: pending.is_late_entry ?? false,
            paid_at: new Date().toISOString(),
            status: 'active',
          });
          if (error) console.error('[CheckoutSuccess] competition_entry insert error:', error);

          const entryFee = item.amount / 100;
          const readerShare = entryFee - entryFee * 0.25;
          const { error: poolError } = await supabase.rpc('increment_prize_pool', {
            p_competition_id: pending.competition_id,
            p_sprint_id: null,
            p_readathon_id: null,
            p_amount: readerShare,
          });
          if (poolError) throw new Error('Failed to process prize pool update: ' + poolError.message);

        } else if (item.type === 'time_boost') {
          const boostCount = pending.boosts ?? item.metadata?.boosts ?? 0;
          const { data: existing } = await supabase
            .from('user_boosts')
            .select('balance')
            .eq('user_id', user.id)
            .maybeSingle();
          if (existing) {
            const { error } = await supabase
              .from('user_boosts')
              .update({ balance: existing.balance + boostCount, updated_at: new Date().toISOString() })
              .eq('user_id', user.id);
            if (error) console.error('[CheckoutSuccess] time_boost update error:', error);
          } else {
            const { error } = await supabase.from('user_boosts').insert({ user_id: user.id, balance: boostCount });
            if (error) console.error('[CheckoutSuccess] time_boost insert error:', error);
          }

        } else if (item.type === 'beta_reader' || item.type === 'sensitivity_reader') {
          const ALLOWED_TABLES = ['author_beta_reader_submissions', 'author_sensitivity_submissions'];
          if (!pending?.table || !ALLOWED_TABLES.includes(pending.table)) {
            throw new Error('Invalid submission table');
          }
          if (!pending.data || typeof pending.data !== 'object') {
            throw new Error('Invalid submission data');
          }
          const { error: insertError } = await supabase.from(pending.table).insert({
            ...pending.data,
            status: 'active',
          });
          if (insertError) throw new Error('Failed to insert submission: ' + insertError.message);

        } else if (pending.table) {
          const ALLOWED_TABLES = [
            'author_bounty_submissions',
            'author_competition_submissions',
            'author_quick_task_submissions',
            'author_survey_submissions',
            'author_sensitivity_submissions',
            'sponsored_pins',
            'subscriptions',
            'profiles',
            'user_boost_purchases',
            'tournament_participants',
          ];
          if (!ALLOWED_TABLES.includes(pending.table)) {
            throw new Error('Invalid submission table: ' + pending.table);
          }
          if (!pending.data || typeof pending.data !== 'object') {
            throw new Error('Invalid submission data');
          }
          const { error } = await supabase.from(pending.table).insert(pending.data);
          if (error) console.error('[CheckoutSuccess] generic table insert error:', error);
        }

        sessionStorage.removeItem('pendingSubmission');
        sessionStorage.removeItem('checkoutItem');
        sessionStorage.removeItem('paypalItemType');
      }

      await logAudit({
        user_id: user.id,
        action: 'payment_success',
        details: { amount: item.amount / 100, type: item.type },
        status: 'success',
      });

      setStatus('success');
      setMessage('Payment confirmed!');
      setTimeout(() => goTo(REDIRECT_MAP[item.type] ?? '/profile'), 2500);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      console.error('[CheckoutSuccess] Error:', msg, err);

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await logAudit({
            user_id: user.id,
            action: 'payment_failed',
            details: { error: msg },
            status: 'failure',
            error_message: msg,
          });
        }
      } catch (auditErr) {
        console.error('[CheckoutSuccess] Failed to log audit:', auditErr);
      }

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
