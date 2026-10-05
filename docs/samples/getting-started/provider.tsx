import type { ReactNode } from "react";
import { SlotsmithProvider } from "slotsmith/provider";
import { ar } from "slotsmith/locales/ar";
import { fr } from "slotsmith/locales/fr";

// Every slotsmith component inside reads its labels and number formats from
// the provider. English is the default, so it needs no pack.
export function Providers({ language, children }: { language: "en" | "ar" | "fr"; children: ReactNode }) {
  return (
    <SlotsmithProvider locale={language} locales={[ar, fr]}>
      {children}
    </SlotsmithProvider>
  );
}
