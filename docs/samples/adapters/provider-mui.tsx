/**
 * MUI provider
 *
 * An MUI theme in the page's colour mode, direction and language. On a
 * right-to-left page the styles also go through an Emotion cache that
 * mirrors them (MUI writes physical properties such as `text-align: left`
 * and `margin-left`); `direction: "rtl"` in the theme only turns the
 * components' own logic around, such as which way an arrow points. A
 * left-to-right page keeps Emotion's default cache. On an Arabic page the
 * theme also carries MUI's `arEG` locale, so MUI's own labels (rows per
 * page, "1–5 of 12", the page buttons' names) are Arabic too.
 */
import createCache, { type EmotionCache } from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import { arEG } from "@mui/material/locale";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { useMemo, type ReactNode } from "react";
import { prefixer } from "stylis";
import rtlPlugin from "stylis-plugin-rtl";

let rtlCache: EmotionCache | undefined;

/** One mirrored cache for the page, made on first use. Its class names start with `muirtl`, apart from the default cache's `css`. */
const mirrored = () => (rtlCache ??= createCache({ key: "muirtl", stylisPlugins: [prefixer, rtlPlugin] }));

export function MuiProvider({
  children,
  theme,
  dir,
  lang = "en",
}: {
  children: ReactNode;
  theme: "dark" | "light";
  dir: "ltr" | "rtl";
  lang?: string;
}) {
  const arabic = lang === "ar" || lang.startsWith("ar-");
  const muiTheme = useMemo(
    () => createTheme({ palette: { mode: theme }, direction: dir }, ...(arabic ? [arEG] : [])),
    [theme, dir, arabic],
  );
  const themed = <ThemeProvider theme={muiTheme}>{children}</ThemeProvider>;
  return dir === "rtl" ? <CacheProvider value={mirrored()}>{themed}</CacheProvider> : themed;
}
