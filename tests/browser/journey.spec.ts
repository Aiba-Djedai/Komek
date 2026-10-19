import { test, expect } from "@playwright/test";

test("catalog filtering, search, favorites and completed events", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".event-card")).toHaveCount(6);
  await page
    .getByRole("button", { name: "Помощь животным", exact: true })
    .click();
  await expect(page.locator(".event-card")).toHaveCount(1);
  await page.getByRole("button", { name: "В избранное", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: /Избранное/ }).click();
  await expect(page.locator(".event-card")).toHaveCount(1);
  await page.getByRole("button", { name: /Избранное/ }).click();
  await page
    .getByRole("button", { name: "Все направления", exact: true })
    .click();
  await page.getByRole("button", { name: "Завершённые", exact: true }).click();
  await expect(page.locator(".event-card")).toHaveCount(1);
  await expect(
    page.getByText("Проект завершён", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Актуальные/ }).click();
  await page
    .getByRole("textbox", { name: "Поиск проектов" })
    .fill("невозможноеназвание");
  await expect(
    page.getByRole("heading", { name: "Пока ничего не нашлось" }),
  ).toBeVisible();
});

test("complete journey: organization publishes, volunteer applies, organizer decides, volunteer confirms, roster exports", async ({
  browser,
}) => {
  const org = await browser.newContext(),
    vol = await browser.newContext();
  const op = await org.newPage(),
    vp = await vol.newPage();
  const unique = Date.now();
  const title = `Помощь парку ${unique}`;
  async function signup(page: any, kind: string, email: string, name: string) {
    await page.goto("/");
    await page
      .getByRole("button", { name: "Присоединиться", exact: true })
      .click();
    await page
      .locator(".role-switch")
      .getByRole("button", {
        name: kind === "organization" ? "Организация" : "Я волонтёр",
        exact: true,
      })
      .click();
    await page
      .getByLabel(
        kind === "organization" ? "Название организации" : "Имя и фамилия",
        { exact: true },
      )
      .fill(name);
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Пароль", { exact: true }).fill("JourneyPass123!");
    await page.getByRole("checkbox").check();
    await page
      .getByRole("button", { name: "Создать аккаунт", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await signup(
    op,
    "organization",
    `org${unique}@example.com`,
    "Тестовая команда",
  );
  await op.getByRole("button", { name: "Мой кабинет" }).click();
  await op
    .locator(".dashboard-heading")
    .getByRole("button", { name: "Создать событие", exact: true })
    .click();
  await op.getByLabel("Название проекта").fill(title);
  await op
    .getByLabel("Описание", { exact: true })
    .fill("Будем помогать городу: очистим парк и познакомимся с волонтёрами.");
  await op.getByLabel("Место проведения").fill("Алматы, тестовый парк");
  const start = new Date(Date.now() + 8 * 86400000).toISOString().slice(0, 16),
    deadline = new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 16);
  await op.getByLabel("Дата и время начала").fill(start);
  await op.getByLabel("Дедлайн подачи заявок").fill(deadline);
  await op.getByLabel("Количество участников").fill("2");
  await op
    .getByRole("button", { name: "Опубликовать событие", exact: true })
    .click();
  await expect(
    op.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await signup(
    vp,
    "volunteer",
    `vol${unique}@example.com`,
    "Тестовый Волонтёр",
  );
  await vp.getByRole("textbox", { name: "Поиск проектов" }).fill(title);
  await vp.getByRole("button", { name: "Подробнее", exact: true }).click();
  await vp.getByRole("button", { name: "Хочу помочь", exact: true }).click();
  await vp.getByLabel("Университет / место работы").fill("КазНУ");
  await vp.getByRole("checkbox").check();
  await vp
    .getByRole("button", { name: "Отправить заявку", exact: true })
    .click();
  await expect(vp.getByRole("dialog")).toHaveCount(0);
  await vp.getByRole("button", { name: "Мой кабинет" }).click();
  await expect(vp.getByText("На рассмотрении", { exact: true })).toBeVisible();
  await op.reload();
  await op.getByRole("button", { name: /Заявки участников/ }).click();
  await op.getByRole("button", { name: "Принять", exact: true }).click();
  await expect(op.locator(".applicant .status.accepted")).toBeVisible();
  await op
    .getByRole("button", { name: "Подтверждённый состав", exact: true })
    .click();
  await expect(
    op.getByRole("heading", { name: "Подтверждённых участников пока нет" }),
  ).toBeVisible();
  await vp.reload();
  await vp
    .getByRole("button", { name: "Подтвердить участие", exact: true })
    .click();
  await expect(
    vp.getByText("Участие подтверждено", { exact: true }),
  ).toBeVisible();
  await op.reload();
  await op
    .getByRole("button", { name: "Подтверждённый состав", exact: true })
    .click();
  await expect(
    op.locator("table").getByText("Тестовый Волонтёр", { exact: true }),
  ).toBeVisible();
  await op
    .getByLabel("Событие", { exact: true })
    .selectOption({ label: title });
  const download = op.waitForEvent("download");
  await op.getByRole("link", { name: "Скачать CSV" }).click();
  expect((await download).suggestedFilename()).toMatch(/komek-roster/);
  await org.close();
  await vol.close();
});

test("mobile pages do not overflow and navigation works", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".event-card").first()).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Меню", exact: true }).click();
  await page
    .getByRole("button", { name: "Как это работает", exact: false })
    .first()
    .click();
  await expect(page.locator(".how-grid")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/komek-mobile-about.png",
    fullPage: true,
  });
});
