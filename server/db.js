import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password, hash) {
  const [salt, key] = hash.split(":");
  return timingSafeEqual(
    scryptSync(password, salt, 64),
    Buffer.from(key, "hex"),
  );
}
export function openDb(
  path = process.env.DATABASE_PATH || ".data/komek.sqlite",
) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
  db.exec(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, role TEXT NOT NULL CHECK(role IN ('volunteer','organization')), name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, university TEXT NOT NULL DEFAULT '', contact TEXT NOT NULL DEFAULT '', bio TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), expires TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES users(id), title TEXT NOT NULL, description TEXT NOT NULL, category TEXT NOT NULL, location TEXT NOT NULL, starts_at TEXT NOT NULL, deadline TEXT NOT NULL, hours REAL NOT NULL, capacity INTEGER NOT NULL, image TEXT NOT NULL DEFAULT '', requirements TEXT NOT NULL DEFAULT '', closed INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS applications (id INTEGER PRIMARY KEY, event_id INTEGER NOT NULL REFERENCES events(id), user_id INTEGER NOT NULL REFERENCES users(id), full_name TEXT NOT NULL, university TEXT NOT NULL, contact TEXT NOT NULL, motivation TEXT NOT NULL DEFAULT '', consent INTEGER NOT NULL CHECK(consent = 1), status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined','confirmed')), created_at TEXT NOT NULL, decision_at TEXT, confirmed_at TEXT, notice_sent_at TEXT, UNIQUE(event_id,user_id));
 CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), application_id INTEGER REFERENCES applications(id), message TEXT NOT NULL, created_at TEXT NOT NULL, read_at TEXT);
 CREATE INDEX IF NOT EXISTS applications_event ON applications(event_id);
 CREATE INDEX IF NOT EXISTS notifications_user ON notifications(user_id);`);
  return db;
}
export function seed(db) {
  if (db.prepare("SELECT count(*) n FROM users").get().n) return;
  const now = new Date().toISOString();
  const add = db.prepare(
    "INSERT INTO users(role,name,email,password,university,contact,bio,created_at) VALUES(?,?,?,?,?,?,?,?)",
  );
  const org = Number(
    add.run(
      "organization",
      "Green Almaty",
      "org@komek.kz",
      hashPassword("Komek2026!"),
      "",
      "@green_almaty",
      "Вместе делаем Алматы зеленее. Объединяем людей, которым не всё равно.",
      now,
    ).lastInsertRowid,
  );
  const vol = Number(
    add.run(
      "volunteer",
      "Айдана Серикова",
      "volunteer@komek.kz",
      hashPassword("Komek2026!"),
      "КазНУ имени аль-Фараби",
      "@aidana_demo",
      "Хочу делать город лучше и знакомиться с единомышленниками.",
      now,
    ).lastInsertRowid,
  );
  const offset = (days, hour = 10) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };
  const events = [
    [
      "Чистые горы — наше общее дело",
      "Проведём день в горах с пользой: очистим тропу от мусора, познакомимся и устроим небольшой пикник с видом на вершины. Выдадим перчатки, мешки и всё необходимое. Вместе сохраним красоту нашего города.",
      "eco",
      "Медеу, Алматы",
      5,
      4,
      30,
      "/images/mountains.png",
      "Удобная обувь, тёплая одежда и бутылка воды. Возраст: 16+.",
    ],
    [
      "Маленькая помощь. Большая забота.",
      "Поможем приюту: выгуляем собак, подготовим корм и приведём в порядок вольеры. Сотрудники проведут инструктаж и будут рядом на протяжении всего события.",
      "animals",
      "Приют «Новый шанс», Алматы",
      8,
      3,
      15,
      "/images/dogs.jpg",
      "Любовь к животным. Участникам до 18 лет — сопровождение взрослого.",
    ],
    [
      "Добрые выходные в центре «Асыл»",
      "Подарим внимание старшему поколению: настольные игры, творческая мастерская и разговоры за чашкой чая. Опыт не нужен — главное желание быть рядом.",
      "social",
      "Центр «Асыл», Алматы",
      10,
      3,
      20,
      "/images/community.jpg",
      "Доброжелательность и готовность общаться.",
    ],
    [
      "Команда городского фестиваля",
      "Помогаем организовать городской фестиваль добрых инициатив: встречаем гостей, работаем на площадках и поддерживаем команды. Вас ждут новые знакомства и яркие эмоции.",
      "events",
      "Парк Первого Президента, Алматы",
      14,
      6,
      50,
      "/images/marathon.jpg",
      "Возраст 18+. Участие в инструктаже за 30 минут до начала.",
    ],
    [
      "Знания, которыми хочется делиться",
      "Помогите школьникам разобраться с домашними заданиями и поверить в свои силы. Ищем волонтёров для занятий математикой, английским и творчеством.",
      "education",
      "Библиотека № 4, Алматы",
      18,
      2,
      12,
      "/images/education.jpg",
      "Уверенные знания школьной программы.",
    ],
    [
      "Посадим зелёное будущее вместе",
      "Высадим молодые деревья в городском парке и узнаем, как за ними ухаживать. Инвентарь и саженцы предоставим. После работы — чай и общая фотография.",
      "eco",
      "Ботанический сад, Алматы",
      24,
      4,
      25,
      "/images/planting.png",
      "Подойдёт всем. Одежда, которую не жалко испачкать.",
    ],
    [
      "Тёплый обед для каждого",
      "Вместе собрали продуктовые наборы и передали их семьям, которым нужна поддержка. Спасибо каждому, кто присоединился к этому доброму делу.",
      "social",
      "Волонтёрский центр, Алматы",
      -7,
      4,
      20,
      "/images/community.jpg",
      "Готовность помогать.",
    ],
  ];
  const insert = db.prepare(
    "INSERT INTO events(organization_id,title,description,category,location,starts_at,deadline,hours,capacity,image,requirements,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
  );
  for (const [
    title,
    description,
    category,
    location,
    days,
    hours,
    capacity,
    image,
    requirements,
  ] of events)
    insert.run(
      org,
      title,
      description,
      category,
      location,
      offset(days),
      offset(days - 1, 18),
      hours,
      capacity,
      image,
      requirements,
      now,
    );
  const app = db.prepare(
    "INSERT INTO applications(event_id,user_id,full_name,university,contact,motivation,consent,status,created_at,decision_at,confirmed_at) VALUES(?,?,?,?,?,?,1,?,?,?,?)",
  );
  app.run(
    2,
    vol,
    "Айдана Серикова",
    "КазНУ имени аль-Фараби",
    "@aidana_demo",
    "Буду рада помочь приюту!",
    "accepted",
    now,
    now,
    null,
  );
  db.prepare(
    "INSERT INTO notifications(user_id,application_id,message,created_at) VALUES(?,?,?,?)",
  ).run(
    vol,
    1,
    "Ваша заявка на «Маленькая помощь. Большая забота.» одобрена! Подтвердите участие в личном кабинете.",
    now,
  );
  for (const [i, name, status] of [
    [1, "Арман Касымов", "pending"],
    [2, "София Ким", "pending"],
    [3, "Данияр Омаров", "confirmed"],
    [4, "Алина Петрова", "accepted"],
  ]) {
    const id = Number(
      add.run(
        "volunteer",
        name,
        `demo${i}@komek.kz`,
        hashPassword(randomBytes(20).toString("hex")),
        "Университет Алматы",
        `@demo_volunteer_${i}`,
        "",
        now,
      ).lastInsertRowid,
    );
    app.run(
      1,
      id,
      name,
      "Университет Алматы",
      `@demo_volunteer_${i}`,
      "Хочу присоединиться к команде! ",
      status,
      now,
      status === "pending" ? null : now,
      status === "confirmed" ? now : null,
    );
  }
}
