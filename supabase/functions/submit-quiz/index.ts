import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Get the user from the auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Create a user-scoped client (to verify identity)
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // 3. Create a service role client (for privileged writes)
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 4. Verify the user is authenticated
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Parse the request body
    const { book_id, answers } = await req.json();
    // answers = [{ question_id: "uuid", selected_answer: "text of their choice" }]

    if (!book_id || !answers || !Array.isArray(answers)) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Check if user already passed this book's quiz
    const { data: existingPass } = await adminClient
      .from("quiz_attempts")
      .select("id")
      .eq("user_id", user.id)
      .eq("book_id", book_id)
      .eq("passed", true)
      .maybeSingle();

    if (existingPass) {
      return new Response(JSON.stringify({ error: "You have already passed this quiz" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 7. Fetch correct answers from DB using service role (never exposed to client)
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

    // 8. Grade the quiz server-side
    let correct = 0;
    for (const question of questions) {
      const userAnswer = answers.find((a: any) => a.question_id === question.id);
      if (userAnswer && userAnswer.selected_answer === question.correct_answer) {
        correct++;
      }
    }

    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= 80; // 80% pass threshold

    // 9. Record the attempt using service role
    const { error: attemptError } = await adminClient
      .from("quiz_attempts")
      .insert({
        user_id: user.id,
        book_id,
        score,
        passed,
      });

    if (attemptError) {
      return new Response(JSON.stringify({ error: "Failed to record attempt" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 10. If passed: record completed book + credit the user
    if (passed) {
      // Mark book as completed
      await adminClient
        .from("completed_books")
        .upsert({ user_id: user.id, book_id }, { onConflict: "user_id,book_id" });

      // Get the book's bounty amount
      const { data: book } = await adminClient
        .from("books")
        .select("bounty_amount")
        .eq("id", book_id)
        .single();

      if (book && book.bounty_amount > 0) {
        // Credit the user's available_balance
        const { error: balanceError } = await adminClient.rpc("increment_balance", {
          user_id_input: user.id,
          amount_input: book.bounty_amount,
        });

        if (balanceError) {
          console.error("Balance update failed:", balanceError);
          // Don't fail the whole request -- attempt is recorded, flag for manual review
        }
      }
    }

    // 11. Return result to client
    return new Response(
      JSON.stringify({
        passed,
        score,
        correct,
        total: questions.length,
        message: passed
          ? "Congratulations! You passed and your earnings have been credited."
          : `You scored ${score}%. You need 80% to pass. Try again after reviewing the book.`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
