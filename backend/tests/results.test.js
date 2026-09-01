/**
 * A student's scores are their own. The endpoint takes no user id at all, so
 * these tests pin that down before the quiz feature is built on top of it.
 */
import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  closePool,
  createAdmin,
  query,
  registerUser,
  resetDatabase,
  startTestServer,
} from "./helpers/setup.js";

let server;
let api;
let admin;
let teacher;
let alice;
let bob;

before(async () => {
  server = await startTestServer();
  api = server.api;
});
after(async () => {
  await server.close();
  await closePool();
});

beforeEach(async () => {
  await resetDatabase();
  admin = await createAdmin(api);
  teacher = await registerUser(api, { role: "teacher" });
  alice = await registerUser(api, { role: "student", name: "ນັກຮຽນ ກ" });
  bob = await registerUser(api, { role: "student", name: "ນັກຮຽນ ຂ" });
});

/**
 * Quizzes have no API yet (phase 4), so a result is inserted directly.
 * The read path under test is the same one the finished feature will use.
 */
async function giveResult(user, { score, total = 5 }) {
  const subject = await api("/subjects", {
    method: "POST",
    token: admin.token,
    body: { name: `ວິຊາ ${Math.random().toString(36).slice(2, 7)}` },
  });
  const lesson = await api("/lessons", {
    method: "POST",
    token: teacher.token,
    body: { subjectId: Number(subject.body.subject.id), title: "ບົດທີ 1" },
  });

  const quiz = await query(
    "INSERT INTO quizzes (lesson_id, title) VALUES ($1, $2) RETURNING id",
    [lesson.body.lesson.id, "ແບບທົດສອບທ້າຍບົດ"],
  );
  await query(
    "INSERT INTO quiz_results (user_id, quiz_id, score, total_questions) VALUES ($1, $2, $3, $4)",
    [user.user.id, quiz.rows[0].id, score, total],
  );
}

describe("/results/me", () => {
  it("needs a token", async () => {
    assert.equal((await api("/results/me")).status, 401);
  });

  it("is empty, not null, for someone who has taken nothing", async () => {
    const { status, body } = await api("/results/me", { token: alice.token });

    assert.equal(status, 200);
    assert.deepEqual(body.results, []);
    assert.equal(body.summary.attempts, 0);
    assert.equal(body.summary.averagePercent, 0, "avg over no rows must read 0, not null");
  });

  it("returns only the caller's own results", async () => {
    await giveResult(alice, { score: 4 });
    await giveResult(bob, { score: 1 });

    const forAlice = await api("/results/me", { token: alice.token });
    const forBob = await api("/results/me", { token: bob.token });

    assert.equal(forAlice.body.results.length, 1);
    assert.equal(forAlice.body.results[0].percent, 80);

    assert.equal(forBob.body.results.length, 1);
    assert.equal(forBob.body.results[0].percent, 20);
  });

  it("ignores any user id someone tries to smuggle in", async () => {
    await giveResult(alice, { score: 5 });

    // Bob asks for Alice's id in every way the route might accept.
    const viaQuery = await api(`/results/me?userId=${alice.user.id}`, { token: bob.token });
    assert.equal(viaQuery.body.results.length, 0, "the id in the URL must be ignored");

    assert.equal((await api(`/results/${alice.user.id}`, { token: bob.token })).status, 404);
  });

  it("summarises attempts, average and best", async () => {
    await giveResult(alice, { score: 5 }); // 100%
    await giveResult(alice, { score: 2 }); // 40%

    const { body } = await api("/results/me", { token: alice.token });

    assert.equal(body.summary.attempts, 2);
    assert.equal(body.summary.quizzes, 2);
    assert.equal(body.summary.averagePercent, 70);
    assert.equal(body.summary.bestPercent, 100);
  });

  it("carries the lesson and subject with each score", async () => {
    await giveResult(alice, { score: 3 });
    const { body } = await api("/results/me", { token: alice.token });

    const row = body.results[0];
    assert.ok(row.lesson_title, "a score needs its lesson to mean anything");
    assert.ok(row.subject_name);
    assert.ok(row.quiz_title);
  });
});
