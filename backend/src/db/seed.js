/**
 * Creates the very first admin account.
 *
 * There is no "sign up as admin" screen on purpose - an admin can only be
 * created here, by someone with server access. Run it once after migrating:
 *
 *   ADMIN_PASSWORD='a-strong-password' npm run seed
 *
 * Running it again is safe: an existing admin is left alone.
 */
import bcrypt from "bcryptjs";

import { query, closePool, waitForDatabase } from "../config/db.js";
import { env } from "../config/env.js";

/**
 * The subjects a Lao secondary school actually teaches. Only an admin can
 * create subjects, so without these a fresh install would leave teachers
 * unable to file a single lesson.
 */
const DEFAULT_SUBJECTS = [
  ["ຄະນິດສາດ", "ພຶດຊະຄະນິດ, ເລຂາຄະນິດ ແລະ ການແກ້ບັນຫາ"],
  ["ຟີຊິກສາດ", "ແຮງ, ການເຄື່ອນທີ່, ພະລັງງານ ແລະ ໄຟຟ້າ"],
  ["ເຄມີສາດ", "ທາດ, ປະຕິກິລິຍາເຄມີ ແລະ ຕາຕະລາງທາດ"],
  ["ຊີວະສາດ", "ຈຸລັງ, ພືດ, ສັດ ແລະ ຮ່າງກາຍມະນຸດ"],
  ["ພາສາລາວ", "ໄວຍາກອນ, ວັນນະຄະດີ ແລະ ການຂຽນ"],
  ["ພາສາອັງກິດ", "ຄຳສັບ, ໄວຍາກອນ ແລະ ການສື່ສານ"],
  ["ປະຫວັດສາດ", "ປະຫວັດສາດລາວ ແລະ ໂລກ"],
  ["ພູມສາດ", "ພູມສາດລາວ, ອາຊີ ແລະ ໂລກ"],
];

async function seedSubjects() {
  // ON CONFLICT keeps this safe to run again - an admin who renamed a
  // subject will not have it silently reset.
  const { rowCount } = await query(
    `INSERT INTO subjects (name, description)
     SELECT * FROM unnest($1::text[], $2::text[])
     ON CONFLICT (name) DO NOTHING`,
    [DEFAULT_SUBJECTS.map((s) => s[0]), DEFAULT_SUBJECTS.map((s) => s[1])],
  );

  console.log(
    rowCount > 0
      ? `[seed] added ${rowCount} subject(s)`
      : "[seed] subjects already present - nothing to do",
  );
}

async function seed() {
  await waitForDatabase();

  if (!env.ADMIN_PASSWORD) {
    console.error("[seed] ADMIN_PASSWORD is empty - set it in backend/.env first.");
    process.exit(1);
  }
  if (env.ADMIN_PASSWORD.length < 8) {
    console.error("[seed] ADMIN_PASSWORD must be at least 8 characters.");
    process.exit(1);
  }

  const email = env.ADMIN_EMAIL.trim().toLowerCase();
  const existing = await query("SELECT id, role FROM users WHERE email = $1", [email]);

  if (existing.rowCount > 0) {
    console.log(`[seed] user ${email} already exists (role: ${existing.rows[0].role})`);
    await seedSubjects();
    return;
  }

  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, env.BCRYPT_ROUNDS);

  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'admin')
     RETURNING id, name, email, role`,
    [env.ADMIN_NAME.trim(), email, passwordHash],
  );

  console.log("[seed] admin created:", rows[0]);

  await seedSubjects();
}

try {
  await seed();
  await closePool();
} catch (err) {
  console.error("[seed] failed:", err.message);
  await closePool();
  process.exit(1);
}
