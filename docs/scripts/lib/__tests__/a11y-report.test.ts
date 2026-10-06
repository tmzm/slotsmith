import { describe, expect, it } from "vitest";
import { A11Y_MARKER, injectA11y, renderA11yTable, type A11yResult } from "../a11y-report.ts";

const results: A11yResult[] = [
  { page: "/components/data-table/", sample: "data-table/basic", violations: [], passes: 31 },
  {
    page: "/ar/components/file-uploader/",
    sample: "file-uploader/basic",
    violations: [{ id: "color-contrast", impact: "serious", nodes: 2 }],
    passes: 28,
    knownLibraryIssues: [{ rule: "nested-interactive", target: ".sfu__zone", reason: "The dropzone holds the Browse <button>." }],
  },
];

describe("renderA11yTable", () => {
  it("opens with a summary line counting demos and violations, with the axe version and standard", () => {
    const html = renderA11yTable(results, "en", "4.11.0");
    expect(html).toContain("2 fallback demos, 1 violation, axe-core 4.11.0, WCAG 2.2 AA");
    expect(html.indexOf("fallback demos")).toBeLessThan(html.indexOf("<table"));
  });

  it("uses the plural for more than one violation", () => {
    const two = [...results, { ...results[1]!, sample: "file-uploader/multiple" }];
    expect(renderA11yTable(two, "en", "4.11.0")).toContain("3 fallback demos, 2 violations,");
  });

  it("has one row per sample, linking to its page", () => {
    const html = renderA11yTable(results, "en", "4.11.0");
    expect(html.match(/<tr>/g)).toHaveLength(results.length + 1);
    expect(html).toContain('<a href="/components/data-table/">');
    expect(html).toContain('<a href="/ar/components/file-uploader/">');
    expect(html).toContain("data-table/basic");
    expect(html).toContain("<td>31</td>");
    expect(html).toContain("<code>color-contrast</code> (serious, 2)");
  });

  it("lists known library issues with their reasons, escaped", () => {
    const html = renderA11yTable(results, "en", "4.11.0");
    expect(html).toContain("1 known library issue");
    expect(html).toContain("nested-interactive");
    expect(html).toContain("holds the Browse &lt;button&gt;.");
  });

  it("writes the Arabic labels on the Arabic page", () => {
    const html = renderA11yTable(results, "ar", "4.11.0");
    expect(html).toContain("العرض");
    expect(html).toContain("4.11.0");
    expect(html).not.toContain("fallback demos");
  });
});

describe("injectA11y", () => {
  it("throws when the page has no marker", () => {
    expect(() => injectA11y("<main><h2>Tests</h2></main>", "<table></table>")).toThrow(/a11y-results/);
  });

  it("replaces the marker exactly once", () => {
    const html = `<main>${A11Y_MARKER}<p>${A11Y_MARKER}</p></main>`;
    expect(injectA11y(html, "<table>$&</table>")).toBe(`<main><table>$&</table><p>${A11Y_MARKER}</p></main>`);
  });
});
