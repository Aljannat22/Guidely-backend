const prisma = require("../config/db");

function isSameDay(a, b) {
  return a.toDateString() === b.toDateString();
}

function isYesterday(date, reference) {
  const y = new Date(reference);
  y.setDate(y.getDate() - 1);
  return isSameDay(date, y);
}

// Call this whenever a user completes a task. Bumps the streak if this
// is the first completion today; extends it if the last active day was
// yesterday; resets it to 1 if there was a gap.
async function registerActivity(userId) {
  const now = new Date();
  const streak = await prisma.streak.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  if (streak.lastActiveDate && isSameDay(streak.lastActiveDate, now)) {
    return streak; // already counted today
  }

  const continuing = streak.lastActiveDate && isYesterday(streak.lastActiveDate, now);
  const nextCurrent = continuing ? streak.currentStreak + 1 : 1;

  return prisma.streak.update({
    where: { userId },
    data: {
      currentStreak: nextCurrent,
      longestStreak: Math.max(nextCurrent, streak.longestStreak),
      lastActiveDate: now,
    },
  });
}

module.exports = { registerActivity };
