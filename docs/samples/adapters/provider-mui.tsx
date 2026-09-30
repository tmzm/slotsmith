/**
 * MUI provider
 *
 * An MUI theme in the page's colour mode and direction.
 */
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { useMemo, type ReactNode } from "react";

export function MuiProvider({ children, theme, dir }: { children: ReactNode; theme: "dark" | "light"; dir: "ltr" | "rtl" }) {
  const muiTheme = useMemo(() => createTheme({ palette: { mode: theme }, direction: dir }), [theme, dir]);
  return <ThemeProvider theme={muiTheme}>{children}</ThemeProvider>;
}
