import { useState } from "react";
import { FEATURES } from '../config/features';
import { supabase } from '../lib/supabase';
import { loadStripe } from "@stripe/stripe-js";
import {
Elements,
CardElement,
useStripe,
useElements,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export type CheckoutItem = {
type:
  | "listing"
  | "bounty"
  | "competition_sponsored"
  | "quick_task"
  | "survey"
  | "beta_reader"
  | "sensitivity_reader"
  | "subscription"
  | "time_boost"
  | "competition_entry"
  | "tournament_entry"
  | "sprint_entry"
  | "readathon_entry";
label: string;
amount: number;
metadata?: Record<string, string | number>;
};

export const LISTING_PRICES = [
{ label: "Single (1 book)", amount: 700 },
{ label: "Trilogy (3 books)", amount: 1800 },
{ label: "Series (5 books)", amount: 3000 },
{ label: "Catalog (10 books)", amount: 5000 },
{ label: "Imprint (25 books)", amount: 10000 },
];

export const BOUNTY_PRICES = [
{ label: "$25 Pool", amount: 2500 },
{ label: "$50 Pool", amount: 5000 },
{ label: "$100 Pool", amount: 10000 },
{ label: "$200 Pool", amount: 20000 },
{ label: "$500 Pool", amount: 50000 },
];

export const COMPETITION_SPONSORED_PRICES = [
{ label: "Spark ($45 prize pool)", amount: 6000 },
{ label: "Boost ($90 prize pool)", amount: 12000 },
{ label: "Spotlight ($187.50 prize pool)", amount: 25000 },
{ label: "Grand ($375+ prize pool)", amount: 50000 },
];

export const QUICK_TASK_PRICES = [
{ label: "Sample – 25 responses", amount: 1400 },
{ label: "Standard – 50 responses", amount: 2400 },
{ label: "Wide – 100 responses", amount: 4200 },
];

export const SURVEY_PRICES = [
{ label: "10 readers", amount: 1800 },
{ label: "25 readers", amount: 4000 },
{ label: "50 readers", amount: 7000 },
{ label: "100 readers", amount: 12500 },
{ label: "200 readers", amount: 22500 },
];

export const BETA_READER_PRICES = [
{ label: "5 readers", amount: 2800 },
{ label: "10 readers", amount: 6000 },
{ label: "20 readers", amount: 11000 },
{ label: "40 readers", amount: 20000 },
];

export const SENSITIVITY_READER_PRICES = [
{ label: "1 reader", amount: 5000 },
{ label: "2 readers", amount: 8000 },
{ label: "4 readers", amount: 15000 },
];

export const SUBSCRIPTION_PRICES = [
{ label: "Monthly", amount: 499 },
{ label: "Annual", amount: 4990 },
];

export const TIME_BOOST_PRICES = [
{ label: "Single Boost", amount: 99 },
{ label: "Starter Pack (6x)", amount: 499 },
{ label: "Marathoner Pack (15x)", amount: 999 },
];

export const COMPETITION_ENTRY_PRICES = [
{ label: "Basic Entry", amount: 500 },
{ label: "Standard Entry", amount: 700 },
{ label: "Premium Entry", amount: 1000 },
];

const REDIRECT_MAP: Record<string, string> = {
listing: "/author-dashboard",
bounty: "/author-dashboard",
competition_sponsored: "/author-dashboard",
quick_task: "/author-dashboard",
survey: "/author-dashboard",
beta_reader: "/author-dashboard",
sensitivity_reader: "/author-dashboard",
subscription: "/profile",
time_boost: "/profile",
competition_entry: FEATURES.elimination ? "/elimination" : "/sprints",
tournament_entry:  FEATURES.tournaments ? (FEATURES.elimination ? "/elimination" : "/sprints") : "/profile",
sprint_entry:      "/sprints",
readathon_entry:   FEATURES.readathon  ? "/readathon"  : "/profile",
};

const goTo = (path: string) => {
window.history.pushState({}, "", path);
window.dispatchEvent(new PopStateEvent("popstate"));
};

const CARD_STYLE = {
style: {
  base: {
    color: "#ffffff",
    fontFamily: "sans-serif",
    fontSize: "16px",
    "::placeholder": { color: "#6b7280" },
  },
  invalid: { color: "#ef4444" },
},
disableLink: true,
};

// ─── Shared post-payment DB logic ────────────────────────────────────────────
async function handlePostPayment(
item: CheckoutItem,
userId: string,
paymentRef: string
) {
const pending = JSON.parse(sessionStorage.getItem("pendingSubmission") ?? "null");
console.log('[Checkout] handlePostPayment called:', { itemType: item.type, pending, userId });

if (pending) {
  if (item.type === "listing") {
    const { error } = await supabase.from("author_submissions").insert(pending);
    if (error) console.error('[Checkout] listing insert error:', error);

    const bundleSize = pending.bundle_size || 1;
    const email = pending.email;
    if (email) {
      const { data: creditRow } = await supabase
        .from("author_credits")
        .select("credits_total, credits_used")
        .eq("email", email)
        .maybeSingle();

      if (creditRow) {
        await supabase
          .from("author_credits")
          .update({ credits_total: creditRow.credits_total + bundleSize })
          .eq("email", email);
      } else {
        await supabase
          .from("author_credits")
          .insert({ email, credits_total: bundleSize, credits_used: 1 });
      }
    }

  } else if (item.type === "competition_entry") {
    const { error } = await supabase.from("competition_entries").insert({
      competition_id: pending.competition_id,
      user_id: userId,
      entry_fee_paid: item.amount / 100,
      is_late_entry: pending.is_late_entry ?? false,
      paid_at: new Date().toISOString(),
      status: "active",
    });
    if (error) console.error('[Checkout] competition_entry insert error:', error);

    const entryFee = item.amount / 100;
    const readerShare = entryFee - entryFee * 0.25;
    const { data: comp } = await supabase
      .from("competitions")
      .select("prize_pool")
      .eq("id", pending.competition_id)
      .single();
    if (comp) {
      await supabase.rpc("increment_prize_pool", {
        p_competition_id: pending.competition_id,
        p_amount: readerShare,
      });
    }

  } else if (item.type === "time_boost") {
    const boostCount = pending.boosts ?? item.metadata?.boosts ?? 0;
    const { data: existing } = await supabase
      .from("user_boosts")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) {
      const { error } = await supabase
        .from("user_boosts")
        .update({ balance: existing.balance + boostCount, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      if (error) console.error('[Checkout] time_boost update error:', error);
    } else {
      const { error } = await supabase.from("user_boosts").insert({ user_id: userId, balance: boostCount });
      if (error) console.error('[Checkout] time_boost insert error:', error);
    }

  } else if (item.type === "sprint_entry") {
    const { error } = await supabase.from("sprint_entries").insert({
      sprint_id: pending.sprint_id,
      user_id: userId,
      paid_at: new Date().toISOString(),
      status: "active",
    });
    if (error) console.error('[Checkout] sprint_entry insert error:', error);

    const entryFee = item.amount / 100;
    const readerShare = entryFee - entryFee * 0.25;
    const { data: sprintData } = await supabase
      .from("sprints")
      .select("prize_pool")
      .eq("id", pending.sprint_id)
      .single();
    if (sprintData) {
      await supabase
        .from("sprints")
        .update({ prize_pool: (sprintData.prize_pool ?? 0) + readerShare })
        .eq("id", pending.sprint_id);
    }

  } else if (item.type === "beta_reader" || item.type === "sensitivity_reader") {
    console.log('[Checkout] Inserting beta/sensitivity reader:', { table: pending?.table, data: pending?.data });
    const { error } = await supabase.from(pending.table).insert({
      ...pending.data,
      status: "active",
    });
    if (error) {
      console.error('[Checkout] beta/sensitivity insert error:', error);
    } else {
      console.log('[Checkout] beta/sensitivity inserted successfully');
    }

  } else if (item.type === "readathon_entry") {
    const { error } = await supabase.from("readathon_entries").insert({
      readathon_id: pending.readathon_id,
      user_id: userId,
      entry_fee_paid: item.amount / 100,
      paid_at: new Date().toISOString(),
    });
    if (error) console.error('[Checkout] readathon_entry insert error:', error);

    const entryFee = item.amount / 100;
    const readerShare = entryFee - entryFee * 0.25;
    const { data: readathonData } = await supabase
      .from("readathons")
      .select("prize_pool")
      .eq("id", pending.readathon_id)
      .single();
    if (readathonData) {
      await supabase
        .from("readathons")
        .update({ prize_pool: (readathonData.prize_pool ?? 0) + readerShare })
        .eq("id", pending.readathon_id);
    }

  } else if (pending.table) {
    const { error } = await supabase.from(pending.table).insert(pending.data);
    if (error) console.error('[Checkout] generic table insert error:', error);
  }

  sessionStorage.removeItem("pendingSubmission");
  sessionStorage.removeItem("checkoutItem");
}
}

// ─── Stripe form ─────────────────────────────────────────────────────────────
const StripeForm = ({ item }: { item: CheckoutItem }) => {
const stripe = useStripe();
const elements = useElements();
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [success, setSuccess] = useState(false);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!stripe || !elements) return;

  setLoading(true);
  setError(null);

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("You must be logged in to checkout.");

    const { data, error: fnError } = await supabase.functions.invoke("create-payment-intent", {
      body: {
        amount: item.amount,
        currency: "usd",
        metadata: { user_id: user.id, type: item.type, label: item.label, ...item.metadata },
      },
    });

    if (fnError || !data?.clientSecret)
      throw new Error(fnError?.message || "Failed to initialize payment.");

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) throw new Error("Card element not found.");

    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
      data.clientSecret,
      { payment_method: { card: cardElement } }
    );

    if (stripeError) throw new Error(stripeError.message);

    if (paymentIntent?.status === "succeeded") {
      const { error: paymentLogError } = await supabase.from("payments").insert({
        user_id: user.id,
        stripe_payment_intent_id: paymentIntent.id,
        amount: item.amount,
        type: item.type,
        label: item.label,
        metadata: item.metadata ?? {},
        status: "succeeded",
      });
      if (paymentLogError) console.error('[Checkout] payments log error:', paymentLogError);

      await handlePostPayment(item, user.id, paymentIntent.id);
      setSuccess(true);
      setTimeout(() => goTo(REDIRECT_MAP[item.type] ?? "/profile"), 2500);
    }
  } catch (err: unknown) {
    setError(err instanceof Error ? err.message : "Something went wrong.");
  } finally {
    setLoading(false);
  }
};

