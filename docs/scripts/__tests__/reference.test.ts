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

describe("token filtering", () => {
  it("keeps only the component's own prefix and --ss-, and no internal size tokens", () => {
    const prefixes = { "data-table": "sdt", autocomplete: "sac", "date-picker": "sdp", "file-uploader": "sfu" } as const;
    for (const reference of buildReference()) {
      const prefix = prefixes[reference.name as keyof typeof prefixes];
      for (const token of reference.tokens) {
        expect(token.startsWith(`--${prefix}-`) || token.startsWith("--ss-"), `${reference.name} ${token}`).toBe(true);
        expect(token).not.toContain("-size-");
      }
    }
  });
});

describe("data attribute merge", () => {
  // Builds the reference twice; slow under a parallel run.
  it("unions the extras into the slot's own attributes, sorted and unique", { timeout: 20_000 }, () => {
    const base = buildReference({}).find((r) => r.name === "data-table")!;
    const own = base.slots.find((s) => s.name === "Row")!.dataAttributes;
    const merged = buildReference({ "data-table": { Row: ["data-zzz", "data-aaa", ...own] } })
      .find((r) => r.name === "data-table")!;
    expect(merged.slots.find((s) => s.name === "Row")!.dataAttributes).toEqual([...new Set([...own, "data-zzz", "data-aaa"])].sort());
    expect(merged.slots.find((s) => s.name === "Cell")!.dataAttributes).toEqual(base.slots.find((s) => s.name === "Cell")!.dataAttributes);
  });
});
