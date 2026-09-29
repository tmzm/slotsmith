import { DEFAULT_OPTIONS, writeKnowledge } from "../generate.ts";

/**
 * Global setup
 *
 * Generates the knowledge from the current library source before any suite
 * runs, so the tests always describe the code in this checkout rather than
 * whatever the last build left behind. The adapters are the exception: they
 * are committed files, so they stay as they are and the drift test checks
 * them against their skins. `pnpm build` (or `pnpm generate`) rewrites them.
 */
export default function setup(): void {
  writeKnowledge(DEFAULT_OPTIONS, { adapters: false });
}
