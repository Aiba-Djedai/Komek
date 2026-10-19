import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  ArrowRight,
  Heart,
  Leaf,
  PawPrint,
  Users,
  GraduationCap,
  Sparkles,
  MapPin,
  CalendarDays,
  Clock3,
  Search,
  SlidersHorizontal,
  X,
  ChevronDown,
  Check,
  CheckCheck,
  Plus,
  LogOut,
  Bell,
  UserRound,
  Menu,
  Building2,
  CircleCheck,
  CircleAlert,
  Download,
  Copy,
  Mail,
  Send,
  LoaderCircle,
  ShieldCheck,
  Mountain,
  Bookmark,
} from "lucide-react";
import "./styles.css";

type User = {
  id: number;
  role: "volunteer" | "organization";
  name: string;
  email: string;
  university: string;
  contact: string;
  bio: string;
};
type Event = {
  id: number;
  organization_id: number;
  organization: string;
  title: string;
  description: string;
  category: string;
  location: string;
  starts_at: string;
  deadline: string;
  hours: number;
  capacity: number;
  occupied: number;
  application_count: number;
  image: string;
  requirements: string;
  closed: number;
};
type Application = {
  id: number;
  event_id: number;
  user_id: number;
  full_name: string;
  university: string;
  contact: string;
  motivation: string;
  status: string;
  created_at: string;
  decision_at: string | null;
  confirmed_at: string | null;
  notice_sent_at: string | null;
  title: string;
  starts_at: string;
  location?: string;
  image?: string;
  hours?: number;
};
type Notice = {
  id: number;
  message: string;
  created_at: string;
  read_at: string | null;
};
const CATEGORIES = [
  { id: "all", label: "Все направления", icon: Sparkles },
  { id: "eco", label: "Экология", icon: Leaf },
  { id: "social", label: "Социальная помощь", icon: Heart },
  { id: "animals", label: "Помощь животным", icon: PawPrint },
  { id: "events", label: "События", icon: Users },
  { id: "education", label: "Образование", icon: GraduationCap },
];
const STATUSES: Record<string, string> = {
  pending: "На рассмотрении",
  accepted: "Ожидает подтверждения",
  declined: "Отклонена",
  confirmed: "Участие подтверждено",
};
const date = (
  v: string,
  opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" },
) =>
  new Date(v).toLocaleDateString("ru-RU", { ...opts, timeZone: "Asia/Almaty" });
const time = (v: string) =>
  new Date(v).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Almaty",
  });
const stamp = (v: string) => `${date(v)} в ${time(v)}`;
const open = (e: Event) =>
  !e.closed &&
  new Date(e.deadline).getTime() > Date.now() &&
  e.occupied < e.capacity;
