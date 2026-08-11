const Anthropic = require("@anthropic-ai/sdk");

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

/* -----------------------------------------------------------------
   Rule-based fallback (ported from the frontend prototype's mock
   generator) so every endpoint works even with no API key set.
----------------------------------------------------------------- */
const CATEGORY_LIB = {
  fitness: {
    keywords: ["run", "fit", "gym", "weight", "muscle", "marathon", "yoga", "strength", "5k", "exercise"],
    phases: [
      { name: "Foundation", tasks: [
        "Get a starting benchmark (time, weight, or reps)",
        "Book 3 short sessions into your calendar this week",
        "Pick one piece of gear or app to track sessions",
        "Do your first easy session — focus on showing up, not pace",
      ]},
      { name: "Building Momentum", tasks: [
        "Add one extra session to your weekly rhythm",
        "Introduce a mobility or stretching routine",
        "Track how you feel after each session for 1 week",
        "Swap one session for a slightly harder one",
      ]},
      { name: "Leveling Up", tasks: [
        "Set a mid-point target and write it somewhere visible",
        "Add a recovery day with light movement only",
        "Try a session type you haven't done before",
        "Review your log — what's working, what isn't?",
      ]},
      { name: "Push & Prove", tasks: [
        "Do a full trial run of your end goal at ~80% effort",
        "Rest properly for 2 days before the final push",
        "Plan the exact day/time for your goal attempt",
        "Go for it — then write down how it went",
      ]},
    ],
  },
  career: {
    keywords: ["job", "career", "promotion", "interview", "resume", "cv", "business", "startup", "freelance", "linkedin"],
    phases: [
      { name: "Foundation", tasks: [
        "Write down exactly what success looks like in 3 months",
        "Update your resume or LinkedIn headline",
        "List 5 people who could help or advise you",
        "Block 30 focused minutes, 3x this week, for this goal",
      ]},
      { name: "Building Momentum", tasks: [
        "Reach out to 2 people from your list",
        "Identify one skill gap and start closing it",
        "Apply, pitch, or ship one small thing publicly",
        "Ask one person for honest feedback",
      ]},
      { name: "Leveling Up", tasks: [
        "Do a dry run — mock interview, pitch, or demo",
        "Refine your pitch/resume based on feedback so far",
        "Take on one stretch task outside your comfort zone",
        "Check in on your 3-month target — adjust if needed",
      ]},
      { name: "Push & Prove", tasks: [
        "Line up the real opportunity (apply, pitch, submit)",
        "Prepare thoroughly the day before",
        "Show up and give it everything",
        "Debrief: what worked, what to carry forward",
      ]},
    ],
  },
  learning: {
    keywords: ["learn", "language", "code", "coding", "programming", "study", "read", "skill", "instrument", "guitar", "piano", "spanish", "python"],
    phases: [
      { name: "Foundation", tasks: [
        "Pick one resource (course, book, or app) and commit to it",
        "Set a realistic daily/weekly practice window",
        "Learn just enough to complete one tiny exercise",
        "Complete your first practice session",
      ]},
      { name: "Building Momentum", tasks: [
        "Practice 3 more sessions, same time each day if possible",
        "Teach or explain what you learned to someone else",
        "Keep a running list of things that confuse you",
        "Revisit and resolve one confusing item",
      ]},
      { name: "Leveling Up", tasks: [
        "Build or attempt something slightly beyond your level",
        "Get feedback from a community, forum, or mentor",
        "Identify your weakest sub-skill and drill it",
        "Reflect: what's clicked, what still feels hard?",
      ]},
      { name: "Push & Prove", tasks: [
        "Attempt a real-world use of the skill",
        "Polish based on what didn't go smoothly",
        "Show or use your skill in front of someone",
        "Set your next-level target",
      ]},
    ],
  },
  general: {
    keywords: [],
    phases: [
      { name: "Foundation", tasks: [
        "Write down exactly what 'done' looks like for this goal",
        "Break the goal into 3 smaller milestones",
        "Clear one obstacle standing in your way",
        "Take the first small, concrete action",
      ]},
      { name: "Building Momentum", tasks: [
        "Build a simple weekly rhythm around this goal",
        "Tell one person about your goal for accountability",
        "Complete your first milestone",
        "Notice what's slowing you down and adjust",
      ]},
      { name: "Leveling Up", tasks: [
        "Push past the halfway point",
        "Review progress and refine your approach",
        "Take on a harder version of your usual task",
        "Celebrate how far you've already come",
      ]},
      { name: "Push & Prove", tasks: [
        "Set a firm date for your final push",
        "Prepare everything you'll need in advance",
        "Make your final attempt",
        "Reflect and decide what's next",
      ]},
    ],
  },
};

