import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { openDb, seed } from "../server/db.js";
import { createApp } from "../server/app.js";
const db = openDb(":memory:");
seed(db);
const app = createApp(db);
let server, base, cookie;
before(async () => {
  server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  base = `http://127.0.0.1:${server.address().port}/api`;
  const r = await fetch(base + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "org@komek.kz", password: "Komek2026!" }),
  });
  assert.equal(r.status, 200);
  cookie = r.headers.get("set-cookie").split(";")[0];
});
after(() => {
  server.close();
  db.close();
});
const payload = (category) => ({
  title: "Новый проект команды",
  description: "Проведём полезное событие вместе с командой волонтёров.",
  category,
  city: "Қарағанды",
  location: "Центральная площадь",
  starts_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  deadline: new Date(Date.now() + 5 * 86400000).toISOString(),
  hours: 3,
  capacity: 10,
  image: "",
  requirements: "",
});
async function request(path, body, method = "POST") {
  const r = await fetch(base + path, {
    method,
    headers: { cookie, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: r.status, body: await r.json() };
}

test("organizations can publish and edit all new categories with a separate persistent city", async () => {
  for (const category of ["sports", "medical", "rescue"]) {
    const data = payload(category),
      r = await request("/events", data);
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.event.category, category);
    assert.equal(r.body.event.city, "Караганда");
    assert.equal(r.body.event.location, "Центральная площадь");
    const edited = await request(
      "/events/" + r.body.event.id,
      { ...data, city: "Astana", category: "sports" },
      "PATCH",
    );
    assert.equal(edited.status, 200);
    assert.equal(edited.body.event.city, "Астана");
    assert.equal(
      db.prepare("SELECT city FROM events WHERE id=?").get(r.body.event.id)
        .city,
      "Астана",
    );
  }
});

test("city validation rejects bad values and old clients can still infer or retain a known city", async () => {
  for (const city of ["", null, 100, "x", "x".repeat(101)])
    assert.equal(
      (await request("/events", { ...payload("rescue"), city })).status,
      400,
    );
  assert.equal(
    (await request("/events", { ...payload("invalid") })).status,
    400,
  );
  const oldClient = payload("sports");
  delete oldClient.city;
  oldClient.location = "Almaty sports ground";
  const r = await request("/events", oldClient);
  assert.equal(r.status, 201);
  assert.equal(r.body.event.city, "Алматы");
  const edited = await request(
    "/events/" + r.body.event.id,
    { ...oldClient, location: "Стадион Центральный" },
    "PATCH",
  );
  assert.equal(edited.status, 200);
  assert.equal(edited.body.event.city, "Алматы");
  assert.equal(
    (
      await request("/events", {
        ...oldClient,
        location: "Неизвестный стадион",
      })
    ).status,
    400,
  );
});
