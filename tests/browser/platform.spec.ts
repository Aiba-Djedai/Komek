import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function registerHere(
  page: Page,
  role: "volunteer" | "organization",
  name: string,
) {
  await page
    .getByLabel(
      role === "organization" ? "Название организации" : "Имя и фамилия",
      { exact: true },
    )
    .fill(name);
  await page
    .getByLabel("Email", { exact: true })
    .fill(`v2-${role}-${Date.now()}@example.com`);
  await page.getByLabel("Пароль", { exact: true }).fill("JourneyPass123!");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Создать аккаунт", exact: true })
    .click();
  await expect(page).toHaveURL("/");
  expect(
    (await (await page.request.get("/api/auth/me")).json()).user.role,
  ).toBe(role);
}
async function signup(
  page: Page,
  role: "volunteer" | "organization",
  name: string,
) {
  await page.goto("/register?role=" + role);
  await registerHere(page, role, name);
}
async function demo(page: Page, role: "volunteer" | "organization") {
  await page.goto("/login");
  await page.getByText("Попробовать демо", { exact: true }).click();
  await page
    .locator(".demo-access")
    .getByRole("button", {
      name: role === "organization" ? "Организация" : "Волонтёр",
      exact: true,
    })
    .click();
  await expect(page).toHaveURL("/");
  await expect(page.locator(".header-account strong")).toHaveText(
    role === "organization" ? "Организация" : "Волонтёр",
  );
}
async function audit(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  ).toEqual([]);
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise(requestAnimationFrame);
      return document.documentElement.scrollWidth - innerWidth;
    }),
    "Horizontal overflow at " +
      JSON.stringify(page.viewportSize()) +
      " on " +
      page.url(),
  ).toBeLessThanOrEqual(0);
}

test("guest home is concise, readable and opens registration for the selected role", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".project-card")).toHaveCount(3);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Маленький шаг.Большое добро.",
  );
  expect(
    await page
      .locator(".landing-copy>p")
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeGreaterThanOrEqual(17);
  await page
    .getByRole("link", { name: "Я представляю организацию", exact: true })
    .click();
  await expect(page).toHaveURL(/\/register\?role=organization/);
  await expect(
    page.getByLabel("Название организации", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "На главную", exact: true }).click();
  await page
    .getByRole("link", { name: "Найти своё дело", exact: true })
    .click();
  await expect(page).toHaveURL(/role=volunteer/);
  await registerHere(page, "volunteer", "Новый Волонтёр");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Привет, Новый!",
  );
  await expect(
    page.getByRole("link", { name: "Создать проект", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".header-account strong")).toHaveText("Волонтёр");
});

