import { useState } from "react";
import { supabase } from "../lib/supabase";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const goTo = (path: string) => {
window.history.pushState({}, "", path);
window.dispatchEvent(new PopStateEvent("popstate"));
};

const PACKAGES = [
{ label: "Starter",  readers: 5,  price: 28.00,  cents: 2800  },
{ label: "Standard", readers: 10, price: 60.00,  cents: 6000  },
{ label: "Extended", readers: 20, price: 110.00, cents: 11000 },
{ label: "Pro",      readers: 40, price: 200.00, cents: 20000 },
];

const FEEDBACK_TYPES = [
{ value: "General Read",      desc: "Overall impressions and enjoyment" },
{ value: "Detailed Critique", desc: "In-depth feedback on writing craft" },
{ value: "Would You Buy?",    desc: "Purchase intent and market appeal"  },
];

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

interface FormState {
authorName:   string;
email:        string;
bookTitle:    string;
genre:        string;
feedbackType: string;
excerpt:      string;
blurb:        string;
notes:        string;
}

type Pkg = typeof PACKAGES[0];

const StripePaymentForm = ({ form, pkg }: { form: FormState; pkg: Pkg }) => {
const stripe   = useStripe();
const elements = useElements();
const [loading, setLoading] = useState(false);
const [error,   setError]   = useState<string | null>(null);

const handlePay = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!stripe || !elements) return;
  setLoading(true);
  setError(null);

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("You must be logged in.");

    const { data, error: fnError } = await supabase.functions.invoke("create-payment-intent", {
      body: {
        amount:   pkg.cents,
        currency: "usd",
        metadata: {
          user_id: user.id,
          type:    "beta_reader",
          label:   `Beta Readers — ${pkg.label} (${pkg.readers} readers) — ${form.bookTitle}`,
        },
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
      const { error: payErr } = await supabase.from("payments").insert({
        user_id:                  user.id,
        stripe_payment_intent_id: paymentIntent.id,
        amount:                   pkg.cents,
        type:                     "beta_reader",
        label:                    `Beta Readers — ${pkg.label} (${pkg.readers} readers) — ${form.bookTitle}`,
        metadata:                 { package: pkg.label, readers: pkg.readers },
        status:                   "succeeded",
      });
      if (payErr) console.error("[BetaReaders] payment log error:", payErr);

      const { error: subErr } = await supabase
        .from("author_beta_reader_submissions")
        .insert({
          author_name:   form.authorName.trim(),
          email:         form.email.trim(),
          book_title:    form.bookTitle.trim(),
          genre:         form.genre.trim(),
          feedback_type: form.feedbackType,
          package_label: pkg.label,
          readers:       pkg.readers,
          price:         pkg.price,
          excerpt:       form.excerpt.trim(),
          blurb:         form.blurb.trim(),
          notes:         form.notes.trim() || null,
          status:        "pending",
        });

      if (subErr) {
        console.error("[BetaReaders] submission insert error:", subErr);
        throw new Error("Payment succeeded but submission failed: " + subErr.message);
      }

      console.log("[BetaReaders] submission inserted successfully");
      goTo("/author-dashboard");
    }
  } catch (err: unknown) {
    setError(err instanceof Error ? err.message : "Something went wrong.");
  } finally {
    setLoading(false);
  }
};

return (
  <form onSubmit={handlePay} className="space-y-4">
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
      {loading ? "Processing..." : `Pay $${pkg.price.toFixed(2)}`}
    </button>
    <p className="text-gray-600 text-xs text-center">
      Secured by Stripe. Your card info never touches our servers.
    </p>
  </form>
);
};

