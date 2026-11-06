import { t } from "../lib/i18n";
import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CircleCheck,
  Clock3,
  LoaderCircle,
  MapPin,
} from "lucide-react";
import type { Application } from "../types";
import { date, time } from "../lib/events";
import { groupParticipations, participationEnd } from "../lib/participation";
import "./MyProjects.css";

const getStatuses = (): Record<string, string> => ({
  pending: t("Заявка на рассмотрении"),
  accepted: t("Нужно подтвердить участие"),
  confirmed: t("Участие подтверждено"),
});
const projectStamp = (value: string) =>
  t("{0} в {1}", [
    date(value, { day: "numeric", month: "long", year: "numeric" }),
    time(value),
  ]);

export function MyProjects({
  applications,
  loading,
  onView,
  onFind,
  onApplications,
  onConfirm,
}: {
  applications: Application[];
  loading: boolean;
  onView: (eventId: number) => void;
  onFind: () => void;
  onApplications: () => void;
  onConfirm: (a: Application) => Promise<void>;
}) {
  const [tab, setTab] = useState<"upcoming" | "completed">("upcoming");
  const now = Date.now();
  const groups = groupParticipations(applications, now);
  const completed = tab === "completed";
  const projects = groups[tab];

  return (
    <main className="container my-projects">
      <div className="my-projects-heading">
        <div>
          <div className="eyebrow">{t("ЛИЧНОЕ ПРОСТРАНСТВО · ВОЛОНТЁР")}</div>
          <h1>
            {t("Мои проекты")}
            <span className="green-dot">.</span>
          </h1>
          <p>
            {t(
              "Планируйте следующие добрые дела и возвращайтесь к истории участия.",
            )}
          </p>
        </div>
        <button className="button outline" onClick={onFind}>
          {t("Найти проект ")}
          <ArrowRight size={18} />
        </button>
      </div>
      <div
        className="my-projects-tabs"
        role="group"
        aria-label={t("Период участия")}
      >
        <button aria-pressed={!completed} onClick={() => setTab("upcoming")}>
          <CalendarDays size={18} /> {t(" Предстоящие")}
          {!loading && <span>{groups.upcoming.length}</span>}
        </button>
        <button aria-pressed={completed} onClick={() => setTab("completed")}>
          <CircleCheck size={18} /> {t(" Завершённые")}
          {!loading && <span>{groups.completed.length}</span>}
        </button>
      </div>
      <p className="my-projects-explanation">
        {completed
          ? t(
              "Проекты с подтверждённым участием после окончания события. Окончание рассчитывается по дате начала и длительности; посещение отдельно не отмечается.",
            )
          : t(
              "События, на которые вы подали заявку. После одобрения подтвердите участие, чтобы попасть в команду.",
            )}
      </p>
      {loading ? (
        <p className="my-projects-loading" role="status">
          <LoaderCircle className="spin" size={22} />{" "}
          {t(" Загружаем ваши проекты…")}
        </p>
      ) : projects.length ? (
        <div className="my-projects-grid">
          {projects.map((a) => (
            <ParticipationCard
              key={a.id}
              application={a}
              completed={completed}
              now={now}
              onView={() => onView(a.event_id)}
              onConfirm={() => onConfirm(a)}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span>
            {completed ? <CircleCheck size={30} /> : <CalendarDays size={30} />}
          </span>
          <h2>
            {completed
              ? t("История добрых дел ещё впереди")
              : t("Предстоящих проектов пока нет")}
          </h2>
          <p>
            {completed
              ? t(
                  "После окончания события проект с подтверждённым участием появится здесь.",
                )
              : t(
                  "Выберите интересное событие и отправьте заявку — проект появится здесь.",
                )}
          </p>
          <button className="button dark" onClick={onFind}>
            {t("Найти проект ")}
            <ArrowRight size={17} />
          </button>
        </div>
      )}
      <div className="my-projects-applications">
        <p>
          {t(
            "Все заявки, включая отклонённые и неподтверждённые, доступны в личном кабинете.",
          )}
        </p>
        <button className="text-button" onClick={onApplications}>
          {t("Мои заявки ")}
          <ArrowRight size={17} />
        </button>
      </div>
    </main>
  );
}

function ParticipationCard({
  application: a,
  completed,
  now,
  onView,
  onConfirm,
}: {
  application: Application;
  completed: boolean;
  now: number;
  onView: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const started = Date.parse(a.starts_at) <= now;
  return (
    <article className="participation-card">
      <img src={a.image || "/images/mountains.png"} alt="" />
      <div className="participation-card-body">
        <div className="participation-badges">
          <span className={"status " + (completed ? "confirmed" : a.status)}>
            {completed ? t("Проект завершён") : getStatuses()[a.status]}
          </span>
          {!completed && started && (
            <span className="participation-live">{t("Идёт сейчас")}</span>
          )}
        </div>
        <h2>
          <button onClick={onView}>{a.title}</button>
        </h2>
        <ul className="participation-facts">
          <li>
            <CalendarDays size={18} />
            <span>{projectStamp(a.starts_at)}</span>
          </li>
          {a.location && (
            <li>
              <MapPin size={18} />
              <span>{a.location}</span>
            </li>
          )}
          <li>
            <Clock3 size={18} />
            <span>
              {t("Длительность: ")}
              {a.hours || 0} {t(" ч.")}
            </span>
          </li>
        </ul>
        {completed && (
          <p className="participation-note">
            {t("Окончание:")}{" "}
            {projectStamp(new Date(participationEnd(a)).toISOString())}
          </p>
        )}
        {!completed && a.status === "accepted" && (
          <p className="participation-note">
            {started
              ? t("Событие уже началось. Подтвердить участие больше нельзя.")
              : t(
                  "Организация одобрила вашу заявку. Подтвердите, что сможете прийти.",
                )}
          </p>
        )}
        <div className="participation-actions">
          {!completed && !started && a.status === "accepted" && (
            <button
              className="button dark"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onConfirm();
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                <Check size={17} />
              )}
              {t("Подтвердить участие")}
            </button>
          )}
          <button className="text-button" onClick={onView}>
            {t("Подробнее ")}
            <ArrowRight size={17} />
          </button>
        </div>
      </div>
    </article>
  );
}