function detectCategory(goalText) {
  const t = (goalText || "").toLowerCase();
  for (const key of ["fitness", "career", "learning"]) {
    if (CATEGORY_LIB[key].keywords.some((k) => t.includes(k))) return key;
  }
  return "general";
}

function fallbackRoadmap(goalText, timelineWeeks) {
  const category = detectCategory(goalText);
  const lib = CATEGORY_LIB[category];
  const weeksPerPhase = Math.max(1, Math.round(timelineWeeks / lib.phases.length));
  let order = 0;
  const tasks = [];
  lib.phases.forEach((phase, pIdx) => {
    phase.tasks.forEach((title, tIdx) => {
      const week = Math.min(pIdx * weeksPerPhase + 1 + Math.floor(tIdx / 2), timelineWeeks);
      tasks.push({ phase: phase.name, phaseIndex: pIdx, week, order: order++, title });
    });
  });
  return { category, tasks };
}

const COACH_LINES = {
  encourage: [
    "Progress isn't always visible day to day — but you're closer than you were yesterday. Keep going.",
    "Small consistent steps beat big sporadic ones. You're doing exactly that.",
    "Every task you check off is proof you follow through. That's the whole game.",
  ],
  stuck: [
    "Stuck usually means the next step is too big. Want to shrink it? Pick one tiny piece of the task and just do that.",
    "Totally normal. Try lowering the bar for today — 5 minutes counts. Momentum matters more than intensity right now.",
  ],
  done: [
    "Nice work — that's another step closer to your goal. What's next on the list?",
    "Marked as done. Your streak is building — don't break the chain now.",
  ],
  general: [
    "I'm here to help you stay on track. Tell me what's on your mind — stuck, unmotivated, or just checking in?",
    "Consistency beats perfection. What's one small win you can get today?",
  ],
};

function fallbackCoachReply(message) {
  const t = message.toLowerCase();
  if (/(stuck|hard|can't|cant|overwhelm|don't know|dont know|confus)/.test(t)) return pick(COACH_LINES.stuck);
  if (/(done|finished|completed|did it)/.test(t)) return pick(COACH_LINES.done);
  if (/(tired|lazy|unmotivat|give up|quit)/.test(t)) return pick(COACH_LINES.encourage);
  return pick(COACH_LINES.general);
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* -----------------------------------------------------------------
   Real AI calls (used automatically once ANTHROPIC_API_KEY is set)
----------------------------------------------------------------- */

async function generateRoadmap({ goalText, category, experience, timelineWeeks }) {
  if (!client) {
    return fallbackRoadmap(goalText, timelineWeeks);
  }

  const prompt = `You are Guidely's roadmap engine. Create a personalized, realistic step-by-step roadmap.

Goal: "${goalText}"
Category: ${category || "unspecified"}
Experience level: ${experience || "unspecified"}
Timeline: ${timelineWeeks} weeks

Return ONLY valid JSON (no markdown, no prose) matching this shape:
{
  "category": "fitness" | "career" | "learning" | "general",
  "tasks": [
    { "phase": "string (phase/milestone name)", "phaseIndex": 0, "week": 1, "order": 0, "title": "string (one concrete, actionable task)" }
  ]
}

Rules:
- Group tasks into 4 phases that make sense for this specific goal (name them yourself, don't just say "Phase 1").
- Spread tasks realistically across the ${timelineWeeks}-week timeline.
- Tune difficulty and pacing to the stated experience level.
- Each task title should be one concrete action, not a vague theme.
- 12-20 tasks total.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  try {
    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return parsed;
  } catch (err) {
    console.error("Failed to parse AI roadmap response, falling back:", err);
    return fallbackRoadmap(goalText, timelineWeeks);
  }
}

async function coachReply({ message, goal, history }) {
  if (!client) {
    return fallbackCoachReply(message);
  }

  const historyText = (history || [])
    .slice(-10)
    .map((m) => `${m.from === "user" ? "User" : "Coach"}: ${m.text}`)
    .join("\n");

  const prompt = `You are Guidely, a warm, direct AI accountability coach inside a goal-tracking app.
The user's current goal: "${goal?.title || "not set"}".

Recent conversation:
${historyText}

User just said: "${message}"

Reply as the coach in 1-3 short sentences. Be encouraging but concrete — give a real next step when relevant, not just cheerleading. Never use asterisks or markdown formatting.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });

  return response.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
}

module.exports = { generateRoadmap, coachReply, detectCategory };
