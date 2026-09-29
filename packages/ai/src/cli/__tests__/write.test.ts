import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveInside, writeFileSafely } from "../write";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "slotsmith-write-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("writeFileSafely", () => {
  it("creates a missing file and its parent folders", () => {
    const path = join(dir, "a", "b", "file.tsx");
    const result = writeFileSafely(path, "one\ntwo\n", { force: false, dryRun: false });
    expect(result).toEqual({ status: "created", path });
    expect(readFileSync(path, "utf8")).toBe("one\ntwo\n");
  });

  it("leaves identical content alone", () => {
    const path = join(dir, "file.tsx");
    writeFileSync(path, "one\ntwo\n");
    expect(writeFileSafely(path, "one\ntwo\n", { force: false, dryRun: false }).status).toBe("unchanged");
  });

  it("treats a CRLF checkout of the same content as unchanged", () => {
    const path = join(dir, "file.tsx");
    writeFileSync(path, "one\r\ntwo\r\n");
    expect(writeFileSafely(path, "one\ntwo\n", { force: false, dryRun: false }).status).toBe("unchanged");
    expect(readFileSync(path, "utf8")).toBe("one\r\ntwo\r\n");
  });

  it("refuses different content and counts the lines that differ", () => {
    const path = join(dir, "file.tsx");
    writeFileSync(path, "one\nTWO\nthree\nextra\n");
    const result = writeFileSafely(path, "one\ntwo\nthree\n", { force: false, dryRun: false });
    expect(result).toEqual({ status: "refused", path, changedLines: 3 });
    expect(readFileSync(path, "utf8")).toBe("one\nTWO\nthree\nextra\n");
  });

  it("overwrites different content with force", () => {
    const path = join(dir, "file.tsx");
    writeFileSync(path, "edited\n");
    const result = writeFileSafely(path, "one\n", { force: true, dryRun: false });
    expect(result.status).toBe("overwritten");
    expect(readFileSync(path, "utf8")).toBe("one\n");
  });

  it("never writes on a dry run", () => {
    const missing = join(dir, "x", "missing.tsx");
    expect(writeFileSafely(missing, "one\n", { force: false, dryRun: true }).status).toBe("would-create");
    expect(existsSync(join(dir, "x"))).toBe(false);

    const edited = join(dir, "edited.tsx");
    writeFileSync(edited, "edited\n");
    const result = writeFileSafely(edited, "one\n", { force: false, dryRun: true });
    expect(result.status).toBe("would-overwrite");
    expect(result.changedLines).toBe(2);
    expect(readFileSync(edited, "utf8")).toBe("edited\n");
  });
});

describe("resolveInside", () => {
  it("resolves a relative path against the root", () => {
    expect(resolveInside(dir, "src/ui")).toBe(join(dir, "src", "ui"));
    expect(resolveInside(dir, "src\\ui")).toBe(join(dir, "src", "ui"));
    expect(resolveInside(dir, ".")).toBe(dir);
  });

  it("rejects paths that escape the root", () => {
    expect(resolveInside(dir, "../outside")).toBeUndefined();
    expect(resolveInside(dir, "..\\outside")).toBeUndefined();
    expect(resolveInside(dir, "src/../../outside")).toBeUndefined();
    expect(resolveInside(dir, tmpdir())).toBeUndefined();
    expect(resolveInside(dir, join(dir, "src"))).toBe(join(dir, "src"));
  });
});
