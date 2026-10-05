"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { SlotsmithProvider } from "slotsmith/provider";
import { ar } from "slotsmith/locales/ar";

export type Language = "en" | "ar";

const LanguageContext = createContext<{ language: Language; toggle: () => void }>({ language: "en", toggle: () => {} });

/** The client boundary: it holds the language and gives every slotsmith component below it the matching pack. */
export function Providers({ initialLanguage, children }: { initialLanguage: Language; children: ReactNode }) {
  const [language, setLanguage] = useState(initialLanguage);
  const toggle = () => {
    const next = language === "en" ? "ar" : "en";
    setLanguage(next);
    document.cookie = `lang=${next}; path=/; max-age=31536000`;
    document.documentElement.lang = next;
    document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
  };
  return (
    <LanguageContext value={{ language, toggle }}>
      {/* English is the default, so it needs no pack. */}
      <SlotsmithProvider locale={language === "ar" ? "ar" : undefined} locales={[ar]}>
        {children}
      </SlotsmithProvider>
    </LanguageContext>
  );
}

/** A button that switches between English and Arabic. */
export function LanguageToggle() {
  const { language, toggle } = useContext(LanguageContext);
  return (
    <button type="button" onClick={toggle}>
      {language === "en" ? "العربية" : "English"}
    </button>
  );
}
