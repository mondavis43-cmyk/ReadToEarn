import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  try {
    const { competition_id, sprint_id, readathon_id } = await req.json();

    // Determine format and fetch pre-registrants
    let userIds: string[] = [];
    let title = '';
    let body = '';

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
        .eq('converted', false);

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
        .eq('converted', false);

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
        .eq('converted', false);

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
      type: 'competition_live',
      title,
      body,
      read: false,
    }));

    const { error } = await supabase.from('notifications').insert(notifications);

    if (error) throw error;

    // Mark pre-registrants as notified
    if (competition_id) {
      await supabase
        .from('elimination_pre_registrations')
        .update({ notified_at: new Date().toISOString() })
        .eq('competition_id', competition_id)
        .eq('converted', false);
    } else if (sprint_id) {
      await supabase
        .from('sprint_pre_registrations')
        .update({ notified_at: new Date().toISOString() })
        .eq('sprint_id', sprint_id)
        .eq('converted', false);
    } else if (readathon_id) {
      await supabase
        .from('readathon_pre_registrations')
        .update({ notified_at: new Date().toISOString() })
        .eq('readathon_id', readathon_id)
        .eq('converted', false);
    }

    return new Response(
      JSON.stringify({ success: true, notified: userIds.length }),
      { status: 200 }
    );

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
