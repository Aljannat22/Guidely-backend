const router = require("express").Router();
const prisma = require("../config/db");
const { requireAuth } = require("../middleware/auth");
const { coachReply } = require("../services/aiService");

router.use(requireAuth);

const FREE_DAILY_MESSAGE_LIMIT = 5;

// GET /api/coach/messages
router.get("/messages", async (req, res, next) => {
  try {
    const messages = await prisma.chatMessage.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "asc" },
    });
    res.json({ messages });
  } catch (err) {
    next(err);
  }
});

// POST /api/coach/message  { text }
router.post("/message", async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: "text is required" });

    const user = await prisma.user.findUnique({ where: { id: req.userId } });

    if (user.plan === "free") {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const todaysUserMessages = await prisma.chatMessage.count({
        where: { userId: req.userId, from: "user", createdAt: { gte: startOfDay } },
      });
      if (todaysUserMessages >= FREE_DAILY_MESSAGE_LIMIT) {
        return res.status(403).json({
          error: "free_limit_reached",
          message: "You've hit today's free coaching limit. Upgrade for unlimited coaching.",
        });
      }
    }

    const goal = await prisma.goal.findFirst({ where: { userId: req.userId, status: "active" } });
    const history = await prisma.chatMessage.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const userMessage = await prisma.chatMessage.create({
      data: { userId: req.userId, from: "user", text },
    });

    const replyText = await coachReply({ message: text, goal, history: history.reverse() });

    const coachMessage = await prisma.chatMessage.create({
      data: { userId: req.userId, from: "coach", text: replyText },
    });

    res.status(201).json({ userMessage, coachMessage });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
