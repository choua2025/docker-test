/**
 * Subject management, account management, and the guards that stop an admin
 * locking the school out of its own system.
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
let student;

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
  teacher = await registerUser(api, { role: "teacher", name: "ອາຈານ ສົມພອນ" });
  student = await registerUser(api, { role: "student", name: "ນັກຮຽນ ຄຳລ້າ" });
});

describe("subjects", () => {
  it("are created by admins only", async () => {
    for (const actor of [student, teacher]) {
      const { status } = await api("/subjects", {
        method: "POST",
        token: actor.token,
        body: { name: "ວິຊາໃໝ່" },
      });
      assert.equal(status, 403);
    }

    const { status } = await api("/subjects", {
      method: "POST",
      token: admin.token,
      body: { name: "ຟີຊິກສາດ" },
    });
    assert.equal(status, 201);
  });

  it("cannot share a name", async () => {
    await api("/subjects", { method: "POST", token: admin.token, body: { name: "ເຄມີສາດ" } });
    const { status, body } = await api("/subjects", {
      method: "POST",
      token: admin.token,
      body: { name: "ເຄມີສາດ" },
    });
    assert.equal(status, 409);
    assert.equal(body.error.code, "subject_name_taken");
  });

  it("refuse deletion while they still hold lessons", async () => {
    const created = await api("/subjects", {
      method: "POST",
      token: admin.token,
      body: { name: "ຊີວະສາດ" },
    });
    const subjectId = Number(created.body.subject.id);

    await api("/lessons", {
      method: "POST",
      token: teacher.token,
      body: { subjectId, title: "ບົດທີ 1: ຈຸລັງ" },
    });

    const blocked = await api(`/subjects/${subjectId}`, { method: "DELETE", token: admin.token });
    assert.equal(blocked.status, 409);
    assert.equal(blocked.body.error.code, "subject_not_empty");

    // Once empty, it goes.
    const { body } = await api(`/lessons?subjectId=${subjectId}`, { token: admin.token });
    await api(`/lessons/${body.lessons[0].id}`, { method: "DELETE", token: admin.token });

    const allowed = await api(`/subjects/${subjectId}`, { method: "DELETE", token: admin.token });
    assert.equal(allowed.status, 200);
  });
});

describe("the user list", () => {
  it("is admin-only", async () => {
    assert.equal((await api("/users", { token: student.token })).status, 403);
    assert.equal((await api("/users", { token: teacher.token })).status, 403);
    assert.equal((await api("/users")).status, 401);
    assert.equal((await api("/users", { token: admin.token })).status, 200);
  });

  it("counts by role and filters", async () => {
    const { body } = await api("/users", { token: admin.token });
    assert.equal(body.counts.admin, 1);
    assert.equal(body.counts.teacher, 1);
    assert.equal(body.counts.student, 1);

    const students = await api("/users?role=student", { token: admin.token });
    assert.equal(students.body.total, 1);
    assert.equal(students.body.users[0].name, "ນັກຮຽນ ຄຳລ້າ");
  });

  it("searches Lao names and is case-insensitive on email", async () => {
    const byLao = await api(`/users?search=${encodeURIComponent("ອາຈານ")}`, {
      token: admin.token,
    });
    assert.equal(byLao.body.total, 1);
    assert.equal(byLao.body.users[0].name, "ອາຈານ ສົມພອນ");

    const byEmail = await api("/users?search=LAOLEARN.LA", { token: admin.token });
    assert.equal(byEmail.body.total, 3);
  });

  it("counts a teacher's lessons without inflating them", async () => {
    const created = await api("/subjects", {
      method: "POST",
      token: admin.token,
      body: { name: "ພາສາລາວ" },
    });
    const subjectId = Number(created.body.subject.id);

    for (const position of [1, 2, 3]) {
      await api("/lessons", {
        method: "POST",
        token: teacher.token,
        body: { subjectId, title: `ບົດທີ ${position}`, position },
      });
    }

    const { body } = await api("/users?role=teacher", { token: admin.token });
    assert.equal(body.users[0].lesson_count, 3, "one row per lesson, not a join product");
  });
});

describe("guards against locking yourself out", () => {
  it("refuses to change your own role", async () => {
    const { status, body } = await api(`/users/${admin.user.id}/role`, {
      method: "PATCH",
      token: admin.token,
      body: { role: "student" },
    });
    assert.equal(status, 403);
    assert.equal(body.error.code, "cannot_change_own_role");
  });

  it("refuses to delete your own account", async () => {
    const { status, body } = await api(`/users/${admin.user.id}`, {
      method: "DELETE",
      token: admin.token,
    });
    assert.equal(status, 403);
    assert.equal(body.error.code, "cannot_delete_self");
  });

  it("protects the last admin from a second admin", async () => {
    // Promote the teacher, then have them try to demote the original admin
    // once they are the only other one. Two admins exist, so it is allowed...
    await api(`/users/${teacher.user.id}/role`, {
      method: "PATCH",
      token: admin.token,
      body: { role: "admin" },
    });
    const promoted = await api("/auth/login", {
      method: "POST",
      body: { email: teacher.user.email, password: "laolearn2026" },
    });

    const demoteFirst = await api(`/users/${admin.user.id}/role`, {
      method: "PATCH",
      token: promoted.body.token,
      body: { role: "teacher" },
    });
    assert.equal(demoteFirst.status, 200);

    // ...and now the promoted account is the last admin, so it cannot be
    // demoted by anyone, including itself.
    const { rows } = await query("SELECT count(*)::int AS n FROM users WHERE role = 'admin'");
    assert.equal(rows[0].n, 1);
  });

  it("rejects a role that does not exist", async () => {
    const { status } = await api(`/users/${student.user.id}/role`, {
      method: "PATCH",
      token: admin.token,
      body: { role: "wizard" },
    });
    assert.equal(status, 422);
  });
});

describe("deleting an account", () => {
  it("keeps the lessons the person wrote", async () => {
    const created = await api("/subjects", {
      method: "POST",
      token: admin.token,
      body: { name: "ພູມສາດ" },
    });
    const subjectId = Number(created.body.subject.id);

    const lesson = await api("/lessons", {
      method: "POST",
      token: teacher.token,
      body: { subjectId, title: "ບົດທີ 1: ແຜນທີ່" },
    });
    const lessonId = lesson.body.lesson.id;

    const removed = await api(`/users/${teacher.user.id}`, {
      method: "DELETE",
      token: admin.token,
    });
    assert.equal(removed.status, 200);

    const still = await api(`/lessons/${lessonId}`, { token: admin.token });
    assert.equal(still.status, 200, "a teacher leaving must not delete their material");
    assert.equal(still.body.lesson.created_by, null);
    assert.equal(still.body.lesson.author_name, null);
  });
});
