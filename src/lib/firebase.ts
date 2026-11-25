import {
  FirebaseError,
  initializeApp,
  type FirebaseOptions,
} from "firebase/app";
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  type User as Account,
} from "firebase/auth";
import {
  addDoc,
  collection,
  collectionGroup,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore/lite";
import {
  categoryDefinitions,
  inferCity,
  normalizeCity,
} from "../../shared/catalog.ts";
import { translate, type Language } from "../../shared/translate.ts";
import type { Application, Event, User } from "../types";

const connectionError = "Ошибка соединения.";
const signInRequired = "Войдите в аккаунт, чтобы продолжить.";
const wrongCredentials = "Неверный email или пароль.";
const duplicateEmail = "Этот email уже зарегистрирован.";
const emulator =
  import.meta.env.DEV && import.meta.env.VITE_FIREBASE_EMULATORS === "true";
const localProject = "demo-komek";

async function initialize() {
  let config: FirebaseOptions;
  if (emulator) {
    config = {
      projectId: localProject,
      apiKey: "demo-key",
      appId: "demo-komek",
    };
  } else {
    const response = await fetch("/__/firebase/init.json");
    if (!response.ok) throw Error(connectionError);
    config = await response.json();
  }
  const app = initializeApp(config);
  const auth = getAuth(app);
  const db = getFirestore(app);
  if (emulator) {
    const host = location.hostname;
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, host, 8180);
  }
  await auth.authStateReady();
  return { auth, db };
}

let connection: ReturnType<typeof initialize> | undefined;
type Firebase = Awaited<ReturnType<typeof initialize>>;
const services = () =>
  (connection ??= initialize().catch(() => {
    connection = undefined;
    throw Error(connectionError);
  }));

type Input = Record<string, unknown>;
type Profile = Omit<User, "id"> & { consent: true };
const emailPattern = /^\S+@\S+\.\S+$/;
const contactPattern = /^(@[a-zA-Z0-9_]{3,}|[^\s@]+@[^\s@]+\.[^\s@]+)$/;
const clean = (v: unknown, max: number) => String(v ?? "").slice(0, max);
const iso = (v: Timestamp) => v.toDate().toISOString();
const optionalIso = (v: Timestamp | null) => v && iso(v);
const authCode = (e: unknown, code: string) =>
  e instanceof FirebaseError && e.code === `auth/${code}`;

function nameInput(value: unknown, message: string) {
  if (
    typeof value !== "string" ||
    value.trim().length < 2 ||
    value.length > 100
  )
    throw Error(message);
  return value.trim();
}

async function getProfile({ db }: Firebase, account: Account) {
  const profile = await getDoc(doc(db, "profiles", account.uid));
  return profile.exists()
    ? { ...(profile.data() as Profile), id: account.uid }
    : null;
}

async function saveProfile({ db }: Firebase, uid: string, values: Profile) {
  const batch = writeBatch(db);
  batch.set(doc(db, "profiles", uid), values);
  if (values.role === "organization")
    batch.set(doc(db, "organizations", uid), { name: values.name });
  await batch.commit();
  return { ...values, id: uid };
}

async function login(firebase: Firebase, { email, password }: Input) {
  const { auth } = firebase;
  if (typeof password !== "string" || password.length > 128)
    throw Error(wrongCredentials);
  const { user: account } = await signInWithEmailAndPassword(
    auth,
    String(email ?? "")
      .trim()
      .toLowerCase(),
    password,
  );
  const user = await getProfile(firebase, account);
  if (!user) {
    await signOut(auth);
    throw Error("Завершите регистрацию, используя тот же email.");
  }
  return { user };
}

