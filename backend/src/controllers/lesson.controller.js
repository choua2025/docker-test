import { z } from "zod";

import * as lessonService from "../services/lesson.service.js";

/**
 * The attachment, as the browser reports it after uploading straight to
 * Cloudinary. `null` means "remove the current file"; omitting the field
 * entirely means "leave it alone".
 */
const fileSchema = z
  .object({
    url: z.string().url("ລິ້ງໄຟລ໌ບໍ່ຖືກຕ້ອງ"),
    publicId: z.string().min(1),
    resourceType: z.enum(["image", "video", "raw"]),
    name: z.string().max(255).optional(),
    bytes: z.number().int().nonnegative().optional(),
    mime: z.string().max(128).optional(),
  })
  .nullable();

export const createLessonSchema = z.object({
  subjectId: z.coerce.number().int().positive("ກະລຸນາເລືອກວິຊາ"),
  title: z.string().trim().min(1, "ກະລຸນາປ້ອນຊື່ບົດຮຽນ").max(200, "ຊື່ບົດຮຽນຍາວເກີນໄປ"),
  content: z.string().max(100_000, "ເນື້ອຫາຍາວເກີນໄປ").optional(),
  position: z.coerce.number().int().min(0).max(9999).optional(),
  file: fileSchema.optional(),
});

export const updateLessonSchema = createLessonSchema.partial();

export const listLessonsQuerySchema = z.object({
  subjectId: z.coerce.number().int().positive().optional(),
  createdBy: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  // Capped so one request can never ask for the whole table.
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** GET /api/lessons */
export async function list(req, res) {
  res.json(await lessonService.listLessons(req.validatedQuery));
}

/** GET /api/lessons/:id */
export async function getOne(req, res) {
  res.json({ lesson: await lessonService.getLesson(req.params.id) });
}

/** POST /api/lessons (teacher, admin) */
export async function create(req, res) {
  const lesson = await lessonService.createLesson(req.body, req.user);
  res.status(201).json({ lesson });
}

/** PUT /api/lessons/:id (author or admin) */
export async function update(req, res) {
  const lesson = await lessonService.updateLesson(req.params.id, req.body, req.user);
  res.json({ lesson });
}

/** DELETE /api/lessons/:id (author or admin) */
export async function remove(req, res) {
  await lessonService.deleteLesson(req.params.id, req.user);
  res.json({ ok: true, message: "ລຶບບົດຮຽນສຳເລັດແລ້ວ" });
}
