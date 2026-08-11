# Guidely Backend (scaffold)

A real API for the Guidely prototype: auth, AI-generated roadmaps, task
tracking, streaks, AI coaching, notification preferences, and Stripe
premium billing. The frontend UI (`guidely.jsx`) is untouched — this is
purely the server it will eventually call.

**Everything runs today with zero keys.** Roadmap generation and coach
replies fall back to the same rule-based logic the prototype already
uses; billing and push notifications return safe stub responses. As you
add each key in `.env`, that piece switches on automatically — no code
changes required.

## 1. What you need, and where to get it

| Service | Required for | Where to get it |
|---|---|---|
| Postgres database | Everything (accounts, goals, tasks, progress) | Free tier: [Supabase](https://supabase.com) or [Neon](https://neon.tech). Or run Postgres locally. |
| `JWT_SECRET` | Login sessions | Just a random string: `openssl rand -base64 48` |
| Anthropic API key | Real AI-personalized roadmaps + coach replies | [console.anthropic.com](https://console.anthropic.com) → API Keys |
| Stripe keys | Real Premium checkout/subscriptions | [dashboard.stripe.com](https://dashboard.stripe.com) → Developers → API keys, plus create a "Guidely Premium" product with monthly + yearly prices |
| FCM server key | Real push reminders | [Firebase console](https://console.firebase.google.com) → Project settings → Cloud Messaging |

Copy `.env.example` to `.env` and fill in what you have — partial is fine.

## 2. Run it

```bash
npm install
npx prisma migrate dev --name init   # creates all tables from prisma/schema.prisma
npm run dev                           # starts the API on http://localhost:4000
```

`GET /api/health` should return `{ ok: true }` once it's up.

## 3. Data model

`prisma/schema.prisma` defines: `User`, `Goal`, `Task`, `ChatMessage`,
`Streak`, `Subscription`, `PushToken`. Run `npm run prisma:studio` to
browse the data visually once the DB is connected.

## 4. API contract — screen by screen

This is the map for wiring the React frontend once it's ready: each
screen's mock logic gets replaced with a `fetch` to the matching
endpoint below. All routes except `/auth/signup` and `/auth/login`
require `Authorization: Bearer <token>`.

**Get Started / Sign Up screen**
- `POST /api/auth/signup` `{ name, email, password }` → `{ token, user }`
- `POST /api/auth/login` `{ email, password }` → `{ token, user }`
- Store the token (e.g. secure storage / memory) and send it on every request after.

**Onboarding → "Build my roadmap"**
- `POST /api/goals` `{ title, category, experience, timelineWeeks }`
  → generates the roadmap (AI or fallback) and returns `{ goal }` with `goal.tasks` already created.

**Dashboard**
- `GET /api/goals/active` → current goal + tasks, for the goal card and next-task.
- `GET /api/progress` → percent complete, streak, badges — for the progress trail and streak counter.

**Roadmap screen**
- `GET /api/tasks?goalId=...` → full task list.
- `PATCH /api/tasks/:id/toggle` → check/uncheck a task; returns the updated task and updated streak.

**AI Coach screen**
- `GET /api/coach/messages` → chat history.
- `POST /api/coach/message` `{ text }` → stores the user message, generates + stores the coach reply, returns both. Returns `403 { error: "free_limit_reached" }` once a free-plan user hits 5 messages in a day — that's the trigger for the paywall modal.

**Progress screen**
- `GET /api/progress` → percent, per-phase breakdown, badges, streak.

**Profile screen**
- `GET /api/auth/me` → name, email, plan.
- `PATCH /api/notifications/preferences` `{ enabled, time }` → reminder toggle + time.
- `POST /api/notifications/register` `{ token, platform }` → call once you have a real device push token.

**Premium paywall**
- `POST /api/billing/checkout` `{ interval: "monthly" | "yearly" }` → returns a Stripe Checkout URL to redirect to (or a stub URL if Stripe isn't configured yet).
- Stripe calls `POST /api/billing/webhook` on its own after payment — this is what actually flips `user.plan` to `"premium"` in the database. The frontend should re-fetch `/api/auth/me` after returning from checkout to pick up the change.

## 5. What's intentionally stubbed

- **Notifications**: `notificationService.js` logs instead of sending. Wiring a real send is a few lines once you have an FCM key — the trigger logic (a daily scheduled job) still needs to be added; see the comment in that file.
- **Billing**: works fully once Stripe keys + price IDs are set. Webhook signature verification is already implemented.
- **AI**: automatically upgrades from rule-based to real Claude-generated roadmaps/coaching the moment `ANTHROPIC_API_KEY` is set — no code change needed.

## 6. Not included in this scaffold

- Mobile push certificates/setup (APNs), which happens in Xcode/Firebase, not this codebase.
- Rate limiting, email verification, password reset — worth adding before a public launch.
- Deployment config (this runs anywhere Node runs: Railway, Render, Fly.io, a VPS, etc.)
