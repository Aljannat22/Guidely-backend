const router = require("express").Router();
const prisma = require("../config/db");
const { requireAuth } = require("../middleware/auth");
const { registerActivity } = require("../utils/streak");

router.use(requireAuth);

// GET /api/tasks?goalId=...
router.get("/", async (req, res, next) => {
  try {
    const { goalId } = req.query;
    if (!goalId) return res.status(400).json({ error: "goalId query param is required" });

    // Ownership check via the goal relation.
    const goal = await prisma.goal.findFirst({ where: { id: goalId, userId: req.userId } });
    if (!goal) return res.status(404).json({ error: "Goal not found" });

    const tasks = await prisma.task.findMany({ where: { goalId }, orderBy: { order: "asc" } });
    res.json({ tasks });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tasks/:id/toggle
// Flips done/undone. When marking done, bumps the user's streak and,
// if this was the goal's last remaining task, marks the goal completed.
router.patch("/:id/toggle", async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: { goal: true },
    });
    if (!task || task.goal.userId !== req.userId) {
      return res.status(404).json({ error: "Task not found" });
    }

    const nowDone = !task.done;
    const updated = await prisma.task.update({
      where: { id: task.id },
      data: { done: nowDone, completedAt: nowDone ? new Date() : null },
    });

    let streak = null;
    if (nowDone) {
      streak = await registerActivity(req.userId);

      const remaining = await prisma.task.count({ where: { goalId: task.goalId, done: false } });
      if (remaining === 0) {
        await prisma.goal.update({ where: { id: task.goalId }, data: { status: "completed" } });
      }
    }

    res.json({ task: updated, streak });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
