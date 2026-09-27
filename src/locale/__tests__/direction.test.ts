import { describe, expect, it } from "vitest";
import { directionOf } from "../direction";

describe("directionOf", () => {
  it.each(["ar", "ar-EG", "he", "fa-IR", "ur", "ckb", "AR"])("reads %s as right-to-left", (code) => {
    expect(directionOf(code)).toBe("rtl");
  });
  it.each(["en", "en-US", "fr", "de-AT", "tr", "ku"])("reads %s as left-to-right", (code) => {
    expect(directionOf(code)).toBe("ltr");
  });
  it("falls back to left-to-right for a malformed tag", () => {
    expect(directionOf("")).toBe("ltr");
    expect(directionOf("not a tag")).toBe("ltr");
  });
});
