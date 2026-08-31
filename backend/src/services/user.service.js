/**
 * User administration. Every function here is admin-only territory - the
 * routes enforce that, and the guards below stop an admin locking the school
 * out of its own system by accident.
 */
import { query } from "../config/db.js";
import { badRequest, conflict, forbidden, notFoundError } from "../utils/httpError.js";

export const ROLES = ["admin", "teacher", "student"];

/**
 * One row per user, with the numbers an admin actually wants to see:
 * how much a teacher has written, and how a student is doing.
 *
 * The counts come from subqueries rather than JOIN + GROUP BY, because
 * joining two independent one-to-many tables (lessons and quiz_results)
 * multiplies the rows and silently inflates both counts.
 */
const LIST_SQL = `
  SELECT u.id, u.name, u.email, u.role, u.created_at,
         (SELECT count(*)::int FROM lessons l WHERE l.created_by = u.id)      AS lesson_count,
         (SELECT count(*)::int FROM quiz_results r WHERE r.user_id = u.id)    AS quiz_count,
         (SELECT round(avg(r.score::numeric * 100 / r.total_questions))
            FROM quiz_results r WHERE r.user_id = u.id)                       AS average_percent
  FROM users u
`;

/**
 * @param {{ role?: string, search?: string, page: number, limit: number }} options
 */
export async function listUsers({ role, search, page, limit }) {
  const filters = [];
  const params = [];

  if (role) {
    params.push(role);
    filters.push(`u.role = $${params.length}::user_role`);
  }

  if (search) {
    // Case-insensitive "contains" on either name or email. ILIKE handles Lao
    // fine: it is a plain substring match, not a word-based search.
    params.push(`%${search.trim()}%`);
    filters.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  const totalResult = await query(`SELECT count(*)::int AS total FROM users u ${where}`, params);
  const total = totalResult.rows[0].total;

  params.push(limit, (page - 1) * limit);
  const { rows } = await query(
    `${LIST_SQL} ${where}
     ORDER BY u.role, u.name
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  return {
    users: rows,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

/** How many users of each role exist - drives the filter chips' counts. */
export async function countByRole() {
  const { rows } = await query(
    "SELECT role, count(*)::int AS count FROM users GROUP BY role",
  );
  const counts = { admin: 0, teacher: 0, student: 0, total: 0 };
  for (const row of rows) {
    counts[row.role] = row.count;
    counts.total += row.count;
  }
  return counts;
}

export async function getUser(id) {
  const { rows } = await query(`${LIST_SQL} WHERE u.id = $1`, [id]);
  if (rows.length === 0) {
    throw notFoundError("ບໍ່ພົບບັນຊີຜູ້ໃຊ້", "user_not_found");
  }
  return rows[0];
}

async function countAdmins() {
  const { rows } = await query("SELECT count(*)::int AS count FROM users WHERE role = 'admin'");
  return rows[0].count;
}

/**
 * Change someone's role.
 *
 * Two things are refused outright: changing your own role (an admin who
 * demotes themselves is locked out with no way back), and removing the last
 * admin (nobody could ever administer the system again).
 */
export async function updateUserRole(id, role, actor) {
  if (!ROLES.includes(role)) {
    throw badRequest("ສິດການໃຊ້ງານບໍ່ຖືກຕ້ອງ", "invalid_role");
  }

  if (String(id) === String(actor.id)) {
    throw forbidden("ທ່ານປ່ຽນສິດຂອງບັນຊີຕົນເອງບໍ່ໄດ້", "cannot_change_own_role");
  }

  const target = await getUser(id);
  if (target.role === role) return target;

  if (target.role === "admin" && (await countAdmins()) <= 1) {
    throw conflict("ນີ້ແມ່ນຜູ້ດູແລລະບົບຄົນສຸດທ້າຍ ປ່ຽນສິດບໍ່ໄດ້", "last_admin");
  }

  await query("UPDATE users SET role = $2::user_role WHERE id = $1", [id, role]);
  return getUser(id);
}

/**
 * Delete an account.
 *
 * Lessons the person wrote are kept: `lessons.created_by` is ON DELETE SET
 * NULL, so a teacher leaving the school does not take a term of material with
 * them. Their quiz results do go, which is correct - they belong to the person.
 */
export async function deleteUser(id, actor) {
  if (String(id) === String(actor.id)) {
    throw forbidden("ທ່ານລຶບບັນຊີຕົນເອງບໍ່ໄດ້", "cannot_delete_self");
  }

  const target = await getUser(id);

  if (target.role === "admin" && (await countAdmins()) <= 1) {
    throw conflict("ນີ້ແມ່ນຜູ້ດູແລລະບົບຄົນສຸດທ້າຍ ລຶບບໍ່ໄດ້", "last_admin");
  }

  await query("DELETE FROM users WHERE id = $1", [id]);
  return target;
}
