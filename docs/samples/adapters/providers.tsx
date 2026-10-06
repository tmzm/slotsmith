/**
 * Providers
 *
 * The wrapper each design system needs around its components. The swap demo
 * and the adapter demos apply them, one file per design system so each loads
 * only with its own variant; the samples themselves never do. This map
 * imports all five, so it is for tests; pages load one file at a time.
 */
import type { ComponentType, ReactNode } from "react";
import { AntdProvider } from "./provider-antd";
import { ChakraUiProvider } from "./provider-chakra";
import { MuiProvider } from "./provider-mui";
import { RadixProvider } from "./provider-radix";
import { ShadcnProvider } from "./provider-shadcn";

export interface ProviderProps {
  children: ReactNode;
  theme: "dark" | "light";
  dir: "ltr" | "rtl";
  /** The page's language, for providers that bring their own translated labels. English when left out. */
  lang?: string;
}

/** The design systems that have a provider here. */
export type ProviderName = "shadcn" | "mui" | "chakra" | "antd" | "radix";

export const PROVIDERS: Record<ProviderName, ComponentType<ProviderProps>> = {
  shadcn: ShadcnProvider,
  mui: MuiProvider,
  chakra: ChakraUiProvider,
  antd: AntdProvider,
  radix: RadixProvider,
};
