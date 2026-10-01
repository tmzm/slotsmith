/**
 * shadcn/ui provider
 *
 * shadcn/ui needs no provider, only its design tokens and the Tailwind
 * utilities its components use: this wrapper scopes them (see `shadcn.css`)
 * so they cannot restyle the rest of the page.
 */
import type { ReactNode } from "react";
import href from "./shadcn.css?url";

let loading: Promise<void> | undefined;

/**
 * Load shadcn styles
 *
 * Adds `shadcn.css` to the page once and resolves when it has loaded, so the
 * swap demo shows the shadcn table already styled. The stylesheet is linked
 * here rather than imported, so it is never part of the page's initial CSS.
 * A failed load rejects and removes the link, so a retry fetches it again.
 *
 * @returns A promise that settles when the stylesheet loads or fails.
 */
export function loadShadcnStyles(): Promise<void> {
  loading ??= new Promise<void>((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.onload = () => resolve();
    link.onerror = () => {
      link.remove();
      loading = undefined;
      reject(new Error(`Failed to load ${href}`));
    };
    document.head.append(link);
  });
  return loading;
}

export function ShadcnProvider({ children }: { children: ReactNode; theme: "dark" | "light"; dir: "ltr" | "rtl" }) {
  return <div className="shadcn-scope">{children}</div>;
}
