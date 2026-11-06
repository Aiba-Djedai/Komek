import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { openDb, seed } from "../server/db.js";
import { createApp } from "../server/app.js";
const db = openDb(":memory:");
seed(db);
const app = createApp(db);
let server, base;
before(async () => {
  server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => {
  server.close();
  db.close();
});
async function login(email) {
  const response = await fetch(base + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "Komek2026!" }),
  });
  assert.equal(response.status, 200);
  return response.headers.get("set-cookie").split(";")[0];
}

test("API errors respect requested language and retain a stable source for open forms", async () => {
  const texts = {
    ru: "Войдите в аккаунт, чтобы продолжить.",
    kk: "Жалғастыру үшін аккаунтқа кіріңіз.",
    en: "Log in to continue.",
  };
  for (const [language, expected] of Object.entries(texts)) {
    const response = await fetch(base + "/dashboard", {
      headers: { "Accept-Language": language },
    });
    assert.equal(response.status, 401);
    assert.match(response.headers.get("vary"), /Accept-Language/);
    const body = await response.json();
    assert.equal(body.error, expected);
    assert.equal(body.source_error, texts.ru);
  }
  const response = await fetch(base + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept-Language": "en-GB" },
    body: JSON.stringify({ email: "no@example.com", password: "Invalid123!" }),
  });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error, "Incorrect email or password.");
});

test("stored notifications are translated per recipient request without rewriting data or project titles", async () => {
  const cookie = await login("volunteer@komek.kz");
  const stored = db
    .prepare("SELECT message FROM notifications ORDER BY id")
    .all();
  for (const [language, word] of [
    ["ru", "одобрена"],
    ["kk", "мақұлданды"],
    ["en", "approved"],
  ]) {
    const response = await fetch(base + "/notifications", {
      headers: { cookie, "Accept-Language": language },
    });
    assert.equal(response.status, 200);
    const { notifications } = await response.json();
    assert.ok(notifications[0].message.includes(word));
    assert.ok(
      notifications[0].message.includes("Маленькая помощь. Большая забота."),
    );
    assert.equal(notifications[0].source_message, stored[0].message);
  }
  assert.deepEqual(
    db.prepare("SELECT message FROM notifications ORDER BY id").all(),
    stored,
  );
  const ruEvents = await (
    await fetch(base + "/events", { headers: { "Accept-Language": "ru" } })
  ).json();
  const enEvents = await (
    await fetch(base + "/events", { headers: { "Accept-Language": "en" } })
  ).json();
  assert.deepEqual(enEvents, ruEvents);
});

test("CSV localizes column headers using explicit selection while retaining access controls and raw participant data", async () => {
  const cookie = await login("org@komek.kz");
  const event = db.prepare("SELECT id FROM events ORDER BY id LIMIT 1").get();
  for (const [language, header] of [
    ["ru", "Имя"],
    ["kk", "Аты-жөні"],
    ["en", "Name"],
  ]) {
    const response = await fetch(
      `${base}/events/${event.id}/roster?format=csv&lang=${language}`,
      { headers: { cookie, "Accept-Language": "ru" } },
    );
    assert.equal(response.status, 200);
    assert.ok((await response.text()).includes(`"${header}"`));
  }
  const denied = await fetch(
    `${base}/events/${event.id}/roster?format=csv&lang=en`,
  );
  assert.equal(denied.status, 401);
});
