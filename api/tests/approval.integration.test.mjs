// Uses a disposable local database; never changes the configured application database.
import "dotenv/config";
import assert from "node:assert/strict";
import { before, after, test, mock } from "node:test";
import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { once } from "node:events";
import pg from "pg";
import jwt from "jsonwebtoken";

const source = new URL(process.env.DATABASE_URL);
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(source.hostname), "Integration tests require a local PostgreSQL server");
const dbName = `kavreo_approval_test_${randomUUID().replaceAll("-", "")}`;
const testUrl = new URL(source);
testUrl.pathname = `/${dbName}`;
const admin = new pg.Client({ connectionString: source.href });
let created = false, server, prisma, base;
let approver;
const tokens = {};

async function request(path, method = "GET", body, role = "USER") {
  const response = await fetch(`${base}/api${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(role ? { Authorization: `Bearer ${tokens[role]}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}
async function success(path, method, body, role, status = 200) {
  const result = await request(path, method, body, role);
  assert.equal(result.status, status, JSON.stringify(result.body));
  return result.body.data;
}
const setApproval = (enabled) => success("/settings", "PATCH", { approvalEnabled: enabled }, "SUPERADMIN");
const contentPayload = (type, extra = {}) => ({ type, title: `Test ${type}`, body: type === "SCRIPT" ? "<p>Script lengkap</p>" : null, description: type === "IDEA" ? "<p>Ide lengkap</p>" : null, ...extra });
const calendarPayload = (extra = {}) => ({ title: "Test kalender", startDate: "2026-10-05", endDate: "2026-10-07", items: [{ date: "2026-10-05", title: "Jadwal pertama" }, { date: "2026-10-06", title: "Jadwal kedua" }], ...extra });

before(async () => {
  await admin.connect();
  await admin.query(`CREATE DATABASE "${dbName}"`);
  created = true;
  const setup = new pg.Client({ connectionString: testUrl.href });
  await setup.connect();
  try {
    const migrations = new URL("../prisma/migrations/", import.meta.url);
    for (const name of (await readdir(migrations)).filter((name) => /^\d+_/.test(name)).sort()) {
      await setup.query(await readFile(new URL(`${name}/migration.sql`, migrations), "utf8"));
    }
  } finally { await setup.end(); }
  process.env.DATABASE_URL = testUrl.href;
  process.env.NODE_ENV = "test";
  process.env.NOTIFY_EMAIL_ENABLED = "false";
  process.env.NOTIFY_WHATSAPP_ENABLED = "false";
  process.env.JWT_SECRET = "approval-integration-test-secret";
  ({ prisma } = await import("../src/lib/prisma.ts"));
  const { logger } = await import("../src/lib/logger.ts");
  logger.level = "silent";
  const { createApp } = await import("../src/app.ts");
  const users = [];
  for (const role of ["USER", "APPROVER", "SUPERADMIN"]) {
    const user = await prisma.user.create({ data: { name: `Test ${role}`, email: `${role.toLowerCase()}@example.test`, role, passwordHash: "unused" } });
    users.push(user);
    tokens[role] = jwt.sign({ sub: user.id, role }, process.env.JWT_SECRET);
  }
  approver = users[1];
  server = createApp().listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (prisma) await prisma.$disconnect();
  if (created) await admin.query(`DROP DATABASE "${dbName}"`);
  await admin.end();
});

test("settings default on, authenticated read, only Superadmin writes, boolean required", async () => {
  assert.equal((await success("/settings")).approvalEnabled, true);
  assert.equal((await request("/settings", "GET", undefined, null)).status, 401);
  for (const role of ["USER", "APPROVER"]) assert.equal((await request("/settings", "PATCH", { approvalEnabled: false }, role)).status, 403);
  assert.equal((await request("/settings", "PATCH", { approvalEnabled: "false" }, "SUPERADMIN")).status, 422);
  assert.equal((await setApproval(false)).approvalEnabled, false);
  assert.equal((await success("/settings")).approvalEnabled, false);
  await setApproval(true);
});

test("notification preferences: only Superadmin writes; other roles can still save profile", async () => {
  for (const role of ["USER", "APPROVER"]) {
    const original = await success("/auth/me", "GET", undefined, role);
    for (const field of ["notifyEmail", "notifyWhatsapp"]) {
      const result = await request("/auth/me", "PATCH", { name: "Should not save", [field]: !original[field] }, role);
      assert.equal(result.status, 403);
      const unchanged = await success("/auth/me", "GET", undefined, role);
      assert.equal(unchanged[field], original[field]);
      assert.equal(unchanged.name, original.name);
    }
    const saved = await success("/auth/me", "PATCH", { name: `Updated ${role}`, phone: "08123456789" }, role);
    assert.equal(saved.name, `Updated ${role}`);
    assert.equal(saved.notifyEmail, original.notifyEmail);
    assert.equal(saved.notifyWhatsapp, original.notifyWhatsapp);
  }
  const saved = await success("/auth/me", "PATCH", { notifyEmail: false, notifyWhatsapp: true }, "SUPERADMIN");
  assert.equal(saved.notifyEmail, false);
  assert.equal(saved.notifyWhatsapp, true);
});

for (const type of ["SCRIPT", "IDEA"]) {
  test(`${type}: draft without approver allowed; create-submit and existing submit rejected without approver`, async () => {
    await setApproval(true);
    const count = await prisma.content.count();
    const invalid = await request("/contents", "POST", contentPayload(type, { submit: true }));
    assert.equal(invalid.status, 400);
    assert.match(invalid.body.message, /minimal 1 approver/);
    assert.equal(await prisma.content.count(), count);
    const draft = await success("/contents", "POST", contentPayload(type), "USER", 201);
    assert.equal(draft.status, "DRAFT");
    assert.equal(draft.approvers.length, 0);
    assert.equal((await request(`/contents/${draft.id}/submit`, "POST", {})).status, 400);
    assert.equal((await success(`/contents/${draft.id}`)).status, "DRAFT");
  });

  test(`${type}: enabled review flow then revision auto-approval, fresh setting enforced`, async () => {
    await setApproval(true);
    const submitted = await success("/contents", "POST", contentPayload(type, { submit: true, approverIds: [approver.id] }), "USER", 201);
    assert.equal(submitted.status, "SUBMITTED");
    assert.equal(submitted.approvedAt, null);
    assert.equal(await prisma.notification.count({ where: { userId: approver.id, link: `/${type === "SCRIPT" ? "scripts" : "ideas"}/${submitted.id}` } }), 1);
    const revision = await success(`/contents/${submitted.id}/review`, "POST", { action: "REJECT", message: "Perbaiki konsep" }, "APPROVER");
    assert.equal(revision.status, "REVISION");
    await setApproval(false);
    const before = await prisma.notification.count({ where: { userId: approver.id } });
    const approved = await success(`/contents/${revision.id}/submit`, "POST", {});
    assert.equal(approved.status, "APPROVED");
    assert.ok(approved.approvedAt);
    assert.equal(approved.revisionCount, 1);
    assert.ok(approved.comments.some((comment) => comment.action === "APPROVE" && /otomatis/.test(comment.message)));
    assert.equal(await prisma.notification.count({ where: { userId: approver.id } }), before);
  });

  test(`${type}: off mode create-submit and draft-submit auto-approve without approver; empty content still rejected`, async () => {
    await setApproval(false);
    const direct = await success("/contents", "POST", contentPayload(type, { submit: true }), "USER", 201);
    assert.equal(direct.status, "APPROVED");
    assert.ok(direct.approvedAt);
    const draft = await success("/contents", "POST", contentPayload(type), "USER", 201);
    assert.equal(draft.status, "DRAFT");
    const approved = await success(`/contents/${draft.id}/submit`, "POST", {});
    assert.equal(approved.status, "APPROVED");
    assert.equal(approved.approvers.length, 0);
    assert.equal((await request(`/contents/${draft.id}/submit`, "POST", {})).status, 400);
    assert.equal((await request("/contents", "POST", { type, title: "Konten kosong", submit: true })).status, 400);
  });
}

test("calendar: draft allowed without approver; both submit paths enforce mandatory selection", async () => {
  await setApproval(true);
  const rejected = await request("/calendars", "POST", calendarPayload({ submit: true }));
  assert.equal(rejected.status, 400);
  assert.match(rejected.body.message, /minimal 1 approver/);
  const draft = await success("/calendars", "POST", calendarPayload(), "USER", 201);
  assert.equal(draft.status, "DRAFT");
  assert.ok(draft.items.every((item) => item.status === "DRAFT"));
  assert.equal((await request(`/calendars/${draft.id}/submit`, "POST", {})).status, 400);
  assert.equal((await success(`/calendars/${draft.id}`)).status, "DRAFT");
});

test("calendar: enabled review flow; changing settings does not approve pending data", async () => {
  await setApproval(true);
  const submitted = await success("/calendars", "POST", calendarPayload({ submit: true, approverIds: [approver.id] }), "USER", 201);
  assert.equal(submitted.status, "SUBMITTED");
  assert.ok(submitted.items.every((item) => item.status === "PENDING"));
  await setApproval(false);
  assert.equal((await success(`/calendars/${submitted.id}`)).status, "SUBMITTED");
  await success(`/calendars/${submitted.id}/items/${submitted.items[0].id}/review`, "POST", { action: "APPROVE" }, "APPROVER");
  const revision = await success(`/calendars/${submitted.id}/items/${submitted.items[1].id}/review`, "POST", { action: "REJECT", note: "Perbaiki jadwal" }, "APPROVER");
  assert.equal(revision.status, "REVISION");
  const approvedItem = revision.items.find((item) => item.status === "APPROVED");
  const before = await prisma.notification.count({ where: { userId: approver.id } });
  const approved = await success(`/calendars/${revision.id}/submit`, "POST", {});
  assert.equal(approved.status, "APPROVED");
  assert.ok(approved.approvedAt);
  assert.ok(approved.items.every((item) => item.status === "APPROVED"));
  assert.equal(approved.items.find((item) => item.id === approvedItem.id).reviewedBy.id, approver.id);
  assert.equal(await prisma.notification.count({ where: { userId: approver.id } }), before);
});

test("calendar: off mode auto-approves all schedules on create and existing submit; empty calendar rejected", async () => {
  await setApproval(false);
  const direct = await success("/calendars", "POST", calendarPayload({ submit: true }), "USER", 201);
  assert.equal(direct.status, "APPROVED");
  assert.ok(direct.items.every((item) => item.status === "APPROVED" && item.reviewedAt && item.reviewedBy === null));
  const draft = await success("/calendars", "POST", calendarPayload(), "USER", 201);
  assert.equal(draft.status, "DRAFT");
  const approved = await success(`/calendars/${draft.id}/submit`, "POST", {});
  assert.equal(approved.status, "APPROVED");
  assert.ok(approved.items.every((item) => item.status === "APPROVED"));
  assert.ok(approved.comments.some((comment) => comment.action === "APPROVE" && /otomatis/.test(comment.message)));
  assert.equal((await request("/calendars", "POST", calendarPayload({ items: [], submit: true }))).status, 400);
});

test("enabled existing submits reject inactive approvers and do not change drafts", async () => {
  await setApproval(true);
  for (const kind of ["contents", "calendars"]) {
    const payload = kind === "contents" ? contentPayload("SCRIPT", { approverIds: [approver.id] }) : calendarPayload({ approverIds: [approver.id] });
    const draft = await success(`/${kind}`, "POST", payload, "USER", 201);
    await prisma.user.update({ where: { id: approver.id }, data: { isActive: false } });
    const result = await request(`/${kind}/${draft.id}/submit`, "POST", {});
    assert.equal(result.status, 400);
    assert.match(result.body.message, /tidak valid atau tidak aktif/);
    await prisma.user.update({ where: { id: approver.id }, data: { isActive: true } });
    assert.equal((await success(`/${kind}/${draft.id}`)).status, "DRAFT");
  }
});

const aiConfigPayload = (extra = {}) => ({ enabled: true, protocol: "OLLAMA", providerName: "Test Ollama", baseUrl: "http://127.0.0.1:11435", model: "test-model", maxTokens: 200, dailyLimit: 100, timeoutSec: 10, inputPrice: 0, outputPrice: 0, ...extra });
const aiPrompt = { feature: "SCRIPT", title: "Ide pagi kreator", platform: "TIKTOK", currentText: "PRIVATE_DRAFT_DO_NOT_STORE", instruction: "Singkat" };
function providerMock(t, handler) {
  const actualFetch = globalThis.fetch;
  const stub = mock.method(globalThis, "fetch", (url, options) => {
    const target = String(url);
    if (target.startsWith("http://127.0.0.1:11435") || target.startsWith("https://ai.example.test")) return handler(target, options);
    return actualFetch(url, options);
  });
  t.after(() => stub.mock.restore());
}

test("AI settings and monitoring restricted to Superadmin; suggestions restricted to User", async () => {
  for (const role of ["USER", "APPROVER"]) {
    assert.equal((await request("/ai/settings", "GET", undefined, role)).status, 403);
    assert.equal((await request("/ai/settings", "PATCH", aiConfigPayload(), role)).status, 403);
    assert.equal((await request("/ai/usage", "GET", undefined, role)).status, 403);
  }
  assert.equal((await request("/ai/suggest", "POST", aiPrompt, "APPROVER")).status, 403);
  assert.equal((await request("/ai/suggest", "POST", aiPrompt, "SUPERADMIN")).status, 403);
  assert.equal((await request("/ai/settings", "PATCH", aiConfigPayload({ protocol: "OPENAI_COMPATIBLE", baseUrl: "http://example.test" }), "SUPERADMIN")).status, 422);
  await success("/ai/settings", "PATCH", aiConfigPayload(), "SUPERADMIN");
});

test("Ollama suggestions return preview and record per-user tokens without storing draft or creating content", async (t) => {
  const originalCount = await prisma.content.count();
  providerMock(t, async (url, options) => {
    assert.equal(url, "http://127.0.0.1:11435/api/chat");
    const body = JSON.parse(options.body);
    assert.equal(body.stream, false);
    assert.equal(body.options.num_predict, 200);
    return Response.json({ message: { content: "<think>private thought</think>Ini saran script." }, prompt_eval_count: 120, eval_count: 80 });
  });
  const result = await success("/ai/suggest", "POST", aiPrompt);
  assert.equal(result.text, "Ini saran script.");
  const usage = await prisma.aiUsage.findUniqueOrThrow({ where: { id: result.usageId } });
  assert.equal(usage.status, "SUCCESS");
  assert.equal(usage.inputTokens, 120);
  assert.equal(usage.outputTokens, 80);
  assert.equal(usage.costUsd, 0);
  assert.equal(usage.userId, (await success("/auth/me")).id);
  assert.ok(!JSON.stringify(usage).includes("PRIVATE_DRAFT_DO_NOT_STORE"));
  assert.equal(await prisma.content.count(), originalCount);
  const dashboard = await success("/ai/usage", "GET", undefined, "SUPERADMIN");
  assert.ok(dashboard.rows.some((row) => row.id === usage.userId && row.requests >= 1));
  assert.ok(dashboard.logs.some((log) => log.id === usage.id));
});

test("Cloud compatible API encrypts keys, records estimates, and treats missing usage as unknown", async (t) => {
  const settings = await success("/ai/settings", "PATCH", aiConfigPayload({ protocol: "OPENAI_COMPATIBLE", providerName: "Test cloud", baseUrl: "https://ai.example.test/v1", apiKey: "test-key-never-return", inputPrice: 1, outputPrice: 2 }), "SUPERADMIN");
  assert.equal(settings.hasApiKey, true);
  assert.ok(!JSON.stringify(settings).includes("test-key-never-return"));
  const stored = await prisma.applicationSettings.findUniqueOrThrow({ where: { id: "global" } });
  assert.ok(!stored.aiApiKey.includes("test-key-never-return"));
  let unknown = false;
  providerMock(t, async (url, options) => {
    assert.equal(url, "https://ai.example.test/v1/chat/completions");
    assert.equal(options.headers.Authorization, "Bearer test-key-never-return");
    return Response.json({ choices: [{ message: { content: "Ide baru" }, finish_reason: "stop" }], ...(unknown ? {} : { usage: { prompt_tokens: 100, completion_tokens: 50 } }) });
  });
  const result = await success("/ai/suggest", "POST", { ...aiPrompt, feature: "IDEA" });
  const usage = await prisma.aiUsage.findUniqueOrThrow({ where: { id: result.usageId } });
  assert.equal(usage.costUsd, 0.0002);
  unknown = true;
  const missing = await success("/ai/suggest", "POST", aiPrompt);
  const unknownUsage = await prisma.aiUsage.findUniqueOrThrow({ where: { id: missing.usageId } });
  assert.equal(unknownUsage.inputTokens, null);
  assert.equal(unknownUsage.costUsd, null);
  assert.ok((await success("/ai/usage", "GET", undefined, "SUPERADMIN")).unknownUsage >= 1);
  const changed = await request("/ai/settings", "PATCH", aiConfigPayload({ protocol: "OPENAI_COMPATIBLE", baseUrl: "https://ai.example.test/other" }), "SUPERADMIN");
  assert.equal(changed.status, 400); // No old key is forwarded to a changed host/path.
});

test("Claude adapter, provider failures, empty output, and stale reservations are recorded safely", async (t) => {
  const user = await success("/auth/me");
  const stale = await prisma.aiUsage.create({ data: { userId: user.id, feature: "SCRIPT", provider: "Interrupted test", model: "test", createdAt: new Date(Date.now() - 400000) } });
  await success("/ai/settings", "PATCH", aiConfigPayload({ protocol: "ANTHROPIC", baseUrl: "https://ai.example.test/v1", apiKey: "claude-test-key", providerName: "Claude test" }), "SUPERADMIN");
  let mode = "success";
  providerMock(t, async (url, options) => {
    assert.equal(url, "https://ai.example.test/v1/messages");
    assert.equal(options.headers["x-api-key"], "claude-test-key");
    const body = JSON.parse(options.body);
    assert.ok(body.system);
    if (mode === "error") return Response.json({ error: "SECRET_KEY_UPSTREAM" }, { status: 401 });
    return Response.json({ content: [{ type: "text", text: mode === "empty" ? "" : "Contoh ide" }], usage: { input_tokens: 120, output_tokens: 80 }, stop_reason: "max_tokens" });
  });
  const result = await success("/ai/suggest", "POST", aiPrompt);
  assert.equal((await prisma.aiUsage.findUniqueOrThrow({ where: { id: stale.id } })).errorCode, "INTERRUPTED");
  assert.equal(result.truncated, true);
  mode = "error";
  const rejected = await request("/ai/suggest", "POST", aiPrompt);
  assert.equal(rejected.status, 502);
  assert.ok(!JSON.stringify(rejected).includes("SECRET_KEY_UPSTREAM"));
  assert.ok(await prisma.aiUsage.count({ where: { status: "FAILED", errorCode: "HTTP_401" } }));
  mode = "empty";
  assert.equal((await request("/ai/suggest", "POST", aiPrompt)).status, 502);
  const empty = await prisma.aiUsage.findFirstOrThrow({ where: { errorCode: "EMPTY_RESPONSE" } });
  assert.equal(empty.outputTokens, 80); // billable usage retained even when text is empty
});

test("AI daily quota and disable switch cannot be bypassed; parallel requests reserve one slot per user", async (t) => {
  await success("/ai/settings", "PATCH", aiConfigPayload({ dailyLimit: 1 }), "SUPERADMIN");
  assert.equal((await request("/ai/suggest", "POST", aiPrompt)).status, 429);
  await success("/ai/settings", "PATCH", aiConfigPayload({ enabled: false }), "SUPERADMIN");
  assert.equal((await request("/ai/suggest", "POST", aiPrompt)).status, 400);
  await success("/ai/settings", "PATCH", aiConfigPayload(), "SUPERADMIN");
  // Call the real service to keep HTTP rate limiting separate from database reservation checks.
  const { suggest } = await import("../src/modules/ai/ai.service.ts");
  const user = await success("/auth/me");
  let started;
  const waitStarted = new Promise((resolve) => { started = resolve; });
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  providerMock(t, async () => { started(); await gate; return Response.json({ message: { content: "Berhasil" }, prompt_eval_count: 1, eval_count: 2 }); });
  const first = suggest(user, { ...aiPrompt, category: "", tone: "", durationSec: "" });
  await waitStarted;
  try { await assert.rejects(suggest(user, { ...aiPrompt, category: "", tone: "", durationSec: "" }), (error) => error.status === 429); }
  finally { release(); }
  await first;
});
