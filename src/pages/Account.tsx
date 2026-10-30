import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Heart,
  Building2,
  Eye,
  EyeOff,
  CalendarDays,
  MapPin,
  CheckCircle2,
  Clock3,
  Bell,
  Send,
} from "lucide-react";
import { useApp } from "../state";
import { Link, useRouter, safeNext } from "../lib/router";
import { api } from "../lib/api";
import { usePageSlice } from "../lib/pagination";
import { stamp } from "../lib/events";
import {
  PageHeading,
  Field,
  Form,
  Status,
  Empty,
  Loading,
  BackLink,
  ApplicationTabs,
  Pagination,
} from "../components/UI";
import type { User } from "../types";
export function AuthPage({ register = false }: { register?: boolean }) {
  const { authenticate, notify } = useApp();
  const { route, go } = useRouter();
  const params = new URLSearchParams(route.split("?")[1]);
  const role =
    params.get("role") === "organization" ? "organization" : "volunteer";
  const next = params.get("next");
  const [visible, setVisible] = useState(false),
    [busy, setBusy] = useState(false),
    [demoError, setDemoError] = useState("");
  const target = (path: string, r = role) =>
    path + "?role=" + r + (next ? "&next=" + encodeURIComponent(next) : "");
  const success = (user: User) => {
    authenticate(user);
    notify("Добро пожаловать в Kömek!");
    const destination = safeNext(next);
    go(
      user.role === "organization" &&
        (destination.endsWith("/apply") ||
          destination.startsWith("/applications"))
        ? "/"
        : destination,
    );
  };
  return (
    <div className="auth-page container">
      <div className="auth-story">
        <span className="eyebrow">КАЖДЫЙ МОЖЕТ ПОМОЧЬ</span>
        <div className="auth-story-heading">
          {register ? (
            <>
              Всё начинается
              <br />с <span>вас.</span>
            </>
          ) : (
            <>
              Снова вместе.
              <br />
              <span>Снова во благо.</span>
            </>
          )}
        </div>
        <p>
          {role === "organization"
            ? "Собирайте команду, управляйте заявками и создавайте проекты, которые меняют город."
            : "Находите добрые дела, знакомьтесь с людьми и помогайте там, где вы нужны."}
        </p>
        <img src="/images/hero.jpg" alt="Руки людей, готовых помогать вместе" />
      </div>
      <section className="auth-form-panel">
        <BackLink to="/">На главную</BackLink>
        <h1>{register ? "Присоединяйтесь к Kömek" : "Вход в аккаунт"}</h1>
        <p className="muted">
          {register
            ? "Выберите свою роль и создайте аккаунт."
            : "Рады, что вы снова с нами."}
        </p>
        {register && (
          <div className="role-picker" role="group" aria-label="Роль аккаунта">
            <Link
              to={target("/register", "volunteer")}
              className={role === "volunteer" ? "active" : ""}
              aria-current={role === "volunteer" ? "true" : undefined}
            >
              <Heart size={22} />
              <span>Волонтёр</span>
            </Link>
            <Link
              to={target("/register", "organization")}
              className={role === "organization" ? "active" : ""}
              aria-current={role === "organization" ? "true" : undefined}
            >
              <Building2 size={22} />
              <span>Организация</span>
            </Link>
          </div>
        )}
        <Form
          key={String(register) + role}
          label={register ? "Создать аккаунт" : "Войти"}
          onSubmit={async (values) => {
            const data = await api<{ user: User }>(
              "/auth/" + (register ? "register" : "login"),
              "POST",
              { ...values, role },
            );
            success(data.user);
          }}
        >
          {register && (
            <Field
              label={
                role === "organization"
                  ? "Название организации"
                  : "Имя и фамилия"
              }
              name="name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={100}
              placeholder={
                role === "organization"
                  ? "Название вашей команды"
                  : "Как к вам обращаться?"
              }
            />
          )}
          <Field
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
          />
          <label className="field">
            <span>Пароль</span>
            <span className="password-input">
              <input
                name="password"
                type={visible ? "text" : "password"}
                autoComplete={register ? "new-password" : "current-password"}
                required
                minLength={register ? 8 : 1}
                maxLength={128}
                placeholder={register ? "Не менее 8 символов" : "Ваш пароль"}
              />
              <button
                type="button"
                className="icon-button"
                aria-label={visible ? "Скрыть пароль" : "Показать пароль"}
                onClick={() => setVisible(!visible)}
              >
                {visible ? <EyeOff size={21} /> : <Eye size={21} />}
              </button>
            </span>
          </label>
          {register && (
            <>
              <Field
                label="Telegram или email для связи"
                name="contact"
                placeholder="@username или email"
              />
              <label className="consent">
                <input type="checkbox" name="consent" required />
                <span>
                  Соглашаюсь на обработку персональных данных для работы
                  платформы.{" "}
                  <Link to="/privacy" target="_blank" rel="noreferrer">
                    Политика конфиденциальности
                  </Link>
                </span>
              </label>
            </>
          )}
        </Form>
        <p className="auth-switch">
          {register ? "Уже есть аккаунт?" : "Ещё не с нами?"}{" "}
          <Link to={target(register ? "/login" : "/register")}>
            {register ? "Войти" : "Зарегистрироваться"}
          </Link>
        </p>
        {!register && (
          <details className="demo-access">
            <summary>Попробовать демо</summary>
            <p>
              Открытые тестовые аккаунты. Используйте их для знакомства с
              платформой.
            </p>
            <div className="button-row">
              <button
                disabled={busy}
                className="button secondary"
                onClick={async () => {
                  setBusy(true);
                  try {
                    success(
                      (
                        await api<{ user: User }>("/auth/login", "POST", {
                          email: "volunteer@komek.kz",
                          password: "Komek2026!",
                        })
                      ).user,
                    );
                  } catch (e) {
                    setDemoError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Heart size={18} />
                Волонтёр
              </button>
              <button
                disabled={busy}
                className="button secondary"
                onClick={async () => {
                  setBusy(true);
                  try {
                    success(
                      (
                        await api<{ user: User }>("/auth/login", "POST", {
                          email: "org@komek.kz",
                          password: "Komek2026!",
                        })
                      ).user,
                    );
                  } catch (e) {
                    setDemoError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Building2 size={18} />
                Организация
              </button>
            </div>
            {demoError && (
              <p className="form-error" role="alert">
                {demoError}
              </p>
            )}
          </details>
        )}
      </section>
    </div>
  );
}
export function ProfilePage() {
  const { user, authenticate, refresh, notify } = useApp();
  return (
    <div className="page form-page">
      <PageHeading
        title="Мой профиль"
        description="Данные, с которыми вы участвуете в добрых делах."
      />
      <div className="profile-identity">
        <span className="avatar large">{user!.name[0]}</span>
        <div>
          <strong>{user!.name}</strong>
          <span>
            {user!.role === "organization"
              ? "Аккаунт организации"
              : "Аккаунт волонтёра"}
          </span>
        </div>
      </div>
      <Form
        className="surface form-section"
        label="Сохранить изменения"
        onSubmit={async (values) => {
          const data = await api<{ user: User }>("/profile", "PATCH", values);
          authenticate(data.user);
          await refresh();
          notify("Профиль обновлён.");
        }}
      >
        <Field
          label={
            user!.role === "organization"
              ? "Название организации"
              : "Имя и фамилия"
          }
          name="name"
          defaultValue={user!.name}
          required
          minLength={2}
          maxLength={100}
        />
        <Field
          label="Email"
          type="email"
          defaultValue={user!.email}
          disabled
          hint="Email используется для входа в аккаунт."
        />
        {user!.role === "volunteer" && (
          <Field
            label="Университет или место работы"
            name="university"
            defaultValue={user!.university}
            maxLength={200}
          />
        )}
        <Field
          label="Telegram или email для связи"
          name="contact"
          defaultValue={user!.contact}
          maxLength={200}
        />
        <label className="field">
          <span>
            {user!.role === "organization" ? "Об организации" : "О себе"}
          </span>
          <textarea
            name="bio"
            rows={4}
            defaultValue={user!.bio}
            maxLength={1000}
          />
        </label>
      </Form>
    </div>
  );
}
export function ApplicationsPage() {
  const { applications, privateLoading } = useApp();
  const { route, go } = useRouter();
  const status =
    new URLSearchParams(route.split("?")[1]).get("status") || "all";
  const filtered = applications.filter(
    (a) => status === "all" || a.status === status,
  );
  const paging = usePageSlice(filtered);
  if (privateLoading) return <Loading />;
  return (
    <div className="page">
      <PageHeading
        title="Мои заявки"
        description="Здесь можно узнать решение организатора и подтвердить участие."
        action={
          <Link to="/projects" className="button secondary">
            Найти проект
            <ArrowUpRight size={20} />
          </Link>
        }
      />
      <ApplicationTabs
        value={status}
        onChange={(s) => go("/applications?status=" + s, true)}
      />
      {filtered.length ? (
        <div className="application-list">
          {paging.rows.map((a) => (
            <article className="application-list-item surface" key={a.id}>
              <img src={a.image} alt="" />
              <div>
                <Status value={a.status} />
                <h2>
                  <Link to={"/applications/" + a.id}>{a.title}</Link>
                </h2>
                <p>
                  <CalendarDays size={18} />
                  {stamp(a.starts_at)}
                </p>
              </div>
              <Link to={"/applications/" + a.id} className="button secondary">
                {a.status === "accepted" && Date.parse(a.starts_at) > Date.now()
                  ? "Подтвердить участие"
                  : "Открыть заявку"}
                <ArrowRight size={18} />
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          icon={Send}
          title={
            applications.length
              ? "Таких заявок пока нет"
              : "Первое доброе дело ещё впереди"
          }
          text={
            applications.length
              ? "Выберите другой статус или найдите новый проект."
              : "Найдите проект по душе. После отправки заявки её статус появится здесь."
          }
          to={applications.length ? "/applications" : "/projects"}
          label={applications.length ? "Все заявки" : "Найти проект"}
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
export function ApplicationPage({ id }: { id: number }) {
  const { applications, privateLoading, act } = useApp();
  const [busy, setBusy] = useState(false);
  if (privateLoading) return <Loading />;
  const a = applications.find((a) => a.id === id);
  if (!a)
    return (
      <div className="page">
        <Empty
          title="Заявка не найдена"
          text="Здесь доступны только ваши заявки."
          to="/applications"
          label="Мои заявки"
        />
      </div>
    );
  return (
    <div className="page narrow-page">
      <BackLink to="/applications">Мои заявки</BackLink>
      <PageHeading title="Ваша заявка" />
      <section className="surface application-detail">
        <Status value={a.status} />
        <h2>{a.title}</h2>
        <p className="icon-line">
          <CalendarDays size={20} />
          {stamp(a.starts_at)}
        </p>
        <p className="icon-line">
          <MapPin size={20} />
          {a.location}
        </p>
        <Link className="text-link" to={"/events/" + a.event_id}>
          Открыть проект
          <ArrowUpRight size={18} />
        </Link>
        <div className={"application-result " + a.status}>
          {a.status === "pending" ? (
            <>
              <Clock3 size={24} />
              <div>
                <h3>Организатор рассматривает заявку</h3>
                <p>
                  Решение появится здесь и в уведомлениях. Повторно подавать
                  заявку не нужно.
                </p>
              </div>
            </>
          ) : a.status === "accepted" ? (
            <>
              <CheckCircle2 size={25} />
              <div>
                <h3>
                  {Date.parse(a.starts_at) > Date.now()
                    ? "Вас ждут в команде!"
                    : "Вы были приглашены в команду"}
                </h3>
                <p>
                  {Date.parse(a.starts_at) > Date.now()
                    ? "Подтвердите, что сможете прийти. После этого организатор увидит вас в итоговом составе."
                    : "Событие уже началось. Участие не было подтверждено."}
                </p>
              </div>
            </>
          ) : a.status === "confirmed" ? (
            <>
              <CheckCircle2 size={25} />
              <div>
                <h3>Вы в составе команды</h3>
                <p>Организатор знает, что вы придёте. До встречи на проекте!</p>
              </div>
            </>
          ) : (
            <>
              <Heart size={25} />
              <div>
                <h3>Спасибо за желание помочь</h3>
                <p>
                  Сейчас организатор выбрал других участников. В каталоге есть
                  проекты, которым тоже нужна ваша поддержка.
                </p>
              </div>
            </>
          )}
        </div>
        {a.status === "accepted" && Date.parse(a.starts_at) > Date.now() && (
          <button
            className="button primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await act(
                `/applications/${a.id}/confirm`,
                undefined,
                "Участие подтверждено. Вы в команде!",
              );
              setBusy(false);
            }}
          >
            Подтвердить участие
            <CheckCircle2 size={20} />
          </button>
        )}
        {a.status === "declined" && (
          <Link to="/projects" className="button primary">
            Найти другой проект
            <ArrowRight size={18} />
          </Link>
        )}
      </section>
      <section className="surface application-history">
        <h2>История заявки</h2>
        <ol>
          <li>
            <span />
            Заявка отправлена<strong>{stamp(a.created_at)}</strong>
          </li>
          {a.decision_at && (
            <li>
              <span />
              Решение организатора<strong>{stamp(a.decision_at)}</strong>
            </li>
          )}
          {a.confirmed_at && (
            <li>
              <span />
              Участие подтверждено<strong>{stamp(a.confirmed_at)}</strong>
            </li>
          )}
        </ol>
      </section>
    </div>
  );
}
export function NotificationsPage() {
  const { user, notices, privateLoading, act } = useApp();
  if (privateLoading) return <Loading />;
  return (
    <div className="page narrow-page">
      <PageHeading
        title="Уведомления"
        description="Решения и важные обновления по вашим заявкам."
        action={
          notices.some((n) => !n.read_at) && (
            <button
              className="button secondary"
              onClick={() =>
                act(
                  "/notifications/read",
                  undefined,
                  "Уведомления отмечены прочитанными",
                )
              }
            >
              Прочитать все
            </button>
          )
        }
      />
      {notices.length ? (
        <div className="notifications-list">
          {notices.map((n) => (
            <article
              className={
                "surface notification-item " + (!n.read_at ? "unread" : "")
              }
              key={n.id}
            >
              <span className="notification-symbol">
                <Bell size={23} />
              </span>
              <div>
                <p>{n.message}</p>
                <time>{stamp(n.created_at)}</time>
                {n.application_id && (
                  <Link
                    className="text-link"
                    to={
                      (user!.role === "volunteer"
                        ? "/applications/"
                        : "/requests/") + n.application_id
                    }
                  >
                    Открыть заявку
                    <ArrowRight size={18} />
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          icon={Bell}
          title="Пока всё спокойно"
          text="Когда появятся обновления, мы сохраним их здесь."
        />
      )}
    </div>
  );
}
