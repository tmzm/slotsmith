import { describe, expect, it } from "vitest";
import { HASH_ROUTES, netlifyRedirects, resolveHashRedirect } from "@/lib/redirects";

const table: [string, string][] = [
  ["#/", "/"],
  ["#/docs/installation", "/getting-started/"],
  ["#/docs/slots", "/guides/"],
  ["#/docs/theming", "/theming/"],
  ["#/docs/locales", "/languages/"],
  ["#/docs/ai-tools", "/ai-tools/"],
  ["#/docs/data-table", "/components/data-table/"],
  ["#/docs/file-uploader", "/components/file-uploader/"],
  ["#/docs/autocomplete", "/components/autocomplete/"],
  ["#/docs/date-picker", "/components/date-picker/"],
  ["#/docs/author", "/about/"],
  ["#/anything/else", "/"],
];

describe("resolveHashRedirect", () => {
  it.each(table)("%s -> %s", (hash, target) => {
    expect(resolveHashRedirect(hash)).toBe(target);
  });

  it("ignores a trailing slash and a query", () => {
    expect(resolveHashRedirect("#/docs/data-table/")).toBe("/components/data-table/");
    expect(resolveHashRedirect("#/docs/data-table?tab=mui")).toBe("/components/data-table/");
  });

  it("sends an unknown docs route home", () => {
    expect(resolveHashRedirect("#/docs/unknown")).toBe("/");
  });

  it("leaves empty and in-page hashes alone", () => {
    expect(resolveHashRedirect("")).toBeNull();
    expect(resolveHashRedirect("#")).toBeNull();
    expect(resolveHashRedirect("#content")).toBeNull();
    expect(resolveHashRedirect("#install")).toBeNull();
  });

  it("does not follow inherited object keys", () => {
    expect(resolveHashRedirect("#/docs/constructor")).toBe("/");
  });
});

describe("netlifyRedirects", () => {
  const body = netlifyRedirects();

  it("emits both slash forms for every route", () => {
    expect(body).toContain("/docs/autocomplete  /components/autocomplete/  301");
    expect(body).toContain("/docs/autocomplete/  /components/autocomplete/  301");
    for (const key of Object.keys(HASH_ROUTES).filter(Boolean)) {
      expect(body).toContain(`/docs/${key}  ${HASH_ROUTES[key]}  301`);
    }
  });

  it("keeps the domain rule commented out", () => {
    expect(body).toContain("# https://slotsmith-docs.netlify.app/* https://slotsmith.dev/:splat 301!");
    expect(body).not.toMatch(/^https:/m);
  });
});
