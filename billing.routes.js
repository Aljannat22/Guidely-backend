const router = require("express").Router();
const prisma = require("../config/db");
const { requireAuth } = require("../middleware/auth");
const { createCheckoutSession, verifyWebhookSignature, stripeEnabled } = require("../services/billingService");

// POST /api/billing/checkout  { interval: "monthly" | "yearly" }
// Called from the Premium paywall's "Upgrade" button.
router.post("/checkout", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const { interval } = req.body;
    const session = await createCheckoutSession({ user, interval });
    res.json(session);
  } catch (err) {
    next(err);
  }
});

// POST /api/billing/webhook — Stripe calls this directly, not the app.
// Mounted with express.raw() in server.js (required for signature checks).
router.post("/webhook", async (req, res) => {
  if (!stripeEnabled) {
    return res.status(200).json({ received: true, stub: true });
  }

  let event;
  try {
    event = verifyWebhookSignature(req.body, req.headers["stripe-signature"]);
  } catch (err) {
    return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        if (userId) {
          await prisma.user.update({ where: { id: userId }, data: { plan: "premium" } });
          await prisma.subscription.update({
            where: { userId },
            data: {
              status: "active",
              plan: "premium",
              stripeCustomerId: session.customer,
              stripeSubscriptionId: session.subscription,
            },
          });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const existing = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: sub.id } });
        if (existing) {
          await prisma.user.update({ where: { id: existing.userId }, data: { plan: "free" } });
          await prisma.subscription.update({ where: { userId: existing.userId }, data: { status: "canceled", plan: "free" } });
        }
        break;
      }
      default:
        break; // ignore other event types
    }
    res.json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    res.status(500).json({ error: "Webhook handler failed" });
  }
});

module.exports = router;
