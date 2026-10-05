import type { ReactNode } from "react";
import { useSlotsmithLocale } from "slotsmith/provider";

// The components follow the CSS direction of the page around them. Inside the
// provider, take it from the active locale: ar, fa and he are right to left.
export function Direction({ children }: { children: ReactNode }) {
  const { code, dir } = useSlotsmithLocale();
  return (
    <div lang={code} dir={dir}>
      {children}
    </div>
  );
}
