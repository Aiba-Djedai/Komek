import { test, expect } from "@playwright/test";
const now = Date.now();
const event = (
  id: number,
  title: string,
  category: string,
  city: string,
  days: number,
) => ({
  id,
  title,
  category,
  city,
  organization: "Команда города",
  organization_id: 1,
  description: "Вместе помогаем городу и поддерживаем друг друга.",
  location: "Центральная площадь",
  starts_at: new Date(now + days * 86400000).toISOString(),
  deadline: new Date(now + (days - 1) * 86400000).toISOString(),
  hours: 3,
  capacity: 20,
  occupied: 0,
  application_count: 0,
  closed: 0,
  image: "/images/community.jpg",
  requirements: "",
});
const fixtures = [
  event(101, "Спортивный день", "sports", "Астана", 3),
  event(102, "Помощь в клинике", "medical", "Алматы", 4),
  event(103, "Учения поисковой команды", "rescue", "Астана", 6),
  event(104, "Донорский день", "medical", "Астана", 5),
  event(105, "Экологический проект", "eco", "Алматы", 7),
  event(106, "Завершённый спортивный день", "sports", "Астана", -5),
  event(107, "Проект без города", "rescue", "", 8),
];

test("catalog combines several directions, city, nearest order, saved projects and periods", async ({
  page,
}) => {
  await page.route("**/api/events", (route) =>
    route.fulfill({ json: { events: fixtures } }),
  );
  await page.goto("/projects");
  const titles = page.locator(".event-card h3");
  await expect(titles).toHaveCount(6);
  await page
    .getByRole("checkbox", { name: "Спортивное волонтёрство", exact: true })
    .check();
  await page
    .getByRole("checkbox", { name: "Медицинское волонтёрство", exact: true })
    .check();
  await expect(titles).toHaveText([
    "Спортивный день",
    "Помощь в клинике",
    "Донорский день",
  ]);
  await page
    .getByLabel("Город или область", { exact: true })
    .selectOption("Астана");
  await expect(titles).toHaveText(["Спортивный день", "Донорский день"]);
  await page
    .getByRole("checkbox", { name: "Сначала ближайшие", exact: true })
    .uncheck();
  await expect(titles).toHaveText(["Донорский день", "Спортивный день"]);
  await page
    .locator(".event-card")
    .first()
    .getByRole("button", { name: "В избранное", exact: true })
    .click();
  await page.getByRole("button", { name: /^Избранное/ }).click();
  await expect(titles).toHaveText(["Донорский день"]);
  await page.getByRole("button", { name: /^Избранное/ }).click();
  await page.getByRole("button", { name: "Завершённые", exact: true }).click();
  await expect(titles).toHaveText(["Завершённый спортивный день"]);
  await page
    .getByRole("button", { name: "Сбросить фильтры", exact: true })
    .click();
  await expect(titles).toHaveCount(6);
  await expect(
    page.getByRole("checkbox", { name: "Сначала ближайшие", exact: true }),
  ).toBeChecked();
  await page
    .getByLabel("Город или область", { exact: true })
    .selectOption("__unspecified");
  await expect(titles).toHaveText(["Проект без города"]);
  await page
    .getByRole("button", { name: "Сбросить фильтры", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Поиск проектов", exact: true })
    .fill("ASTANA");
  await expect(titles).toHaveText([
    "Спортивный день",
    "Донорский день",
    "Учения поисковой команды",
  ]);
  await page
    .getByRole("textbox", { name: "Поиск проектов", exact: true })
    .fill("несуществующий проект");
  await expect(
    page.getByRole("heading", { name: "Пока ничего не нашлось" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Сбросить фильтры", exact: true })
    .click();
  await page.locator("#projects").screenshot({
    path: "/tmp/komek-catalog-desktop.png",
    animations: "disabled",
  });
});

test("filters collapse on mobile, retain selections across resizing and translate in all languages", async ({
  page,
}) => {
  await page.route("**/api/events", (route) =>
    route.fulfill({ json: { events: fixtures } }),
  );
  await page.goto("/projects");
  await page
    .getByRole("checkbox", {
      name: "Поисково-спасательное волонтёрство",
      exact: true,
    })
    .check();
  for (const language of ["ru", "kk", "en"]) {
    await page.locator("header .language-trigger").click();
    await page
      .locator(`header .language-options button[lang="${language}"]`)
      .click();
    for (const width of [320, 390, 768, 960, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${language}/${width}`,
      ).toBe(true);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".catalog-filters")).not.toHaveAttribute(
    "open",
    "",
  );
  await page.locator(".catalog-filters summary").click();
  await expect(
    page.getByRole("checkbox", {
      name: "Search and rescue volunteering",
      exact: true,
    }),
  ).toBeChecked();
  await expect(
    page.getByLabel("City or region", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("City or region", { exact: true })
    .selectOption("Астана");
  await expect(page.locator(".event-card h3")).toHaveText([
    "Учения поисковой команды",
  ]);
  await page.locator("#projects").screenshot({
    path: "/tmp/komek-catalog-mobile.png",
    animations: "disabled",
  });
  await page.locator(".catalog-filters summary").click();
  await expect(page.locator(".catalog-search")).toBeVisible();
});

test("organization form sends city and new category independently of address and preserves them when editing", async ({
  page,
}) => {
  const signup = await page.request.post("/api/auth/register", {
    data: {
      role: "organization",
      name: "Команда нового направления",
      email: `catalog-form-${Date.now()}@example.com`,
      password: "CatalogTest123!",
      consent: true,
    },
  });
  expect(signup.ok()).toBe(true);
  const { user } = await signup.json();
  let created: any = null;
  await page.route("**/api/events", async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON();
      created = {
        ...event(200, "Учения добровольцев", "rescue", "Астана", 5),
        ...body,
        organization_id: user.id,
        organization: user.name,
      };
      await route.fulfill({ status: 201, json: { event: created } });
    } else await route.fulfill({ json: { events: created ? [created] : [] } });
  });
  await page.goto("/");
  await page
    .locator(".role-home-actions")
    .getByRole("button", { name: "Создать проект", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Название проекта", { exact: true })
    .fill("Учения добровольцев");
  await dialog
    .getByLabel("Описание", { exact: true })
    .fill("Практические учения для волонтёров поисковой команды.");
  await dialog
    .getByLabel("Направление", { exact: true })
    .selectOption("rescue");
  await dialog.getByLabel("Город или область", { exact: true }).fill("Астана");
  await dialog
    .getByLabel("Место проведения", { exact: true })
    .fill("Центральная площадь");
  await dialog
    .getByLabel("Дата и время начала", { exact: true })
    .fill(new Date(now + 5 * 86400000).toISOString().slice(0, 16));
  await dialog
    .getByLabel("Дедлайн подачи заявок", { exact: true })
    .fill(new Date(now + 3 * 86400000).toISOString().slice(0, 16));
  const sent = page.waitForRequest(
    (r) => r.url().endsWith("/api/events") && r.method() === "POST",
  );
  await dialog
    .getByRole("button", { name: "Опубликовать событие", exact: true })
    .click();
  const body = (await sent).postDataJSON();
  expect(body.city).toBe("Астана");
  expect(body.category).toBe("rescue");
  expect(body.location).toBe("Центральная площадь");
  await expect(dialog).toHaveCount(0);
  await page
    .getByRole("button", { name: "Редактировать", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByLabel("Город или область", { exact: true }),
  ).toHaveValue("Астана");
  await expect(
    page.getByRole("dialog").getByLabel("Направление", { exact: true }),
  ).toHaveValue("rescue");
});

test("all requested cities and regions remain available without projects, in every language", async ({
  page,
}) => {
  await page.route("**/api/events", (route) =>
    route.fulfill({ json: { events: [] } }),
  );
  await page.goto("/projects");
  const select = page.locator(".catalog-filter-fields > select");
  const places = [
    "Алматы",
    "Астана",
    "Шымкент",
    "Абайская область",
    "Акмолинская область",
    "Актюбинская область",
    "Алматинская область",
    "Атырауская область",
    "Восточно-Казахстанская область",
    "Жамбылская область",
    "Западно-Казахстанская область",
    "Жетысуская область",
    "Карагандинская область",
    "Костанайская область",
    "Кызылординская область",
    "Мангистауская область",
    "Павлодарская область",
    "Северо-Казахстанская область",
    "Туркестанская область",
    "Улытауская область",
  ];
  await expect(select.locator("option")).toHaveText([
    "Все города и области",
    ...places,
  ]);
  await select.selectOption("Абайская область");
  await expect(
    page.getByRole("heading", { name: "Пока ничего не нашлось" }),
  ).toBeVisible();
  await expect(select.locator("option")).toHaveCount(21);
  for (const [language, label] of [
    ["kk", "Абай облысы"],
    ["en", "Abai Region"],
  ]) {
    await page.locator("header .language-trigger").click();
    await page
      .locator(`header .language-options button[lang="${language}"]`)
      .click();
    await expect(select).toHaveValue("Абайская область");
    await expect(select.locator("option:checked")).toHaveText(label);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".catalog-filters summary").click();
  await select.selectOption("Улытауская область");
  await expect(select.locator("option:checked")).toHaveText("Ulytau Region");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
