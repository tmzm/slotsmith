/**
 * The swap demo's UI text for one language, passed to the island as a prop so
 * the island does not bundle the message catalogs.
 */
import { t, type Lang } from "@/i18n";

export interface SwapMessages {
  label: string;
  fallback: string;
  /** Holds `{name}`. */
  loading: string;
  failed: string;
  retry: string;
  /** Shown when the retry failed too. */
  reload: string;
  reloadButton: string;
  changedLine: string;
  /** Holds `{name}`. */
  code: string;
}

export function swapMessages(lang: Lang): SwapMessages {
  return {
    label: t(lang, "swap.label"),
    fallback: t(lang, "swap.fallback"),
    loading: t(lang, "swap.loading"),
    failed: t(lang, "swap.failed"),
    retry: t(lang, "swap.retry"),
    reload: t(lang, "swap.reload"),
    reloadButton: t(lang, "swap.reloadButton"),
    changedLine: t(lang, "swap.changedLine"),
    code: t(lang, "swap.code"),
  };
}