const AuthorBetaReaders = () => {
const [form, setForm] = useState<FormState>({
  authorName:   "",
  email:        "",
  bookTitle:    "",
  genre:        "",
  feedbackType: "",
  excerpt:      "",
  blurb:        "",
  notes:        "",
});
const [selectedPkg,  setSelectedPkg]  = useState<Pkg | null>(null);
const [showPayment,  setShowPayment]  = useState(false);

const set = (field: keyof FormState) =>
  (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

const isValid =
  form.authorName.trim() &&
  form.email.trim() &&
  form.bookTitle.trim() &&
  form.genre.trim() &&
  form.feedbackType &&
  form.excerpt.trim() &&
  form.blurb.trim() &&
  selectedPkg;

const inputCls = "w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 text-sm";
const labelCls = "block text-sm font-medium text-gray-300 mb-1";

return (
  <div className="min-h-screen bg-[#0f0f0f]">
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="mb-10">
        <button
          onClick={() => goTo("/author-dashboard")}
          className="text-gray-500 hover:text-white text-sm transition mb-6 flex items-center gap-1"
        >
          ← Back
        </button>
        <h1 className="font-serif text-3xl text-white mb-2">Beta Readers</h1>
        <p className="text-gray-400 text-sm">Get real feedback from readers before you publish.</p>
      </div>

      <div className="space-y-8">
        <section className="bg-[#141414] rounded-xl p-6 border border-gray-800 space-y-4">
          <h2 className="text-white font-semibold text-lg">Book Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Author Name *</label>
              <input className={inputCls} placeholder="Your name" value={form.authorName} onChange={set("authorName")} />
            </div>
            <div>
              <label className={labelCls}>Email *</label>
              <input type="email" className={inputCls} placeholder="you@example.com" value={form.email} onChange={set("email")} />
            </div>
            <div>
              <label className={labelCls}>Book Title *</label>
              <input className={inputCls} placeholder="Title of your book" value={form.bookTitle} onChange={set("bookTitle")} />
            </div>
            <div>
              <label className={labelCls}>Genre *</label>
              <input className={inputCls} placeholder="e.g. Fantasy, Romance, Thriller" value={form.genre} onChange={set("genre")} />
            </div>
          </div>
        </section>

        <section className="bg-[#141414] rounded-xl p-6 border border-gray-800 space-y-4">
          <h2 className="text-white font-semibold text-lg">Feedback Focus *</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {FEEDBACK_TYPES.map((ft) => (
              <button
                key={ft.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, feedbackType: ft.value }))}
                className={`p-4 rounded-lg border text-left transition ${
                  form.feedbackType === ft.value
                    ? "border-white bg-white/10"
                    : "border-gray-700 hover:border-gray-500"
                }`}
              >
                <div className="text-white text-sm font-medium">{ft.value}</div>
                <div className="text-gray-400 text-xs mt-1">{ft.desc}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="bg-[#141414] rounded-xl p-6 border border-gray-800 space-y-4">
          <h2 className="text-white font-semibold text-lg">Select Package *</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PACKAGES.map((pkg) => (
              <button
                key={pkg.label}
                type="button"
                onClick={() => setSelectedPkg(pkg)}
                className={`p-4 rounded-lg border text-center transition ${
                  selectedPkg?.label === pkg.label
                    ? "border-white bg-white/10"
                    : "border-gray-700 hover:border-gray-500"
                }`}
              >
                <div className="text-white font-semibold text-sm">{pkg.label}</div>
                <div className="text-gray-400 text-xs mt-1">{pkg.readers} readers</div>
                <div className="text-white font-bold mt-2">${pkg.price.toFixed(2)}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="bg-[#141414] rounded-xl p-6 border border-gray-800 space-y-4">
          <h2 className="text-white font-semibold text-lg">Your Content</h2>
          <div>
            <label className={labelCls}>Excerpt * <span className="text-gray-500 font-normal">(first chapter or opening pages)</span></label>
            <textarea className={`${inputCls} h-40 resize-none`} placeholder="Paste your excerpt here..." value={form.excerpt} onChange={set("excerpt")} />
          </div>
          <div>
            <label className={labelCls}>Back Cover Blurb *</label>
            <textarea className={`${inputCls} h-24 resize-none`} placeholder="Your book's marketing description..." value={form.blurb} onChange={set("blurb")} />
          </div>
          <div>
            <label className={labelCls}>Additional Notes <span className="text-gray-500 font-normal">(optional)</span></label>
            <textarea className={`${inputCls} h-20 resize-none`} placeholder="Anything specific you'd like readers to focus on..." value={form.notes} onChange={set("notes")} />
          </div>
        </section>

        {!showPayment ? (
          <button
            type="button"
            disabled={!isValid}
            onClick={() => setShowPayment(true)}
            className="w-full bg-white text-black font-medium py-4 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed text-lg"
          >
            {selectedPkg ? `Continue to Payment — $${selectedPkg.price.toFixed(2)}` : "Complete all fields to continue"}
          </button>
        ) : (
          <section className="bg-[#141414] rounded-xl p-6 border border-gray-800 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-white font-semibold text-lg">Payment</h2>
              <button type="button" onClick={() => setShowPayment(false)} className="text-gray-500 hover:text-white text-sm transition">← Edit</button>
            </div>
            <div className="bg-[#1a1a1a] rounded-lg p-4 border border-gray-700 mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Package</span>
                <span className="text-white">{selectedPkg!.label} ({selectedPkg!.readers} readers)</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Book</span>
                <span className="text-white">{form.bookTitle}</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Feedback</span>
                <span className="text-white">{form.feedbackType}</span>
              </div>
              <div className="border-t border-gray-700 mt-3 pt-3 flex justify-between">
                <span className="text-white font-medium">Total</span>
                <span className="text-white font-bold">${selectedPkg!.price.toFixed(2)}</span>
              </div>
            </div>
            <Elements stripe={stripePromise}>
              <StripePaymentForm form={form} pkg={selectedPkg!} />
            </Elements>
          </section>
        )}
      </div>
    </div>
  </div>
);
};

export { AuthorBetaReaders };
export default AuthorBetaReaders;
