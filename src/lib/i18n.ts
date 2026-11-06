import { useSyncExternalStore } from "react";
import {
  isLanguage,
  locales,
  translate,
  translateNotification,
  type Language,
} from "../../shared/translate.ts";

const storageKey = "komek-language";
function readLanguage(): Language {
  try {
    const stored = localStorage.getItem(storageKey);
    if (isLanguage(stored)) return stored;
  } catch {
    /* Language selection also works when browser storage is blocked. */
  }
  return "ru";
}
let language = readLanguage();
const listeners = new Set<() => void>();
export const getLanguage = () => language;
export const getLocale = () => locales[language];
export const t = (source: string, params?: readonly unknown[]) =>
  translate(language, source, params);
export const notificationText = (message: string) =>
  translateNotification(language, message);

function updateDocument() {
  document.documentElement.lang = language;
  document.title = t("Kömek — добрые дела начинаются с тебя");
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute(
      "content",
      t(
        "Kömek — волонтёрские проекты Алматы. Найдите своё доброе дело, подайте заявку и станьте частью перемен.",
      ),
    );
}
export function setLanguage(next: Language) {
  if (language === next) return;
  language = next;
  try {
    localStorage.setItem(storageKey, next);
  } catch {
    /* Keep in-memory preference. */
  }
  updateDocument();
  listeners.forEach((listener) => listener());
}
export function useLanguage() {
  return useSyncExternalStore((listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, getLanguage);
}
addEventListener("storage", (event) => {
  if (event.key === storageKey || event.key === null) {
    const next = readLanguage();
    if (next !== language) {
      language = next;
      updateDocument();
      listeners.forEach((listener) => listener());
    }
  }
});
updateDocument();
