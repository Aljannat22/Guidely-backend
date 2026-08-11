const router = require("express").Router();
const prisma = require("../config/db");
const { requireAuth } = require("../middleware/auth");

router.use(requireAuth);

// GET /api/progress — powers the Dashboard and Progress screens
router.get("/", async (req, res, next) => {
  try {
    const goal = await prisma.goal.findFirst({
      where: { userId: req.userId, status: "active" },
      orderBy: { createdAt: "desc" },
      include: { tasks: { orderBy: { order: "asc" } } },
    });
    const streak = await prisma.streak.findUnique({ where: { userId: req.userId } });

    if (!goal) {
      return res.json({ goal: null, percent: 0, doneCount: 0, total: 0, byPhase: {}, badges: [], streak: streak?.currentStreak || 0 });
    }

    const total = goal.tasks.length;
    const doneCount = goal.tasks.filter((t) => t.done).length;
    const percent = total ? Math.round((doneCount / total) * 100) : 0;

    const byPhase = {};
    for (const t of goal.tasks) {
      byPhase[t.phase] = byPhase[t.phase] || { done: 0, total: 0 };
      byPhase[t.phase].total += 1;
      if (t.done) byPhase[t.phase].done += 1;
    }

    const currentStreak = streak?.currentStreak || 0;
    const badges = [
      { label: "First step", earned: doneCount >= 1 },
      { label: "5 tasks done", earned: doneCount >= 5 },
      { label: "3-day streak", earned: currentStreak >= 3 },
      { label: "Goal complete", earned: total > 0 && doneCount === total },
    ];

    res.json({
      goal: { id: goal.id, title: goal.title, category: goal.category },
      percent,
      doneCount,
      total,
      byPhase,
      badges,
      streak: currentStreak,
      longestStreak: streak?.longestStreak || 0,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
