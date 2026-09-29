import { describe, expect, it } from "vitest";
import { sampleNames, sampleSource } from "@/lib/samples";

describe("sampleSource", () => {
  it("reads a sample by its path under samples/, without extension", () => {
    const sample = sampleSource("smoke/hello-table");
    expect(sample.lang).toBe("tsx");
    expect(sample.code).toContain("DataTable");
  });

  it("names the unknown sample", () => {
    expect(() => sampleSource("nope")).toThrow('Unknown sample "nope"');
  });
});

describe("sampleNames", () => {
  it("lists the smoke sample and no config files", () => {
    expect(sampleNames()).toContain("smoke/hello-table");
    expect(sampleNames()).not.toContain("tsconfig");
  });
});
