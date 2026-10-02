import { beforeAll, describe, expect, it } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
// jsdom ships no types; the repo root has it as a dev dependency.
// @ts-expect-error -- untyped module
import { JSDOM } from "jsdom";
import CopyMarkdown from "@/components/CopyMarkdown.astro";
import Faq from "@/components/Faq.astro";
import JsonLd from "@/components/JsonLd.astro";
import LastUpdated from "@/components/LastUpdated.astro";
import { landingFaq } from "@/data/faq";
import { t } from "@/i18n";
import { faqPage } from "@/lib/structured-data";

let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create();
});

const dom = (html: string) => new JSDOM(`<body>${html}</body>`).window.document as Document;
const text = (node: Element | null | undefined) => (node?.textContent ?? "").replace(/\s+/g, " ").trim();

describe("JsonLd", () => {
  it("writes one parseable script per object, and no string can close the script", async () => {
    const data = [{ "@type": "Thing", name: "</script><b>x</b>" }, { "@type": "Other" }];
    const html = await container.renderToString(JsonLd, { props: { data } });
    expect(html).not.toContain("</script><b>");
    const scripts = [...dom(html).querySelectorAll('script[type="application/ld+json"]')];
    expect(scripts).toHaveLength(2);
    expect(scripts.map((script) => JSON.parse(script.textContent ?? ""))).toEqual(data);
  });
});

describe("Faq", () => {
  it("shows the same questions and answers, in order, that its FAQPage markup carries", async () => {
    const items = landingFaq("en");
    const doc = dom(await container.renderToString(Faq, { props: { items, lang: "en" } }));
    expect(doc.querySelector("section#faq > h2")?.textContent).toBe("FAQ");
    const markup = (faqPage(items) as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] }).mainEntity;
    expect([...doc.querySelectorAll("details > summary")].map(text)).toEqual(markup.map((question) => question.name));
    expect([...doc.querySelectorAll(".faq__answer > p:first-child")].map(text)).toEqual(markup.map((question) => question.acceptedAnswer.text));
    expect(items.length).toBeGreaterThanOrEqual(6);
  });

  it("links each answer to the page in the reader's language", async () => {
    const doc = dom(await container.renderToString(Faq, { props: { items: landingFaq("ar"), lang: "ar" } }));
    const hrefs = [...doc.querySelectorAll(".faq__more a")].map((a) => a.getAttribute("href"));
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) expect(href).toMatch(/^\/ar\//);
  });
});

describe("CopyMarkdown", () => {
  it("is a hidden-until-scripted button and a plain link, both labelled in the page's language", async () => {
    const doc = dom(await container.renderToString(CopyMarkdown, { props: { lang: "ar", href: "/ar/theming/index.md" } }));
    const button = doc.querySelector("button");
    expect(button?.getAttribute("type")).toBe("button");
    expect(button?.hasAttribute("hidden")).toBe(true);
    expect(text(button)).toBe(t("ar", "common.copyMarkdown"));
    const link = doc.querySelector("a");
    expect(link?.getAttribute("href")).toBe("/ar/theming/index.md");
    expect(text(link)).toBe(t("ar", "common.viewMarkdown"));
    expect(doc.querySelector('[role="status"]')).not.toBeNull();
  });
});

describe("LastUpdated", () => {
  it("renders nothing without a date", async () => {
    expect((await container.renderToString(LastUpdated, { props: { lang: "en", date: null } })).trim()).toBe("");
  });

  it("shows the date in the page's language with a machine-readable time", async () => {
    const date = "2026-09-30T12:00:00+03:00";
    const en = dom(await container.renderToString(LastUpdated, { props: { lang: "en", date } }));
    expect(text(en.querySelector("p"))).toBe("Last updated September 30, 2026");
    expect(en.querySelector("time")?.getAttribute("datetime")).toBe(date);
    const ar = dom(await container.renderToString(LastUpdated, { props: { lang: "ar", date } }));
    expect(text(ar.querySelector("p"))).toContain("آخر تحديث");
    expect(text(ar.querySelector("p"))).toContain("2026");
  });
});
