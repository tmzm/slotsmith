import { DEFAULT_OPTIONS, writeKnowledge } from "../generate.ts";

/**
 * Global setup
 *
 * Generates the knowledge from the current library source before any suite
 * runs, so the tests always describe the code in this checkout rather than
 * whatever the last build left behind.
 */
export default function setup(): void {
  writeKnowledge(DEFAULT_OPTIONS);
}
