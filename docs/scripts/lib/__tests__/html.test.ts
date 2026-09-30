import { describe, expect, it } from "vitest";
import { SITE } from "../../../site.config.ts";
import { findDeadLinks, findMetaProblems, findUnusedSamples, readPage, type PageFacts } from "../html.ts";

function doc(path: string, { title = "Theming · slotsmith", description = "How to theme.", body = "", stub = false } = {}) {
  const ar = path.startsWith("/ar/");
  const neutral = ar ? path.slice(3) : path;
  return `<!DOCTYPE html><html lang="${ar ? "ar" : "en"}"><head>
<meta charset="utf-8" />
<title>${title}</title>
<meta name="description" content="${description}" />
<link rel="canonical" href="${SITE.url}${path}" />
<link rel="alternate" hreflang="en" href="${SITE.url}${neutral}" />
<link rel="alternate" hreflang="ar" href="${SITE.url}/ar${neutral}" />
<link rel="alternate" hreflang="x-default" href="${SITE.url}${neutral}" />
<meta property="og:image" content="${SITE.url}/og/theming.png" />
<script>const a = '<a href="/nope/">'; const b = 'id="fake"';</script>
<style>.x::after { content: '<a href="/css/">' }</style>
</head><body>
<a class="skip" href="#content">Skip</a>
<main id="content" tabindex="-1"${stub ? ' data-stub="true"' : ""}>
${body}
</main></body></html>`;
}

function facts(path: string, over: Partial<PageFacts> = {}): PageFacts {
  return {
    path,
    title: `${path} title`,
    description: `${path} description`,
    canonical: SITE.url + path,
    ogImage: null,
    alternates: ["en", "ar", "x-default"],
    links: [],
    ids: [],
    samples: [],
    stub: false,
    ...over,
  };
}

describe("readPage", () => {
  const html = doc("/theming/", {
    title: "Theming &amp; tokens · slotsmith",
    body: `
      <h2 id="tokens"><a href="#tokens">Tokens</a></h2>
      <a href="/components/data-table/#install">Install</a>
      <a href="/theming/?x=1#modes">Modes</a>
      <a href="https://github.com/tmzm/slotsmith">GitHub</a>
      <a href="${SITE.url}/about/">About</a>
      <a href="mailto:x@example.com">Mail</a>
      <a href="guides/">Relative</a>
      <figure class="panel" data-sample="data-table/quick-start" data-fallback="true"></figure>
      <div class="panel sample-code" data-sample='theming/tokens'></div>
    `,
  });
  const page = readPage("/theming/", html);

  it("reads the head", () => {
    expect(page.path).toBe("/theming/");
    expect(page.title).toBe("Theming & tokens · slotsmith");
    expect(page.description).toBe("How to theme.");
    expect(page.canonical).toBe(`${SITE.url}/theming/`);
    expect(page.ogImage).toBe(`${SITE.url}/og/theming.png`);
    expect(page.alternates).toEqual(["en", "ar", "x-default"]);
  });

  it("keeps internal links as path plus hash, resolving in-page and relative ones", () => {
    expect(page.links).toEqual([
      "/theming/#content",
      "/theming/#tokens",
      "/components/data-table/#install",
      "/theming/#modes",
      "/about/",
      "/theming/guides/",
    ]);
  });

  it("collects ids and sample names, and ignores script and style text", () => {
    expect(page.ids).toEqual(["content", "tokens"]);
    expect(page.samples).toEqual(["data-table/quick-start", "theming/tokens"]);
    expect(page.links).not.toContain("/nope/");
  });

  it("reads the stub marker", () => {
    expect(page.stub).toBe(false);
    expect(readPage("/roadmap/", doc("/roadmap/", { stub: true })).stub).toBe(true);
  });

  it("returns null when there is no og:image", () => {
    expect(readPage("/x/", "<html><head><title>x</title></head></html>").ogImage).toBeNull();
  });
});

