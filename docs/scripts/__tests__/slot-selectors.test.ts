import { describe, expect, it } from "vitest";
import { buildReference } from "../reference.ts";
import { SLOT_SELECTORS } from "../slot-selectors.ts";

describe("SLOT_SELECTORS", () => {
  const references = buildReference();

  it("covers exactly the library's slots, so a new slot fails here", () => {
    for (const reference of references) {
      const slots = reference.slots.map((slot) => slot.name).sort();
      const selectors = Object.keys(SLOT_SELECTORS[reference.name as keyof typeof SLOT_SELECTORS]).sort();
      expect(selectors, reference.name).toEqual(slots);
    }
  });

  it("uses the component's class prefix", () => {
    const prefixes = { "data-table": "sdt", autocomplete: "sac", "date-picker": "sdp", "file-uploader": "sfu" } as const;
    for (const [slug, prefix] of Object.entries(prefixes)) {
      for (const selector of Object.values(SLOT_SELECTORS[slug as keyof typeof prefixes])) {
        expect(selector).toMatch(new RegExp(`^\\.${prefix}`));
      }
    }
  });
});
