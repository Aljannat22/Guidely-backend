/**
 * Billing service — Stripe integration for Premium.
 *
 * Without STRIPE_SECRET_KEY set, createCheckoutSession returns a stub
 * URL so the "Upgrade" button flow can be wired and tested before you
 * have real Stripe keys.
 *
 * To go live:
 * 1. Create a Stripe account → Products → add "Guidely Premium" with a
 *    monthly and a yearly Price → copy both price IDs into .env.
 * 2. Copy the secret key into STRIPE_SECRET_KEY.
 * 3. Add a webhook endpoint in the Stripe dashboard pointing at
 *    POST /api/billing/webhook, and copy the signing secret into
 *    STRIPE_WEBHOOK_SECRET.
 */

const stripe = process.env.STRIPE_SECRET_KEY
  ? require("stripe")(process.env.STRIPE_SECRET_KEY)
  : null;

async function createCheckoutSession({ user, interval }) {
  if (!stripe) {
    return { stub: true, url: "https://example.com/stub-checkout?upgrade=premium" };
  }

  const priceId = interval === "yearly"
    ? process.env.STRIPE_PRICE_ID_YEARLY
    : process.env.STRIPE_PRICE_ID_MONTHLY;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.CORS_ORIGIN}/premium/success`,
    cancel_url: `${process.env.CORS_ORIGIN}/premium/cancel`,
    metadata: { userId: user.id },
  });

  return { url: session.url };
}

function verifyWebhookSignature(rawBody, signature) {
  if (!stripe) throw new Error("Stripe is not configured");
  return stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
}

module.exports = { createCheckoutSession, verifyWebhookSignature, stripeEnabled: !!stripe };
