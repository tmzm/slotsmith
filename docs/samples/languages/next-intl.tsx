"use client";
// Display only: the docs do not install next-intl. Written against next-intl's public API.
import { useMemo, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { defineLocale } from "slotsmith/locale";
import { SlotsmithProvider } from "slotsmith/provider";

// The labels live in your messages, under "slotsmith.datePicker".
export function SlotsmithIntl({ children }: { children: ReactNode }) {
  const code = useLocale();
  const t = useTranslations("slotsmith.datePicker");

  // Write counts as ICU plurals in the messages, and next-intl picks the form:
  // "count": "{count, plural, one {# date selected} other {# dates selected}}"
  const locale = useMemo(
    () =>
      defineLocale({
        code,
        datePicker: {
          placeholder: t("placeholder"),
          clear: t("clear"),
          previous: t("previous"),
          next: t("next"),
          today: t("today"),
          month: t("month"),
          year: t("year"),
          dialog: t("dialog"),
          count: (count) => t("count", { count }),
          rangeStart: (from) => t("rangeStart", { from }),
          range: (from, to) => t("range", { from, to }),
        },
      }),
    [code, t],
  );

  return <SlotsmithProvider locale={locale}>{children}</SlotsmithProvider>;
}
