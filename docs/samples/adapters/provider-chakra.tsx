/**
 * Chakra UI provider
 *
 * Chakra's default system, scoped to one element: its reset, its CSS variables
 * and its global styles (normally on `html` and `*`) apply only inside
 * `.chakra-scope`, so Chakra can sit on a page it does not own. An app that
 * is all Chakra passes `defaultSystem` instead. Chakra reads its colour
 * mode from a `light` or `dark` class; scoped, the class must sit inside
 * the scope, so the surface carries it.
 */
import { ChakraProvider, createSystem, defaultConfig } from "@chakra-ui/react";
import type { ReactNode } from "react";

const global = defaultConfig.globalCss ?? {};

const system = createSystem({
  ...defaultConfig,
  cssVarsRoot: ".chakra-scope",
  preflight: { scope: ".chakra-scope" },
  globalCss: {
    ".chakra-scope, .chakra-scope *": global["*"] ?? {},
    ".chakra-surface": global.html ?? {},
    ".chakra-scope ::placeholder, .chakra-scope [data-placeholder]": global["*::placeholder, *[data-placeholder]"] ?? {},
    ".chakra-scope ::selection": global["*::selection"] ?? {},
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
