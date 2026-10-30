import {
  Building2,
  ArrowUpRight,
  ArrowRight,
  Search,
  Send,
  CheckCircle2,
  Plus,
  Users,
  ClipboardCheck,
} from "lucide-react";
import { useApp } from "../state";
import { Link, useRouter } from "../lib/router";
import { PageHeading, Tabs } from "../components/UI";
import { eventIsOpen } from "../lib/events";
export function OrganizationsPage() {
  const { events } = useApp();
  const organizations = Array.from(
    new Map(events.map((e) => [e.organization_id, e])).values(),
  );
  return (
    <div className="container page">
      <PageHeading
        eyebrow="ТЕ, КТО ОБЪЕДИНЯЕТ"
        title="Организации Алматы"
        description="Команды, рядом с которыми помощь становится настоящими переменами."
      />
      <div className="organization-directory">
        {organizations.map((e) => (
          <article
            className="surface organization-directory-card"
            key={e.organization_id}
          >
            <span className="organization-directory-logo">
              <Building2 size={35} />
            </span>
            <h2>{e.organization}</h2>
            <p>Волонтёрские инициативы и добрые проекты в Алматы.</p>
            <span>
              Открытых проектов:{" "}
              {
                events.filter(
                  (v) =>
                    v.organization_id === e.organization_id && eventIsOpen(v),
                ).length
              }
            </span>
            <Link
              className="button secondary"
              to={"/projects?search=" + encodeURIComponent(e.organization)}
            >
              Посмотреть проекты
              <ArrowUpRight size={19} />
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
export function AboutPage() {
  const { user } = useApp();
  const { route, go } = useRouter();
  const role =
    new URLSearchParams(route.split("?")[1]).get("for") ||
    user?.role ||
    "volunteer";
  const org = role === "organization";
  const steps = org
    ? [
        {
          title: "Расскажите о проекте",
          text: "Укажите место, время и задачи. Опубликуйте событие и поделитесь ссылкой.",
          icon: Plus,
        },
        {
          title: "Пригласите волонтёров",
          text: "Рассмотрите заявки и примите решение. Каждый участник увидит свой статус.",
          icon: Users,
        },
        {
          title: "Соберите команду",
          text: "Дождитесь подтверждения участия и скачайте итоговый состав в CSV.",
          icon: ClipboardCheck,
        },
      ]
    : [
        {
          title: "Найдите своё дело",
          text: "Выберите направление и проект, который вам по душе. Все возможности собраны в каталоге.",
          icon: Search,
        },
        {
          title: "Подайте заявку",
          text: "Расскажите немного о себе. Ответ организатора появится в кабинете и уведомлениях.",
          icon: Send,
        },
        {
          title: "Подтвердите участие",
          text: "После одобрения сообщите, что придёте, и станьте частью команды.",
          icon: CheckCircle2,
        },
      ];
  return (
    <div className="container page about-page">
      <PageHeading
        eyebrow="ПОМОГАТЬ ПРОЩЕ, ЧЕМ КАЖЕТСЯ"
        title="Как работает Kömek"
        description="Мы соединяем людей, которые хотят помочь, и проекты, которым нужна поддержка."
      />
      <Tabs
        value={org ? "organization" : "volunteer"}
        onChange={(v) => go("/about?for=" + v, true)}
        items={[
          { id: "volunteer", name: "Для волонтёров" },
          { id: "organization", name: "Для организаций" },
        ]}
      />
      <div className="steps-grid">
        {steps.map((s, i) => (
          <article key={s.title} className="surface step-card">
            <div>
              <s.icon size={29} />
              <span>0{i + 1}</span>
            </div>
            <h2>{s.title}</h2>
            <p>{s.text}</p>
          </article>
        ))}
      </div>
      <div className="about-action">
        <p>Участие и публикация проектов бесплатны на этапе пилота.</p>
        <Link
          className="button primary"
          to={
            user
              ? user.role === "organization"
                ? "/events/new"
                : "/projects"
              : "/register?role=" + (org ? "organization" : "volunteer")
          }
        >
          {user
            ? user.role === "organization"
              ? "Создать проект"
              : "Найти проект"
            : "Присоединиться"}
          <ArrowRight size={19} />
        </Link>
      </div>
    </div>
  );
}
export function LegalPage({ privacy = false }: { privacy?: boolean }) {
  return (
    <div className="container page legal-page">
      <PageHeading
        title={privacy ? "Конфиденциальность" : "Условия использования"}
      />
      {privacy ? (
        <>
          <section>
            <h2>Какие данные мы сохраняем</h2>
            <p>
              При регистрации — имя или название организации, email, защищённый
              хеш пароля и данные профиля. При подаче заявки — имя, университет
              или место работы, контакт, мотивацию и согласие на обработку
              данных.
            </p>
          </section>
          <section>
            <h2>Кто видит ваши данные</h2>
            <p>
              Заявку видите вы и организация, создавшая выбранное событие.
              Контакты заявителей не публикуются в каталоге. Подтверждённый
              состав доступен только владельцу проекта.
            </p>
          </section>
          <section>
            <h2>Для чего нужны контакты</h2>
            <p>
              Организатор использует их для рассмотрения заявки и координации
              участия. Решение отображается в кабинете; дополнительные сообщения
              по Telegram или email организатор отправляет вручную.
            </p>
          </section>
          <section>
            <h2>Управление данными</h2>
            <p>
              Изменить данные можно в разделе «Мой профиль». Запрос на удаление
              аккаунта и связанных записей принимает администратор,
              предоставивший вам доступ к используемому экземпляру платформы.
            </p>
          </section>
        </>
      ) : (
        <>
          <section>
            <h2>О платформе</h2>
            <p>
              Kömek — пилотная платформа волонтёрских проектов Алматы.
              Регистрация, участие и публикация проектов бесплатны. Организаторы
              отвечают за достоверность описания и безопасность мероприятий.
            </p>
          </section>
          <section>
            <h2>Заявки и участие</h2>
            <p>
              Отправка заявки не гарантирует участие. Организатор принимает
              решение, после чего волонтёр подтверждает, что придёт. В итоговый
              состав входят только подтвердившие участники. Время на сайте
              отображается по Алматы.
            </p>
          </section>
          <section>
            <h2>Демонстрационные аккаунты</h2>
            <p>
              Открытые демо-аккаунты предназначены для знакомства с
              возможностями платформы. Не добавляйте в них личные или
              конфиденциальные данные.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
