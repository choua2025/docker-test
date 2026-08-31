/**
 * Routes under /api/subjects
 *
 * Reading is open to any signed-in user; only an admin may change the list,
 * because subjects are the shared backbone every teacher files lessons under.
 */
import { Router } from "express";

import * as subjectController from "../controllers/subject.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

const router = Router();

router.use(requireAuth);

router.get("/", subjectController.list);
router.get("/:id", subjectController.getOne);

router.post(
  "/",
  requireRole("admin"),
  validateBody(subjectController.createSubjectSchema),
  subjectController.create,
);

router.put(
  "/:id",
  requireRole("admin"),
  validateBody(subjectController.updateSubjectSchema),
  subjectController.update,
);

router.delete("/:id", requireRole("admin"), subjectController.remove);

export default router;
