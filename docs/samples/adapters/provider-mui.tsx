/**
 * MUI provider
 *
 * An MUI theme in the page's colour mode and direction. On a right-to-left
 * page the styles also go through an Emotion cache that mirrors them (MUI
 * writes physical properties such as `text-align: left` and `margin-left`);
 * `direction: "rtl"` in the theme only turns the components' own logic
 * around, such as which way an arrow points. A left-to-right page keeps
 * Emotion's default cache.
 */
import createCache, { type EmotionCache } from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { useMemo, type ReactNode } from "react";
import { prefixer } from "stylis";
import rtlPlugin from "stylis-plugin-rtl";

let rtlCache: EmotionCache | undefined;

/** One mirrored cache for the page, made on first use. Its class names start with `muirtl`, apart from the default cache's `css`. */
const mirrored = () => (rtlCache ??= createCache({ key: "muirtl", stylisPlugins: [prefixer, rtlPlugin] }));

export function MuiProvider({ children, theme, dir }: { children: ReactNode; theme: "dark" | "light"; dir: "ltr" | "rtl" }) {
  const muiTheme = useMemo(() => createTheme({ palette: { mode: theme }, direction: dir }), [theme, dir]);
  const themed = <ThemeProvider theme={muiTheme}>{children}</ThemeProvider>;
  return dir === "rtl" ? <CacheProvider value={mirrored()}>{themed}</CacheProvider> : themed;
}
