import { test, expect, type Page, type Locator } from "@playwright/test";

type Language = "ru" | "kk" | "en";
async function choose(
  page: Page,
  language: Language,
  scope: Locator = page.locator("header"),
) {
  await scope.locator(".language-trigger").click();
  await scope.locator(`.language-options button[lang="${language}"]`).click();
  await expect(page.locator("html")).toHaveAttribute("lang", language);
  await expect(page.locator("header .language-trigger")).toHaveText(
    language.toUpperCase(),
  );
}
async function login(page: Page, role: "volunteer" | "organization") {
  const response = await page.request.post("/api/auth/login", {
    data: {
      email: role === "organization" ? "org@komek.kz" : "volunteer@komek.kz",
      password: "Komek2026!",
    },
  });
  expect(response.ok()).toBe(true);
}

for (const language of ["kk", "en"] as const) {
  test(`${language}: guest navigation, catalogue, legal text, forms and server errors are translated`, async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("header .language-trigger")).toHaveText("RU");
    await choose(page, language);
    await expect(page).toHaveTitle(
      language === "en"
        ? "Kömek — good deeds start with you"
        : "Kömek — игі істер сенен басталады",
    );
    const nav = page.getByRole("navigation", {
      name: language === "en" ? "Main navigation" : "Негізгі навигация",
    });
    await expect(nav.getByRole("button").first()).toHaveText(
      language === "en" ? "Find a project" : "Жоба табу",
    );
    await expect(page.locator(".category-tabs button").first()).toHaveText(
      language === "en" ? "All categories" : "Барлық бағыттар",
    );
    await expect(
      page.getByPlaceholder(
        language === "en"
          ? "Title, location or organization"
          : "Атауы, орны немесе ұйым",
      ),
    ).toBeVisible();
    const userTitle = await page.locator(".event-card h3").first().innerText();
    await page
      .locator(".event-card")
      .first()
      .getByRole("button", {
        name: language === "en" ? "Details" : "Толығырақ",
        exact: true,
      })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(userTitle);
    await expect(
      page.getByRole("heading", {
        name: language === "en" ? "About the project" : "Жоба туралы",
        exact: true,
      }),
    ).toBeVisible();
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", language);
    await page
      .locator("footer")
      .getByRole("button", {
        name: language === "en" ? "Privacy" : "Құпиялылық",
        exact: true,
      })
      .click();
    await expect(page.getByRole("dialog")).toContainText(
      language === "en"
        ? "Registration stores your name"
        : "Тіркелген кезде аты-жөні",
    );
    await page
      .getByRole("dialog")
      .getByRole("button", {
        name: language === "en" ? "Close" : "Жабу",
        exact: true,
      })
      .click();
    await page.locator("header .login-btn").click();
    const dialog = page.getByRole("dialog");
    await dialog
      .getByRole("button", {
        name: language === "en" ? "Log in to account" : "Аккаунтқа кіру",
        exact: true,
      })
      .click();
    await expect(dialog.getByRole("alert")).toHaveText(
      language === "en"
        ? "Fill in this required field."
        : "Міндетті өрісті толтырыңыз.",
    );
    await dialog
      .locator('input[name="email"]')
      .fill("missing-language-user@example.com");
    await dialog.locator('input[name="password"]').fill("WrongPassword123!");
    const request = page.waitForRequest(
      (r) => r.url().endsWith("/api/auth/login") && r.method() === "POST",
    );
    await dialog
      .getByRole("button", {
        name: language === "en" ? "Log in to account" : "Аккаунтқа кіру",
        exact: true,
      })
      .click();
    expect((await request).headers()["accept-language"]).toBe(language);
    await expect(dialog.getByRole("alert")).toHaveText(
      language === "en"
        ? "Incorrect email or password."
        : "Email немесе құпиясөз қате.",
    );
    await choose(page, "ru", dialog);
    await expect(dialog.getByRole("alert")).toHaveText(
      "Неверный email или пароль.",
    );
    await expect(dialog.locator('input[name="email"]')).toHaveValue(
      "missing-language-user@example.com",
    );
    await expect(dialog.locator('input[name="password"]')).toHaveValue(
      "WrongPassword123!",
    );
    await dialog.locator(".language-trigger").click();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("menu")).toHaveCount(0);
  });
}

test("language selection supports keyboard, dismissal, persistence and synchronization between tabs", async ({
  page,
  context,
}) => {
  await page.goto("/");
  const trigger = page.locator("header .language-trigger");
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitemradio").first()).toBeFocused();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveText("EN");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(trigger).toBeFocused();
  const second = await context.newPage();
  await second.goto("/about");
  await expect(second.locator("header .language-trigger")).toHaveText("EN");
  await choose(second, "kk");
  await expect(trigger).toHaveText("KK");
  await page.reload();
  await expect(trigger).toHaveText("KK");
  await choose(page, "ru");
  await expect(second.locator("header .language-trigger")).toHaveText("RU");
  await second.close();
});

