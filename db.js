const { PrismaClient } = require("@prisma/client");

// Reuse a single Prisma instance across the app (avoids exhausting DB
// connections in dev when files hot-reload).
const prisma = global.__guidelyPrisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") global.__guidelyPrisma = prisma;

module.exports = prisma;
