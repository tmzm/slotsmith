/**
 * @vitest-environment node
 *
 * The four stylesheets, read as text. Every colour, radius and font-size token
 * is resolved on the component's own root, into an internal `--_<prefix>-*`
 * value that reads the app's component token first and the shared `--ss-*`
 * layer second. Dark values sit on rules scoped to the component under
 * `.dark` or `[data-theme="dark"]`, and the dark switch never follows the
 * system setting.
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
 * Token rules
 *
 * @param css - A stylesheet without comments.
 * @param prefix - The component's prefix.
 * @returns The bodies of the rule that resolves the light values on the
 * component's root (and popup), and of the rule that resolves the dark ones.
 */
const tokenBlocks = (css: string, prefix: string) => {
  const own = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .map((match) => ({ selector: match[1]!.trim().replace(/\s+/g, " "), body: match[2]! }))
    .filter((entry) => entry.body.includes(`--_${prefix}-`));
  const light = own.find((entry) => [`.${prefix}`, `.${prefix}, .${prefix}__popup`].includes(entry.selector))?.body ?? "";
  const dark = own.find((entry) => entry.selector.startsWith(`:is(.dark, [data-theme="dark"]) :is(.${prefix}`))?.body ?? "";
  return { light, dark };
};

describe.each(Object.entries(SHEETS))("--%s tokens", (prefix, folder) => {
  const css = read(folder);
  const root = block(css, /(?:^|\})\s*:root/);
  const { light, dark } = tokenBlocks(css, prefix);
  // A component only has the shared tokens it actually uses.
  const declared = <T extends string>(names: readonly T[]) =>
    names.filter((name) => light.includes(`--_${prefix}-${name}:`));

  it("resolves its tokens on its own root", () => {
    expect(declared(SHARED).length).toBeGreaterThan(3);
  });

  it.each(SHARED)("reads the app's token, then --ss-%s, in the light rule", (name) => {
    if (!declared(SHARED).includes(name)) return;
    expect(light).toMatch(new RegExp(`--_${prefix}-${escape(name)}:\\s*var\\(--${prefix}-${escape(name)}, var\\(--ss-${escape(name)},`));
  });

  it.each(COLOURS)("resolves %s again in the dark rule, in the same order", (name) => {
    if (!declared(COLOURS).includes(name)) return;
    expect(dark).toMatch(new RegExp(`--_${prefix}-${escape(name)}:\\s*var\\(--${prefix}-${escape(name)}, var\\(--ss-${escape(name)},`));
  });

  it("never declares a public token that reads another token, so an app's value always wins", () => {
    // Declaring `--sdt-accent: var(--ss-accent, …)` anywhere would shadow the
    // app's own value set above it, or resolve --ss-* out of a wrapper's reach.
    for (const [, name, value] of css.matchAll(/(?<![\w-])(--[a-z]+-[\w-]+):\s*([^;]+);/g)) {
      if (!name!.startsWith(`--${prefix}-`) || name!.startsWith(`--${prefix}-size-`)) continue;
      expect(value, name).not.toMatch(/var\(/);
    }
  });

  it("switches to dark by class or attribute, never by the system setting", () => {
    expect(css).not.toContain("prefers-color-scheme");
    expect(dark).not.toBe("");
  });

  it("never sets color-scheme on :root", () => {
    expect(root).not.toMatch(/color-scheme/);
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
    expect(selectRule).toMatch(new RegExp(`background(-color)?:\\s*var\\(--_${prefix}-surface`));

    const optionRule = block(css, new RegExp(`\\.${selectClass} option`));
    expect(optionRule).not.toMatch(/color:\s*initial/);
    expect(optionRule).toMatch(new RegExp(`color:\\s*var\\(--_${prefix}-text`));
    expect(optionRule).toMatch(new RegExp(`background-color:\\s*var\\(--_${prefix}-surface`));

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
const INSET_RINGS = [".sdp__day:focus-visible", ".sfu__action:focus-visible", ".sac__tag-remove:focus-visible", ".sac__clear:focus-visible", ".sdp__clear:focus-visible"];

/**
 * The data table's density tokens. The library never declares them: the size
 * rules set `--sdt-size-*` twins, and every rule reads the public token first.
 */
const DENSITY: string[] = ["font-size", "padding-x", "padding-y", "checkbox-size"];

/**
 * Token read
 *
 * @param prefix - A component's token prefix.
 * @param name - A token name.
 * @returns How a rule reads the token: through its internal resolved value,
 * or for a data table density token, the public token with its internal size
 * twin as the fallback.
 */
const tokenRead = (prefix: string, name: string) =>
  prefix === "sdt" && DENSITY.includes(name) ? `var(--sdt-${name}, var(--sdt-size-${name}))` : `var(--_${prefix}-${name})`;

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
  const root = block(css, /(?:^|\})\s*:root/);
  const { light, dark } = tokenBlocks(css, prefix);

  it.each(CORE)("declares --%s", (name) => {
    // The data table's density tokens are the app's to set; it declares an internal twin on :root instead.
    if (prefix === "sdt" && DENSITY.includes(name)) expect(root).toContain(`--sdt-size-${name}:`);
    else expect(light).toContain(`--_${prefix}-${name}:`);
  });

  /**
   * The expected declaration: the app's component token, the shared token,
   * then (for the components that have always borrowed them) the data
   * table's, then the one literal.
   */
  const expected = (name: (typeof SHARED)[number], literal: string | undefined) =>
    BORROWS_TABLE.includes(prefix) && TABLE_TOKENS.includes(name)
      ? `var(--${prefix}-${name}, var(--ss-${name}, var(--sdt-${name}, ${literal})))`
      : `var(--${prefix}-${name}, var(--ss-${name}, ${literal}))`;

  it.each(SHARED)("falls back to the shared light literal for %s", (name) => {
    const token = value(light, `--_${prefix}-${name}`);
    if (token === undefined) return;
    expect(token).toBe(expected(name, PALETTE[name].light));
  });

  it.each(COLOURS)("falls back to the shared dark literal for %s", (name) => {
    if (value(light, `--_${prefix}-${name}`) === undefined) return;
    expect(value(dark, `--_${prefix}-${name}`)).toBe(expected(name, PALETTE[name].dark));
  });

  it("keeps the data table's tokens as the fallback after the shared ones, so a theme written against the table still applies", () => {
    if (!BORROWS_TABLE.includes(prefix)) return;
    for (const block of [light, dark]) {
      for (const name of TABLE_TOKENS) {
        const token = value(block, `--_${prefix}-${name}`);
        if (token === undefined) continue;
        expect(token.startsWith(`var(--${prefix}-${name}, var(--ss-${name}, var(--sdt-${name}, `), `--${prefix}-${name}`).toBe(true);
      }
    }
    if (prefix === "sfu") expect(value(light, "--_sfu-bg")).toBe("var(--sfu-bg, var(--sdt-bg, var(--_sfu-surface)))");
  });

  it("sets color-scheme on its own elements, not on the element carrying the theme", () => {
    expect(block(css, /\.dark,\s*\[data-theme="dark"\]/)).not.toMatch(/color-scheme/);
    expect(value(dark, "color-scheme")).toBe("dark");
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
    for (const outline of outlines) if (outline !== "none") expect(outline).toBe(`2px solid ${tokenRead(prefix, "accent")}`);
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
      if (background !== undefined) expect(background, entry.selector).toBe(tokenRead(prefix, "hover"));
    }
  });

  it("sizes its root text from the font-size token", () => {
    expect(value(rule(css, `.${prefix}`), "font-size")).toBe(tokenRead(prefix, "font-size"));
  });
});

