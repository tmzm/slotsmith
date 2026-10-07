/**
 * Structured data
 *
 * The schema.org objects the pages embed as JSON-LD. Pure: each returns a
 * plain object for `JSON.stringify`, and `JsonLd.astro` writes one
 * `<script type="application/ld+json">` per object. The landing describes the
 * package (`SoftwareSourceCode`) and its FAQ; every other page is a
 * `TechArticle` with its `BreadcrumbList`, plus an `FAQPage` where the page
 * shows an FAQ. The FAQ objects are built from the same items the visible
 * FAQ renders, so the markup cannot say something the page does not.
 */
import { SITE } from "../../site.config.ts";
import type { FaqItem } from "@/data/faq";
import type { Facts } from "@/lib/facts";
import { t, type Lang } from "@/i18n";

const CONTEXT = "https://schema.org";

/**
 * The package as source code: name, positioning, repository, license, version and author.
 *
 * @param facts - The measured facts (version and license).
 * @param lang - The language of the description. Defaults to English.
 * @param image - The absolute URL of the landing's social image, when it has one.
 */
export function softwareSourceCode(facts: Facts, lang: Lang = "en", image?: string): object {
  return {
    "@context": CONTEXT,
    "@type": "SoftwareSourceCode",
    name: "slotsmith",
    description: t(lang, "site.positioning"),
    url: `${SITE.url}/`,
    ...(image ? { image } : {}),
    codeRepository: SITE.repo,
    programmingLanguage: "TypeScript",
    runtimePlatform: "React",
    license: `https://spdx.org/licenses/${facts.license}.html`,
    version: facts.version,
    sameAs: [`https://www.npmjs.com/package/${SITE.npm}`, SITE.repo],
    author: { "@type": "Person", name: SITE.author.name, url: SITE.author.url },
  };
}

/**
 * The site itself, for the landing pages. Search engines take a result's site
 * name from this (it names the site "slotsmith", not its host).
 *
 * @param lang - The page's language.
 */
export function webSite(lang: Lang = "en"): object {
  return {
    "@context": CONTEXT,
    "@type": "WebSite",
    name: "slotsmith",
    alternateName: ["slotsmith.dev", "slotsmith docs"],
    url: `${SITE.url}/`,
    inLanguage: lang,
  };
}

/** A docs page, with its social image. `dateModified` is left out when git has no date for the page; it is never guessed. */
export function techArticle(page: { title: string; description: string; url: string; image: string; lang: Lang; dateModified: string | null }): object {
  return {
    "@context": CONTEXT,
    "@type": "TechArticle",
    headline: page.title,
    description: page.description,
    url: page.url,
    image: page.image,
    inLanguage: page.lang,
    ...(page.dateModified ? { dateModified: page.dateModified } : {}),
    author: { "@type": "Person", name: SITE.author.name, url: SITE.author.url },
    isPartOf: { "@type": "WebSite", name: "slotsmith", url: `${SITE.url}/` },
  };
}

/** The trail from the home page to this one, positions counted from 1. */
export function breadcrumbs(items: { name: string; url: string }[]): object {
  return {
    "@context": CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: item.url })),
  };
}

/** The questions and answers of a page's FAQ, in the order the page shows them. */
export function faqPage(items: FaqItem[]): object {
  return {
    "@context": CONTEXT,
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}
