import { describe, expect, it } from "vitest";
import { DataTable } from "slotsmith/data-table";
import { ar } from "slotsmith/locales/ar";
import { SITE } from "../../../site.config";

describe("workspace aliases", () => {
  it("resolves the library source", () => {
    expect(DataTable).toBeDefined();
    expect(ar).toBeDefined();
  });

  it("has a site url without a trailing slash", () => {
    expect(SITE.url.endsWith("/")).toBe(false);
  });
});
