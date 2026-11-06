import { messages } from "./messages.ts";

export const languages = ["ru", "kk", "en"] as const;
export type Language = (typeof languages)[number];
export const isLanguage = (value: unknown): value is Language =>
  languages.includes(value as Language);
export const locales: Record<Language, string> = {
  ru: "ru-RU",
  kk: "kk-KZ",
  en: "en-GB",
};

export function translate(
  language: Language,
  source: string,
  params: readonly unknown[] = [],
) {
  const key = source.trim();
  if (!key) return source;
  const translated =
    language === "ru"
      ? key
      : (messages[key]?.[language === "kk" ? 0 : 1] ?? key);
  const text = translated.replace(/\{(\d+)\}/g, (token, index) =>
    Number(index) < params.length ? String(params[Number(index)]) : token,
  );
  return (
    (source.match(/^\s*/)?.[0] || "") + text + (source.match(/\s*$/)?.[0] || "")
  );
}

// Existing databases contain Russian notification sentences. Match only known
// system templates, preserving the event title verbatim, including punctuation.
export function translateNotification(language: Language, message: string) {
  const accepted =
    /^Ваша заявка на «(.*)» одобрена! Подтвердите участие в личном кабинете\.$/s.exec(
      message,
    );
  if (accepted)
    return translate(
      language,
      "Ваша заявка на «{0}» одобрена! Подтвердите участие в личном кабинете.",
      [accepted[1]],
    );
  const declined =
    /^Ваша заявка на «(.*)» отклонена\. Спасибо за желание помочь — другие проекты ждут вас в каталоге\.$/s.exec(
      message,
    );
  if (declined)
    return translate(
      language,
      "Ваша заявка на «{0}» отклонена. Спасибо за желание помочь — другие проекты ждут вас в каталоге.",
      [declined[1]],
    );
  return message;
}

export function requestLanguage(header: unknown): Language {
  if (typeof header !== "string") return "ru";
  const preferences = header.split(",").map((part, index) => {
    const [tag, ...options] = part.trim().toLowerCase().split(";");
    const quality = options.find((item) => item.trim().startsWith("q="));
    return {
      language: tag.split("-")[0],
      quality: quality ? Number(quality.trim().slice(2)) : 1,
      index,
    };
  });
  return (
    (preferences
      .filter(
        (item) =>
          isLanguage(item.language) && item.quality > 0 && item.quality <= 1,
      )
      .sort((a, b) => b.quality - a.quality || a.index - b.index)[0]
      ?.language as Language) || "ru"
  );
}
