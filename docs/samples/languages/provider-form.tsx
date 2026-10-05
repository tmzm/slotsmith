import type { ReactNode } from "react";
import { SlotsmithProvider, useSlotsmithLocale } from "slotsmith/provider";
import { ar } from "slotsmith/locales/ar";
import { fr } from "slotsmith/locales/fr";

// The provider renders no element, so the direction goes on your own markup.
function Page({ children }: { children: ReactNode }) {
  const { code, dir } = useSlotsmithLocale();
  return (
    <main lang={code} dir={dir}>
      {children}
    </main>
  );
}

// A tag resolves against the packs in `locales`. "ar-EG" has no pack of its
// own here, so it uses ar and writes numbers and dates the Egyptian way.
// English is the default and needs no pack.
export function App({ language, children }: { language: "en-US" | "ar-EG" | "fr"; children: ReactNode }) {
  return (
    <SlotsmithProvider locale={language} locales={[ar, fr]}>
      <Page>{children}</Page>
    </SlotsmithProvider>
  );
}
