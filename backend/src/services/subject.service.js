/**
 * Subjects (ວິຊາ). Admins manage them; everyone else reads them.
 */
import { query } from "../config/db.js";
import { conflict, notFoundError } from "../utils/httpError.js";

const COLUMNS = "id, name, description, created_at, updated_at";

/** All subjects, each with how many lessons it holds. */
export async function listSubjects() {
  const { rows } = await query(
    `SELECT s.id, s.name, s.description, s.created_at, s.updated_at,
            count(l.id)::int AS lesson_count
     FROM subjects s
     LEFT JOIN lessons l ON l.subject_id = s.id
     GROUP BY s.id
     ORDER BY s.name`,
  );
  return rows;
}

export async function getSubject(id) {
  const { rows } = await query(`SELECT ${COLUMNS} FROM subjects WHERE id = $1`, [id]);
  if (rows.length === 0) {
    throw notFoundError("ບໍ່ພົບວິຊານີ້", "subject_not_found");
  }
  return rows[0];
}

export async function createSubject({ name, description }) {
  try {
    const { rows } = await query(
      `INSERT INTO subjects (name, description) VALUES ($1, $2) RETURNING ${COLUMNS}`,
      [name.trim(), description?.trim() ?? ""],
    );
    return rows[0];
  } catch (err) {
    if (err.code === "23505") {
      throw conflict("ມີວິຊາຊື່ນີ້ຢູ່ແລ້ວ", "subject_name_taken");
    }
    throw err;
  }
}

export async function updateSubject(id, { name, description }) {
  try {
    const { rows } = await query(
      `UPDATE subjects
       SET name = COALESCE($2, name),
           description = COALESCE($3, description)
       WHERE id = $1
       RETURNING ${COLUMNS}`,
      [id, name?.trim() ?? null, description?.trim() ?? null],
    );
    if (rows.length === 0) {
      throw notFoundError("ບໍ່ພົບວິຊານີ້", "subject_not_found");
    }
    return rows[0];
  } catch (err) {
    if (err.code === "23505") {
      throw conflict("ມີວິຊາຊື່ນີ້ຢູ່ແລ້ວ", "subject_name_taken");
    }
    throw err;
  }
}

/**
 * Deleting a subject would cascade and take every lesson with it, so a
 * subject that still holds lessons is refused. In a real school an accidental
 * click must not wipe a term's worth of material.
 */
export async function deleteSubject(id) {
  const { rows } = await query(
    "SELECT count(*)::int AS lesson_count FROM lessons WHERE subject_id = $1",
    [id],
  );

  if (rows[0].lesson_count > 0) {
    throw conflict(
      `ລຶບບໍ່ໄດ້: ວິຊານີ້ຍັງມີ ${rows[0].lesson_count} ບົດຮຽນ ກະລຸນາຍ້າຍ ຫຼື ລຶບບົດຮຽນກ່ອນ`,
      "subject_not_empty",
    );
  }

  const result = await query("DELETE FROM subjects WHERE id = $1", [id]);
  if (result.rowCount === 0) {
    throw notFoundError("ບໍ່ພົບວິຊານີ້", "subject_not_found");
  }
}
