import { describe, expect, it } from "vitest";
import { createNumber, createPlural } from "../plural";

describe("createPlural", () => {
  it("picks the form the language's own rules select", () => {
    const plural = createPlural("ar");
    const forms = { zero: "z", one: "o", two: "t", few: "f {count}", many: "m {count}", other: "x {count}" };
    expect(plural(0, forms)).toBe("z");
    expect(plural(1, forms)).toBe("o");
    expect(plural(2, forms)).toBe("t");
    expect(plural(5, forms)).toMatch(/^f /);
    expect(plural(11, forms)).toMatch(/^m /);
    expect(plural(100, forms)).toMatch(/^x /);
  });
  it("falls back to `other` when the selected form is not given", () => {
    expect(createPlural("en")(1, { other: "{count} files" })).toBe("1 files");
  });
  it("formats the count for the tag", () => {
    expect(createPlural("ar-EG")(5, { other: "{count}" })).toBe("٥");
    expect(createPlural("en-US")(1500, { other: "{count}" })).toBe("1,500");
  });
  it("falls back to English rules for a tag Intl rejects", () => {
    expect(createPlural("not a tag")(2, { one: "one", other: "{count} many" })).toBe("2 many");
  });
});

describe("createNumber", () => {
  it("formats for the tag", () => {
    expect(createNumber("ar-EG")(12)).toBe("١٢");
    expect(createNumber("en-US")(12)).toBe("12");
  });
});
