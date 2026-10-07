/**
 * @vitest-environment node
 *
 * Where the tokens reach. jsdom does not resolve `var()` in custom
 * properties, so this file runs the stylesheets through a small cascade of
 * its own: it matches the rules that declare custom properties against a
 * chain of elements, orders them by specificity and source order, and
 * resolves `var()` on each element the way a browser does, from the
 * element's own values and, failing that, its parent's.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/** One element: its classes, its attributes and its inline custom properties. */
interface Node {
  classes?: string[];
  attrs?: Record<string, string>;
  style?: Record<string, string>;
  root?: boolean;
}

interface Rule {
  selectors: string[];
  declarations: [string, string][];
  order: number;
}

const source = (path: string) =>
  readFileSync(resolve(process.cwd(), "src", path), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/@import[^;]*;/g, "");

/** The library's stylesheet, in the order `styles.css` imports it. */
const LIBRARY = ["autocomplete", "data-table", "date-picker", "file-uploader"].map((folder) => source(`${folder}/styles.css`)).join("\n");

/** Splits on commas outside parentheses and brackets. */
const splitTop = (text: string, separator: RegExp) => {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < text.length; index++) {
    const char = text[index]!;
    if (char === "(" || char === "[") depth++;
    else if (char === ")" || char === "]") depth--;
    else if (depth === 0 && separator.test(char)) {
      parts.push(text.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(text.slice(start));
  return parts.map((part) => part.trim()).filter(Boolean);
};

/** The rules that declare at least one custom property. */
const parse = (css: string): Rule[] =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .map((match, order) => ({
      selectors: splitTop(match[1]!, /,/),
      declarations: [...match[2]!.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => [name!, value!.trim()] as [string, string]),
      order,
    }))
    .filter((rule) => rule.declarations.length > 0);

/**
 * Compound match
 *
 * @returns The compound's specificity if it matches the node, else `null`.
 * Supports `:root`, classes, attribute equality and `:is()`; anything else
 * never matches, which only ever drops a rule this file does not exercise.
 */
const matchCompound = (compound: string, node: Node): number | null => {
  let rest = compound;
  let specificity = 0;
  while (rest) {
    let match: RegExpMatchArray | null;
    if ((match = rest.match(/^:root/))) {
      if (!node.root) return null;
      specificity += 1;
    } else if ((match = rest.match(/^\.([\w-]+)/))) {
      if (!node.classes?.includes(match[1]!)) return null;
      specificity += 1;
    } else if ((match = rest.match(/^\[([\w-]+)(?:="([^"]*)")?\]/))) {
      const value = node.attrs?.[match[1]!];
      if (value === undefined || (match[2] !== undefined && value !== match[2])) return null;
      specificity += 1;
    } else if (rest.startsWith(":is(")) {
      let depth = 0;
      let end = 3;
      for (; end < rest.length; end++) {
        if (rest[end] === "(") depth++;
        else if (rest[end] === ")" && --depth === 0) break;
      }
      const inner = splitTop(rest.slice(4, end), /,/).map((option) => matchCompound(option, node));
      const best = Math.max(...inner.map((score) => score ?? -1));
      if (best < 0) return null;
      specificity += best;
      match = [rest.slice(0, end + 1)] as unknown as RegExpMatchArray;
    } else return null;
    rest = rest.slice(match[0]!.length);
  }
  return specificity;
};

/** Specificity of a complex selector (descendant combinators only) matched against the chain's last node, or `null`. */
const matchSelector = (selector: string, chain: Node[]): number | null => {
  const compounds = splitTop(selector, /\s/);
  if (compounds.some((compound) => /^[>+~]$/.test(compound))) return null;
  const last = matchCompound(compounds.at(-1)!, chain.at(-1)!);
  if (last === null) return null;
  let total = last;
  let at = chain.length - 2;
  for (let index = compounds.length - 2; index >= 0; index--) {
    let found: number | null = null;
    while (at >= 0 && found === null) found = matchCompound(compounds[index]!, chain[at--]!);
    if (found === null) return null;
    total += found;
  }
  return total;
};

/** Substitutes every `var()` in a value, or returns `null` when one cannot resolve. */
const substitute = (value: string, lookup: (name: string) => string | null): string | null => {
  const start = value.indexOf("var(");
  if (start < 0) return value;
  let depth = 0;
  let end = start + 3;
  for (; end < value.length; end++) {
    if (value[end] === "(") depth++;
    else if (value[end] === ")" && --depth === 0) break;
  }
  const args = value.slice(start + 4, end);
  const comma = args.indexOf(",");
  let replacement = lookup((comma < 0 ? args : args.slice(0, comma)).trim());
  if (replacement === null && comma >= 0) replacement = substitute(args.slice(comma + 1).trim(), lookup);
  if (replacement === null) return null;
  return substitute(value.slice(0, start) + replacement + value.slice(end + 1), lookup);
};

/**
 * Resolves a custom property on the last node of a chain.
 *
 * @param css - Every stylesheet in play, in cascade order.
 * @param chain - The elements from `<html>` down to the one queried.
 * @param name - The custom property.
 * @returns Its computed value, or `null` when it is unset.
 */
const computed = (css: string, chain: Node[], name: string): string | null => {
  const rules = parse(css);
  const memo = new Map<string, string | null>();
  const at = (depth: number, property: string, seen = new Set<string>()): string | null => {
    if (depth < 0) return null;
    const key = `${depth}|${property}`;
    if (memo.has(key)) return memo.get(key)!;
    const node = chain[depth]!;
    let declared: string | undefined = node.style?.[property];
    if (declared === undefined) {
      let best: { specificity: number; order: number; value: string } | undefined;
      for (const rule of rules) {
        const value = rule.declarations.filter(([candidate]) => candidate === property).at(-1)?.[1];
        if (value === undefined) continue;
        for (const selector of rule.selectors) {
          const specificity = matchSelector(selector, chain.slice(0, depth + 1));
          if (specificity === null) continue;
          if (!best || specificity > best.specificity || (specificity === best.specificity && rule.order >= best.order)) {
            best = { specificity, order: rule.order, value };
          }
        }
      }
      declared = best?.value;
    }
    let result: string | null;
    if (declared === undefined) result = at(depth - 1, property);
    else if (seen.has(property)) result = null;
    else {
      const next = new Set(seen).add(property);
      // A cycle or an unresolvable reference makes the property invalid at computed-value time.
      result = substitute(declared, (reference) => at(depth, reference, next));
    }
    memo.set(key, result);
    return result;
  };
  return at(chain.length - 1, name);
};

const theme = (name: string) => source(`themes/${name}.css`);
const html = (extra: Partial<Node> = {}): Node => ({ root: true, ...extra });
const table: Node = { classes: ["sdt"], attrs: { "data-size": "default" } };
const wrapper = (style: Record<string, string>, extra: Partial<Node> = {}): Node => ({ style, ...extra });

describe("a wrapper's --ss-* tokens", () => {
  it.each([
    ["sdt", { classes: ["sdt"] }],
    ["sac", { classes: ["sac"] }],
    ["sdp", { classes: ["sdp"] }],
    ["sfu", { classes: ["sfu"] }],
  ])("reach the %s component inside it", (prefix, component) => {
    const chain = [html(), wrapper({ "--ss-accent": "#ff0000", "--ss-radius": "3px" }), component];
    expect(computed(LIBRARY, chain, `--_${prefix}-accent`)).toBe("#ff0000");
    expect(computed(LIBRARY, chain, `--_${prefix}-radius`)).toBe("3px");
  });

  it("do not reach a component outside it", () => {
    expect(computed(LIBRARY, [html(), table], "--_sdt-accent")).toBe("#2563eb");
  });

  it("reach a popup mounted outside its component but inside the wrapper", () => {
    const chain = [html(), wrapper({ "--ss-surface": "#fafafa" }), { classes: ["sac__popup"] }];
    expect(computed(LIBRARY, chain, "--_sac-surface")).toBe("#fafafa");
    expect(computed(LIBRARY, [html(), wrapper({ "--ss-surface": "#fafafa" }), { classes: ["sdp__popup"] }], "--_sdp-surface")).toBe("#fafafa");
  });

  it("reach the danger colour of the autocomplete's and the date picker's invalid state", () => {
    const chain = (prefix: string) => [html(), wrapper({ "--ss-danger": "#b00020" }), { classes: [prefix] }];
    expect(computed(LIBRARY, chain("sac"), "--_sac-danger")).toBe("#b00020");
    expect(computed(LIBRARY, chain("sdp"), "--_sdp-danger")).toBe("#b00020");
    expect(computed(LIBRARY, [html({ classes: ["dark"] }), { classes: ["sdp"] }], "--_sdp-danger")).toBe("#f87171");
  });

  it("reach the table's page-size menu through the table", () => {
    const chain = [html(), wrapper({ "--ss-accent": "#ff0000" }), table, { classes: ["sac"] }, { classes: ["sac__popup"] }];
    expect(computed(LIBRARY, chain, "--_sac-accent")).toBe("#ff0000");
  });
});

describe("a page-wide theme", () => {
  it("still applies to every component", () => {
    const css = `${LIBRARY}\n${theme("ocean")}`;
    for (const prefix of ["sdt", "sac", "sdp", "sfu"]) {
      expect(computed(css, [html(), { classes: [prefix] }], `--_${prefix}-accent`), prefix).toBe("#0369a1");
    }
  });

  it("switches to its dark palette under a dark <html>", () => {
    const css = `${LIBRARY}\n${theme("ocean")}`;
    expect(computed(css, [html({ classes: ["dark"] }), table], "--_sdt-accent")).toBe("#38bdf8");
    expect(computed(css, [html({ attrs: { "data-theme": "dark" } }), { classes: ["sdp"] }], "--_sdp-accent")).toBe("#38bdf8");
  });
});

describe("a dark ancestor", () => {
  it("gives the stock dark palette without a theme", () => {
    expect(computed(LIBRARY, [html(), { classes: ["dark"] }, table], "--_sdt-accent")).toBe("#60a5fa");
    expect(computed(LIBRARY, [html(), { attrs: { "data-theme": "dark" } }, { classes: ["sac__popup"] }], "--_sac-surface")).toBe("#141416");
  });

  it("wins over the light default on the component's own root", () => {
    expect(computed(LIBRARY, [html({ classes: ["dark"] }), table], "--_sdt-surface")).toBe("#141416");
    expect(computed(LIBRARY, [html(), { ...table, classes: ["sdt", "dark"] }], "--_sdt-surface")).toBe("#141416");
  });

  it("still reads a dark wrapper's own --ss-* tokens", () => {
    const chain = [html(), wrapper({ "--ss-accent": "#ffd700" }, { classes: ["dark"] }), table];
    expect(computed(LIBRARY, chain, "--_sdt-accent")).toBe("#ffd700");
  });

  it("is not undone by a light-marked wrapper inside it", () => {
    // The stylesheet has no light rule to match, so the page's dark palette still applies.
    const chain = [html({ attrs: { "data-theme": "dark" } }), wrapper({}, { attrs: { "data-theme": "light" } }), table];
    expect(computed(LIBRARY, chain, "--_sdt-surface")).toBe("#141416");
    expect(computed(LIBRARY, chain, "--_sdt-accent")).toBe("#60a5fa");
  });
});

describe("an app's own component token", () => {
  const override = ":root { --sdt-accent: #008000; --sac-accent: #008000; }";

  it("wins over a page-wide theme, whatever the import order", () => {
    for (const css of [`${override}\n${LIBRARY}\n${theme("ocean")}`, `${LIBRARY}\n${theme("ocean")}\n${override}`]) {
      expect(computed(css, [html(), table], "--_sdt-accent")).toBe("#008000");
      expect(computed(css, [html({ classes: ["dark"] }), table], "--_sdt-accent")).toBe("#008000");
    }
  });

  it("wins over a wrapper's --ss-* tokens", () => {
    const chain = [html(), wrapper({ "--ss-accent": "#ff0000" }), table];
    expect(computed(`${LIBRARY}\n${override}`, chain, "--_sdt-accent")).toBe("#008000");
  });

  it("applies when set on a wrapper or on the component itself", () => {
    expect(computed(LIBRARY, [html(), wrapper({ "--sdt-accent": "#008000" }), table], "--_sdt-accent")).toBe("#008000");
    expect(computed(LIBRARY, [html(), { ...table, style: { "--sdt-accent": "#008000" } }], "--_sdt-accent")).toBe("#008000");
    expect(computed(LIBRARY, [html(), wrapper({ "--sac-surface": "#eeeeee" }), { classes: ["sac"] }, { classes: ["sac__popup"] }], "--_sac-surface")).toBe("#eeeeee");
  });

  it("reaches the components that borrow the table's tokens", () => {
    const chain = [html(), wrapper({ "--sdt-accent": "#008000" }), { classes: ["sdp"] }];
    expect(computed(LIBRARY, chain, "--_sdp-accent")).toBe("#008000");
    expect(computed(LIBRARY, [html(), wrapper({ "--sdt-accent": "#008000" }), { classes: ["sfu"] }], "--_sfu-accent")).toBe("#008000");
  });

  it("reaches the table's page-size menu", () => {
    const chain = [html(), wrapper({ "--sdt-accent": "#008000" }), table, { classes: ["sac"] }];
    expect(computed(LIBRARY, chain, "--_sac-accent")).toBe("#008000");
  });

  it("is not read when set on an inner part", () => {
    const row: Node = { classes: ["sdt__row"], style: { "--sdt-accent": "#008000" } };
    expect(computed(LIBRARY, [html(), table, row], "--_sdt-accent")).toBe("#2563eb");
  });
});
