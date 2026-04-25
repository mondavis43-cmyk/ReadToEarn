import { useState } from "react";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// ─── Types ────────────────────────────────────────────────────────────────────

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
    | "competition_entry";
  label: string;
  amount: number;
  metadata?: Record<string, string | number>;
};

// ─── Pricing constants ────────────────────────────────────────────────────────

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

// ─── Redirect map ─────────────────────────────────────────────────────────────

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
  competition_entry: "/competitions",
};

// ─── Navigation helper ────────────────────────────────────────────────────────

const goTo = (path: string) => {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
};

// ─── Card element styles ──────────────────────────────────────────────────────

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
};

// ─── CheckoutForm ─────────────────────────────────────────────────────────────

const CheckoutForm = ({ item }: { item: CheckoutItem }) => {
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
      // 1. Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("You must be logged in to checkout.");

      // 2. Create PaymentIntent via Edge Function
      const { data, error: fnError } = await supabase.functions.invoke(
        "create-payment-intent",
        {
          body: {
            amount: item.amount,
            currency: "usd",
            metadata: {
              user_id: user.id,
              type: item.type,
              label: item.label,
              ...item.metadata,
            },
          },
        }
      );

      if (fnError || !data?.clientSecret)
        throw new Error(fnError?.message || "Failed to initialize payment.");

      // 3. Confirm card payment
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not found.");

      const { error: stripeError, paymentIntent } =
        await stripe.confirmCardPayment(data.clientSecret, {
          payment_method: { card: cardElement },
        });

      if (stripeError) throw new Error(stripeError.message);

      if (paymentIntent?.status === "succeeded") {
        // 4. Log to Supabase
        await supabase.from("payments").insert({
          user_id: user.id,
          stripe_payment_intent_id: paymentIntent.id,
          amount: item.amount,
          type: item.type,
          label: item.label,
          metadata: item.metadata ?? {},
          status: "succeeded",
        });

        // 5. Insert pending submission if this was a listing purchase
        const pending = (window as any).__pendingSubmission;
        if (pending && item.type === "listing") {
          await supabase.from("author_submissions").insert(pending);
          delete (window as any).__pendingSubmission;
        }

        // 6. Show success + redirect
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
        <h2 className="text-2xl font-bold text-green-400 mb-2">
          Payment Successful!
        </h2>
        <p className="text-gray-500">Redirecting you now...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Order Summary */}
      <div className="bg-[#1a1a1a] rounded-lg p-5 border border-gray-800">
        <h3 className="text-white font-medium mb-3">Order Summary</h3>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">{item.label}</span>
          <span className="text-white font-medium">
            ${(item.amount / 100).toFixed(2)}
          </span>
        </div>
        <div className="border-t border-gray-700 mt-3 pt-3 flex justify-between">
          <span className="text-white font-medium">Total</span>
          <span className="text-white font-bold">
            ${(item.amount / 100).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Card Input */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Card Details
        </label>
        <div className="px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg">
          <CardElement options={CARD_STYLE} />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-900/20 border border-red-900/50 rounded text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Submit */}
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

// ─── Checkout page (default export) ──────────────────────────────────────────

const Checkout = () => {
  const item = (window as any).__checkoutItem as CheckoutItem | undefined;

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
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => goTo(-1 as any)}
            className="text-gray-500 hover:text-white text-sm transition mb-6 flex items-center gap-1"
          >
            ← Back
          </button>
          <h1 className="font-serif text-3xl text-white">Checkout</h1>
        </div>

        {/* Form */}
        <Elements stripe={stripePromise}>
          <CheckoutForm item={item} />
        </Elements>
      </div>
    </div>
  );
};

export default Checkout;
