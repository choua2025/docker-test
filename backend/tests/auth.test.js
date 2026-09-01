import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  closePool,
  registerUser,
  resetDatabase,
  startTestServer,
} from "./helpers/setup.js";

let server;
let api;

before(async () => {
  server = await startTestServer();
  api = server.api;
});
beforeEach(resetDatabase);
after(async () => {
  await server.close();
  await closePool();
});

describe("registration", () => {
  it("creates a student and signs them in straight away", async () => {
    const { status, body } = await api("/auth/register", {
      method: "POST",
      body: {
        name: "ນັກຮຽນ ຄຳລ້າ",
        email: "khamla@laolearn.la",
        password: "laolearn2026",
        role: "student",
      },
    });

    assert.equal(status, 201);
    assert.equal(body.user.role, "student");
    assert.equal(body.user.name, "ນັກຮຽນ ຄຳລ້າ", "Lao names must survive the round trip");
    assert.ok(body.token, "a new account should be logged in immediately");
  });

  it("never returns the password hash", async () => {
    const registered = await registerUser(api);

    assert.equal(registered.user.password_hash, undefined);
    assert.ok(
      !JSON.stringify(registered).includes("$2"),
      "no bcrypt hash anywhere in the response",
    );
  });

  it("rejects a duplicate email regardless of letter case", async () => {
    await registerUser(api, { email: "somchai@laolearn.la" });

    const { status, body } = await api("/auth/register", {
      method: "POST",
      body: {
        name: "Someone Else",
        email: "SOMCHAI@LaoLearn.LA",
        password: "laolearn2026",
        role: "student",
      },
    });

    assert.equal(status, 409);
    assert.equal(body.error.code, "email_taken");
  });

  it("refuses to create an admin through the public form", async () => {
    const { status } = await api("/auth/register", {
      method: "POST",
      body: {
        name: "Sneaky",
        email: "sneaky@laolearn.la",
        password: "laolearn2026",
        role: "admin",
      },
    });

    assert.equal(status, 422, "admin must only be creatable from the server");
  });

  it("reports every invalid field at once, in Lao", async () => {
    const { status, body } = await api("/auth/register", {
      method: "POST",
      body: { name: "A", email: "not-an-email", password: "123", role: "student" },
    });

    assert.equal(status, 422);
    assert.deepEqual(Object.keys(body.error.details).sort(), ["email", "name", "password"]);
    assert.match(body.error.details.password[0], /[຀-໿]/, "message should be Lao");
  });
});

describe("login", () => {
  it("answers a wrong password and an unknown email identically", async () => {
    await registerUser(api, { email: "real@laolearn.la" });

    const wrongPassword = await api("/auth/login", {
      method: "POST",
      body: { email: "real@laolearn.la", password: "not-the-password" },
    });
    const unknownEmail = await api("/auth/login", {
      method: "POST",
      body: { email: "ghost@laolearn.la", password: "not-the-password" },
    });

    assert.equal(wrongPassword.status, 401);
    assert.equal(unknownEmail.status, 401);
    assert.deepEqual(
      wrongPassword.body.error,
      unknownEmail.body.error,
      "identical replies stop an attacker learning which emails exist",
    );
  });
});

describe("the current user", () => {
  it("is returned for a valid token", async () => {
    const { user, token } = await registerUser(api, { email: "me@laolearn.la" });
    const { status, body } = await api("/auth/me", { token });

    assert.equal(status, 200);
    assert.equal(body.user.id, user.id);
  });

  it("refuses a missing or tampered token", async () => {
    const { token } = await registerUser(api);

    assert.equal((await api("/auth/me")).status, 401);
    assert.equal((await api("/auth/me", { token: token.slice(0, -1) + "X" })).status, 401);
  });
});

describe("changing a password", () => {
  it("requires the current one, and the new one then works", async () => {
    const { user, token } = await registerUser(api, { email: "change@laolearn.la" });

    const wrong = await api("/auth/change-password", {
      method: "POST",
      token,
      body: { currentPassword: "wrong-one", newPassword: "brand-new-2026" },
    });
    assert.equal(wrong.status, 401);

    const ok = await api("/auth/change-password", {
      method: "POST",
      token,
      body: { currentPassword: "laolearn2026", newPassword: "brand-new-2026" },
    });
    assert.equal(ok.status, 200);

    const login = await api("/auth/login", {
      method: "POST",
      body: { email: user.email, password: "brand-new-2026" },
    });
    assert.equal(login.status, 200);
  });
});
