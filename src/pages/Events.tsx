import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Clock3,
  MapPin,
  Users,
  Share2,
  ShieldCheck,
  CheckCircle2,
  Building2,
} from "lucide-react";
import { useApp } from "../state";
import { Link, useRouter } from "../lib/router";
import { api } from "../lib/api";
import { date, time, stamp, eventIsOpen, eventIsPast } from "../lib/events";
import {
  PageHeading,
  Empty,
  BackLink,
  Fact,
  Field,
  Form,
  Status,
  Loading,
  categories,
} from "../components/UI";
import type { Event } from "../types";
export function EventPage({
  id,
  manage = false,
}: {
  id: number;
  manage?: boolean;
}) {
  const { events, user, applications, privateLoading, act, notify } = useApp();
  const [busy, setBusy] = useState(false);
  const event = events.find((e) => e.id === id);
  if (!event)
    return (
      <div className="page container">
        <Empty
          title="Проект не найден"
          text="Возможно, ссылка содержит ошибку."
          to="/projects"
          label="К проектам"
        />
      </div>
    );
  if (manage && event.organization_id !== user?.id)
    return (
      <div className="page">
        <Empty
          title="Нет доступа к управлению"
          text="Этот проект принадлежит другой организации."
          to="/my-events"
          label="Мои проекты"
        />
      </div>
    );
  const own = event.organization_id === user?.id;
  const application = applications.find((a) => a.event_id === id);
  const cat = categories.find((c) => c.id === event.category)!;
  return (
    <div className="page container event-page">
      <BackLink to={manage ? "/my-events" : "/projects"}>
        {manage ? "Мои проекты" : "Все проекты"}
      </BackLink>
      <div className="event-page-heading">
        <span className="category-label inline">
          <cat.icon size={17} />
          {cat.name}
        </span>
        <h1>{event.title}</h1>
        <p>
          <Building2 size={19} />
          {event.organization}
        </p>
      </div>
      <div className="event-layout">
        <div className="event-main">
          <img className="event-cover" src={event.image} alt={event.title} />
          <section className="event-prose">
            <h2>О проекте</h2>
            <p>{event.description}</p>
          </section>
          <section className="event-prose">
            <h2>Что нужно знать</h2>
            <p>
              {event.requirements ||
                "Специальная подготовка не требуется. Организатор расскажет всё необходимое перед началом."}
            </p>
          </section>
          {manage && (
            <section className="notice">
              <ShieldCheck size={23} />
              <div>
                <strong>Управление участниками — отдельно</strong>
                <p>
                  Принимайте решения в разделе заявок. После подтверждения
                  волонтёры появятся в составе команды.
                </p>
                <Link className="text-link" to={"/requests?event=" + id}>
                  Открыть заявки
                  <ArrowRight size={18} />
                </Link>
              </div>
            </section>
          )}
        </div>
        <aside className="event-summary surface">
          <span
            className={
              "recruitment-status " + (eventIsOpen(event) ? "" : "closed")
            }
          >
            <i />
            {eventIsPast(event)
              ? "Проект завершён"
              : eventIsOpen(event)
                ? "Открыт набор"
                : "Набор закрыт"}
          </span>
          <Fact icon={CalendarDays} label="Дата проведения">
            {date(event.starts_at)}, {time(event.starts_at)}
          </Fact>
          <Fact icon={MapPin} label="Место">
            {event.location}
          </Fact>
          <Fact icon={Clock3} label="Участие займёт">
            {event.hours} ч.
          </Fact>
          <Fact icon={Users} label="Свободные места">
            {Math.max(0, event.capacity - event.occupied)} из {event.capacity}
          </Fact>
          <Fact icon={CalendarDays} label="Приём заявок до">
            {stamp(event.deadline)}
          </Fact>
          <div className="summary-actions">
            {manage ? (
              <>
                <Link
                  className="button primary"
                  to={"/my-events/" + id + "/edit"}
                >
                  Редактировать проект
                  <ArrowUpRight size={19} />
                </Link>
                <Link className="button secondary" to={"/requests?event=" + id}>
                  Заявки участников
                  <ArrowRight size={18} />
                </Link>
                {!eventIsPast(event) && (
                  <button
                    className="button quiet"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      await act(
                        "/events/" + id,
                        { closed: !event.closed },
                        event.closed ? "Набор открыт" : "Набор закрыт",
                        "PATCH",
                      );
                      setBusy(false);
                    }}
                  >
                    {event.closed ? "Открыть набор" : "Закрыть набор"}
                  </button>
                )}
              </>
            ) : own ? (
              <Link className="button primary" to={"/my-events/" + id}>
                Управлять проектом
                <ArrowUpRight size={19} />
              </Link>
            ) : user?.role === "organization" ? (
              <Link className="button secondary" to="/my-events">
                Мои проекты
                <ArrowRight size={18} />
              </Link>
            ) : user && privateLoading ? (
              <Loading />
            ) : application ? (
              <>
                <Status value={application.status} />
                <Link
                  className="button primary"
                  to={"/applications/" + application.id}
                >
                  Моя заявка
                  <ArrowRight size={18} />
                </Link>
              </>
            ) : eventIsOpen(event) ? (
              <Link
                className="button primary"
                to={
                  user
                    ? `/events/${id}/apply`
                    : `/register?role=volunteer&next=${encodeURIComponent(`/events/${id}/apply`)}`
                }
              >
                Хочу помочь
                <ArrowUpRight size={20} />
              </Link>
            ) : (
              <button className="button primary" disabled>
                Приём заявок закрыт
              </button>
            )}
            <button
              className="button quiet"
              onClick={() =>
                navigator.clipboard
                  .writeText(location.origin + "/events/" + id)
                  .then(() => notify("Ссылка на проект скопирована"))
                  .catch(() =>
                    notify("Скопируйте адрес проекта из строки браузера."),
                  )
              }
            >
              <Share2 size={18} />
              Поделиться
            </button>
          </div>
          {!manage && (
            <p className="summary-note">
              <CheckCircle2 size={17} />
              Участие бесплатное
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
function localDate(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export function EventFormPage({ id }: { id?: number }) {
  const { user, events, refresh, notify } = useApp();
  const { go } = useRouter();
  const event = id ? events.find((e) => e.id === id) : undefined;
  if (id && (!event || event.organization_id !== user?.id))
    return (
      <div className="page">
        <Empty
          title="Проект недоступен"
          text="Можно редактировать только свои проекты."
          to="/my-events"
          label="Мои проекты"
        />
      </div>
    );
  return (
    <div className="page form-page">
      <BackLink to={id ? "/my-events/" + id : "/my-events"}>
        {id ? "К проекту" : "Мои проекты"}
      </BackLink>
      <PageHeading
        eyebrow="ОРГАНИЗАЦИЯ"
        title={id ? "Редактирование проекта" : "Создайте доброе дело"}
        description="Расскажите волонтёрам, где и какая помощь нужна."
      />
      <Form
        label={id ? "Сохранить изменения" : "Опубликовать проект"}
        footer={
          <Link
            to={id ? "/my-events/" + id : "/my-events"}
            className="button quiet"
          >
            Отмена
          </Link>
        }
        onSubmit={async (values) => {
          const starts_at = new Date(String(values.starts_at)).toISOString(),
            deadline = new Date(String(values.deadline)).toISOString();
          if (Date.parse(deadline) >= Date.parse(starts_at))
            throw Error(
              "Приём заявок должен завершиться до начала самого события. Проверьте обе даты.",
            );
          const result = await api<{ event: Event }>(
            id ? "/events/" + id : "/events",
            id ? "PATCH" : "POST",
            {
              ...values,
              starts_at,
              deadline,
              hours: Number(values.hours),
              capacity: Number(values.capacity),
              image: values.image || event?.image || "/images/planting.png",
            },
          );
          await refresh();
          notify(
            id
              ? "Изменения сохранены"
              : "Проект опубликован. Теперь можно принимать заявки.",
          );
          go("/my-events/" + result.event.id);
        }}
      >
        <fieldset className="form-section surface">
          <legend>
            <span>01</span>О проекте
          </legend>
          <Field
            label="Название проекта"
            name="title"
            defaultValue={event?.title}
            placeholder="Например, посадка деревьев в парке"
            required
            minLength={4}
            maxLength={150}
          />
          <label className="field">
            <span>Направление</span>
            <select name="category" defaultValue={event?.category || "eco"}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Описание проекта</span>
            <textarea
              name="description"
              rows={5}
              minLength={20}
              maxLength={10000}
              required
              defaultValue={event?.description}
              placeholder="Что будете делать, кому помогать и какие задачи ждут волонтёров?"
            />
          </label>
          <Field
            label="Место проведения"
            name="location"
            defaultValue={event?.location}
            required
            minLength={3}
            maxLength={300}
            placeholder="Город, адрес или ориентир"
          />
        </fieldset>
        <fieldset className="form-section surface">
          <legend>
            <span>02</span>Когда и сколько
          </legend>
          <div className="form-grid">
            <Field
              label="Дата проведения события"
              name="starts_at"
              type="datetime-local"
              defaultValue={localDate(event?.starts_at)}
              required
            />
            <Field
              label="Приём заявок до"
              name="deadline"
              type="datetime-local"
              defaultValue={localDate(event?.deadline)}
              required
            />
          </div>
          <p className="field-help">
            Дедлайн — окончание набора до начала самого события. В форме
            используется время вашего устройства (
            {Intl.DateTimeFormat().resolvedOptions().timeZone}); на сайте даты
            показаны по Алматы.
          </p>
          <div className="form-grid">
            <Field
              label="Продолжительность, часов"
              name="hours"
              type="number"
              min="0.5"
              max="168"
              step="0.5"
              required
              defaultValue={event?.hours || 3}
            />
            <Field
              label="Количество участников"
              name="capacity"
              type="number"
              min="1"
              max="10000"
              required
              defaultValue={event?.capacity || 20}
            />
          </div>
        </fieldset>
        <fieldset className="form-section surface">
          <legend>
            <span>03</span>Полезные детали
          </legend>
          <Field
            label="Ссылка на фотографию"
            name="image"
            type="url"
            defaultValue={event?.image.startsWith("https:") ? event.image : ""}
            placeholder="https://…"
            hint="Необязательно. Если оставить поле пустым, используем готовую обложку."
          />
          <label className="field">
            <span>Требования и что взять с собой</span>
            <textarea
              name="requirements"
              rows={3}
              defaultValue={event?.requirements}
              maxLength={2000}
              placeholder="Возраст, навыки, одежда или другие важные детали"
            />
          </label>
        </fieldset>
      </Form>
    </div>
  );
}
export function ApplyPage({ id }: { id: number }) {
  const { user, events, applications, privateLoading, refresh, notify } =
    useApp();
  const { go } = useRouter();
  const event = events.find((e) => e.id === id);
  if (privateLoading) return <Loading />;
  if (!event)
    return (
      <Empty
        title="Проект не найден"
        text="Выберите другой проект в каталоге."
        to="/projects"
      />
    );
  const existing = applications.find((a) => a.event_id === id);
  if (existing)
    return (
      <div className="page">
        <Empty
          title="Заявка уже отправлена"
          text="Её статус можно проверить в своём кабинете."
          to={"/applications/" + existing.id}
          label="Открыть мою заявку"
        />
      </div>
    );
  if (!eventIsOpen(event))
    return (
      <div className="page">
        <Empty
          title="Приём заявок завершён"
          text="Для этого проекта набор уже закрыт."
          to="/projects"
          label="Найти другой проект"
        />
      </div>
    );
  return (
    <div className="page form-page">
      <BackLink to={"/events/" + id}>К проекту</BackLink>
      <PageHeading
        eyebrow="ЗАЯВКА НА УЧАСТИЕ"
        title="Расскажите немного о себе"
        description="Организатор рассмотрит заявку и сообщит решение в вашем кабинете."
      />
      <div className="application-project-summary">
        <img src={event.image} alt="" />
        <div>
          <strong>{event.title}</strong>
          <span>{stamp(event.starts_at)}</span>
        </div>
      </div>
      <Form
        className="surface form-section"
        label="Отправить заявку"
        onSubmit={async (values) => {
          const result = await api<{ application: { id: number } }>(
            `/events/${id}/applications`,
            "POST",
            values,
          );
          await refresh();
          notify("Заявка отправлена. Организатор скоро её рассмотрит.");
          go("/applications/" + result.application.id);
        }}
      >
        <Field
          label="Имя и фамилия"
          name="full_name"
          defaultValue={user!.name}
          required
          minLength={2}
          maxLength={200}
          autoComplete="name"
        />
        <Field
          label="Университет или место работы"
          name="university"
          defaultValue={user!.university}
          required
          minLength={2}
          maxLength={200}
        />
        <Field
          label="Telegram или email"
          name="contact"
          defaultValue={user!.contact || user!.email}
          required
          hint="Контакт увидит только организатор этого проекта."
        />
        <label className="field">
          <span>
            Почему хотите присоединиться?{" "}
            <span className="optional">Необязательно</span>
          </span>
          <textarea
            name="motivation"
            rows={3}
            maxLength={2000}
            placeholder="Можно написать об опыте или просто о желании помочь"
          />
        </label>
        <label className="consent">
          <input type="checkbox" name="consent" required />
          <span>
            Согласен(-на) передать имя, университет и контакт организатору для
            рассмотрения заявки и координации участия.{" "}
            <Link to="/privacy">Обработка данных</Link>
          </span>
        </label>
      </Form>
    </div>
  );
}
