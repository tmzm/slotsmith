/**
 * @vitest-environment node
 *
 * The four stylesheets, read as text. Every component token reads the shared
 * `--ss-*` layer first, light values live on `:root`, dark values on
 * `.dark, [data-theme="dark"]`, and the dark switch never follows the system
 * setting.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/** Every token in the shared layer. */
const SHARED = [
  "surface",
  "text",
  "muted",
  "border",
  "accent",
  "on-accent",
  "danger",
  "hover",
  "selected",
  "radius",
  "font-size",
] as const;

/** The shared tokens that are colours, and so change with the theme. */
const COLOURS = ["surface", "text", "muted", "border", "accent", "on-accent", "danger", "hover", "selected"] as const;

const SHEETS = { rdt: "data-table", sac: "autocomplete", sdp: "date-picker", sfu: "file-uploader" } as const;

/**
 * Stylesheet
 *
 * @param folder - The component folder under `src`.
 * @returns The component's stylesheet with comments removed, so commented-out
 * or documented declarations never satisfy an assertion.
 */
const read = (folder: string) =>
  readFileSync(resolve(process.cwd(), "src", folder, "styles.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * Rule body
 *
 * @param css - A stylesheet without comments.
 * @param selector - A pattern that must end right before the rule's `{`.
 * @returns The body of the first rule with exactly this selector, or `""`.
 */
const block = (css: string, selector: RegExp) => css.match(new RegExp(`${selector.source}\\s*\\{([^}]*)\\}`))?.[1] ?? "";

/** Escapes a literal for use inside a regular expression. */
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

describe.each(Object.entries(SHEETS))("--%s tokens", (prefix, folder) => {
  const css = read(folder);
  const light = block(css, /(?:^|\})\s*:root/);
  const dark = block(css, /\.dark,\s*\[data-theme="dark"\]/);
  // A component only has the shared tokens it actually uses.
  const declared = <T extends string>(names: readonly T[]) =>
    names.filter((name) => light.includes(`--${prefix}-${name}:`));

  it("declares its tokens on :root", () => {
    expect(declared(SHARED).length).toBeGreaterThan(3);
  });

  it.each(SHARED)("reads --ss-%s first in the light block", (name) => {
    if (!declared(SHARED).includes(name)) return;
    expect(light).toMatch(new RegExp(`--${prefix}-${name}:\\s*var\\(--ss-${escape(name)},`));
  });

  it.each(COLOURS)("redeclares %s in the dark block, reading the shared token first", (name) => {
    if (!declared(COLOURS).includes(name)) return;
    expect(dark).toMatch(new RegExp(`--${prefix}-${name}:\\s*var\\(--ss-${escape(name)},`));
  });

  it("redeclares in the dark block every light token that derives from a colour token", () => {
    // `--x-bg: var(--x-surface)` is resolved where it is declared, so a dark
    // element below the root would inherit the light surface through it.
    const derived = [...light.matchAll(new RegExp(`(--${prefix}-[\\w-]+):\\s*var\\(--${prefix}-`, "g"))].map(
      (match) => match[1],
    );
    for (const name of derived) expect(dark, name).toContain(`${name}:`);
  });

  it("switches to dark by class or attribute, never by the system setting", () => {
    expect(css).not.toContain("prefers-color-scheme");
    expect(dark).not.toBe("");
  });

  it("never sets color-scheme on :root", () => {
    expect(light).not.toMatch(/color-scheme/);
  });
});

/**
 * Stylesheets whose fallbacks render a native `<select>`, and the token
 * prefix each one's rules are written against.
 */
const SELECT_SHEETS = [
  { folder: "data-table", prefix: "rdt", selectClass: "rdt__select" },
  { folder: "date-picker", prefix: "sdp", selectClass: "sdp__select" },
];

it.each(SELECT_SHEETS)(
  "$folder's native select uses the component's tokens, not the browser's light default",
  ({ folder, prefix, selectClass }) => {
    const css = read(folder);

    const selectRule = block(css, new RegExp(`\\.${selectClass}`));
    expect(selectRule).not.toMatch(/background(-color)?:\s*transparent/);
    expect(selectRule).toMatch(new RegExp(`background(-color)?:\\s*var\\(--${prefix}-surface`));

    const optionRule = block(css, new RegExp(`\\.${selectClass} option`));
    expect(optionRule).not.toMatch(/color:\s*initial/);
    expect(optionRule).toMatch(new RegExp(`color:\\s*var\\(--${prefix}-text`));
    expect(optionRule).toMatch(new RegExp(`background-color:\\s*var\\(--${prefix}-surface`));

    // So the browser paints the native popup and scrollbar dark.
    expect(css).toMatch(/color-scheme:\s*dark/);
  },
);