const past = (e: Event) => new Date(e.starts_at).getTime() < Date.now();
async function api<T = Record<string, unknown>>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const r = await fetch("/api" + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.error || "Ошибка соединения.");
  return data;
}
function useRoute() {
  const [route, setRoute] = useState(location.pathname);
  useEffect(() => {
    const h = () => setRoute(location.pathname);
    addEventListener("popstate", h);
    return () => removeEventListener("popstate", h);
  }, []);
  return [
    route,
    (path: string) => {
      history.pushState({}, "", path);
      setRoute(path);
      window.scrollTo({ top: 0, behavior: "instant" });
    },
  ] as const;
}
function App() {
  const [route, navigate] = useRoute();
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [auth, setAuth] = useState<"login" | "register" | null>(null);
  const [authRole, setAuthRole] = useState<"volunteer" | "organization">(
    "volunteer",
  );
  const [eventForm, setEventForm] = useState<Event | "new" | null>(null);
  const [applyEvent, setApplyEvent] = useState<Event | null>(null);
  const [profile, setProfile] = useState(false);
  const [info, setInfo] = useState<"privacy" | "terms" | null>(null);
  const [toast, setToast] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [category, setCategory] = useState("all");
  const [period, setPeriod] = useState("active");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("soon");
  const [dashTab, setDashTab] = useState("events");
  const [selectedEvent, setSelectedEvent] = useState("all");
  const [applicationStatus, setApplicationStatus] = useState("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [saved, setSaved] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("komek-saved") || "[]");
    } catch {
      return [];
    }
  });
  const notify = (message: string) => setToast(message);
  async function reload() {
    const { events } = await api<{ events: Event[] }>("/events");
    setEvents(events);
  }
  async function loadPrivate() {
    const [d, n] = await Promise.all([
      api<{ applications: Application[] }>("/dashboard"),
      api<{ notifications: Notice[] }>("/notifications"),
    ]);
    setApplications(d.applications);
    setNotices(n.notifications);
  }
  useEffect(() => {
    Promise.all([api<{ user: User | null }>("/auth/me"), reload()])
      .then(([d]) => setUser(d.user))
      .catch((e) => setLoadError(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (user) loadPrivate().catch((e) => notify(e.message));
    else {
      setApplications([]);
      setNotices([]);
    }
  }, [user?.id]);
  useEffect(() => {
    if (!user) return;
    let stopped = false;
    const refresh = () => {
      if (document.visibilityState === "visible" && !stopped)
        Promise.all([loadPrivate(), reload()]).catch(() => {});
    };
    const timer = setInterval(refresh, 30000);
    addEventListener("focus", refresh);
    return () => {
      stopped = true;
      clearInterval(timer);
      removeEventListener("focus", refresh);
    };
  }, [user?.id]);
  useEffect(() => {
    if (toast) {
      const id = setTimeout(() => setToast(""), 5000);
      return () => clearTimeout(id);
    }
  }, [toast]);
  const toggleSaved = (id: number) => {
    const next = saved.includes(id)
      ? saved.filter((x) => x !== id)
      : [...saved, id];
    setSaved(next);
    localStorage.setItem("komek-saved", JSON.stringify(next));
  };
  const afterAuth = (u: User) => {
    setUser(u);
    setAuth(null);
    notify(`Добро пожаловать, ${u.name.split(" ")[0]}!`);
  };
  const action = async (
    path: string,
    body?: unknown,
    message = "Готово",
    method = "POST",
  ) => {
    try {
      await api(path, method, body);
      await Promise.all([reload(), loadPrivate()]);
      notify(message);
    } catch (e) {
      notify((e as Error).message);
    }
  };
  const goDashboard = () => {
    if (!user) {
      setAuth("login");
      return;
    }
    setDashTab(user.role === "organization" ? "events" : "applications");
    navigate("/dashboard");
  };
  const beginApply = (e: Event) => {
    if (!user) {
      setAuthRole("volunteer");
      setAuth("login");
      return;
    }
    if (user.role === "organization") {
      notify(
        "Заявки подают волонтёры. Для организации доступно создание событий.",
      );
      return;
    }
    setApplyEvent(e);
  };
  const ownedEvents = events.filter((e) => e.organization_id === user?.id);
  const unread = notices.filter((n) => !n.read_at).length;
  const filtered = events
    .filter(
      (e) =>
        (category === "all" || e.category === category) &&
        (!search ||
          `${e.title} ${e.description} ${e.location} ${e.organization}`
            .toLowerCase()
            .includes(search.toLowerCase())) &&
        (period === "past"
          ? past(e)
          : period === "future"
            ? !past(e)
            : open(e)) &&
        (!favoritesOnly || saved.includes(e.id)),
    )
    .sort((a, b) =>
      sort === "soon"
        ? Date.parse(a.starts_at) - Date.parse(b.starts_at)
        : sort === "spots"
          ? b.capacity - b.occupied - (a.capacity - a.occupied)
          : b.id - a.id,
    );
  const currentEvent = route.startsWith("/events/")
    ? events.find((e) => e.id === Number(route.split("/")[2]))
    : null;
  const ownApplication = (e: Event) =>
    applications.find((a) => a.event_id === e.id && a.user_id === user?.id);
  return (
    <>
      <header className="header">
        <div className="container nav">
          <button
            className="brand"
            onClick={() => navigate("/")}
            aria-label="Kömek — главная"
          >
            <span className="brand-mark">
              <Heart size={22} fill="currentColor" />
            </span>
            kömek<span className="brand-dot">.</span>
          </button>
          <nav
            className={mobileNav ? "nav-links visible" : "nav-links"}
            aria-label="Основная навигация"
          >
            <button
              className={route === "/" ? "active" : ""}
              onClick={() => {
                navigate("/");
                setMobileNav(false);
              }}
            >
              Найти проект
            </button>
            <button
              className={route === "/organizations" ? "active" : ""}
              onClick={() => {
                navigate("/organizations");
                setMobileNav(false);
              }}
            >
              Организации
            </button>
            <button
              className={route === "/about" ? "active" : ""}
              onClick={() => {
                navigate("/about");
                setMobileNav(false);
              }}
            >
              Как это работает <ArrowUpRight size={14} />
            </button>
          </nav>
          <div className="nav-right">
            <span className="city">
              <MapPin size={15} /> Алматы
            </span>
            {user ? (
              <>
                <div className="notice-wrap">
                  <button
                    className="icon-button"
                    aria-label="Уведомления"
                    onClick={() => {
                      setNotificationsOpen(!notificationsOpen);
                      if (!notificationsOpen && unread)
                        api("/notifications/read", "POST")
                          .then(() =>
                            setNotices(
                              notices.map((n) => ({
                                ...n,
                                read_at: new Date().toISOString(),
                              })),
                            ),
                          )
                          .catch((e) => notify(e.message));
                    }}
                  >
                    <Bell size={20} />
                    {unread > 0 && <i className="notice-dot" />}
                  </button>
                  {notificationsOpen && (
                    <div className="notice-pop">
                      <h3>
                        Уведомления <span>{notices.length}</span>
                      </h3>
                      {notices.length ? (
                        notices.map((n) => (
                          <button
                            key={n.id}
                            onClick={() => {
                              setNotificationsOpen(false);
                              goDashboard();
                            }}
                          >
                            <span>{n.message}</span>
                            <small>{stamp(n.created_at)}</small>
                          </button>
                        ))
                      ) : (
                        <p>Здесь появятся решения по вашим заявкам.</p>
                      )}
                    </div>
                  )}
                </div>
                <button className="account-button" onClick={goDashboard}>
                  <span className="avatar small">{user.name[0]}</span>
                  <span>Мой кабинет</span>
                </button>
              </>
            ) : (
              <>
                <button
                  className="text-button login-btn"
                  onClick={() => setAuth("login")}
                >
                  Войти
                </button>
                <button
                  className="button dark small-button"
                  onClick={() => setAuth("register")}
                >
                  Присоединиться <ArrowUpRight size={16} />
                </button>
              </>
            )}
            <button
              className="mobile-menu icon-button"
              onClick={() => setMobileNav(!mobileNav)}
              aria-label="Меню"
            >
              <Menu />
            </button>
          </div>
        </div>
      </header>
      {loadError ? (
        <main className="container empty-page">
          <CircleAlert size={40} />
          <h1>Не удалось загрузить проекты</h1>
          <p>{loadError}</p>
          <button className="button dark" onClick={() => location.reload()}>
            Попробовать снова
          </button>
        </main>
      ) : loading ? (
        <main className="container loading">
          <LoaderCircle className="spin" /> Загружаем добрые дела…
        </main>
      ) : route === "/" ? (
        <>
          <main>
            <section className="hero container">
              <div className="hero-copy">
                <div className="eyebrow">
                  <span className="live-dot" /> МАЛЕНЬКИЕ ШАГИ. БОЛЬШИЕ
                  ПЕРЕМЕНЫ.
                </div>
                <h1>
                  Твоя помощь.
                  <br />
                  Чья-то <span className="serif">надежда.</span>
                  <svg className="heading-swish" viewBox="0 0 320 15">
                    <path d="M3 11Q148-5 314 8" />
                  </svg>
                </h1>
                <p>
                  Добрые дела ближе, чем кажется. Находи волонтёрские
                  <br className="desktop-br" /> проекты, помогай и меняй мир
                  вместе с нами.
                </p>
                <div className="hero-actions">
                  <button
                    className="button dark"
                    onClick={() =>
                      document
                        .querySelector("#projects")
                        ?.scrollIntoView({ behavior: "smooth" })
                    }
                  >
                    Найти своё дело <ArrowUpRight size={18} />
                  </button>
                  <button
                    className="hero-secondary"
                    onClick={() => {
                      setAuthRole("organization");
                      if (user?.role === "organization") setEventForm("new");
                      else setAuth("register");
                    }}
                  >
                    Я представляю организацию <ArrowRight size={17} />
                  </button>
                </div>
                <div className="hero-proof">
                  <div className="avatar-stack">
                    <img src="/images/avatar1.jpg" alt="" />
                    <img src="/images/avatar2.jpg" alt="" />
                    <img src="/images/avatar3.jpg" alt="" />
                    <span>
                      <Heart size={15} />
                    </span>
                  </div>
                  <span>
                    <strong>Добро начинается с людей</strong>
                    <small>Стань частью сообщества Алматы</small>
                  </span>
                </div>
              </div>
              <div className="hero-visual">
                <img
                  className="hero-photo"
                  src="/images/hero.jpg"
                  alt="Руки участников волонтёрской команды"
                />
                <div className="hero-photo-shade" />
                <span className="photo-tag">
                  <span className="live-dot" /> ВМЕСТЕ МЫ МОЖЕМ БОЛЬШЕ
                </span>
                <div className="photo-caption">
                  <span>
                    Город один.
                    <br />
                    Добрых дел — тысячи.
                  </span>
                  <span className="photo-arrow">
                    <ArrowUpRight size={26} />
                  </span>
                </div>
                <div className="floating-note">
                  <span className="note-heart">
                    <Heart size={24} />
                  </span>
                  <div>
                    Неравнодушие —<br />
                    <strong>это суперсила.</strong>
                  </div>
                  <svg viewBox="0 0 45 45">
                    <path d="M5 30Q25 35 27 8M17 15L28 6 35 17" />
                  </svg>
                </div>
                <span className="visual-spark">✳</span>
              </div>
            </section>
            <section className="impact container">
              <div className="impact-intro">
                <span className="impact-icon">
                  <Leaf size={25} />
                </span>
                <p>
                  Хорошие изменения
                  <br />
                  <strong>начинаются с нас</strong>
                </p>
              </div>
              <div>
                <strong>
                  {events.filter(open).length}
                  <span>↗</span>
                </strong>
                <p>открытых проектов</p>
              </div>
              <div>
                <strong>5</strong>
                <p>направлений помощи</p>
              </div>
              <div>
                <strong>
                  Алматы<span className="tiny-heart">♡</span>
                </strong>
                <p>город, который объединяет</p>
              </div>
              <div className="impact-last">
                <span>Каждый вклад важен.</span>
                <strong>Твой тоже.</strong>
                <ArrowUpRight size={24} />
              </div>
            </section>
            <section id="projects" className="projects container">
              <div className="section-heading">
                <div>
                  <div className="eyebrow">НАЙДИ ТО, ЧТО ОТКЛИКАЕТСЯ</div>
                  <h2>
                    Добрые дела ждут тебя<span className="green-dot">.</span>
                  </h2>
                  <p>
                    Выбирай проект по душе. А мы поможем сделать первый шаг.
                  </p>
                </div>
                <button
                  className={
                    "saved-toggle " + (favoritesOnly ? "selected" : "")
                  }
                  onClick={() => setFavoritesOnly(!favoritesOnly)}
                >
                  <Bookmark
                    size={17}
                    fill={favoritesOnly ? "currentColor" : "none"}
                  />{" "}
                  Избранное {saved.length > 0 && <span>{saved.length}</span>}
                </button>
              </div>
              <div className="category-tabs" aria-label="Направления">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    className={category === c.id ? "selected" : ""}
                    onClick={() => setCategory(c.id)}
                  >
                    <c.icon size={17} />
                    {c.label}
                  </button>
                ))}
              </div>
              <div className="catalog-toolbar">
                <div className="period-tabs">
                  {[
                    ["active", "Актуальные"],
                    ["future", "Предстоящие"],
                    ["past", "Завершённые"],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      className={period === id ? "selected" : ""}
                      onClick={() => setPeriod(id)}
                    >
                      {label}
                      {id === "active" && (
                        <span>{events.filter(open).length}</span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="search-sort">
                  <label className="search">
                    <Search size={17} />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Название, место или организация"
                      aria-label="Поиск проектов"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch("")}
                        aria-label="Очистить поиск"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </label>
                  <label className="sort">
                    <SlidersHorizontal size={16} />
                    <select
                      aria-label="Сортировка"
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                    >
                      <option value="soon">Ближайшие</option>
                      <option value="new">Сначала новые</option>
                      <option value="spots">Больше мест</option>
                    </select>
                  </label>
                </div>
              </div>
              <div className="results-count">
                {favoritesOnly ? "Избранные проекты" : "Проекты в Алматы"}{" "}
                <span>{filtered.length}</span>
                <span className="timezone-note">Время указано по Алматы</span>
              </div>
              {filtered.length ? (
                <div className="event-grid">
                  {filtered.map((e) => (
                    <EventCard
                      key={e.id}
                      event={e}
                      saved={saved.includes(e.id)}
                      toggleSaved={() => toggleSaved(e.id)}
                      onClick={() => navigate("/events/" + e.id)}
                    />
                  ))}
                </div>
              ) : (
                <Empty
                  icon={Search}
                  title="Пока ничего не нашлось"
                  text="Попробуйте другое направление, период или поисковый запрос."
                  action={() => {
                    setCategory("all");
                    setSearch("");
                    setPeriod("active");
                    setFavoritesOnly(false);
                  }}
                  button="Сбросить фильтры"
                />
              )}
              <div className="catalog-bottom">
                <span>Даже несколько часов могут изменить чей-то день.</span>
                <Heart size={17} />
              </div>
            </section>
            <section className="organization-cta container">
              <div className="cta-drawing">
                <Users size={48} />
                <span>✳</span>
              </div>
              <div>
                <span className="eyebrow">ДЕЛАТЬ ДОБРО ЛЕГЧЕ ВМЕСТЕ</span>
                <h2>Ищете людей, которым не всё равно?</h2>
                <p>
                  Расскажите о своём проекте. Мы поможем собрать вашу команду.
                </p>
              </div>
              <button
                className="button dark"
                onClick={() => {
                  if (user?.role === "organization") setEventForm("new");
                  else {
                    setAuthRole("organization");
                    setAuth("register");
                  }
                }}
              >
                Создать проект <Plus size={18} />
              </button>
            </section>
          </main>
        </>
      ) : route.startsWith("/events/") ? (
        currentEvent ? (
          <main className="container detail-page">
            <button className="back-link" onClick={() => navigate("/")}>
              <ArrowRight size={16} /> Назад к проектам
            </button>
            <div className="detail-grid">
              <article>
                <div className="detail-image">
                  <img src={currentEvent.image} alt={currentEvent.title} />
                  <span className={"category-pill " + currentEvent.category}>
                    {
                      CATEGORIES.find((c) => c.id === currentEvent.category)
                        ?.label
                    }
                  </span>
                  <button
                    className="save-button"
                    aria-label="В избранное"
                    onClick={() => toggleSaved(currentEvent.id)}
                  >
                    <Heart
                      fill={
                        saved.includes(currentEvent.id)
                          ? "currentColor"
                          : "none"
                      }
                      size={21}
                    />
                  </button>
                </div>
                <div className="detail-title">
                  <span className="org-label">
                    <span className="mini-logo">
                      <Leaf size={13} />
                    </span>
                    {currentEvent.organization}
                    <ShieldCheck size={15} />
                  </span>
                  <h1>{currentEvent.title}</h1>
                </div>
                <div className="detail-prose">
                  <h2>О проекте</h2>
                  <p>{currentEvent.description}</p>
                  <h2>Что нужно знать</h2>
                  <p>
                    {currentEvent.requirements ||
                      "Специальная подготовка не требуется. Возьмите с собой хорошее настроение! Все детали уточнит организатор."}
                  </p>
                  <div className="detail-tip">
                    <Leaf size={24} />
                    <p>
                      <strong>Твой вклад имеет значение</strong>
                      <br />
                      После одобрения заявки не забудь подтвердить участие —
                      организатор будет рассчитывать на тебя.
                    </p>
                  </div>
                  <h2>Организатор</h2>
                  <div className="organization-profile">
                    <span className="avatar">
                      <Leaf />
                    </span>
                    <div>
                      <h3>{currentEvent.organization}</h3>
                      <p>Волонтёрская организация · Алматы</p>
                    </div>
                  </div>
                </div>
              </article>
              <aside className="event-sidebar">
                <span
                  className={
                    "availability " + (open(currentEvent) ? "" : "unavailable")
                  }
                >
                  <span className="live-dot" />
                  {past(currentEvent)
                    ? "Событие завершено"
                    : open(currentEvent)
                      ? "Приём заявок открыт"
                      : "Приём заявок закрыт"}
                </span>
                <h3>Присоединяйся к доброму делу</h3>
                <div className="event-facts">
                  <Fact
                    icon={CalendarDays}
                    title="Когда"
                    text={`${date(currentEvent.starts_at)}, ${time(currentEvent.starts_at)}`}
                  />
                  <Fact
                    icon={MapPin}
                    title="Где"
                    text={currentEvent.location}
                  />
                  <Fact
                    icon={Clock3}
                    title="Продолжительность"
                    text={`${currentEvent.hours} ч. волонтёрства`}
                  />
                  <Fact
                    icon={Users}
                    title="Участники"
                    text={`${currentEvent.occupied} из ${currentEvent.capacity} мест занято`}
                  />
                  <Fact
                    icon={CalendarDays}
                    title="Подать заявку до"
                    text={stamp(currentEvent.deadline)}
                  />
                </div>
                <div className="capacity-track">
                  <span
                    style={{
                      width:
                        Math.min(
                          100,
                          (currentEvent.occupied / currentEvent.capacity) * 100,
                        ) + "%",
                    }}
                  />
                </div>
                {user?.id === currentEvent.organization_id ? (
                  <button
                    className="button dark full"
                    onClick={() => setEventForm(currentEvent)}
                  >
                    Редактировать событие <ArrowUpRight size={18} />
                  </button>
                ) : ownApplication(currentEvent) ? (
                  <>
                    <div
                      className={
                        "status " + ownApplication(currentEvent)!.status
                      }
                    >
                      {STATUSES[ownApplication(currentEvent)!.status]}
                    </div>
                    <button className="button dark full" onClick={goDashboard}>
                      Открыть мои заявки <ArrowRight size={17} />
                    </button>
                  </>
                ) : (
                  <button
                    className="button dark full"
                    disabled={
                      !open(currentEvent) || user?.role === "organization"
                    }
                    onClick={() => beginApply(currentEvent)}
                  >
                    {open(currentEvent) ? "Хочу помочь" : "Заявки закрыты"}{" "}
                    <ArrowUpRight size={18} />
                  </button>
                )}
                <p className="sidebar-note">
                  <ShieldCheck size={14} /> Участие бесплатное. Добро бесценно.
                </p>
                <button
                  className="button outline full"
                  onClick={() =>
                    navigator.clipboard
                      .writeText(location.href)
                      .then(() => notify("Ссылка на событие скопирована"))
                      .catch(() =>
                        notify("Скопируйте ссылку из адресной строки."),
                      )
                  }
                >
                  <Copy size={16} /> Поделиться проектом
                </button>
              </aside>
            </div>
          </main>
        ) : (
          <main className="container empty-page">
            <Empty
              icon={Search}
              title="Проект не найден"
              text="Возможно, адрес содержит ошибку."
              action={() => navigate("/")}
              button="К проектам"
            />
          </main>
        )
      ) : route === "/dashboard" ? (
        <main className="container dashboard">
          {user ? (
            <>
              <div className="dashboard-heading">
                <div>
                  <div className="eyebrow">
                    ЛИЧНЫЙ КАБИНЕТ ·{" "}
                    {user.role === "organization" ? "ОРГАНИЗАЦИЯ" : "ВОЛОНТЁР"}
                  </div>
                  <h1>
                    {user.role === "organization"
                      ? user.name
                      : `Привет, ${user.name.split(" ")[0]}!`}{" "}
                    <span className="green-dot">✳</span>
                  </h1>
                  <p>
                    {user.role === "organization"
                      ? "Ваши проекты, команда и добрые перемены — в одном месте."
                      : "Здесь начинается твоя история добрых дел."}
                  </p>
                </div>
                <div className="button-row">
                  <button
                    className="button outline"
                    onClick={() => setProfile(true)}
                  >
                    <UserRound size={17} /> Мой профиль
                  </button>
                  {user.role === "organization" && (
                    <button
                      className="button dark"
                      onClick={() => setEventForm("new")}
                    >
                      <Plus size={18} /> Создать событие
                    </button>
                  )}
                  <button
                    className="icon-button"
                    aria-label="Выйти из аккаунта"
                    onClick={async () => {
                      try {
                        await api("/auth/logout", "POST");
                        setUser(null);
                        navigate("/");
                        notify("Вы вышли из аккаунта.");
                      } catch (e) {
                        notify((e as Error).message);
                      }
                    }}
                  >
                    <LogOut size={19} />
                  </button>
                </div>
              </div>
              <div className="dashboard-stats">
                {(user.role === "organization"
                  ? [
                      ["Мои события", ownedEvents.length, CalendarDays],
                      [
                        "Заявки на рассмотрении",
                        applications.filter((a) => a.status === "pending")
                          .length,
                        Clock3,
                      ],
                      [
                        "Подтвердили участие",
                        applications.filter((a) => a.status === "confirmed")
                          .length,
                        CheckCheck,
                      ],
                    ]
                  : [
                      ["Мои заявки", applications.length, Send],
                      [
                        "Подтверждённые участия",
                        applications.filter((a) => a.status === "confirmed")
                          .length,
                        CheckCheck,
                      ],
                      [
                        "Часы завершённых проектов",
                        applications
                          .filter(
                            (a) =>
                              a.status === "confirmed" &&
                              Date.parse(a.starts_at) < Date.now(),
                          )
                          .reduce((s, a) => s + (a.hours || 0), 0),
                        Clock3,
                      ],
                    ]
                ).map(([label, n, Icon]) => {
                  const I = Icon as typeof Heart;
                  return (
                    <div key={String(label)}>
                      <span className="stat-symbol">
                        <I size={23} />
                      </span>
                      <div>
                        <strong>{String(n)}</strong>
                        <p>{String(label)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {user.role === "organization" ? (
                <>
                  <Quality applications={applications} />
                  <div className="dashboard-tabs">
                    <button
                      className={dashTab === "events" ? "selected" : ""}
                      onClick={() => setDashTab("events")}
                    >
                      Мои события <span>{ownedEvents.length}</span>
                    </button>
                    <button
                      className={dashTab === "applications" ? "selected" : ""}
                      onClick={() => setDashTab("applications")}
                    >
                      Заявки участников <span>{applications.length}</span>
                    </button>
                    <button
                      className={dashTab === "roster" ? "selected" : ""}
                      onClick={() => setDashTab("roster")}
                    >
                      Подтверждённый состав
                    </button>
                  </div>
                  {dashTab === "events" ? (
                    ownedEvents.length ? (
                      <div className="manage-events">
                        {ownedEvents.map((e) => (
                          <div className="manage-event" key={e.id}>
                            <img src={e.image} alt="" />
                            <div className="manage-event-info">
                              <span
                                className={
                                  "availability " +
                                  (open(e) ? "" : "unavailable")
                                }
                              >
                                {past(e)
                                  ? "Завершено"
                                  : e.closed
                                    ? "Закрыто организатором"
                                    : open(e)
                                      ? "Приём открыт"
                                      : "Приём закрыт"}
                              </span>
                              <button
                                onClick={() => navigate("/events/" + e.id)}
                              >
                                <h3>{e.title}</h3>
                              </button>
                              <p>
                                {stamp(e.starts_at)} · {e.application_count}{" "}
                                заявок · {e.occupied}/{e.capacity} мест
                              </p>
                            </div>
                            <div className="manage-actions">
                              <button
                                className="button outline"
                                onClick={() => {
                                  setSelectedEvent(String(e.id));
                                  setDashTab("applications");
                                }}
                              >
                                Заявки
                              </button>
                              <button
                                className="text-button"
                                onClick={() => setEventForm(e)}
                              >
                                Редактировать
                              </button>
                              {!past(e) && (
                                <button
                                  className="text-button"
                                  onClick={() =>
                                    action(
                                      "/events/" + e.id,
                                      { closed: !e.closed },
                                      e.closed
                                        ? "Приём заявок открыт"
                                        : "Приём заявок закрыт",
                                      "PATCH",
                                    )
                                  }
                                >
                                  {e.closed ? "Открыть приём" : "Закрыть приём"}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Empty
                        icon={CalendarDays}
                        title="Ваш первый проект начинается здесь"
                        text="Создайте событие и поделитесь ссылкой с будущими волонтёрами."
                        action={() => setEventForm("new")}
                        button="Создать событие"
                      />
                    )
                  ) : (
                    <>
                      <div className="dashboard-filters">
                        <label>
                          Событие
                          <select
                            aria-label="Событие"
                            value={selectedEvent}
                            onChange={(e) => setSelectedEvent(e.target.value)}
                          >
                            <option value="all">Все события</option>
                            {ownedEvents.map((e) => (
                              <option key={e.id} value={e.id}>
                                {e.title}
                              </option>
                            ))}
                          </select>
                        </label>
                        {dashTab === "applications" && (
                          <label>
                            Статус
                            <select
                              aria-label="Статус заявки"
                              value={applicationStatus}
                              onChange={(e) =>
                                setApplicationStatus(e.target.value)
                              }
                            >
                              <option value="all">Все заявки</option>
                              {Object.entries(STATUSES).map(([k, v]) => (
                                <option key={k} value={k}>
                                  {v}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                        {dashTab === "roster" && selectedEvent !== "all" && (
                          <a
                            className="button dark"
                            href={`/api/events/${selectedEvent}/roster?format=csv`}
                          >
                            <Download size={17} /> Скачать CSV
                          </a>
                        )}
                      </div>
                      {dashTab === "roster" ? (
                        <>
                          <div className="inline-info">
                            <ShieldCheck size={20} />
                            <span>
                              В списке только участники, которые подтвердили
                              участие. Одобренные без подтверждения показаны
                              отдельно ниже.
                            </span>
                          </div>
                          <Roster
                            applications={applications.filter(
                              (a) =>
                                a.status === "confirmed" &&
                                (selectedEvent === "all" ||
                                  String(a.event_id) === selectedEvent),
                            )}
                          />
                          <h3 className="subheading">
                            Одобрены, но ещё не подтвердили
                          </h3>
                          <Roster
                            applications={applications.filter(
                              (a) =>
                                a.status === "accepted" &&
                                (selectedEvent === "all" ||
                                  String(a.event_id) === selectedEvent),
                            )}
                            unconfirmed
                          />
                        </>
                      ) : (
                        <div className="applicant-list">
                          {applications.filter(
                            (a) =>
                              (selectedEvent === "all" ||
                                String(a.event_id) === selectedEvent) &&
                              (applicationStatus === "all" ||
                                a.status === applicationStatus),
                          ).length ? (
                            applications
                              .filter(
                                (a) =>
                                  (selectedEvent === "all" ||
                                    String(a.event_id) === selectedEvent) &&
                                  (applicationStatus === "all" ||
                                    a.status === applicationStatus),
                              )
                              .map((a) => (
                                <Applicant
                                  key={a.id}
                                  application={a}
                                  decide={(status) =>
                                    action(
                                      `/applications/${a.id}/decision`,
                                      { status },
                                      status === "accepted"
                                        ? "Заявка одобрена. Волонтёр получил уведомление в кабинете."
                                        : "Заявка отклонена. Волонтёр получил уведомление.",
                                      "PATCH",
                                    )
                                  }
                                  markSent={() =>
                                    action(
                                      `/applications/${a.id}/notice`,
                                      undefined,
                                      "Время ручной отправки записано.",
                                    )
                                  }
                                  notify={notify}
                                />
                              ))
                          ) : (
                            <Empty
                              icon={Users}
                              title="Заявок пока нет"
                              text="Поделитесь ссылкой на событие или измените фильтры."
                            />
                          )}
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : (
                <>
                  <div className="dashboard-tabs">
                    <button className="selected">Мои заявки</button>
                    <button
                      onClick={() => {
                        setFavoritesOnly(true);
                        navigate("/");
                      }}
                    >
                      Избранное <span>{saved.length}</span>
                    </button>
                  </div>
                  {applications.length ? (
                    <div className="volunteer-apps">
                      {applications.map((a) => (
                        <div className="volunteer-app" key={a.id}>
                          <img src={a.image} alt="" />
                          <div>
                            <span className={"status " + a.status}>
                              {STATUSES[a.status]}
                            </span>
                            <button
                              onClick={() => navigate("/events/" + a.event_id)}
                            >
                              <h3>{a.title}</h3>
                            </button>
                            <p>
                              <CalendarDays size={14} /> {stamp(a.starts_at)}{" "}
                              <span>·</span> {a.location}
                            </p>
                            <small>
                              Заявка: {stamp(a.created_at)}
                              {a.decision_at &&
                                ` · Решение: ${stamp(a.decision_at)}`}
                            </small>
                            {a.status === "accepted" && (
                              <p className="confirmation-hint">
                                {Date.parse(a.starts_at) < Date.now()
                                  ? "Событие уже началось. Участие не было подтверждено."
                                  : "Вас ждут! Подтвердите, что сможете прийти."}
                              </p>
                            )}
                          </div>
                          {a.status === "accepted" &&
                            Date.parse(a.starts_at) > Date.now() && (
                              <button
                                className="button dark"
                                onClick={() =>
                                  action(
                                    `/applications/${a.id}/confirm`,
                                    undefined,
                                    "Участие подтверждено! Вы добавлены в список команды.",
                                  )
                                }
                              >
                                <Check size={17} /> Подтвердить участие
                              </button>
                            )}
                          {a.status === "confirmed" && (
                            <CircleCheck className="confirmed-icon" size={28} />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Empty
                      icon={Send}
                      title="Первое доброе дело ещё впереди"
                      text="Найдите проект по душе и отправьте заявку — её статус появится здесь."
                      action={() => navigate("/")}
                      button="Найти проект"
                    />
                  )}
                </>
              )}
            </>
          ) : (
            <Empty
              icon={UserRound}
              title="Добро пожаловать в личный кабинет"
              text="Войдите, чтобы увидеть свои события и заявки."
              action={() => setAuth("login")}
              button="Войти"
            />
          )}
        </main>
      ) : route === "/organizations" ? (
        <main className="container info-page">
          <div className="eyebrow">ТЕ, КТО ОБЪЕДИНЯЕТ</div>
          <h1>
            Организации Алматы<span className="green-dot">.</span>
          </h1>
          <p className="lead">
            Знакомьтесь с командами, которые делают наш город лучше.
          </p>
          <div className="org-grid">
            {Array.from(
              new Map(events.map((e) => [e.organization_id, e])).values(),
            ).map((e) => (
              <article className="org-card" key={e.organization_id}>
                <span className="avatar large">
                  <Leaf size={32} />
                </span>
                <ShieldCheck className="org-verified" />
                <h2>{e.organization}</h2>
                <p>
                  Команда волонтёрских инициатив в Алматы. Присоединяйтесь к
                  добрым делам и создавайте перемены вместе.
                </p>
                <span>
                  {
                    events.filter(
                      (v) => v.organization_id === e.organization_id && open(v),
                    ).length
                  }{" "}
                  открытых проектов
                </span>
                <button
                  className="button dark full"
                  onClick={() => {
                    setSearch(e.organization);
                    setPeriod("active");
                    setCategory("all");
                    navigate("/");
                    setTimeout(
                      () =>
                        document.querySelector("#projects")?.scrollIntoView(),
                      50,
                    );
                  }}
                >
                  Посмотреть проекты <ArrowUpRight size={17} />
                </button>
              </article>
            ))}
          </div>
        </main>
      ) : route === "/about" ? (
        <main className="container info-page">
          <div className="eyebrow">ДОБРО БЕЗ ЛИШНИХ СЛОЖНОСТЕЙ</div>
          <h1>
            Несколько шагов.
            <br />
            <span className="serif">Настоящие перемены.</span>
          </h1>
          <p className="lead">
            Kömek соединяет людей, которые хотят помочь, и команды, которым
            нужна поддержка.
          </p>
          <div className="how-grid">
            {[
              [
                "01",
                "Найди своё дело",
                "Выбери направление, посмотри события и найди проект, который тебе откликается.",
                Search,
              ],
              [
                "02",
                "Расскажи о себе",
                "Зарегистрируйся как волонтёр и подай заявку. Организатор увидит твои контакты и мотивацию.",
                Send,
              ],
              [
                "03",
                "Подтверди участие",
                "Следи за статусом в кабинете. После одобрения подтверди, что придёшь, — команда ждёт тебя.",
                CheckCheck,
              ],
            ].map(([n, title, body, Icon]) => {
              const I = Icon as typeof Heart;
              return (
                <article key={String(n)}>
                  <span className="how-number">{String(n)}</span>
                  <I size={28} />
                  <h2>{String(title)}</h2>
                  <p>{String(body)}</p>
                </article>
              );
            })}
          </div>
          <div className="about-banner">
            <div>
              <h2>Для организаций</h2>
              <p>
                Создавайте события, принимайте решения по заявкам и скачивайте
                подтверждённый состав. Все проекты бесплатны на этапе пилота.
                Встроенный чат и оплата не входят в MVP.
              </p>
            </div>
            <button
              className="button dark"
              onClick={() => {
                setAuthRole("organization");
                user?.role === "organization"
                  ? setEventForm("new")
                  : setAuth("register");
              }}
            >
              Собрать команду <ArrowUpRight size={17} />
            </button>
          </div>
        </main>
      ) : (
        <main className="container empty-page">
          <Empty
            icon={Search}
            title="Страница не найдена"
            text="Вернёмся туда, где ждут добрые дела?"
            action={() => navigate("/")}
            button="На главную"
          />
        </main>
      )}
      <footer className="footer">
        <div className="container footer-top">
          <div>
            <button className="brand" onClick={() => navigate("/")}>
              <span className="brand-mark">
                <Heart size={22} fill="currentColor" />
              </span>
              kömek<span className="brand-dot">.</span>
            </button>
            <p>
              Объединяем людей.
              <br />
              Умножаем добро.
            </p>
          </div>
          <div className="footer-links">
            <button onClick={() => navigate("/")}>Найти проект</button>
            <button onClick={() => navigate("/organizations")}>
              Организации
            </button>
            <button onClick={() => navigate("/about")}>О платформе</button>
          </div>
          <div className="footer-note">
            <span>Сделано с заботой об Алматы</span>
            <Mountain size={40} strokeWidth={1} />
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} Kömek. Каждый может помочь.</span>
          <div>
            <button onClick={() => setInfo("privacy")}>
              Конфиденциальность
            </button>
            <button onClick={() => setInfo("terms")}>
              Условия использования
            </button>
          </div>
          <span className="pilot-badge">
            <span className="live-dot" /> Пилотная версия
          </span>
        </div>
      </footer>
      {auth && (
        <Modal
          title={
            auth === "login"
              ? "Рады видеть тебя снова"
              : "Давай делать добро вместе"
          }
          subtitle={
            auth === "login"
              ? "Войди, чтобы продолжить свою историю добрых дел."
              : "Один аккаунт — много возможностей помочь."
          }
          onClose={() => setAuth(null)}
        >
          <AuthForm
            mode={auth}
            role={authRole}
            setRole={setAuthRole}
            setMode={setAuth}
            onSuccess={afterAuth}
          />
        </Modal>
      )}
      {eventForm && (
        <Modal
          wide
          title={
            eventForm === "new" ? "Новое доброе дело" : "Редактировать событие"
          }
          subtitle="Расскажите о проекте — ваша команда обязательно найдётся."
          onClose={() => setEventForm(null)}
        >
          <EventForm
            event={eventForm === "new" ? null : eventForm}
            onSubmit={async (values) => {
              await api(
                eventForm === "new" ? "/events" : "/events/" + eventForm.id,
                eventForm === "new" ? "POST" : "PATCH",
                values,
              );
              await reload();
              setEventForm(null);
              setDashTab("events");
              navigate("/dashboard");
              notify(
                eventForm === "new"
                  ? "Событие опубликовано! Поделитесь ссылкой с волонтёрами."
                  : "Изменения сохранены.",
              );
            }}
          />
        </Modal>
      )}
      {applyEvent && user && (
        <Modal
          title="Твоё доброе дело начинается здесь"
          subtitle={applyEvent.title}
          onClose={() => setApplyEvent(null)}
        >
          <ApplyForm
            user={user}
            onSubmit={async (values) => {
              await api(
                `/events/${applyEvent.id}/applications`,
                "POST",
                values,
              );
              await loadPrivate();
              setApplyEvent(null);
              notify(
                "Заявка отправлена! Следите за решением в личном кабинете.",
              );
            }}
          />
        </Modal>
      )}
      {profile && user && (
        <Modal
          title="Мой профиль"
          subtitle={
            user.role === "organization"
              ? "Пусть волонтёры узнают вашу команду."
              : "Расскажи немного о себе."
          }
          onClose={() => setProfile(false)}
        >
          <Form
            onSubmit={async (values) => {
              const result = await api<{ user: User }>(
                "/profile",
                "PATCH",
                values,
              );
              setUser(result.user);
              setProfile(false);
              notify("Профиль сохранён.");
            }}
            button="Сохранить изменения"
          >
            <Field
              label={
                user.role === "organization"
                  ? "Название организации"
                  : "Имя и фамилия"
              }
              name="name"
              defaultValue={user.name}
              required
              minLength={2}
            />
            <Field
              label="Email"
              name="email"
              type="email"
              defaultValue={user.email}
              disabled
            />
            <Field
              label="Университет / место работы"
              name="university"
              defaultValue={user.university}
            />
            <Field
              label="Telegram или email для связи"
              name="contact"
              defaultValue={user.contact}
            />
            <label className="field">
              О себе / об организации
              <textarea
                name="bio"
                defaultValue={user.bio}
                rows={3}
                maxLength={1000}
              />
            </label>
          </Form>
        </Modal>
      )}
      {info && (
        <Modal
          title={
            info === "privacy"
              ? "Обработка персональных данных"
              : "Условия пилотной платформы"
          }
          onClose={() => setInfo(null)}
        >
          <div className="legal-copy">
            {info === "privacy" ? (
              <>
                <p>
                  При регистрации сохраняются имя, email, защищённый хеш пароля
                  и данные профиля. При подаче заявки сохраняются имя,
                  университет, контакт и мотивация.
                </p>
                <p>
                  Заявку видите вы и организация, которая создала событие.
                  Подтверждённый состав с именем и контактом доступен только
                  этой организации. Заявки не публикуются в каталоге.
                </p>
                <p>
                  Данные хранятся в локальной базе платформы и используются для
                  организации участия. Для удаления аккаунта и данных обратитесь
                  к администратору развёрнутого экземпляра. Контакт оператора и
                  юридические основания обработки должны быть определены до
                  публичного запуска.
                </p>
              </>
            ) : (
              <>
                <p>
                  Kömek — пилотная платформа волонтёрских проектов Алматы.
                  Регистрация и участие бесплатны. Организатор отвечает за
                  достоверность описания, безопасность события и обработку
                  заявок.
                </p>
                <p>
                  Отправка заявки не гарантирует участие. После одобрения
                  необходимо подтвердить, что вы придёте. Все даты отображаются
                  по времени Алматы.
                </p>
                <p>
                  Решения появляются в личном кабинете. Дополнительное сообщение
                  в Telegram или по email отправляется организатором вручную.
                  Демо-аккаунты предназначены только для знакомства: не
                  добавляйте в них личные данные.
                </p>
              </>
            )}
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <CircleCheck size={20} />
          <span>{toast}</span>
          <button aria-label="Закрыть уведомление" onClick={() => setToast("")}>
            <X size={17} />
          </button>
        </div>
      )}
    </>
  );
}
function EventCard({
  event: e,
  saved,
  toggleSaved,
  onClick,
}: {
  event: Event;
  saved: boolean;
  toggleSaved: () => void;
  onClick: () => void;
}) {
  const cat = CATEGORIES.find((c) => c.id === e.category)!;
  return (
    <article className="event-card">
      <div className="card-image">
        <button
          className="image-link"
          onClick={onClick}
          tabIndex={-1}
          aria-label={e.title}
        >
          <img src={e.image} alt={e.title} loading="lazy" />
        </button>
        <span className={"category-pill " + e.category}>
          <cat.icon size={13} />
          {cat.label}
        </span>
        <button
          className={"save-button " + (saved ? "is-saved" : "")}
          onClick={toggleSaved}
          aria-label={saved ? "Убрать из избранного" : "В избранное"}
          aria-pressed={saved}
        >
          <Heart size={18} fill={saved ? "currentColor" : "none"} />
        </button>
        <div className="date-badge">
          <strong>{date(e.starts_at, { day: "2-digit" })}</strong>
          <span>{date(e.starts_at, { month: "short" }).replace(".", "")}</span>
        </div>
      </div>
      <div className="card-content">
        <span className="org-label">
          <span className="mini-logo">
            <Leaf size={12} />
          </span>
          {e.organization}
          <ShieldCheck size={13} />
        </span>
        <button className="card-title" onClick={onClick}>
          <h3>{e.title}</h3>
        </button>
        <p className="card-description">{e.description}</p>
        <div className="card-meta">
          <span>
            <MapPin size={14} />
            {e.location}
          </span>
          <span>
            <Clock3 size={14} />
            {e.hours} ч.
          </span>
        </div>
        <div className="card-bottom">
          <span className={open(e) ? "spots" : "closed-spots"}>
            <span className="live-dot" />
            {past(e)
              ? "Проект завершён"
              : open(e)
                ? `${e.capacity - e.occupied} свободных мест`
                : "Приём закрыт"}
          </span>
          <button onClick={onClick}>
            {past(e) ? "Посмотреть" : "Подробнее"} <ArrowUpRight size={16} />
          </button>
        </div>
      </div>
    </article>
  );
}
function Fact({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Heart;
  title: string;
  text: string;
}) {
  return (
    <div className="fact">
      <Icon size={20} />
      <div>
        <small>{title}</small>
        <span>{text}</span>
      </div>
    </div>
  );
}
function Empty({
  icon: Icon,
  title,
  text,
  action,
  button,
}: {
  icon: typeof Heart;
  title: string;
  text: string;
  action?: () => void;
  button?: string;
}) {
  return (
    <div className="empty-state">
      <span>
        <Icon size={30} />
      </span>
      <h2>{title}</h2>
      <p>{text}</p>
      {action && (
        <button className="button dark" onClick={action}>
          {button} <ArrowRight size={16} />
        </button>
      )}
    </div>
  );
}
function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      ref.current?.querySelectorAll<HTMLElement>(
        "button,input,textarea,select,a[href]",
      );
    focusable()?.[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const nodes = focusable();
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          last.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={"modal " + (wide ? "wide" : "")}
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <button
          className="modal-close icon-button"
          aria-label="Закрыть"
          onClick={onClose}
        >
          <X size={21} />
        </button>
        <span className="modal-brand">
          <Heart size={23} fill="currentColor" />
        </span>
        <h2 id="modal-title">{title}</h2>
        {subtitle && <p className="modal-subtitle">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
function Field(
  props: React.InputHTMLAttributes<HTMLInputElement> & { label: string },
) {
  const { label, ...input } = props;
  return (
    <label className="field">
      {label}
      <input {...input} />
    </label>
  );
}
function Form({
  children,
  onSubmit,
  button,
}: {
  children: React.ReactNode;
  onSubmit: (v: Record<string, FormDataEntryValue | boolean>) => Promise<void>;
  button: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        const fd = new FormData(e.currentTarget);
        const values: Record<string, FormDataEntryValue | boolean> =
          Object.fromEntries(fd.entries());
        if (fd.has("consent")) values.consent = true;
        setBusy(true);
        setError("");
        try {
          await onSubmit(values);
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {children}
      {error && (
        <div className="form-error" role="alert">
          <CircleAlert size={18} />
          {error}
        </div>
      )}
      <button className="button dark full" disabled={busy} type="submit">
        {busy ? <LoaderCircle className="spin" size={17} /> : null}
        {busy ? "Подождите…" : button}
        {!busy && <ArrowUpRight size={17} />}
      </button>
    </form>
  );
}
function AuthForm({
  mode,
  role,
  setRole,
  setMode,
  onSuccess,
}: {
  mode: "login" | "register";
  role: "volunteer" | "organization";
  setRole: (s: "volunteer" | "organization") => void;
  setMode: (s: "login" | "register") => void;
  onSuccess: (u: User) => void;
}) {
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoError, setDemoError] = useState("");
  return (
    <>
      <div className="role-switch">
        <button
          className={role === "volunteer" ? "selected" : ""}
          onClick={() => setRole("volunteer")}
        >
          <Heart size={16} /> Я волонтёр
        </button>
        <button
          className={role === "organization" ? "selected" : ""}
          onClick={() => setRole("organization")}
        >
          <Building2 size={16} /> Организация
        </button>
      </div>
      <Form
        key={mode + role}
        onSubmit={async (values) => {
          const r = await api<{ user: User }>("/auth/" + mode, "POST", {
            ...values,
            role,
          });
          onSuccess(r.user);
        }}
        button={mode === "login" ? "Войти в аккаунт" : "Создать аккаунт"}
      >
        {mode === "register" && (
          <Field
            label={
              role === "organization" ? "Название организации" : "Имя и фамилия"
            }
            name="name"
            placeholder={
              role === "organization"
                ? "Название вашей команды"
                : "Как к тебе обращаться?"
            }
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
          />
        )}
        <Field
          label="Email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          autoComplete="email"
        />
        <Field
          label="Пароль"
          name="password"
          type="password"
          placeholder="Не менее 8 символов"
          required
          minLength={mode === "register" ? 8 : 1}
          maxLength={128}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
        {mode === "register" && (
          <>
            <Field
              label="Telegram или email для связи"
              name="contact"
              placeholder="@username или email"
            />
            <label className="consent">
              <input name="consent" type="checkbox" required />
              <span>
                Соглашаюсь на обработку персональных данных для регистрации и
                участия в волонтёрских проектах. Мои заявки будут доступны
                организаторам выбранных событий.
              </span>
            </label>
          </>
        )}
      </Form>
      <p className="auth-switch">
        {mode === "login" ? "Ещё нет аккаунта?" : "Уже с нами?"}{" "}
        <button
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? "Зарегистрироваться" : "Войти"}
        </button>
      </p>
      <div className="demo-box">
        <span>ПОСМОТРЕТЬ, КАК ВСЁ УСТРОЕНО</span>
        <p>Демо-аккаунты с примерами событий и заявок.</p>
        <div>
          <button
            disabled={demoBusy}
            onClick={async () => {
              setDemoBusy(true);
              try {
                const r = await api<{ user: User }>("/auth/login", "POST", {
                  email: "volunteer@komek.kz",
                  password: "Komek2026!",
                });
                onSuccess(r.user);
              } catch (e) {
                setDemoError((e as Error).message);
              } finally {
                setDemoBusy(false);
              }
            }}
          >
            <UserRound size={15} /> Волонтёр <ArrowUpRight size={14} />
          </button>
          <button
            disabled={demoBusy}
            onClick={async () => {
              setDemoBusy(true);
              try {
                const r = await api<{ user: User }>("/auth/login", "POST", {
                  email: "org@komek.kz",
                  password: "Komek2026!",
                });
                onSuccess(r.user);
              } catch (e) {
                setDemoError((e as Error).message);
              } finally {
                setDemoBusy(false);
              }
            }}
          >
            <Building2 size={15} /> Организация <ArrowUpRight size={14} />
          </button>
        </div>
        {demoError && <p className="form-error">{demoError}</p>}
      </div>
    </>
  );
}
function ApplyForm({
  user,
  onSubmit,
}: {
  user: User;
  onSubmit: (v: Record<string, FormDataEntryValue | boolean>) => Promise<void>;
}) {
  return (
    <Form onSubmit={onSubmit} button="Отправить заявку">
      <Field
        label="Имя и фамилия"
        name="full_name"
        defaultValue={user.name}
        required
        minLength={2}
        maxLength={200}
      />
      <Field
        label="Университет / место работы"
        name="university"
        defaultValue={user.university}
        placeholder="Где учишься или работаешь?"
        required
        minLength={2}
        maxLength={200}
      />
      <Field
        label="Telegram или email"
        name="contact"
        defaultValue={user.contact || user.email}
        placeholder="@username или email"
        required
      />
      <label className="field">
        Почему хочешь присоединиться?{" "}
        <span className="optional">Необязательно</span>
        <textarea
          name="motivation"
          placeholder="Расскажи о себе и своём желании помочь"
          rows={3}
          maxLength={2000}
        />
      </label>
      <label className="consent">
        <input type="checkbox" name="consent" required />
        <span>
          Согласен(-на) на передачу имени, университета и контакта организатору
          события для рассмотрения заявки и координации участия.
        </span>
      </label>
      <div className="inline-info">
        <ShieldCheck size={18} />
        <span>Твои контакты увидит только организатор этого события.</span>
      </div>
    </Form>
  );
}
const localDate = (v?: string) => {
  if (!v) return "";
  const d = new Date(v);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
function EventForm({
  event,
  onSubmit,
}: {
  event: Event | null;
  onSubmit: (v: unknown) => Promise<void>;
}) {
  return (
    <Form
      onSubmit={(v) =>
        onSubmit({
          ...v,
          image: v.image || event?.image || "/images/planting.png",
          starts_at: new Date(String(v.starts_at)).toISOString(),
          deadline: new Date(String(v.deadline)).toISOString(),
          hours: Number(v.hours),
          capacity: Number(v.capacity),
        })
      }
      button={event ? "Сохранить событие" : "Опубликовать событие"}
    >
      <Field
        label="Название проекта"
        name="title"
        defaultValue={event?.title}
        required
        minLength={4}
        maxLength={150}
        placeholder="Какое доброе дело будем делать?"
      />
      <label className="field">
        Описание
        <textarea
          name="description"
          defaultValue={event?.description}
          rows={4}
          required
          minLength={20}
          maxLength={10000}
          placeholder="Расскажите о цели проекта, задачах волонтёров и о том, что их ждёт"
        />
      </label>
      <div className="form-grid">
        <label className="field">
          Направление
          <select name="category" defaultValue={event?.category || "eco"}>
            {CATEGORIES.slice(1).map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <Field
          label="Место проведения"
          name="location"
          defaultValue={event?.location}
          required
          minLength={3}
          placeholder="Адрес, Алматы"
        />
      </div>
      <div className="form-grid">
        <Field
          label="Дата и время начала"
          name="starts_at"
          type="datetime-local"
          defaultValue={localDate(event?.starts_at)}
          required
        />
        <Field
          label="Дедлайн подачи заявок"
          name="deadline"
          type="datetime-local"
          defaultValue={localDate(event?.deadline)}
          required
        />
      </div>
      <p className="field-hint">
        В форме используется часовой пояс вашего устройства. На сайте время
        отображается по Алматы.
      </p>
      <div className="form-grid">
        <Field
          label="Продолжительность, часов"
          name="hours"
          type="number"
          defaultValue={event?.hours || 3}
          required
          min="0.5"
          max="168"
          step="0.5"
        />
        <Field
          label="Количество участников"
          name="capacity"
          type="number"
          defaultValue={event?.capacity || 20}
          required
          min="1"
          max="10000"
        />
      </div>
      <Field
        label="Ссылка на фотографию (HTTPS)"
        name="image"
        defaultValue={event?.image.startsWith("https:") ? event.image : ""}
        type="url"
        placeholder="https://… — или оставьте для обложки по умолчанию"
      />
      <label className="field">
        Требования и что взять с собой
        <textarea
          name="requirements"
          rows={2}
          defaultValue={event?.requirements}
          maxLength={2000}
          placeholder="Возраст, навыки, одежда и другие важные детали"
        />
      </label>
      <div className="inline-info">
        <CircleCheck size={18} />
        <span>
          Нажимая кнопку, вы подтверждаете достоверность информации и готовность
          провести событие.
        </span>
      </div>
    </Form>
  );
}
function Applicant({
  application: a,
  decide,
  markSent,
  notify,
}: {
  application: Application;
  decide: (s: string) => Promise<void>;
  markSent: () => Promise<void>;
  notify: (s: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const elapsed = (Date.now() - Date.parse(a.created_at)) / 3600000;
  const template =
    a.status === "declined"
      ? `Здравствуйте, ${a.full_name}! К сожалению, заявка на «${a.title}» отклонена. Спасибо за желание помочь. Вы можете выбрать другое событие на Kömek.`
      : `Здравствуйте, ${a.full_name}! Ваша заявка на «${a.title}» одобрена. Пожалуйста, подтвердите участие в личном кабинете Kömek. Начало: ${stamp(a.starts_at)}.`;
  return (
    <article className="applicant">
      <div className="applicant-top">
        <span className="avatar">{a.full_name[0]}</span>
        <div>
          <h3>{a.full_name}</h3>
          <p>
            {a.university} · {a.contact}
          </p>
        </div>
        <span className={"status " + a.status}>{STATUSES[a.status]}</span>
      </div>
      <p className="application-event">{a.title}</p>
      {a.motivation && <p className="applicant-motivation">«{a.motivation}»</p>}
      <div className="application-times">
        <span>Подана: {stamp(a.created_at)}</span>
        {a.decision_at && <span>Решение: {stamp(a.decision_at)}</span>}
        {a.confirmed_at && <span>Подтверждено: {stamp(a.confirmed_at)}</span>}
        {a.status === "pending" && elapsed > 44 && (
          <span className="warning">Ожидает решения более 44 часов</span>
        )}
      </div>
      {a.status === "pending" ? (
        <div className="applicant-actions">
          <button
            disabled={busy}
            className="button dark small-button"
            onClick={async () => {
              setBusy(true);
              await decide("accepted");
              setBusy(false);
            }}
          >
            <Check size={16} /> Принять
          </button>
          <button
            disabled={busy}
            className="button outline small-button"
            onClick={async () => {
              setBusy(true);
              await decide("declined");
              setBusy(false);
            }}
          >
            <X size={16} /> Отказать
          </button>
        </div>
      ) : (
        <div className="notice-log">
          <button
            className="text-button"
            onClick={() => setExpanded(!expanded)}
          >
            <Mail size={15} />
            {expanded ? "Скрыть шаблон" : "Сообщение для Telegram / email"}{" "}
            <ChevronDown size={14} />
          </button>
          {a.notice_sent_at ? (
            <span className="sent-label">
              <CheckCheck size={14} /> Отправка отмечена:{" "}
              {stamp(a.notice_sent_at)}
            </span>
          ) : (
            <span
              className={
                a.decision_at &&
                Date.now() - Date.parse(a.decision_at) > 4 * 3600000
                  ? "warning"
                  : ""
              }
            >
              {a.decision_at &&
              Date.now() - Date.parse(a.decision_at) > 4 * 3600000
                ? "Более 4 часов после решения — отправьте сообщение"
                : "Внешнее сообщение ещё не отмечено"}
            </span>
          )}
        </div>
      )}
      {expanded && (
        <div className="message-template">
          <p>{template}</p>
          <div className="button-row">
            <button
              className="button outline small-button"
              onClick={() =>
                navigator.clipboard
                  .writeText(template)
                  .then(() => notify("Шаблон скопирован"))
                  .catch(() => notify("Выделите и скопируйте текст сообщения."))
              }
            >
              <Copy size={14} /> Скопировать
            </button>
            {!a.notice_sent_at && (
              <button
                className="button dark small-button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await markSent();
                  setBusy(false);
                }}
              >
                <Check size={14} /> Я отправил(а) сообщение
              </button>
            )}
          </div>
          <small>
            Отправьте сообщение вручную по указанному контакту и отметьте
            отправку. Это сохраняет время в журнале.
          </small>
        </div>
      )}
    </article>
  );
}
function Quality({ applications }: { applications: Application[] }) {
  const sent = applications.filter((a) => a.notice_sent_at);
  const timely = sent.filter(
    (a) =>
      Date.parse(a.notice_sent_at!) - Date.parse(a.created_at) <= 48 * 3600000,
  );
  return (
    <div className="quality-panel">
      <span>
        <Clock3 size={17} />
        <strong>Своевременные ответы</strong>
      </span>
      <p>
        Внешние сообщения в течение 48 ч.:{" "}
        <strong>
          {applications.length
            ? Math.round((timely.length / applications.length) * 100) + "%"
            : "—"}
        </strong>
        <span> · Цель: 80%</span>
      </p>
      <p>
        Решение — до 44 ч. <span>·</span> Сообщение — до 4 ч. после решения
      </p>
    </div>
  );
}
function Roster({
  applications,
  unconfirmed = false,
}: {
  applications: Application[];
  unconfirmed?: boolean;
}) {
  return applications.length ? (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Участник</th>
            <th>Контакт</th>
            <th>Событие</th>
            <th>{unconfirmed ? "Статус" : "Подтверждение"}</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((a) => (
            <tr key={a.id}>
              <td>
                <strong>{a.full_name}</strong>
                <small>{a.university}</small>
              </td>
              <td>{a.contact}</td>
              <td>{a.title}</td>
              <td>
                {unconfirmed ? (
                  <span className="status accepted">Не подтверждено</span>
                ) : a.confirmed_at ? (
                  stamp(a.confirmed_at)
                ) : (
                  "—"
                )}
                {unconfirmed &&
                  Date.parse(a.starts_at) - Date.now() < 86400000 && (
                    <small className="warning">До события менее 24 часов</small>
                  )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty
      icon={Users}
      title={
        unconfirmed
          ? "Все одобренные участники подтвердили участие"
          : "Подтверждённых участников пока нет"
      }
      text={
        unconfirmed
          ? "Неподтверждённых заявок нет."
          : "После одобрения волонтёр должен подтвердить участие в своём кабинете."
      }
    />
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
