import { useEffect, useState } from "react";
import { Search, X, ArrowRight } from "lucide-react";
import { useApp } from "../state";
import { useRouter, Link } from "../lib/router";
import {
  PageHeading,
  ProjectCard,
  Empty,
  Tabs,
  categories,
} from "../components/UI";
import { eventIsOpen, eventIsPast } from "../lib/events";
export function ProjectsPage({ favorites = false }: { favorites?: boolean }) {
  const { events, saved } = useApp();
  const { route, go } = useRouter();
  const params = new URLSearchParams(route.split("?")[1]);
  const query = params.get("search") || "",
    category = params.get("category") || "all",
    period = params.get("period") || "active",
    sort = params.get("sort") || "soon";
  const [search, setSearch] = useState(query);
  useEffect(() => setSearch(query), [query]);
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    next.delete("page");
    go((favorites ? "/favorites" : "/projects") + "?" + next.toString(), true);
  };
  const matching = events
    .filter(
      (e) =>
        (!favorites || saved.includes(e.id)) &&
        (category === "all" || e.category === category) &&
        (!query ||
          `${e.title} ${e.description} ${e.location} ${e.organization}`
            .toLowerCase()
            .includes(query.toLowerCase())) &&
        (period === "past"
          ? eventIsPast(e)
          : period === "future"
            ? !eventIsPast(e)
            : eventIsOpen(e)),
    )
    .sort((a, b) =>
      sort === "spots"
        ? b.capacity - b.occupied - (a.capacity - a.occupied)
        : sort === "new"
          ? b.id - a.id
          : Date.parse(a.starts_at) - Date.parse(b.starts_at),
    );
  const count = Math.max(1, Math.ceil(matching.length / 6)),
    page = Math.min(count, Math.max(1, Number(params.get("page")) || 1));
  return (
    <div className="container page catalog-page">
      <PageHeading
        eyebrow={favorites ? "СОХРАНЁННЫЕ ПРОЕКТЫ" : "ВОЗМОЖНОСТИ ПОМОЧЬ"}
        title={favorites ? "Избранное" : "Найдите своё доброе дело"}
        description={
          favorites
            ? "Проекты, к которым хочется вернуться."
            : "Волонтёрские проекты Алматы. Выбирайте то, что вам близко."
        }
      />
      <form
        className="catalog-search"
        onSubmit={(e) => {
          e.preventDefault();
          update("search", search);
        }}
      >
        <Search size={23} />
        <input
          aria-label="Поиск проектов"
          placeholder="Название проекта, место или организация"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            type="button"
            className="icon-button"
            aria-label="Очистить поиск"
            onClick={() => {
              setSearch("");
              update("search", "");
            }}
          >
            <X size={20} />
          </button>
        )}
        <button className="button primary" type="submit">
          Найти
          <ArrowRight size={18} />
        </button>
      </form>
      <div className="catalog-filters">
        <Tabs
          value={period}
          onChange={(v) => update("period", v)}
          items={[
            { id: "active", name: "Открыт набор" },
            { id: "future", name: "Предстоящие" },
            { id: "past", name: "Завершённые" },
          ]}
          label="Период проектов"
        />
        <div className="filter-selects">
          <label>
            Направление
            <select
              aria-label="Направление"
              value={category}
              onChange={(e) => update("category", e.target.value)}
            >
              {[{ id: "all", name: "Все направления" }, ...categories].map(
                (c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ),
              )}
            </select>
          </label>
          <label>
            Сортировка
            <select
              aria-label="Сортировка"
              value={sort}
              onChange={(e) => update("sort", e.target.value)}
            >
              <option value="soon">Ближайшие</option>
              <option value="new">Сначала новые</option>
              <option value="spots">Больше мест</option>
            </select>
          </label>
        </div>
      </div>
      <div className="result-line">
        <span>
          Найдено проектов: <strong>{matching.length}</strong>
        </span>
        <span>Алматы · время UTC+5</span>
      </div>
      {matching.length ? (
        <>
          <div className="project-grid">
            {matching.slice((page - 1) * 6, page * 6).map((e) => (
              <ProjectCard key={e.id} event={e} />
            ))}
          </div>
          {count > 1 && (
            <nav className="pagination" aria-label="Страницы проектов">
              {Array.from({ length: count }, (_, i) => (
                <button
                  key={i}
                  aria-current={page === i + 1 ? "page" : undefined}
                  onClick={() => {
                    const next = new URLSearchParams(params);
                    next.set("page", String(i + 1));
                    go(
                      (favorites ? "/favorites" : "/projects") +
                        "?" +
                        next.toString(),
                    );
                    document
                      .querySelector(".catalog-filters")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </nav>
          )}
        </>
      ) : (
        <Empty
          title={
            favorites && !saved.length
              ? "Пока нет избранных проектов"
              : "Проекты не найдены"
          }
          text={
            favorites && !saved.length
              ? "Нажмите на закладку у понравившегося проекта — он появится здесь."
              : "Попробуйте другое направление или измените поисковый запрос."
          }
          to={
            favorites && !saved.length
              ? "/projects"
              : favorites
                ? "/favorites"
                : "/projects"
          }
          label={
            favorites && !saved.length
              ? "Посмотреть проекты"
              : "Сбросить фильтры"
          }
        />
      )}
    </div>
  );
}
