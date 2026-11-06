import { getLanguage, notificationText, t, useLanguage } from "./lib/i18n";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import React, { useEffect, useId, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  ArrowRight,
  Heart,
  Leaf,
  Users,
  MapPin,
  CalendarDays,
  Clock3,
  Search,
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
} from "lucide-react";
import "./styles.css";
import type { User, Event, Application } from "./types";
import {
  date,
  time,
  stamp,
  eventIsOpen as open,
  eventIsPast as past,
} from "./lib/events";
import { OrganizationHome, VolunteerHome } from "./components/Home";
import { MyProjects } from "./components/MyProjects";
import { groupParticipations } from "./lib/participation";
import "./components/LanguageSwitcher.css";
import { Catalog } from "./components/Catalog";
import { defaultCatalogFilters } from "./lib/catalog";
import { getCategories } from "./lib/categories";
import { categoryDefinitions, suggestedCities } from "../shared/catalog.ts";

type Notice = {
  id: number;
  message: string;
  created_at: string;
  read_at: string | null;
  source_message?: string;
};
const getStatuses = (): Record<string, string> => ({
  pending: t("На рассмотрении"),
  accepted: t("Ожидает подтверждения"),
  declined: t("Отклонена"),
  confirmed: t("Участие подтверждено"),
});
async function api<T = Record<string, unknown>>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  let r: Response;
  let data;
  try {
    r = await fetch("/api" + path, {
      method,
      headers: {
        "Accept-Language": getLanguage(),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    data = await r.json();
  } catch {
    throw Error("Ошибка соединения.");
  }
  if (!r.ok)
    throw Error(data.source_error || data.error || "Ошибка соединения.");
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
  const language = useLanguage();
  const [route, navigate] = useRoute();
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [privateLoading, setPrivateLoading] = useState(true);
  const [auth, setAuth] = useState<"login" | "register" | null>(null);
  const [authRole, setAuthRole] = useState<"volunteer" | "organization">(
    "volunteer",
  );
  const [eventForm, setEventForm] = useState<Event | "new" | null>(null);
  const [applyEvent, setApplyEvent] = useState<Event | null>(null);
  const [profile, setProfile] = useState(false);
  const [info, setInfo] = useState<"privacy" | "terms" | null>(null);
  const [toast, setToast] = useState<{
    source: string;
    params?: readonly unknown[];
  } | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [filters, setFilters] = useState(defaultCatalogFilters);
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
  const notify = (source: string, params?: readonly unknown[]) =>
    setToast({ source, params });
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
    if (user) {
      setPrivateLoading(true);
      loadPrivate()
        .catch((e) => notify(e.message))
        .finally(() => setPrivateLoading(false));
    } else {
      setPrivateLoading(false);
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
      const id = setTimeout(() => setToast(null), 5000);
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
    setMobileNav(false);
    setApplications([]);
    setPrivateLoading(true);
    if (route === "/" || route === "/projects") navigate("/");
    notify("Добро пожаловать, {0}!", [u.name.split(" ")[0]]);
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
  const registerAs = (role: User["role"]) => {
    setAuthRole(role);
    setMobileNav(false);
    setAuth("register");
  };
  const manageOrganization = (
    tab: "events" | "applications" | "roster",
    eventId?: number,
  ) => {
    setDashTab(tab);
    setSelectedEvent(eventId ? String(eventId) : "all");
    setApplicationStatus("all");
    navigate("/dashboard");
  };
  const findProjects = () =>
    document.querySelector("#projects")?.scrollIntoView({ behavior: "smooth" });
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
  const currentEvent = route.startsWith("/events/")
    ? events.find((e) => e.id === Number(route.split("/")[2]))
    : null;
  const ownApplication = (e: Event) =>
    applications.find((a) => a.event_id === e.id && a.user_id === user?.id);
  return (
    <>
      <header className={"header" + (user ? " signed-in-header" : "")}>
        <div className="container nav">
          <button
            className="brand"
            onClick={() => navigate("/")}
            aria-label={t("Kömek — главная")}
          >
            <span className="brand-mark">
              <Heart size={22} fill="currentColor" />
            </span>
            kömek<span className="brand-dot">.</span>
          </button>
          <nav
            className={mobileNav ? "nav-links visible" : "nav-links"}
            aria-label={t("Основная навигация")}
          >
            <button
              className={route === "/" ? "active" : ""}
              onClick={() => {
                navigate("/");
                setMobileNav(false);
              }}
            >
              {user?.role === "organization"
                ? t("Главная организации")
                : t("Найти проект")}
            </button>
            {user?.role === "volunteer" && (
              <button
                className={route === "/my-projects" ? "active" : ""}
                aria-current={route === "/my-projects" ? "page" : undefined}
                onClick={() => {
                  navigate("/my-projects");
                  setMobileNav(false);
                }}
              >
                {t("Мои проекты")}
              </button>
            )}
            <button
              className={
                route ===
                (user?.role === "organization" ? "/projects" : "/organizations")
                  ? "active"
                  : ""
              }
              onClick={() => {
                navigate(
                  user?.role === "organization"
                    ? "/projects"
                    : "/organizations",
                );
                setMobileNav(false);
              }}
            >
              {user?.role === "organization"
                ? t("Каталог проектов")
                : t("Организации")}
            </button>
            <button
              className={route === "/about" ? "active" : ""}
              onClick={() => {
                navigate("/about");
                setMobileNav(false);
              }}
            >
              {t("Как это работает ")}
              <ArrowUpRight size={14} />
            </button>
            {!user && (
              <button
                className="mobile-nav-login"
                onClick={() => {
                  setMobileNav(false);
                  setAuth("login");
                }}
              >
                {t("Войти")}
              </button>
            )}
          </nav>
          <div className="nav-right">
            <LanguageSwitcher />
            <span className="city">
              <MapPin size={15} /> {t(" Алматы")}
            </span>
            {user ? (
              <>
                <div className="notice-wrap">
                  <button
                    className="icon-button"
                    aria-label={t("Уведомления")}
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
                        {t("Уведомления ")}
                        <span>{notices.length}</span>
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
                            <span>
                              {notificationText(n.source_message || n.message)}
                            </span>
                            <small>{stamp(n.created_at)}</small>
                          </button>
                        ))
                      ) : (
                        <p>{t("Здесь появятся решения по вашим заявкам.")}</p>
                      )}
                    </div>
                  )}
                </div>
                <button
                  className={"account-button " + user.role}
                  aria-label={t("Мой кабинет")}
                  onClick={goDashboard}
                >
                  <span className="avatar small">{user.name[0]}</span>
                  <span className="account-copy">
                    <strong>
                      {user.role === "organization"
                        ? t("Организация")
                        : t("Волонтёр")}
                    </strong>
                    <span>{t("Мой кабинет")}</span>
                  </span>
                </button>
              </>
            ) : (
              <>
                <button
                  className="text-button login-btn"
                  onClick={() => setAuth("login")}
                >
                  {t("Войти")}
                </button>
                <button
                  className="button dark small-button header-registration"
                  onClick={() => registerAs("volunteer")}
                >
                  {t("Регистрация ")}
                  <ArrowUpRight size={16} />
                </button>
              </>
            )}
            <button
              className="mobile-menu icon-button"
              onClick={() => setMobileNav(!mobileNav)}
              aria-label={t("Меню")}
            >
              <Menu />
            </button>
          </div>
        </div>
      </header>
      {loadError ? (
        <main className="container empty-page">
          <CircleAlert size={40} />
          <h1>{t("Не удалось загрузить проекты")}</h1>
          <p>{t(loadError)}</p>
          <button className="button dark" onClick={() => location.reload()}>
            {t("Попробовать снова")}
          </button>
        </main>
      ) : loading ? (
        <main className="container loading">
          <LoaderCircle className="spin" /> {t(" Загружаем добрые дела…")}
        </main>
      ) : route === "/" && user?.role === "organization" ? (
        <OrganizationHome
          user={user}
          events={ownedEvents}
          applications={applications}
          loading={privateLoading}
          onCreate={() => setEventForm("new")}
          onManage={manageOrganization}
          onEdit={setEventForm}
          onView={(e) => navigate("/events/" + e.id)}
          onCatalog={() => navigate("/projects")}
        />
      ) : route === "/" || route === "/projects" ? (
        <>
          <main className={user ? "authenticated-catalog" : "guest-home"}>
            {user ? (
              user.role === "volunteer" ? (
                <VolunteerHome
                  user={user}
                  applications={applications}
                  loading={privateLoading}
                  onFind={findProjects}
                  onApplications={goDashboard}
                  onConfirm={(a) =>
                    action(
                      `/applications/${a.id}/confirm`,
                      undefined,
                      "Участие подтверждено! Вы добавлены в список команды.",
                    )
                  }
                />
              ) : (
                <section className="container organization-catalog-heading">
                  <span className="home-role-badge organization-role">
                    <Building2 size={16} /> {t(" Аккаунт организации")}
                  </span>
                  <h1>{t("Проекты сообщества")}</h1>
                  <p>
                    {t(
                      "Знакомьтесь с инициативами других команд и находите вдохновение для своих событий.",
                    )}
                  </p>
                  <button className="text-button" onClick={() => navigate("/")}>
                    {t("На главную организации ")}
                    <ArrowRight size={16} />
                  </button>
                </section>
              )
            ) : (
              <>
                <section className="hero container">
                  <div className="hero-copy">
                    <div className="eyebrow">
                      <span className="live-dot" />{" "}
                      {t(" МАЛЕНЬКИЕ ШАГИ. БОЛЬШИЕ ПЕРЕМЕНЫ.")}
                    </div>
                    <h1>
                      {t("Твоя помощь.")}
                      <br />
                      {t("Чья-то ")}
                      <span className="serif">{t("надежда.")}</span>
                      <svg className="heading-swish" viewBox="0 0 320 15">
                        <path d="M3 11Q148-5 314 8" />
                      </svg>
                    </h1>
                    <p>
                      {t("Добрые дела ближе, чем кажется. Находи волонтёрские")}
                      <br className="desktop-br" />{" "}
                      {t(" проекты, помогай и меняй мир вместе с нами.")}
                    </p>
                    <div
                      className="hero-actions signup-actions"
                      aria-label={t("Регистрация по роли")}
                    >
                      <button
                        className="signup-action volunteer-signup"
                        onClick={() => registerAs("volunteer")}
                      >
                        <span className="signup-action-icon">
                          <Heart size={23} />
                        </span>
                        <span>
                          <strong>{t("Найти своё дело")}</strong>
                          <span>{t("Зарегистрироваться как волонтёр")}</span>
                        </span>
                        <ArrowUpRight size={22} />
                      </button>
                      <button
                        className="signup-action organization-signup"
                        onClick={() => registerAs("organization")}
                      >
                        <span className="signup-action-icon">
                          <Building2 size={23} />
                        </span>
                        <span>
                          <strong>{t("Я представляю организацию")}</strong>
                          <span>{t("Создать аккаунт и собрать команду")}</span>
                        </span>
                        <ArrowUpRight size={22} />
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
                        <strong>{t("Добро начинается с людей")}</strong>
                        <small>{t("Стань частью сообщества Алматы")}</small>
                      </span>
                    </div>
                  </div>
                  <div className="hero-visual">
                    <img
                      className="hero-photo"
                      src="/images/hero.jpg"
                      alt={t("Руки участников волонтёрской команды")}
                    />
                    <div className="hero-photo-shade" />
                    <span className="photo-tag">
                      <span className="live-dot" />{" "}
                      {t(" ВМЕСТЕ МЫ МОЖЕМ БОЛЬШЕ")}
                    </span>
                    <div className="photo-caption">
                      <span>
                        {t("Город один.")}
                        <br />
                        {t("Добрых дел — тысячи.")}
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
                        {t("Неравнодушие —")}
                        <br />
                        <strong>{t("это суперсила.")}</strong>
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
                      {t("Хорошие изменения")}
                      <br />
                      <strong>{t("начинаются с нас")}</strong>
                    </p>
                  </div>
                  <div>
                    <strong>
                      {events.filter(open).length}
                      <span>↗</span>
                    </strong>
                    <p>{t("открытых проектов")}</p>
                  </div>
                  <div>
                    <strong>{categoryDefinitions.length}</strong>
                    <p>{t("направлений помощи")}</p>
                  </div>
                  <div>
                    <strong>
                      {t("Алматы")}
                      <span className="tiny-heart">♡</span>
                    </strong>
                    <p>{t("город, который объединяет")}</p>
                  </div>
                  <div className="impact-last">
                    <span>{t("Каждый вклад важен.")}</span>
                    <strong>{t("Твой тоже.")}</strong>
                    <ArrowUpRight size={24} />
                  </div>
                </section>
              </>
            )}
            <Catalog
              events={events}
              filters={filters}
              onChange={setFilters}
              favoritesOnly={favoritesOnly}
              onToggleFavorites={() => setFavoritesOnly(!favoritesOnly)}
              saved={saved}
              onSave={toggleSaved}
              onView={(event) => navigate("/events/" + event.id)}
              onReset={() => {
                setFilters(defaultCatalogFilters);
                setFavoritesOnly(false);
              }}
            />
            {!user ? (
              <>
                <section className="organization-cta container">
                  <div className="cta-drawing">
                    <Users size={48} />
                    <span>✳</span>
                  </div>
                  <div>
                    <span className="eyebrow">
                      {t("ДЕЛАТЬ ДОБРО ЛЕГЧЕ ВМЕСТЕ")}
                    </span>
                    <h2>{t("Ищете людей, которым не всё равно?")}</h2>
                    <p>
                      {t(
                        "Расскажите о своём проекте. Мы поможем собрать вашу команду.",
                      )}
                    </p>
                  </div>
                  <button
                    className="button dark"
                    onClick={() => {
                      registerAs("organization");
                    }}
                  >
                    {t("Создать проект ")}
                    <Plus size={18} />
                  </button>
                </section>
              </>
            ) : user.role === "volunteer" ? (
              <section className="container volunteer-bottom-cta">
                <Heart size={30} />
                <div>
                  <h2>{t("Твоя история добрых дел уже началась")}</h2>
                  <p>
                    {t(
                      "Следи за ответами организаторов и подтверждай участие в своём кабинете.",
                    )}
                  </p>
                </div>
                <button className="button dark" onClick={goDashboard}>
                  {t("Мои заявки ")}
                  <ArrowRight size={17} />
                </button>
              </section>
            ) : (
              <section className="container volunteer-bottom-cta">
                <Building2 size={30} />
                <div>
                  <h2>{t("Готовы к следующему проекту?")}</h2>
                  <p>
                    {t(
                      "Создайте событие и пригласите волонтёров в свою команду.",
                    )}
                  </p>
                </div>
                <button
                  className="button dark"
                  onClick={() => setEventForm("new")}
                >
                  {t("Создать проект ")}
                  <Plus size={17} />
                </button>
              </section>
            )}
          </main>
        </>
      ) : route.startsWith("/events/") ? (
        currentEvent ? (
          <main className="container detail-page">
            <button className="back-link" onClick={() => navigate("/")}>
              <ArrowRight size={16} /> {t(" Назад к проектам")}
            </button>
            <div className="detail-grid">
              <article>
                <div className="detail-image">
                  <img src={currentEvent.image} alt={currentEvent.title} />
                  <span className={"category-pill " + currentEvent.category}>
                    {
                      getCategories().find(
                        (c) => c.id === currentEvent.category,
                      )?.label
                    }
                  </span>
                  <button
                    className="save-button"
                    aria-label={t("В избранное")}
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
                  <h2>{t("О проекте")}</h2>
                  <p>{currentEvent.description}</p>
                  <h2>{t("Что нужно знать")}</h2>
                  <p>
                    {currentEvent.requirements ||
                      t(
                        "Специальная подготовка не требуется. Возьмите с собой хорошее настроение! Все детали уточнит организатор.",
                      )}
                  </p>
                  <div className="detail-tip">
                    <Leaf size={24} />
                    <p>
                      <strong>{t("Твой вклад имеет значение")}</strong>
                      <br />
                      {t(
                        "После одобрения заявки не забудь подтвердить участие — организатор будет рассчитывать на тебя.",
                      )}
                    </p>
                  </div>
                  <h2>{t("Организатор")}</h2>
                  <div className="organization-profile">
                    <span className="avatar">
                      <Leaf />
                    </span>
                    <div>
                      <h3>{currentEvent.organization}</h3>
                      <p>{t("Волонтёрская организация · Алматы")}</p>
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
                    ? t("Событие завершено")
                    : open(currentEvent)
                      ? t("Приём заявок открыт")
                      : t("Приём заявок закрыт")}
                </span>
                <h3>{t("Присоединяйся к доброму делу")}</h3>
                <div className="event-facts">
                  <Fact
                    icon={CalendarDays}
                    title={t("Когда")}
                    text={`${date(currentEvent.starts_at)}, ${time(currentEvent.starts_at)}`}
                  />
                  <Fact
                    icon={MapPin}
                    title={t("Где")}
                    text={[t(currentEvent.city), currentEvent.location]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                  <Fact
                    icon={Clock3}
                    title={t("Продолжительность")}
                    text={t("{0} ч. волонтёрства", [currentEvent.hours])}
                  />
                  <Fact
                    icon={Users}
                    title={t("Участники")}
                    text={t("{0} из {1} мест занято", [
                      currentEvent.occupied,
                      currentEvent.capacity,
                    ])}
                  />
                  <Fact
                    icon={CalendarDays}
                    title={t("Подать заявку до")}
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
                    {t("Редактировать событие ")}
                    <ArrowUpRight size={18} />
                  </button>
                ) : ownApplication(currentEvent) ? (
                  <>
                    <div
                      className={
                        "status " + ownApplication(currentEvent)!.status
                      }
                    >
                      {getStatuses()[ownApplication(currentEvent)!.status]}
                    </div>
                    <button className="button dark full" onClick={goDashboard}>
                      {t("Открыть мои заявки ")}
                      <ArrowRight size={17} />
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
                    {open(currentEvent)
                      ? t("Хочу помочь")
                      : t("Заявки закрыты")}{" "}
                    <ArrowUpRight size={18} />
                  </button>
                )}
                <p className="sidebar-note">
                  <ShieldCheck size={14} />{" "}
                  {t(" Участие бесплатное. Добро бесценно.")}
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
                  <Copy size={16} /> {t(" Поделиться проектом")}
                </button>
              </aside>
            </div>
          </main>
        ) : (
          <main className="container empty-page">
            <Empty
              icon={Search}
              title={t("Проект не найден")}
              text={t("Возможно, адрес содержит ошибку.")}
              action={() => navigate("/")}
              button={t("К проектам")}
            />
          </main>
        )
      ) : route === "/my-projects" ? (
        user?.role === "volunteer" ? (
          <MyProjects
            applications={applications.filter((a) => a.user_id === user.id)}
            loading={privateLoading}
            onView={(id) => navigate("/events/" + id)}
            onFind={() => navigate("/projects")}
            onApplications={goDashboard}
            onConfirm={(a) =>
              action(
                `/applications/${a.id}/confirm`,
                undefined,
                "Участие подтверждено! Вы добавлены в список команды.",
              )
            }
          />
        ) : (
          <main className="container empty-page">
            <Empty
              icon={UserRound}
              title={
                user
                  ? t("Страница для волонтёров")
                  : t("Войдите, чтобы увидеть свои проекты")
              }
              text={
                user
                  ? t(
                      "Созданные вашей организацией события доступны в личном кабинете.",
                    )
                  : t("Здесь будут ваши предстоящие события и история участия.")
              }
              action={
                user
                  ? goDashboard
                  : () => {
                      setAuthRole("volunteer");
                      setAuth("login");
                    }
              }
              button={user ? t("Мой кабинет") : t("Войти")}
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
                    {t("ЛИЧНЫЙ КАБИНЕТ ·")}{" "}
                    {user.role === "organization"
                      ? t("ОРГАНИЗАЦИЯ")
                      : t("ВОЛОНТЁР")}
                  </div>
                  <h1>
                    {user.role === "organization"
                      ? user.name
                      : t("Привет, {0}!", [user.name.split(" ")[0]])}{" "}
                    <span className="green-dot">✳</span>
                  </h1>
                  <p>
                    {user.role === "organization"
                      ? t(
                          "Ваши проекты, команда и добрые перемены — в одном месте.",
                        )
                      : t("Здесь начинается твоя история добрых дел.")}
                  </p>
                </div>
                <div className="button-row">
                  <button
                    className="button outline"
                    onClick={() => setProfile(true)}
                  >
                    <UserRound size={17} /> {t(" Мой профиль")}
                  </button>
                  {user.role === "organization" && (
                    <button
                      className="button dark"
                      onClick={() => setEventForm("new")}
                    >
                      <Plus size={18} /> {t(" Создать событие")}
                    </button>
                  )}
                  <button
                    className="icon-button"
                    aria-label={t("Выйти из аккаунта")}
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
                      [t("Мои события"), ownedEvents.length, CalendarDays],
                      [
                        t("Заявки на рассмотрении"),
                        applications.filter((a) => a.status === "pending")
                          .length,
                        Clock3,
                      ],
                      [
                        t("Подтвердили участие"),
                        applications.filter((a) => a.status === "confirmed")
                          .length,
                        CheckCheck,
                      ],
                    ]
                  : [
                      [t("Мои заявки"), applications.length, Send],
                      [
                        t("Подтверждённые участия"),
                        applications.filter((a) => a.status === "confirmed")
                          .length,
                        CheckCheck,
                      ],
                      [
                        t("Часы завершённых проектов"),
                        groupParticipations(applications).completed.reduce(
                          (s, a) => s + (a.hours || 0),
                          0,
                        ),
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
                      {t("Мои события ")}
                      <span>{ownedEvents.length}</span>
                    </button>
                    <button
                      className={dashTab === "applications" ? "selected" : ""}
                      onClick={() => setDashTab("applications")}
                    >
                      {t("Заявки участников ")}
                      <span>{applications.length}</span>
                    </button>
                    <button
                      className={dashTab === "roster" ? "selected" : ""}
                      onClick={() => setDashTab("roster")}
                    >
                      {t("Подтверждённый состав")}
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
                                  ? t("Завершено")
                                  : e.closed
                                    ? t("Закрыто организатором")
                                    : open(e)
                                      ? t("Приём открыт")
                                      : t("Приём закрыт")}
                              </span>
                              <button
                                onClick={() => navigate("/events/" + e.id)}
                              >
                                <h3>{e.title}</h3>
                              </button>
                              <p>
                                {stamp(e.starts_at)} · {e.application_count}{" "}
                                {t("заявок · ")}
                                {e.occupied}/{e.capacity} {t(" мест")}
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
                                {t("Заявки")}
                              </button>
                              <button
                                className="text-button"
                                onClick={() => setEventForm(e)}
                              >
                                {t("Редактировать")}
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
                                  {e.closed
                                    ? t("Открыть приём")
                                    : t("Закрыть приём")}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Empty
                        icon={CalendarDays}
                        title={t("Ваш первый проект начинается здесь")}
                        text={t(
                          "Создайте событие и поделитесь ссылкой с будущими волонтёрами.",
                        )}
                        action={() => setEventForm("new")}
                        button={t("Создать событие")}
                      />
                    )
                  ) : (
                    <>
                      <div className="dashboard-filters">
                        <label>
                          {t("Событие")}
                          <select
                            aria-label={t("Событие")}
                            value={selectedEvent}
                            onChange={(e) => setSelectedEvent(e.target.value)}
                          >
                            <option value="all">{t("Все события")}</option>
                            {ownedEvents.map((e) => (
                              <option key={e.id} value={e.id}>
                                {e.title}
                              </option>
                            ))}
                          </select>
                        </label>
                        {dashTab === "applications" && (
                          <label>
                            {t("Статус")}
                            <select
                              aria-label={t("Статус заявки")}
                              value={applicationStatus}
                              onChange={(e) =>
                                setApplicationStatus(e.target.value)
                              }
                            >
                              <option value="all">{t("Все заявки")}</option>
                              {Object.entries(getStatuses()).map(([k, v]) => (
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
                            href={`/api/events/${selectedEvent}/roster?format=csv&lang=${language}`}
                          >
                            <Download size={17} /> {t(" Скачать CSV")}
                          </a>
                        )}
                      </div>
                      {dashTab === "roster" ? (
                        <>
                          <div className="inline-info">
                            <ShieldCheck size={20} />
                            <span>
                              {t(
                                "В списке только участники, которые подтвердили участие. Одобренные без подтверждения показаны отдельно ниже.",
                              )}
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
                            {t("Одобрены, но ещё не подтвердили")}
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
                              title={t("Заявок пока нет")}
                              text={t(
                                "Поделитесь ссылкой на событие или измените фильтры.",
                              )}
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
                    <button className="selected">{t("Мои заявки")}</button>
                    <button onClick={() => navigate("/my-projects")}>
                      {t("Мои проекты")}
                    </button>
                    <button
                      onClick={() => {
                        setFavoritesOnly(true);
                        navigate("/");
                      }}
                    >
                      {t("Избранное ")}
                      <span>{saved.length}</span>
                    </button>
                  </div>
                  {applications.length ? (
                    <div className="volunteer-apps">
                      {applications.map((a) => (
                        <div className="volunteer-app" key={a.id}>
                          <img src={a.image} alt="" />
                          <div>
                            <span className={"status " + a.status}>
                              {getStatuses()[a.status]}
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
                              {t("Заявка: ")}
                              {stamp(a.created_at)}
                              {a.decision_at &&
                                t(" · Решение: {0}", [stamp(a.decision_at)])}
                            </small>
                            {a.status === "accepted" && (
                              <p className="confirmation-hint">
                                {Date.parse(a.starts_at) < Date.now()
                                  ? t(
                                      "Событие уже началось. Участие не было подтверждено.",
                                    )
                                  : t(
                                      "Вас ждут! Подтвердите, что сможете прийти.",
                                    )}
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
                                <Check size={17} /> {t(" Подтвердить участие")}
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
                      title={t("Первое доброе дело ещё впереди")}
                      text={t(
                        "Найдите проект по душе и отправьте заявку — её статус появится здесь.",
                      )}
                      action={() => navigate("/")}
                      button={t("Найти проект")}
                    />
                  )}
                </>
              )}
            </>
          ) : (
            <Empty
              icon={UserRound}
              title={t("Добро пожаловать в личный кабинет")}
              text={t("Войдите, чтобы увидеть свои события и заявки.")}
              action={() => setAuth("login")}
              button={t("Войти")}
            />
          )}
        </main>
      ) : route === "/organizations" ? (
        <main className="container info-page">
          <div className="eyebrow">{t("ТЕ, КТО ОБЪЕДИНЯЕТ")}</div>
          <h1>
            {t("Организации Алматы")}
            <span className="green-dot">.</span>
          </h1>
          <p className="lead">
            {t("Знакомьтесь с командами, которые делают наш город лучше.")}
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
                  {t(
                    "Команда волонтёрских инициатив в Алматы. Присоединяйтесь к добрым делам и создавайте перемены вместе.",
                  )}
                </p>
                <span>
                  {
                    events.filter(
                      (v) => v.organization_id === e.organization_id && open(v),
                    ).length
                  }{" "}
                  {t("открытых проектов")}
                </span>
                <button
                  className="button dark full"
                  onClick={() => {
                    setFilters({
                      ...defaultCatalogFilters,
                      search: e.organization,
                    });
                    navigate(user?.role === "organization" ? "/projects" : "/");
                    setTimeout(
                      () =>
                        document.querySelector("#projects")?.scrollIntoView(),
                      50,
                    );
                  }}
                >
                  {t("Посмотреть проекты ")}
                  <ArrowUpRight size={17} />
                </button>
              </article>
            ))}
          </div>
        </main>
      ) : route === "/about" ? (
        <main className="container info-page">
          <div className="eyebrow">{t("ДОБРО БЕЗ ЛИШНИХ СЛОЖНОСТЕЙ")}</div>
          <h1>
            {t("Несколько шагов.")}
            <br />
            <span className="serif">{t("Настоящие перемены.")}</span>
          </h1>
          <p className="lead">
            {t(
              "Kömek соединяет людей, которые хотят помочь, и команды, которым нужна поддержка.",
            )}
          </p>
          <div className="how-grid">
            {[
              [
                "01",
                t("Найди своё дело"),
                t(
                  "Выбери направление, посмотри события и найди проект, который тебе откликается.",
                ),
                Search,
              ],
              [
                "02",
                t("Расскажи о себе"),
                t(
                  "Зарегистрируйся как волонтёр и подай заявку. Организатор увидит твои контакты и мотивацию.",
                ),
                Send,
              ],
              [
                "03",
                t("Подтверди участие"),
                t(
                  "Следи за статусом в кабинете. После одобрения подтверди, что придёшь, — команда ждёт тебя.",
                ),
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
              <h2>{t("Для организаций")}</h2>
              <p>
                {t(
                  "Создавайте события, принимайте решения по заявкам и скачивайте подтверждённый состав. Все проекты бесплатны на этапе пилота. Встроенный чат и оплата не входят в MVP.",
                )}
              </p>
            </div>
            <button
              className="button dark"
              onClick={() => {
                if (user?.role === "organization") setEventForm("new");
                else if (user?.role === "volunteer") navigate("/organizations");
                else registerAs("organization");
              }}
            >
              {user?.role === "volunteer"
                ? t("Посмотреть организации")
                : t("Собрать команду")}{" "}
              <ArrowUpRight size={17} />
            </button>
          </div>
        </main>
      ) : (
        <main className="container empty-page">
          <Empty
            icon={Search}
            title={t("Страница не найдена")}
            text={t("Вернёмся туда, где ждут добрые дела?")}
            action={() => navigate("/")}
            button={t("На главную")}
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
              {t("Объединяем людей.")}
              <br />
              {t("Умножаем добро.")}
            </p>
          </div>
          <div className="footer-links">
            <button
              onClick={() =>
                navigate(user?.role === "organization" ? "/projects" : "/")
              }
            >
              {t("Найти проект")}
            </button>
            <button onClick={() => navigate("/organizations")}>
              {t("Организации")}
            </button>
            <button onClick={() => navigate("/about")}>
              {t("О платформе")}
            </button>
          </div>
          <div className="footer-note">
            <span>{t("Сделано с заботой об Алматы")}</span>
            <Mountain size={40} strokeWidth={1} />
          </div>
        </div>
        <div className="container footer-bottom">
          <span>
            © {new Date().getFullYear()} {t(" Kömek. Каждый может помочь.")}
          </span>
          <div>
            <button onClick={() => setInfo("privacy")}>
              {t("Конфиденциальность")}
            </button>
            <button onClick={() => setInfo("terms")}>
              {t("Условия использования")}
            </button>
          </div>
          <span className="pilot-badge">
            <span className="live-dot" /> {t(" Пилотная версия")}
          </span>
        </div>
      </footer>
      {auth && (
        <Modal
          title={
            auth === "login"
              ? t("Рады видеть тебя снова")
              : t("Давай делать добро вместе")
          }
          subtitle={
            auth === "login"
              ? t("Войди, чтобы продолжить свою историю добрых дел.")
              : t("Один аккаунт — много возможностей помочь.")
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
            eventForm === "new"
              ? t("Новое доброе дело")
              : t("Редактировать событие")
          }
          subtitle={t(
            "Расскажите о проекте — ваша команда обязательно найдётся.",
          )}
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
          title={t("Твоё доброе дело начинается здесь")}
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
          title={t("Мой профиль")}
          subtitle={
            user.role === "organization"
              ? t("Пусть волонтёры узнают вашу команду.")
              : t("Расскажи немного о себе.")
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
            button={t("Сохранить изменения")}
          >
            <Field
              label={
                user.role === "organization"
                  ? t("Название организации")
                  : t("Имя и фамилия")
              }
              name="name"
              defaultValue={user.name}
              required
              minLength={2}
            />
            <Field
              label={t("Email")}
              name="email"
              type="email"
              defaultValue={user.email}
              disabled
            />
            <Field
              label={t("Университет / место работы")}
              name="university"
              defaultValue={user.university}
            />
            <Field
              label={t("Telegram или email для связи")}
              name="contact"
              defaultValue={user.contact}
            />
            <label className="field">
              {t("О себе / об организации")}
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
              ? t("Обработка персональных данных")
              : t("Условия пилотной платформы")
          }
          onClose={() => setInfo(null)}
        >
          <div className="legal-copy">
            {info === "privacy" ? (
              <>
                <p>
                  {t(
                    "При регистрации сохраняются имя, email, защищённый хеш пароля и данные профиля. При подаче заявки сохраняются имя, университет, контакт и мотивация.",
                  )}
                </p>
                <p>
                  {t(
                    "Заявку видите вы и организация, которая создала событие. Подтверждённый состав с именем и контактом доступен только этой организации. Заявки не публикуются в каталоге.",
                  )}
                </p>
                <p>
                  {t(
                    "Данные хранятся в локальной базе платформы и используются для организации участия. Для удаления аккаунта и данных обратитесь к администратору развёрнутого экземпляра. Контакт оператора и юридические основания обработки должны быть определены до публичного запуска.",
                  )}
                </p>
              </>
            ) : (
              <>
                <p>
                  {t(
                    "Kömek — пилотная платформа волонтёрских проектов Алматы. Регистрация и участие бесплатны. Организатор отвечает за достоверность описания, безопасность события и обработку заявок.",
                  )}
                </p>
                <p>
                  {t(
                    "Отправка заявки не гарантирует участие. После одобрения необходимо подтвердить, что вы придёте. Все даты отображаются по времени Алматы.",
                  )}
                </p>
                <p>
                  {t(
                    "Решения появляются в личном кабинете. Дополнительное сообщение в Telegram или по email отправляется организатором вручную. Демо-аккаунты предназначены только для знакомства: не добавляйте в них личные данные.",
                  )}
                </p>
              </>
            )}
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <CircleCheck size={20} />
          <span>{t(toast.source, toast.params)}</span>
          <button
            aria-label={t("Закрыть уведомление")}
            onClick={() => setToast(null)}
          >
            <X size={17} />
          </button>
        </div>
      )}
    </>
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
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      ref.current?.querySelectorAll<HTMLElement>(
        "button,input,textarea,select,a[href]",
      );
    focusable()?.[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close.current();
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
          aria-label={t("Закрыть")}
          onClick={onClose}
        >
          <X size={21} />
        </button>
        <div className="modal-language">
          <LanguageSwitcher />
        </div>
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
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        const invalid = Array.from(
          e.currentTarget.querySelectorAll<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
          >("input,textarea,select"),
        ).find((field) => !field.validity.valid);
        if (invalid) {
          setError(
            invalid.validity.valueMissing
              ? invalid instanceof HTMLInputElement &&
                invalid.type === "checkbox"
                ? "Необходимо согласие на обработку данных."
                : "Заполните обязательное поле."
              : invalid instanceof HTMLInputElement && invalid.type === "email"
                ? "Укажите корректный email."
                : "Проверьте значение в этом поле.",
          );
          invalid.focus();
          return;
        }
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
          {t(error)}
        </div>
      )}
      <button className="button dark full" disabled={busy} type="submit">
        {busy ? <LoaderCircle className="spin" size={17} /> : null}
        {busy ? t("Подождите…") : button}
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
          <Heart size={16} /> {t(" Я волонтёр")}
        </button>
        <button
          className={role === "organization" ? "selected" : ""}
          onClick={() => setRole("organization")}
        >
          <Building2 size={16} /> {t(" Организация")}
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
        button={mode === "login" ? t("Войти в аккаунт") : t("Создать аккаунт")}
      >
        {mode === "register" && (
          <Field
            label={
              role === "organization"
                ? t("Название организации")
                : t("Имя и фамилия")
            }
            name="name"
            placeholder={
              role === "organization"
                ? t("Название вашей команды")
                : t("Как к тебе обращаться?")
            }
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
          />
        )}
        <Field
          label={t("Email")}
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          autoComplete="email"
        />
        <Field
          label={t("Пароль")}
          name="password"
          type="password"
          placeholder={t("Не менее 8 символов")}
          required
          minLength={mode === "register" ? 8 : 1}
          maxLength={128}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
        {mode === "register" && (
          <>
            <Field
              label={t("Telegram или email для связи")}
              name="contact"
              placeholder={t("@username или email")}
            />
            <label className="consent">
              <input name="consent" type="checkbox" required />
              <span>
                {t(
                  "Соглашаюсь на обработку персональных данных для регистрации и участия в волонтёрских проектах. Мои заявки будут доступны организаторам выбранных событий.",
                )}
              </span>
            </label>
          </>
        )}
      </Form>
      <p className="auth-switch">
        {mode === "login" ? t("Ещё нет аккаунта?") : t("Уже с нами?")}{" "}
        <button
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? t("Зарегистрироваться") : t("Войти")}
        </button>
      </p>
      <div className="demo-box">
        <span>{t("ПОСМОТРЕТЬ, КАК ВСЁ УСТРОЕНО")}</span>
        <p>{t("Демо-аккаунты с примерами событий и заявок.")}</p>
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
            <UserRound size={15} /> {t(" Волонтёр ")}
            <ArrowUpRight size={14} />
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
            <Building2 size={15} /> {t(" Организация ")}
            <ArrowUpRight size={14} />
          </button>
        </div>
        {demoError && <p className="form-error">{t(demoError)}</p>}
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
    <Form onSubmit={onSubmit} button={t("Отправить заявку")}>
      <Field
        label={t("Имя и фамилия")}
        name="full_name"
        defaultValue={user.name}
        required
        minLength={2}
        maxLength={200}
      />
      <Field
        label={t("Университет / место работы")}
        name="university"
        defaultValue={user.university}
        placeholder={t("Где учишься или работаешь?")}
        required
        minLength={2}
        maxLength={200}
      />
      <Field
        label={t("Telegram или email")}
        name="contact"
        defaultValue={user.contact || user.email}
        placeholder={t("@username или email")}
        required
      />
      <label className="field">
        {t("Почему хочешь присоединиться?")}{" "}
        <span className="optional">{t("Необязательно")}</span>
        <textarea
          name="motivation"
          placeholder={t("Расскажи о себе и своём желании помочь")}
          rows={3}
          maxLength={2000}
        />
      </label>
      <label className="consent">
        <input type="checkbox" name="consent" required />
        <span>
          {t(
            "Согласен(-на) на передачу имени, университета и контакта организатору события для рассмотрения заявки и координации участия.",
          )}
        </span>
      </label>
      <div className="inline-info">
        <ShieldCheck size={18} />
        <span>
          {t("Твои контакты увидит только организатор этого события.")}
        </span>
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
  const citiesId = useId();
  const cityInputId = useId();
  const categoryInputId = useId();
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
      button={event ? t("Сохранить событие") : t("Опубликовать событие")}
    >
      <Field
        label={t("Название проекта")}
        name="title"
        defaultValue={event?.title}
        required
        minLength={4}
        maxLength={150}
        placeholder={t("Какое доброе дело будем делать?")}
      />
      <label className="field">
        {t("Описание")}
        <textarea
          name="description"
          defaultValue={event?.description}
          rows={4}
          required
          minLength={20}
          maxLength={10000}
          placeholder={t(
            "Расскажите о цели проекта, задачах волонтёров и о том, что их ждёт",
          )}
        />
      </label>
      <div className="form-grid">
        <div className="field">
          <label htmlFor={categoryInputId}>{t("Направление")}</label>
          <select
            id={categoryInputId}
            name="category"
            defaultValue={event?.category || "eco"}
          >
            {getCategories()
              .slice(1)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={cityInputId}>{t("Город")}</label>
          <input
            id={cityInputId}
            name="city"
            list={citiesId}
            defaultValue={t(event?.city ?? "Алматы")}
            required
            minLength={2}
            maxLength={100}
            placeholder={t("Выберите или введите город")}
          />
          <datalist id={citiesId}>
            {suggestedCities.map((city) => (
              <option value={t(city)} key={city}>
                {t(city)}
              </option>
            ))}
          </datalist>
        </div>
      </div>
      <Field
        label={t("Место проведения")}
        name="location"
        defaultValue={event?.location}
        required
        minLength={3}
        placeholder={t("Адрес или место встречи")}
      />
      <div className="form-grid">
        <Field
          label={t("Дата и время начала")}
          name="starts_at"
          type="datetime-local"
          defaultValue={localDate(event?.starts_at)}
          required
        />
        <Field
          label={t("Дедлайн подачи заявок")}
          name="deadline"
          type="datetime-local"
          defaultValue={localDate(event?.deadline)}
          required
        />
      </div>
      <p className="field-hint">
        {t(
          "В форме используется часовой пояс вашего устройства. На сайте время отображается по Алматы.",
        )}
      </p>
      <div className="form-grid">
        <Field
          label={t("Продолжительность, часов")}
          name="hours"
          type="number"
          defaultValue={event?.hours || 3}
          required
          min="0.5"
          max="168"
          step="0.5"
        />
        <Field
          label={t("Количество участников")}
          name="capacity"
          type="number"
          defaultValue={event?.capacity || 20}
          required
          min="1"
          max="10000"
        />
      </div>
      <Field
        label={t("Ссылка на фотографию (HTTPS)")}
        name="image"
        defaultValue={event?.image.startsWith("https:") ? event.image : ""}
        type="url"
        placeholder={t("https://… — или оставьте для обложки по умолчанию")}
      />
      <label className="field">
        {t("Требования и что взять с собой")}
        <textarea
          name="requirements"
          rows={2}
          defaultValue={event?.requirements}
          maxLength={2000}
          placeholder={t("Возраст, навыки, одежда и другие важные детали")}
        />
      </label>
      <div className="inline-info">
        <CircleCheck size={18} />
        <span>
          {t(
            "Нажимая кнопку, вы подтверждаете достоверность информации и готовность провести событие.",
          )}
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
      ? t(
          "Здравствуйте, {0}! К сожалению, заявка на «{1}» отклонена. Спасибо за желание помочь. Вы можете выбрать другое событие на Kömek.",
          [a.full_name, a.title],
        )
      : t(
          "Здравствуйте, {0}! Ваша заявка на «{1}» одобрена. Пожалуйста, подтвердите участие в личном кабинете Kömek. Начало: {2}.",
          [a.full_name, a.title, stamp(a.starts_at)],
        );
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
        <span className={"status " + a.status}>{getStatuses()[a.status]}</span>
      </div>
      <p className="application-event">{a.title}</p>
      {a.motivation && <p className="applicant-motivation">«{a.motivation}»</p>}
      <div className="application-times">
        <span>
          {t("Подана: ")}
          {stamp(a.created_at)}
        </span>
        {a.decision_at && (
          <span>
            {t("Решение: ")}
            {stamp(a.decision_at)}
          </span>
        )}
        {a.confirmed_at && (
          <span>
            {t("Подтверждено: ")}
            {stamp(a.confirmed_at)}
          </span>
        )}
        {a.status === "pending" && elapsed > 44 && (
          <span className="warning">{t("Ожидает решения более 44 часов")}</span>
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
            <Check size={16} /> {t(" Принять")}
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
            <X size={16} /> {t(" Отказать")}
          </button>
        </div>
      ) : (
        <div className="notice-log">
          <button
            className="text-button"
            onClick={() => setExpanded(!expanded)}
          >
            <Mail size={15} />
            {expanded
              ? t("Скрыть шаблон")
              : t("Сообщение для Telegram / email")}{" "}
            <ChevronDown size={14} />
          </button>
          {a.notice_sent_at ? (
            <span className="sent-label">
              <CheckCheck size={14} /> {t(" Отправка отмечена:")}{" "}
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
                ? t("Более 4 часов после решения — отправьте сообщение")
                : t("Внешнее сообщение ещё не отмечено")}
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
              <Copy size={14} /> {t(" Скопировать")}
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
                <Check size={14} /> {t(" Я отправил(а) сообщение")}
              </button>
            )}
          </div>
          <small>
            {t(
              "Отправьте сообщение вручную по указанному контакту и отметьте отправку. Это сохраняет время в журнале.",
            )}
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
        <strong>{t("Своевременные ответы")}</strong>
      </span>
      <p>
        {t("Внешние сообщения в течение 48 ч.:")}{" "}
        <strong>
          {applications.length
            ? Math.round((timely.length / applications.length) * 100) + "%"
            : "—"}
        </strong>
        <span> {t(" · Цель: 80%")}</span>
      </p>
      <p>
        {t("Решение — до 44 ч. ")}
        <span>·</span> {t(" Сообщение — до 4 ч. после решения")}
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
            <th>{t("Участник")}</th>
            <th>{t("Контакт")}</th>
            <th>{t("Событие")}</th>
            <th>{unconfirmed ? t("Статус") : t("Подтверждение")}</th>
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
                  <span className="status accepted">
                    {t("Не подтверждено")}
                  </span>
                ) : a.confirmed_at ? (
                  stamp(a.confirmed_at)
                ) : (
                  "—"
                )}
                {unconfirmed &&
                  Date.parse(a.starts_at) - Date.now() < 86400000 && (
                    <small className="warning">
                      {t("До события менее 24 часов")}
                    </small>
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
          ? t("Все одобренные участники подтвердили участие")
          : t("Подтверждённых участников пока нет")
      }
      text={
        unconfirmed
          ? t("Неподтверждённых заявок нет.")
          : t(
              "После одобрения волонтёр должен подтвердить участие в своём кабинете.",
            )
      }
    />
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
