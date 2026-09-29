import { describe, expect, it } from "vitest";
import { buildReference } from "../reference.ts";

describe("buildReference", () => {
  const references = buildReference();
  const bySlug = (slug: string) => references.find((r) => r.name === slug)!;

  it("has the four components with their slot counts", () => {
    expect(references.map((r) => r.name).sort()).toEqual(["autocomplete", "data-table", "date-picker", "file-uploader"]);
    expect(bySlug("data-table").slots).toHaveLength(22);
    expect(bySlug("autocomplete").slots).toHaveLength(17);
    expect(bySlug("date-picker").slots).toHaveLength(13);
    expect(bySlug("file-uploader").slots).toHaveLength(13);
  });

  it("gives every slot a kind and sorted data attributes", () => {
    for (const reference of references) {
      for (const slot of reference.slots) {
        expect(["element", "widget"]).toContain(slot.kind);
        expect(slot.dataAttributes).toEqual([...slot.dataAttributes].sort());
      }
    }
  });

  it("carries label defaults", () => {
    expect(bySlug("data-table").labels.find((l) => l.name === "retry")?.default).toBe('"Retry"');
  });

  it("lists sorted unique tokens, including the shared --ss layer", () => {
    for (const reference of references) {
      expect(reference.tokens.length, reference.name).toBeGreaterThan(0);
      expect(reference.tokens).toEqual([...new Set(reference.tokens)].sort());
    }
    expect(bySlug("data-table").tokens).toEqual(expect.arrayContaining(["--sdt-radius", "--ss-text"]));
  });
});
