import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface CheckoutItem {
  amount: number;
  type: string;
  label: string;
  metadata?: Record<string, unknown>;
}

function StripeForm({ item }: { item: CheckoutItem }) {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !user) return;

    setIsLoading(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });

      if (error) {
        toast.error(error.message ?? "Payment failed");
        return;
      }

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

        if (paymentLogError) {
          console.error("Failed to log payment:", paymentLogError);
        }

        toast.success("Payment successful!");
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Payment error:", err);
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button type="submit" disabled={!stripe || isLoading} className="w-full">
        {isLoading ? "Processing..." : `Pay $${(item.amount / 100).toFixed(2)}`}
      </Button>
    </form>
  );
}

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [item, setItem] = useState<CheckoutItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const state = location.state as CheckoutItem | null;
    if (!state) {
      navigate("/dashboard");
      return;
    }

    setItem(state);

    const createPaymentIntent = async () => {
      try {
        const { data, error } = await supabase.functions.invoke(
          "create-payment-intent",
          {
            body: {
              amount: state.amount,
              type: state.type,
              label: state.label,
              metadata: state.metadata ?? {},
            },
          }
        );

        if (error) throw error;
        setClientSecret(data.clientSecret);
      } catch (err) {
        console.error("Failed to create payment intent:", err);
        toast.error("Failed to initialize payment");
        navigate("/dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    createPaymentIntent();
  }, [user, location.state, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (!clientSecret || !item) return null;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Checkout</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <p className="text-sm text-gray-600">{item.label}</p>
            <p className="text-2xl font-bold">
              ${(item.amount / 100).toFixed(2)}
            </p>
          </div>
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <StripeForm item={item} />
          </Elements>
        </CardContent>
      </Card>
    </div>
  );
}
