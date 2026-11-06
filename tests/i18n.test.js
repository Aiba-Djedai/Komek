import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { messages } from "../shared/messages.ts";
import {
  languages,
  requestLanguage,
  translate,
  translateNotification,
} from "../shared/translate.ts";

test("every translated message has Kazakh and English text with matching placeholders", () => {
  for (const [source, translations] of Object.entries(messages)) {
    const placeholders = (text) =>
      [...text.matchAll(/\{\d+\}/g)].map((m) => m[0]).sort();
    assert.equal(translations.length, 2, source);
    for (const translation of translations) {
      assert.ok(translation.trim(), source);
      assert.deepEqual(placeholders(translation), placeholders(source), source);
    }
  }
});

test("all interface translation calls and server validation messages exist in the dictionary", () => {
  for (const file of [
    "src/main.tsx",
    "src/components/Home.tsx",
    "src/components/MyProjects.tsx",
    "src/lib/events.ts",
    "src/lib/i18n.ts",
    "src/components/LanguageSwitcher.tsx",
    "src/components/Catalog.tsx",
    "src/lib/categories.ts",
    "shared/translate.ts",
    "server/app.js",
  ]) {
    const ast = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    function check(node) {
      if (
        ts.isCallExpression(node) &&
        node.expression.getText(ast) === "t" &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        assert.ok(
          messages[node.arguments[0].text.trim()],
          `${file}: ${node.arguments[0].text}`,
        );
      }
      if (
        ts.isCallExpression(node) &&
        node.expression.getText(ast) === "fail" &&
        ts.isStringLiteral(node.arguments[1])
      ) {
        assert.ok(
          messages[node.arguments[1].text.trim()],
          `${file}: ${node.arguments[1].text}`,
        );
      }
      if (ts.isJsxText(node))
        assert.doesNotMatch(
          node.text,
          /[А-Яа-яЁё]/,
          `${file}: untranslated JSX`,
        );
      if (
        ts.isJsxAttribute(node) &&
        node.initializer &&
        ts.isStringLiteral(node.initializer)
      )
        assert.doesNotMatch(
          node.initializer.text,
          /[А-Яа-яЁё]/,
          `${file}: untranslated attribute`,
        );
      ts.forEachChild(node, check);
    }
    check(ast);
  }
});

test("translation preserves user input and whitespace and substitutes each parameter only once", () => {
  assert.equal(translate("en", " Найти проект "), " Find a project ");
  assert.equal(
    translate("kk", "Добро пожаловать, {0}!", ["Әлия {1}"]),
    "Қош келдіңіз, Әлия {1}!",
  );
  assert.equal(translate("en", "Название участника"), "Название участника");
  assert.equal(
    translate("ru", "Добро пожаловать, {0}!", ["Alex"]),
    "Добро пожаловать, Alex!",
  );
});

test("legacy approval and decline notifications translate while preserving titles exactly", () => {
  const title = "Помощь «рядом» {0}";
  const approved = `Ваша заявка на «${title}» одобрена! Подтвердите участие в личном кабинете.`;
  const declined = `Ваша заявка на «${title}» отклонена. Спасибо за желание помочь — другие проекты ждут вас в каталоге.`;
  for (const language of languages) {
    assert.ok(translateNotification(language, approved).includes(title));
    assert.ok(translateNotification(language, declined).includes(title));
  }
  assert.match(translateNotification("en", approved), /was approved!/);
  assert.match(translateNotification("kk", declined), /қабылданбады/);
  assert.equal(
    translateNotification("en", "Сообщение, написанное пользователем"),
    "Сообщение, написанное пользователем",
  );
});

test("language negotiation supports regional tags, quality weights and safe Russian fallback", () => {
  assert.equal(requestLanguage("kk-KZ, ru;q=0.5"), "kk");
  assert.equal(requestLanguage("en-US;q=0.3, kk-KZ;q=0.9"), "kk");
  assert.equal(requestLanguage("kk;q=0,en;q=0.5"), "en");
  assert.equal(requestLanguage("fr, en-GB;q=0.9"), "en");
  assert.equal(requestLanguage("invalid, xx;q=2"), "ru");
  assert.equal(requestLanguage(undefined), "ru");
});
