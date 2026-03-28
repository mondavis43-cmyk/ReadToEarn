import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { email, bundle, bookData } = await req.json();

    // Save pending submission to Supabase
    const { data: submission } = await supabase
      .from('author_submissions')
      .insert({
        email,
        title: bookData.title,
        author: bookData.author,
        page_count: bookData.pageCount,
        description: bookData.description,
        cover_url: bookData.coverUrl,
        affiliate_link: bookData.affiliateLink,
        genres: bookData.genres,
        tropes: bookData.tropes,
        questions: bookData.questions,
        bundle_size: bundle.books,
        amount_paid: bundle.total,
        status: 'pending_payment',
      })
      .select()
      .single();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: bundle.books === 1
                ? `Read to Earn - Book Listing: ${bookData.title}`
                : `Read to Earn - ${bundle.books}-Book Bundle (${bundle.books} listing slots)`,
              description: `$${bundle.perBook.toFixed(2)}/book · ${bundle.books} slot${bundle.books > 1 ? 's' : ''}`,
            },
            unit_amount: Math.round(bundle.total * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        submission_id: submission.id,
        email,
        bundle_size: bundle.books.toString(),
      },
      success_url: `${req.headers.get('origin')}/author-submit?success=true&email=${encodeURIComponent(email)}`,
      cancel_url: `${req.headers.get('origin')}/author-submit?cancelled=true`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});