async function register(firebase: Firebase, values: Input) {
  const { auth, db } = firebase;
  const { role, email, password } = values;
  if (role !== "volunteer" && role !== "organization")
    throw Error("Выберите роль.");
  const name = nameInput(
    values.name,
    "Укажите имя или название организации (2–100 символов).",
  );
  if (
    typeof email !== "string" ||
    !emailPattern.test(email) ||
    email.length > 200
  )
    throw Error("Укажите корректный email.");
  if (
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 128
  )
    throw Error("Пароль должен содержать от 8 до 128 символов.");
  if (values.consent !== true)
    throw Error("Необходимо согласие на обработку данных.");

  const normalizedEmail = email.trim().toLowerCase();
  let account: Account;
  try {
    ({ user: account } = await createUserWithEmailAndPassword(
      auth,
      normalizedEmail,
      password,
    ));
  } catch (e) {
    if (!authCode(e, "email-already-in-use")) throw e;
    // The Firebase Auth sign-up can succeed before the profile write. Verify
    // the existing password before attempting to finish an interrupted sign-up.
    try {
      ({ user: account } = await signInWithEmailAndPassword(
        auth,
        normalizedEmail,
        password,
      ));
    } catch (signInError) {
      if (
        ["invalid-credential", "wrong-password", "user-not-found"].some(
          (code) => authCode(signInError, code),
        )
      )
        throw Error(duplicateEmail);
      throw signInError;
    }
  }

  const profile: Profile = {
    role,
    email: normalizedEmail,
    name,
    consent: true,
    university: clean(values.university, 200),
    contact: clean(values.contact, 200),
    bio: "",
  };
  try {
    await runTransaction(db, async (transaction) => {
      const ref = doc(db, "profiles", account.uid);
      if ((await transaction.get(ref)).exists()) throw Error(duplicateEmail);
      transaction.set(ref, profile);
      if (role === "organization")
        transaction.set(doc(db, "organizations", account.uid), { name });
    });
  } catch (error) {
    await signOut(auth);
    throw error;
  }
  return { user: { ...profile, id: account.uid } };
}

async function readEvents({ db }: Firebase) {
  const events = await getDocs(collection(db, "events"));
  const ids = [
    ...new Set(
      events.docs.map((event) => event.data().organization_id as string),
    ),
  ];
  const names = new Map(
    await Promise.all(
      ids.map(async (id) => {
        const snapshot = await getDoc(doc(db, "organizations", id));
        return [id, snapshot.data()?.name || ""] as const;
      }),
    ),
  );
  return events.docs
    .map((snapshot) => {
      const data = snapshot.data();
      return {
        ...data,
        id: snapshot.id,
        organization: names.get(data.organization_id) || "",
        starts_at: iso(data.starts_at),
        deadline: iso(data.deadline),
        created_at: iso(data.created_at),
        closed: Number(data.closed),
      } as Event;
    })
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
}

function eventInput(body: Input, previous?: DocumentData) {
  const { title, description, category, location, starts_at, deadline } = body;
  if (
    typeof title !== "string" ||
    title.trim().length < 4 ||
    title.length > 150
  )
    throw Error("Название: от 4 до 150 символов.");
  if (
    typeof description !== "string" ||
    description.length < 20 ||
    description.length > 10000
  )
    throw Error("Описание: от 20 до 10 000 символов.");
  if (!categoryDefinitions.some(({ id }) => id === category))
    throw Error("Выберите категорию.");
  if (
    typeof location !== "string" ||
    location.trim().length < 3 ||
    location.length > 300
  )
    throw Error("Укажите место проведения.");
  const city = body.city ?? (inferCity(location) || previous?.city || "");
  if (
    typeof city !== "string" ||
    city.trim().length < 2 ||
    city.trim().length > 100
  )
    throw Error("Укажите город (2–100 символов).");
  const start = new Date(String(starts_at));
  const end = new Date(String(deadline));
  if (!(start.getTime() > Date.now() && end < start))
    throw Error("Событие должно быть в будущем, а дедлайн — раньше начала.");
  const hours = Number(body.hours);
  const capacity = Number(body.capacity);
  if (
    !Number.isInteger(capacity) ||
    capacity < 1 ||
    capacity > 10000 ||
    !(hours > 0 && hours <= 168)
  )
    throw Error("Проверьте количество мест (1–10 000) и часов (до 168).");
  const image = clean(body.image || "/images/planting.png", 2000);
  if (
    !/^https:\/\/.+/.test(image) &&
    !/^\/images\/[a-z]+\.(jpg|png)$/.test(image)
  )
    throw Error("Фотография должна быть HTTPS-ссылкой.");
  return {
    title,
    description,
    category,
    location,
    city: normalizeCity(city),
    hours,
    capacity,
    starts_at: Timestamp.fromDate(start),
    deadline: Timestamp.fromDate(end),
    image,
    requirements: clean(body.requirements, 2000),
  };
}

