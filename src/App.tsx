import { useEffect, type ReactNode } from "react";
import { ArrowRight, ShieldCheck, UserRound } from "lucide-react";
import { RouterProvider, useRouter, Link, Redirect } from "./lib/router";
import { AppProvider, useApp } from "./state";
import { Layout } from "./components/Layout";
import { Empty, Loading } from "./components/UI";
import { HomePage } from "./pages/Home";
import { ProjectsPage } from "./pages/Projects";
import { EventPage, EventFormPage, ApplyPage } from "./pages/Events";
import {
  AuthPage,
  ProfilePage,
  ApplicationsPage,
  ApplicationPage,
  NotificationsPage,
} from "./pages/Account";
import {
  MyEventsPage,
  RequestsPage,
  RequestPage,
  RosterPage,
  ReportsPage,
} from "./pages/Organization";
import { AboutPage, OrganizationsPage, LegalPage } from "./pages/Information";
function Guard({
  role,
  children,
}: {
  role?: "organization" | "volunteer";
  children: ReactNode;
}) {
  const { user } = useApp();
  const { route } = useRouter();
  if (!user)
    return (
      <div className="container page">
        <Empty
          title="Войдите, чтобы продолжить"
          text="Личный кабинет доступен после входа в аккаунт."
          to={"/login?next=" + encodeURIComponent(route)}
          label="Войти"
          icon={UserRound}
        />
      </div>
    );
  if (role && user.role !== role)
    return (
      <div className="page">
        <Empty
          title={
            role === "organization"
              ? "Этот раздел для организаций"
              : "Этот раздел для волонтёров"
          }
          text={`Вы вошли как ${user.role === "organization" ? "организация" : "волонтёр"}. Нужные вам действия доступны на главной странице.`}
          to="/"
          label="На мою главную"
          icon={ShieldCheck}
        />
      </div>
    );
  return <>{children}</>;
}
function Routes() {
  const { route } = useRouter();
  const { loading, error, user } = useApp();
  const path = route.split("?")[0];
  useEffect(() => {
    const titles: Record<string, string> = {
      "/": "Добрые дела начинаются с вас",
      "/projects": "Каталог проектов",
      "/applications": "Мои заявки",
      "/my-events": "Мои проекты",
      "/requests": "Заявки волонтёров",
      "/roster": "Состав команды",
      "/profile": "Мой профиль",
      "/login": "Вход",
      "/register": "Регистрация",
      "/notifications": "Уведомления",
      "/reports": "Статистика ответов",
      "/organizations": "Организации",
      "/about": "Как это работает",
      "/events/new": "Создать проект",
    };
    document.title = (titles[path] || "Волонтёрские проекты") + " — Kömek";
  }, [path]);
  if (loading) return <Loading />;
  if (error)
    return (
      <div className="page container">
        <Empty title="Не удалось загрузить платформу" text={error} />
        <div className="center">
          <button className="button primary" onClick={() => location.reload()}>
            Попробовать снова
            <ArrowRight size={19} />
          </button>
        </div>
      </div>
    );
  if (path === "/") return <HomePage />;
  if (path === "/projects") return <ProjectsPage />;
  if (path === "/favorites")
    return (
      <Guard role="volunteer">
        <ProjectsPage favorites />
      </Guard>
    );
  if (path === "/login" || path === "/register")
    return user ? (
      <Redirect to="/" />
    ) : (
      <AuthPage register={path === "/register"} />
    );
  if (path === "/events/new")
    return (
      <Guard role="organization">
        <EventFormPage />
      </Guard>
    );
  const event = path.match(/^\/events\/(\d+)$/);
  if (event) return <EventPage id={Number(event[1])} />;
  const apply = path.match(/^\/events\/(\d+)\/apply$/);
  if (apply)
    return (
      <Guard role="volunteer">
        <ApplyPage id={Number(apply[1])} />
      </Guard>
    );
  if (path === "/my-events")
    return (
      <Guard role="organization">
        <MyEventsPage />
      </Guard>
    );
  const edit = path.match(/^\/my-events\/(\d+)\/edit$/);
  if (edit)
    return (
      <Guard role="organization">
        <EventFormPage id={Number(edit[1])} />
      </Guard>
    );
  const manage = path.match(/^\/my-events\/(\d+)$/);
  if (manage)
    return (
      <Guard role="organization">
        <EventPage id={Number(manage[1])} manage />
      </Guard>
    );
  if (path === "/requests")
    return (
      <Guard role="organization">
        <RequestsPage />
      </Guard>
    );
  const request = path.match(/^\/requests\/(\d+)$/);
  if (request)
    return (
      <Guard role="organization">
        <RequestPage id={Number(request[1])} />
      </Guard>
    );
  if (path === "/roster")
    return (
      <Guard role="organization">
        <RosterPage />
      </Guard>
    );
  if (path === "/reports")
    return (
      <Guard role="organization">
        <ReportsPage />
      </Guard>
    );
  if (path === "/applications")
    return (
      <Guard role="volunteer">
        <ApplicationsPage />
      </Guard>
    );
  const application = path.match(/^\/applications\/(\d+)$/);
  if (application)
    return (
      <Guard role="volunteer">
        <ApplicationPage id={Number(application[1])} />
      </Guard>
    );
  if (path === "/profile")
    return (
      <Guard>
        <ProfilePage />
      </Guard>
    );
  if (path === "/notifications")
    return (
      <Guard>
        <NotificationsPage />
      </Guard>
    );
  if (path === "/dashboard")
    return (
      <Guard>
        <Redirect
          to={user?.role === "organization" ? "/my-events" : "/applications"}
        />
      </Guard>
    );
  if (path === "/organizations") return <OrganizationsPage />;
  if (path === "/about") return <AboutPage />;
  if (path === "/privacy" || path === "/terms")
    return <LegalPage privacy={path === "/privacy"} />;
  return (
    <div className="page container">
      <Empty
        title="Страница не найдена"
        text="Возможно, адрес содержит ошибку. Вернёмся к добрым делам?"
        to="/"
        label="На главную"
      />
    </div>
  );
}
export default function App() {
  return (
    <RouterProvider>
      <AppProvider>
        <Layout>
          <Routes />
        </Layout>
      </AppProvider>
    </RouterProvider>
  );
}
