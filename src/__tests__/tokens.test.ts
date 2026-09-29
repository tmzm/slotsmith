/**
 * @vitest-environment node
 *
 * The four stylesheets, read as text. Every component token reads the shared
 * `--ss-*` layer (the data table's only after its deprecated `--rdt-*` twin),
 * light values live on `:root`, dark values on `.dark, [data-theme="dark"]`,
 * and the dark switch never follows the system setting.
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

const SHEETS = { sdt: "data-table", sac: "autocomplete", sdp: "date-picker", sfu: "file-uploader" } as const;

/**
 * Stylesheet
 *
 * @param folder - The component folder under `src`.
 * @returns The component's stylesheet with comments removed, so commented-out
 * or documented declarations never satisfy an assertion.
 */
const read = (folder: string) =>
  readFileSync(resolve(process.cwd(), "src", folder, "styles.css"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/@import[^;]*;/g, "");

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

/**
 * Shared-token lead
 *
 * @param prefix - A component's token prefix.
 * @param name - A shared token name.
 * @returns How the component's token must begin: with the shared token, or,
 * for the data table, with its deprecated `--rdt-*` twin and then the shared
 * token, so `--rdt-*` keeps the precedence it had as the table's own token.
 */
const lead = (prefix: string, name: string) =>
  prefix === "sdt" ? `var(--rdt-${name}, var(--ss-${name}, ` : `var(--ss-${name}, `;

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

  it.each(SHARED)("reads --ss-%s in the light block", (name) => {
    if (!declared(SHARED).includes(name)) return;
    expect(light).toMatch(new RegExp(`--${prefix}-${name}:\\s*${escape(lead(prefix, name))}`));
  });

  it.each(COLOURS)("redeclares %s in the dark block, reading the shared token", (name) => {
    if (!declared(COLOURS).includes(name)) return;
    expect(dark).toMatch(new RegExp(`--${prefix}-${name}:\\s*${escape(lead(prefix, name))}`));
  });

  it("redeclares in the dark block every light token that derives from a colour token", () => {
    // `--x-bg: var(--x-surface)` is resolved where it is declared, so a dark
    // element below the root would inherit the light surface through it.
    const derived = [...light.matchAll(new RegExp(`(--${prefix}-[\\w-]+):[^;]*var\\(--${prefix}-`, "g"))].map(
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
const SELECT_SHEETS = [{ folder: "date-picker", prefix: "sdp", selectClass: "sdp__select" }];

/**
 * The data table's page size is the autocomplete, so its sheet brings the
 * autocomplete's rules along instead of styling a native select of its own.
 */
it("styles the data table's page size with the autocomplete's rules", () => {
  const raw = readFileSync(resolve(process.cwd(), "src", "data-table", "styles.css"), "utf8");
  expect(raw).toMatch(/@import\s+"\.\.\/autocomplete\/styles\.css";/);
  expect(read("data-table")).not.toContain(".sdt__select");
});

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


/**
 * The one default palette
 *
 * With no theme imported every component falls back to the same literals, so
 * the four look like one library. The data table's values are the baseline.
 */
const PALETTE: Record<(typeof SHARED)[number], { light: string; dark?: string }> = {
  surface: { light: "#ffffff", dark: "#141416" },
  text: { light: "#111827", dark: "#f5f5f5" },
  muted: { light: "#6b7280", dark: "#a3a3a3" },
  border: { light: "#e5e7eb", dark: "#2a2a2a" },
  accent: { light: "#2563eb", dark: "#60a5fa" },
  "on-accent": { light: "#ffffff", dark: "#0b0b0c" },
  danger: { light: "#dc2626", dark: "#f87171" },
  hover: { light: "rgb(0 0 0 / 4%)", dark: "rgb(255 255 255 / 6%)" },
  selected: { light: "rgb(37 99 235 / 8%)", dark: "rgb(96 165 250 / 12%)" },
  radius: { light: "8px" },
  "font-size": { light: "14px" },
};

/** Components whose tokens have always fallen back to the data table's; that fallback is public. */
const BORROWS_TABLE: string[] = ["sdp", "sfu"];

/** The shared tokens the data table declares, and so can be borrowed. */
const TABLE_TOKENS: string[] = ["surface", "text", "muted", "border", "accent", "danger", "hover", "selected", "radius", "font-size"];

/** The only focus rings drawn inside their target: controls packed too tightly for an outside ring. */
const INSET_RINGS = [".sdp__day:focus-visible", ".sfu__action:focus-visible", ".sac__tag-remove:focus-visible", ".sac__clear:focus-visible"];

/** The shared tokens every component reads, whatever else it declares. */
const CORE = ["surface", "text", "muted", "border", "accent", "hover", "radius", "font-size"] as const;

/**
 * Rules
 *
 * @param css - A stylesheet without comments.
 * @returns Every innermost rule as a normalised selector and its body.
 */
const rules = (css: string) =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    selector: match[1]!.trim().replace(/\s+/g, " "),
    body: match[2]!,
  }));

/** The body of the rule whose selector is exactly `selector`, or `""`. */
const rule = (css: string, selector: string) => rules(css).find((entry) => entry.selector === selector)?.body ?? "";

/**
 * Declaration
 *
 * @param body - A rule body.
 * @param property - A property name, matched whole (`height` never matches `min-height`).
 * @returns The property's value, or `undefined` when the rule does not set it.
 */
const value = (body: string, property: string) =>
  body.match(new RegExp(`(?:^|[;\\s])${escape(property)}:\\s*([^;]+);`))?.[1]?.trim();

describe.each(Object.entries(SHEETS))("the --%s default look", (prefix, folder) => {
  const css = read(folder);
  const light = block(css, /(?:^|\})\s*:root/);
  const dark = block(css, /\.dark,\s*\[data-theme="dark"\]/);

  it.each(CORE)("declares --%s", (name) => {
    expect(light).toContain(`--${prefix}-${name}:`);
  });

  /**
   * The expected declaration: the shared token, then (for the components that
   * have always borrowed them) the data table's and its deprecated twin, then
   * the one literal. The data table's own reads its deprecated twin first.
   */
  const expected = (name: (typeof SHARED)[number], literal: string | undefined) =>
    prefix === "sdt"
      ? `var(--rdt-${name}, var(--ss-${name}, ${literal}))`
      : BORROWS_TABLE.includes(prefix) && TABLE_TOKENS.includes(name)
        ? `var(--ss-${name}, var(--sdt-${name}, var(--rdt-${name}, ${literal})))`
        : `var(--ss-${name}, ${literal})`;

  it.each(SHARED)("falls back to the shared light literal for %s", (name) => {
    const token = value(light, `--${prefix}-${name}`);
    if (token === undefined) return;
    expect(token).toBe(expected(name, PALETTE[name].light));
  });

  it.each(COLOURS)("falls back to the shared dark literal for %s", (name) => {
    if (value(light, `--${prefix}-${name}`) === undefined) return;
    expect(value(dark, `--${prefix}-${name}`)).toBe(expected(name, PALETTE[name].dark));
  });

  it("keeps the data table's tokens as the fallback, so --sdt-* and older --rdt-* themes still apply", () => {
    if (!BORROWS_TABLE.includes(prefix)) return;
    for (const block of [light, dark]) {
      for (const name of TABLE_TOKENS) {
        const token = value(block, `--${prefix}-${name}`);
        if (token === undefined) continue;
        expect(token.startsWith(`var(--ss-${name}, var(--sdt-${name}, var(--rdt-${name}, `), `--${prefix}-${name}`).toBe(
          true,
        );
      }
    }
    if (prefix === "sfu") {
      expect(value(light, "--sfu-bg")).toBe("var(--sdt-bg, var(--rdt-bg, var(--sfu-surface)))");
      expect(value(dark, "--sfu-bg")).toBe("var(--sdt-bg, var(--rdt-bg, var(--sfu-surface)))");
    }
  });

  it("sets color-scheme on its own elements, not on the element carrying the theme", () => {
    expect(dark).not.toMatch(/color-scheme/);
    const scoped = rules(css).find(
      (entry) =>
        new RegExp(`:is\\(\\.dark, \\[data-theme="dark"\\]\\) :is\\(\\.${prefix}[,)]`).test(entry.selector) &&
        entry.selector.includes(`.${prefix}:is(.dark, [data-theme="dark"])`),
    );
    expect(scoped && value(scoped.body, "color-scheme")).toBe("dark");
  });

  it("draws every focus ring the same way", () => {
    const outlines = [...css.matchAll(/(?<![-\w])outline:\s*([^;]+);/g)].map((match) => match[1]!.trim());
    expect(outlines.length).toBeGreaterThan(0);
    for (const outline of outlines) if (outline !== "none") expect(outline).toBe(`2px solid var(--${prefix}-accent)`);
    for (const entry of rules(css)) {
      const offset = value(entry.body, "outline-offset");
      if (offset === undefined) continue;
      // Tightly packed targets keep the ring inside, off their neighbours.
      const inset = entry.selector.split(", ").every((selector) => INSET_RINGS.includes(selector));
      expect(offset, entry.selector).toBe(inset ? "-2px" : "2px");
    }
    // The old halo on the triggers was a second, different ring.
    expect(css).not.toMatch(/box-shadow:\s*0 0 0/);
  });

  it("dims every disabled control by the same amount", () => {
    const disabled = rules(css).filter(
      (entry) =>
        /disabled/.test(entry.selector.replace(/:not\(:disabled\)/g, "")) &&
        // Blocked days stay focusable, and must read as blocked beside the muted outside days.
        entry.selector !== ".sdp__day[data-disabled]",
    );
    for (const entry of disabled) {
      const opacity = value(entry.body, "opacity");
      if (opacity !== undefined) expect(opacity, entry.selector).toBe("0.5");
    }
  });

  it("paints every hover background with the hover token", () => {
    for (const entry of rules(css).filter((candidate) => candidate.selector.includes(":hover"))) {
      const background = value(entry.body, "background") ?? value(entry.body, "background-color");
      if (background !== undefined) expect(background, entry.selector).toBe(`var(--${prefix}-hover)`);
    }
  });

  it("sizes its root text from the font-size token", () => {
    expect(value(rule(css, `.${prefix}`), "font-size")).toBe(`var(--${prefix}-font-size)`);
  });
});

