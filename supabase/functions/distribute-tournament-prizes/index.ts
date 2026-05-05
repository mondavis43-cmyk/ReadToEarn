import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PLATFORM_FEE = 0.25;
const SPLITS = { first: 0.50, second: 0.30, third: 0.20 };

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { tournament_id } = await req.json();
  if (!tournament_id) return new Response(JSON.stringify({ error: 'tournament_id required' }), { status: 400 });

  // 1. Fetch tournament
  const { data: tournament, error: tErr } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournament_id)
    .single();
  if (tErr || !tournament) return new Response(JSON.stringify({ error: 'tournament not found' }), { status: 404 });
  if (tournament.winner_paid_at) return new Response(JSON.stringify({ error: 'already paid out' }), { status: 400 });

  const prizePool = tournament.prize_pool ?? 0;
  const distributable = prizePool * (1 - PLATFORM_FEE);

  // 2. Fetch ranked participants
  const { data: participants } = await supabase
    .from('tournament_participants')
    .select('user_id, score, time_spent_ms, pages_read, rank')
    .eq('tournament_id', tournament_id)
    .order('rank', { ascending: true, nullsFirst: false });

  if (!participants || participants.length === 0) {
    return new Response(JSON.stringify({ error: 'no participants' }), { status: 400 });
  }

  // 3. Determine winners based on format
  let ranked = [...participants];
  if (tournament.format === 'sprint') {
    // Highest score, fastest time as tiebreaker
    ranked.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.time_spent_ms ?? Infinity) - (b.time_spent_ms ?? Infinity);
    });
  } else if (tournament.format === 'readathon') {
    ranked.sort((a, b) => (b.pages_read ?? 0) - (a.pages_read ?? 0));
  } else if (tournament.format === 'elimination') {
    ranked.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
  }

  const payouts: { user_id: string; amount: number; place: number }[] = [];
  const places = [
    { place: 1, split: SPLITS.first },
    { place: 2, split: SPLITS.second },
    { place: 3, split: SPLITS.third },
  ];

  for (const { place, split } of places) {
    const winner = ranked[place - 1];
    if (!winner) continue;
    const amount = parseFloat((distributable * split).toFixed(2));
    payouts.push({ user_id: winner.user_id, amount, place });
  }

  // 4. Credit winners' balances
  for (const payout of payouts) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('available_balance')
      .eq('id', payout.user_id)
      .single();

    const current = profile?.available_balance ?? 0;
    await supabase
      .from('profiles')
      .update({ available_balance: current + payout.amount })
      .eq('id', payout.user_id);

    await supabase.from('payout_logs').insert({
      user_id: payout.user_id,
      amount: payout.amount,
      reason: `Tournament ${tournament_id} - Place ${payout.place}`,
      status: 'completed',
    });
  }

  // 5. Mark tournament as paid
  await supabase
    .from('tournaments')
    .update({ status: 'completed', winner_paid_at: new Date().toISOString() })
    .eq('id', tournament_id);

  return new Response(JSON.stringify({ success: true, payouts }), { status: 200 });
});
