import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
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
    expect(result).toEqual({ status: "would-refuse", path: edited, changedLines: 2 });
    expect(writeFileSafely(edited, "one\n", { force: true, dryRun: true })).toEqual({
      status: "would-overwrite",
      path: edited,
      changedLines: 2,
    });
    expect(readFileSync(edited, "utf8")).toBe("edited\n");
  });

  it("compares through normalize and leaves an equal file untouched", () => {
    const path = join(dir, "file.tsx");
    writeFileSync(path, "# old\nbody\n");
    const normalize = (text: string) => text.replace(/^#.*\n/, "");
    expect(writeFileSafely(path, "# new\nbody\n", { force: false, dryRun: false, normalize }).status).toBe("unchanged");
    expect(readFileSync(path, "utf8")).toBe("# old\nbody\n");
    expect(writeFileSafely(path, "# new\nbody!\n", { force: false, dryRun: false, normalize })).toEqual({
      status: "refused",
      path,
      changedLines: 2,
    });
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

  it("rejects a junction or symbolic link that leads outside", (context) => {
    const outside = mkdtempSync(join(tmpdir(), "slotsmith-outside-"));
    try {
      try {
        symlinkSync(outside, join(dir, "link"), "junction");
      } catch {
        context.skip();
      }
      expect(resolveInside(dir, "link")).toBeUndefined();
      expect(resolveInside(dir, "link/components")).toBeUndefined();
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it("rejects a target that is itself a symbolic link", (context) => {
    writeFileSync(join(dir, "real.tsx"), "x");
    try {
      symlinkSync(join(dir, "real.tsx"), join(dir, "link.tsx"), "file");
    } catch {
      context.skip();
    }
    expect(resolveInside(dir, "link.tsx")).toBeUndefined();
    expect(resolveInside(dir, "real.tsx")).toBe(join(dir, "real.tsx"));
  });
});
