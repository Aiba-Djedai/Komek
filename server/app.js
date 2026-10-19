import express from "express";
import { randomBytes, createHash } from "node:crypto";
import { hashPassword, verifyPassword } from "./db.js";
const categories = ["eco", "social", "animals", "events", "education"];
const publicUser = ({ password, ...u }) => u;
const fail = (status, message) => Object.assign(new Error(message), { status });
const iso = () => new Date().toISOString();
export function createApp(db) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "100kb" }));
  app.use((req, res, next) => {
    res.set("X-Content-Type-Options", "nosniff");
    res.set("Referrer-Policy", "same-origin");
    res.set("X-Frame-Options", "DENY");
    if (req.path.startsWith("/api")) res.set("Cache-Control", "no-store");
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.headers.origin &&
      new URL(req.headers.origin).host !== req.headers.host
    )
      return res.status(403).json({ error: "Недопустимый источник запроса." });
    next();
  });
  app.use("/api", (req, res, next) => {
    const token = (req.headers.cookie || "")
      .split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith("komek_session="))
      ?.slice(14);
    if (token) {
      const session = db
        .prepare(
          "SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>?",
        )
        .get(createHash("sha256").update(token).digest("hex"), iso());
      if (session) req.user = publicUser(session);
    }
    next();
  });
  const auth = (req, res, next) =>
    req.user
      ? next()
      : res.status(401).json({ error: "Войдите в аккаунт, чтобы продолжить." });
  const role = (r) => (req, res, next) =>
    req.user?.role === r
      ? next()
      : res
          .status(403)
          .json({ error: "Это действие недоступно для вашей роли." });
  function login(req, res, user) {
    const token = randomBytes(32).toString("hex");
    db.prepare("INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)").run(
      createHash("sha256").update(token).digest("hex"),
      user.id,
      new Date(Date.now() + 7 * 86400000).toISOString(),
    );
    res.cookie("komek_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.COOKIE_SECURE === "true",
      maxAge: 7 * 86400000,
      path: "/",
    });
    res.json({ user: publicUser(user) });
  }
  const attempts = new Map();
  app.use(["/api/auth/login", "/api/auth/register"], (req, res, next) => {
    const key = req.ip;
    let bucket = attempts.get(key);
    if (!bucket || bucket.until < Date.now()) {
      bucket = { count: 0, until: Date.now() + 600000 };
      attempts.set(key, bucket);
    }
    if (++bucket.count > 40)
      return res
        .status(429)
        .json({ error: "Слишком много попыток. Попробуйте через 10 минут." });
    next();
  });
  app.get("/api/auth/me", (req, res) => res.json({ user: req.user || null }));
  app.post("/api/auth/register", (req, res) => {
    const {
      name,
      email,
      password,
      role: kind,
      university = "",
      contact = "",
    } = req.body;
    if (!["volunteer", "organization"].includes(kind))
      throw fail(400, "Выберите роль.");
    if (typeof name !== "string" || name.trim().length < 2 || name.length > 100)
      throw fail(400, "Укажите имя или название организации (2–100 символов).");
    if (
      typeof email !== "string" ||
      !/^\S+@\S+\.\S+$/.test(email) ||
      email.length > 200
    )
      throw fail(400, "Укажите корректный email.");
    if (
      typeof password !== "string" ||
      password.length < 8 ||
      password.length > 128
    )
      throw fail(400, "Пароль должен содержать от 8 до 128 символов.");
    if (req.body.consent !== true)
      throw fail(400, "Необходимо согласие на обработку данных.");
    if (
      db
        .prepare("SELECT id FROM users WHERE email=?")
        .get(email.trim().toLowerCase())
    )
      throw fail(409, "Этот email уже зарегистрирован.");
    const id = Number(
      db
        .prepare(
          "INSERT INTO users(role,name,email,password,university,contact,created_at) VALUES(?,?,?,?,?,?,?)",
        )
        .run(
          kind,
          name.trim(),
          email.trim().toLowerCase(),
          hashPassword(password),
          String(university).slice(0, 200),
          String(contact).slice(0, 200),
          iso(),
        ).lastInsertRowid,
    );
    login(req, res, db.prepare("SELECT * FROM users WHERE id=?").get(id));
  });
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email=?").get(
      String(email || "")
        .trim()
        .toLowerCase(),
    );
    if (
      typeof password !== "string" ||
      password.length > 128 ||
      !user ||
      !verifyPassword(password, user.password)
    )
      throw fail(401, "Неверный email или пароль.");
    login(req, res, user);
  });
  app.post("/api/auth/logout", (req, res) => {
    const raw = (req.headers.cookie || "")
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("komek_session="))
      ?.slice(14);
    if (raw)
      db.prepare("DELETE FROM sessions WHERE token=?").run(
        createHash("sha256").update(raw).digest("hex"),
      );
    res.clearCookie("komek_session", { path: "/" });
    res.json({ ok: true });
  });
  app.patch("/api/profile", auth, (req, res) => {
    const { name, university = "", contact = "", bio = "" } = req.body;
    if (typeof name !== "string" || name.trim().length < 2 || name.length > 100)
      throw fail(400, "Укажите имя (2–100 символов).");
    db.prepare(
      "UPDATE users SET name=?,university=?,contact=?,bio=? WHERE id=?",
    ).run(
      name.trim(),
      String(university).slice(0, 200),
      String(contact).slice(0, 200),
      String(bio).slice(0, 1000),
      req.user.id,
    );
    res.json({
      user: publicUser(
        db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id),
      ),
    });
  });
  const selectEvent = `SELECT e.*,u.name organization, (SELECT count(*) FROM applications a WHERE a.event_id=e.id AND a.status IN ('accepted','confirmed')) occupied, (SELECT count(*) FROM applications a WHERE a.event_id=e.id) application_count FROM events e JOIN users u ON u.id=e.organization_id`;
  const eventById = (id) => {
    const e = db.prepare(selectEvent + " WHERE e.id=?").get(id);
    if (!e) throw fail(404, "Событие не найдено.");
    return e;
  };
  const owned = (id, user) => {
    const e = eventById(id);
    if (e.organization_id !== user.id)
      throw fail(403, "У вас нет доступа к этому событию.");
    return e;
  };
  app.get("/api/events", (req, res) =>
    res.json({
      events: db.prepare(selectEvent + " ORDER BY e.starts_at ASC").all(),
    }),
  );
  app.get("/api/events/:id", (req, res) =>
    res.json({ event: eventById(req.params.id) }),
  );
  function eventInput(body) {
    const fields = [
      "title",
      "description",
      "category",
      "location",
      "starts_at",
      "deadline",
      "hours",
      "capacity",
      "image",
      "requirements",
    ];
    const v = {};
    for (const f of fields) v[f] = body[f];
    if (
      typeof v.title !== "string" ||
      v.title.trim().length < 4 ||
      v.title.length > 150
    )
      throw fail(400, "Название: от 4 до 150 символов.");
    if (
      typeof v.description !== "string" ||
      v.description.length < 20 ||
      v.description.length > 10000
    )
      throw fail(400, "Описание: от 20 до 10 000 символов.");
    if (!categories.includes(v.category))
      throw fail(400, "Выберите категорию.");
    if (
      typeof v.location !== "string" ||
      v.location.trim().length < 3 ||
      v.location.length > 300
    )
      throw fail(400, "Укажите место проведения.");
    if (
      !Number.isFinite(Date.parse(v.starts_at)) ||
      !Number.isFinite(Date.parse(v.deadline)) ||
      Date.parse(v.deadline) >= Date.parse(v.starts_at) ||
      Date.parse(v.starts_at) <= Date.now()
    )
      throw fail(
        400,
        "Событие должно быть в будущем, а дедлайн — раньше начала.",
      );
    if (
      !Number.isInteger(Number(v.capacity)) ||
      Number(v.capacity) < 1 ||
      Number(v.capacity) > 10000 ||
      !Number.isFinite(Number(v.hours)) ||
      Number(v.hours) <= 0 ||
      Number(v.hours) > 168
    )
      throw fail(400, "Проверьте количество мест (1–10 000) и часов (до 168).");
    if (
      v.image &&
      !/^https:\/\//.test(v.image) &&
      !/^\/images\/[a-z]+\.(jpg|png)$/.test(v.image)
    )
      throw fail(400, "Фотография должна быть HTTPS-ссылкой.");
    v.image = String(v.image || "/images/planting.png").slice(0, 2000);
    v.requirements = String(v.requirements || "").slice(0, 2000);
    v.starts_at = new Date(v.starts_at).toISOString();
    v.deadline = new Date(v.deadline).toISOString();
    v.hours = Number(v.hours);
    v.capacity = Number(v.capacity);
    return fields.map((f) => v[f]);
  }
  app.post("/api/events", auth, role("organization"), (req, res) => {
    const values = eventInput(req.body);
    const result = db
      .prepare(
        "INSERT INTO events(organization_id,title,description,category,location,starts_at,deadline,hours,capacity,image,requirements,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
      )
      .run(req.user.id, ...values, iso());
    res.status(201).json({ event: eventById(result.lastInsertRowid) });
  });
  app.patch("/api/events/:id", auth, role("organization"), (req, res) => {
    const e = owned(req.params.id, req.user);
    if (
      Object.keys(req.body).length === 1 &&
      typeof req.body.closed === "boolean"
    ) {
      db.prepare("UPDATE events SET closed=? WHERE id=?").run(
        Number(req.body.closed),
        e.id,
      );
    } else {
      const values = eventInput(req.body);
      if (Number(req.body.capacity) < e.occupied)
        throw fail(
          409,
          "Количество мест не может быть меньше числа принятых участников.",
        );
      db.prepare(
        "UPDATE events SET title=?,description=?,category=?,location=?,starts_at=?,deadline=?,hours=?,capacity=?,image=?,requirements=? WHERE id=?",
      ).run(...values, e.id);
    }
    res.json({ event: eventById(e.id) });
  });
  app.post(
    "/api/events/:id/applications",
    auth,
    role("volunteer"),
    (req, res) => {
      const e = eventById(req.params.id);
      if (
        e.closed ||
        Date.parse(e.deadline) <= Date.now() ||
        Date.parse(e.starts_at) <= Date.now()
      )
        throw fail(409, "Приём заявок закрыт.");
      if (e.occupied >= e.capacity) throw fail(409, "Все места уже заняты.");
      if (req.body.consent !== true)
        throw fail(
          400,
          "Необходимо согласие на обработку персональных данных.",
        );
      const { full_name, university, contact, motivation = "" } = req.body;
      if (
        [full_name, university, contact].some(
          (v) => typeof v !== "string" || v.trim().length < 2 || v.length > 200,
        ) ||
        !/^(@[a-zA-Z0-9_]{3,}|[^\s@]+@[^\s@]+\.[^\s@]+)$/.test(contact)
      )
        throw fail(
          400,
          "Укажите имя, университет и Telegram (@username) или email.",
        );
      if (
        db
          .prepare("SELECT id FROM applications WHERE event_id=? AND user_id=?")
          .get(e.id, req.user.id)
      )
        throw fail(409, "Вы уже подали заявку на это событие.");
      const id = Number(
        db
          .prepare(
            "INSERT INTO applications(event_id,user_id,full_name,university,contact,motivation,consent,created_at) VALUES(?,?,?,?,?,?,1,?)",
          )
          .run(
            e.id,
            req.user.id,
            full_name.trim(),
            university.trim(),
            contact.trim(),
            String(motivation).slice(0, 2000),
            iso(),
          ).lastInsertRowid,
      );
      res
        .status(201)
        .json({
          application: db
            .prepare("SELECT * FROM applications WHERE id=?")
            .get(id),
        });
    },
  );
  app.get("/api/dashboard", auth, (req, res) => {
    const user = req.user;
    const applications =
      user.role === "volunteer"
        ? db
            .prepare(
              "SELECT a.*,e.title,e.starts_at,e.location,e.image,e.hours,u.name organization FROM applications a JOIN events e ON e.id=a.event_id JOIN users u ON u.id=e.organization_id WHERE a.user_id=? ORDER BY a.created_at DESC",
            )
            .all(user.id)
        : db
            .prepare(
              "SELECT a.*,e.title,e.starts_at FROM applications a JOIN events e ON e.id=a.event_id WHERE e.organization_id=? ORDER BY a.created_at DESC",
            )
            .all(user.id);
    res.json({
      applications,
      events:
        user.role === "organization"
          ? db
              .prepare(
                selectEvent +
                  " WHERE e.organization_id=? ORDER BY e.starts_at DESC",
              )
              .all(user.id)
          : [],
    });
  });
  const getApplication = (id) => {
    const a = db
      .prepare(
        "SELECT a.*,e.organization_id,e.title,e.starts_at,e.capacity FROM applications a JOIN events e ON e.id=a.event_id WHERE a.id=?",
      )
      .get(id);
    if (!a) throw fail(404, "Заявка не найдена.");
    return a;
  };
  app.patch(
    "/api/applications/:id/decision",
    auth,
    role("organization"),
    (req, res) => {
      const a = getApplication(req.params.id);
      if (a.organization_id !== req.user.id)
        throw fail(403, "Нет доступа к заявке.");
      if (!["accepted", "declined"].includes(req.body.status))
        throw fail(400, "Некорректный статус.");
      if (a.status !== "pending")
        throw fail(409, "Решение по этой заявке уже принято.");
      if (req.body.status === "accepted") {
        const occupied = db
          .prepare(
            "SELECT count(*) n FROM applications WHERE event_id=? AND status IN ('accepted','confirmed')",
          )
          .get(a.event_id).n;
        if (occupied >= a.capacity)
          throw fail(
            409,
            "Лимит участников достигнут. Увеличьте число мест или отклоните заявку. Уведомление не отправлено.",
          );
      }
      const now = iso();
      const accepted = req.body.status === "accepted";
      const message = accepted
        ? `Ваша заявка на «${a.title}» одобрена! Подтвердите участие в личном кабинете.`
        : `Ваша заявка на «${a.title}» отклонена. Спасибо за желание помочь — другие проекты ждут вас в каталоге.`;
      db.exec("BEGIN IMMEDIATE");
      try {
        db.prepare(
          "UPDATE applications SET status=?,decision_at=? WHERE id=?",
        ).run(req.body.status, now, a.id);
        db.prepare(
          "INSERT INTO notifications(user_id,application_id,message,created_at) VALUES(?,?,?,?)",
        ).run(a.user_id, a.id, message, now);
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
      res.json({ ok: true });
    },
  );
  app.post(
    "/api/applications/:id/confirm",
    auth,
    role("volunteer"),
    (req, res) => {
      const a = getApplication(req.params.id);
      if (a.user_id !== req.user.id) throw fail(403, "Нет доступа к заявке.");
      if (a.status !== "accepted")
        throw fail(409, "Подтвердить можно только одобренную заявку.");
      if (Date.parse(a.starts_at) <= Date.now())
        throw fail(409, "Событие уже началось.");
      db.prepare(
        "UPDATE applications SET status='confirmed',confirmed_at=? WHERE id=?",
      ).run(iso(), a.id);
      res.json({ ok: true });
    },
  );
  app.post(
    "/api/applications/:id/notice",
    auth,
    role("organization"),
    (req, res) => {
      const a = getApplication(req.params.id);
      if (a.organization_id !== req.user.id) throw fail(403, "Нет доступа.");
      if (a.status === "pending") throw fail(409, "Сначала примите решение.");
      if (!a.notice_sent_at)
        db.prepare("UPDATE applications SET notice_sent_at=? WHERE id=?").run(
          iso(),
          a.id,
        );
      res.json({ ok: true });
    },
  );
  app.get("/api/events/:id/roster", auth, role("organization"), (req, res) => {
    const e = owned(req.params.id, req.user);
    const rows = db
      .prepare(
        "SELECT full_name,contact,university,confirmed_at FROM applications WHERE event_id=? AND status='confirmed' ORDER BY full_name",
      )
      .all(e.id);
    if (req.query.format === "csv") {
      const cell = (v) =>
        '"' +
        String(v ?? "")
          .replace(/^(?:\s*[=+@\-]|[\t\r\n])/, "'$&")
          .replaceAll('"', '""') +
        '"';
      res.set("Content-Type", "text/csv; charset=utf-8");
      res.set(
        "Content-Disposition",
        `attachment; filename="komek-roster-${e.id}.csv"`,
      );
      return res.send(
        "\uFEFF" +
          [
            ["Имя", "Контакт", "Университет", "Подтверждение"],
            ...rows.map((r) => Object.values(r)),
          ]
            .map((r) => r.map(cell).join(","))
            .join("\r\n"),
      );
    }
    res.json({ roster: rows });
  });
  app.get("/api/notifications", auth, (req, res) =>
    res.json({
      notifications: db
        .prepare(
          "SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC",
        )
        .all(req.user.id),
    }),
  );
  app.post("/api/notifications/read", auth, (req, res) => {
    db.prepare(
      "UPDATE notifications SET read_at=? WHERE user_id=? AND read_at IS NULL",
    ).run(iso(), req.user.id);
    res.json({ ok: true });
  });
  app.use("/api", (req, res) =>
    res.status(404).json({ error: "Маршрут не найден." }),
  );
  app.use((err, req, res, next) => {
    if (!err.status) console.error(err);
    res
      .status(err.status || 500)
      .json({
        error: err.status
          ? err.message
          : "Не удалось выполнить запрос. Попробуйте ещё раз.",
      });
  });
  return app;
}
