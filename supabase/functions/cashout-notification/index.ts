import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_ORIGINS = [
  'https://joinreadtoearn.com',
  'https://www.joinreadtoearn.com',
];

const getCorsHeaders = (requestOrigin: string | null) => {
  const isAllowed = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin);
  return {
    "Access-Control-Allow-Origin": isAllowed ? requestOrigin : '',
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
  };
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

/**
 * Sanitize HTML content to prevent XSS attacks
 */
function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize email for safe display in HTML
 */
function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') return '';
  return sanitizeHtml(email.trim());
}

Deno.serve(async (req: Request) => {
  const originHeader = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(originHeader);

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
    const adminEmail = Deno.env.get("ADMIN_EMAIL");

    // SECURITY FIX #3: Validate admin email is configured
    if (!adminEmail) {
      console.error("[cashout-notification] ADMIN_EMAIL environment variable not configured");
      return new Response(
        JSON.stringify({
          error: "Admin email not configured - cashout notification cannot be sent",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

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

    // SECURITY FIX #1: Use URL constructor to safely encode parameters
    const profileUrl = new URL(`${supabaseUrl}/rest/v1/profiles`);
    profileUrl.searchParams.append('id', `eq.${payload.record.user_id}`);
    profileUrl.searchParams.append('select', 'email');

    const profileResponse = await fetch(profileUrl.toString(), {
      headers: {
        "apikey": supabaseServiceKey!,
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
    });

    const profiles: ProfileRecord[] = await profileResponse.json();
    const userEmail = profiles[0]?.email || "unknown@example.com";

    // SECURITY FIX #4: Sanitize values before inserting into HTML
    const sanitizedEmail = sanitizeEmail(userEmail);
    const sanitizedAmount = Math.max(0, payload.record.amount);
    const sanitizedId = String(payload.record.id).replace(/\D/g, '');
    const requestDate = new Date(payload.record.created_at);

    // Validate date is reasonable (not in future, not too old)
    const now = Date.now();
    const requestTime = requestDate.getTime();
    if (requestTime > now || requestTime < now - 24 * 60 * 60 * 1000) {
      console.warn("[cashout-notification] Suspicious request date:", payload.record.created_at);
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Read to Earn <noreply@joinreadtoearn.com>",
        to: [adminEmail],
        subject: `Cash Out Request — ${sanitizedEmail}`,
        html: `
          <h2>New Cash Out Request</h2>
          <p><strong>${sanitizedEmail}</strong> has requested a cash out of <strong>$${sanitizedAmount.toFixed(2)}</strong>.</p>
          <p>Please approve and send the funds via their preferred payout method.</p>
          <hr>
          <p><small>Request ID: ${sanitizedId}</small></p>
          <p><small>Created at: ${requestDate.toLocaleString('en-US', { timeZone: 'UTC' })} UTC</small></p>
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
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[cashout-notification] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
