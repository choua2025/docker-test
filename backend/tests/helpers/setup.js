/**
 * Shared plumbing for the test suite.
 *
 * Every test file imports this FIRST, before anything from `src/`, because it
 * fills in the environment the app validates at import time. `dotenv` does not
 * overwrite variables that are already set, so these win over backend/.env and
 * a developer's real database is never touched.
 *
 * The tests talk to the API over HTTP rather than calling services directly.
 * That way they exercise the routes, the role guards and the JSON shape the
 * browser actually receives - the layers where the interesting mistakes live.
 */
import pg from "pg";

process.env.NODE_ENV ??= "test";
process.env.JWT_SECRET ??= "test-only-secret-that-is-long-enough-32ch";
process.env.JWT_EXPIRES_IN ??= "1h";
// 10 is bcrypt's floor: strong enough to be a real hash, fast enough that a
// suite creating dozens of users does not take a minute.
process.env.BCRYPT_ROUNDS ??= "10";
process.env.CLOUDINARY_CLOUD_NAME ??= "";
// The suite registers dozens of accounts from one address; the real limits
// would refuse it. The middleware still runs - only its ceiling is raised.
process.env.RATE_LIMIT_LOGIN_MAX ??= "100000";
process.env.RATE_LIMIT_REGISTER_MAX ??= "100000";

/**
 * A database of its own, so running the suite never clears the data a
 * developer is looking at. CI overrides DATABASE_URL to point at its service.
 */
const DEFAULT_TEST_URL = "postgres://postgres:postgres@localhost:5432/laolearn_test";
process.env.DATABASE_URL ??= DEFAULT_TEST_URL;

/** Create the test database if it is not there yet. */
async function ensureTestDatabase() {
  const url = new URL(process.env.DATABASE_URL);
  const dbName = url.pathname.slice(1);

  // Connect to the always-present maintenance database to create ours.
  const adminUrl = new URL(url);
  adminUrl.pathname = "/postgres";

  const client = new pg.Client({ connectionString: adminUrl.toString() });
  try {
    await client.connect();
  } catch (err) {
    throw new Error(
      `Cannot reach PostgreSQL at ${url.host}. Start it, or set DATABASE_URL. (${err.message})`,
    );
  }

  try {
    const { rowCount } = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [
      dbName,
    ]);
    // CREATE DATABASE takes no bound parameters, so the name is quoted as an
    // identifier instead: wrap in double quotes and double any inside.
    if (rowCount === 0) {
      const quoted = `"${dbName.replace(/"/g, '""')}"`;
      await client.query(`CREATE DATABASE ${quoted}`);
    }
  } finally {
    await client.end();
  }
}

await ensureTestDatabase();

// Imported only now, so they pick up the environment set above.
const { migrate } = await import("../../src/db/migrate.js");
const { createApp } = await import("../../src/app.js");
const { query, closePool } = await import("../../src/config/db.js");

await migrate({ log: () => {} });

/** Domain tables, child-first. RESTART IDENTITY keeps ids predictable. */
const TABLES = [
  "quiz_results",
  "questions",
  "quizzes",
  "lessons",
  "subjects",
  "users",
];

export async function resetDatabase() {
  await query(`TRUNCATE ${TABLES.join(", ")} RESTART IDENTITY CASCADE`);
}

/**
 * Start the real app on a free port and hand back a small client.
 * Port 0 lets the OS choose, so test files can run without colliding.
 */
export async function startTestServer() {
  const server = createApp().listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const base = `${origin}/api`;

  /**
   * @param {string} path e.g. "/auth/login"
   * @param {{ method?: string, body?: unknown, token?: string }} [options]
   * @returns {Promise<{ status: number, body: any }>}
   */
  async function api(path, { method = "GET", body, token } = {}) {
    const headers = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(base + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    return {
      status: response.status,
      body: await response.json().catch(() => null),
    };
  }

  return {
    api,
    /** e.g. "http://127.0.0.1:51234" - for asserting on paths outside /api. */
    origin,
    async close() {
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

/** Register someone and return { user, token }. Defaults make a student. */
export async function registerUser(api, overrides = {}) {
  const suffix = Math.random().toString(36).slice(2, 8);
  const { status, body } = await api("/auth/register", {
    method: "POST",
    body: {
      name: "ຜູ້ໃຊ້ທົດສອບ",
      email: `user-${suffix}@laolearn.la`,
      password: "laolearn2026",
      role: "student",
      ...overrides,
    },
  });

  if (status !== 201) {
    throw new Error(`registerUser failed (${status}): ${JSON.stringify(body)}`);
  }
  return body;
}

/**
 * Admins cannot be registered through the API on purpose, so tests promote a
 * user directly in the database and log them back in for a token with the
 * new role baked in.
 */
export async function createAdmin(api) {
  const { user } = await registerUser(api, { role: "teacher" });
  await query("UPDATE users SET role = 'admin' WHERE id = $1", [user.id]);

  const { body } = await api("/auth/login", {
    method: "POST",
    body: { email: user.email, password: "laolearn2026" },
  });
  return body;
}

export { query, closePool };
