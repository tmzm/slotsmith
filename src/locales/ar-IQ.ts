import { defineLocale } from "../locale/defineLocale";
import type { SlotsmithLocale } from "../locale/types";
import { ar } from "./ar";

/**
 * Arabic, Iraq
 *
 * The Arabic labels with numbers written for Iraq, in Arabic-Indic digits.
 */
export const arIQ: SlotsmithLocale = defineLocale({ ...ar, code: "ar-IQ" });
