import { useState } from "react";
import { supabase } from '../lib/supabase';
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { generateIdempotencyKey } from '../lib/security';

async function sendEmail(to: string, subject: string, html: string) {
  await supabase.functions.invoke('send-email', { body: { to, subject, html } });
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

function isValidCheckoutItem(obj: unknown): obj is CheckoutItem {
  if (!obj || typeof obj !== 'object') return false;
  const item = obj as Record<string, unknown>;
  const validTypes = [
    'listing', 'bounty', 'competition_sponsored', 'quick_task', 'survey',
    'beta_reader', 'sensitivity_reader', 'subscription', 'time_boost',
    'competition_entry', 'tournament_entry', 'sprint_entry', 'readathon_entry',
    'sponsored_pin'
  ];
  return (
    typeof item.type === 'string' && validTypes.includes(item.type) &&
    typeof item.label === 'string' &&
    typeof item.amount === 'number'
  );
}

function isValidPendingSubmission(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const pending = obj as Record<string, unknown>;
  return typeof pending.table === 'string' && pending.table.length > 0;
}

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
  | "readathon_entry"
  | "sponsored_pin";
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

const CARD_STYLE = {
  style: {
    base: {
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontSize: '16px',
      '::placeholder': { color: '#6b7280' },
    },
    invalid: { color: '#ef4444' },
  },
  disableLink: true,
};

// ─── Stripe Card Form ────────────────────────────────────────────────────────
const StripeCardForm = ({ item }: { item: CheckoutItem }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("You must be logged in to checkout.");

      const email = user.email;
      if (!email) throw new Error("No email found on your account.");

      // ── Subscription flow ──────────────────────────────────────────────────
      if (item.type === 'subscription') {
        const cardElement = elements.getElement(CardElement);
        if (!cardElement) throw new Error("Card element not found.");

        // Create a payment method first
        const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
          type: 'card',
          card: cardElement,
          billing_details: { email },
        });
        if (pmError) throw new Error(pmError.message);

        // Call create-subscription edge function
        const { data: subData, error: subError } = await supabase.functions.invoke(
          'create-subscription',
          {
            body: {
              email,
              user_id: user.id,
              payment_method_id: paymentMethod!.id,
              billing: item.metadata?.plan ?? 'monthly',
            },
          }
        );

        if (subError || !subData) throw new Error(subError?.message || "Failed to create subscription.");

        // Handle 3D Secure / additional auth if needed
        if (subData.status === 'incomplete' && subData.client_secret) {
          const { error: confirmError } = await stripe.confirmCardPayment(subData.client_secret);
          if (confirmError) throw new Error(confirmError.message);
        }

        // Log payment
        await supabase.from("payments").insert({
          user_id: user.id,
          stripe_payment_intent_id: subData.subscription_id || 'sub_pending',
          amount: item.amount,
          payment_type: item.type,
          label: item.label,
          metadata: { email, ...item.metadata },
          status: "succeeded",
        });

        setLoading(false);
        window.history.pushState({}, '', '/checkout-success');
        window.dispatchEvent(new PopStateEvent('popstate'));
        return;
      }

      // ── One-time payment flow (all other types) ────────────────────────────
      const { data, error: fnError } = await supabase.functions.invoke(
        "create-payment-intent",
        {
          body: {
            amount: item.amount,
            currency: "usd",
            metadata: {
              user_id: user.id,
              email,
              type: item.type,
              ...item.metadata,
            },
          },
        }
      );

      if (fnError || !data?.clientSecret) throw new Error(fnError?.message || "Failed to initialize payment.");

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not found.");

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        data.clientSecret,
        { payment_method: { card: cardElement, billing_details: { email } } }
      );

      if (stripeError) throw new Error(stripeError.message);

      if (paymentIntent?.status === "succeeded") {
        const { error: payErr } = await supabase.from("payments").insert({
          user_id: user.id,
          stripe_payment_intent_id: paymentIntent.id,
          amount: item.amount,
          payment_type: item.type,
          label: item.label,
          metadata: { email, ...item.metadata },
          status: "succeeded",
        });
        if (payErr) console.error("[Checkout] payment log error:", payErr);

        setLoading(false);
        window.history.pushState({}, '', '/checkout-success');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handlePay} className="space-y-3">
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

// ─── PayPal Button ────────────────────────────────────────────────────────────
const PayPalButton = ({ item }: { item: CheckoutItem }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayPal = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("You must be logged in to checkout.");

      const idempotencyKey = generateIdempotencyKey('paypal', {
        user_id: user.id,
        amount: item.amount,
        type: item.type,
        timestamp: Math.floor(Date.now() / 1000),
      });

      const existingOrderKey = `paypal_order_${idempotencyKey}`;
      const cachedOrderId = sessionStorage.getItem(existingOrderKey);

      if (cachedOrderId) {
        const approvalUrl = `https://www.paypal.com/checkoutnow?token=${cachedOrderId}`;
        window.location.href = approvalUrl;
        return;
      }

      const { data: order, error: fnError } = await supabase.functions.invoke(
        "create-paypal-order",
        {
          headers: { 'Idempotency-Key': idempotencyKey },
          body: {
            amount: item.amount,
            description: item.label,
            metadata: { user_id: user.id, email: user.email, type: item.type, ...item.metadata },
          },
        }
      );

      if (fnError || !order) throw new Error(fnError?.message || "Failed to create PayPal order.");

      const approvalUrl = order.links?.find((l: any) => l.rel === "approve")?.href;
      if (!approvalUrl) throw new Error("No PayPal approval URL returned.");

      sessionStorage.setItem(existingOrderKey, order.id);
      sessionStorage.setItem(`${existingOrderKey}_expires`, String(Date.now() + 30 * 60 * 1000));
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
    </div>
  );
};

// ─── Main Checkout Component ──────────────────────────────────────────────────
export const Checkout = () => {
  const rawItem = typeof window !== 'undefined' ? JSON.parse(sessionStorage.getItem('checkoutItem') ?? 'null') : null;
  const item = isValidCheckoutItem(rawItem) ? rawItem : null;

  if (!item) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Checkout</h1>
          <p className="text-gray-400">No item to checkout.</p>
        </div>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <div className="min-h-screen bg-[#0f0f0f]">
        <header className="border-b border-gray-800">
          <div className="max-w-md mx-auto px-4 py-6">
            <h1 className="font-serif text-3xl text-white">Checkout</h1>
          </div>
        </header>

        <main className="max-w-md mx-auto px-4 py-12">
          <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800 mb-8">
            <p className="text-gray-400 text-sm mb-2">{item.label}</p>
            <p className="text-4xl font-semibold text-white">${(item.amount / 100).toFixed(2)}</p>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Pay with Card</h2>
              <StripeCardForm item={item} />
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[#0f0f0f] text-gray-400">or</span>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Pay with PayPal</h2>
              <PayPalButton item={item} />
            </div>
          </div>
        </main>
      </div>
    </Elements>
  );
};
