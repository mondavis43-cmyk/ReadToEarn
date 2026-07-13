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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { competition_id, sprint_id, readathon_id } = await req.json();

    // Determine format and fetch pre-registrants
    let userIds: string[] = [];
    let title = '';
    let body = '';

    // SECURITY FIX #13: Only notify recent pre-registrations (within 4 weeks)
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
        .gte('created_at', fourWeeksAgo); // Only recent pre-regs

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

    // Bulk insert notifications
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
