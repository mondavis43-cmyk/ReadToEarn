import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLATFORM_FEE = 0.25;
const SPLITS = { first: 0.50, second: 0.30, third: 0.20 };

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing authorization" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // User client to verify caller identity
  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(supabaseUrl, serviceKey);

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { tournament_id: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { tournament_id } = body;
  if (!tournament_id) {
    return new Response(JSON.stringify({ error: 'tournament_id required' }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Fetch tournament
  const { data: tournament, error: tErr } = await adminClient
    .from('tournaments')
    .select('*')
    .eq('id', tournament_id)
    .single();

  if (tErr || !tournament) {
    return new Response(JSON.stringify({ error: 'tournament not found' }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Auth: only creator can distribute
  if (tournament.creator_id !== user.id) {
    return new Response(JSON.stringify({ error: 'Only the tournament creator can distribute prizes' }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (tournament.winner_paid_at) {
    return new Response(JSON.stringify({ error: 'already paid out' }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (tournament.status !== 'active') {
    return new Response(JSON.stringify({ error: 'Tournament is not active' }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const prizePool = tournament.prize_pool ?? 0;
  if (prizePool <= 0) {
    return new Response(JSON.stringify({ error: 'No prize pool to distribute' }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const distributable = prizePool * (1 - PLATFORM_FEE);

  // Fetch ranked participants
  const { data: participants } = await adminClient
    .from('tournament_participants')
    .select('user_id, score, time_spent_ms, pages_read, rank')
    .eq('tournament_id', tournament_id)
    .order('rank', { ascending: true, nullsFirst: false });

  if (!participants || participants.length === 0) {
    return new Response(JSON.stringify({ error: 'no participants' }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Sort by format
  let ranked = [...participants];
  if (tournament.format === 'sprint') {
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

  // Credit winners
  for (const payout of payouts) {
    const { data: profile } = await adminClient
      .from('profiles')
      .select('available_balance')
      .eq('id', payout.user_id)
      .single();

    const current = profile?.available_balance ?? 0;
    await adminClient
      .from('profiles')
      .update({ available_balance: current + payout.amount })
      .eq('id', payout.user_id);

    await adminClient.from('payout_logs').insert({
      user_id: payout.user_id,
      amount: payout.amount,
      reason: `Tournament ${tournament_id} - Place ${payout.place}`,
      status: 'completed',
    });
  }

  // Mark as completed
  await adminClient
    .from('tournaments')
    .update({ status: 'completed', winner_paid_at: new Date().toISOString() })
    .eq('id', tournament_id);

  return new Response(
    JSON.stringify({ success: true, payouts }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