/** Buttons and triggers: one height, border and radius. */
const CONTROLS = [
  { prefix: "sdt", folder: "data-table", selector: ".sdt__button" },
  { prefix: "sac", folder: "autocomplete", selector: ".sac__trigger" },
  { prefix: "sac", folder: "autocomplete", selector: ".sac__button" },
  { prefix: "sdp", folder: "date-picker", selector: ".sdp__trigger" },
  { prefix: "sfu", folder: "file-uploader", selector: ".sfu__browse" },
];

it.each(CONTROLS)("$selector is a 32px control with the shared border and radius", ({ prefix, folder, selector }) => {
  const body = rule(read(folder), selector);
  expect(value(body, "height") ?? value(body, "min-height")).toBe("32px");
  expect(value(body, "border")).toBe(`1px solid var(--${prefix}-border)`);
  expect(value(body, "border-radius")).toBe(`var(--${prefix}-radius)`);
  const inline = value(body, "padding-inline") ?? value(body, "padding")?.split(" ")[1];
  expect(inline).toBe("12px");
});

it("gives both popups the same surface, border, radius, text and shadow", () => {
  const popups = [
    { prefix: "sac", body: rule(read("autocomplete"), ".sac__popup") },
    { prefix: "sdp", body: rule(read("date-picker"), ".sdp__popup") },
  ];
  for (const { prefix, body } of popups) {
    expect(value(body, "border")).toBe(`1px solid var(--${prefix}-border)`);
    expect(value(body, "border-radius")).toBe(`var(--${prefix}-radius)`);
    expect(value(body, "background")).toBe(`var(--${prefix}-surface)`);
    expect(value(body, "color")).toBe(`var(--${prefix}-text)`);
    expect(value(body, "font-size")).toBe(`var(--${prefix}-font-size)`);
    expect(value(body, "box-shadow")).toBe("0 10px 30px -12px rgb(0 0 0 / 45%)");
  }
});

