import { test, expect } from "@playwright/test";

test("my projects separates upcoming and completed participations, survives reload and fits mobile", async ({
  page,
}) => {
  const login = await page.request.post("/api/auth/login", {
    data: { email: "volunteer@komek.kz", password: "Komek2026!" },
  });
  const { user } = await login.json();
  const now = Date.parse("2028-06-10T10:00:00Z");
  await page.clock.setFixedTime(now);
  const fixture = (
    id: number,
    title: string,
    status: string,
    offset: number,
  ) => ({
    id,
    event_id: id,
    user_id: user.id,
    title,
    status,
    starts_at: new Date(now + offset * 3_600_000).toISOString(),
    hours: 3,
    location: "Алматы, городской парк",
    image: "/images/mountains.png",
  });
  await page.route("**/api/dashboard", (route) =>
    route.fulfill({
      json: {
        applications: [
          fixture(1, "Позднее участие", "confirmed", 48),
          fixture(2, "Заявка на завтра", "pending", 24),
          fixture(3, "Одобренный проект", "accepted", 36),
          fixture(4, "Событие сейчас", "confirmed", -1),
          fixture(5, "Завершён вчера", "confirmed", -24),
          fixture(6, "Завершён неделю назад", "confirmed", -168),
          fixture(7, "Отказ по заявке", "declined", 24),
          fixture(8, "Старое ожидание решения", "pending", -24),
          fixture(9, "Не подтвердил участие", "accepted", -24),
          {
            ...fixture(10, "Проект другого волонтёра", "confirmed", 24),
            user_id: user.id + 1000,
          },
        ],
      },
    }),
  );
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Основная навигация" });
  await expect(nav.getByRole("button")).toHaveText([
    "Найти проект",
    "Мои проекты",
    "Организации",
    "Как это работает",
  ]);
  await nav.getByRole("button", { name: "Мои проекты", exact: true }).click();
  await expect(page).toHaveURL(/\/my-projects$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Мои проекты.",
  );
  await expect(page.locator(".participation-card h2")).toHaveText([
    "Событие сейчас",
    "Заявка на завтра",
    "Одобренный проект",
    "Позднее участие",
  ]);
  await expect(page.getByText("Идёт сейчас", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Подтвердить участие", exact: true }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Предстоящие 4" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Завершённые 2" }).click();
  await expect(page.locator(".participation-card h2")).toHaveText([
    "Завершён вчера",
    "Завершён неделю назад",
  ]);
  await expect(
    page.getByRole("button", { name: "Подтвердить участие", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".participation-card")).toHaveCount(4);
  for (const width of [320, 390, 768, 960, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Меню", exact: true }).click();
  await nav.getByRole("button", { name: "Мои проекты", exact: true }).click();
  await expect(nav).not.toBeVisible();
  await expect(page.locator(".my-projects")).toBeVisible();
  await page.screenshot({
    path: "/tmp/komek-my-projects-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Завершённые 2" }).click();
  await page.screenshot({
    path: "/tmp/komek-my-projects-completed.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Предстоящие 4" }).click();
  await page
    .locator(".participation-card")
    .first()
    .getByRole("button", { name: "Подробнее", exact: true })
    .click();
  await expect(page).toHaveURL(/\/events\/4$/);
  await page.goBack();
  await expect(page.locator(".my-projects")).toBeVisible();
  await page.getByRole("button", { name: "Мои заявки", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("new volunteer sees empty states and can find projects", async ({
  page,
}) => {
  const signup = await page.request.post("/api/auth/register", {
    data: {
      role: "volunteer",
      name: "Новый участник",
      email: `projects-${Date.now()}@example.com`,
      password: "ProjectsTest123!",
      consent: true,
    },
  });
  expect(signup.ok()).toBe(true);
  await page.goto("/my-projects");
  await expect(
    page.getByRole("heading", { name: "Предстоящих проектов пока нет" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Завершённые 0" }).click();
  await expect(
    page.getByRole("heading", { name: "История добрых дел ещё впереди" }),
  ).toBeVisible();
  await page
    .locator(".my-projects-heading")
    .getByRole("button", { name: "Найти проект" })
    .click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.locator(".event-card").first()).toBeVisible();
});

test("guest and organization do not see volunteer projects or navigation", async ({
  page,
}) => {
  await page.goto("/my-projects");
  await expect(
    page.getByRole("heading", { name: "Войдите, чтобы увидеть свои проекты" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation")
      .getByRole("button", { name: "Мои проекты", exact: true }),
  ).toHaveCount(0);
  await page
    .locator("main")
    .getByRole("button", { name: "Войти", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page.request.post("/api/auth/login", {
    data: { email: "org@komek.kz", password: "Komek2026!" },
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Страница для волонтёров" }),
  ).toBeVisible();
  await expect(page.locator(".participation-card")).toHaveCount(0);
  await expect(
    page
      .getByRole("navigation")
      .getByRole("button", { name: "Мои проекты", exact: true }),
  ).toHaveCount(0);
  await page
    .locator("main")
    .getByRole("button", { name: "Мой кабинет", exact: true })
    .click();
  await expect(page).toHaveURL(/\/dashboard$/);
});
