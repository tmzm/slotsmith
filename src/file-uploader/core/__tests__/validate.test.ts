import { describe, expect, it } from "vitest";
import { formatBytes, isAccepted, isImage, screenFiles } from "../validate";

/**
 * File stub
 *
 * jsdom's File is fine, but these tests only read name, type and size — so a
 * stub keeps them fast and lets size be set without allocating bytes.
 *
 * @param name - The file name.
 * @param type - The MIME type.
 * @param size - The size in bytes.
 * @returns Something shaped like a File.
 */
const file = (name: string, type = "", size = 1024) =>
  ({ name, type, size }) as File;

describe("formatBytes", () => {
  it("uses the largest unit that keeps the number readable", () => {
    expect(formatBytes(900)).toBe("900 B");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(524_288)).toBe("512 KB");
    expect(formatBytes(26_214_400)).toBe("25 MB");
    expect(formatBytes(1_610_612_736)).toBe("1.5 GB");
  });

  it("survives nonsense", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(-5)).toBe("0 B");
    expect(formatBytes(Number.NaN)).toBe("0 B");
  });
});

describe("isAccepted", () => {
  it("accepts everything when no list is given", () => {
    expect(isAccepted(file("a.exe", "application/x-msdownload"), undefined)).toBe(true);
    expect(isAccepted(file("a.exe"), "")).toBe(true);
  });

  it("matches extensions, exact types and wildcards", () => {
    expect(isAccepted(file("photo.PNG", "image/png"), ".png")).toBe(true);
    expect(isAccepted(file("photo.png", "image/png"), "image/*")).toBe(true);
    expect(isAccepted(file("photo.png", "image/png"), "image/png")).toBe(true);
    expect(isAccepted(file("doc.pdf", "application/pdf"), "image/*")).toBe(false);
  });

  it("takes a comma list or an array", () => {
    expect(isAccepted(file("doc.pdf", "application/pdf"), "image/*,.pdf")).toBe(true);
    expect(isAccepted(file("doc.pdf", "application/pdf"), ["image/*", ".pdf"])).toBe(true);
  });

  it("matches a dropped file whose type the browser left blank", () => {
    expect(isAccepted(file("sheet.csv", ""), ".csv")).toBe(true);
    expect(isAccepted(file("sheet.csv", ""), "text/csv")).toBe(false);
  });
});

describe("isImage", () => {
  it("is true only for image types", () => {
    expect(isImage("image/webp")).toBe(true);
    expect(isImage("application/pdf")).toBe(false);
    expect(isImage(undefined)).toBe(false);
  });
});

describe("screenFiles", () => {
  const png = file("a.png", "image/png", 1000);
  const pdf = file("b.pdf", "application/pdf", 1000);
  const huge = file("huge.png", "image/png", 10_000);

  it("keeps everything when there are no constraints", () => {
    expect(screenFiles([png, pdf]).accepted).toEqual([png, pdf]);
  });

  it("refuses the wrong type, with the file named", () => {
    const { accepted, rejected } = screenFiles([png, pdf], { accept: "image/*" });
    expect(accepted).toEqual([png]);
    expect(rejected[0]).toMatchObject({ file: pdf, reason: "type" });
    expect(rejected[0]?.message).toContain("b.pdf");
  });

  it("refuses files that are too large or too small", () => {
    expect(screenFiles([huge], { maxSize: 5120 }).rejected[0]).toMatchObject({ reason: "size-max" });
    expect(screenFiles([png], { minSize: 5120 }).rejected[0]).toMatchObject({ reason: "size-min" });
    expect(screenFiles([huge], { maxSize: 5120 }).rejected[0]?.message).toContain("5 KB");
  });

  it("fills the remaining slots and explains the rest", () => {
    const { accepted, rejected } = screenFiles([png, pdf, huge], { maxFiles: 2 }, 1);
    expect(accepted).toEqual([png]);
    expect(rejected).toHaveLength(2);
    expect(rejected.every((entry) => entry.reason === "count")).toBe(true);
  });

  it("reports rejections in the order the files were dropped", () => {
    const { accepted, rejected } = screenFiles([png, pdf], {
      accept: "image/*",
      validate: (candidate) => (candidate.name.startsWith("a") ? "No files starting with a" : null),
    });
    expect(accepted).toEqual([]);
    expect(rejected.map((entry) => entry.reason)).toEqual(["custom", "type"]);
    expect(rejected[0]?.message).toBe("No files starting with a");
  });

  it("reports the cheapest failing check, so a custom rule never runs on a refused file", () => {
    let ran = false;
    const { rejected } = screenFiles([pdf], {
      accept: "image/*",
      validate: () => {
        ran = true;
        return "custom";
      },
    });
    expect(rejected[0]?.reason).toBe("type");
    expect(ran).toBe(false);
  });

  it("takes translated wording", () => {
    const { rejected } = screenFiles([pdf], { accept: "image/*" }, 0, {
      wrongType: (name) => `${name} غير مسموح`,
      tooLarge: (name, max) => `${name} أكبر من ${max}`,
      tooSmall: (name, min) => `${name} أصغر من ${min}`,
      tooMany: (max) => `الحد ${max}`,
    });
    expect(rejected[0]?.message).toBe("b.pdf غير مسموح");
  });
});
