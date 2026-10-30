import {
  useId,
  useState,
  type ReactNode,
  type InputHTMLAttributes,
} from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  CalendarDays,
  MapPin,
  Clock3,
  LoaderCircle,
  Leaf,
  Heart,
  PawPrint,
  Users,
  GraduationCap,
  Search,
  AlertCircle,
} from "lucide-react";
import { Link } from "../lib/router";
import { useApp } from "../state";
import type { Event } from "../types";
import { date, time, eventIsOpen, eventIsPast } from "../lib/events";
export const categories = [
  { id: "eco", name: "Экология", icon: Leaf },
  { id: "social", name: "Социальная помощь", icon: Heart },
  { id: "animals", name: "Помощь животным", icon: PawPrint },
  { id: "events", name: "События", icon: Users },
  { id: "education", name: "Образование", icon: GraduationCap },
];
export const statuses: Record<string, string> = {
  pending: "На рассмотрении",
  accepted: "Заявка одобрена",
  declined: "Заявка отклонена",
  confirmed: "Участие подтверждено",
};
export function Status({ value }: { value: string }) {
  return (
    <span className={"status " + value}>
      <i />
      {statuses[value] || value}
    </span>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function Empty({
  title,
  text,
  to,
  label = "Найти проект",
  icon: Icon = Search,
}: {
  title: string;
  text: string;
  to?: string;
  label?: string;
  icon?: typeof Search;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon size={32} />
      </span>
      <h2>{title}</h2>
      <p>{text}</p>
      {to && (
        <Link to={to} className="button primary">
          {label}
          <ArrowRight size={18} />
        </Link>
      )}
    </div>
  );
}
export function Loading() {
  return (
    <div className="page-loading" role="status">
      <LoaderCircle className="spin" size={26} />
      <span>Загружаем…</span>
    </div>
  );
}
export function Field({
  label,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        {...props}
        id={id}
        aria-describedby={hint ? id + "-hint" : undefined}
      />
      {hint && <small id={id + "-hint"}>{hint}</small>}
    </div>
  );
}
export type FormValues = Record<string, FormDataEntryValue | boolean>;
export function Form({
  children,
  onSubmit,
  label,
  className = "",
  footer,
}: {
  children: ReactNode;
  onSubmit: (values: FormValues) => Promise<void>;
  label: string;
  className?: string;
  footer?: ReactNode;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className={"form " + className}
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        const form = e.currentTarget;
        const values: FormValues = Object.fromEntries(
          new FormData(form).entries(),
        );
        if ("consent" in values) values.consent = true;
        setBusy(true);
        setError("");
        try {
          await onSubmit(values);
        } catch (e) {
          setError((e as Error).message);
          requestAnimationFrame(() =>
            form.querySelector<HTMLElement>('[role="alert"]')?.focus(),
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      {children}
      {error && (
        <div className="form-error" role="alert" tabIndex={-1}>
          <AlertCircle size={20} />
          {error}
        </div>
      )}
      <div className="form-footer">
        <button type="submit" className="button primary" disabled={busy}>
          {busy ? <LoaderCircle className="spin" size={20} /> : null}
          {busy ? "Сохраняем…" : label}
          {!busy && <ArrowRight size={18} />}
        </button>
        {footer}
      </div>
    </form>
  );
}
export function Tabs({
  items,
  value,
  onChange,
  label = "Разделы",
}: {
  items: { id: string; name: string; count?: number }[];
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  return (
    <div className="tabs" role="group" aria-label={label}>
      {items.map((t) => (
        <button
          key={t.id}
          aria-pressed={value === t.id}
          className={value === t.id ? "active" : ""}
          onClick={() => onChange(t.id)}
        >
          {t.name}
          {t.count !== undefined && <span>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
export function ProjectCard({ event: e }: { event: Event }) {
  const { user, saved, toggleSaved } = useApp();
  const cat = categories.find((c) => c.id === e.category)!;
  const closed = !eventIsOpen(e);
  return (
    <article className="project-card">
      <div className="project-card-image">
        <Link to={"/events/" + e.id} tabIndex={-1} aria-label={e.title}>
          <img
            src={e.image}
            alt=""
            loading="lazy"
            onError={(ev) => {
              ev.currentTarget.onerror = null;
              ev.currentTarget.src = "/images/planting.png";
            }}
          />
        </Link>
        <span className="category-label">
          <cat.icon size={15} />
          {cat.name}
        </span>
        {user?.role !== "organization" && (
          <button
            className={"save-project " + (saved.includes(e.id) ? "saved" : "")}
            aria-label={
              saved.includes(e.id) ? "Убрать из избранного" : "В избранное"
            }
            aria-pressed={saved.includes(e.id)}
            onClick={() => toggleSaved(e.id)}
          >
            <Bookmark
              size={21}
              fill={saved.includes(e.id) ? "currentColor" : "none"}
            />
          </button>
        )}
      </div>
      <div className="project-card-content">
        <span className="project-organization">{e.organization}</span>
        <h3>
          <Link to={"/events/" + e.id}>{e.title}</Link>
        </h3>
        <div className="project-meta">
          <span>
            <CalendarDays size={17} />
            {date(e.starts_at)}, {time(e.starts_at)}
          </span>
          <span>
            <MapPin size={17} />
            {e.location}
          </span>
        </div>
        <div className="project-card-bottom">
          <span className={closed ? "muted" : "available"}>
            {eventIsPast(e)
              ? "Завершён"
              : closed
                ? "Набор закрыт"
                : `Мест: ${e.capacity - e.occupied}`}
            <span className="card-duration"> · {e.hours} ч.</span>
          </span>
          <Link to={"/events/" + e.id} aria-label={"Подробнее: " + e.title}>
            <ArrowUpRight size={23} />
          </Link>
        </div>
      </div>
    </article>
  );
}
export function BackLink({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) {
  return (
    <Link to={to} className="back-link">
      <ArrowRight size={17} />
      {children}
    </Link>
  );
}
export function Fact({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Clock3;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="fact">
      <Icon size={21} />
      <div>
        <span>{label}</span>
        <strong>{children}</strong>
      </div>
    </div>
  );
}
export function ApplicationTabs({
  value,
  onChange,
}: {
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <Tabs
      items={[
        { id: "all", name: "Все" },
        ...Object.entries(statuses).map(([id, name]) => ({ id, name })),
      ]}
      value={value}
      onChange={onChange}
      label="Статус заявок"
    />
  );
}

export function Pagination({
  page,
  count,
  onChange,
}: {
  page: number;
  count: number;
  onChange: (n: number) => void;
}) {
  if (count <= 1) return null;
  return (
    <nav className="pagination simple-pagination" aria-label="Страницы списка">
      <button
        aria-label="Предыдущая страница"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
      >
        <ArrowRight size={18} style={{ transform: "rotate(180deg)" }} />
      </button>
      <span>
        Страница {page} из {count}
      </span>
      <button
        aria-label="Следующая страница"
        disabled={page === count}
        onClick={() => onChange(page + 1)}
      >
        <ArrowRight size={18} />
      </button>
    </nav>
  );
}