test("volunteer pages, dates, notifications and application forms follow the selected language", async ({
  page,
}) => {
  await login(page, "volunteer");
  await page.goto("/");
  await choose(page, "en");
  await expect(page.locator(".home-role-badge")).toHaveText(
    "Volunteer account",
  );
  const title = await page.locator(".event-card h3").first().innerText();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "My projects", exact: true })
    .click();
  await expect(page.locator(".my-projects h1")).toHaveText("My projects.");
  await expect(page.locator(".participation-facts li").first()).toContainText(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/,
  );
  await page
    .getByRole("button", { name: "Notifications", exact: true })
    .click();
  await expect(page.locator(".notice-pop")).toContainText("was approved!");
  await choose(page, "kk");
  await expect(page.locator(".notice-pop")).toContainText("мақұлданды!");
  await expect(page.locator(".my-projects h1")).toHaveText("Менің жобаларым.");
  await page.goto("/dashboard");
  await expect(page.locator(".dashboard-tabs .selected")).toHaveText(
    "Менің өтінімдерім",
  );
  await page
    .getByRole("button", { name: "Менің профилім", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByLabel("Электрондық пошта", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Өзгерістерді сақтау", exact: true })
    .click();
  await expect(page.locator(".toast")).toContainText("Профиль сақталды.");
  await choose(page, "en");
  await expect(page.locator(".toast")).toContainText("Profile saved.");
  await choose(page, "kk");
  await page.goto("/projects");
  await expect(page.locator(".event-card h3").first()).toHaveText(title);
  await page
    .locator(".event-card")
    .first()
    .getByRole("button", { name: "Толығырақ", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Көмектескім келеді", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByLabel("Университет / жұмыс орны", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText(
    "Байланыс деректеріңді тек осы іс-шараның ұйымдастырушысы көреді.",
  );
});

test("organization workspace, creation form, decisions, message templates and CSV follow language", async ({
  page,
}) => {
  await login(page, "organization");
  await page.goto("/");
  await choose(page, "en");
  await expect(page.locator(".home-role-badge")).toHaveText(
    "Organization account",
  );
  await page
    .locator(".role-home-actions")
    .getByRole("button", { name: "Create a project", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByLabel("Application deadline", { exact: true }),
  ).toBeVisible();
  await dialog
    .getByLabel("Project title", { exact: true })
    .fill("Жобаның авторлық атауы");
  await choose(page, "kk", dialog);
  await expect(dialog.getByLabel("Жоба атауы", { exact: true })).toHaveValue(
    "Жобаның авторлық атауы",
  );
  await expect(
    dialog.getByLabel("Өтінім беру мерзімі", { exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Жабу", exact: true }).click();
  await page.goto("/dashboard");
  await page
    .getByRole("button", { name: /^Қатысушылардың өтінімдері/ })
    .click();
  await expect(page.locator(".applicant").first()).toBeVisible();
  await choose(page, "en");
  const decided = page
    .locator(".applicant")
    .filter({ has: page.locator(".notice-log") })
    .first();
  await decided
    .getByRole("button", { name: "Telegram / email message", exact: true })
    .click();
  await expect(decided.locator(".message-template")).toContainText("Hello,");
  await expect(decided.locator(".message-template")).not.toContainText(
    "Здравствуйте",
  );
  await page
    .getByRole("button", { name: "Confirmed roster", exact: true })
    .click();
  await page.getByLabel("Event", { exact: true }).selectOption({ index: 1 });
  await expect(
    page.getByRole("link", { name: "Download CSV", exact: true }),
  ).toHaveAttribute("href", /lang=en/);
  await choose(page, "kk");
  await expect(
    page.getByRole("link", { name: "CSV жүктеу", exact: true }),
  ).toHaveAttribute("href", /lang=kk/);
});

test("all languages fit guest and authenticated headers on mobile and desktop", async ({
  page,
}) => {
  for (const role of ["guest", "volunteer", "organization"] as const) {
    if (role !== "guest") await login(page, role);
    await page.goto("/");
    for (const language of ["ru", "kk", "en"] as const) {
      await choose(page, language);
      for (const width of [320, 390, 768, 960, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(() => document.fonts.ready);
        await expect(page.locator("header .language-trigger")).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${role}/${language}/${width}`,
        ).toBe(true);
      }
      if (role !== "guest") {
        await page.goto("/dashboard");
        await expect(page.locator(".dashboard-tabs")).toBeVisible();
        await page.setViewportSize({ width: 320, height: 900 });
        await page.evaluate(() => document.fonts.ready);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${role}/${language}/dashboard/320`,
        ).toBe(true);
        await page.goto("/");
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "/tmp/komek-language-mobile-en.png",
    fullPage: true,
    animations: "disabled",
  });
});
