/**
 * Routes under /api/users - all admin-only.
 *
 * Teachers deliberately get nothing here: seeing every account in the school,
 * including other teachers and admins, is not part of teaching.
 */
import { Router } from "express";

import * as userController from "../controllers/user.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";

const router = Router();

router.use(requireAuth, requireRole("admin"));

router.get("/", validateQuery(userController.listUsersQuerySchema), userController.list);
router.get("/:id", userController.getOne);
router.patch("/:id/role", validateBody(userController.updateRoleSchema), userController.updateRole);
router.delete("/:id", userController.remove);

export default router;
