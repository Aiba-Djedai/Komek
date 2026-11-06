import { test } from "node:test";
import assert from "node:assert/strict";
import {
  groupParticipations,
  participationEnd,
} from "../src/lib/participation.ts";

const now = Date.parse("2026-11-06T10:00:00Z");
const application = (id, status, startHours, hours = 3) => ({
  id,
  status,
  starts_at: new Date(now + startHours * 3_600_000).toISOString(),
  hours,
});

test("participations remain upcoming during an event and finish exactly at its end", () => {
  const a = application(1, "confirmed", -2);
  assert.equal(participationEnd(a), now + 3_600_000);
  assert.deepEqual(groupParticipations([a], now).upcoming, [a]);
  assert.deepEqual(groupParticipations([a], participationEnd(a)).completed, [
    a,
  ]);
});

test("upcoming includes active applications; completed requires confirmed participation", () => {
  const list = [
    application(1, "pending", 3),
    application(2, "accepted", 3),
    application(3, "confirmed", 3),
    application(4, "declined", 3),
    application(5, "pending", -4),
    application(6, "accepted", -4),
    application(7, "confirmed", -4),
    application(8, "declined", -4),
  ];
  const groups = groupParticipations(list, now);
  assert.deepEqual(
    groups.upcoming.map((a) => a.id),
    [1, 2, 3],
  );
  assert.deepEqual(
    groups.completed.map((a) => a.id),
    [7],
  );
});

test("participation lists sort by nearest start and most recent completion without mutating input", () => {
  const list = [
    application(1, "confirmed", 5),
    application(2, "confirmed", -8),
    application(3, "pending", 1),
    application(4, "confirmed", -4),
  ];
  const groups = groupParticipations(list, now);
  assert.deepEqual(
    groups.upcoming.map((a) => a.id),
    [3, 1],
  );
  assert.deepEqual(
    groups.completed.map((a) => a.id),
    [4, 2],
  );
  assert.deepEqual(
    list.map((a) => a.id),
    [1, 2, 3, 4],
  );
});
