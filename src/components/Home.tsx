import { t } from "../lib/i18n";
import "./Home.css";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarDays,
  CheckCheck,
  CircleCheck,
  Clock3,
  Heart,
  Inbox,
  Leaf,
  LoaderCircle,
  MapPin,
  Plus,
  Send,
  Users,
} from "lucide-react";
import type { User, Event, Application } from "../types";
import { eventIsOpen, eventIsPast, stamp } from "../lib/events";

type ManageTab = "events" | "applications" | "roster";
type OrganizationHomeProps = {
  user: User;
  events: Event[];
  applications: Application[];
  loading: boolean;
  onCreate: () => void;
  onManage: (tab: ManageTab, eventId?: number) => void;
  onEdit: (event: Event) => void;
  onView: (event: Event) => void;
  onCatalog: () => void;
};

export function OrganizationHome({
  user,
  events,
  applications,
  loading,
  onCreate,
  onManage,
  onEdit,
  onView,
  onCatalog,
}: OrganizationHomeProps) {
  const pending = applications.filter((a) => a.status === "pending");
  const confirmed = applications.filter((a) => a.status === "confirmed");
  const recentApplications = [...applications]
    .sort(
      (a, b) =>
        Number(b.status === "pending") - Number(a.status === "pending") ||
        Date.parse(b.created_at) - Date.parse(a.created_at),
    )
    .slice(0, 3);
  const projects = [...events]
    .sort(
      (a, b) =>
        Number(eventIsPast(a)) - Number(eventIsPast(b)) ||
        (eventIsPast(a)
          ? Date.parse(b.starts_at) - Date.parse(a.starts_at)
          : Date.parse(a.starts_at) - Date.parse(b.starts_at)),
    )
    .slice(0, 3);
  return (
    <main className="organization-home container">
      <section
        className="organization-welcome"
        aria-labelledby="organization-home-title"
      >
        <div className="organization-welcome-copy">
          <span className="home-role-badge organization-role">
            <Building2 size={16} /> {t(" Аккаунт организации")}
          </span>
          <p className="home-identity">
            {t("Ваша команда · ")}
            {user.name}
          </p>
          <h1 id="organization-home-title">
            {t("Добрые проекты.")}
            <br />
            <span>{t("Сильная команда.")}</span>
          </h1>
          <p>
            {t(
              "Создавайте события, находите волонтёров и собирайте команду. Здесь всё готово для вашего следующего доброго дела.",
            )}
          </p>
          <div className="role-home-actions">
            <button className="button dark" onClick={onCreate}>
              <Plus size={20} /> {t(" Создать проект")}
            </button>
            <button
              className="button outline"
              onClick={() => onManage("applications")}
            >
              {t("Заявки участников ")}
              <ArrowUpRight size={18} />
            </button>
          </div>
        </div>
        <div className="organization-next-step">
          <div className="next-step-icon">
            <Users size={30} />
            <span>✳</span>
          </div>
          <span className="eyebrow">{t("ВАШ СЛЕДУЮЩИЙ ШАГ")}</span>
          {loading ? (
            <p className="home-loading">
              <LoaderCircle className="spin" size={19} />{" "}
              {t(" Загружаем заявки…")}
            </p>
          ) : pending.length ? (
            <>
              <h2>
                {t("Кто-то уже готов")}
                <br />
                {t("помочь вашему проекту.")}
              </h2>
              <p>
                {t("Заявок на рассмотрении: ")}
                {pending.length}
                {t(". Ответьте волонтёрам и начните собирать команду.")}
              </p>
              <button onClick={() => onManage("applications")}>
                {t("Рассмотреть заявки ")}
                <ArrowRight size={18} />
              </button>
            </>
          ) : (
            <>
              <h2>
                {t("Большие перемены")}
                <br />
                {t("начинаются с идеи.")}
              </h2>
              <p>
                {events.length
                  ? t(
                      "Поделитесь ссылкой на ваш проект — новые заявки появятся здесь.",
                    )
                  : t(
                      "Опубликуйте первое событие и расскажите, какая помощь вам нужна.",
                    )}
              </p>
              <button
                onClick={events.length ? () => onManage("events") : onCreate}
              >
                {events.length
                  ? t("Открыть мои проекты")
                  : t("Создать первый проект")}{" "}
                <ArrowRight size={18} />
              </button>
            </>
          )}
        </div>
      </section>
      <section className="home-stats" aria-label={t("Показатели организации")}>
        <button onClick={() => onManage("events")}>
          <span className="home-stat-icon">
            <CalendarDays size={22} />
          </span>
          <span>
            <strong>{loading ? "…" : events.filter(eventIsOpen).length}</strong>
            <span>{t("Открытых проектов")}</span>
          </span>
          <ArrowUpRight size={19} />
        </button>
        <button onClick={() => onManage("applications")}>
          <span className="home-stat-icon">
            <Inbox size={22} />
          </span>
          <span>
            <strong>{loading ? "…" : pending.length}</strong>
            <span>{t("Заявок на рассмотрении")}</span>
          </span>
          <ArrowUpRight size={19} />
        </button>
        <button onClick={() => onManage("roster")}>
          <span className="home-stat-icon">
            <CheckCheck size={22} />
          </span>
          <span>
            <strong>{loading ? "…" : confirmed.length}</strong>
            <span>{t("Подтвердили участие")}</span>
          </span>
          <ArrowUpRight size={19} />
        </button>
      </section>
      <div className="organization-workspace">
        <section
          className="home-projects"
          aria-labelledby="home-projects-title"
        >
          <div className="home-section-heading">
            <div>
              <span className="eyebrow">{t("ПРОЕКТЫ ВАШЕЙ ОРГАНИЗАЦИИ")}</span>
              <h2 id="home-projects-title">
                {t("Мои проекты ")}
                <span>{events.length}</span>
              </h2>
            </div>
            <button onClick={() => onManage("events")}>
              {t("Все проекты ")}
              <ArrowUpRight size={16} />
            </button>
          </div>
          {loading ? (
            <HomeLoading />
          ) : projects.length ? (
            <div className="home-project-list">
              {projects.map((e) => (
                <article className="home-project-row" key={e.id}>
                  <img src={e.image} alt="" />
                  <div>
                    <span
                      className={
                        "availability " + (eventIsOpen(e) ? "" : "unavailable")
                      }
                    >
                      {eventIsPast(e)
                        ? t("Завершён")
                        : eventIsOpen(e)
                          ? t("Набор открыт")
                          : t("Набор закрыт")}
                    </span>
                    <button
                      className="home-project-title"
                      onClick={() => onView(e)}
                    >
                      <h3>{e.title}</h3>
                    </button>
                    <p>
                      <CalendarDays size={13} />
                      {stamp(e.starts_at)}
                    </p>
                    <small>
                      {t("Заявки: ")}
                      {e.application_count} {t(" · Занято мест: ")}
                      {e.occupied} {t("из ")}
                      {e.capacity}
                    </small>
                    <div className="home-project-actions">
                      <button onClick={() => onManage("applications", e.id)}>
                        {t("Посмотреть заявки ")}
                        <ArrowRight size={14} />
                      </button>
                      <button onClick={() => onEdit(e)}>
                        {t("Редактировать")}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="home-empty">
              <CalendarDays size={30} />
              <h3>{t("Здесь появится ваш первый проект")}</h3>
              <p>
                {t(
                  "Укажите дату, место и задачи для волонтёров. После публикации можно сразу принимать заявки.",
                )}
              </p>
              <button className="button dark" onClick={onCreate}>
                {t("Создать первый проект ")}
                <Plus size={17} />
              </button>
            </div>
          )}
        </section>
        <section
          className="home-applications"
          aria-labelledby="home-applications-title"
        >
          <div className="home-section-heading">
            <div>
              <span className="eyebrow">{t("ЛЮДИ, КОТОРЫМ НЕ ВСЁ РАВНО")}</span>
              <h2 id="home-applications-title">{t("Последние заявки")}</h2>
            </div>
          </div>
          {loading ? (
            <HomeLoading />
          ) : recentApplications.length ? (
            <>
              <div className="home-application-list">
                {recentApplications.map((a) => (
                  <button
                    key={a.id}
                    className="home-application-row"
                    onClick={() => onManage("applications", a.event_id)}
                  >
                    <span className="avatar small">{a.full_name[0]}</span>
                    <span>
                      <strong>{a.full_name}</strong>
                      <span>{a.title}</span>
                      <small>
                        {a.status === "pending"
                          ? t("Ожидает вашего решения")
                          : a.status === "confirmed"
                            ? t("Участие подтверждено")
                            : a.status === "accepted"
                              ? t("Ждём подтверждения участника")
                              : t("Заявка отклонена")}
                      </small>
                    </span>
                    <ArrowUpRight size={16} />
                  </button>
                ))}
              </div>
              <button
                className="button outline full"
                onClick={() => onManage("applications")}
              >
                {t("Открыть все заявки ")}
                <ArrowRight size={16} />
              </button>
            </>
          ) : (
            <div className="home-empty compact">
              <Send size={28} />
              <h3>{t("Будущая команда уже рядом")}</h3>
              <p>
                {t(
                  "Как только волонтёры откликнутся на проект, их заявки появятся здесь.",
                )}
              </p>
            </div>
          )}
          <div className="home-organizer-tip">
            <CircleCheck size={20} />
            <p>
              {t(
                "После одобрения дождитесь подтверждения волонтёра. Только затем он появится в итоговом составе.",
              )}
            </p>
          </div>
        </section>
      </div>
      <section className="home-community-link">
        <div>
          <Leaf size={23} />
          <div>
            <h2>{t("Вдохновляйтесь добрыми инициативами")}</h2>
            <p>
              {t(
                "Посмотрите, какие проекты проводят другие организации Алматы.",
              )}
            </p>
          </div>
        </div>
        <button className="button outline" onClick={onCatalog}>
          {t("Каталог проектов ")}
          <ArrowUpRight size={17} />
        </button>
      </section>
    </main>
  );
}

export function VolunteerHome({
  user,
  applications,
  loading,
  onFind,
  onApplications,
  onConfirm,
}: {
  user: User;
  applications: Application[];
  loading: boolean;
  onFind: () => void;
  onApplications: () => void;
  onConfirm: (application: Application) => void;
}) {
  const upcoming = applications
    .filter(
      (a) =>
        ["accepted", "confirmed"].includes(a.status) &&
        Date.parse(a.starts_at) > Date.now(),
    )
    .sort(
      (a, b) =>
        Number(b.status === "accepted") - Number(a.status === "accepted") ||
        Date.parse(a.starts_at) - Date.parse(b.starts_at),
    )[0];
  return (
    <div className="volunteer-home container">
      <section
        className="volunteer-welcome"
        aria-labelledby="volunteer-home-title"
      >
        <div className="volunteer-welcome-copy">
          <span className="home-role-badge volunteer-role">
            <Heart size={16} /> {t(" Аккаунт волонтёра")}
          </span>
          <h1 id="volunteer-home-title">
            {t("Привет, ")}
            {user.name.split(" ")[0]}!<br />
            <span>{t("Твоё добро ждут.")}</span>
          </h1>
          <p>
            {t(
              "Выбирай проекты по душе, следи за заявками и помогай вместе с людьми, которым не всё равно.",
            )}
          </p>
          <div className="role-home-actions">
            <button className="button dark" onClick={onFind}>
              {t("Найти проект ")}
              <ArrowUpRight size={18} />
            </button>
            <button className="button outline" onClick={onApplications}>
              {t("Мои заявки ")}
              <ArrowUpRight size={18} />
            </button>
          </div>
        </div>
        <aside className="volunteer-next-step">
          <span className="eyebrow">
            {upcoming ? t("ТВОЁ БЛИЖАЙШЕЕ ДОБРОЕ ДЕЛО") : t("ТВОЙ ПЕРВЫЙ ШАГ")}
          </span>
          {loading ? (
            <HomeLoading />
          ) : upcoming ? (
            <>
              <span className={"status " + upcoming.status}>
                {upcoming.status === "accepted"
                  ? t("Нужно подтвердить участие")
                  : t("Ты в команде!")}
              </span>
              <h2>{upcoming.title}</h2>
              <p>
                <CalendarDays size={16} />
                {stamp(upcoming.starts_at)}
              </p>
              {upcoming.location && (
                <p>
                  <MapPin size={16} />
                  {upcoming.location}
                </p>
              )}
              <button
                className="button dark full"
                onClick={
                  upcoming.status === "accepted"
                    ? () => onConfirm(upcoming)
                    : onApplications
                }
              >
                {upcoming.status === "accepted"
                  ? t("Подтвердить участие")
                  : t("Открыть мою заявку")}{" "}
                <ArrowRight size={17} />
              </button>
            </>
          ) : (
            <>
              <span className="volunteer-welcome-heart">
                <Heart size={32} />
                <span>✳</span>
              </span>
              <h2>
                {t("Немного твоего времени.")}
                <br />
                {t("Много добрых перемен.")}
              </h2>
              <p>
                {t(
                  "Для первого шага не нужен опыт. Найди интересный проект и расскажи организатору о себе.",
                )}
              </p>
              <button onClick={onFind} className="volunteer-explore-link">
                {t("Выбрать проект ")}
                <ArrowRight size={17} />
              </button>
            </>
          )}
        </aside>
      </section>
      <section
        className="home-stats volunteer-home-stats"
        aria-label={t("Мои участия")}
      >
        <button onClick={onApplications}>
          <span className="home-stat-icon">
            <Send size={22} />
          </span>
          <span>
            <strong>{loading ? "…" : applications.length}</strong>
            <span>{t("Мои заявки")}</span>
          </span>
          <ArrowUpRight size={19} />
        </button>
        <button onClick={onApplications}>
          <span className="home-stat-icon">
            <Clock3 size={22} />
          </span>
          <span>
            <strong>
              {loading
                ? "…"
                : applications.filter((a) => a.status === "pending").length}
            </strong>
            <span>{t("На рассмотрении")}</span>
          </span>
          <ArrowUpRight size={19} />
        </button>
        <button onClick={onApplications}>
          <span className="home-stat-icon">
            <CheckCheck size={22} />
          </span>
          <span>
            <strong>
              {loading
                ? "…"
                : applications.filter((a) => a.status === "confirmed").length}
            </strong>
            <span>{t("Участие подтверждено")}</span>
          </span>
          <ArrowUpRight size={19} />
        </button>
      </section>
    </div>
  );
}
function HomeLoading() {
  return (
    <p className="home-loading">
      <LoaderCircle className="spin" size={19} /> {t(" Загружаем…")}
    </p>
  );
}
