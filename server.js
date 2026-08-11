require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const goalRoutes = require("./routes/goals.routes");
const taskRoutes = require("./routes/tasks.routes");
const progressRoutes = require("./routes/progress.routes");
const coachRoutes = require("./routes/coach.routes");
const notificationRoutes = require("./routes/notifications.routes");
const billingRoutes = require("./routes/billing.routes");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));

// Stripe webhooks need the raw body — mount that route BEFORE express.json()
app.use("/api/billing/webhook", express.raw({ type: "application/json" }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true, service: "guidely-backend" }));

app.use("/api/auth", authRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/coach", coachRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/billing", billingRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Guidely backend running on http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("ANTHROPIC_API_KEY not set — roadmap generation and coach replies will use the rule-based fallback.");
  }
});
