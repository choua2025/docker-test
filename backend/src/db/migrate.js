/**
 * A tiny migration runner.
 *
 * It applies every `.sql` file in `migrations/` in filename order, exactly
 * once, and remembers what it applied in a `schema_migrations` table.
 * Each file runs inside its own transaction, so a broken migration leaves
 * the database untouched rather than half-updated.
 *
 * Run it from the command line with:  npm run migrate
 * Tests import `migrate()` directly to prepare a fresh test database.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { pool, closePool, waitForDatabase } from "../config/db.js";

const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "migrations");

/**
 * @param {{ log?: (message: string) => void }} [options] pass `log: () => {}`
 *   to run quietly, which is what the test setup does.
 */
export async function migrate({ log = console.log } = {}) {
  await waitForDatabase();

  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name       TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const { rows } = await client.query("SELECT name FROM schema_migrations");
    const alreadyApplied = new Set(rows.map((row) => row.name));

    const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();

    if (files.length === 0) {
      log("[migrate] no migration files found");
      return;
    }

    for (const file of files) {
      if (alreadyApplied.has(file)) {
        log(`[migrate] skip    ${file}`);
        continue;
      }

      const sql = await readFile(path.join(migrationsDir, file), "utf8");

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
        log(`[migrate] applied ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`[migrate] FAILED  ${file}: ${err.message}`);
        throw err;
      }
    }

    log("[migrate] done");
  } finally {
    client.release();
  }
}

/**
 * Only run and exit when invoked as a script. Importing this file (as the
 * tests do) must not shut the pool down underneath the caller.
 */
const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
  try {
    await migrate();
    await closePool();
  } catch {
    await closePool();
    process.exit(1);
  }
}
