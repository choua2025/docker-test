/**
 * A single PostgreSQL connection pool shared by the whole API.
 *
 * Always call `query()` with placeholders ($1, $2, ...) and never build SQL
 * by string concatenation - that is what prevents SQL injection.
 */
import pg from "pg";
import { env } from "./env.js";

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

// A dropped idle connection should be logged, not crash the process.
pool.on("error", (err) => {
  console.error("[db] unexpected idle client error:", err.message);
});

/**
 * Run one SQL statement.
 * @param {string} text SQL with $1-style placeholders
 * @param {unknown[]} [params] values for the placeholders
 */
export function query(text, params) {
  return pool.query(text, params);
}

/**
 * Run several statements inside one transaction. If the callback throws,
 * everything is rolled back.
 * @param {(client: pg.PoolClient) => Promise<T>} callback
 * @template T
 */
export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * In Docker the API often boots before PostgreSQL is ready to accept
 * connections, so retry for a while instead of crash-looping.
 */
export async function waitForDatabase({ attempts = 15, delayMs = 2000 } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await pool.query("SELECT 1");
      console.log("[db] connected");
      return;
    } catch (err) {
      if (attempt === attempts) throw err;
      console.log(`[db] not ready (${err.code || err.message}), retry ${attempt}/${attempts}...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

export function closePool() {
  return pool.end();
}
