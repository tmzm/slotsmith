/**
 * Chakra UI provider
 *
 * Chakra's default system, scoped to one element: its reset, its CSS variables
 * and its global styles (normally on `html` and `*`) apply only inside
 * `.chakra-scope`, so Chakra can sit on a page it does not own. An app that
 * is all Chakra passes `defaultSystem` instead. Chakra reads its colour
 * mode from a `light` or `dark` class; scoped, the class must sit inside
 * the scope, so the surface carries it.
 *
 * A Chakra popover (the calendar, the autocomplete's list) portals its
 * positioner to `<body>`, outside the scope, so that positioner is a scope
 * root too, and takes dark mode from the page's own `data-theme`.
 */
import { ChakraProvider, createSystem, defaultConfig } from "@chakra-ui/react";
import type { ReactNode } from "react";

const global = defaultConfig.globalCss ?? {};

/** What a Chakra popover portals to `<body>`: its positioner. */
const PORTALED = "[data-scope][data-part=positioner]";
/** Every scope root: the demo's own, and each portaled positioner. */
const SCOPE = `:is(.chakra-scope, ${PORTALED})`;

const system = createSystem({
  ...defaultConfig,
  cssVarsRoot: SCOPE,
  preflight: { scope: SCOPE },
  conditions: {
    ...defaultConfig.conditions,
    dark: `.dark &, .dark .chakra-theme:not(.light) &, [data-theme="dark"] ${PORTALED} &`,
  },
  globalCss: {
    [`${SCOPE}, ${SCOPE} *`]: global["*"] ?? {},
    [`.chakra-surface, ${PORTALED}`]: global.html ?? {},
    [`${SCOPE} ::placeholder, ${SCOPE} [data-placeholder]`]: global["*::placeholder, *[data-placeholder]"] ?? {},
    [`${SCOPE} ::selection`]: global["*::selection"] ?? {},
  },
});

export function ChakraUiProvider({ children, theme }: { children: ReactNode; theme: "dark" | "light"; dir: "ltr" | "rtl" }) {
  return (
    <ChakraProvider value={system}>
      <div className="chakra-scope">
        <div className={`chakra-surface ${theme}`}>{children}</div>
      </div>
    </ChakraProvider>
  );
}
