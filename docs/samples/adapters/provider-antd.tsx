/**
 * Ant Design provider
 *
 * Ant's `ConfigProvider` in the page's colour mode and direction: the dark
 * or default algorithm for the theme, and `direction` so Ant's components
 * and the adapter's arrows follow the page.
 */
import { ConfigProvider, theme as antdTheme } from "antd";
import { useMemo, type ReactNode } from "react";

export function AntdProvider({ children, theme, dir }: { children: ReactNode; theme: "dark" | "light"; dir: "ltr" | "rtl" }) {
  const config = useMemo(() => ({ algorithm: theme === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm }), [theme]);
  return (
    <ConfigProvider theme={config} direction={dir}>
      {children}
    </ConfigProvider>
  );
}