async function editEvent(
  { db }: Firebase,
  id: string,
  uid: string,
  body: Input,
) {
  await runTransaction(db, async (transaction) => {
    const ref = doc(db, "events", id);
    const event = (await transaction.get(ref)).data();
    if (!event) throw Error("Событие не найдено.");
    if (event.organization_id !== uid)
      throw Error("У вас нет доступа к этому событию.");
    if (typeof body.closed === "boolean" && Object.keys(body).length === 1) {
      transaction.update(ref, { closed: body.closed });
    } else {
      const values = eventInput(body, event);
      if (values.capacity < event.occupied)
        throw Error(
          "Количество мест не может быть меньше числа принятых участников.",
        );
      transaction.update(ref, values);
    }
  });
}

async function apply(
  { db }: Firebase,
  eventId: string,
  uid: string,
  body: Input,
) {
  if (body.consent !== true)
    throw Error("Необходимо согласие на обработку персональных данных.");
  const { full_name, university, contact } = body;
  if (
    typeof full_name !== "string" ||
    full_name.trim().length < 2 ||
    full_name.length > 200 ||
    typeof university !== "string" ||
    university.trim().length < 2 ||
    university.length > 200 ||
    typeof contact !== "string" ||
    contact.length > 200 ||
    !contactPattern.test(contact)
  )
    throw Error("Укажите имя, университет и Telegram (@username) или email.");

  const eventRef = doc(db, "events", eventId);
  const applicationRef = doc(eventRef, "applicants", uid);
  await runTransaction(db, async (transaction) => {
    const event = (await transaction.get(eventRef)).data();
    if (!event) throw Error("Событие не найдено.");
    if (
      event.closed ||
      event.deadline.toMillis() <= Date.now() ||
      event.starts_at.toMillis() <= Date.now()
    )
      throw Error("Приём заявок закрыт.");
    if (event.occupied >= event.capacity) throw Error("Все места уже заняты.");
    if ((await transaction.get(applicationRef)).exists())
      throw Error("Вы уже подали заявку на это событие.");
    transaction.set(applicationRef, {
      event_id: eventId,
      user_id: uid,
      organization_id: event.organization_id,
      full_name: full_name.trim(),
      university: university.trim(),
      contact: contact.trim(),
      motivation: clean(body.motivation, 2000),
      consent: true,
      status: "pending",
      created_at: serverTimestamp(),
      decision_at: null,
      decision_title: null,
      confirmed_at: null,
      notice_sent_at: null,
      read_at: null,
    });
    transaction.set(doc(db, "eventActivity", eventId), { user_id: uid });
    transaction.update(eventRef, {
      application_count: event.application_count + 1,
    });
  });
}

function applicationsFor({ db }: Firebase, user: User) {
  const key = user.role === "organization" ? "organization_id" : "user_id";
  return getDocs(
    query(collectionGroup(db, "applicants"), where(key, "==", user.id)),
  );
}

async function dashboard(firebase: Firebase, user: User) {
  const { db } = firebase;
  const snapshots = (await applicationsFor(firebase, user)).docs;
  const eventIds = [
    ...new Set(snapshots.map((snapshot) => snapshot.data().event_id as string)),
  ];
  const events = new Map(
    await Promise.all(
      eventIds.map(
        async (id) =>
          [id, (await getDoc(doc(db, "events", id))).data()] as const,
      ),
    ),
  );
  const applications = snapshots
    .flatMap((snapshot) => {
      const data = snapshot.data();
      const event = events.get(data.event_id);
      if (!event) return [];
      return [
        {
          ...data,
          id: `${data.event_id}~${snapshot.id}`,
          title: event.title,
          starts_at: iso(event.starts_at),
          location: event.location,
          image: event.image,
          hours: event.hours,
          created_at: iso(data.created_at),
          decision_at: optionalIso(data.decision_at),
          confirmed_at: optionalIso(data.confirmed_at),
          notice_sent_at: optionalIso(data.notice_sent_at),
        } as Application,
      ];
    })
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  return { applications };
}

