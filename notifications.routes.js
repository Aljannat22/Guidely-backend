const router = require("express").Router();
const prisma = require("../config/db");
const { requireAuth } = require("../middleware/auth");

router.use(requireAuth);

// POST /api/notifications/register  { token, platform }
// Call this once the frontend has a real device push token (web push,
// FCM, or APNs token) so reminders have somewhere to be sent.
router.post("/register", async (req, res, next) => {
  try {
    const { token, platform } = req.body;
    if (!token || !platform) return res.status(400).json({ error: "token and platform are required" });

    const saved = await prisma.pushToken.upsert({
      where: { userId_token: { userId: req.userId, token } },
      update: { platform },
      create: { userId: req.userId, token, platform },
    });
    res.status(201).json({ pushToken: saved });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/preferences  { enabled, time }
// Powers the Profile screen's reminder toggle + time.
router.patch("/preferences", async (req, res, next) => {
  try {
    const { enabled, time } = req.body;
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...(typeof enabled === "boolean" ? { notifEnabled: enabled } : {}),
        ...(time ? { notifTime: time } : {}),
      },
    });
    res.json({ notifEnabled: user.notifEnabled, notifTime: user.notifTime });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
