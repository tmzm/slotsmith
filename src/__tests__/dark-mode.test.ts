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
