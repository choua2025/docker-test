/**
 * Lessons (ບົດຮຽນ).
 *
 * Who may change what:
 *   - a teacher may edit and delete only the lessons they created;
 *   - an admin may edit and delete any lesson;
 *   - a student may only read.
 *
 * That rule lives in `assertCanModify` and is applied by the service, not the
 * controller, so no future route can forget it.
 */
import { query, withTransaction } from "../config/db.js";
import { deleteAsset } from "../config/cloudinary.js";
import { forbidden, notFoundError, badRequest } from "../utils/httpError.js";

/**
 * Columns sent to the browser. `search_vector` is deliberately excluded -
 * it is a large internal index column of no use to the client.
 */
const LESSON_COLUMNS = `
  l.id, l.subject_id, l.title, l.content, l.position,
  l.file_url, l.file_public_id, l.file_resource_type, l.file_name,
  l.file_bytes, l.file_mime,
  l.created_by, l.created_at, l.updated_at
`;

const WITH_RELATIONS = `
  SELECT ${LESSON_COLUMNS},
         s.name AS subject_name,
         u.name AS author_name
  FROM lessons l
  JOIN subjects s ON s.id = l.subject_id
  LEFT JOIN users u ON u.id = l.created_by
`;

/**
 * A paged list, newest teaching order first.
 * @param {{ subjectId?: number, createdBy?: number, page: number, limit: number }} options
 */
export async function listLessons({ subjectId, createdBy, page, limit }) {
  const filters = [];
  const params = [];

  if (subjectId) {
    params.push(subjectId);
    filters.push(`l.subject_id = $${params.length}`);
  }
  if (createdBy) {
    params.push(createdBy);
    filters.push(`l.created_by = $${params.length}`);
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  const totalResult = await query(
    `SELECT count(*)::int AS total FROM lessons l ${where}`,
    params,
  );

  params.push(limit, (page - 1) * limit);

  const { rows } = await query(
    `${WITH_RELATIONS} ${where}
     ORDER BY l.position, l.id
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  return {
    lessons: rows,
    total: totalResult.rows[0].total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(totalResult.rows[0].total / limit)),
  };
}

export async function getLesson(id) {
  const { rows } = await query(`${WITH_RELATIONS} WHERE l.id = $1`, [id]);
  if (rows.length === 0) {
    throw notFoundError("ບໍ່ພົບບົດຮຽນນີ້", "lesson_not_found");
  }
  return rows[0];
}

/** Throws unless `user` is the lesson's author or an admin. */
function assertCanModify(lesson, user) {
  if (user.role === "admin") return;
  if (String(lesson.created_by) !== String(user.id)) {
    throw forbidden("ທ່ານແກ້ໄຂໄດ້ສະເພາະບົດຮຽນທີ່ທ່ານສ້າງເອງ", "not_lesson_owner");
  }
}

async function assertSubjectExists(subjectId) {
  const { rows } = await query("SELECT 1 FROM subjects WHERE id = $1", [subjectId]);
  if (rows.length === 0) {
    throw badRequest("ບໍ່ພົບວິຊາທີ່ເລືອກ", "subject_not_found");
  }
}

export async function createLesson(input, user) {
  await assertSubjectExists(input.subjectId);

  const { rows } = await query(
    `INSERT INTO lessons
       (subject_id, title, content, position,
        file_url, file_public_id, file_resource_type, file_name, file_bytes, file_mime,
        created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id`,
    [
      input.subjectId,
      input.title.trim(),
      input.content ?? "",
      input.position ?? 0,
      input.file?.url ?? null,
      input.file?.publicId ?? null,
      input.file?.resourceType ?? null,
      input.file?.name ?? null,
      input.file?.bytes ?? null,
      input.file?.mime ?? null,
      user.id,
    ],
  );

  return getLesson(rows[0].id);
}

export async function updateLesson(id, input, user) {
  const existing = await getLesson(id);
  assertCanModify(existing, user);

  if (input.subjectId && input.subjectId !== Number(existing.subject_id)) {
    await assertSubjectExists(input.subjectId);
  }

  // `file` absent  -> keep the current attachment
  // `file` null    -> remove it
  // `file` object  -> replace it
  const replacingFile = input.file !== undefined;
  const nextFile = input.file ?? null;

  await query(
    `UPDATE lessons SET
       subject_id = COALESCE($2, subject_id),
       title      = COALESCE($3, title),
       content    = COALESCE($4, content),
       position   = COALESCE($5, position),
       file_url           = CASE WHEN $6 THEN $7  ELSE file_url END,
       file_public_id     = CASE WHEN $6 THEN $8  ELSE file_public_id END,
       file_resource_type = CASE WHEN $6 THEN $9  ELSE file_resource_type END,
       file_name          = CASE WHEN $6 THEN $10 ELSE file_name END,
       file_bytes         = CASE WHEN $6 THEN $11 ELSE file_bytes END,
       file_mime          = CASE WHEN $6 THEN $12 ELSE file_mime END
     WHERE id = $1`,
    [
      id,
      input.subjectId ?? null,
      input.title?.trim() ?? null,
      input.content ?? null,
      input.position ?? null,
      replacingFile,
      nextFile?.url ?? null,
      nextFile?.publicId ?? null,
      nextFile?.resourceType ?? null,
      nextFile?.name ?? null,
      nextFile?.bytes ?? null,
      nextFile?.mime ?? null,
    ],
  );

  // Only once the row is safely updated do we drop the old file, so a failed
  // update can never leave a lesson pointing at a deleted asset.
  if (replacingFile && existing.file_public_id && existing.file_public_id !== nextFile?.publicId) {
    await deleteAsset(existing.file_public_id, existing.file_resource_type);
  }

  return getLesson(id);
}

export async function deleteLesson(id, user) {
  const existing = await getLesson(id);
  assertCanModify(existing, user);

  await withTransaction((client) => client.query("DELETE FROM lessons WHERE id = $1", [id]));

  await deleteAsset(existing.file_public_id, existing.file_resource_type);
}
