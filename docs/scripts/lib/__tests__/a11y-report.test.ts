import { describe, expect, it } from "vitest";
import { A11Y_END_MARKER, A11Y_MARKER, injectA11y, renderA11yTable, type A11yResult } from "../a11y-report.ts";

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
    expect(html).toContain('href="/components/data-table/">');
    expect(html).toContain('href="/ar/components/file-uploader/">');
    expect(html).toContain("data-table/basic");
    expect(html).toContain("<td>31</td>");
    expect(html).toContain("<code>color-contrast</code> (serious, 2)</span>");
  });

  it("lists known library issues with their reasons, escaped", () => {
    const html = renderA11yTable(results, "en", "4.11.0");
    expect(html).toContain("1 known library issue on 1 demo,");
    expect(html).toContain("nested-interactive");
    expect(html).toContain("holds the Browse &lt;button&gt;.");
  });

  it("states the known issues right under the summary, above the table", () => {
    const html = renderA11yTable(results, "en", "4.11.0");
    expect(html.indexOf("WCAG 2.2 AA")).toBeLessThan(html.indexOf("known library issue"));
    expect(html.indexOf("known library issue")).toBeLessThan(html.indexOf("<table"));
    expect(renderA11yTable([results[0]!], "en", "4.11.0")).not.toContain("known library issue");
  });

  it("counts distinct known issues and the demos they are on, not flagged elements", () => {
    const zone = results[1]!.knownLibraryIssues![0]!;
    const clear = { rule: "target-size", target: ".sac__clear", reason: "The clear button is 20px square." };
    const many: A11yResult[] = [
      { ...results[1]!, knownLibraryIssues: [zone, { ...zone, target: ".other .sfu__zone" }] },
      { ...results[1]!, sample: "file-uploader/multiple", knownLibraryIssues: [zone, clear, { ...clear, target: ".x .sac__clear" }] },
      results[0]!,
    ];
    const html = renderA11yTable(many, "en", "4.11.0");
    expect(html).toContain("2 known library issues on 2 demos,");
    expect(html.match(/<li>/g)).toHaveLength(2);
  });

  it("writes the Arabic labels on the Arabic page", () => {
    const html = renderA11yTable(results, "ar", "4.11.0");
    expect(html).toContain("عروض البدائل الافتراضية: 2");
    expect(html).toContain("لا يوجد");
    expect(html).toContain("4.11.0");
    expect(html).not.toContain("fallback demos");
  });

  it("states its own language and direction, whatever the page around it", () => {
    const arabic = renderA11yTable(results, "ar", "4.11.0");
    expect(arabic).toMatch(/^<div class="a11y-results" lang="ar" dir="rtl">/);
    expect(renderA11yTable(results, "en", "4.11.0")).toMatch(/^<div class="a11y-results" lang="en" dir="ltr">/);
    // Sample names, page paths and axe's rule ids are Latin: left to right inside the Arabic table.
    expect(arabic).toContain('<td><bdi dir="ltr"><code>data-table/basic</code></bdi></td>');
    expect(arabic).toContain('<td><a dir="ltr" href="/components/data-table/">');
    expect(arabic).toContain('<span lang="en" dir="ltr"><code>color-contrast</code>');
    expect(arabic).toContain('<ul lang="en" dir="ltr">');
  });
});

describe("injectA11y", () => {
  it("throws when the page has no marker", () => {
    expect(() => injectA11y("<main><h2>Tests</h2></main>", "<table></table>")).toThrow(/a11y-results/);
  });

  const pair = `${A11Y_MARKER}${A11Y_END_MARKER}`;

  it("throws when the end marker is missing", () => {
    expect(() => injectA11y(`<main>${A11Y_MARKER}</main>`, "<table></table>")).toThrow("/a11y-results");
    expect(() => injectA11y(`<main>${A11Y_END_MARKER}${A11Y_MARKER}</main>`, "<table></table>")).toThrow("/a11y-results");
  });

  it("puts the table between the first pair of markers, exactly once, and keeps them", () => {
    const html = `<main>${pair}<p>${pair}</p></main>`;
    expect(injectA11y(html, "<table>$&</table>")).toBe(`<main>${A11Y_MARKER}<table>$&</table>${A11Y_END_MARKER}<p>${pair}</p></main>`);
  });

  it("replaces the first injection on a second run", () => {
    const first = injectA11y(`<main>${pair}</main>`, "<table>first</table>");
    const second = injectA11y(first, "<table>second</table>");
    expect(second).toBe(`<main>${A11Y_MARKER}<table>second</table>${A11Y_END_MARKER}</main>`);
    expect(injectA11y(second, "<table>second</table>")).toBe(second);
  });
});
