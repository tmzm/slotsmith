import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { scopeTheme, tokenRules } from "../scope-theme";

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

  it.each(readdirSync(new URL("../../../../src/themes/", import.meta.url)))("scopes the library's %s", (file) => {
    // Read from disk: Vitest blanks CSS imports.
    const out = scopeTheme(readFileSync(new URL(`../../../../src/themes/${file}`, import.meta.url), "utf8"), ".theme-preview");
    expect(out).not.toContain(":root");
    expect(out).toMatch(/^\.theme-preview \{/m);
    expect(out).toContain('[data-theme="dark"] .theme-preview, .theme-preview.dark {');
  });
});

describe("tokenRules", () => {
  it("keeps the :root and dark rules and drops the rest", () => {
    const css = '/* { tokens } */\n:root { --sdt-accent: var(--ss-accent, blue); }\n.dark,\n[data-theme="dark"] { --sdt-accent: var(--ss-accent, navy); }\n.sdt { color: var(--sdt-text); }\n@import "x.css";';
    const out = tokenRules(css);
    expect(out).toContain(":root { --sdt-accent: var(--ss-accent, blue); }");
    expect(out).toContain('.dark, [data-theme="dark"] { --sdt-accent: var(--ss-accent, navy); }');
    expect(out).not.toContain(".sdt {");
    expect(scopeTheme(out, ".p")).toContain('[data-theme="dark"] .p, .p.dark {');
  });

  it.each(["autocomplete", "data-table", "date-picker", "file-uploader"])("finds both token rules in the %s stylesheet", (slug) => {
    const out = tokenRules(readFileSync(new URL(`../../../../src/${slug}/styles.css`, import.meta.url), "utf8"));
    expect(out.match(/^:root \{/gm)).toHaveLength(1);
    expect(out.match(/^\.dark, \[data-theme="dark"\] \{/gm)).toHaveLength(1);
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
