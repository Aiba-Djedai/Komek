import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";
import { getLanguage, setLanguage, t, useLanguage } from "../lib/i18n";
import type { Language } from "../../shared/translate.ts";

const choices: { code: Language; label: string }[] = [
  { code: "ru", label: "Русский" },
  { code: "kk", label: "Қазақша" },
  { code: "en", label: "English" },
];
export function LanguageSwitcher() {
  const menuId = useId();
  const language = useLanguage();
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const options = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    if (!open) return;
    options.current[
      choices.findIndex((choice) => choice.code === getLanguage())
    ]?.focus();
    const outside = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return (
    <div
      className="language-switcher"
      ref={wrapper}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        className="language-trigger"
        ref={trigger}
        aria-label={`${t("Выбрать язык")}: ${language.toUpperCase()}`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <Globe size={20} aria-hidden="true" />
        <span>{language.toUpperCase()}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {open && (
        <div
          className="language-options"
          id={menuId}
          role="menu"
          aria-label={t("Язык")}
          onKeyDown={(event) => {
            const index = options.current.findIndex(
              (option) => option === document.activeElement,
            );
            const target =
              event.key === "ArrowDown"
                ? (index + 1) % choices.length
                : event.key === "ArrowUp"
                  ? (index + choices.length - 1) % choices.length
                  : event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? choices.length - 1
                      : null;
            if (target !== null) {
              event.preventDefault();
              options.current[target]?.focus();
            }
          }}
        >
          {choices.map((choice, index) => (
            <button
              type="button"
              key={choice.code}
              ref={(element) => {
                options.current[index] = element;
              }}
              role="menuitemradio"
              aria-checked={language === choice.code}
              lang={choice.code}
              onClick={() => {
                setLanguage(choice.code);
                setOpen(false);
                trigger.current?.focus();
              }}
            >
              <span className="language-code">{choice.code.toUpperCase()}</span>
              {choice.label}
              {language === choice.code && (
                <Check size={16} aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
