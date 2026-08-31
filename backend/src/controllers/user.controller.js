import { z } from "zod";

import * as userService from "../services/user.service.js";

export const listUsersQuerySchema = z.object({
  role: z
    .string()
    .refine((value) => userService.ROLES.includes(value), { message: "ສິດການໃຊ້ງານບໍ່ຖືກຕ້ອງ" })
    .optional(),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const updateRoleSchema = z.object({
  role: z
    .string()
    .refine((value) => userService.ROLES.includes(value), { message: "ສິດການໃຊ້ງານບໍ່ຖືກຕ້ອງ" }),
});

/** GET /api/users (admin) */
export async function list(req, res) {
  const [result, counts] = await Promise.all([
    userService.listUsers(req.validatedQuery),
    userService.countByRole(),
  ]);
  res.json({ ...result, counts });
}

/** GET /api/users/:id (admin) */
export async function getOne(req, res) {
  res.json({ user: await userService.getUser(req.params.id) });
}

/** PATCH /api/users/:id/role (admin) */
export async function updateRole(req, res) {
  const user = await userService.updateUserRole(req.params.id, req.body.role, req.user);
  res.json({ user, message: "ປ່ຽນສິດການໃຊ້ງານສຳເລັດແລ້ວ" });
}

/** DELETE /api/users/:id (admin) */
export async function remove(req, res) {
  const user = await userService.deleteUser(req.params.id, req.user);
  res.json({ ok: true, message: `ລຶບບັນຊີ ${user.name} ສຳເລັດແລ້ວ` });
}
