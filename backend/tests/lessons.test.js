/**
 * The rules that matter most on this project: who may change a lesson, and
 * what happens to an attachment when a lesson is edited.
 */
import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  closePool,
  createAdmin,
  registerUser,
  resetDatabase,
  startTestServer,
} from "./helpers/setup.js";

let server;
let api;
let admin;
let teacherA;
let teacherB;
let student;
let subjectId;

const ATTACHMENT = {
  url: "https://res.cloudinary.com/demo/image/upload/v1/a.pdf",
  publicId: "laolearn/a",
  resourceType: "image",
  name: "ໃບວຽກ.pdf",
  bytes: 1234,
  mime: "application/pdf",
};

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
  teacherA = await registerUser(api, { role: "teacher", name: "ອາຈານ ກ" });
  teacherB = await registerUser(api, { role: "teacher", name: "ອາຈານ ຂ" });
  student = await registerUser(api, { role: "student" });

  const { body } = await api("/subjects", {
    method: "POST",
    token: admin.token,
    body: { name: "ຄະນິດສາດ" },
  });
  subjectId = Number(body.subject.id);
});

/** Create a lesson as teacher A and return it. */
async function createLesson(overrides = {}) {
  const { status, body } = await api("/lessons", {
    method: "POST",
    token: teacherA.token,
    body: { subjectId, title: "ບົດທີ 1: ຈຳນວນເຕັມ", position: 1, ...overrides },
  });
  assert.equal(status, 201);
  return body.lesson;
}

describe("who may write a lesson", () => {
  it("lets a teacher create one and records the author", async () => {
    const lesson = await createLesson();
    assert.equal(lesson.subject_name, "ຄະນິດສາດ");
    assert.equal(lesson.author_name, "ອາຈານ ກ");
  });

  it("refuses a student", async () => {
    const { status } = await api("/lessons", {
      method: "POST",
      token: student.token,
      body: { subjectId, title: "ບໍ່ຄວນສ້າງໄດ້" },
    });
    assert.equal(status, 403);
  });

  it("refuses a subject that does not exist", async () => {
    const { status } = await api("/lessons", {
      method: "POST",
      token: teacherA.token,
      body: { subjectId: 999999, title: "x" },
    });
    assert.equal(status, 400);
  });
});

describe("ownership", () => {
  it("stops one teacher editing or deleting another's lesson", async () => {
    const lesson = await createLesson();

    const edit = await api(`/lessons/${lesson.id}`, {
      method: "PUT",
      token: teacherB.token,
      body: { title: "ຍຶດເອົາ" },
    });
    assert.equal(edit.status, 403);
    assert.equal(edit.body.error.code, "not_lesson_owner");

    const remove = await api(`/lessons/${lesson.id}`, {
      method: "DELETE",
      token: teacherB.token,
    });
    assert.equal(remove.status, 403);
  });

  it("lets the author edit their own", async () => {
    const lesson = await createLesson();
    const { status, body } = await api(`/lessons/${lesson.id}`, {
      method: "PUT",
      token: teacherA.token,
      body: { title: "ບົດທີ 1: ຈຳນວນເຕັມ (ປັບປຸງ)" },
    });
    assert.equal(status, 200);
    assert.match(body.lesson.title, /ປັບປຸງ/);
  });

  it("lets an admin edit anyone's", async () => {
    const lesson = await createLesson();
    const { status } = await api(`/lessons/${lesson.id}`, {
      method: "PUT",
      token: admin.token,
      body: { position: 5 },
    });
    assert.equal(status, 200);
  });
});

describe("students", () => {
  it("can read lessons but not write them", async () => {
    const lesson = await createLesson();

    assert.equal((await api("/lessons", { token: student.token })).status, 200);
    assert.equal((await api(`/lessons/${lesson.id}`, { token: student.token })).status, 200);
    assert.equal(
      (await api(`/lessons/${lesson.id}`, { method: "DELETE", token: student.token })).status,
      403,
    );
  });

  it("must be signed in at all", async () => {
    assert.equal((await api("/lessons")).status, 401);
  });
});

describe("the attachment field on update", () => {
  it("keeps the file when `file` is omitted", async () => {
    const lesson = await createLesson({ file: ATTACHMENT });

    const { body } = await api(`/lessons/${lesson.id}`, {
      method: "PUT",
      token: teacherA.token,
      body: { title: "ຊື່ໃໝ່" },
    });

    assert.equal(body.lesson.file_public_id, ATTACHMENT.publicId);
    assert.equal(body.lesson.file_name, "ໃບວຽກ.pdf");
  });

  it("removes the file when `file` is null", async () => {
    const lesson = await createLesson({ file: ATTACHMENT });

    const { body } = await api(`/lessons/${lesson.id}`, {
      method: "PUT",
      token: teacherA.token,
      body: { file: null },
    });

    assert.equal(body.lesson.file_url, null);
    assert.equal(body.lesson.file_public_id, null);
  });

  it("rejects a half-described file", async () => {
    const { status } = await api("/lessons", {
      method: "POST",
      token: teacherA.token,
      body: { subjectId, title: "x", file: { url: "not-a-url", publicId: "a", resourceType: "exe" } },
    });
    assert.equal(status, 422);
  });
});

describe("listing", () => {
  it("orders by position and pages", async () => {
    await createLesson({ title: "ບົດທີ 3", position: 3 });
    await createLesson({ title: "ບົດທີ 1", position: 1 });
    await createLesson({ title: "ບົດທີ 2", position: 2 });

    const all = await api(`/lessons?subjectId=${subjectId}`, { token: student.token });
    assert.deepEqual(
      all.body.lessons.map((l) => l.position),
      [1, 2, 3],
    );

    const paged = await api(`/lessons?subjectId=${subjectId}&limit=2&page=2`, {
      token: student.token,
    });
    assert.equal(paged.body.total, 3);
    assert.equal(paged.body.totalPages, 2);
    assert.equal(paged.body.lessons.length, 1);
    assert.equal(paged.body.lessons[0].position, 3);
  });

  it("never exposes the search_vector column", async () => {
    await createLesson();
    const { body } = await api("/lessons", { token: student.token });
    assert.equal(body.lessons[0].search_vector, undefined);
  });
});
