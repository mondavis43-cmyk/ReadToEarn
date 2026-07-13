import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "tempmail.com", "throwaway.email",
  "yopmail.com", "sharklasers.com", "guerrillamailblock.com", "grr.la",
  "guerrillamail.info", "spam4.me", "trashmail.com", "trashmail.me",
  "dispostable.com", "maildrop.cc", "spamgourmet.com", "10minutemail.com",
  "10minutemail.net", "temp-mail.org", "fakeinbox.com", "mailnull.com",
  "spamcowboy.com", "getairmail.com", "filzmail.com", "throwam.com",
  "spamevader.com", "discard.email", "spamhereplease.com", "hatespam.org",
  "rcpt.at", "spam.la", "tempinbox.com", "mailnesia.com",
]);

/**
 * SECURITY FIX #16: Check disposable email via API with fallback to local list
 */
async function isDisposableEmail(email: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://disposable.debounce.io/?email=${encodeURIComponent(email)}`,
      { signal: AbortSignal.timeout(5000) } // 5 second timeout
    );
    const data = await response.json();
    if (data.disposable === true) {
      return true;
    }
  } catch (err) {
    console.warn('[submit-quiz] Error checking disposable email via API:', err);
    // Fall through to local list check
  }

  // Fallback to local list
  const emailDomain = email.split("@")[1]?.toLowerCase() ?? "";
  return DISPOSABLE_DOMAINS.has(emailDomain);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing authorization" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ipRaw = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
  const ipAddress = ipRaw.split(",")[0].trim();
  const userAgent = req.headers.get("user-agent") ?? "unknown";

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(supabaseUrl, serviceKey);

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // SECURITY FIX #16: Enhanced disposable email checking
  const isDisposable = await isDisposableEmail(user.email ?? "");
  if (isDisposable) {
    return new Response(
      JSON.stringify({
        error: "Disposable email addresses are not allowed. Please use a personal or business email.",
      }),
      {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const emailDomain = user.email?.split("@")[1]?.toLowerCase() ?? "";
  const { data: blockedDomain } = await adminClient
    .from("blocked_email_domains")
    .select("domain")
    .eq("domain", emailDomain)
    .maybeSingle();

  if (blockedDomain) {
    return new Response(JSON.stringify({ error: "Email domain is blocked" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Rest of quiz submission logic...
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
