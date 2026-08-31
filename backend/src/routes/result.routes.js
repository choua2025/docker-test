/**
 * Routes under /api/results
 */
import { Router } from "express";

import * as resultController from "../controllers/result.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Any signed-in person may read their own scores - a teacher who takes a
// quiz sees theirs too. The route never accepts a user id.
router.get("/me", requireAuth, resultController.myResults);

export default router;
