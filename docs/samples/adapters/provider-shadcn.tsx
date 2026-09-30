/**
 * shadcn/ui provider
 *
 * shadcn/ui needs no provider, only its design tokens: this wrapper scopes
 * them (see `shadcn.css`) so they cannot restyle the rest of the page.
 */
import type { ReactNode } from "react";

export function ShadcnProvider({ children }: { children: ReactNode; theme: "dark" | "light"; dir: "ltr" | "rtl" }) {
  return <div className="shadcn-scope">{children}</div>;
}
