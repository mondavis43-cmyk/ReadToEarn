import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
"Access-Control-Allow-Origin": "*",
"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Known disposable email domains
const DISPOSABLE_DOMAINS = new Set([
"mailinator.com", "guerrillamail.com", "tempmail.com", "throwaway.email",
"yopmail.com", "sharklasers.com", "guerrillamailblock.com", "grr.la",
"guerrillamail.info", "spam4.me", "trashmail.com", "trashmail.me",
"dispostable.com", "maildrop.cc", "spamgourmet.com", "10minutemail.com",
"10minutemail.net", "temp-mail.org", "fakeinbox.com", "mailnull.com",
"spamcowboy.com", "getairmail.com", "filzmail.com", "throwam.com",
"spamevader.com", "discard.email", "spamhereplease.com", "hatespam.org",
"rcpt.at", "spam.la", "tempinbox.com", "throwam.com", "mailnesia.com",
"mailnull.com", "spamgourmet.org", "spamgourmet.net", "trashmail.at",
"trashmail.io", "trashmail.xyz", "tempmail.ninja", "tempr.email",
"dispostable.com", "spamfree24.org", "spamfree24.de", "spamfree24.eu",
]);

serve(async (req) => {
if (req.method === "OPTIONS") {
  return new Response("ok", { headers: corsHeaders });
}

try {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing authorization" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Capture IP and user agent for fraud detection
  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // --- DISPOSABLE EMAIL CHECK ---
  const emailDomain = user.email?.split("@")[1]?.toLowerCase() ?? "";
  if (DISPOSABLE_DOMAINS.has(emailDomain)) {
    return new Response(JSON.stringify({ error: "Disposable email addresses are not allowed." }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Also check DB blocklist for domains added after deploy
  const { data: blockedDomain } = await adminClient
    .from("blocked_email_domains")
    .select("domain")
    .eq("domain", emailDomain)
    .maybeSingle();

  if (blockedDomain) {
    return new Response(JSON.stringify({ error: "Disposable email addresses are not allowed." }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { book_id, answers, competition_id, competition_round, is_final_round, time_spent_ms } = await req.json();

  if (!book_id || !answers || !Array.isArray(answers)) {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const is_competition = !!competition_id;

  // --- DUPLICATE SUBMISSION CHECK ---
  if (is_competition) {
    const { data: existing } = await adminClient
      .from("elimination_progress")
      .select("id")
      .eq("competition_id", competition_id)
      .eq("user_id", user.id)
      .eq("round", competition_round)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ error: "Already submitted for this round" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } else {
    const { data: existing } = await adminClient
      .from("completed_books")
      .select("id")
      .eq("user_id", user.id)
      .eq("book_id", book_id)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ error: "Already completed this book" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // --- FETCH CORRECT ANSWERS (service role only, never exposed to client) ---
  const { data: questions, error: qError } = await adminClient
    .from("questions")
    .select("id, correct_answer")
    .eq("book_id", book_id);

  if (qError || !questions || questions.length === 0) {
    return new Response(JSON.stringify({ error: "Could not load questions" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // --- GRADE SERVER-SIDE ---
  let correct = 0;
  for (const question of questions) {
    const userAnswer = answers.find((a: { question_id: string; selected_answer: string }) =>
      a.question_id === question.id
    );
    if (userAnswer && userAnswer.selected_answer === question.correct_answer) {
      correct++;
    }
  }

  const total = questions.length;

  // --- DETERMINE PASS ---
  const ELIMINATION_PASS_THRESHOLD: Record<number, number> = { 1: 8, 2: 9 };
  let pass = false;
  if (is_competition) {
    if (is_final_round) {
      pass = true;
    } else {
      const threshold = ELIMINATION_PASS_THRESHOLD[competition_round] ?? 8;
      pass = correct >= threshold;
    }
  } else {
    pass = correct >= 8;
  }

  // --- FRAUD DETECTION ---
  // Flag if: perfect score AND completed suspiciously fast (under 2.5 min = 150000ms)
  const SUSPICIOUS_TIME_MS = 150_000;
  const isPerfectScore = correct === total;
  const isSuspiciouslyFast = typeof time_spent_ms === "number" && time_spent_ms < SUSPICIOUS_TIME_MS;
  const isSuspicious = isPerfectScore && isSuspiciouslyFast;

  // Check if another user has submitted from this IP in the last 24 hours
  // Flag if 3+ different user_ids share this IP
  let ipFlagged = false;
  if (ipAddress !== "unknown") {
    const { data: ipMatches } = await adminClient
      .from("quiz_attempts")
      .select("user_id")
      .eq("ip_address", ipAddress)
      .gte("attempted_at", new Date(Date.now() - 86_400_000).toISOString());

    if (ipMatches) {
      const uniqueUsers = new Set(ipMatches.map((r: { user_id: string }) => r.user_id));
      uniqueUsers.add(user.id);
      if (uniqueUsers.size >= 3) {
        ipFlagged = true;
      }
    }
  }

  const flagForReview = isSuspicious || ipFlagged;

  // --- LOG QUIZ ATTEMPT ---
  await adminClient.from("quiz_attempts").insert({
    user_id: user.id,
    book_id,
    score: correct,
    passed: pass,
    ip_address: ipAddress,
    user_agent: userAgent,
  });

  // Flag profile for admin review if suspicious
  if (flagForReview) {
    await adminClient.from("profiles").update({
      requires_tax_review: true,
    }).eq("id", user.id);

    // Log the flag reason for the admin dashboard
    await adminClient.from("payout_logs").insert({
      user_id: user.id,
      amount: 0,
      status: "flagged",
      reason: isSuspicious && ipFlagged
        ? "suspicious_speed_and_shared_ip"
        : isSuspicious
        ? "suspicious_speed"
        : "shared_ip",
    });
  }

  // --- COMPETITION PATH ---
  if (is_competition) {
    await adminClient.from("elimination_progress").insert({
      competition_id,
      user_id: user.id,
      round: competition_round,
      score: correct,
      total_questions: total,
      passed: pass,
      submitted_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ passed: pass, score: correct, total, is_final_round }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // --- STANDARD LIBRARY PATH ---
  await adminClient.from("completed_books").upsert(
    { user_id: user.id, book_id },
    { onConflict: "user_id,book_id" }
  );

  let earned_amount = 0;
  let streak_bonus: number | null = null;
  let pool_exhausted = false;

  if (pass) {
    const { data: book } = await adminClient
      .from("books")
      .select("bounty_amount, book_type, page_count")
      .eq("id", book_id)
      .single();

    const { data: profile } = await adminClient
      .from("profiles")
      .select("available_balance, streak_count, last_quiz_date, referred_by, requires_tax_review")
      .eq("id", user.id)
      .single();

    if (book && profile) {
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      const newStreak = profile.last_quiz_date === yesterday
        ? (profile.streak_count ?? 0) + 1
        : 1;

      let bonus = 0;
      if (newStreak === 7 || newStreak === 30) {
        bonus = 0.10;
        streak_bonus = newStreak;
      }

      const payout = book.bounty_amount ?? 0;
      earned_amount = payout;

      const projectedBalance = profile.available_balance + payout + bonus;
      const shouldFlag = projectedBalance >= 500;

      if (book.book_type === "sponsored") {
        const { data: result } = await adminClient.rpc("claim_bounty_payout", {
          p_book_id: book_id,
          p_user_id: user.id,
          p_amount: payout,
        });

        if (result === "ok") {
          await adminClient.from("profiles").update({
            streak_count: newStreak,
            last_quiz_date: today,
            requires_tax_review: profile.requires_tax_review || shouldFlag || flagForReview,
          }).eq("id", user.id);

          await adminClient.from("payout_logs").insert({
            user_id: user.id,
            amount: payout + bonus,
            status: flagForReview ? "flagged" : shouldFlag ? "pending_review" : "completed",
            reason: flagForReview
              ? (isSuspicious && ipFlagged ? "suspicious_speed_and_shared_ip" : isSuspicious ? "suspicious_speed" : "shared_ip")
              : shouldFlag ? "1099_threshold" : null,
          });
        } else {
          earned_amount = 0;
          pool_exhausted = true;
        }
      } else {
        await adminClient.from("profiles").update({
          available_balance: projectedBalance,
          streak_count: newStreak,
          last_quiz_date: today,
          requires_tax_review: profile.requires_tax_review || shouldFlag || flagForReview,
        }).eq("id", user.id);

        await adminClient.from("payout_logs").insert({
          user_id: user.id,
          amount: payout + bonus,
          status: flagForReview ? "flagged" : shouldFlag ? "pending_review" : "completed",
          reason: flagForReview
            ? (isSuspicious && ipFlagged ? "suspicious_speed_and_shared_ip" : isSuspicious ? "suspicious_speed" : "shared_ip")
            : shouldFlag ? "1099_threshold" : null,
        });
      }

      if (profile.referred_by) {
        const { data: referrer } = await adminClient
          .from("profiles")
          .select("available_balance")
          .eq("id", profile.referred_by)
          .single();
        if (referrer) {
          await adminClient.from("profiles")
            .update({ available_balance: referrer.available_balance + 0.50 })
            .eq("id", profile.referred_by);
        }
      }
    }
  }

  return new Response(
    JSON.stringify({
      passed: pass,
      score: correct,
      total,
      earned_amount,
      streak_bonus,
      pool_exhausted,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );

} catch (err) {
  console.error("Unexpected error:", err);
  return new Response(JSON.stringify({ error: "Internal server error" }), {
    status: 500,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
});