/**
 * Routes under /api/uploads
 *
 * The browser never receives the Cloudinary API secret. It asks here for a
 * signature, uploads the file directly to Cloudinary with it, then sends the
 * resulting URL back when saving the lesson.
 */
import { Router } from "express";
import rateLimit from "express-rate-limit";

import { createUploadSignature } from "../config/cloudinary.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { env } from "../config/env.js";

const router = Router();

// A signature is cheap to issue but authorises a write to our Cloudinary
// account, so cap how many a single teacher can request.
const signatureLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: {
      code: "too_many_requests",
      message: "ອັບໂຫຼດຫຼາຍເກີນໄປ ກະລຸນາລອງໃໝ່ພາຍຫຼັງ",
    },
  },
});

/** GET /api/uploads/config - is uploading available at all? */
router.get("/config", requireAuth, (req, res) => {
  res.json({
    enabled: env.cloudinaryConfigured,
    maxBytes: env.UPLOAD_MAX_MB * 1024 * 1024,
    maxMb: env.UPLOAD_MAX_MB,
  });
});

/** POST /api/uploads/signature (teacher, admin) */
router.post(
  "/signature",
  requireAuth,
  requireRole("teacher", "admin"),
  signatureLimiter,
  (req, res) => {
    res.json(createUploadSignature({ userId: req.user.id }));
  },
);

export default router;