describe("findMetaProblems", () => {
  it("passes a clean set", () => {
    expect(findMetaProblems([facts("/"), facts("/theming/")])).toEqual([]);
  });

  it("reports a duplicate title once, naming both paths", () => {
    const problems = findMetaProblems([facts("/a/", { title: "Same" }), facts("/b/", { title: "Same" })]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("/a/");
    expect(problems[0]).toContain("/b/");
    expect(problems[0]).toMatch(/title/);
  });

  it("allows an Arabic page to share its English twin's title and description", () => {
    const shared = { title: "Theming", description: "How to theme." };
    expect(findMetaProblems([facts("/theming/", shared), facts("/ar/theming/", shared)])).toEqual([]);
  });

  it("reports empty and duplicate descriptions, a wrong canonical and missing alternates", () => {
    const problems = findMetaProblems([
      facts("/a/", { description: "" }),
      facts("/b/", { description: "Dup" }),
      facts("/c/", { description: "Dup" }),
      facts("/d/", { canonical: `${SITE.url}/elsewhere/` }),
      facts("/e/", { alternates: ["en", "ar"] }),
      facts("/f/", { title: " " }),
    ]);
    expect(problems.some((p) => p.includes("/a/") && /empty description/.test(p))).toBe(true);
    expect(problems.some((p) => p.includes("/b/") && p.includes("/c/") && /description/.test(p))).toBe(true);
    expect(problems.some((p) => p.includes("/d/") && /canonical/.test(p))).toBe(true);
    expect(problems.some((p) => p.includes("/e/") && p.includes("x-default"))).toBe(true);
    expect(problems.some((p) => p.includes("/f/") && /empty title/.test(p))).toBe(true);
  });
});

describe("findDeadLinks", () => {
  const theming = facts("/theming/", { ids: ["content", "tokens"] });

  it("reports an anchor the target page does not have", () => {
    const problems = findDeadLinks([theming, facts("/", { links: ["/theming/#nope"] })]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("/theming/#nope");
    expect(problems[0]).toContain("on /");
  });

  it("accepts an anchor the target page has, and in-page anchors", () => {
    expect(findDeadLinks([theming, facts("/", { links: ["/theming/#tokens", "/theming/"] })])).toEqual([]);
    expect(findDeadLinks([facts("/theming/", { ids: ["content"], links: ["/theming/#content"] })])).toEqual([]);
  });

  it("reports a link to a path with no page, unless it is a known file", () => {
    const page = facts("/", { links: ["/nowhere/", "/theming", "/llms.txt"] });
    const problems = findDeadLinks([theming, page], new Set(["/llms.txt"]));
    expect(problems).toHaveLength(2);
    expect(problems.join("\n")).toContain("/nowhere/");
    expect(problems.join("\n")).toContain("/theming ");
  });

  it("matches a percent-encoded Arabic anchor to its raw id", () => {
    const ar = readPage("/ar/theming/", doc("/ar/theming/", { body: '<h2 id="تنسيق-الجدول"></h2><a href="#تنسيق-الجدول">x</a>' }));
    expect(ar.links).toContain("/ar/theming/#%D8%AA%D9%86%D8%B3%D9%8A%D9%82-%D8%A7%D9%84%D8%AC%D8%AF%D9%88%D9%84");
    expect(findDeadLinks([ar])).toEqual([]);
  });

  it("reports a malformed percent escape in an anchor as dead instead of throwing", () => {
    const problems = findDeadLinks([theming, facts("/", { links: ["/theming/#bad%E0%A4%A"] })]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("/theming/#bad%E0%A4%A");
  });

  it("ignores external links, which readPage never keeps", () => {
    const page = readPage("/", doc("/", { body: '<a href="https://example.com/x/#y">x</a>' }));
    expect(findDeadLinks([page])).toEqual([]);
  });
});

describe("findUnusedSamples", () => {
  it("lists the names no page shows, sorted", () => {
    const pages = [facts("/", { samples: ["landing/hero-table"] }), facts("/ar/", { samples: ["landing/hero-table"] })];
    expect(findUnusedSamples(pages, ["z/unused", "landing/hero-table", "a/unused"])).toEqual(["a/unused", "z/unused"]);
  });
});
