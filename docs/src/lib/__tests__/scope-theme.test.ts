import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { scopeTheme } from "../scope-theme";

describe("scopeTheme", () => {
  it("moves :root and the dark selectors under the scope", () => {
    const out = scopeTheme(':root{--ss-accent:red}.dark,[data-theme="dark"]{--ss-accent:blue}', ".p");
    expect(out).toContain(".p{--ss-accent:red}");
    expect(out).toMatch(/\[data-theme="dark"\] \.p, \.p\.dark\s*\{--ss-accent:blue\}/);
    expect(out).not.toContain(":root");
  });

  it("rewrites each dark selector alone, with spaces and comments around the rules", () => {
    const css = '/* A theme */\n:root {\n  --ss-accent: red;\n}\n\n.dark {\n  --ss-accent: blue;\n}\n\n[data-theme="dark"] { --ss-text: white; }\n';
    const out = scopeTheme(css, ".theme-preview");
    expect(out).toContain("/* A theme */");
    expect(out).toContain(".theme-preview {\n  --ss-accent: red;");
    expect(out.match(/\[data-theme="dark"\] \.theme-preview, \.theme-preview\.dark \{/g)).toHaveLength(2);
    expect(out).not.toMatch(/(^|[\s,}])\.dark\s*\{/);
  });

  it("leaves other selectors untouched", () => {
    const css = ".sdt__table{color:red}.darker{color:blue}";
    expect(scopeTheme(css, ".p")).toBe(css);
  });

  it("rewrites rules nested in an at-rule", () => {
    const css = "@media (prefers-color-scheme: dark){:root{--ss-accent:blue}}@layer theme{.dark,[data-theme=\"dark\"]{--ss-accent:navy}}";
    const out = scopeTheme(css, ".p");
    expect(out).toBe('@media (prefers-color-scheme: dark){.p{--ss-accent:blue}}@layer theme{[data-theme="dark"] .p, .p.dark{--ss-accent:navy}}');
  });

  it("accepts the dark attribute with single quotes", () => {
    const out = scopeTheme(".dark, [data-theme='dark'] { --ss-accent: blue; }", ".p");
    expect(out).toBe('[data-theme="dark"] .p, .p.dark { --ss-accent: blue; }');
  });

  it("refuses to emit a :root it cannot confine", () => {
    expect(() => scopeTheme(":root, .x { --ss-accent: red; }", ".p")).toThrow(/:root/);
    expect(() => scopeTheme(":root .x { --ss-accent: red; }", ".p")).toThrow(/:root/);
  });

  it("ignores :root inside a comment", () => {
    expect(scopeTheme("/* :root, .x */ .y{color:red}", ".p")).toBe("/* :root, .x */ .y{color:red}");
  });

  it.each(readdirSync(new URL("../../../../src/themes/", import.meta.url)))("scopes the library's %s", (file) => {
    // Read from disk: Vitest blanks CSS imports.
    const out = scopeTheme(readFileSync(new URL(`../../../../src/themes/${file}`, import.meta.url), "utf8"), ".theme-preview");
    expect(out).not.toContain(":root");
    expect(out).toMatch(/^\.theme-preview \{/m);
    expect(out).toContain('[data-theme="dark"] .theme-preview, .theme-preview.dark {');
  });
});

describe("the theming page", () => {
  const mdx = readFileSync(new URL("../../content/docs/en/theming.mdx", import.meta.url), "utf8");

  it("names every theme the library ships", () => {
    const themes = readdirSync(new URL("../../../../src/themes/", import.meta.url)).map((file) => file.replace(/\.css$/, ""));
    expect(themes.length).toBeGreaterThan(0);
    for (const theme of themes) expect(mdx).toContain(`\`${theme}\``);
  });

  it("lists exactly the shared tokens the stylesheets read", () => {
    const sheets = ["autocomplete", "data-table", "date-picker", "file-uploader"].map((slug) =>
      readFileSync(new URL(`../../../../src/${slug}/styles.css`, import.meta.url), "utf8"),
    );
    const read = new Set(sheets.flatMap((css) => [...css.matchAll(/var\((--ss-[\w-]+)/g)].map((m) => m[1]!)));
    const listed = new Set([...mdx.matchAll(/^\| `(--ss-[\w-]+)` \|/gm)].map((m) => m[1]!));
    expect([...listed].sort()).toEqual([...read].sort());
  });
});
