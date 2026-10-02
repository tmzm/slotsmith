/**
 * Radix Themes provider
 *
 * Radix Themes' `Theme` in the page's colour mode, with the page's direction
 * for the Radix primitives inside it (a root `Theme` sets left to right).
 * Radix Themes needs its stylesheet; every rule in it is under Radix's own
 * classes (`.radix-themes`, `.rt-*`) apart from its colour, space and font
 * variables, whose names the site does not use. The stylesheet is linked
 * on demand, so only a page that shows the Radix variant loads it. A root
 * `Theme` is at least as tall as the viewport (it expects to wrap the whole
 * app); inside a demo it takes the table's height instead.
 */
import { Theme } from "@radix-ui/themes";
import { Direction } from "radix-ui";
import type { ReactNode } from "react";
import href from "@radix-ui/themes/styles.css?url";

let loading: Promise<void> | undefined;

/**
 * Load Radix Themes styles
 *
 * Adds Radix Themes' stylesheet to the page once and resolves when it has
 * loaded, so the demo shows the Radix table already styled. A failed load
 * rejects and removes the link, so a retry fetches it again.
 *
 * @returns A promise that settles when the stylesheet loads or fails.
 */
export function loadRadixStyles(): Promise<void> {
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

export function RadixProvider({ children, theme, dir }: { children: ReactNode; theme: "dark" | "light"; dir: "ltr" | "rtl" }) {
  return (
    <Theme appearance={theme} style={{ minHeight: 0 }}>
      <Direction.Provider dir={dir}>{children}</Direction.Provider>
    </Theme>
  );
}
