/**
 * Providers
 *
 * The wrapper each design system needs around its components. The swap demo
 * applies them; the swap samples themselves never do. Loaded lazily by the demo.
 */
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { useMemo, type ComponentType, type ReactNode } from "react";

interface ProviderProps {
  children: ReactNode;
  theme: "dark" | "light";
  dir: "ltr" | "rtl";
}

function Shadcn({ children }: ProviderProps) {
  return <div className="shadcn-scope">{children}</div>;
}

function Mui({ children, theme, dir }: ProviderProps) {
  const muiTheme = useMemo(() => createTheme({ palette: { mode: theme }, direction: dir }), [theme, dir]);
  return <ThemeProvider theme={muiTheme}>{children}</ThemeProvider>;
}

function Chakra({ children, theme }: ProviderProps) {
  return (
    <ChakraProvider value={defaultSystem}>
      <div className={theme === "dark" ? "dark" : undefined}>{children}</div>
    </ChakraProvider>
  );
}

export const PROVIDERS: Record<"shadcn" | "mui" | "chakra", ComponentType<ProviderProps>> = {
  shadcn: Shadcn,
  mui: Mui,
  chakra: Chakra,
};