/** The components with an `invalid` prop, whose triggers turn the danger colour with it. */
const INVALID_TRIGGERS = [
  { folder: "autocomplete", prefix: "sac" },
  { folder: "date-picker", prefix: "sdp" },
];

it.each(INVALID_TRIGGERS)("$folder draws an invalid trigger with its danger token", ({ folder, prefix }) => {
  const css = read(folder);
  const { light, dark } = tokenBlocks(css, prefix);
  expect(light).toContain(`--_${prefix}-danger:`);
  expect(dark).toContain(`--_${prefix}-danger:`);

  const border = rule(css, `.${prefix}__trigger[data-invalid], .${prefix}__trigger[data-invalid]:hover`);
  expect(value(border, "border-color")).toBe(`var(--_${prefix}-danger)`);
  const ring = rule(css, `.${prefix}__trigger[data-invalid]:focus-visible`);
  expect(value(ring, "outline-color")).toBe(`var(--_${prefix}-danger)`);

  // Declared after the open rule, which has the same specificity, so an open invalid trigger stays red.
  expect(css.indexOf(`.${prefix}__trigger[data-invalid]`)).toBeGreaterThan(css.indexOf(`.${prefix}__trigger[data-open]`));
});

/**
 * The page-size menu is not portalled, so inside the table the autocomplete's
 * colour, radius and font tokens read the table's: an app that restyles only
 * the table restyles the page-size menu with it.
 */
