export const categoryDefinitions = [
  { id: "eco", label: "Экология" },
  { id: "social", label: "Социальная помощь" },
  { id: "animals", label: "Помощь животным" },
  { id: "events", label: "События" },
  { id: "education", label: "Образование" },
  { id: "sports", label: "Спортивное волонтёрство" },
  { id: "medical", label: "Медицинское волонтёрство" },
  { id: "rescue", label: "Поисково-спасательное волонтёрство" },
] as const;

const cityAliases: Record<string, readonly string[]> = {
  Алматы: ["Алматы", "Almaty"],
  Астана: ["Астана", "Astana", "Нур-Султан", "Nur-Sultan"],
  Шымкент: ["Шымкент", "Shymkent"],
  Караганда: ["Караганда", "Қарағанды", "Karaganda", "Qaragandy"],
  Актобе: ["Актобе", "Ақтөбе", "Aktobe"],
  Атырау: ["Атырау", "Atyrau"],
  Актау: ["Актау", "Ақтау", "Aktau"],
  Павлодар: ["Павлодар", "Pavlodar"],
  Тараз: ["Тараз", "Taraz"],
  Костанай: ["Костанай", "Қостанай", "Kostanay"],
  Кокшетау: ["Кокшетау", "Көкшетау", "Kokshetau"],
  Петропавловск: ["Петропавловск", "Петропавл", "Petropavl", "Petropavlovsk"],
  Семей: ["Семей", "Semey"],
  "Усть-Каменогорск": [
    "Усть-Каменогорск",
    "Өскемен",
    "Oskemen",
    "Ust-Kamenogorsk",
  ],
  Кызылорда: ["Кызылорда", "Қызылорда", "Kyzylorda"],
  Уральск: ["Уральск", "Орал", "Oral", "Uralsk"],
  Туркестан: ["Туркестан", "Түркістан", "Turkistan"],
  Талдыкорган: ["Талдыкорган", "Талдықорған", "Taldykorgan"],
};
export const suggestedCities = Object.keys(cityAliases);
export const citySearchText = (city: string) =>
  (Object.hasOwn(cityAliases, city) ? cityAliases[city] : [city]).join(" ");
export function normalizeCity(value: string) {
  const city = value.trim().replace(/\s+/g, " ");
  return (
    Object.entries(cityAliases).find(([, aliases]) =>
      aliases.some((alias) => alias.toLowerCase() === city.toLowerCase()),
    )?.[0] || city
  );
}

// Used only to migrate old addresses and support clients that predate city.
// An unknown address stays unassigned rather than being labelled as Almaty.
export function inferCity(location: string) {
  return (
    Object.entries(cityAliases).find(([, aliases]) =>
      aliases.some((alias) => {
        const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(
          `(?:^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`,
          "iu",
        ).test(location);
      }),
    )?.[0] || ""
  );
}
