import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HASH_ROUTES, resolveHashRedirect } from "@/lib/redirects";

const source = readFileSync(new URL("../../components/HashRedirect.astro", import.meta.url), "utf8");
const body = /<script[^>]*>([\s\S]*?)<\/script>/.exec(source)![1]!;

/** Runs the inline script the way a browser would, returning the replace() target or null. */
function run(hash: string): string | null {
  let target: string | null = null;
  const location = { hash, replace: (to: string) => (target = to) };
  new Function("location", "routes", body)(location, JSON.stringify(HASH_ROUTES));
  return target;
}

describe("inline HashRedirect script", () => {
  const hashes = [
    ...Object.keys(HASH_ROUTES).map((key) => (key ? `#/docs/${key}` : "#/")),
    "#/docs/data-table/",
    "#/docs/data-table?x=1",
    "#/docs/unknown",
    "#/anything/else",
    "#/docs/constructor",
    "#/docs/%",
    "#",
    "",
    "#install",
  ];

  it.each(hashes)("agrees with resolveHashRedirect for %j", (hash) => {
    expect(run(hash)).toBe(resolveHashRedirect(hash));
  });
});
