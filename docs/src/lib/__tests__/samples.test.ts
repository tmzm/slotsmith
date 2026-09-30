import { describe, expect, it } from "vitest";
import { sampleNames, sampleSource } from "@/lib/samples";

describe("sampleSource", () => {
  it("reads a sample by its path under samples/, without extension", () => {
    const sample = sampleSource("landing/hero-table");
    expect(sample.lang).toBe("tsx");
    expect(sample.code).toContain("DataTable");
  });

  it("names the unknown sample", () => {
    expect(() => sampleSource("nope")).toThrow('Unknown sample "nope"');
  });
});

describe("sampleNames", () => {
  it("lists a sample and no config files", () => {
    expect(sampleNames()).toContain("landing/hero-table");
    expect(sampleNames()).not.toContain("tsconfig");
  });
});
