import { useSyncExternalStore } from "react";
import { today, type ISODate } from "slotsmith/date-picker";

/** The date a prerendered page is built with, so its HTML is the same on every build. */
export const PRERENDER_TODAY: ISODate = "2026-03-16";

// Today does not change while the page is open, so there is nothing to subscribe to.
const subscribe = () => () => {};

/**
 * Today as `YYYY-MM-DD`, safe to prerender: the fixed date on the server and
 * while hydrating, so the markup matches, then the visitor's real date.
 * An app that renders only in the browser can call `today()` directly.
 */
export function useToday(): ISODate {
  return useSyncExternalStore(subscribe, today, () => PRERENDER_TODAY);
}
