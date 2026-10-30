import { test, expect, type Page } from "@playwright/test";

async function finishRegistration(
  page: Page,
  role: "volunteer" | "organization",
) {
  await page
    .getByLabel(
      role === "organization" ? "Название организации" : "Имя и фамилия",
      { exact: true },
    )
    .fill(role === "organization" ? "Новая команда" : "Новый Волонтёр");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`home-${role}-${Date.now()}@example.com`);
  await page.getByLabel("Пароль", { exact: true }).fill("HomeJourney123!");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Создать аккаунт", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    (await (await page.request.get("/api/auth/me")).json()).user.role,
  ).toBe(role);
}
async function demoLogin(page: Page, role: "volunteer" | "organization") {
  await page.goto("/");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await page
    .locator(".demo-box")
    .getByRole("button", {
      name: role === "organization" ? "Организация" : "Волонтёр",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

test("guest role choices open registration immediately and reset a previous role choice", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: /^Я представляю организацию/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Давай делать добро вместе" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Название организации", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".role-switch .selected")).toHaveText(
    "Организация",
  );
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page.getByRole("button", { name: /^Найти своё дело/ }).click();
  await expect(page.locator(".role-switch .selected")).toHaveText("Я волонтёр");
  await expect(page.getByLabel("Имя и фамилия", { exact: true })).toBeVisible();
  await finishRegistration(page, "volunteer");
  await expect(
    page.getByRole("heading", { name: "Привет, Новый! Твоё добро ждут." }),
  ).toBeVisible();
  await expect(page.locator(".home-role-badge")).toHaveText(
    "Аккаунт волонтёра",
  );
  await expect(
    page.getByRole("button", { name: /^Я представляю организацию/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Создать проект", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".volunteer-welcome")).toBeVisible();
});

test("organization registration leads to its own empty workspace, not another organization data", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: /^Я представляю организацию/ })
    .click();
  await finishRegistration(page, "organization");
  await expect(page.locator(".home-role-badge")).toHaveText(
    "Аккаунт организации",
  );
  await expect(
    page.getByText("Ваша команда · Новая команда", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Здесь появится ваш первый проект" }),
  ).toBeVisible();
  await expect(page.locator(".home-project-row")).toHaveCount(0);
  await expect(page.locator(".home-application-row")).toHaveCount(0);
  await expect(page.locator("#projects")).toHaveCount(0);
  await page
    .locator(".role-home-actions")
    .getByRole("button", { name: "Создать проект", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Новое доброе дело" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page.reload();
  await expect(page.locator(".organization-home")).toBeVisible();
});

test("volunteer home shows applications and confirms real participation, with mobile role visible", async ({
  page,
}) => {
  await demoLogin(page, "volunteer");
  await expect(page.locator(".volunteer-next-step .status")).toHaveText(
    "Нужно подтвердить участие",
  );
  await expect(
    page.locator(".volunteer-next-step").getByRole("heading"),
  ).toHaveText("Маленькая помощь. Большая забота.");
  await page
    .getByRole("button", { name: "Подтвердить участие", exact: true })
    .click();
  await expect(page.locator(".volunteer-next-step .status")).toHaveText(
    "Ты в команде!",
  );
  const data = await (await page.request.get("/api/dashboard")).json();
  expect(
    data.applications.find(
      (a: { title: string }) => a.title === "Маленькая помощь. Большая забота.",
    ).status,
  ).toBe("confirmed");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".account-copy strong")).toHaveText("Волонтёр");
  await expect(page.locator(".account-copy strong")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .locator(".role-home-actions")
    .getByRole("button", { name: "Мои заявки", exact: true })
    .click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page
    .getByRole("button", { name: "Kömek — главная", exact: true })
    .click();
  await expect(page.locator(".volunteer-welcome")).toBeVisible();
  await page.screenshot({
    path: "/tmp/komek-volunteer-home-mobile.png",
    fullPage: true,
  });
});

test("organizer home manages own projects, filters applications and keeps role in the catalog", async ({
  page,
}) => {
  await demoLogin(page, "organization");
  await expect(page.locator(".home-project-row")).toHaveCount(3);
  await expect(page.locator(".home-application-row")).toHaveCount(3);
  await expect(page.locator(".organization-welcome")).toContainText(
    "Green Almaty",
  );
  await page
    .locator(".home-project-actions")
    .first()
    .getByRole("button", { name: "Посмотреть заявки", exact: true })
    .click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("combobox", { name: "Событие", exact: true }),
  ).not.toHaveValue("all");
  await expect(page.locator(".applicant")).not.toHaveCount(0);
  await page
    .getByRole("button", { name: "Kömek — главная", exact: true })
    .click();
  await page
    .locator(".role-home-actions")
    .getByRole("button", { name: "Заявки участников", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Событие", exact: true }),
  ).toHaveValue("all");
  await page
    .getByRole("button", { name: "Kömek — главная", exact: true })
    .click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Каталог проектов", exact: true })
    .click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.locator(".home-role-badge")).toHaveText(
    "Аккаунт организации",
  );
  await expect(page.locator(".event-card").first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Найти своё дело/ }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Kömek — главная", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".account-copy strong")).toHaveText("Организация");
  await expect(page.locator(".account-copy strong")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/komek-organization-home-mobile.png",
    fullPage: true,
  });
});
