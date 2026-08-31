/**
 * Mounts every feature router under /api.
 * New features get one line here (subjects, lessons, quizzes... coming next).
 */
import { Router } from "express";

import authRoutes from "./auth.routes.js";
import subjectRoutes from "./subject.routes.js";
import lessonRoutes from "./lesson.routes.js";
import uploadRoutes from "./upload.routes.js";
import userRoutes from "./user.routes.js";
import resultRoutes from "./result.routes.js";
import { query } from "../config/db.js";

const router = Router();

/**
 * GET /api/health
 * Used by Docker's healthcheck and by you, to confirm the API can really
 * reach the database - not just that the process is alive.
 */
router.get("/health", async (req, res) => {
  try {
    await query("SELECT 1");
    res.json({ status: "ok", database: "up" });
  } catch {
    res.status(503).json({ status: "degraded", database: "down" });
  }
});

router.use("/auth", authRoutes);
router.use("/subjects", subjectRoutes);
router.use("/lessons", lessonRoutes);
router.use("/uploads", uploadRoutes);
router.use("/users", userRoutes);
router.use("/results", resultRoutes);

export default router;
