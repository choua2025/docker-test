/**
 * Wiring tests for the app itself, not for any one feature.
 *
 * The root welcome route earned its own file after `app.use("/", handler)`
 * silently swallowed every /api request: a `use` mount path of "/" matches
 * every path, so a handler that never calls next() takes the whole API down.
 */
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";

import { closePool, startTestServer } from "./helpers/setup.js";

let server;
let api;
let origin;

before(async () => {
  server = await startTestServer();
  api = server.api;
  origin = server.origin;
});
after(async () => {
  await server.close();
  await closePool();
});

describe("the root route", () => {
  it("greets at exactly /", async () => {
    const response = await fetch(`${origin}/`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.match(body.message, /LaoLearn/);
    assert.ok(body.version, "the version should come from package.json, not an npm-only env var");
  });

  it("does not shadow /api - the assertion that fails if it becomes app.use", async () => {
    const health = await api("/health");
    assert.equal(health.status, 200);
    assert.equal(health.body.status, "ok");
  });

  it("leaves /api routes guarded rather than answering them itself", async () => {
    const { status, body } = await api("/lessons");
    assert.equal(status, 401, "an unauthenticated call must be refused, not greeted");
    assert.equal(body.error.code, "missing_token");
  });

  it("answers only GET", async () => {
    const response = await fetch(`${origin}/`, { method: "POST" });
    assert.notEqual(response.status, 200, "POST / must not hit the welcome handler");
  });
});

describe("error handling", () => {
  it("returns 404 in the standard shape for an unknown path", async () => {
    const { status, body } = await api("/no-such-thing");

    assert.equal(status, 404);
    assert.equal(body.error.code, "route_not_found");
    assert.ok(body.error.message, "every error carries a message the UI can show");
  });

  it("rejects malformed JSON with a code, not a stack trace", async () => {
    const response = await fetch(`${origin}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ not json",
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error.code, "invalid_json");
    assert.equal(body.error.stack, undefined);
  });
});