type ApplicationAction = "decision" | "confirm" | "notice";
async function updateApplication(
  { db }: Firebase,
  user: User,
  id: string,
  action: ApplicationAction,
  body: Input,
) {
  const [eventId, uid] = id.split("~");
  const eventRef = doc(db, "events", eventId);
  const appRef = doc(eventRef, "applicants", uid);
  await runTransaction(db, async (transaction) => {
    const [eventSnapshot, appSnapshot] = await Promise.all([
      transaction.get(eventRef),
      transaction.get(appRef),
    ]);
    const event = eventSnapshot.data();
    const application = appSnapshot.data();
    if (!event || !application) throw Error("Заявка не найдена.");
    if (action === "confirm") {
      if (uid !== user.id) throw Error("Нет доступа к заявке.");
      if (application.status !== "accepted")
        throw Error("Подтвердить можно только одобренную заявку.");
      if (event.starts_at.toMillis() <= Date.now())
        throw Error("Событие уже началось.");
      transaction.update(appRef, {
        status: "confirmed",
        confirmed_at: serverTimestamp(),
      });
      return;
    }

    if (event.organization_id !== user.id) throw Error("Нет доступа к заявке.");
    if (action === "notice") {
      if (application.status === "pending")
        throw Error("Сначала примите решение.");
      if (!application.notice_sent_at)
        transaction.update(appRef, { notice_sent_at: serverTimestamp() });
      return;
    }

    const { status } = body;
    if (status !== "accepted" && status !== "declined")
      throw Error("Некорректный статус.");
    if (application.status !== "pending")
      throw Error("Решение по этой заявке уже принято.");
    if (status === "accepted") {
      if (event.occupied >= event.capacity)
        throw Error(
          "Лимит участников достигнут. Увеличьте число мест или отклоните заявку. Уведомление не отправлено.",
        );
      transaction.set(doc(db, "eventActivity", eventId), { user_id: uid });
      transaction.update(eventRef, { occupied: event.occupied + 1 });
    }
    transaction.update(appRef, {
      status,
      decision_title: event.title,
      decision_at: serverTimestamp(),
    });
  });
}

function notification(snapshot: QueryDocumentSnapshot) {
  const data = snapshot.data();
  if (!data.decision_at || !data.decision_title) return [];
  const title = data.decision_title;
  const message =
    data.status === "declined"
      ? `Ваша заявка на «${title}» отклонена. Спасибо за желание помочь — другие проекты ждут вас в каталоге.`
      : `Ваша заявка на «${title}» одобрена! Подтвердите участие в личном кабинете.`;
  return [
    {
      id: `${data.event_id}~${snapshot.id}`,
      message,
      created_at: iso(data.decision_at),
      read_at: optionalIso(data.read_at),
    },
  ];
}

async function notifications(
  firebase: Firebase,
  user: User,
  markRead: boolean,
) {
  if (user.role !== "volunteer") return { notifications: [] };
  const snapshots = (await applicationsFor(firebase, user)).docs;
  if (!markRead)
    return {
      notifications: snapshots
        .flatMap(notification)
        .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)),
    };

  const unread = snapshots.filter(
    (snapshot) => snapshot.data().decision_title && !snapshot.data().read_at,
  );
  for (let index = 0; index < unread.length; index += 200) {
    await runTransaction(firebase.db, async (transaction) => {
      const pending = await Promise.all(
        unread.slice(index, index + 200).map(({ ref }) => transaction.get(ref)),
      );
      for (const snapshot of pending) {
        if (snapshot.exists() && !snapshot.data().read_at)
          transaction.update(snapshot.ref, { read_at: serverTimestamp() });
      }
    });
  }
  return { ok: true };
}

async function signedIn(firebase: Firebase) {
  const { currentUser } = firebase.auth;
  if (!currentUser) throw Error(signInRequired);
  const user = await getProfile(firebase, currentUser);
  if (!user) throw Error(signInRequired);
  return { ...user, id: currentUser.uid };
}

function requireRole(user: User, role: User["role"]) {
  if (user.role !== role)
    throw Error("Это действие недоступно для вашей роли.");
}

