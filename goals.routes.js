const router = require("express").Router();
const prisma = require("../config/db");
const { requireAuth } = require("../middleware/auth");
const { generateRoadmap } = require("../services/aiService");

router.use(requireAuth);

// POST /api/goals  { title, category, experience, timelineWeeks }
// Creates the goal, generates a roadmap via aiService, and persists the tasks.
// This is what the onboarding "Build my roadmap" step calls.
router.post("/", async (req, res, next) => {
  try {
    const { title, category, experience, timelineWeeks } = req.body;
    if (!title || !timelineWeeks) {
      return res.status(400).json({ error: "title and timelineWeeks are required" });
    }

    const { category: resolvedCategory, tasks } = await generateRoadmap({
      goalText: title,
      category,
      experience,
      timelineWeeks,
    });

    const goal = await prisma.goal.create({
      data: {
        userId: req.userId,
        title,
        category: resolvedCategory || category || "general",
        experience: experience || "",
        timelineWeeks,
        tasks: { create: tasks.map((t) => ({ ...t })) },
      },
      include: { tasks: { orderBy: { order: "asc" } } },
    });

    res.status(201).json({ goal });
  } catch (err) {
    next(err);
  }
});

// GET /api/goals/active — the current in-progress goal + its tasks
router.get("/active", async (req, res, next) => {
  try {
    const goal = await prisma.goal.findFirst({
      where: { userId: req.userId, status: "active" },
      orderBy: { createdAt: "desc" },
      include: { tasks: { orderBy: { order: "asc" } } },
    });
    res.json({ goal });
  } catch (err) {
    next(err);
  }
});

// GET /api/goals/:id
router.get("/:id", async (req, res, next) => {
  try {
    const goal = await prisma.goal.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { tasks: { orderBy: { order: "asc" } } },
    });
    if (!goal) return res.status(404).json({ error: "Goal not found" });
    res.json({ goal });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
