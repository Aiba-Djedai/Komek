import type { Event } from "../types";
import { getLocale, t } from "./i18n";

export const date = (
  v: string,
  opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" },
) =>
  new Date(v).toLocaleDateString(getLocale(), {
    ...opts,
    timeZone: "Asia/Almaty",
  });
export const time = (v: string) =>
  new Date(v).toLocaleTimeString(getLocale(), {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Almaty",
  });
export const stamp = (v: string) => t("{0} в {1}", [date(v), time(v)]);
export const eventIsOpen = (e: Event) =>
  !e.closed &&
  new Date(e.deadline).getTime() > Date.now() &&
  e.occupied < e.capacity;
export const eventIsPast = (e: Event) =>
  new Date(e.starts_at).getTime() < Date.now();
