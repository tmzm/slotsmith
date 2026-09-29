import { describe, expect, it } from "vitest";
import type { ComponentSlug } from "@/data/components";
import { getReference } from "@/lib/reference";

describe("getReference", () => {
  it("names the command to run when the data is missing", () => {
    expect(() => getReference("nope" as ComponentSlug)).toThrow(/"nope".*pnpm --filter slotsmith-docs reference/);
  });
});
