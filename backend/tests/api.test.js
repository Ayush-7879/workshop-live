// Integration tests for authentication, institute isolation and request hardening.
// They start the real server against a throwaway database, so a local MongoDB is required:
//   TEST_MONGO_URI=mongodb://localhost:27017 npm test
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");
const mongoose = require("mongoose");

const PORT = 5099;
const BASE = `http://localhost:${PORT}/api`;
const DB_NAME = `workshop-test-${Date.now()}`;
const MONGO_BASE = (process.env.TEST_MONGO_URI || "mongodb://localhost:27017").replace(/\/$/, "");

let server;
const ctx = {};

async function call(method, route, token, body) {
  const res = await fetch(BASE + route, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* empty body */
  }
  return { status: res.status, json };
}

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(`http://localhost:${PORT}/`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  throw new Error("Server did not start");
}

before(async () => {
  server = spawn(process.execPath, ["server.js"], {
    cwd: path.join(__dirname, ".."),
    env: {
      ...process.env,
      PORT: String(PORT),
      MONGO_URI: `${MONGO_BASE}/${DB_NAME}`,
      JWT_SECRET: "test-secret",
      CLIENT_URL: "http://localhost:5173",
      NODE_ENV: "production",
      AUTH_RATE_LIMIT_MAX: "1000",
    },
    stdio: "ignore",
  });
  await waitForServer();

  const a = await call("POST", "/auth/register-institute", null, {
    instituteName: "College A", name: "Admin A", email: "admin-a@test.dev", password: "secret1",
  });
  const b = await call("POST", "/auth/register-institute", null, {
    instituteName: "College B", name: "Admin B", email: "admin-b@test.dev", password: "secret1",
  });
  ctx.adminA = a.json.token;
  ctx.adminB = b.json.token;
  ctx.codesA = (await call("GET", "/institute/me", ctx.adminA)).json;
  ctx.codesB = (await call("GET", "/institute/me", ctx.adminB)).json;
  ctx.studentA = (
    await call("POST", "/auth/register", null, {
      name: "Student A", email: "student-a@test.dev", password: "secret1", role: "student", instituteCode: ctx.codesA.studentCode,
    })
  ).json.token;
  ctx.workshopB = (
    await call("POST", "/workshops", ctx.adminB, {
      title: "Workshop B", scheduledAt: new Date(Date.now() + 864e5).toISOString(),
    })
  ).json._id;
});

after(async () => {
  if (server) server.kill();
  const conn = await mongoose.createConnection(`${MONGO_BASE}/${DB_NAME}`).asPromise();
  await conn.dropDatabase();
  await conn.close();
});

test("registration needs a valid institute code and the code decides the role", async () => {
  let r = await call("POST", "/auth/register", null, { name: "X", email: "x1@test.dev", password: "secret1", role: "student" });
  assert.equal(r.status, 400);
  r = await call("POST", "/auth/register", null, { name: "X", email: "x2@test.dev", password: "secret1", role: "student", instituteCode: "wrong" });
  assert.equal(r.status, 403);
  r = await call("POST", "/auth/register", null, { name: "X", email: "x3@test.dev", password: "secret1", role: "admin", instituteCode: ctx.codesA.studentCode });
  assert.equal(r.status, 403, "a student code must not create an admin");
  r = await call("POST", "/auth/register", null, { name: "X", email: "x4@test.dev", password: "secret1", role: "student", instituteCode: { $ne: "" } });
  assert.equal(r.status, 400, "operator objects must be rejected");
  r = await call("POST", "/auth/register", null, { name: "X", email: "x5@test.dev", password: "123", role: "student", instituteCode: ctx.codesA.studentCode });
  assert.equal(r.status, 400, "short passwords are rejected by the server");
});

test("login rejects injected query objects", async () => {
  const r = await call("POST", "/auth/login", null, { email: { $gt: "" }, password: "x" });
  assert.equal(r.status, 400);
});

test("each institute only sees its own workshops", async () => {
  const a = await call("GET", "/workshops", ctx.adminA);
  const b = await call("GET", "/workshops", ctx.adminB);
  assert.equal(a.json.length, 0);
  assert.equal(b.json.length, 1);
  const s = await call("GET", "/workshops", ctx.studentA);
  assert.equal(s.json.length, 0);
});

test("another institute cannot read or change a workshop", async () => {
  assert.equal((await call("GET", `/workshops/${ctx.workshopB}`, ctx.adminA)).status, 404);
  assert.equal((await call("PATCH", `/workshops/${ctx.workshopB}/status`, ctx.adminA, { status: "live" })).status, 404);
  assert.equal((await call("DELETE", `/workshops/${ctx.workshopB}`, ctx.adminA)).status, 404);
  assert.equal((await call("POST", `/workshops/${ctx.workshopB}/join`, ctx.studentA)).status, 404);
  assert.equal((await call("POST", "/quizzes", ctx.adminA, {
    workshopId: ctx.workshopB, title: "q", questions: [{ text: "?", options: ["a", "b"], correctIndex: 0 }],
  })).status, 404);
});

test("only admins can read institute codes", async () => {
  assert.equal((await call("GET", "/institute/me", ctx.studentA)).status, 403);
  assert.equal((await call("GET", "/institute/me")).status, 401);
});

test("regenerating a code invalidates the old one", async () => {
  const before = ctx.codesA.studentCode;
  const r = await call("POST", "/institute/regenerate", ctx.adminA, { which: "student" });
  assert.equal(r.status, 200);
  assert.notEqual(r.json.studentCode, before);
  const old = await call("POST", "/auth/register", null, {
    name: "Late", email: "late@test.dev", password: "secret1", role: "student", instituteCode: before,
  });
  assert.equal(old.status, 403);
});

test("a malformed id returns an error response instead of crashing the server", async () => {
  const r = await call("GET", "/workshops/not-an-id", ctx.adminA);
  assert.ok([400, 404].includes(r.status), `unexpected status ${r.status}`);
  const alive = await fetch(`http://localhost:${PORT}/`);
  assert.equal(alive.status, 200);
});

test("unsafe links are rejected", async () => {
  const r = await call("POST", "/workshops", ctx.adminB, {
    title: "Bad link", scheduledAt: new Date(Date.now() + 864e5).toISOString(), meetLink: "javascript:alert(1)",
  });
  assert.equal(r.status, 400);
  const ok = await call("POST", "/workshops", ctx.adminB, {
    title: "Good link", scheduledAt: new Date(Date.now() + 864e5).toISOString(), meetLink: "https://meet.google.com/abc",
  });
  assert.equal(ok.status, 201);
});

test("security headers are set", async () => {
  const res = await fetch(`http://localhost:${PORT}/`);
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.ok(res.headers.get("strict-transport-security"));
});
