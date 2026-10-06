import { defineLocale } from "../locale/defineLocale";
import type { SlotsmithLocale } from "../locale/types";
import { ar } from "./ar";

/**
 * Arabic, Egypt
 *
 * The Arabic labels with numbers written for Egypt, in Arabic-Indic digits.
 */
export const arEG: SlotsmithLocale = defineLocale({ ...ar, code: "ar-EG" });