test("catalog independently filters, searches, saves projects and shows completed events", async ({
  page,
}) => {
  await page.goto("/projects");
  await expect(page.locator(".project-card")).toHaveCount(6);
  await page.getByLabel("Направление", { exact: true }).selectOption("animals");
  await expect(page.locator(".project-card")).toHaveCount(1);
  await page.getByRole("button", { name: "В избранное", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Убрать из избранного", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Направление", { exact: true }).selectOption("all");
  await page.getByRole("button", { name: "Завершённые", exact: true }).click();
  await expect(page.locator(".project-card")).toHaveCount(1);
  await expect(page.locator(".project-card-bottom")).toContainText("Завершён");
  await page.getByRole("button", { name: "Открыт набор", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Поиск проектов", exact: true })
    .fill("совсемнесуществующийпроект");
  await page.getByRole("button", { name: "Найти", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Проекты не найдены" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Поиск проектов", exact: true }),
  ).toHaveValue("совсемнесуществующийпроект");
});

test("new organization has its own empty workspace and a dedicated creation page", async ({
  page,
}) => {
  await signup(page, "organization", "Новая команда");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Новая команда",
  );
  await expect(page.locator(".header-account strong")).toHaveText(
    "Организация",
  );
  await expect(page.locator(".project-card")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Начните с одной доброй идеи" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Создать проект", exact: true }).click();
  await expect(page).toHaveURL("/events/new");
  await expect(
    page.getByLabel("Дата проведения события", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("link", { name: "Мои проекты", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Начните с первого проекта" }),
  ).toBeVisible();
  await page.goto("/applications");
  await expect(
    page.getByRole("heading", { name: "Этот раздел для волонтёров" }),
  ).toBeVisible();
});

test("full journey on dedicated pages: create, edit, apply, accept, confirm, CSV and notifications", async ({
  browser,
}) => {
  const oc = await browser.newContext(),
    vc = await browser.newContext(),
    op = await oc.newPage(),
    vp = await vc.newPage();
  const title = "Доброе дело " + Date.now();
  await signup(op, "organization", "Команда добрых дел");
  await op.getByRole("link", { name: "Создать проект", exact: true }).click();
  await op.getByLabel("Название проекта", { exact: true }).fill(title);
  await op
    .getByLabel("Описание проекта", { exact: true })
    .fill("Поможем городу: очистим парк и познакомимся с волонтёрами.");
  await op
    .getByLabel("Место проведения", { exact: true })
    .fill("Алматы, городской парк");
  await op
    .getByLabel("Дата проведения события", { exact: true })
    .fill(new Date(Date.now() + 8 * 86400000).toISOString().slice(0, 16));
  await op
    .getByLabel("Приём заявок до", { exact: true })
    .fill(new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 16));
  await op.getByLabel("Количество участников", { exact: true }).fill("2");
  await op
    .getByRole("button", { name: "Опубликовать проект", exact: true })
    .click();
  await expect(op).toHaveURL(/\/my-events\/\d+$/);
  const eventId = Number(new URL(op.url()).pathname.split("/")[2]);
  await op
    .getByRole("link", { name: "Редактировать проект", exact: true })
    .click();
  await expect(op).toHaveURL(/\/edit$/);
  await op.getByLabel("Количество участников", { exact: true }).fill("3");
  await op
    .getByRole("button", { name: "Сохранить изменения", exact: true })
    .click();
  await expect(op.getByRole("heading", { level: 1 })).toHaveText(title);
  await signup(vp, "volunteer", "Тестовый Волонтёр");
  await vp.goto("/events/" + eventId);
  await vp.getByRole("link", { name: "Хочу помочь", exact: true }).click();
  await expect(vp).toHaveURL(`/events/${eventId}/apply`);
  await vp
    .getByLabel("Университет или место работы", { exact: true })
    .fill("КазНУ");
  await vp.getByRole("checkbox").check();
  await vp
    .getByRole("button", { name: "Отправить заявку", exact: true })
    .click();
  await expect(vp).toHaveURL(/\/applications\/\d+$/);
  const applicationUrl = vp.url();
  await expect(vp.locator(".application-detail .status")).toHaveText(
    "На рассмотрении",
  );
  await op.goto("/requests");
  await op
    .locator(".request-row")
    .filter({ hasText: "Тестовый Волонтёр" })
    .click();
  await op.getByRole("button", { name: "Принять заявку", exact: true }).click();
  await expect(op.locator(".request-detail>.status")).toHaveText(
    "Заявка одобрена",
  );
  await op.goto("/roster?event=" + eventId);
  await expect(
    op.getByRole("heading", { name: "Подтверждённых участников пока нет" }),
  ).toBeVisible();
  await op.getByRole("button", { name: /Ждём подтверждения/ }).click();
  await expect(op.locator("table")).toContainText("Тестовый Волонтёр");
  await vp.goto(applicationUrl);
  await vp
    .getByRole("button", { name: "Подтвердить участие", exact: true })
    .click();
  await expect(vp.locator(".application-detail .status")).toHaveText(
    "Участие подтверждено",
  );
  await op.goto("/roster?event=" + eventId);
  await expect(op.locator("table")).toContainText("Тестовый Волонтёр");
  const download = op.waitForEvent("download");
  await op.getByRole("link", { name: "Скачать CSV", exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/komek-roster/);
  await vp.goto("/notifications");
  await expect(vp.locator(".notification-item")).toContainText("одобрена");
  await vp.getByRole("button", { name: "Прочитать все", exact: true }).click();
  await expect(
    vp.getByRole("button", { name: "Прочитать все", exact: true }),
  ).toHaveCount(0);
  await oc.close();
  await vc.close();
});

test("decline notice matches the decision and manual sending is timestamped", async ({
  page,
}) => {
  await demo(page, "organization");
  await page.goto("/requests?status=pending");
  await page.locator(".request-row").first().click();
  await page.getByRole("button", { name: "Отклонить", exact: true }).click();
  await expect(page.locator(".request-detail>.status")).toHaveText(
    "Заявка отклонена",
  );
  await expect(page.locator("blockquote")).toContainText("отклонена");
  await expect(page.locator("blockquote")).not.toContainText("одобрена");
  await page
    .getByRole("button", { name: "Я отправил(а) сообщение", exact: true })
    .click();
  await expect(page.locator(".sent-message")).toContainText(
    "Отправка отмечена",
  );
  await page.reload();
  await expect(page.locator(".sent-message")).toBeVisible();
});

test("volunteer confirms participation and saves a persistent profile", async ({
  page,
}) => {
  await demo(page, "volunteer");
  await page
    .getByRole("link", { name: "Подтвердить участие", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Подтвердить участие", exact: true })
    .click();
  await expect(page.locator(".application-detail .status")).toHaveText(
    "Участие подтверждено",
  );
  await page.goto("/profile");
  await page
    .getByLabel("Имя и фамилия", { exact: true })
    .fill("Айдана Волонтёр");
  await page
    .getByRole("button", { name: "Сохранить изменения", exact: true })
    .click();
  await page.reload();
  await expect(page.getByLabel("Имя и фамилия", { exact: true })).toHaveValue(
    "Айдана Волонтёр",
  );
  await page.goto("/favorites");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Избранное");
});

test("mobile navigation and role indicators remain usable without overflow", async ({
  page,
}) => {
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await expect(page.locator(".landing-actions")).toBeVisible();
    await noOverflow(page);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Открыть меню", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: /Найти проект/ })
    .click();
  await expect(page).toHaveURL("/projects");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await demo(page, "organization");
  await expect(page.locator(".header-account strong")).toHaveText(
    "Организация",
  );
  await page.getByRole("button", { name: "Открыть меню", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  for (const route of [
    "/",
    "/my-events",
    "/requests",
    "/roster",
    "/reports",
    "/profile",
    "/events/new",
  ]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await noOverflow(page);
  }
});

test("public pages and registration meet accessibility and contrast checks", async ({
  page,
}) => {
  for (const route of [
    "/",
    "/projects",
    "/register?role=volunteer",
    "/register?role=organization",
    "/login",
    "/about",
    "/organizations",
  ]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await audit(page);
  }
});

test("authenticated pages meet accessibility checks; legacy dashboard links redirect", async ({
  page,
}) => {
  await demo(page, "organization");
  for (const route of [
    "/",
    "/my-events",
    "/requests",
    "/roster",
    "/reports",
    "/events/new",
    "/profile",
  ]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await audit(page);
  }
  await page.goto("/dashboard");
  await expect(page).toHaveURL("/my-events");
});

test("project lists paginate, preserve the page on reload and reset filters", async ({
  page,
}) => {
  await signup(page, "organization", "Команда пагинации");
  const key = "V2 pagination " + Date.now();
  for (let i = 0; i < 9; i++) {
    const r = await page.request.post("/api/events", {
      data: {
        title: key + " " + i,
        description:
          "Достаточно подробное описание волонтёрского проекта для проверки списка.",
        category: "eco",
        location: "Алматы, парк",
        starts_at: new Date(Date.now() + 10 * 86400000).toISOString(),
        deadline: new Date(Date.now() + 8 * 86400000).toISOString(),
        hours: 3,
        capacity: 10,
        image: "/images/planting.png",
        requirements: "",
      },
    });
    expect(r.status()).toBe(201);
  }
  await page.goto("/my-events");
  await expect(page.locator(".managed-project")).toHaveCount(6);
  await page
    .getByRole("button", { name: "Следующая страница", exact: true })
    .click();
  await expect(page.locator(".managed-project")).toHaveCount(3);
  await page.reload();
  await expect(page.locator(".managed-project")).toHaveCount(3);
  await page.getByRole("button", { name: "Завершённые", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Проекты не найдены" }),
  ).toBeVisible();
  expect(new URL(page.url()).searchParams.has("page")).toBe(false);
  await page.goto("/projects?search=" + encodeURIComponent(key));
  await expect(page.locator(".project-card")).toHaveCount(6);
  await page
    .getByRole("navigation", { name: "Страницы проектов" })
    .getByRole("button", { name: "2", exact: true })
    .click();
  await expect(page.locator(".project-card")).toHaveCount(3);
});
