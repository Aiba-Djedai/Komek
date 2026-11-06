import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDb, seed } from "../server/db.js";
import {
  categoryDefinitions,
  inferCity,
  normalizeCity,
} from "../shared/catalog.ts";
import { messages } from "../shared/messages.ts";
import {
  filterCatalog,
  defaultCatalogFilters,
  unspecifiedCity,
} from "../src/lib/catalog.ts";
const now = Date.parse("2028-06-01T10:00:00Z");
const event = (id, category, city, days, extra = {}) => ({
  id,
  category,
  city,
  title: "Проект " + id,
  description: "Помощь сообществу",
  organization: "Команда",
  location: "Центральный парк",
  starts_at: new Date(now + days * 86400000).toISOString(),
  deadline: new Date(now + (days - 1) * 86400000).toISOString(),
  occupied: 0,
  capacity: 10,
  closed: 0,
  ...extra,
});
const events = [
  event(1, "sports", "Астана", 4),
  event(2, "medical", "Алматы", 3),
  event(3, "rescue", "Астана", 7),
  event(4, "eco", "Алматы", 5),
  event(5, "sports", "Астана", -3),
  event(6, "rescue", "", 9),
  event(7, "medical", "Астана", -10),
  event(8, "medical", "Астана", 6, { closed: 1 }),
  event(9, "sports", "Астана", 8, { occupied: 10 }),
];
const filter = (patch = {}, favorites = null) =>
  filterCatalog(
    events,
    { ...defaultCatalogFilters, ...patch },
    favorites,
    now,
  ).map((e) => e.id);

test("catalog combines categories with OR and city, period, search and favorites with AND", () => {
  assert.deepEqual(
    filter({ categories: ["sports", "rescue"], city: "Астана" }),
    [1, 3],
  );
  assert.deepEqual(
    filter({ categories: ["sports", "rescue"], city: "Астана" }, [3]),
    [3],
  );
  assert.deepEqual(filter({ categories: ["medical"], city: "Астана" }), []);
  assert.deepEqual(
    filter({ categories: ["medical"], city: "Астана", period: "future" }),
    [8],
  );
  assert.deepEqual(filter({ city: unspecifiedCity }), [6]);
  assert.deepEqual(filter({ search: "  ASTANA  " }), [1, 3]);
  assert.deepEqual(filter({ search: "Қарағанды" }), []);
  assert.deepEqual(filter({ city: "Астана", period: "past" }), [5, 7]);
});

test("nearest order uses event dates and completed events show most recent first; unchecked shows newest records", () => {
  assert.deepEqual(
    filter({ categories: ["sports", "medical", "rescue"] }),
    [2, 1, 3, 6],
  );
  assert.deepEqual(
    filter({ nearest: false, categories: ["sports", "medical", "rescue"] }),
    [6, 3, 2, 1],
  );
  assert.deepEqual(filter({ period: "past" }), [5, 7]);
  assert.deepEqual(filter({ period: "past", nearest: false }), [7, 5]);
  assert.deepEqual(
    events.map((e) => e.id),
    [1, 2, 3, 4, 5, 6, 7, 8, 9],
  );
});

test("new directions and city names have translations; city aliases normalize without mistaking a street name", () => {
  for (const { label } of categoryDefinitions)
    assert.ok(messages[label], label);
  assert.equal(normalizeCity("  Almaty "), "Алматы");
  assert.equal(normalizeCity("Қарағанды"), "Караганда");
  assert.equal(inferCity("г. Астана, городской парк"), "Астана");
  assert.equal(inferCity("Almaty test park"), "Алматы");
  assert.equal(inferCity("Площадь, Өскемен"), "Усть-Каменогорск");
  assert.equal(inferCity("Алматинская улица"), "");
  assert.equal(normalizeCity("  Новый   город "), "Новый город");
});

test("legacy database migration backfills known cities, preserves all data and can reopen safely", () => {
  const directory = mkdtempSync(join(tmpdir(), "komek-city-migration-"));
  const path = join(directory, "legacy.sqlite");
  let db;
  try {
    db = openDb(path);
    seed(db);
    db.prepare("UPDATE events SET location=? WHERE id=1").run(
      "Незнакомый адрес",
    );
    db.prepare("UPDATE events SET location=? WHERE id=2").run(
      "Astana, animal shelter",
    );
    const applications = db
      .prepare("SELECT * FROM applications ORDER BY id")
      .all();
    db.exec("ALTER TABLE events DROP COLUMN city");
    db.close();
    db = openDb(path);
    assert.equal(
      db.prepare("SELECT city FROM events WHERE id=1").get().city,
      "",
    );
    assert.equal(
      db.prepare("SELECT city FROM events WHERE id=2").get().city,
      "Астана",
    );
    assert.equal(
      db.prepare("SELECT city FROM events WHERE id=3").get().city,
      "Алматы",
    );
    assert.deepEqual(
      db.prepare("SELECT * FROM applications ORDER BY id").all(),
      applications,
    );
    assert.equal(db.prepare("SELECT count(*) n FROM users").get().n, 6);
    assert.equal(db.prepare("SELECT count(*) n FROM events").get().n, 7);
    db.prepare("UPDATE events SET city=? WHERE id=1").run("Тараз");
    db.close();
    db = openDb(path);
    assert.equal(
      db.prepare("SELECT city FROM events WHERE id=1").get().city,
      "Тараз",
    );
    assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
  } finally {
    db?.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
