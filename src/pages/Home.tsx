import {
  ArrowRight,
  ArrowUpRight,
  Leaf,
  Heart,
  Building2,
  CalendarDays,
  CheckCircle2,
  Plus,
  Users,
  Send,
} from "lucide-react";
import { useApp } from "../state";
import { Link } from "../lib/router";
import {
  PageHeading,
  ProjectCard,
  Loading,
  categories,
} from "../components/UI";
import { eventIsOpen, eventIsPast, stamp } from "../lib/events";
export function HomePage() {
  const { user } = useApp();
  return user ? (
    user.role === "organization" ? (
      <OrganizationHome />
    ) : (
      <VolunteerHome />
    )
  ) : (
    <GuestHome />
  );
}
function GuestHome() {
  const { events } = useApp();
  const featured = events.filter(eventIsOpen).slice(0, 3);
  return (
    <>
      <section className="landing-hero container">
        <div className="landing-copy">
          <span className="location-pill">
            <span />
            Платформа волонтёрства в Алматы
          </span>
          <h1>
            Маленький шаг.
            <br />
            Большое <span>добро.</span>
          </h1>
          <p>
            Находите проекты по душе, знакомьтесь с единомышленниками и
            помогайте там, где вас ждут.
          </p>
          <div className="landing-actions">
            <Link
              to="/register?role=volunteer"
              className="button primary large"
            >
              Найти своё дело
              <ArrowUpRight size={21} />
            </Link>
            <Link
              to="/register?role=organization"
              className="button secondary large"
            >
              Я представляю организацию
              <ArrowUpRight size={21} />
            </Link>
          </div>
          <p className="hero-footnote">
            <CheckCircle2 size={18} />
            Бесплатная регистрация. Настоящие добрые дела.
          </p>
        </div>
        <div className="landing-image">
          <img
            src="/images/hero.jpg"
            alt="Руки людей, объединившихся ради доброго дела"
          />
          <div className="image-label">
            <span>
              <Heart size={20} fill="currentColor" />
            </span>
            Когда мы вместе,
            <br />
            <strong>помощь становится силой.</strong>
          </div>
          <span className="hero-sticker">
            <Leaf size={22} />
            Начни с себя
          </span>
        </div>
      </section>
      <section className="featured-section container">
        <div className="section-title">
          <div>
            <span className="eyebrow">ВРЕМЯ ДЛЯ ДОБРЫХ ДЕЛ</span>
            <h2>Здесь нужна ваша помощь</h2>
          </div>
          <Link to="/projects" className="text-link">
            Все проекты
            <ArrowRight size={20} />
          </Link>
        </div>
        <div className="category-links">
          {categories.map((c) => (
            <Link key={c.id} to={"/projects?category=" + c.id}>
              <c.icon size={19} />
              {c.name}
            </Link>
          ))}
        </div>
        {featured.length ? (
          <div className="project-grid">
            {featured.map((e) => (
              <ProjectCard key={e.id} event={e} />
            ))}
          </div>
        ) : (
          <p className="muted">Скоро здесь появятся новые проекты.</p>
        )}
      </section>
      <section className="organization-banner container">
        <div className="banner-symbol">
          <Users size={40} />
        </div>
        <div>
          <span className="eyebrow">ДЛЯ ОРГАНИЗАЦИЙ</span>
          <h2>Соберите команду своего проекта</h2>
          <p>Опубликуйте событие и найдите людей, готовых помочь.</p>
        </div>
        <Link to="/register?role=organization" className="button primary">
          Создать организацию
          <ArrowUpRight size={20} />
        </Link>
      </section>
    </>
  );
}
function VolunteerHome() {
  const { user, events, applications, privateLoading } = useApp();
  const next = applications
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
    <div className="page">
      <PageHeading
        eyebrow="МОЁ ВОЛОНТЁРСТВО"
        title={`Привет, ${user!.name.split(" ")[0]}!`}
        description="Хороший день, чтобы сделать что-то доброе."
        action={
          <Link to="/projects" className="button primary">
            Найти проект
            <ArrowUpRight size={20} />
          </Link>
        }
      />
      {privateLoading ? (
        <Loading />
      ) : (
        <>
          <div className="overview-links">
            <Link to="/applications">
              <Send size={21} />
              Мои заявки <strong>{applications.length}</strong>
              <ArrowUpRight size={18} />
            </Link>
            <Link to="/applications?status=confirmed">
              <CheckCircle2 size={21} />
              Подтверждено{" "}
              <strong>
                {applications.filter((a) => a.status === "confirmed").length}
              </strong>
              <ArrowUpRight size={18} />
            </Link>
          </div>
          {next && (
            <section className="next-participation">
              <div className="next-participation-icon">
                <CalendarDays size={29} />
              </div>
              <div>
                <span className="eyebrow">
                  {next.status === "accepted"
                    ? "ВАС ПРИГЛАСИЛИ В КОМАНДУ"
                    : "БЛИЖАЙШЕЕ УЧАСТИЕ"}
                </span>
                <h2>{next.title}</h2>
                <p>
                  {stamp(next.starts_at)} · {next.location}
                </p>
              </div>
              <Link to={"/applications/" + next.id} className="button primary">
                {next.status === "accepted"
                  ? "Подтвердить участие"
                  : "Моя заявка"}
                <ArrowRight size={19} />
              </Link>
            </section>
          )}
        </>
      )}
      <section className="dashboard-featured">
        <div className="section-title">
          <h2>Выберите следующее доброе дело</h2>
          <Link to="/projects" className="text-link">
            Все проекты
            <ArrowRight size={19} />
          </Link>
        </div>
        <div className="project-grid">
          {events
            .filter(eventIsOpen)
            .slice(0, 3)
            .map((e) => (
              <ProjectCard key={e.id} event={e} />
            ))}
        </div>
      </section>
    </div>
  );
}
function OrganizationHome() {
  const { user, events, applications, privateLoading } = useApp();
  const owned = events.filter((e) => e.organization_id === user!.id);
  const pending = applications.filter((a) => a.status === "pending");
  const next = owned
    .filter((e) => !eventIsPast(e))
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))[0];
  return (
    <div className="page">
      <PageHeading
        eyebrow="ОБЗОР ОРГАНИЗАЦИИ"
        title={user!.name}
        description="Всё для вашего следующего доброго проекта."
        action={
          <Link to="/events/new" className="button primary">
            <Plus size={21} />
            Создать проект
          </Link>
        }
      />
      {privateLoading ? (
        <Loading />
      ) : (
        <>
          <div className="organization-metrics">
            <Link to="/my-events">
              <span>
                <CalendarDays size={24} />
                Открытые проекты
              </span>
              <strong>{owned.filter(eventIsOpen).length}</strong>
              <span>
                Перейти к проектам
                <ArrowRight size={18} />
              </span>
            </Link>
            <Link to="/requests?status=pending">
              <span>
                <Users size={24} />
                Заявки на рассмотрении
              </span>
              <strong>{pending.length}</strong>
              <span>
                Рассмотреть заявки
                <ArrowRight size={18} />
              </span>
            </Link>
          </div>
          <div className="organization-overview-grid">
            <section className="surface overview-section">
              <span className="eyebrow">СЛЕДУЮЩЕЕ СОБЫТИЕ</span>
              {next ? (
                <>
                  <h2>{next.title}</h2>
                  <p className="icon-line">
                    <CalendarDays size={20} />
                    {stamp(next.starts_at)}
                  </p>
                  <p className="muted">
                    Мест занято: {next.occupied} из {next.capacity}
                  </p>
                  <Link to={"/my-events/" + next.id} className="text-link">
                    Управлять проектом
                    <ArrowRight size={20} />
                  </Link>
                </>
              ) : (
                <>
                  <span className="overview-illustration">
                    <Leaf size={36} />
                  </span>
                  <h2>Начните с одной доброй идеи</h2>
                  <p>
                    Создайте проект, чтобы волонтёры смогли к вам
                    присоединиться.
                  </p>
                  <Link to="/events/new" className="text-link">
                    Создать первый проект
                    <ArrowRight size={20} />
                  </Link>
                </>
              )}
            </section>
            <section className="surface overview-section">
              <span className="eyebrow">ВАША КОМАНДА</span>
              <span className="overview-illustration">
                <Heart size={36} />
              </span>
              <h2>Кто будет рядом?</h2>
              <p>
                В подтверждённом составе — только волонтёры, которые сообщили,
                что придут.
              </p>
              <Link to="/roster" className="text-link">
                Открыть состав команды
                <ArrowRight size={20} />
              </Link>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
