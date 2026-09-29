import { describe, expect, it } from "vitest";
import { extractTokens } from "../tokens.ts";

describe("extractTokens", () => {
  it("finds declarations and var() reads, sorted and unique", () => {
    expect(extractTokens(".a{color:var(--sdt-text, var(--ss-text));--sdt-radius:4px}")).toEqual([
      "--sdt-radius",
      "--sdt-text",
      "--ss-text",
    ]);
  });

  it("ignores comments and partial names", () => {
    expect(extractTokens("/* the --sdt-* tokens and --sdt-size-* ones */ .a{width:var(--sdt-w);--other-x:1}")).toEqual(["--sdt-w"]);
  });

  it("dedupes repeats", () => {
    expect(extractTokens(".a{--sfu-gap:1px}.b{gap:var(--sfu-gap)}")).toEqual(["--sfu-gap"]);
  });
});
