import { describe, expect, it } from "vitest";
import { codeSegments, exampleArgs, formatDefault, groupProps, isFunctionType, splitParams } from "@/lib/format";

describe("formatDefault", () => {
  it("shows a dash when there is no default", () => {
    expect(formatDefault(undefined)).toBe("—");
    expect(formatDefault("")).toBe("—");
  });

  it("keeps a string literal with its quotes", () => {
    expect(formatDefault('"Retry"')).toBe('"Retry"');
  });

  it("keeps code as it is written", () => {
    expect(formatDefault("{ pageIndex: 0, pageSize: 10 }")).toBe("{ pageIndex: 0, pageSize: 10 }");
  });
});

describe("isFunctionType", () => {
  it("recognises a function signature", () => {
    expect(isFunctionType("(page: number) => string")).toBe(true);
    expect(isFunctionType("(page: number, pageCount: number) => ReactNode")).toBe(true);
    expect(isFunctionType("() => void")).toBe(true);
  });

  it("rejects other types, including unions that contain a function", () => {
    expect(isFunctionType("string")).toBe(false);
    expect(isFunctionType("ReactNode")).toBe(false);
    expect(isFunctionType("boolean | ((row: DataTableRow<T>) => boolean)")).toBe(false);
    expect(isFunctionType("(string | number)[]")).toBe(false);
  });
});

describe("groupProps", () => {
  const props = [
    { name: "a", group: "Sorting" },
    { name: "b", group: "Data" },
    { name: "c" },
    { name: "d", group: "Data" },
    { name: "e", group: "Unknown" },
  ];

  it("keeps the reference's group order and puts ungrouped props last as Other", () => {
    expect(groupProps(props, ["Data", "Sorting"])).toEqual([
      { group: "Data", props: [props[1], props[3]] },
      { group: "Sorting", props: [props[0]] },
      { group: "Other", props: [props[2], props[4]] },
    ]);
  });

  it("drops empty groups", () => {
    expect(groupProps([{ name: "a", group: "Data" }], ["Data", "Sorting"]).map((g) => g.group)).toEqual(["Data"]);
  });
});

describe("splitParams", () => {
  it("splits a signature's parameters at top-level commas", () => {
    expect(splitParams("(page: number, pageCount: number) => ReactNode")).toEqual([
      { name: "page", type: "number" },
      { name: "pageCount", type: "number" },
    ]);
    expect(splitParams("(limits: { accept?: string; maxSize?: string }) => ReactNode")).toEqual([
      { name: "limits", type: "{ accept?: string; maxSize?: string }" },
    ]);
  });
});

describe("exampleArgs", () => {
  it("gives numbers distinct example values in order", () => {
    expect(exampleArgs("(page: number, pageCount: number) => ReactNode")).toEqual([3, 12]);
  });

  it("gives strings a value by parameter name, and fills object parameters member by member", () => {
    expect(exampleArgs("(name: string) => string")).toEqual(["photo.jpg"]);
    expect(exampleArgs("(limits: { accept?: string; maxSize?: string; maxFiles?: number }) => ReactNode")).toEqual([
      { accept: "image/*,.pdf", maxSize: "5 MB", maxFiles: 3 },
    ]);
  });
});

describe("codeSegments", () => {
  it("splits backticked code out of description text", () => {
    expect(codeSegments("Falls back to `row.id`, then the index.")).toEqual([
      { text: "Falls back to ", code: false },
      { text: "row.id", code: true },
      { text: ", then the index.", code: false },
    ]);
  });
});
