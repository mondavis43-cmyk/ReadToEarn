import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
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
  amount: number; // in cents
  metadata?: Record<string, string | number>;
};

// ─── Pricing constants (export so other pages can import) ─────────────────────

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
  { label: "10 readers", amount: 2800 },
  { label: "25 readers", amount: 6000 },
  { label: "50 readers", amount: 11000 },
  { label: "100 readers", amount: 20000 },
];

export const SENSITIVITY_READER_PRICES = [
  { label: "10 readers", amount: 5000 },
  { label: "25 readers", amount: 8000 },
  { label: "50 readers", amount: 15000 },
];

export const SUBSCRIPTION_PRICES = [
  { label: "Monthly – $4.99/mo", amount: 499 },
  { label: "Annual – $49.90/yr", amount: 4990 },
];

export const TIME_BOOST_PRICES = [
  { label: "Single Boost (1)", amount: 99 },
  { label: "Starter Pack (6 boosts)", amount: 499 },
  { label: "Marathoner Pack (15 boosts)", amount: 999 },
];

export const COMPETITION_ENTRY_PRICES = [
  { label: "Sprint Entry", amount: 500 },
  { label: "Read-A-Thon Entry", amount: 700 },
  { label: "Elimination Bracket Entry", amount: 1000 },
];

// ─── Redirect map ─────────────────────────────────────────────────────────────

const REDIRECT_MAP: Record<CheckoutItem["type"], string> = {
  listing: "/author-dashboard",
  bounty: "/author-dashboard",
  competition_sponsored: "/author-dashboard",
  quick_task: "/author-dashboard",
  survey: "/author-dashboard",
  beta_reader: "/author-dashboard",
  sensitivity_reader: "/author-dashboard",
  subscription: "/profile",
  time_boost: "/competitions",
  competition_entry: "/competitions",
};

// ─── Checkout Form ────────────────────────────────────────────────────────────

function CheckoutForm({ item }: { item: CheckoutItem }) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("You must be logged in to checkout.");

      // Create PaymentIntent
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

      // Confirm payment
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not found.");

      const { error: stripeError, paymentIntent } =
        await stripe.confirmCardPayment(data.clientSecret, {
          payment_method: { card: cardElement },
        });

      if (stripeError) throw new Error(stripeError.message);

      if (paymentIntent?.status === "succeeded") {
        // Log to Supabase
        await supabase.from("payments").insert({
          user_id: user.id,
          stripe_payment_intent_id: paymentIntent.id,
          amount: item.amount,
          type: item.type,
          label: item.label,
          metadata: item.metadata ?? {},
          status: "succeeded",
        });

        setSuccess(true);
        setTimeout(() => navigate(REDIRECT_MAP[item.type] ?? "/profile"), 2500);
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
        <h2 className="text-2xl font-bold text-green-600 mb-2">Payment Successful!</h2>
        <p className="text-gray-500">Redirecting you now...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Order Summary */}
      <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
          Order Summary
        </p>
        <div className="flex justify-between items-center">
          <span className="text-gray-800 font-medium">{item.label}</span>
          <span className="text-gray-900 font-bold text-xl">
            ${(item.amount / 100).toFixed(2)}
          </span>
        </div>
        {item.metadata && Object.keys(item.metadata).length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
            {Object.entries(item.metadata)
              .filter(([k]) => k !== "user_id")
              .map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm text-gray-500">
                  <span className="capitalize">{k.replace(/_/g, " ")}</span>
                  <span>{v}</span>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Card Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Card Details
        </label>
        <div className="border border-gray-300 rounded-xl p-4 bg-white focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "16px",
                  color: "#1f2937",
                  fontFamily: "inherit",
                  "::placeholder": { color: "#9ca3af" },
                },
                invalid: { color: "#ef4444" },
              },
            }}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-3.5 px-6 rounded-xl transition-colors text-base"
      >
        {loading ? "Processing..." : `Pay $${(item.amount / 100).toFixed(2)}`}
      </button>

      <p className="text-center text-xs text-gray-400">
        Secured by Stripe. We never store your card details.
      </p>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const item = location.state?.checkoutItem as CheckoutItem | undefined;

  if (!item) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No item selected for checkout.</p>
          <button
            onClick={() => navigate(-1)}
            className="text-indigo-600 hover:underline text-sm"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
          <p className="text-gray-500 text-sm mt-1">Complete your purchase below</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <Elements stripe={stripePromise}>
            <CheckoutForm item={item} />
          </Elements>
        </div>

        {/* Back link */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-gray-400 hover:text-gray-600 transition"
          >
            ← Cancel and go back
          </button>
        </div>
      </div>
    </div>
  );
}
