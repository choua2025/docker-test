/**
 * Entry point: wait for the database, start listening, and shut down
 * cleanly when Docker or Ctrl+C asks us to.
 */
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { waitForDatabase, closePool } from "./config/db.js";

// A dangerous default must never survive into production.
if (env.isProduction && env.JWT_SECRET.startsWith("replace-this")) {
  console.error("[startup] JWT_SECRET is still the example value. Set a real secret.");
  process.exit(1);
}

await waitForDatabase();

const app = createApp();
const server = app.listen(env.PORT, () => {
  console.log(`[laolearn-api] listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

// Finish in-flight requests, then release database connections.
let shuttingDown = false;
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n[laolearn-api] ${signal} received, shutting down...`);

    server.close(async () => {
      await closePool();
      process.exit(0);
    });

    // Do not hang forever on a stuck connection.
    setTimeout(() => process.exit(1), 10_000).unref();
  });
}
