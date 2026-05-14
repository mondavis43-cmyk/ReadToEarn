import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const REDIRECT_MAP: Record<string, string> = {
  beta_reader: "/author-dashboard",
  sensitivity_reader: "/author-dashboard",
  sensitivity_readers: "/author-dashboard",
  editing: "/author-dashboard",
  cover_design: "/author-dashboard",
  formatting: "/author-dashboard",
  proofreading: "/author-dashboard",
  default: "/",
};

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { cart, clearCart } = useCart();
  const [loading, setLoading] = useState(false);

  const sessionId = searchParams.get("session_id");
  const status = searchParams.get("status");

  useEffect(() => {
    if (status === "success" && sessionId) {
      handlePostPayment();
    }
  }, [status, sessionId]);

  const handlePostPayment = async () => {
    setLoading(true);
    try {
      const pendingRaw = localStorage.getItem("pendingBooking");
      const pending = pendingRaw ? JSON.parse(pendingRaw) : null;

      if (!pending || !pending.table || !pending.data) {
        console.warn("[Checkout] No valid pendingBooking found in localStorage");
        toast({ title: "Payment successful!", description: "Your booking has been received." });
        clearCart();
        navigate("/author-dashboard");
        return;
      }

      for (const item of cart) {
        if (item.type === "book") {
          const { error } = await supabase.from("purchases").insert({
            book_id: item.id,
            amount: item.price,
            stripe_session_id: sessionId,
          });
          if (error) {
            console.error("[Checkout] purchase insert error:", error);
          }
        } else if (
          item.type === "beta_reader" ||
          item.type === "sensitivity_reader" ||
          item.type === "sensitivity_readers"
        ) {
          console.log('[Checkout] Inserting beta/sensitivity reader:', { table: pending?.table, data: pending?.data });
          const insertData = { ...pending.data };
          // Ensure status is a valid DB value
          if (!insertData.status || insertData.status === 'pending') {
            insertData.status = 'pending_payment';
          }
          const { error } = await supabase.from(pending.table).insert(insertData);
          if (error) {
            console.error('[Checkout] beta/sensitivity insert error:', error);
          } else {
            console.log('[Checkout] beta/sensitivity inserted successfully');
          }
        } else {
          console.log("[Checkout] Inserting service booking:", { table: pending?.table, data: pending?.data });
          const { error } = await supabase.from(pending.table).insert({
            ...pending.data,
            status: "active",
          });
          if (error) {
            console.error("[Checkout] service insert error:", error);
          } else {
            console.log("[Checkout] service inserted successfully");
          }
        }
      }

      localStorage.removeItem("pendingBooking");
      clearCart();
      toast({ title: "Payment successful!", description: "Your booking has been confirmed." });

      const firstItem = cart[0];
      const redirectPath = firstItem
        ? REDIRECT_MAP[firstItem.type] ?? REDIRECT_MAP.default
        : REDIRECT_MAP.default;
      navigate(redirectPath);
    } catch (err) {
      console.error("[Checkout] Unexpected error during post-payment:", err);
      toast({ title: "Something went wrong", description: "Please contact support.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (status === "cancel") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-bold">Payment Cancelled</h1>
        <p className="text-muted-foreground">Your payment was cancelled. No charges were made.</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-2xl font-bold">Processing Payment...</h1>
      {loading && <p className="text-muted-foreground">Please wait while we confirm your booking.</p>}
    </div>
  );
}
