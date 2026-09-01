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
import { env } from "../config/env.js";

const router = Router();

/**
 * Slows down password guessing without locking out a class.
 *
 * Every student in a school usually shares one NAT gateway, so they all look
 * like a single IP here. The limits therefore come from the environment
 * (see RATE_LIMIT_* in .env.example) and default high enough for a full
 * classroom signing in at the start of a lesson.
 */
const loginLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_LOGIN_WINDOW_MIN * 60 * 1000,
  limit: env.RATE_LIMIT_LOGIN_MAX,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: {
      code: "too_many_requests",
      message: `ພະຍາຍາມຫຼາຍເກີນໄປ ກະລຸນາລໍຖ້າ ${env.RATE_LIMIT_LOGIN_WINDOW_MIN} ນາທີ ແລ້ວລອງໃໝ່`,
    },
  },
});

const registerLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_REGISTER_WINDOW_MIN * 60 * 1000,
  limit: env.RATE_LIMIT_REGISTER_MAX,
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
