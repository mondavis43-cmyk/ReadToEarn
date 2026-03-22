import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CashoutPayload {
  type: "INSERT";
  table: string;
  record: {
    id: number;
    user_id: string;
    amount: number;
    status: string;
    created_at: string;
  };
  schema: string;
}

interface ProfileRecord {
  email: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const payload: CashoutPayload = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const adminEmail = Deno.env.get("ADMIN_EMAIL") || "admin@example.com";

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${payload.record.user_id}&select=email`,
      {
        headers: {
          "apikey": supabaseServiceKey!,
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
      }
    );

    const profiles: ProfileRecord[] = await profileResponse.json();
    const userEmail = profiles[0]?.email || "unknown@example.com";

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Read to Earn <noreply@yourdomain.com>",
        to: [adminEmail],
        subject: `Cash Out Request — ${userEmail}`,
        html: `
          <h2>New Cash Out Request</h2>
          <p><strong>${userEmail}</strong> has requested a cash out of <strong>$${payload.record.amount.toFixed(2)}</strong>.</p>
          <p>Please approve and send a gift card.</p>
          <hr>
          <p><small>Request ID: ${payload.record.id}</small></p>
          <p><small>Created at: ${new Date(payload.record.created_at).toLocaleString()}</small></p>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Resend API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to send email" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const emailResult = await emailResponse.json();

    return new Response(
      JSON.stringify({ success: true, emailId: emailResult.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing cashout notification:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
