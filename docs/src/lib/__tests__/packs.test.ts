import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PACKS } from "@/lib/packs";

/** The pack files in the library, as the file system lists them. */
const files = readdirSync(fileURLToPath(new URL("../../../../src/locales", import.meta.url)))
  .filter((file) => file.endsWith(".ts"))
  .map((file) => file.slice(0, -3));

describe("PACKS", () => {
  it("lists the 18 packs the library ships, sorted by code", () => {
    expect(PACKS).toHaveLength(18);
    expect(PACKS.map((pack) => pack.code)).toEqual([...files].sort());
    expect(PACKS.map((pack) => pack.code)).toEqual(PACKS.map((pack) => pack.code).sort());
  });

  it("marks exactly the right-to-left packs", () => {
    expect(PACKS.filter((pack) => pack.dir === "rtl").map((pack) => pack.code)).toEqual(["ar", "ar-EG", "ar-IQ", "ar-SA", "fa", "he"]);
  });

  it("has no English pack: English is the default", () => {
    expect(PACKS.some((pack) => pack.code === "en" || pack.code.startsWith("en-"))).toBe(false);
  });

  it("matches the count the languages page's description gives", () => {
    const mdx = readFileSync(fileURLToPath(new URL("../../content/docs/en/languages.mdx", import.meta.url)), "utf8");
    expect(/^description: "The (\d+) locale packs/m.exec(mdx)?.[1]).toBe(String(PACKS.length));
  });

  it("names each pack in English and gives its import path and export", () => {
    const ar = PACKS.find((pack) => pack.code === "ar-EG")!;
    expect(ar.name).toBe("Arabic (Egypt)");
    expect(ar.importPath).toBe("slotsmith/locales/ar-EG");
    expect(ar.exportName).toBe("arEG");
    expect(PACKS.find((pack) => pack.code === "zh-CN")!.name).toBe("Chinese (China)");
  });
});
