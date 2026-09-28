/** @vitest-environment node */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";

const SHEETS = ["autocomplete", "data-table", "date-picker", "file-uploader"];

it.each(SHEETS)("%s switches to dark with the page, not the system", (folder) => {
  const css = readFileSync(resolve(process.cwd(), "src", folder, "styles.css"), "utf8");
  expect(css).not.toContain("prefers-color-scheme");
  expect(css).toMatch(/\[data-theme="dark"\]/);
});

/**
 * Stylesheets whose fallbacks render a native `<select>`, and the token
 * prefix each one's rules are written against.
 */
const SELECT_SHEETS = [
  { folder: "data-table", prefix: "rdt", selectClass: "rdt__select" },
  { folder: "date-picker", prefix: "sdp", selectClass: "sdp__select" },
];

/**
 * Pulls the declaration block for the first rule whose selector is exactly
 * `selector` (not a descendant or pseudo-class variant sharing the prefix).
 */
function ruleBlock(css: string, selector: string): string {
  const escaped = selector.replace(/[.]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`));
  if (!match || match[1] === undefined) {
    throw new Error(`no rule found for ${selector}`);
  }
  return match[1];
}

it.each(SELECT_SHEETS)(
  "$folder's native select uses the component's tokens, not the browser's light default",
  ({ folder, prefix, selectClass }) => {
    const css = readFileSync(resolve(process.cwd(), "src", folder, "styles.css"), "utf8");

    const selectRule = ruleBlock(css, `.${selectClass}`);
    expect(selectRule).not.toMatch(/background(-color)?:\s*transparent/);
    expect(selectRule).toMatch(new RegExp(`background(-color)?:\\s*var\\(--${prefix}-surface`));

    const optionRule = ruleBlock(css, `.${selectClass} option`);
    expect(optionRule).not.toMatch(/color:\s*initial/);
    expect(optionRule).toMatch(new RegExp(`color:\\s*var\\(--${prefix}-text`));
    expect(optionRule).toMatch(new RegExp(`background-color:\\s*var\\(--${prefix}-surface`));

    // The dark switch must set color-scheme so the browser paints the native
    // popup and scrollbar dark; the light default must not force a scheme on
    // the host page's :root.
    const rootRule = ruleBlock(css, ":root");
    expect(rootRule).not.toMatch(/color-scheme/);
    expect(css).toMatch(/\.dark,\s*\n?\s*\[data-theme="dark"\][\s\S]*?color-scheme:\s*dark/);
  }
);
