import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { openDb } from "../server/db.js";
import { createApp } from "../server/app.js";
const db = openDb(":memory:");
const app = createApp(db);
let server, base;
before(async () => {
  server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => {
  server.close();
  db.close();
});
async function request(path, { method = "GET", body, cookie } = {}) {
  const r = await fetch(base + "/api" + path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const type = r.headers.get("content-type") || "";
  return {
    status: r.status,
    data: type.includes("json") ? await r.json() : await r.text(),
    cookie: r.headers.get("set-cookie")?.split(";")[0],
  };
}
let counter = 0;
async function register(role = "volunteer") {
  const r = await request("/auth/register", {
    method: "POST",
    body: {
      role,
      name: "Test Person",
      email: `person${++counter}@example.com`,
      password: "SecurePassword123!",
      consent: true,
      university: "Test University",
      contact: "@test_contact",
    },
  });
  assert.equal(r.status, 200);
  return r;
}
const future = (days) => new Date(Date.now() + days * 86400000).toISOString();
const eventBody = () => ({
  title: "Test volunteer event",
  description: "A meaningful volunteer event for our community.",
  category: "eco",
  location: "Almaty test park",
  starts_at: future(5),
  deadline: future(3),
  hours: 3,
  capacity: 1,
  image: "/images/planting.png",
  requirements: "Bring water.",
});
async function createEvent(org, overrides = {}) {
  const r = await request("/events", {
    method: "POST",
    cookie: org.cookie,
    body: { ...eventBody(), ...overrides },
  });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  return r.data.event;
}
async function apply(vol, e, overrides = {}) {
  return request(`/events/${e.id}/applications`, {
    method: "POST",
    cookie: vol.cookie,
    body: {
      full_name: "Test Person",
      university: "Test University",
      contact: "@test_contact",
      consent: true,
      motivation: "Happy to help",
      ...overrides,
    },
  });
}
test("registration requires consent in three independent attempts", async () => {
  for (let i = 0; i < 3; i++) {
    const r = await request("/auth/register", {
      method: "POST",
      body: {
        role: "volunteer",
        name: "Consent Test",
        email: `consent${i}@example.com`,
        password: "Password123!",
      },
    });
    assert.equal(r.status, 400);
  }
  assert.equal(db.prepare("SELECT count(*) n FROM users").get().n, 0);
});
test("session authentication, hashed password, login, logout and expiration", async () => {
  const u = await register();
  assert.match(u.cookie, /komek_session=/);
  assert.equal(u.data.user.password, undefined);
  const raw = db
    .prepare("SELECT password FROM users WHERE id=?")
    .get(u.data.user.id).password;
  assert.notEqual(raw, "SecurePassword123!");
  assert.equal(
    (await request("/auth/me", { cookie: u.cookie })).data.user.id,
    u.data.user.id,
  );
  const bad = await request("/auth/login", {
    method: "POST",
    body: { email: u.data.user.email, password: "incorrect" },
  });
  assert.equal(bad.status, 401);
  const login = await request("/auth/login", {
    method: "POST",
    body: { email: u.data.user.email, password: "SecurePassword123!" },
  });
  assert.equal(login.status, 200);
  await request("/auth/logout", { method: "POST", cookie: login.cookie });
  assert.equal(
    (await request("/auth/me", { cookie: login.cookie })).data.user,
    null,
  );
  db.prepare("UPDATE sessions SET expires=? WHERE user_id=?").run(
    "2000-01-01T00:00:00.000Z",
    u.data.user.id,
  );
  assert.equal(
    (await request("/auth/me", { cookie: u.cookie })).data.user,
    null,
  );
});
test("only organizations can create events, and invalid dates are rejected", async () => {
  const v = await register(),
    o = await register("organization");
  assert.equal(
    (
      await request("/events", {
        method: "POST",
        cookie: v.cookie,
        body: eventBody(),
      })
    ).status,
    403,
  );
  assert.equal(
    (await request("/events", { method: "POST", body: eventBody() })).status,
    401,
  );
  assert.equal(
    (
      await request("/events", {
        method: "POST",
        cookie: o.cookie,
        body: { ...eventBody(), deadline: future(6) },
      })
    ).status,
    400,
  );
  const e = await createEvent(o);
  const found = await request(`/events/${e.id}`);
  assert.equal(found.data.event.title, e.title);
  assert.equal(found.data.event.application_count, 0);
});
test("applications require consent, reject duplicates, and respect deadlines and manual closure", async () => {
  const o = await register("organization"),
    v = await register(),
    e = await createEvent(o);
  for (let i = 0; i < 3; i++)
    assert.equal((await apply(v, e, { consent: false })).status, 400);
  assert.equal(
    db.prepare("SELECT count(*) n FROM applications WHERE event_id=?").get(e.id)
      .n,
    0,
  );
  assert.equal((await apply(v, e)).status, 201);
  assert.equal((await apply(v, e)).status, 409);
  assert.equal((await apply(o, e)).status, 403);
  const v2 = await register();
  await request(`/events/${e.id}`, {
    method: "PATCH",
    cookie: o.cookie,
    body: { closed: true },
  });
  assert.equal((await apply(v2, e)).status, 409);
  await request(`/events/${e.id}`, {
    method: "PATCH",
    cookie: o.cookie,
    body: { closed: false },
  });
  db.prepare("UPDATE events SET deadline=? WHERE id=?").run(
    "2000-01-01T00:00:00.000Z",
    e.id,
  );
  assert.equal((await apply(v2, e)).status, 409);
});
test("private applications, decisions, roster, and contacts are owner-scoped", async () => {
  const owner = await register("organization"),
    other = await register("organization"),
    v = await register(),
    e = await createEvent(owner),
    a = (await apply(v, e)).data.application;
  assert.equal((await request("/dashboard")).status, 401);
  assert.equal(
    (await request("/dashboard", { cookie: other.cookie })).data.applications
      .length,
    0,
  );
  assert.equal(
    (
      await request(`/applications/${a.id}/decision`, {
        method: "PATCH",
        cookie: other.cookie,
        body: { status: "accepted" },
      })
    ).status,
    403,
  );
  assert.equal(
    (await request(`/events/${e.id}/roster`, { cookie: other.cookie })).status,
    403,
  );
  assert.equal(
    (await request(`/events/${e.id}/roster`, { cookie: v.cookie })).status,
    403,
  );
  assert.equal(
    (
      await request(`/events/${e.id}`, {
        method: "PATCH",
        cookie: other.cookie,
        body: { closed: true },
      })
    ).status,
    403,
  );
});
test("capacity blocks excess acceptance without false notices; capacity can be raised", async () => {
  const o = await register("organization"),
    v1 = await register(),
    v2 = await register(),
    e = await createEvent(o);
  const a1 = (await apply(v1, e)).data.application,
    a2 = (await apply(v2, e)).data.application;
  assert.equal(
    (
      await request(`/applications/${a1.id}/decision`, {
        method: "PATCH",
        cookie: o.cookie,
        body: { status: "accepted" },
      })
    ).status,
    200,
  );
  const denied = await request(`/applications/${a2.id}/decision`, {
    method: "PATCH",
    cookie: o.cookie,
    body: { status: "accepted" },
  });
  assert.equal(denied.status, 409);
  assert.equal(
    db.prepare("SELECT status FROM applications WHERE id=?").get(a2.id).status,
    "pending",
  );
  assert.equal(
    db
      .prepare("SELECT count(*) n FROM notifications WHERE application_id=?")
      .get(a2.id).n,
    0,
  );
  assert.equal(
    (
      await request(`/events/${e.id}`, {
        method: "PATCH",
        cookie: o.cookie,
        body: { ...eventBody(), capacity: 2 },
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await request(`/applications/${a2.id}/decision`, {
        method: "PATCH",
        cookie: o.cookie,
        body: { status: "accepted" },
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await request(`/events/${e.id}`, {
        method: "PATCH",
        cookie: o.cookie,
        body: { ...eventBody(), capacity: 1 },
      })
    ).status,
    409,
  );
});
test("confirmation requires accepted status and the applicant identity", async () => {
  const o = await register("organization"),
    v1 = await register(),
    v2 = await register(),
    e = await createEvent(o),
    a = (await apply(v1, e)).data.application;
  assert.equal(
    (
      await request(`/applications/${a.id}/confirm`, {
        method: "POST",
        cookie: v1.cookie,
      })
    ).status,
    409,
  );
  await request(`/applications/${a.id}/decision`, {
    method: "PATCH",
    cookie: o.cookie,
    body: { status: "accepted" },
  });
  assert.equal(
    (
      await request(`/applications/${a.id}/confirm`, {
        method: "POST",
        cookie: v2.cookie,
      })
    ).status,
    403,
  );
  assert.equal(
    (await request(`/events/${e.id}/roster`, { cookie: o.cookie })).data.roster
      .length,
    0,
  );
  assert.equal(
    (
      await request(`/applications/${a.id}/confirm`, {
        method: "POST",
        cookie: v1.cookie,
      })
    ).status,
    200,
  );
  const roster = (await request(`/events/${e.id}/roster`, { cookie: o.cookie }))
    .data.roster;
  assert.equal(roster.length, 1);
  assert.ok(roster[0].confirmed_at);
  assert.equal(
    (
      await request(`/applications/${a.id}/confirm`, {
        method: "POST",
        cookie: v1.cookie,
      })
    ).status,
    409,
  );
  const csv = await request(`/events/${e.id}/roster?format=csv`, {
    cookie: o.cookie,
  });
  assert.equal(csv.status, 200);
  assert.match(csv.data, /Test Person/);
  assert.match(csv.data, /'@test_contact/);
});
test("10-application dry run: exact decisions, timestamped notices and only confirmed volunteers on roster", async () => {
  const o = await register("organization"),
    e = await createEvent(o, { capacity: 10 });
  const volunteers = [];
  for (let i = 0; i < 10; i++) {
    const v = await register(),
      r = await apply(v, e);
    assert.equal(r.status, 201);
    volunteers.push([v, r.data.application]);
  }
  for (let i = 0; i < 10; i++) {
    const [v, a] = volunteers[i],
      status = i < 7 ? "accepted" : "declined";
    assert.equal(
      (
        await request(`/applications/${a.id}/decision`, {
          method: "PATCH",
          cookie: o.cookie,
          body: { status },
        })
      ).status,
      200,
    );
    const row = db.prepare("SELECT * FROM applications WHERE id=?").get(a.id);
    assert.equal(row.status, status);
    assert.ok(row.decision_at);
    assert.equal(row.notice_sent_at, null);
    const n = (await request("/notifications", { cookie: v.cookie })).data
      .notifications;
    assert.equal(n.length, 1);
    assert.match(
      n[0].message,
      status === "accepted" ? /одобрена/ : /отклонена/,
    );
    assert.ok(n[0].created_at);
    await request(`/applications/${a.id}/notice`, {
      method: "POST",
      cookie: o.cookie,
    });
    const sent = db
      .prepare("SELECT notice_sent_at FROM applications WHERE id=?")
      .get(a.id).notice_sent_at;
    assert.ok(sent);
    await request(`/applications/${a.id}/notice`, {
      method: "POST",
      cookie: o.cookie,
    });
    assert.equal(
      db.prepare("SELECT notice_sent_at FROM applications WHERE id=?").get(a.id)
        .notice_sent_at,
      sent,
    );
    if (i < 4)
      assert.equal(
        (
          await request(`/applications/${a.id}/confirm`, {
            method: "POST",
            cookie: v.cookie,
          })
        ).status,
        200,
      );
    else if (i >= 7)
      assert.equal(
        (
          await request(`/applications/${a.id}/confirm`, {
            method: "POST",
            cookie: v.cookie,
          })
        ).status,
        409,
      );
  }
  const roster = (await request(`/events/${e.id}/roster`, { cookie: o.cookie }))
    .data.roster;
  assert.equal(roster.length, 4);
  const pendingConfirmation = db
    .prepare(
      "SELECT count(*) n FROM applications WHERE event_id=? AND status='accepted'",
    )
    .get(e.id).n;
  assert.equal(pendingConfirmation, 3);
  assert.equal(
    db
      .prepare(
        "SELECT count(*) n FROM notifications WHERE application_id IN (SELECT id FROM applications WHERE event_id=?)",
      )
      .get(e.id).n,
    10,
  );
});
test("notifications are private and read status is recorded", async () => {
  const v = await register();
  assert.deepEqual(
    (await request("/notifications", { cookie: v.cookie })).data.notifications,
    [],
  );
  assert.equal((await request("/notifications")).status, 401);
  assert.equal(
    (await request("/notifications/read", { method: "POST", cookie: v.cookie }))
      .status,
    200,
  );
});
test("profile persists edits without exposing passwords", async () => {
  const v = await register();
  const r = await request("/profile", {
    method: "PATCH",
    cookie: v.cookie,
    body: {
      name: "Updated Name",
      contact: "@new_contact",
      university: "New University",
      bio: "Happy to help",
    },
  });
  assert.equal(r.status, 200);
  assert.equal(r.data.user.name, "Updated Name");
  assert.equal(r.data.user.password, undefined);
  assert.equal(
    (await request("/auth/me", { cookie: v.cookie })).data.user.bio,
    "Happy to help",
  );
});
