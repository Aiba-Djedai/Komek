import { useEffect, useId, useState } from "react";
import {
  ArrowUpRight,
  Bookmark,
  ChevronDown,
  Clock3,
  Heart,
  Leaf,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { catalogPlaces } from "../../shared/catalog.ts";
import type { Event } from "../types";
import { getCategories } from "../lib/categories";
import { date, eventIsOpen as open, eventIsPast as past } from "../lib/events";
import {
  filterCatalog,
  unspecifiedCity,
  type CatalogFilters,
} from "../lib/catalog";
import { t } from "../lib/i18n";
import "./Catalog.css";

export function Catalog({
  events,
  filters,
  onChange,
  favoritesOnly,
  onToggleFavorites,
  saved,
  onSave,
  onView,
  onReset,
}: {
  events: Event[];
  filters: CatalogFilters;
  onChange: (filters: CatalogFilters) => void;
  favoritesOnly: boolean;
  onToggleFavorites: () => void;
  saved: number[];
  onSave: (id: number) => void;
  onView: (event: Event) => void;
  onReset: () => void;
}) {
  const [expanded, setExpanded] = useState(
    () => matchMedia("(min-width: 901px)").matches,
  );
  const cityId = useId();
  useEffect(() => {
    const media = matchMedia("(min-width: 901px)");
    const resize = () => setExpanded(media.matches);
    media.addEventListener("change", resize);
    return () => media.removeEventListener("change", resize);
  }, []);
  const filtered = filterCatalog(events, filters, favoritesOnly ? saved : null);
  const cities = [
    ...new Set([
      ...catalogPlaces,
      ...events.map((event) => event.city).filter(Boolean),
    ]),
  ];
  // Keep an active city selectable if a refresh temporarily returns no events there.
  if (
    filters.city &&
    filters.city !== unspecifiedCity &&
    !cities.includes(filters.city)
  )
    cities.push(filters.city);
  const selectedCount =
    filters.categories.length + Number(Boolean(filters.city));
  const update = (patch: Partial<CatalogFilters>) =>
    onChange({ ...filters, ...patch });
  return (
    <section
      id="projects"
      className="projects container project-catalog"
      aria-labelledby="catalog-title"
    >
      <div className="section-heading">
        <div>
          <div className="eyebrow">{t("НАЙДИ ТО, ЧТО ОТКЛИКАЕТСЯ")}</div>
          <h2 id="catalog-title">
            {t("Добрые дела ждут тебя")}
            <span className="green-dot">.</span>
          </h2>
          <p>{t("Выбирай проект по душе. А мы поможем сделать первый шаг.")}</p>
        </div>
        <button
          className={"saved-toggle " + (favoritesOnly ? "selected" : "")}
          aria-pressed={favoritesOnly}
          onClick={onToggleFavorites}
        >
          <Bookmark size={18} fill={favoritesOnly ? "currentColor" : "none"} />
          {t("Избранное")}
          {saved.length > 0 && <span>{saved.length}</span>}
        </button>
      </div>
      <div className="catalog-layout">
        <details
          className="catalog-filters"
          open={expanded}
          onToggle={(event) => setExpanded(event.currentTarget.open)}
        >
          <summary>
            <SlidersHorizontal size={20} />
            <span>{t("Фильтры")}</span>
            {selectedCount > 0 && (
              <span className="filter-count">{selectedCount}</span>
            )}
            <ChevronDown size={18} />
          </summary>
          <div className="catalog-filter-fields">
            <label className="catalog-city" htmlFor={cityId}>
              {t("Город или область")}
            </label>
            <select
              id={cityId}
              value={filters.city}
              onChange={(event) => update({ city: event.target.value })}
            >
              <option value="">{t("Все города и области")}</option>
              {cities.map((city) => (
                <option value={city} key={city}>
                  {t(city)}
                </option>
              ))}
              {(events.some((event) => !event.city) ||
                filters.city === unspecifiedCity) && (
                <option value={unspecifiedCity}>{t("Город не указан")}</option>
              )}
            </select>
            <fieldset className="catalog-directions">
              <legend>{t("Направления")}</legend>
              <p>{t("Можно выбрать несколько направлений")}</p>
              <button
                className="catalog-all-directions"
                type="button"
                aria-pressed={!filters.categories.length}
                onClick={() => update({ categories: [] })}
              >
                {t("Все направления")}
              </button>
              {getCategories()
                .slice(1)
                .map((category) => (
                  <label className="catalog-check" key={category.id}>
                    <input
                      type="checkbox"
                      checked={filters.categories.includes(category.id)}
                      onChange={(event) =>
                        update({
                          categories: event.target.checked
                            ? [...filters.categories, category.id]
                            : filters.categories.filter(
                                (id) => id !== category.id,
                              ),
                        })
                      }
                    />
                    <span>{category.label}</span>
                  </label>
                ))}
            </fieldset>
            <fieldset className="catalog-order">
              <legend>{t("Порядок проектов")}</legend>
              <label className="catalog-check">
                <input
                  type="checkbox"
                  checked={filters.nearest}
                  onChange={(event) =>
                    update({ nearest: event.target.checked })
                  }
                />
                <span>{t("Сначала ближайшие")}</span>
              </label>
              <p>
                {filters.nearest
                  ? filters.period === "past"
                    ? t("Для завершённых — сначала последние события")
                    : t("События отсортированы по дате начала")
                  : t("Сначала показаны недавно добавленные проекты")}
              </p>
            </fieldset>
            <button className="button outline catalog-reset" onClick={onReset}>
              {t("Сбросить фильтры")}
            </button>
            <small className="catalog-auto-hint">
              {t("Фильтры применяются сразу")}
            </small>
          </div>
        </details>
        <div className="catalog-content">
          <label className="catalog-search">
            <Search size={20} />
            <input
              value={filters.search}
              onChange={(event) => update({ search: event.target.value })}
              placeholder={t("Название, место или организация")}
              aria-label={t("Поиск проектов")}
            />
            {filters.search && (
              <button
                aria-label={t("Очистить поиск")}
                onClick={() => update({ search: "" })}
              >
                <X size={18} />
              </button>
            )}
          </label>
          <div
            className="catalog-periods"
            role="group"
            aria-label={t("Период проектов")}
          >
            {(
              [
                ["active", t("Актуальные")],
                ["future", t("Предстоящие")],
                ["past", t("Завершённые")],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                aria-pressed={filters.period === value}
                onClick={() => update({ period: value })}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="catalog-results-heading">
            <p role="status">
              {favoritesOnly ? t("Избранные проекты") : t("Найдено проектов")}
              <strong>{filtered.length}</strong>
            </p>
            <span>{t("Время указано по Алматы")}</span>
          </div>
          {filtered.length ? (
            <div className="event-grid">
              {filtered.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  saved={saved.includes(event.id)}
                  toggleSaved={() => onSave(event.id)}
                  onClick={() => onView(event)}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state catalog-empty">
              <span>
                <Search size={30} />
              </span>
              <h2>{t("Пока ничего не нашлось")}</h2>
              <p>{t("Измените город, направления или поисковый запрос.")}</p>
            </div>
          )}
        </div>
      </div>
      <div className="catalog-bottom">
        <span>{t("Даже несколько часов могут изменить чей-то день.")}</span>
        <Heart size={17} />
      </div>
    </section>
  );
}
function EventCard({
  event: e,
  saved,
  toggleSaved,
  onClick,
}: {
  event: Event;
  saved: boolean;
  toggleSaved: () => void;
  onClick: () => void;
}) {
  const cat =
    getCategories().find((c) => c.id === e.category) || getCategories()[0];
  return (
    <article className="event-card">
      <div className="card-image">
        <button
          className="image-link"
          onClick={onClick}
          tabIndex={-1}
          aria-label={e.title}
        >
          <img src={e.image} alt={e.title} loading="lazy" />
        </button>
        <span className={"category-pill " + e.category}>
          <cat.icon size={13} />
          {cat.label}
        </span>
        <button
          className={"save-button " + (saved ? "is-saved" : "")}
          onClick={toggleSaved}
          aria-label={saved ? t("Убрать из избранного") : t("В избранное")}
          aria-pressed={saved}
        >
          <Heart size={18} fill={saved ? "currentColor" : "none"} />
        </button>
        <div className="date-badge">
          <strong>{date(e.starts_at, { day: "2-digit" })}</strong>
          <span>{date(e.starts_at, { month: "short" }).replace(".", "")}</span>
        </div>
      </div>
      <div className="card-content">
        <span className="org-label">
          <span className="mini-logo">
            <Leaf size={12} />
          </span>
          {e.organization}
          <ShieldCheck size={13} />
        </span>
        <button className="card-title" onClick={onClick}>
          <h3>{e.title}</h3>
        </button>
        <p className="card-description">{e.description}</p>
        <div className="card-meta">
          <span>
            <MapPin size={14} />
            {e.city ? t(e.city) : e.location}
          </span>
          <span>
            <Clock3 size={14} />
            {e.hours} {t(" ч.")}
          </span>
        </div>
        <div className="card-bottom">
          <span className={open(e) ? "spots" : "closed-spots"}>
            <span className="live-dot" />
            {past(e)
              ? t("Проект завершён")
              : open(e)
                ? t("{0} свободных мест", [e.capacity - e.occupied])
                : t("Приём закрыт")}
          </span>
          <button onClick={onClick}>
            {past(e) ? t("Посмотреть") : t("Подробнее")}{" "}
            <ArrowUpRight size={16} />
          </button>
        </div>
      </div>
    </article>
  );
}