it.each([
  ["autocomplete", ".sac__overflow"],
  ["autocomplete", ".sac__more-button"],
  ["file-uploader", ".sfu__hint"],
  ["file-uploader", ".sfu__sub"],
  ["file-uploader", ".sfu__error"],
  ["file-uploader", ".sfu__rejections"],
])("%s's secondary text %s is 0.75rem", (folder, selector) => {
  expect(value(rule(read(folder), selector), "font-size")).toBe("0.75rem");
});

/**
 * The deprecated data table names
 *
 * Until 2.0 a theme or override written against `rdt` keeps working: every
 * `--sdt-*` token reads its `--rdt-*` twin first wherever the sheet declares
 * it, while the rules themselves select and read only `sdt` names.
 */
describe("the data table's deprecated rdt names", () => {
  const css = read("data-table");

  /** Every `--sdt-*` declaration in a rule body. */
  const declarations = (body: string) =>
    [...body.matchAll(/(--sdt-([\w-]+)):\s*([^;]+);/g)].map((match) => ({
      token: match[1]!,
      name: match[2]!,
      value: match[3]!.trim(),
    }));

  it.each([":root", '.dark, [data-theme="dark"]', '.sdt[data-size="default"]', '.sdt[data-size="sm"]'])(
    "every token declared on %s reads its --rdt-* twin first",
    (selector) => {
      const found = declarations(rule(css, selector));
      expect(found.length).toBeGreaterThan(2);
      for (const { token, name, value } of found) expect(value.startsWith(`var(--rdt-${name}, `), token).toBe(true);
    },
  );

  it("declares on :root, with its twin, every token the rules read", () => {
    const light = rule(css, ":root");
    const names = new Set([...css.matchAll(/var\(--sdt-([\w-]+)\)/g)].map((match) => match[1]!));
    expect(names.size).toBeGreaterThan(10);
    for (const name of names) expect(light, `--sdt-${name}`).toContain(`--sdt-${name}: var(--rdt-${name}, `);
  });

  it("selects only the sdt class names, and reads --rdt-* only as a fallback", () => {
    expect(css).not.toMatch(/\.rdt(\b|_)/);
    expect(css).not.toMatch(/--rdt-[\w-]+:/);
    expect(css).not.toMatch(/(?<!var\()--rdt-/);
  });
});
