/**
 * Everything the API knows about registering, logging in and identifying a
 * user. Controllers stay thin; the rules live here.
 */
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { query } from "../config/db.js";
import { env } from "../config/env.js";
import { conflict, forbidden, unauthorized, notFoundError } from "../utils/httpError.js";
import { JWT_ISSUER } from "../middleware/auth.js";

/** Roles a person may choose on the public registration form. */
export const PUBLIC_ROLES = ["teacher", "student"];

/** Columns that are safe to send to the browser - never password_hash. */
const SAFE_COLUMNS = "id, name, email, role, created_at";

/**
 * A throw-away hash compared against when the email does not exist.
 * Without it, a wrong email would answer noticeably faster than a wrong
 * password, which tells an attacker which emails are registered.
 */
const DUMMY_HASH = bcrypt.hashSync("laolearn-nonexistent-user", 10);

export function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

/**
 * Create a new teacher or student account.
 * @returns the created user, without the password hash
 */
export async function registerUser({ name, email, password, role, teacherCode }) {
  // Defence in depth: the zod schema already restricts `role`, but never let
  // an admin be created through a public endpoint.
  if (!PUBLIC_ROLES.includes(role)) {
    throw forbidden("ບໍ່ສາມາດສະໝັກດ້ວຍສິດນີ້ໄດ້", "role_not_allowed");
  }

  // Optional school-controlled gate on teacher accounts.
  if (role === "teacher" && env.teacherCodeRequired) {
    if (teacherCode !== env.TEACHER_REGISTRATION_CODE) {
      throw forbidden("ລະຫັດສຳລັບຄູບໍ່ຖືກຕ້ອງ", "invalid_teacher_code");
    }
  }

  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

  try {
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING ${SAFE_COLUMNS}`,
      [name.trim(), normalizeEmail(email), passwordHash, role],
    );
    return rows[0];
  } catch (err) {
    // 23505 = unique_violation, i.e. the email is already registered.
    // Letting the database decide avoids a check-then-insert race.
    if (err.code === "23505") {
      throw conflict("ອີເມວນີ້ຖືກໃຊ້ແລ້ວ", "email_taken");
    }
    throw err;
  }
}

/**
 * Check an email/password pair.
 * @returns the matching user, without the password hash
 */
export async function verifyCredentials(email, password) {
  const { rows } = await query(
    `SELECT id, name, email, role, created_at, password_hash
     FROM users WHERE email = $1`,
    [normalizeEmail(email)],
  );

  const user = rows[0];

  // Always run one bcrypt comparison, whether or not the user exists.
  const matches = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);

  if (!user || !matches) {
    // One message for both cases, so it never reveals which one was wrong.
    throw unauthorized("ອີເມວ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ", "invalid_credentials");
  }

  delete user.password_hash;
  return user;
}

/** Sign a JWT for a user. The role is embedded so route guards are cheap. */
export function issueToken(user) {
  return jwt.sign({ role: user.role }, env.JWT_SECRET, {
    subject: String(user.id),
    issuer: JWT_ISSUER,
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

export async function findUserById(id) {
  const { rows } = await query(`SELECT ${SAFE_COLUMNS} FROM users WHERE id = $1`, [id]);
  if (rows.length === 0) {
    // The token was valid but the account is gone (deleted by an admin).
    throw notFoundError("ບໍ່ພົບບັນຊີຜູ້ໃຊ້", "user_not_found");
  }
  return rows[0];
}

export async function changePassword(userId, currentPassword, newPassword) {
  const { rows } = await query("SELECT password_hash FROM users WHERE id = $1", [userId]);
  if (rows.length === 0) {
    throw notFoundError("ບໍ່ພົບບັນຊີຜູ້ໃຊ້", "user_not_found");
  }

  const matches = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!matches) {
    throw unauthorized("ລະຫັດຜ່ານປັດຈຸບັນບໍ່ຖືກຕ້ອງ", "invalid_credentials");
  }

  const passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
  await query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, userId]);
}
