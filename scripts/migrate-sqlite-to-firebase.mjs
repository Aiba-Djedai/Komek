import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { inferCity } from "../shared/catalog.ts";

const [source, projectId, ...flags] = process.argv.slice(2);
if (!source || !projectId || flags.some((flag) => flag !== "--apply")) {
  console.error(
    "Usage: npm run migrate:firebase -- <sqlite-file> <project-id> [--apply]",
  );
  process.exit(1);
}

function snapshot(path) {
  const sqlite = new DatabaseSync(path, { readOnly: true });
  try {
    sqlite.exec("BEGIN");
    return Object.fromEntries(
      ["users", "events", "applications", "notifications"].map((table) => [
        table,
        sqlite.prepare(`SELECT * FROM ${table} ORDER BY id`).all(),
      ]),
    );
  } finally {
    sqlite.close();
  }
}

const uidFor = (id) => `legacy-${id}`;
const timestamp = (value) =>
  value == null ? null : Timestamp.fromDate(new Date(value));
const isDemoAccount = (email) =>
  /^(org|volunteer|demo[1-4])@komek[.]kz$/.test(email);

const { users, events, applications, notifications } = snapshot(source);
const report = {
  users: users.length,
  disabledDemoAccounts: users.filter(({ email }) => isDemoAccount(email))
    .length,
  events: events.length,
  applications: applications.length,
  notifications: notifications.length,
};
console.log(JSON.stringify(report));
if (!flags.includes("--apply")) process.exit(0);

const app = initializeApp({ projectId });
const auth = getAuth(app);
const firestore = getFirestore(app);
const migration = firestore.doc("migrations/sqlite");
const fingerprint = createHash("sha256")
  .update(JSON.stringify([users, events, applications, notifications]))
  .digest("hex");

await firestore.runTransaction(async (transaction) => {
  const previous = await transaction.get(migration);
  if (previous.exists && previous.get("fingerprint") !== fingerprint)
    throw Error(
      "A different SQLite snapshot was already used for this project.",
    );
  if (!previous.exists)
    transaction.create(migration, { fingerprint, complete: false });
});

const hash = {
  algorithm: "STANDARD_SCRYPT",
  memoryCost: 16384,
  parallelization: 1,
  blockSize: 8,
  derivedKeyLength: 64,
};
for (let start = 0; start < users.length; start += 100) {
  const batch = users.slice(start, start + 100);
  const { users: found } = await auth.getUsers(
    batch.map(({ email }) => ({ email })),
  );
  const existing = new Map(found.map(({ email, uid }) => [email, uid]));
  if (
    batch.some(
      ({ id, email }) =>
        existing.has(email) && existing.get(email) !== uidFor(id),
    )
  )
    throw Error(
      "Some emails already belong to different Firebase accounts. Resolve them before migrating.",
    );
  const missing = batch.filter(({ email }) => !existing.has(email));
  if (!missing.length) continue;
  const result = await auth.importUsers(
    missing.map(({ id, name, email, password }) => {
      const [salt, digest] = password.split(":");
      return {
        uid: uidFor(id),
        displayName: name,
        email,
        disabled: isDemoAccount(email),
        passwordHash: Buffer.from(digest, "hex"),
        passwordSalt: Buffer.from(salt, "utf8"),
      };
    }),
    { hash },
  );
  if (result.failureCount)
    throw Error(
      `Firebase Auth could not import ${result.failureCount} accounts from batch ${start / 100 + 1}.`,
    );
}

const eventsById = new Map(events.map((event) => [event.id, event]));
const counters = new Map(
  events.map(({ id }) => [id, { application_count: 0, occupied: 0 }]),
);
for (const application of applications) {
  const count = counters.get(application.event_id);
  count.application_count++;
  if (["accepted", "confirmed"].includes(application.status)) count.occupied++;
}
const notices = new Map(
  notifications.map((notice) => [notice.application_id, notice]),
);
const writer = firestore.bulkWriter();
const writes = [];
function create(path, data) {
  writes.push(
    writer.create(firestore.doc(path), data).catch((error) => {
      return error.code !== 6;
    }),
  );
}
for (const { id, role, name, email, university, contact, bio } of users) {
  const uid = uidFor(id);
  create(`profiles/${uid}`, {
    role,
    name,
    email,
    university,
    contact,
    bio,
    consent: true,
  });
  if (role === "organization") create(`organizations/${uid}`, { name });
}
for (const {
  id,
  organization_id,
  starts_at,
  deadline,
  created_at,
  closed,
  ...event
} of events) {
  create(`events/${id}`, {
    ...event,
    ...counters.get(id),
    organization_id: uidFor(organization_id),
    city: event.city ?? inferCity(event.location),
    starts_at: timestamp(starts_at),
    deadline: timestamp(deadline),
    created_at: timestamp(created_at),
    closed: Boolean(closed),
  });
}
for (const {
  id,
  event_id,
  user_id,
  consent,
  created_at,
  decision_at,
  confirmed_at,
  notice_sent_at,
  ...application
} of applications) {
  const event = eventsById.get(event_id);
  const notice = notices.get(id);
  const noticedTitle = /^Ваша заявка на «(.*)» (?:одобрена!|отклонена\.)/s.exec(
    notice?.message ?? "",
  )?.[1];
  create(`events/${event_id}/applicants/${uidFor(user_id)}`, {
    ...application,
    event_id: String(event_id),
    user_id: uidFor(user_id),
    organization_id: uidFor(event.organization_id),
    consent: Boolean(consent),
    created_at: timestamp(created_at),
    decision_at: timestamp(notice?.created_at ?? decision_at),
    decision_title: notice ? (noticedTitle ?? event.title) : null,
    confirmed_at: timestamp(confirmed_at),
    notice_sent_at: timestamp(notice_sent_at),
    read_at: timestamp(notice?.read_at),
  });
}

await writer.close();
if ((await Promise.all(writes)).includes(true))
  throw Error(
    "Some Firestore writes failed. Retry with the same SQLite snapshot.",
  );
await migration.update({ complete: true });
console.log("SQLite import completed.");
