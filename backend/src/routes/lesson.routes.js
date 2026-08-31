/**
 * Routes under /api/lessons
 *
 * Students read; teachers and admins write. Ownership (a teacher may only
 * touch their own lessons) is enforced inside the service.
 */
import { Router } from "express";

import * as lessonController from "../controllers/lesson.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  validateQuery(lessonController.listLessonsQuerySchema),
  lessonController.list,
);
router.get("/:id", lessonController.getOne);

router.post(
  "/",
  requireRole("teacher", "admin"),
  validateBody(lessonController.createLessonSchema),
  lessonController.create,
);

router.put(
  "/:id",
  requireRole("teacher", "admin"),
  validateBody(lessonController.updateLessonSchema),
  lessonController.update,
);

router.delete("/:id", requireRole("teacher", "admin"), lessonController.remove);

export default router;
