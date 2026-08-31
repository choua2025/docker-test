/**
 * HTTP layer for authentication: read the request, call the service,
 * send the response. No business rules live here.
 *
 * Express 5 forwards a rejected promise from an async handler to the error
 * middleware automatically, so there is no try/catch noise below.
 */
import { z } from "zod";

import * as authService from "../services/auth.service.js";
import { env } from "../config/env.js";

// ---------------------------------------------------------------------------
// Request schemas
// ---------------------------------------------------------------------------

// 8 characters is the floor. Long pass-phrases are encouraged in the UI
// rather than forcing symbols, which mostly produces "Password1!".
const passwordSchema = z
  .string()
  .min(8, "ລະຫັດຜ່ານຕ້ອງມີຢ່າງໜ້ອຍ 8 ຕົວອັກສອນ")
  .max(128, "ລະຫັດຜ່ານຍາວເກີນໄປ");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "ກະລຸນາປ້ອນຊື່").max(120, "ຊື່ຍາວເກີນໄປ"),
  email: z.string().trim().email("ອີເມວບໍ່ຖືກຕ້ອງ").max(254),
  password: passwordSchema,
  // A plain refine (instead of z.enum) so the Lao message is used verbatim.
  role: z
    .string()
    .refine((value) => authService.PUBLIC_ROLES.includes(value), {
      message: "ກະລຸນາເລືອກປະເພດຜູ້ໃຊ້ (ຄູ ຫຼື ນັກຮຽນ)",
    }),
  teacherCode: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email("ອີເມວບໍ່ຖືກຕ້ອງ"),
  password: z.string().min(1, "ກະລຸນາປ້ອນລະຫັດຜ່ານ"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "ກະລຸນາປ້ອນລະຫັດຜ່ານປັດຈຸບັນ"),
  newPassword: passwordSchema,
});

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/** POST /api/auth/register */
export async function register(req, res) {
  const user = await authService.registerUser(req.body);
  const token = authService.issueToken(user);

  // 201 Created, and the new account is logged in straight away.
  res.status(201).json({ user, token });
}

/** POST /api/auth/login */
export async function login(req, res) {
  const { email, password } = req.body;
  const user = await authService.verifyCredentials(email, password);
  const token = authService.issueToken(user);

  res.json({ user, token });
}

/** GET /api/auth/me - who am I? Used by the frontend on page reload. */
export async function me(req, res) {
  const user = await authService.findUserById(req.user.id);
  res.json({ user });
}

/** POST /api/auth/change-password */
export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.user.id, currentPassword, newPassword);
  res.json({ ok: true, message: "ປ່ຽນລະຫັດຜ່ານສຳເລັດແລ້ວ" });
}

/**
 * GET /api/auth/config
 * Tiny public endpoint so the registration form knows whether it must show
 * the "teacher code" field. It exposes a boolean, never the code itself.
 */
export function config(req, res) {
  res.json({ teacherCodeRequired: env.teacherCodeRequired });
}