if (success) {
  return (
    <div className="text-center py-20">
      <div className="text-6xl mb-4">🎉</div>
      <h2 className="text-2xl font-bold text-green-400 mb-2">Payment Successful!</h2>
      <p className="text-gray-500">Redirecting you now...</p>
    </div>
  );
}

return (
  <form onSubmit={handleSubmit} className="space-y-5">
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">Card Details</label>
      <div className="px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg">
        <CardElement options={CARD_STYLE} />
      </div>
    </div>

    {error && (
      <div className="p-3 bg-red-900/20 border border-red-900/50 rounded text-red-400 text-sm">
        {error}
      </div>
    )}

    <button
      type="submit"
      disabled={loading || !stripe}
      className="w-full bg-white text-black font-medium py-4 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed text-lg"
    >
      {loading ? "Processing..." : `Pay $${(item.amount / 100).toFixed(2)}`}
    </button>

    <p className="text-gray-600 text-xs text-center">
      Secured by Stripe. Your card info never touches our servers.
    </p>
  </form>
);
};

// ─── PayPal button ────────────────────────────────────────────────────────────
const PayPalButton = ({ item }: { item: CheckoutItem }) => {
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const handlePayPal = async () => {
  setLoading(true);
  setError(null);

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("You must be logged in to checkout.");

    const { data: order, error: fnError } = await supabase.functions.invoke(
      "create-paypal-order",
      {
        body: {
          amount: item.amount,
          description: item.label,
          metadata: { user_id: user.id, type: item.type, ...item.metadata },
        },
      }
    );

    if (fnError || !order) throw new Error(fnError?.message || "Failed to create PayPal order.");

    const approvalUrl = order.links?.find((l: any) => l.rel === "approve")?.href;
    if (!approvalUrl) throw new Error("No PayPal approval URL returned.");

    sessionStorage.setItem("paypalItemType", item.type);
    window.location.href = approvalUrl;
  } catch (err: unknown) {
    setError(err instanceof Error ? err.message : "Something went wrong.");
    setLoading(false);
  }
};

