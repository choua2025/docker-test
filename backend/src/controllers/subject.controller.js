import { z } from "zod";

import * as subjectService from "../services/subject.service.js";

export const createSubjectSchema = z.object({
  name: z.string().trim().min(1, "ກະລຸນາປ້ອນຊື່ວິຊາ").max(120, "ຊື່ວິຊາຍາວເກີນໄປ"),
  description: z.string().trim().max(1000, "ຄຳອະທິບາຍຍາວເກີນໄປ").optional(),
});

// Every field optional: a PATCH-style update may send only what changed.
export const updateSubjectSchema = createSubjectSchema.partial();

/** GET /api/subjects */
export async function list(req, res) {
  res.json({ subjects: await subjectService.listSubjects() });
}

/** GET /api/subjects/:id */
export async function getOne(req, res) {
  res.json({ subject: await subjectService.getSubject(req.params.id) });
}

/** POST /api/subjects (admin) */
export async function create(req, res) {
  const subject = await subjectService.createSubject(req.body);
  res.status(201).json({ subject });
}

/** PUT /api/subjects/:id (admin) */
export async function update(req, res) {
  const subject = await subjectService.updateSubject(req.params.id, req.body);
  res.json({ subject });
}

/** DELETE /api/subjects/:id (admin) */
export async function remove(req, res) {
  await subjectService.deleteSubject(req.params.id);
  res.json({ ok: true, message: "ລຶບວິຊາສຳເລັດແລ້ວ" });
}
