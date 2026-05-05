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
  "spamgourmet.org", "spamgourmet.net", "trashmail.at",
  "trashmail.io", "trashmail.xyz", "tempmail.ninja", "tempr.email",
  "spamfree24.org", "spamfree24.de", "spamfree24.eu",
]);

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

  const ipRaw = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
  const ipAddress = ipRaw.split(",")[0].trim();
  const userAgent = req.headers.get("user-agent") ?? "unknown";

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(supabaseUrl, serviceKey);

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const emailDomain = user.email?.split("@")[1]?.toLowerCase() ?? "";
  if (DISPOSABLE_DOMAINS.has(emailDomain)) {
    return new Response(JSON.stringify({ error: "Disposable email addresses are not allowed." }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: blockedDomain } = await adminClient
    .from("blocked_email_domains")
    .select("domain")
    .eq("domain", emailDomain)
    .maybeSingle();
  if (blockedDomain) {
    return new Response(JSON.stringify({ error: "Disposable email addresses are not allowed." }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: {
    book_id: string;
    answers: { question_id: string; selected_answer: string }[];
    competition_id?: string;
    competition_round?: number;
    is_final_round?: boolean;
    time_spent_ms: number;
    sprint_id?: string;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { book_id, answers, competition_id, competition_round, is_final_round, time_spent_ms, sprint_id } = body;
  const isCompetition = !!competition_id && !!competition_round;

  // ── SPRINT PATH ─────────────────────────────────────────────────────────────
  if (sprint_id) {
    // Verify user entered this sprint
    const { data: sprintEntry } = await adminClient
      .from("sprint_entries")
      .select("id, score")
      .eq("sprint_id", sprint_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!sprintEntry) {
      return new Response(JSON.stringify({ error: "You must enter the sprint to participate." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only allow one submission
    if (sprintEntry.score !== null) {
      return new Response(JSON.stringify({ error: "You have already submitted for this sprint." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Grade the quiz
    const { data: questions, error: qErr } = await adminClient
      .from("questions")
      .select("id, correct_answer")
      .eq("book_id", book_id);

    if (qErr || !questions) {
      return new Response(JSON.stringify({ error: "Could not load questions" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const answerMap = new Map(answers.map((a) => [a.question_id, a.selected_answer]));
    let correct = 0;
    for (const q of questions) {
      if (answerMap.get(q.id) === q.correct_answer) correct++;
    }
    const total = questions.length;
    const passed = correct >= 8;

    // Fraud detection
    let isSuspicious = false;
    let fraudReason = "";
    if (passed && correct === total && time_spent_ms < 150_000) {
      isSuspicious = true;
      fraudReason = "Perfect score in under 2.5 minutes during sprint";
    }
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentAttempts } = await adminClient
      .from("quiz_attempts")
      .select("user_id")
      .eq("ip_address", ipAddress)
      .gte("attempted_at", since24h);
    const uniqueUsers = new Set((recentAttempts ?? []).map((a: { user_id: string }) => a.user_id));
    if (uniqueUsers.size >= 3) {
      isSuspicious = true;
      fraudReason = fraudReason
        ? fraudReason + "; 3+ accounts from same IP in 24h"
        : "3+ accounts from same IP in 24h during sprint";
    }
    if (isSuspicious) {
      await adminClient.from("profiles").update({ requires_tax_review: true }).eq("id", user.id);
      await adminClient.from("payout_logs").insert({
        user_id: user.id,
        amount: 0,
        status: "flagged",
        reason: fraudReason,
      });
    }

    // Log quiz attempt
    await adminClient.from("quiz_attempts").insert({
      user_id: user.id,
      book_id,
      score: correct,
      passed,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    // Write score + time to sprint_entries
    await adminClient
      .from("sprint_entries")
      .update({
        score: correct,
        time_spent_ms,
        submitted_at: new Date().toISOString(),
        status: passed ? "completed" : "failed",
      })
      .eq("sprint_id", sprint_id)
      .eq("user_id", user.id);

    return new Response(
      JSON.stringify({ passed, score: correct, total, time_spent_ms }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  // ── END SPRINT PATH ─────────────────────────────────────────────────────────

  // ── READATHON PATH ──────────────────────────────────────────────────────────
  if (!isCompetition) {
    const { data: activeReadathon } = await adminClient
      .from("readathons")
      .select("id")
      .eq("status", "active")
      .maybeSingle();

    if (activeReadathon) {
      const { data: entry } = await adminClient
        .from("readathon_entries")
        .select("id")
        .eq("readathon_id", activeReadathon.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!entry) {
        return new Response(JSON.stringify({ error: "You must enter the readathon to participate." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: alreadyDone } = await adminClient
        .from("readathon_progress")
        .select("id")
        .eq("readathon_id", activeReadathon.id)
        .eq("user_id", user.id)
        .eq("book_id", book_id)
        .maybeSingle();

      if (alreadyDone) {
        return new Response(JSON.stringify({ error: "Already completed this book in the current readathon." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: questions, error: qErr } = await adminClient
        .from("questions")
        .select("id, correct_answer")
        .eq("book_id", book_id);

      if (qErr || !questions) {
        return new Response(JSON.stringify({ error: "Could not load questions" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const answerMap = new Map(answers.map((a) => [a.question_id, a.selected_answer]));
      let correct = 0;
      for (const q of questions) {
        if (answerMap.get(q.id) === q.correct_answer) correct++;
      }
      const total = questions.length;
      const passed = correct >= 8;

      await adminClient.from("quiz_attempts").insert({
        user_id: user.id,
        book_id,
        score: correct,
        passed,
        ip_address: ipAddress,
        user_agent: userAgent,
      });

      let isSuspicious = false;
      let fraudReason = "";
      if (passed && correct === total && time_spent_ms < 150_000) {
        isSuspicious = true;
        fraudReason = "Perfect score in under 2.5 minutes during readathon";
      }
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recentAttempts } = await adminClient
        .from("quiz_attempts")
        .select("user_id")
        .eq("ip_address", ipAddress)
        .gte("attempted_at", since24h);
      const uniqueUsers = new Set((recentAttempts ?? []).map((a: { user_id: string }) => a.user_id));
      if (uniqueUsers.size >= 3) {
        isSuspicious = true;
        fraudReason = fraudReason
          ? fraudReason + "; 3+ accounts from same IP in 24h"
          : "3+ accounts from same IP in 24h during readathon";
      }
      if (isSuspicious) {
        await adminClient.from("profiles").update({ requires_tax_review: true }).eq("id", user.id);
        await adminClient.from("payout_logs").insert({
          user_id: user.id,
          amount: 0,
          status: "flagged",
          reason: fraudReason,
        });
      }

      if (passed) {
        const { data: bookData } = await adminClient
          .from("books")
          .select("page_count")
          .eq("id", book_id)
          .maybeSingle();

        const pages = bookData?.page_count ?? 0;

        await adminClient.from("readathon_progress").insert({
          readathon_id: activeReadathon.id,
          user_id: user.id,
          book_id,
          pages_read: pages,
        });

        const { data: bounty } = await adminClient
          .from("bounties")
          .select("id, reader_pool, book_type")
          .eq("book_id", book_id)
          .eq("status", "active")
          .gt("reader_pool", 0)
          .maybeSingle();

        let earnedAmount = 0;
        if (bounty) {
          const { data: bookFull } = await adminClient
            .from("books")
            .select("bounty_amount, book_type")
            .eq("id", book_id)
            .maybeSingle();

          if (bookFull) {
            if (bookFull.book_type === "sponsored") {
              const { data: rpcResult } = await adminClient.rpc("claim_bounty_payout", {
                p_book_id: book_id,
                p_user_id: user.id,
              });
              earnedAmount = rpcResult ?? 0;
            } else {
              earnedAmount = bookFull.bounty_amount ?? 0;
              await adminClient
                .from("profiles")
                .update({ available_balance: adminClient.rpc("increment_balance", { amount: earnedAmount }) })
                .eq("id", user.id);
            }
            await adminClient.from("payout_logs").insert({
              user_id: user.id,
              amount: earnedAmount,
              status: isSuspicious ? "flagged" : "completed",
              reason: "Bounty payout during readathon",
            });
          }
        }

        return new Response(
          JSON.stringify({ passed: true, score: correct, total, earned_amount: earnedAmount, pages_logged: pages }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ passed: false, score: correct, total, earned_amount: 0, pages_logged: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }
  // ── END READATHON PATH ──────────────────────────────────────────────────────

  // Load questions
  const { data: questions, error: questionsError } = await adminClient
    .from("questions")
    .select("id, correct_answer")
    .eq("book_id", book_id);

  if (questionsError || !questions) {
    return new Response(JSON.stringify({ error: "Could not load questions" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const answerMap = new Map(answers.map((a) => [a.question_id, a.selected_answer]));
  let correct = 0;
  for (const q of questions) {
    if (answerMap.get(q.id) === q.correct_answer) correct++;
  }
  const total = questions.length;

  let passed = false;
  if (is_final_round) {
    passed = true;
  } else if (competition_round === 1) {
    passed = correct >= 8;
  } else if (competition_round === 2) {
    passed = correct >= 9;
  } else {
    passed = correct >= 8;
  }

  await adminClient.from("quiz_attempts").insert({
    user_id: user.id,
    book_id,
    score: correct,
    passed,
    ip_address: ipAddress,
    user_agent: userAgent,
  });

  let isSuspicious = false;
  let fraudReason = "";
  if (passed && correct === total && time_spent_ms < 150_000) {
    isSuspicious = true;
    fraudReason = "Perfect score in under 2.5 minutes";
  }
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentAttempts } = await adminClient
    .from("quiz_attempts")
    .select("user_id")
    .eq("ip_address", ipAddress)
    .gte("attempted_at", since24h);
  const uniqueUsers = new Set((recentAttempts ?? []).map((a: { user_id: string }) => a.user_id));
  if (uniqueUsers.size >= 3) {
    isSuspicious = true;
    fraudReason = fraudReason
      ? fraudReason + "; 3+ accounts from same IP in 24h"
      : "3+ accounts from same IP in 24h";
  }
  if (isSuspicious) {
    await adminClient.from("profiles").update({ requires_tax_review: true }).eq("id", user.id);
    await adminClient.from("payout_logs").insert({
      user_id: user.id,
      amount: 0,
      status: "flagged",
      reason: fraudReason,
    });
  }

  // ── COMPETITION PATH ────────────────────────────────────────────────────────
  if (isCompetition) {
    const { data: existing } = await adminClient
      .from("elimination_progress")
      .select("id")
      .eq("competition_id", competition_id)
      .eq("user_id", user.id)
      .eq("round", competition_round)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "Already submitted for this round" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await adminClient.from("elimination_progress").insert({
      competition_id,
      user_id: user.id,
      round: competition_round,
      score: correct,
      total_questions: total,
      passed,
      submitted_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ passed, score: correct, total, is_final_round: !!is_final_round }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  // ── END COMPETITION PATH ────────────────────────────────────────────────────

  // ── STANDARD LIBRARY PATH ──────────────────────────────────────────────────
  const { data: existing } = await adminClient
    .from("completed_books")
    .select("id")
    .eq("user_id", user.id)
    .eq("book_id", book_id)
    .maybeSingle();

  if (existing) {
    return new Response(JSON.stringify({ error: "Already completed this book" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  await adminClient.from("completed_books").upsert({
    user_id: user.id,
    book_id,
    passed,
    completed_at: new Date().toISOString(),
  });

  if (!passed) {
    return new Response(
      JSON.stringify({ passed: false, score: correct, total, earned_amount: 0 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const [bookResult, profileResult] = await Promise.all([
    adminClient.from("books").select("bounty_amount, book_type, page_count").eq("id", book_id).maybeSingle(),
    adminClient.from("profiles").select("available_balance, streak_count, referral_id, referred_by").eq("id", user.id).maybeSingle(),
  ]);

  const book = bookResult.data;
  const profile = profileResult.data;

  if (!book || !profile) {
    return new Response(
      JSON.stringify({ passed: true, score: correct, total, earned_amount: 0 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { data: bounty } = await adminClient
    .from("bounties")
    .select("id, reader_pool")
    .eq("book_id", book_id)
    .eq("status", "active")
    .gt("reader_pool", 0)
    .maybeSingle();

  if (!bounty) {
    return new Response(
      JSON.stringify({ passed: true, score: correct, total, earned_amount: 0, pool_exhausted: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let earnedAmount = book.bounty_amount ?? 0;
  let streakBonus = 0;

  const streak = profile.streak_count ?? 0;
  if (streak >= 7) streakBonus = 0.10;

  let payoutStatus = isSuspicious ? "flagged" : "completed";
  const projectedBalance = (profile.available_balance ?? 0) + earnedAmount + streakBonus;
  if (projectedBalance >= 500) payoutStatus = "pending_review";

  if (book.book_type === "sponsored") {
    const { data: rpcResult } = await adminClient.rpc("claim_bounty_payout", {
      p_book_id: book_id,
      p_user_id: user.id,
    });
    earnedAmount = rpcResult ?? 0;
  } else {
    const newBalance = (profile.available_balance ?? 0) + earnedAmount + streakBonus;
    await adminClient.from("profiles").update({ available_balance: newBalance }).eq("id", user.id);
  }

  await adminClient.from("payout_logs").insert({
    user_id: user.id,
    amount: earnedAmount + streakBonus,
    status: payoutStatus,
    reason: "Bounty payout",
  });

  if (profile.referred_by) {
    const { data: referrer } = await adminClient
      .from("profiles")
      .select("available_balance")
      .eq("referral_id", profile.referred_by)
      .maybeSingle();
    if (referrer) {
      await adminClient
        .from("profiles")
        .update({ available_balance: (referrer.available_balance ?? 0) + 0.50 })
        .eq("referral_id", profile.referred_by);
    }
  }

  return new Response(
    JSON.stringify({
      passed: true,
      score: correct,
      total,
      earned_amount: earnedAmount,
      streak_bonus: streakBonus > 0 ? streakBonus : undefined,
      pool_exhausted: false,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
