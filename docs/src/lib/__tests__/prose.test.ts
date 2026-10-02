import { describe, expect, it } from "vitest";
import { resolveProse } from "@/lib/prose";

const entry = (id: string) => ({ id, data: { title: id, description: "d" } }) as never;
const only = (...ids: string[]) => (id: string) => (ids.includes(id) ? entry(id) : undefined);

describe("resolveProse", () => {
  it("returns the Arabic entry when it exists", () => {
    const prose = resolveProse("ar", "theming", only("en/theming", "ar/theming"));
    expect(prose.translated).toBe(true);
    expect(prose.lang).toBe("ar");
    expect(prose.sourcePath).toBe("src/content/docs/ar/theming.mdx");
  });

  it("falls back to English for a missing Arabic twin", () => {
    const prose = resolveProse("ar", "theming", only("en/theming"));
    expect(prose.translated).toBe(false);
    expect(prose.lang).toBe("ar");
    expect(prose.entry.id).toBe("en/theming");
    expect(prose.sourcePath).toBe("src/content/docs/en/theming.mdx");
  });

  it("points at the entry's own file, so an index.mdx is not read as <folder>.mdx", () => {
    const overview = { id: "en/components/data-table", filePath: "src/content/docs/en/components/data-table/index.mdx", data: { title: "t", description: "d" } } as never;
    expect(resolveProse("en", "components/data-table", (id) => (id === "en/components/data-table" ? overview : undefined)).sourcePath).toBe(
      "src/content/docs/en/components/data-table/index.mdx",
    );
  });

  it("reads nested slugs", () => {
    const slug = "components/data-table/guides/tree-rows";
    expect(resolveProse("en", slug, only(`en/${slug}`)).entry.id).toBe(`en/${slug}`);
  });

  it("throws with the slug when English is missing", () => {
    expect(() => resolveProse("en", "nope", only())).toThrow(/nope/);
    expect(() => resolveProse("ar", "nope", only("ar/nope"))).toThrow(/nope/);
  });
});
