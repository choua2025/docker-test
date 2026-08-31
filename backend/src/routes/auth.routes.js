/**
 * Routes under /api/auth
 *
 *   GET  /api/auth/config           public  - does registration need a teacher code?
 *   POST /api/auth/register         public  - create a teacher or student account
 *   POST /api/auth/login            public  - exchange email+password for a JWT
 *   GET  /api/auth/me               logged in - the current user
 *   POST /api/auth/change-password  logged in
 */
import { Router } from "express";
import rateLimit from "express-rate-limit";

import * as authController from "../controllers/auth.controller.js";
import { validateBody } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Slows down password guessing from a single IP without blocking a whole
// classroom that shares one school connection from working normally.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: {
      code: "too_many_requests",
      message: "ພະຍາຍາມຫຼາຍເກີນໄປ ກະລຸນາລໍຖ້າ 15 ນາທີ ແລ້ວລອງໃໝ່",
    },
  },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: {
      code: "too_many_requests",
      message: "ສະໝັກຫຼາຍເກີນໄປ ກະລຸນາລອງໃໝ່ພາຍຫຼັງ",
    },
  },
});

router.get("/config", authController.config);

router.post(
  "/register",
  registerLimiter,
  validateBody(authController.registerSchema),
  authController.register,
);

router.post(
  "/login",
  loginLimiter,
  validateBody(authController.loginSchema),
  authController.login,
);

router.get("/me", requireAuth, authController.me);

router.post(
  "/change-password",
  requireAuth,
  validateBody(authController.changePasswordSchema),
  authController.changePassword,
);

export default router;
