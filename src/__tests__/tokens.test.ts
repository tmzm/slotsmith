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

  it.each(SHARED)("falls back to the shared light literal for %s", (name) => {
    const token = value(light, `--${prefix}-${name}`);
    if (token === undefined) return;
    expect(token).toBe(`var(--ss-${name}, ${PALETTE[name].light})`);
  });

  it.each(COLOURS)("falls back to the shared dark literal for %s", (name) => {
    if (value(light, `--${prefix}-${name}`) === undefined) return;
    expect(value(dark, `--${prefix}-${name}`)).toBe(`var(--ss-${name}, ${PALETTE[name].dark})`);
  });

  it("no longer borrows the data table's tokens", () => {
    if (prefix === "rdt") return;
    expect(css).not.toContain("--rdt-");
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
    for (const [, offset] of css.matchAll(/outline-offset:\s*([^;]+);/g)) expect(offset!.trim()).toBe("2px");
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

/** Buttons, triggers and the table's select: one height, border and radius. */
const CONTROLS = [
  { prefix: "rdt", folder: "data-table", selector: ".rdt__button" },
  { prefix: "rdt", folder: "data-table", selector: ".rdt__select" },
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
  // The table's select keeps its own tighter padding around the arrow.
  if (selector === ".rdt__select") return;
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
