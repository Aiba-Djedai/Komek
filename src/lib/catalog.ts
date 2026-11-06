import type { Event } from "../types";
import { citySearchText } from "../../shared/catalog.ts";

export type CatalogFilters = {
  categories: string[];
  city: string;
  nearest: boolean;
  period: "active" | "future" | "past";
  search: string;
};
export const defaultCatalogFilters: CatalogFilters = {
  categories: [],
  city: "",
  nearest: true,
  period: "active",
  search: "",
};
export const unspecifiedCity = "__unspecified";

export function filterCatalog(
  events: Event[],
  filters: CatalogFilters,
  favorites: number[] | null = null,
  now = Date.now(),
) {
  const query = filters.search.trim().toLocaleLowerCase();
  return events
    .filter((event) => {
      const past = Date.parse(event.starts_at) <= now;
      const open =
        !past &&
        !event.closed &&
        Date.parse(event.deadline) > now &&
        event.occupied < event.capacity;
      return (
        (!filters.categories.length ||
          filters.categories.includes(event.category)) &&
        (!filters.city ||
          (filters.city === unspecifiedCity
            ? !event.city
            : event.city === filters.city)) &&
        (!query ||
          `${event.title} ${event.description} ${event.location} ${citySearchText(event.city || "")} ${event.organization}`
            .toLocaleLowerCase()
            .includes(query)) &&
        (filters.period === "past"
          ? past
          : filters.period === "future"
            ? !past
            : open) &&
        (favorites === null || favorites.includes(event.id))
      );
    })
    .sort((a, b) =>
      filters.nearest
        ? (filters.period === "past" ? -1 : 1) *
            (Date.parse(a.starts_at) - Date.parse(b.starts_at)) || b.id - a.id
        : b.id - a.id,
    );
}
