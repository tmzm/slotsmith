/**
 * Providers
 *
 * The wrapper each design system needs around its components. The swap demo
 * applies them, one file per design system so each loads only with its own
 * variant; the swap samples themselves never do.
 */
import type { ComponentType, ReactNode } from "react";
import { ChakraUiProvider } from "./provider-chakra";
import { MuiProvider } from "./provider-mui";
import { ShadcnProvider } from "./provider-shadcn";

export interface ProviderProps {
  children: ReactNode;
  theme: "dark" | "light";
  dir: "ltr" | "rtl";
}

export const PROVIDERS: Record<"shadcn" | "mui" | "chakra", ComponentType<ProviderProps>> = {
  shadcn: ShadcnProvider,
  mui: MuiProvider,
  chakra: ChakraUiProvider,
};
