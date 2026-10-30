import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Heart,
  Menu,
  X,
  Search,
  LayoutDashboard,
  CalendarDays,
  Send,
  Bookmark,
  Users,
  UserRound,
  Bell,
  LogOut,
  Building2,
  Leaf,
  BarChart3,
} from "lucide-react";
import { useApp } from "../state";
import { Link, useRouter } from "../lib/router";
export function Logo() {
  return (
    <Link to="/" className="brand" aria-label="Kömek — главная">
      <span>
        <Heart size={21} fill="currentColor" />
      </span>
      kömek<span className="brand-period">.</span>
    </Link>
  );
}
export function Layout({ children }: { children: ReactNode }) {
  const { user, notices, logout, notify, privateError, refresh } = useApp();
  const { route, go } = useRouter();
  const [menu, setMenu] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null),
    panelRef = useRef<HTMLDivElement>(null);
  const path = route.split("?")[0];
  const isActive = (to: string) =>
    path === to ||
    (to !== "/" && path.startsWith(to + "/")) ||
    (to === "/my-events" && path === "/events/new") ||
    (to === "/projects" && path.startsWith("/events/"));
  useEffect(() => setMenu(false), [route]);
  useEffect(() => {
    if (!menu) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first = () =>
      panelRef.current?.querySelectorAll<HTMLElement>("a,button");
    first()?.[0]?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(false);
      if (e.key === "Tab") {
        const nodes = first();
        if (!nodes?.length) return;
        if (e.shiftKey && document.activeElement === nodes[0]) {
          e.preventDefault();
          nodes[nodes.length - 1].focus();
        } else if (
          !e.shiftKey &&
          document.activeElement === nodes[nodes.length - 1]
        ) {
          e.preventDefault();
          nodes[0].focus();
        }
      }
    };
    addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = old;
      removeEventListener("keydown", key);
      buttonRef.current?.focus();
    };
  }, [menu]);
  const leave = async () => {
    try {
      await logout();
      setMenu(false);
      go("/");
      notify("Вы вышли из аккаунта.");
    } catch (e) {
      notify((e as Error).message);
    }
  };
  const links =
    user?.role === "organization"
      ? [
          { to: "/", name: "Обзор", icon: LayoutDashboard },
          { to: "/my-events", name: "Мои проекты", icon: CalendarDays },
          { to: "/requests", name: "Заявки", icon: Send },
          { to: "/roster", name: "Состав команды", icon: Users },
          { to: "/reports", name: "Статистика", icon: BarChart3 },
        ]
      : [
          { to: "/", name: "Главная", icon: LayoutDashboard },
          { to: "/projects", name: "Найти проект", icon: Search },
          { to: "/applications", name: "Мои заявки", icon: Send },
          { to: "/favorites", name: "Избранное", icon: Bookmark },
        ];
  const sideContent = (
    <>
      <div className={"sidebar-role " + user?.role}>
        {user?.role === "organization" ? (
          <Building2 size={21} />
        ) : (
          <Heart size={21} />
        )}
        <div>
          <strong>
            {user?.role === "organization" ? "Организация" : "Волонтёр"}
          </strong>
          <span>{user?.name}</span>
        </div>
      </div>
      <nav aria-label="Личный кабинет">
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className={isActive(l.to) ? "active" : ""}
            aria-current={isActive(l.to) ? "page" : undefined}
          >
            <l.icon size={20} />
            {l.name}
          </Link>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <Link to="/profile" className={path === "/profile" ? "active" : ""}>
          <UserRound size={20} />
          Мой профиль
        </Link>
        <Link
          to="/notifications"
          className={path === "/notifications" ? "active" : ""}
        >
          <Bell size={20} />
          Уведомления
          {notices.some((n) => !n.read_at) && (
            <span className="notification-dot" />
          )}
        </Link>
        <button onClick={leave}>
          <LogOut size={20} />
          Выйти
        </button>
      </div>
      <Link to="/about" className="sidebar-help">
        <Leaf size={18} />
        Как работает Kömek
        <ArrowUpRight size={16} />
      </Link>
    </>
  );
  return (
    <div className={user ? "app-layout" : "public-layout"}>
      <a className="skip-link" href="#main-content">
        К содержимому
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Logo />
          {!user && (
            <nav className="public-nav" aria-label="Основная навигация">
              <Link
                to="/projects"
                aria-current={path === "/projects" ? "page" : undefined}
              >
                Проекты
              </Link>
              <Link
                to="/organizations"
                aria-current={path === "/organizations" ? "page" : undefined}
              >
                Организации
              </Link>
              <Link
                to="/about"
                aria-current={path === "/about" ? "page" : undefined}
              >
                Как это работает
              </Link>
            </nav>
          )}
          <div className="header-actions">
            {user ? (
              <>
                <Link
                  to="/notifications"
                  className="notification-button"
                  aria-label="Уведомления"
                >
                  <Bell size={22} />
                  {notices.some((n) => !n.read_at) && (
                    <span className="notification-dot" />
                  )}
                </Link>
                <Link to="/profile" className="header-account">
                  <span className="avatar">{user.name[0]}</span>
                  <span>
                    <strong>
                      {user.role === "organization"
                        ? "Организация"
                        : "Волонтёр"}
                    </strong>
                    <span>{user.name}</span>
                  </span>
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="header-login">
                  Войти
                </Link>
                <Link
                  to="/register?role=volunteer"
                  className="button primary header-register"
                >
                  Регистрация
                  <ArrowUpRight size={17} />
                </Link>
              </>
            )}
            <button
              ref={buttonRef}
              className="menu-toggle icon-button"
              aria-label="Открыть меню"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              <Menu size={25} />
            </button>
          </div>
        </div>
      </header>
      {user && <aside className="sidebar">{sideContent}</aside>}
      <main id="main-content" className={user ? "workspace" : "public-main"}>
        {privateError && user && (
          <div className="notice error">
            <span>{privateError}</span>
            <button onClick={() => refresh().catch((e) => notify(e.message))}>
              Повторить
            </button>
          </div>
        )}
        {children}
      </main>
      {!user && <Footer />}
      {menu && (
        <div
          className="mobile-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMenu(false);
          }}
        >
          <div
            className="mobile-panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Навигация"
          >
            <div className="mobile-panel-top">
              <Logo />
              <button
                className="icon-button"
                aria-label="Закрыть меню"
                onClick={() => setMenu(false)}
              >
                <X size={24} />
              </button>
            </div>
            {user ? (
              sideContent
            ) : (
              <nav className="mobile-public-nav">
                <Link to="/projects">
                  Найти проект
                  <ArrowRight size={20} />
                </Link>
                <Link to="/organizations">
                  Организации
                  <ArrowRight size={20} />
                </Link>
                <Link to="/about">
                  Как это работает
                  <ArrowRight size={20} />
                </Link>
                <Link to="/login">
                  Войти
                  <ArrowRight size={20} />
                </Link>
                <Link to="/register?role=volunteer" className="button primary">
                  Стать волонтёром
                </Link>
                <Link
                  to="/register?role=organization"
                  className="button secondary"
                >
                  Зарегистрировать организацию
                </Link>
              </nav>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-content">
        <div>
          <Logo />
          <p>
            Люди, которые помогают.
            <br />
            Город, который меняется.
          </p>
        </div>
        <div>
          <Link to="/projects">Найти проект</Link>
          <Link to="/organizations">Организации</Link>
          <Link to="/about">О платформе</Link>
        </div>
        <div>
          <Link to="/register?role=volunteer">Стать волонтёром</Link>
          <Link to="/register?role=organization">Для организаций</Link>
          <span className="footer-city">Алматы, Казахстан</span>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Kömek</span>
        <div>
          <Link to="/privacy">Конфиденциальность</Link>
          <Link to="/terms">Условия использования</Link>
        </div>
        <span>
          С заботой о людях
          <Heart size={15} />
        </span>
      </div>
    </footer>
  );
}
