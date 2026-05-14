import React, { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { supabase } from "../lib/supabaseClient";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const PACKAGES = [
  { label: "Starter", readers: 5, price: 29 },
  { label: "Standard", readers: 15, price: 69 },
  { label: "Premium", readers: 30, price: 119 },
];

const GENRES = [
  "Fantasy","Science Fiction","Romance","Mystery","Thriller",
  "Horror","Literary Fiction","Historical Fiction","Young Adult",
  "Children's","Non-Fiction","Self-Help","Other",
];

const FEEDBACK_TYPES = [
  "General Impressions",
  "Plot & Pacing",
  "Character Development",
  "World Building",
  "Dialogue",
  "All of the Above",
];

interface FormState {
  authorName: string;
  email: string;
  bookTitle: string;
  genre: string;
  feedbackType: string;
  excerpt: string;
  blurb: string;
  notes: string;
}

function StripePaymentForm({
  pkg,
  form,
  questions,
  onSuccess,
}: {
  pkg: (typeof PACKAGES)[0];
  form: FormState;
  questions: string[];
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);
    setError(null);

    try {
      // 1. Create PaymentIntent
      const res = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: pkg.price * 100, currency: "usd" }),
      });
      const { clientSecret, error: piError } = await res.json();
      if (piError) throw new Error(piError);

      // 2. Confirm card payment
      const { error: stripeError } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: elements.getElement(CardElement)!,
            billing_details: { name: form.authorName, email: form.email },
          },
        }
      );
      if (stripeError) throw new Error(stripeError.message);

      // 3. Save submission
      const filledQuestions = questions
        .filter((q) => q.trim() !== "")
        .map((q, i) => ({ id: String(i + 1), question: q.trim(), required: false }));

      const { error: subErr } = await supabase
        .from("author_beta_reader_submissions")
        .insert({
          author_name:      form.authorName.trim(),
          email:            form.email.trim(),
          book_title:       form.bookTitle.trim(),
          genre:            form.genre.trim(),
          feedback_type:    form.feedbackType,
          package_label:    pkg.label,
          readers:          pkg.readers,
          price:            pkg.price,
          excerpt:          form.excerpt.trim(),
          blurb:            form.blurb.trim(),
          notes:            form.notes.trim() || null,
          custom_questions: filledQuestions.length > 0 ? JSON.stringify(filledQuestions) : null,
          status:           "pending",
        });

      if (subErr) throw new Error(subErr.message);

      onSuccess();
    } catch (err: any) {
      setError(err.message ?? "Payment failed");
    } finally {
      setPaying(false);
    }
  };

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <div className="border rounded p-3">
        <CardElement options={{ hidePostalCode: true }} />
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={paying}
        className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
      >
        {paying ? "Processing…" : `Pay $${pkg.price}`}
      </button>
    </form>
  );
}

export default function AuthorBetaReaders() {
  const [step, setStep] = useState<"form" | "payment" | "done">("form");
  const [selectedPkg, setSelectedPkg] = useState<(typeof PACKAGES)[0] | null>(null);
  const [form, setForm] = useState<FormState>({
    authorName: "",
    email: "",
    bookTitle: "",
    genre: "",
    feedbackType: "",
    excerpt: "",
    blurb: "",
    notes: "",
  });
  const [questions, setQuestions] = useState<string[]>(["", "", ""]);

  const updateForm = (field: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const updateQuestion = (i: number, value: string) =>
    setQuestions((prev) => prev.map((q, idx) => (idx === i ? value : q)));

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg) return;
    setStep("payment");
  };

  if (step === "done") {
    return (
      <div className="max-w-xl mx-auto py-20 text-center">
        <h2 className="text-3xl font-bold text-indigo-700 mb-4">🎉 Submission Received!</h2>
        <p className="text-gray-600">
          Thank you! We'll match your book with beta readers and be in touch shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold text-indigo-700 mb-2">Find Beta Readers</h1>
      <p className="text-gray-600 mb-8">
        Submit your manuscript excerpt and get targeted feedback from real readers.
      </p>

      {/* Package Selection */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {PACKAGES.map((p) => (
          <button
            key={p.label}
            onClick={() => setSelectedPkg(p)}
            className={`border-2 rounded-lg p-4 text-center transition ${
              selectedPkg?.label === p.label
                ? "border-indigo-600 bg-indigo-50"
                : "border-gray-200 hover:border-indigo-300"
            }`}
          >
            <div className="font-bold text-lg">{p.label}</div>
            <div className="text-gray-500 text-sm">{p.readers} readers</div>
            <div className="text-indigo-700 font-semibold mt-1">${p.price}</div>
          </button>
        ))}
      </div>

      {step === "form" && (
        <form onSubmit={handleFormSubmit} className="space-y-5">
          {/* Author Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Author Name *</label>
              <input
                required
                value={form.authorName}
                onChange={(e) => updateForm("authorName", e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => updateForm("email", e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Book Title *</label>
            <input
              required
              value={form.bookTitle}
              onChange={(e) => updateForm("bookTitle", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Genre *</label>
              <select
                required
                value={form.genre}
                onChange={(e) => updateForm("genre", e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              >
                <option value="">Select genre…</option>
                {GENRES.map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Feedback Type *</label>
              <select
                required
                value={form.feedbackType}
                onChange={(e) => updateForm("feedbackType", e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              >
                <option value="">Select type…</option>
                {FEEDBACK_TYPES.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Book Blurb / Synopsis *
            </label>
            <textarea
              required
              rows={3}
              value={form.blurb}
              onChange={(e) => updateForm("blurb", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="A short description of your book…"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Excerpt (up to 5,000 words) *
            </label>
            <textarea
              required
              rows={8}
              value={form.excerpt}
              onChange={(e) => updateForm("excerpt", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm font-mono"
              placeholder="Paste your excerpt here…"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Custom Questions for Readers (optional)
            </label>
            {questions.map((q, i) => (
              <input
                key={i}
                value={q}
                onChange={(e) => updateQuestion(i, e.target.value)}
                placeholder={`Question ${i + 1}`}
                className="w-full border rounded px-3 py-2 text-sm mb-2"
              />
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Notes (optional)
            </label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => updateForm("notes", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={!selectedPkg}
            className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            Continue to Payment
          </button>
        </form>
      )}

      {step === "payment" && selectedPkg && (
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Complete Payment — {selectedPkg.label} Package (${selectedPkg.price})
          </h2>
          <Elements stripe={stripePromise}>
            <StripePaymentForm
              pkg={selectedPkg}
              form={form}
              questions={questions}
              onSuccess={() => setStep("done")}
            />
          </Elements>
          <button
            onClick={() => setStep("form")}
            className="mt-4 text-sm text-gray-500 underline"
          >
            ← Back to form
          </button>
        </div>
      )}
    </div>
  );
}
