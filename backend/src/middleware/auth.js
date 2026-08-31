/**
 * Route protection.
 *
 *   requireAuth              -> must be logged in
 *   requireRole("teacher")   -> must be logged in AND have that role
 *
 * Use them like this:
 *
 *   router.post("/lessons", requireAuth, requireRole("teacher", "admin"), createLesson);
 *
 * Order matters: requireAuth always comes first, because requireRole reads
 * the user that requireAuth put on the request.
 */
import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import { unauthorized, forbidden } from "../utils/httpError.js";

export const JWT_ISSUER = "laolearn";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization ?? "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(unauthorized("ກະລຸນາເຂົ້າສູ່ລະບົບກ່ອນ", "missing_token"));
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { issuer: JWT_ISSUER });
    // `sub` is the user id; the role travels in the token so that checking a
    // permission costs no database round-trip.
    req.user = { id: Number(payload.sub), role: payload.role };
    next();
  } catch (err) {
    const expired = err.name === "TokenExpiredError";
    next(
      unauthorized(
        expired ? "ເຊສຊັນໝົດອາຍຸແລ້ວ ກະລຸນາເຂົ້າສູ່ລະບົບໃໝ່" : "ໂທເຄັນບໍ່ຖືກຕ້ອງ",
        expired ? "token_expired" : "invalid_token",
      ),
    );
  }
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(unauthorized("ກະລຸນາເຂົ້າສູ່ລະບົບກ່ອນ", "missing_token"));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(forbidden("ທ່ານບໍ່ມີສິດເຂົ້າໃຊ້ສ່ວນນີ້", "insufficient_role"));
    }
    next();
  };
}
