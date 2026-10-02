import { beforeAll, describe, expect, it } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Base from "@/layouts/Base.astro";
import { SITE } from "../../../site.config.ts";

let container: AstroContainer;
let html: string;

beforeAll(async () => {
  container = await AstroContainer.create();
  html = await container.renderToString(Base, {
    props: { lang: "en", title: "Page", description: "A page.", path: "/theming/" },
  });
});

describe("Google tags", () => {
  it("loads Tag Manager from the head with the one container id", () => {
    const head = html.slice(0, html.indexOf("</head>"));
    expect(SITE.gtm).toBe("GTM-NV899NTZ");
    expect(head).toContain(`'dataLayer','${SITE.gtm}'`);
    expect(head).toContain("https://www.googletagmanager.com/gtm.js?id=");
    // As early as possible: before the theme script, the title and the stylesheets.
    expect(head.indexOf("googletagmanager")).toBeLessThan(head.indexOf("<title>"));
  });

  it("puts the noscript frame right after the opening body tag", () => {
    const afterBody = html.slice(html.indexOf("<body")).replace(/^<body[^>]*>\s*(<!--.*?-->\s*)?/s, "");
    expect(afterBody.startsWith("<noscript><iframe")).toBe(true);
    expect(html).toContain(`https://www.googletagmanager.com/ns.html?id=${SITE.gtm}`);
    expect(html).not.toContain("GTM-W8Z5FGWX");
  });

  it("carries the Search Console verification tag", () => {
    expect(html).toContain(`<meta name="google-site-verification" content="${SITE.googleSiteVerification}"`);
  });

  it("ships Google's verification file byte for byte", () => {
    const file = readFileSync(resolve(import.meta.dirname, "../../../public/google4048afc7f0404042.html"), "utf8");
    expect(file).toBe("google-site-verification: google4048afc7f0404042.html");
  });
});
