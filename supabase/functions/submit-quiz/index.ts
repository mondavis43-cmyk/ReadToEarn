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
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
      const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "notifications@joinreadtoearn.com";
      if (user.email && RESEND_API_KEY) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: user.email,
            subject: "Action Required: Your account has been flagged for review",
            html: `<p>Hi there,</p>
            <p>Your account has been flagged for a security review. This can happen when unusual activity is detected.</p>
            <p>Your earnings are safe but cashouts will be paused until the review is complete. This typically takes 1–3 business days.</p>
            <p>If you believe this is a mistake, please reply to this email.</p>
            <p>— The ReadToEarn Team</p>`,
          }),
        });
      }
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
  // ── READATHON (BINGO) PATH ──────────────────────────────────────────────────
  if (!isCompetition) {
    const { data: activeReadathon } = await adminClient
      .from("readathons")
      .select("id")
      .eq("status", "active")
      .maybeSingle();
    if (activeReadathon) {
      // 1. Verify user has entered this readathon
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
      // 2. Check the book belongs to a square on this readathon's card
      const { data: square } = await adminClient
        .from("readathon_squares")
        .select("id, row_index, col_index")
        .eq("readathon_id", activeReadathon.id)
        .eq("book_id", book_id)
        .maybeSingle();
      if (!square) {
        return new Response(JSON.stringify({ error: "This book is not on the current readathon card." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // 3. Check if already completed this square
      const { data: alreadyDone } = await adminClient
        .from("readathon_completions")
        .select("id")
        .eq("readathon_id", activeReadathon.id)
        .eq("user_id", user.id)
        .eq("square_id", square.id)
        .maybeSingle();
      if (alreadyDone) {
        return new Response(JSON.stringify({ error: "You have already completed this square." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // 4. Grade the quiz
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
      // 5. Log quiz attempt
      await adminClient.from("quiz_attempts").insert({
        user_id: user.id,
        book_id,
        score: correct,
        passed,
        ip_address: ipAddress,
        user_agent: userAgent,
      });
      // 6. Fraud detection
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
          user_id: user.id, amount: 0, status: "flagged", reason: fraudReason,
        });
        const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
        const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "notifications@joinreadtoearn.com";
        if (user.email && RESEND_API_KEY) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: FROM_EMAIL,
              to: user.email,
              subject: "Action Required: Your account has been flagged for review",
              html: `<p>Hi there,</p>
              <p>Your account has been flagged for a security review. This can happen when unusual activity is detected.</p>
              <p>Your earnings are safe but cashouts will be paused until the review is complete. This typically takes 1–3 business days.</p>
              <p>If you believe this is a mistake, please reply to this email.</p>
              <p>— The ReadToEarn Team</p>`,
            }),
          });
        }
      }
      if (!passed) {
        return new Response(
          JSON.stringify({ passed: false, score: correct, total }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // 7. Record square completion
      await adminClient.from("readathon_completions").insert({
        readathon_id: activeReadathon.id,
        user_id: user.id,
        square_id: square.id,
      });
      // 8. Check if this completes the row (all 4 squares in same row_index)
      const { data: rowSquares } = await adminClient
        .from("readathon_squares")
        .select("id")
        .eq("readathon_id", activeReadathon.id)
        .eq("row_index", square.row_index);
      const rowSquareIds = (rowSquares ?? []).map((s: { id: string }) => s.id);
      const { data: rowCompletions } = await adminClient
        .from("readathon_completions")
        .select("square_id")
        .eq("readathon_id", activeReadathon.id)
        .eq("user_id", user.id)
        .in("square_id", rowSquareIds);
      const completedIds = new Set((rowCompletions ?? []).map((c: { square_id: string }) => c.square_id));
      const rowComplete = rowSquareIds.every((id: string) => completedIds.has(id));
      let bingo = false;
      if (rowComplete) {
        // Only record bingo once per row per user
        const { data: existingBingo } = await adminClient
          .from("readathon_bingos")
          .select("id")
          .eq("readathon_id", activeReadathon.id)
          .eq("user_id", user.id)
          .eq("row_index", square.row_index)
          .maybeSingle();
        if (!existingBingo) {
          await adminClient.from("readathon_bingos").insert({
            readathon_id: activeReadathon.id,
            user_id: user.id,
            row_index: square.row_index,
          });
          bingo = true;
        }
      }
      return new Response(
        JSON.stringify({ passed: true, score: correct, total, bingo, row_index: square.row_index }),
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
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
    const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "notifications@joinreadtoearn.com";
    if (user.email && RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: user.email,
          subject: "Action Required: Your account has been flagged for review",
          html: `<p>Hi there,</p>
          <p>Your account has been flagged for a security review. This can happen when unusual activity is detected.</p>
          <p>Your earnings are safe but cashouts will be paused until the review is complete. This typically takes 1–3 business days.</p>
          <p>If you believe this is a mistake, please reply to this email.</p>
          <p>— The ReadToEarn Team</p>`,
        }),
      });
    }
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
  // One attempt per book across all formats (bounty or sprint)
  const { data: priorAttempt } = await adminClient
    .from("quiz_attempts")
    .select("id")
    .eq("user_id", user.id)
    .eq("book_id", book_id)
    .maybeSingle();

  if (priorAttempt) {
    return new Response(
      JSON.stringify({ passed, score: correct, total, earned_amount: 0, already_completed: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
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
    adminClient.from("profiles").select("available_balance, referral_id, referred_by").eq("id", user.id).maybeSingle(),
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
  let payoutStatus = isSuspicious ? "flagged" : "completed";
  const projectedBalance = (profile.available_balance ?? 0) + earnedAmount;
  if (projectedBalance >= 500) payoutStatus = "pending_review";
  if (book.book_type === "sponsored") {
    const { data: rpcResult } = await adminClient.rpc("claim_bounty_payout", {
      p_book_id: book_id,
      p_user_id: user.id,
    });
    earnedAmount = rpcResult ?? 0;
  } else {
    const newBalance = (profile.available_balance ?? 0) + earnedAmount;
    await adminClient.from("profiles").update({ available_balance: newBalance }).eq("id", user.id);
  }
  await adminClient.from("payout_logs").insert({
    user_id: user.id,
    amount: earnedAmount,
    status: payoutStatus,
    reason: "Bounty payout",
  });
  return new Response(
    JSON.stringify({
      passed: true,
      score: correct,
      total,
      earned_amount: earnedAmount,
      pool_exhausted: false,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
