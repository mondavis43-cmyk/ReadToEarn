import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Rate limit: 10 requests per IP per hour
// Higher than the others since this is an admin-triggered bulk action
const RATE_LIMIT = 10;
const WINDOW_SECONDS = 60 * 60;

async function checkRateLimit(ip: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - WINDOW_SECONDS * 1000).toISOString();
  const { count } = await supabase
    .from('rate_limit_log')
    .select('*', { count: 'exact', head: true })
    .eq('ip', ip)
    .eq('endpoint', 'notify-competition-live')
    .gte('created_at', windowStart);
  return (count ?? 0) < RATE_LIMIT;
}

async function logRequest(ip: string) {
  await supabase
    .from('rate_limit_log')
    .insert({ ip, endpoint: 'notify-competition-live', created_at: new Date().toISOString() });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      req.headers.get('x-real-ip') ??
      'unknown';

    const allowed = await checkRateLimit(ip);
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { competition_id, sprint_id, readathon_id } = await req.json();

    let userIds: string[] = [];
    let title = '';
    let body = '';

    const fourWeeksAgo = new Date(Date.now() - 4 * 7 * 24 * 60 * 60 * 1000).toISOString();

    if (competition_id) {
      const { data: comp } = await supabase
        .from('competitions')
        .select('title, entry_fee')
        .eq('id', competition_id)
        .single();

      const { data: preRegs } = await supabase
        .from('elimination_pre_registrations')
        .select('user_id')
        .eq('competition_id', competition_id)
        .eq('converted', false)
        .gte('created_at', fourWeeksAgo);

      userIds = (preRegs ?? []).map((r) => r.user_id);
      title = '🏆 Your bracket is live!';
      body = `${comp?.title} is now open. Pay your $${comp?.entry_fee} entry fee within 48 hours — after that, late fees apply.`;

    } else if (sprint_id) {
      const { data: sprint } = await supabase
        .from('sprints')
        .select('title, entry_fee')
        .eq('id', sprint_id)
        .single();

      const { data: preRegs } = await supabase
        .from('sprint_pre_registrations')
        .select('user_id')
        .eq('sprint_id', sprint_id)
        .eq('converted', false)
        .gte('created_at', fourWeeksAgo);

      userIds = (preRegs ?? []).map((r) => r.user_id);
      title = '⚡ Your sprint is live!';
      body = `${sprint?.title} is now open. Pay your $${sprint?.entry_fee} entry fee within 48 hours — after that, late fees apply.`;

    } else if (readathon_id) {
      const { data: readathon } = await supabase
        .from('readathons')
        .select('title, entry_fee')
        .eq('id', readathon_id)
        .single();

      const { data: preRegs } = await supabase
        .from('readathon_pre_registrations')
        .select('user_id')
        .eq('readathon_id', readathon_id)
        .eq('converted', false)
        .gte('created_at', fourWeeksAgo);

      userIds = (preRegs ?? []).map((r) => r.user_id);
      title = '📚 Your read-a-thon is live!';
      body = `${readathon?.title} is now open. Pay your $${readathon?.entry_fee} entry fee within 48 hours — after that, late fees apply.`;

    } else {
      return new Response(
        JSON.stringify({ error: 'Must provide competition_id, sprint_id, or readathon_id' }),
        { status: 400 }
      );
    }

    if (userIds.length === 0) {
      return new Response(JSON.stringify({ message: 'No pre-registrants to notify' }), { status: 200 });
    }

    // Log after validation, before bulk insert
    await logRequest(ip);

    const notifications = userIds.map((user_id) => ({
      user_id,
      title,
      body,
      read: false,
    }));

    const { error: notifyError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (notifyError) {
      console.error('Failed to create notifications:', notifyError);
      return new Response(
        JSON.stringify({ error: 'Failed to send notifications' }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ success: true, notified: userIds.length }),
      { status: 200 }
    );
  } catch (err) {
    console.error('Error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
});