return (
  <div className="space-y-3">
    {error && (
      <div className="p-3 bg-red-900/20 border border-red-900/50 rounded text-red-400 text-sm">
        {error}
      </div>
    )}
    <button
      onClick={handlePayPal}
      disabled={loading}
      className="w-full bg-[#FFC439] text-[#003087] font-bold py-4 rounded-lg hover:bg-[#f0b429] transition disabled:opacity-50 disabled:cursor-not-allowed text-lg flex items-center justify-center gap-2"
    >
      {loading ? (
        "Redirecting to PayPal..."
      ) : (
        <>
          <span className="text-[#003087] font-black">Pay</span>
          <span className="text-[#009cde] font-black">Pal</span>
          <span className="ml-1">${(item.amount / 100).toFixed(2)}</span>
        </>
      )}
    </button>
    <p className="text-gray-600 text-xs text-center">
      You'll be redirected to PayPal to complete your payment.
    </p>
  </div>
);
};

// ─── Main checkout form with method selector ──────────────────────────────────
const CheckoutForm = ({ item }: { item: CheckoutItem }) => {
const [method, setMethod] = useState<"card" | "paypal">("card");

return (
  <div className="space-y-6">
    {/* Order summary */}
    <div className="bg-[#1a1a1a] rounded-lg p-5 border border-gray-800">
      <h3 className="text-white font-medium mb-3">Order Summary</h3>
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">{item.label}</span>
        <span className="text-white font-medium">${(item.amount / 100).toFixed(2)}</span>
      </div>
      <div className="border-t border-gray-700 mt-3 pt-3 flex justify-between">
        <span className="text-white font-medium">Total</span>
        <span className="text-white font-bold">${(item.amount / 100).toFixed(2)}</span>
      </div>
    </div>

    {/* Payment method tabs */}
    <div>
      <p className="text-sm font-medium text-gray-300 mb-3">Payment Method</p>
      <div className="flex gap-2">
        <button
          onClick={() => setMethod("card")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition ${
            method === "card"
              ? "bg-white text-black border-white"
              : "bg-transparent text-gray-400 border-gray-700 hover:border-gray-500"
          }`}
        >
          💳 Card
        </button>
        <button
          onClick={() => setMethod("paypal")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition ${
            method === "paypal"
              ? "bg-[#FFC439] text-[#003087] border-[#FFC439]"
              : "bg-transparent text-gray-400 border-gray-700 hover:border-gray-500"
          }`}
        >
          🅿 PayPal
        </button>
      </div>
    </div>

    {/* Active payment method */}
    {method === "card" ? (
      <Elements stripe={stripePromise}>
        <StripeForm item={item} />
      </Elements>
    ) : (
      <PayPalButton item={item} />
    )}
  </div>
);
};

// ─── Page wrapper ─────────────────────────────────────────────────────────────
const Checkout = () => {
const item = JSON.parse(sessionStorage.getItem("checkoutItem") ?? "null") as CheckoutItem | undefined;

if (!item) {
  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-gray-400 mb-4">No item selected for checkout.</p>
        <button
          onClick={() => goTo("/")}
          className="bg-white text-black font-medium px-6 py-3 rounded-lg hover:bg-gray-200 transition"
        >
          Go Home
        </button>
      </div>
    </div>
  );
}

return (
  <div className="min-h-screen bg-[#0f0f0f]">
    <div className="max-w-lg mx-auto px-4 py-16">
      <div className="mb-8">
        <button
          onClick={() => goTo(-1 as any)}
          className="text-gray-500 hover:text-white text-sm transition mb-6 flex items-center gap-1"
        >
          ← Back
        </button>
        <h1 className="font-serif text-3xl text-white">Checkout</h1>
      </div>

      <CheckoutForm item={item} />
    </div>
  </div>
);
};

export default Checkout;
