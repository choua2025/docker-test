/**
 * Builds the Express application.
 *
 * Kept separate from server.js so the app can be imported by tests without
 * opening a port.
 */
import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";

import { readFileSync } from "node:fs";

import routes from "./routes/index.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { env } from "./config/env.js";

// Read once at startup. `process.env.npm_package_version` only exists when the
// process was launched by an npm script, so it is empty under Docker.
const { version: PACKAGE_VERSION } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);

export function createApp() {
  const app = express();

  // Behind nginx or Docker, tell Express how many proxies to trust so that
  // rate limiting keys on the real client IP.
  app.set("trust proxy", env.TRUST_PROXY);

  // Sensible security headers (no sniffing, no framing, HSTS in production).
  app.use(helmet());

  // The frontend talks to the API through a same-origin /api proxy, so CORS
  // is only needed when the two are deployed on different domains.
  app.use(
    cors({
      origin: env.corsOrigins,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );

  // A lesson body can be long, but 1 MB is plenty for JSON - files go to
  // Cloudinary, not through this endpoint.
  app.use(express.json({ limit: "1mb" }));

  app.use(morgan(env.isProduction ? "combined" : "dev"));

  // A welcome note at the API root.
  //
  // This MUST be app.get("/") and not app.use("/"): a `use` mount path of "/"
  // matches every request, and a handler that never calls next() would then
  // swallow the whole API. `get` matches the exact path and method only.
  app.get("/", (req, res) => {
    res.json({
      message: "ຍິນດີຕ້ອນຮັບເຂົ້າໃນ LaoLearn API ສໍາລັບແຂວງໄຊ",
      version: PACKAGE_VERSION,
      env: env.NODE_ENV,
    });
  });

  app.use("/api", routes);

  // Order matters: 404 first, then the error formatter, both last.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
