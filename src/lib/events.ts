import type { Event } from "../types";

export const date = (
  v: string,
  opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" },
) =>
  new Date(v).toLocaleDateString("ru-RU", { ...opts, timeZone: "Asia/Almaty" });
export const time = (v: string) =>
  new Date(v).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Almaty",
  });
export const stamp = (v: string) => `${date(v)} в ${time(v)}`;
export const eventIsOpen = (e: Event) =>
  !e.closed &&
  new Date(e.deadline).getTime() > Date.now() &&
  e.occupied < e.capacity;
export const eventIsPast = (e: Event) =>
  new Date(e.starts_at).getTime() < Date.now();
