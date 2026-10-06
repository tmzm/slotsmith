import { defineLocale } from "../locale/defineLocale";
import type { SlotsmithLocale } from "../locale/types";
import { ar } from "./ar";

/**
 * Arabic, Saudi Arabia
 *
 * The Arabic labels with numbers written for Saudi Arabia, in Arabic-Indic digits.
 */
export const arSA: SlotsmithLocale = defineLocale({ ...ar, code: "ar-SA" });
