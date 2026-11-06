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

// Cities of republican significance remain separate from the surrounding regions.
export const regionCities: Record<string, readonly string[]> = {
  "Абайская область": ["Семей"],
  "Акмолинская область": ["Кокшетау"],
  "Актюбинская область": ["Актобе"],
  "Алматинская область": ["Конаев"],
  "Атырауская область": ["Атырау"],
  "Восточно-Казахстанская область": ["Усть-Каменогорск"],
  "Жамбылская область": ["Тараз"],
  "Западно-Казахстанская область": ["Уральск"],
  "Жетысуская область": ["Талдыкорган"],
  "Карагандинская область": ["Караганда"],
  "Костанайская область": ["Костанай"],
  "Кызылординская область": ["Кызылорда"],
  "Мангистауская область": ["Актау"],
  "Павлодарская область": ["Павлодар"],
  "Северо-Казахстанская область": ["Петропавловск"],
  "Туркестанская область": ["Туркестан"],
  "Улытауская область": ["Жезказган"],
};
export const catalogPlaces = [
  "Алматы",
  "Астана",
  "Шымкент",
  ...Object.keys(regionCities),
];
const regionAliases: Record<string, readonly string[]> = {
  "Абайская область": ["Абайская область", "Абай облысы", "Abai Region"],
  "Акмолинская область": [
    "Акмолинская область",
    "Ақмола облысы",
    "Akmola Region",
  ],
  "Актюбинская область": [
    "Актюбинская область",
    "Ақтөбе облысы",
    "Aktobe Region",
  ],
  "Алматинская область": [
    "Алматинская область",
    "Алматы облысы",
    "Almaty Region",
  ],
  "Атырауская область": [
    "Атырауская область",
    "Атырау облысы",
    "Atyrau Region",
  ],
  "Восточно-Казахстанская область": [
    "Восточно-Казахстанская область",
    "Шығыс Қазақстан облысы",
    "East Kazakhstan Region",
  ],
  "Жамбылская область": [
    "Жамбылская область",
    "Жамбыл облысы",
    "Zhambyl Region",
  ],
  "Западно-Казахстанская область": [
    "Западно-Казахстанская область",
    "Батыс Қазақстан облысы",
    "West Kazakhstan Region",
  ],
  "Жетысуская область": [
    "Жетысуская область",
    "Жетісу облысы",
    "Zhetysu Region",
  ],
  "Карагандинская область": [
    "Карагандинская область",
    "Қарағанды облысы",
    "Karaganda Region",
  ],
  "Костанайская область": [
    "Костанайская область",
    "Қостанай облысы",
    "Kostanay Region",
  ],
  "Кызылординская область": [
    "Кызылординская область",
    "Қызылорда облысы",
    "Kyzylorda Region",
  ],
  "Мангистауская область": [
    "Мангистауская область",
    "Маңғыстау облысы",
    "Mangystau Region",
  ],
  "Павлодарская область": [
    "Павлодарская область",
    "Павлодар облысы",
    "Pavlodar Region",
  ],
  "Северо-Казахстанская область": [
    "Северо-Казахстанская область",
    "Солтүстік Қазақстан облысы",
    "North Kazakhstan Region",
  ],
  "Туркестанская область": [
    "Туркестанская область",
    "Түркістан облысы",
    "Turkistan Region",
  ],
  "Улытауская область": [
    "Улытауская область",
    "Ұлытау облысы",
    "Ulytau Region",
  ],
};

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
  Конаев: ["Конаев", "Қонаев", "Qonaev", "Konaev", "Konayev"],
  Жезказган: ["Жезказган", "Жезқазған", "Zhezkazgan", "Jezkazgan"],
};
const placeAliases = { ...regionAliases, ...cityAliases };
export const suggestedPlaces = [
  ...new Set([...catalogPlaces, ...Object.keys(cityAliases)]),
];
export function matchesPlace(city: string, selection: string) {
  return (
    city === selection ||
    (Object.hasOwn(regionCities, selection) &&
      regionCities[selection].includes(city))
  );
}
export const citySearchText = (city: string) =>
  (Object.hasOwn(placeAliases, city) ? placeAliases[city] : [city]).join(" ");
export function normalizeCity(value: string) {
  const city = value.trim().replace(/\s+/g, " ");
  return (
    Object.entries(placeAliases).find(([, aliases]) =>
      aliases.some((alias) => alias.toLowerCase() === city.toLowerCase()),
    )?.[0] || city
  );
}

// Used only to migrate old addresses and support clients that predate city.
// An unknown address stays unassigned rather than being labelled as Almaty.
export function inferCity(location: string) {
  return (
    Object.entries(placeAliases).find(([, aliases]) =>
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
