import { useEffect, useState } from "react";
import {
  Plus,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Users,
  Download,
  Copy,
  CheckCircle2,
  Mail,
  ExternalLink,
  Clock3,
} from "lucide-react";
import { useApp } from "../state";
import { Link, useRouter } from "../lib/router";
import { api } from "../lib/api";
import { usePageSlice } from "../lib/pagination";
import { stamp, eventIsOpen, eventIsPast } from "../lib/events";
import {
  PageHeading,
  Empty,
  Loading,
  Status,
  Tabs,
  BackLink,
  ApplicationTabs,
  Pagination,
} from "../components/UI";
export function MyEventsPage() {
  const { user, events, privateLoading } = useApp();
  const { route, go } = useRouter();
  const period =
    new URLSearchParams(route.split("?")[1]).get("status") || "all";
  const owned = events.filter((e) => e.organization_id === user!.id);
  const filtered = owned
    .filter(
      (e) =>
        period === "all" ||
        (period === "active" ? eventIsOpen(e) : eventIsPast(e)),
    )
    .sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at));
  const paging = usePageSlice(filtered, 6);
  if (privateLoading) return <Loading />;
  return (
    <div className="page">
      <PageHeading
        title="Мои проекты"
        description="Создавайте события и управляйте своей командой."
        action={
          <Link className="button primary" to="/events/new">
            <Plus size={21} />
            Создать проект
          </Link>
        }
      />
      <Tabs
        value={period}
        onChange={(v) => go("/my-events?status=" + v, true)}
        items={[
          { id: "all", name: "Все проекты", count: owned.length },
          { id: "active", name: "Открыт набор" },
          { id: "past", name: "Завершённые" },
        ]}
      />
      {filtered.length ? (
        <div className="managed-project-list">
          {paging.rows.map((e) => (
            <article className="surface managed-project" key={e.id}>
              <img src={e.image} alt="" />
              <div>
                <span
                  className={
                    "recruitment-status " + (eventIsOpen(e) ? "" : "closed")
                  }
                >
                  <i />
                  {eventIsPast(e)
                    ? "Завершён"
                    : eventIsOpen(e)
                      ? "Открыт набор"
                      : "Набор закрыт"}
                </span>
                <h2>
                  <Link to={"/my-events/" + e.id}>{e.title}</Link>
                </h2>
                <p className="icon-line">
                  <CalendarDays size={18} />
                  {stamp(e.starts_at)}
                </p>
                <span className="managed-project-numbers">
                  Заявки: {e.application_count} · Занято мест: {e.occupied} из{" "}
                  {e.capacity}
                </span>
              </div>
              <Link className="button secondary" to={"/my-events/" + e.id}>
                Управлять
                <ArrowRight size={18} />
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title={
            owned.length ? "Проекты не найдены" : "Начните с первого проекта"
          }
          text={
            owned.length
              ? "Выберите другой период, чтобы увидеть свои события."
              : "Расскажите о своей идее и пригласите волонтёров стать частью команды."
          }
          to={owned.length ? "/my-events" : "/events/new"}
          label={owned.length ? "Все мои проекты" : "Создать проект"}
          icon={CalendarDays}
        />
      )}
      <Pagination
        page={paging.page}
        count={paging.count}
        onChange={paging.setPage}
      />
    </div>
  );
}
export function RequestsPage() {
  const { user, events, applications, privateLoading } = useApp();
  const { route, go } = useRouter();
  const params = new URLSearchParams(route.split("?")[1]);
  const eventId = params.get("event") || "all",
    status = params.get("status") || "all";
  const own = events.filter((e) => e.organization_id === user!.id);
  const filtered = applications.filter(
    (a) =>
      (eventId === "all" || String(a.event_id) === eventId) &&
      (status === "all" || a.status === status),
  );
  const update = (key: string, value: string) => {
    const q = new URLSearchParams(params);
    q.set(key, value);
    q.delete("page");
    go("/requests?" + q.toString(), true);
  };
  const paging = usePageSlice(filtered);
  if (privateLoading) return <Loading />;
  return (
    <div className="page">
      <PageHeading
        title="Заявки волонтёров"
        description="Рассмотрите отклики и пригласите людей в команду."
      />
      <div className="single-filter">
        <label className="field">
          <span>Проект</span>
          <select
            aria-label="Проект"
            value={eventId}
            onChange={(e) => update("event", e.target.value)}
          >
            <option value="all">Все мои проекты</option>
            {own.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ApplicationTabs value={status} onChange={(v) => update("status", v)} />
      {filtered.length ? (
        <div className="request-list surface">
          {paging.rows.map((a) => (
            <Link className="request-row" key={a.id} to={"/requests/" + a.id}>
              <span className="avatar">{a.full_name[0]}</span>
              <div className="request-person">
                <strong>{a.full_name}</strong>
                <span>{a.title}</span>
              </div>
              <Status value={a.status} />
              <ArrowRight size={20} />
            </Link>
          ))}
        </div>
      ) : (
        <Empty
          title="Заявок пока нет"
          text={
            applications.length
              ? "Попробуйте другой статус или выберите все проекты."
              : "Поделитесь ссылкой на проект. Когда волонтёры откликнутся, их заявки появятся здесь."
          }
          to={applications.length ? "/requests" : "/my-events"}
          label={applications.length ? "Все заявки" : "Мои проекты"}
          icon={Users}
        />
      )}
      <Pagination
        page={paging.page}
        count={paging.count}
        onChange={paging.setPage}
      />
    </div>
  );
}
export function RequestPage({ id }: { id: number }) {
  const { applications, privateLoading, act, notify } = useApp();
  const [busy, setBusy] = useState(false);
  if (privateLoading) return <Loading />;
  const a = applications.find((a) => a.id === id);
  if (!a)
    return (
      <div className="page">
        <Empty
          title="Заявка не найдена"
          text="Вам доступны заявки только на собственные проекты."
          to="/requests"
          label="К заявкам"
        />
      </div>
    );
  const template =
    a.status === "declined"
      ? `Здравствуйте, ${a.full_name}! К сожалению, заявка на «${a.title}» отклонена. Спасибо за желание помочь. Другие проекты ждут вас на Kömek.`
      : `Здравствуйте, ${a.full_name}! Ваша заявка на «${a.title}» одобрена. Подтвердите участие в личном кабинете Kömek. Начало: ${stamp(a.starts_at)}.`;
  const contact = a.contact.startsWith("@")
    ? "https://t.me/" + a.contact.slice(1)
    : "mailto:" + encodeURIComponent(a.contact);
  return (
    <div className="page narrow-page">
      <BackLink to={"/requests?event=" + a.event_id}>
        К заявкам проекта
      </BackLink>
      <PageHeading title="Рассмотрение заявки" />
      <section className="surface request-detail">
        <div className="request-identity">
          <span className="avatar large">{a.full_name[0]}</span>
          <div>
            <h2>{a.full_name}</h2>
            <p>{a.university}</p>
          </div>
        </div>
        <Status value={a.status} />
        <dl className="detail-list">
          <div>
            <dt>Проект</dt>
            <dd>
              <Link to={"/my-events/" + a.event_id}>
                {a.title}
                <ArrowUpRight size={17} />
              </Link>
            </dd>
          </div>
          <div>
            <dt>Контакт</dt>
            <dd>
              <a href={contact} target="_blank" rel="noreferrer">
                {a.contact}
                <ExternalLink size={17} />
              </a>
            </dd>
          </div>
          <div>
            <dt>Заявка подана</dt>
            <dd>{stamp(a.created_at)}</dd>
          </div>
          {a.decision_at && (
            <div>
              <dt>Решение принято</dt>
              <dd>{stamp(a.decision_at)}</dd>
            </div>
          )}
          {a.confirmed_at && (
            <div>
              <dt>Участие подтверждено</dt>
              <dd>{stamp(a.confirmed_at)}</dd>
            </div>
          )}
        </dl>
        {a.motivation && (
          <div className="motivation">
            <h3>Почему хочет помочь</h3>
            <p>{a.motivation}</p>
          </div>
        )}
        {a.status === "pending" ? (
          <>
            <div className="decision-actions">
              <button
                className="button primary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await act(
                    `/applications/${id}/decision`,
                    { status: "accepted" },
                    "Заявка одобрена. Волонтёр получил уведомление в кабинете.",
                    "PATCH",
                  );
                  setBusy(false);
                }}
              >
                Принять заявку
                <CheckCircle2 size={20} />
              </button>
              <button
                className="button danger-secondary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await act(
                    `/applications/${id}/decision`,
                    { status: "declined" },
                    "Заявка отклонена. Волонтёр получил уведомление.",
                    "PATCH",
                  );
                  setBusy(false);
                }}
              >
                Отклонить
              </button>
            </div>
            {Date.now() - Date.parse(a.created_at) > 44 * 3600000 && (
              <p className="warning-text">
                Волонтёр ждёт решения больше 44 часов.
              </p>
            )}
          </>
        ) : (
          <div className="notice">
            <CheckCircle2 size={22} />
            <p>
              {a.status === "confirmed"
                ? "Волонтёр подтвердил участие и добавлен в состав команды."
                : a.status === "accepted"
                  ? "Уведомление в кабинете отправлено. Теперь волонтёр должен подтвердить участие."
                  : "Волонтёр получил уведомление об отказе в своём кабинете."}
            </p>
          </div>
        )}
      </section>
      {a.status !== "pending" && (
        <section className="surface message-section">
          <span className="eyebrow">ДОПОЛНИТЕЛЬНАЯ СВЯЗЬ</span>
          <h2>Сообщение волонтёру</h2>
          <p>
            Если связываетесь через Telegram или email, отправьте этот текст
            вручную и отметьте отправку.
          </p>
          <blockquote>{template}</blockquote>
          <div className="button-row">
            <button
              className="button secondary"
              onClick={() =>
                navigator.clipboard
                  .writeText(template)
                  .then(() => notify("Текст сообщения скопирован"))
                  .catch(() => notify("Выделите и скопируйте текст сообщения."))
              }
            >
              <Copy size={18} />
              Копировать текст
            </button>
            {!a.notice_sent_at && (
              <button
                className="button primary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await act(
                    `/applications/${id}/notice`,
                    undefined,
                    "Время ручной отправки записано.",
                  );
                  setBusy(false);
                }}
              >
                <Mail size={18} />Я отправил(а) сообщение
              </button>
            )}
          </div>
          {a.notice_sent_at ? (
            <p className="sent-message">
              <CheckCircle2 size={18} />
              Отправка отмечена: {stamp(a.notice_sent_at)}
            </p>
          ) : a.decision_at &&
            Date.now() - Date.parse(a.decision_at) > 4 * 3600000 ? (
            <p className="warning-text">
              После решения прошло больше 4 часов. Отправьте внешнее сообщение,
              если используете этот канал.
            </p>
          ) : null}
        </section>
      )}
    </div>
  );
}
type RosterRow = {
  full_name: string;
  contact: string;
  university: string;
  confirmed_at: string;
};
export function RosterPage() {
  const { user, events, applications, privateLoading } = useApp();
  const { route, go } = useRouter();
  const params = new URLSearchParams(route.split("?")[1]),
    requested = params.get("event") || "";
  const own = events.filter((e) => e.organization_id === user!.id);
  const eventId = own.some((e) => String(e.id) === requested) ? requested : "";
  const tab = params.get("tab") === "unconfirmed" ? "unconfirmed" : "confirmed";
  const [roster, setRoster] = useState<RosterRow[]>([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let stopped = false;
    setRoster([]);
    setError("");
    if (!eventId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api<{ roster: RosterRow[] }>("/events/" + eventId + "/roster")
      .then((d) => {
        if (!stopped) setRoster(d.roster);
      })
      .catch((e) => {
        if (!stopped) setError(e.message);
      })
      .finally(() => {
        if (!stopped) setLoading(false);
      });
    return () => {
      stopped = true;
    };
  }, [eventId, applications]);
  const update = (key: string, v: string) => {
    const q = new URLSearchParams(params);
    q.set(key, v);
    go("/roster?" + q.toString(), true);
  };
  if (privateLoading) return <Loading />;
  const unconfirmed = applications.filter(
    (a) => String(a.event_id) === eventId && a.status === "accepted",
  );
  return (
    <div className="page">
      <PageHeading
        title="Состав команды"
        description="Участники, которые подтвердили, что придут."
        action={
          eventId &&
          tab === "confirmed" && (
            <a
              className="button primary"
              href={`/api/events/${eventId}/roster?format=csv`}
            >
              <Download size={20} />
              Скачать CSV
            </a>
          )
        }
      />
      <div className="single-filter">
        <label className="field">
          <span>Проект</span>
          <select
            value={eventId}
            aria-label="Проект"
            onChange={(e) => update("event", e.target.value)}
          >
            <option value="">Выберите проект</option>
            {own.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      {eventId ? (
        <>
          <Tabs
            items={[
              { id: "confirmed", name: "Подтверждённые", count: roster.length },
              {
                id: "unconfirmed",
                name: "Ждём подтверждения",
                count: unconfirmed.length,
              },
            ]}
            value={tab}
            onChange={(v) => update("tab", v)}
          />
          {loading ? (
            <Loading />
          ) : error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : tab === "confirmed" ? (
            roster.length ? (
              <div className="surface table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Участник</th>
                      <th>Контакт</th>
                      <th>Подтверждение</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((r, i) => (
                      <tr key={i}>
                        <td>
                          <strong>{r.full_name}</strong>
                          <span>{r.university}</span>
                        </td>
                        <td>{r.contact}</td>
                        <td>{stamp(r.confirmed_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty
                title="Подтверждённых участников пока нет"
                text="Одобрение заявки ещё не означает участие. Волонтёр должен подтвердить, что придёт."
                icon={Users}
              />
            )
          ) : unconfirmed.length ? (
            <div className="surface table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Участник</th>
                    <th>Контакт</th>
                    <th>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {unconfirmed.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <Link to={"/requests/" + a.id}>
                          {a.full_name}
                          <ArrowUpRight size={17} />
                        </Link>
                        <span>{a.university}</span>
                      </td>
                      <td>{a.contact}</td>
                      <td>
                        <span className="status accepted">Не подтверждено</span>
                        {Date.parse(a.starts_at) - Date.now() < 86400000 && (
                          <small className="warning-text">
                            {Date.parse(a.starts_at) > Date.now()
                              ? "До события менее 24 часов"
                              : "Событие уже началось"}
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
              title="Нет ожидающих подтверждения"
              text="У этого проекта нет одобренных заявок без подтверждения."
              icon={CheckCircle2}
            />
          )}
        </>
      ) : (
        <Empty
          title="Выберите проект"
          text="Для каждого события хранится свой состав команды. Выберите нужное событие выше."
          icon={Users}
        />
      )}
    </div>
  );
}
export function ReportsPage() {
  const { applications, privateLoading } = useApp();
  if (privateLoading) return <Loading />;
  const notices = applications.filter((a) => a.notice_sent_at);
  const onTime = notices.filter(
    (a) =>
      Date.parse(a.notice_sent_at!) - Date.parse(a.created_at) <= 48 * 3600000,
  ).length;
  const decisionNotices = notices.filter(
    (a) =>
      a.decision_at &&
      Date.parse(a.notice_sent_at!) - Date.parse(a.decision_at) <= 4 * 3600000,
  ).length;
  const late = applications.filter(
    (a) =>
      a.status === "pending" &&
      Date.now() - Date.parse(a.created_at) > 44 * 3600000,
  ).length;
  return (
    <div className="page">
      <PageHeading
        title="Статистика ответов"
        description="Помогает вовремя отвечать волонтёрам и не терять будущую команду."
      />
      <div className="report-grid">
        <section className="surface report-card">
          <Clock3 size={26} />
          <h2>Ответ за 48 часов</h2>
          <strong>
            {applications.length
              ? Math.round((onTime / applications.length) * 100) + "%"
              : "—"}
          </strong>
          <p>
            Доля всех заявок с отметкой внешней отправки в течение 48 часов.
            Цель — 80%.
          </p>
        </section>
        <section className="surface report-card">
          <Mail size={26} />
          <h2>Отправка после решения</h2>
          <strong>
            {notices.length
              ? Math.round((decisionNotices / notices.length) * 100) + "%"
              : "—"}
          </strong>
          <p>
            Доля отмеченных сообщений, отправленных в течение 4 часов после
            решения.
          </p>
        </section>
        <section className="surface report-card">
          <Users size={26} />
          <h2>Ждут больше 44 часов</h2>
          <strong>{late}</strong>
          <p>Заявки, которым стоит ответить в первую очередь.</p>
          <Link className="text-link" to="/requests?status=pending">
            Открыть заявки
            <ArrowRight size={18} />
          </Link>
        </section>
      </div>
      <p className="page-note">
        Расчёты используют отметки ручной отправки Telegram/email. Уведомления в
        кабинете отправляются сразу после решения и не учитываются как внешняя
        доставка.
      </p>
    </div>
  );
}