it("maps the autocomplete's tokens to the table's inside the table", () => {
  const body = rule(read("data-table"), ".sdt .sac");
  for (const name of [...COLOURS.filter((colour) => colour !== "on-accent" && colour !== "selected"), "radius", "font-size"]) {
    expect(value(body, `--sac-${name}`), name).toBe(tokenRead("sdt", name));
  }
  // The public tokens, so the autocomplete's own rules, popup included, read them first.
  expect(body).not.toContain("--_sac-");
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
  expect(value(body, "border")).toBe(`1px solid ${tokenRead(prefix, "border")}`);
  expect(value(body, "border-radius")).toBe(tokenRead(prefix, "radius"));
  const inline = value(body, "padding-inline") ?? value(body, "padding")?.split(" ")[1];
  expect(inline).toBe("12px");
});

it("gives both popups the same surface, border, radius, text and shadow", () => {
  const popups = [
    { prefix: "sac", body: rule(read("autocomplete"), ".sac__popup") },
    { prefix: "sdp", body: rule(read("date-picker"), ".sdp__popup") },
  ];
  for (const { prefix, body } of popups) {
    expect(value(body, "border")).toBe(`1px solid ${tokenRead(prefix, "border")}`);
    expect(value(body, "border-radius")).toBe(tokenRead(prefix, "radius"));
    expect(value(body, "background")).toBe(tokenRead(prefix, "surface"));
    expect(value(body, "color")).toBe(tokenRead(prefix, "text"));
    expect(value(body, "font-size")).toBe(tokenRead(prefix, "font-size"));
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
 * Density overrides
 *
 * `DataTable` always sets a size, and the size rules sit on the table element
 * itself, where a declaration beats any inherited value. So they declare only
 * internal `--sdt-size-*` tokens, and an app's `--sdt-padding-x` on `:root`,
 * a wrapper or the table reaches the cells whatever the size.
 */
describe("the data table's density tokens", () => {
  const css = read("data-table");
  const sizes = ['.sdt[data-size="default"]', '.sdt[data-size="sm"]'];

  it.each(DENSITY)("never declares the public --sdt-%s, anywhere", (name) => {
    expect(css).not.toMatch(new RegExp(`--sdt-${escape(name)}:`));
  });

  it.each(sizes)("%s sets only internal size tokens", (selector) => {
    const body = rule(css, selector);
    const names = [...body.matchAll(/(--[\w-]+):/g)].map((match) => match[1]!);
    expect(names.length).toBeGreaterThan(2);
    for (const name of names) expect(name).toMatch(/^--sdt-size-/);
  });

  it("keeps --ss-font-size flowing into every size", () => {
    for (const selector of [":root", ...sizes]) {
      expect(value(rule(css, selector), "--sdt-size-font-size"), selector).toMatch(/var\(--ss-font-size, 14px\)/);
    }
  });

  it("reads the public token first in every rule that uses a density token", () => {
    for (const name of DENSITY) {
      const uses = [...css.matchAll(new RegExp(`var\\(--sdt-(?:size-)?${escape(name)}[,)][^;]*`, "g"))].map((match) => match[0]);
      expect(uses.length, name).toBeGreaterThan(0);
      for (const use of uses) expect(use.startsWith(`var(--sdt-${name}, var(--sdt-size-${name}))`), use).toBe(true);
    }
  });

  it("lets a :root or wrapper value of --sdt-padding-x reach a cell at every size", () => {
    const padding = value(rule(css, ".sdt__cell"), "padding")!;
    // What the cell's padding resolves to, given the custom properties in scope.
    const resolve = (scope: Record<string, string>) =>
      padding.replace(/var\((--[\w-]+), var\((--[\w-]+)\)\)/g, (_, own: string, fallback: string) => scope[own] ?? scope[fallback]!);
    for (const selector of sizes) {
      const size = rule(css, selector);
      // Nothing the sheet puts on the table element may shadow an inherited value.
      for (const onTable of [".sdt", selector]) expect(rule(css, onTable)).not.toMatch(/--sdt-padding-x:/);
      const scope = {
        "--sdt-size-padding-x": value(size, "--sdt-size-padding-x")!,
        "--sdt-size-padding-y": value(size, "--sdt-size-padding-y")!,
      };
      // The app's value is inherited from :root or a wrapper; the size rule
      // never declares the public name, so nothing on the table shadows it.
      expect(resolve({ ...scope, "--sdt-padding-x": "20px" }), selector).toBe(`${scope["--sdt-size-padding-y"]} 20px`);
      expect(resolve(scope), selector).toBe(`${scope["--sdt-size-padding-y"]} ${scope["--sdt-size-padding-x"]}`);
    }
  });
});

/**
 * The small buttons inside a trigger: each must be a 24 by 24 CSS pixel
 * pointer target, and still take only the room its glyph box always took, so
 * the trigger keeps its height and nothing beside the button moves.
 */
describe("the clear and tag-remove targets", () => {
  /** The last value a sheet gives `property` on exactly `selector`, alone or in a selector list. */
  const declared = (css: string, selector: string, property: string) =>
    rules(css)
      .filter((entry) => entry.selector.split(", ").includes(selector))
      .map((entry) => value(entry.body, property))
      .filter((found) => found !== undefined)
      .at(-1);

  const rem = (length: string | undefined) => Number(/^(-?[\d.]+)rem$/.exec(length ?? "")?.[1] ?? Number.NaN);

  it.each([
    ["autocomplete", ".sac__clear", 1.25],
    ["autocomplete", ".sac__tag-remove", 1],
    ["date-picker", ".sdp__clear", 1.25],
  ])("%s: %s is 1.5rem square in a %srem footprint", (folder, selector, footprint) => {
    const css = read(folder);
    const width = rem(declared(css, selector, "width"));
    const height = rem(declared(css, selector, "height"));
    const margin = rem(declared(css, selector, "margin"));
    expect(width).toBeGreaterThanOrEqual(1.5);
    expect(height).toBeGreaterThanOrEqual(1.5);
    expect(declared(css, selector, "box-sizing")).toBe("border-box");
    // A negative margin gives back what the target gained, on every side, so it is the same in right-to-left.
    expect(width + 2 * margin).toBeCloseTo(footprint);
    expect(height + 2 * margin).toBeCloseTo(footprint);
    // The hover tint stays the size of the old box.
    expect(rem(declared(css, selector, "padding"))).toBeCloseTo(-margin);
    expect(declared(css, selector, "background-clip")).toBe("content-box");
  });

  it("keeps the hover tint clipped, which the background shorthand would undo", () => {
    for (const [folder, selector] of [
      ["autocomplete", ".sac__tag-remove:hover, .sac__clear:hover"],
      ["date-picker", ".sdp__clear:hover"],
    ] as const) {
      const body = rule(read(folder), selector);
      expect(value(body, "background"), selector).toBeUndefined();
      expect(value(body, "background-color"), selector).toBeDefined();
    }
  });

  it("gives wrapped tags a row pitch of 24px, so one row's remove buttons never cover the next row's", () => {
    expect(value(rule(read("autocomplete"), ".sac__tag"), "min-height")).toBe("1.25rem");
    expect(value(rule(read("autocomplete"), ".sac__body"), "gap")).toBe("0.25rem");
  });
});
