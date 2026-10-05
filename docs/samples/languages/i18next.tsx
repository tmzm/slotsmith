"use client";
// Display only: the docs do not install i18next. Written against react-i18next's public API.
import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { defineLocale } from "slotsmith/locale";
import { SlotsmithProvider } from "slotsmith/provider";

// The labels live in your i18next resources, under a "slotsmith" namespace.
export function SlotsmithI18next({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation("slotsmith");
  const code = i18n.resolvedLanguage ?? i18n.language;

  // Rebuilt when the language changes. i18next picks plural forms itself, so a
  // label that takes a count passes { count } to t().
  const locale = useMemo(
    () =>
      defineLocale({
        code,
        datePicker: {
          placeholder: t("datePicker.placeholder"),
          clear: t("datePicker.clear"),
          previous: t("datePicker.previous"),
          next: t("datePicker.next"),
          today: t("datePicker.today"),
          month: t("datePicker.month"),
          year: t("datePicker.year"),
          dialog: t("datePicker.dialog"),
          count: (count) => t("datePicker.count", { count }),
          rangeStart: (from) => t("datePicker.rangeStart", { from }),
          range: (from, to) => t("datePicker.range", { from, to }),
        },
      }),
    [code, t],
  );

  return <SlotsmithProvider locale={locale}>{children}</SlotsmithProvider>;
}
