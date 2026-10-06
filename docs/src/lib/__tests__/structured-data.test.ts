import { describe, expect, it } from "vitest";
import { breadcrumbs, faqPage, softwareSourceCode, techArticle } from "@/lib/structured-data";
import type { Facts } from "@/lib/facts";
import { t } from "@/i18n";

const fixtureFacts: Facts = {
  version: "1.7.0",
  license: "ISC",
  react: ">=18",
  testFiles: 1,
  tests: 1,
  integrationSuites: [],
  bundle: [],
  coverage: [],
  suites: [],
  css: [],
};

describe("softwareSourceCode", () => {
  const data = softwareSourceCode(fixtureFacts) as Record<string, unknown>;

  it("describes the package with its license, version and links", () => {
    expect(data["@context"]).toBe("https://schema.org");
    expect(data["@type"]).toBe("SoftwareSourceCode");
    expect(data.name).toBe("slotsmith");
    expect(data.description).toBe(t("en", "site.positioning"));
    expect(data.license).toBe("https://spdx.org/licenses/ISC.html");
    expect(data.version).toBe("1.7.0");
    expect(data.codeRepository).toBe("https://github.com/tmzm/slotsmith");
    expect(data.sameAs).toContain("https://www.npmjs.com/package/slotsmith");
    expect(data.author).toMatchObject({ "@type": "Person", name: "Tareq Al-Mozayek" });
  });

  it("survives a JSON round trip", () => {
    expect(JSON.parse(JSON.stringify(data))).toEqual(data);
  });
});

describe("softwareSourceCode image", () => {
  it("carries the social image only when one is given", () => {
    expect(softwareSourceCode(fixtureFacts)).not.toHaveProperty("image");
    expect(softwareSourceCode(fixtureFacts, "en", "https://slotsmith.dev/og/index.png")).toMatchObject({ image: "https://slotsmith.dev/og/index.png" });
  });
});

describe("techArticle", () => {
  const base = { title: "Theming", description: "Tokens.", url: "https://slotsmith.dev/theming/", image: "https://slotsmith.dev/og/theming.png", lang: "en" as const };

  it("leaves dateModified out when there is no date", () => {
    expect(techArticle({ ...base, dateModified: null })).not.toHaveProperty("dateModified");
  });

  it("carries the date, headline and language when there is one", () => {
    expect(techArticle({ ...base, dateModified: "2026-10-01T10:00:00+03:00" })).toMatchObject({
      "@type": "TechArticle",
      headline: "Theming",
      image: "https://slotsmith.dev/og/theming.png",
      inLanguage: "en",
      dateModified: "2026-10-01T10:00:00+03:00",
    });
  });
});

describe("breadcrumbs", () => {
  it("numbers the items from 1", () => {
    const list = breadcrumbs([
      { name: "slotsmith", url: "https://slotsmith.dev/" },
      { name: "Theming", url: "https://slotsmith.dev/theming/" },
    ]) as { "@type": string; itemListElement: { position: number; name: string; item: string }[] };
    expect(list["@type"]).toBe("BreadcrumbList");
    expect(list.itemListElement.map((item) => item.position)).toEqual([1, 2]);
    expect(list.itemListElement[1]).toMatchObject({ name: "Theming", item: "https://slotsmith.dev/theming/" });
  });
});

describe("faqPage", () => {
  it("turns each item into a question with an accepted answer", () => {
    const page = faqPage([{ q: "Q?", a: "A." }]) as { "@type": string; mainEntity: { name: string; acceptedAnswer: { text: string } }[] };
    expect(page["@type"]).toBe("FAQPage");
    expect(page.mainEntity[0]!.name).toBe("Q?");
    expect(page.mainEntity[0]!.acceptedAnswer.text).toBe("A.");
  });
});