export async function firebaseRequest(
  path: string,
  method: string,
  input?: unknown,
) {
  const firebase = await services();
  const { auth, db } = firebase;
  const body = (input ?? {}) as Input;
  try {
    if (path === "/auth/register" && method === "POST")
      return await register(firebase, body);
    if (path === "/auth/login" && method === "POST")
      return await login(firebase, body);
    if (path === "/auth/logout" && method === "POST") {
      await signOut(auth);
      return { ok: true };
    }
    if (path === "/auth/me" && method === "GET")
      return {
        user: auth.currentUser
          ? await getProfile(firebase, auth.currentUser)
          : null,
      };
    if (path === "/events" && method === "GET")
      return { events: await readEvents(firebase) };

    const user = await signedIn(firebase);
    const [, section, id, action] = path.split("/");
    if (path === "/profile" && method === "PATCH") {
      const name = nameInput(body.name, "Укажите имя (2–100 символов).");
      return {
        user: await saveProfile(firebase, user.id, {
          role: user.role,
          email: user.email,
          consent: true,
          name,
          university: clean(body.university, 200),
          contact: clean(body.contact, 200),
          bio: clean(body.bio, 1000),
        }),
      };
    }
    if (
      section === "events" &&
      action === "applications" &&
      method === "POST"
    ) {
      requireRole(user, "volunteer");
      await apply(firebase, id, user.id, body);
      return { ok: true };
    }
    if (section === "events" && !action) {
      requireRole(user, "organization");
      if (method === "POST" && !id) {
        await addDoc(collection(db, "events"), {
          ...eventInput(body),
          organization_id: user.id,
          created_at: serverTimestamp(),
          closed: false,
          application_count: 0,
          occupied: 0,
        });
        return { ok: true };
      }
      if (method === "PATCH" && id) {
        await editEvent(firebase, id, user.id, body);
        return { ok: true };
      }
    }
    if (
      section === "applications" &&
      ((action === "decision" && method === "PATCH") ||
        ((action === "confirm" || action === "notice") && method === "POST"))
    ) {
      requireRole(user, action === "confirm" ? "volunteer" : "organization");
      await updateApplication(firebase, user, id, action, body);
      return { ok: true };
    }
    if (path === "/dashboard" && method === "GET")
      return await dashboard(firebase, user);
    if (section === "notifications" && (method === "GET" || action === "read"))
      return await notifications(firebase, user, action === "read");
    throw Error("Маршрут не найден.");
  } catch (error) {
    if (!(error instanceof FirebaseError)) throw error;
    if (
      [
        "invalid-credential",
        "invalid-email",
        "wrong-password",
        "user-not-found",
        "user-disabled",
      ].some((code) => authCode(error, code))
    )
      throw Error(wrongCredentials);
    if (authCode(error, "too-many-requests"))
      throw Error("Слишком много попыток. Попробуйте через 10 минут.");
    if (authCode(error, "email-already-in-use")) throw Error(duplicateEmail);
    if (
      error.code === "unavailable" ||
      authCode(error, "network-request-failed")
    )
      throw Error(connectionError);
    throw Error("Не удалось выполнить запрос. Попробуйте ещё раз.");
  }
}

export async function downloadRoster(eventId: string, language: Language) {
  const firebase = await services();
  const user = await signedIn(firebase);
  requireRole(user, "organization");
  const event = await getDoc(doc(firebase.db, "events", eventId));
  if (event.data()?.organization_id !== user.id)
    throw Error("У вас нет доступа к этому событию.");
  const snapshots = await getDocs(collection(event.ref, "applicants"));
  const rows = snapshots.docs
    .map((snapshot) => snapshot.data())
    .filter((application) => application.status === "confirmed")
    .sort((a, b) => a.full_name.localeCompare(b.full_name))
    .map((a) => [
      a.full_name,
      a.contact,
      a.university,
      optionalIso(a.confirmed_at),
    ]);
  const headings = ["Имя", "Контакт", "Университет", "Подтверждение"].map(
    (label) => translate(language, label),
  );
  const cell = (value: unknown) =>
    '"' +
    String(value ?? "")
      .replace(/^(?:\s*[=+@\-]|[\t\r\n])/, "'$&")
      .replaceAll('"', '""') +
    '"';
  const csv =
    "\uFEFF" +
    [headings, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `komek-roster-${eventId}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
