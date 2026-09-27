import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SlotsmithProvider, defineLocale } from "../../locale";
import { FileUploader } from "../FileUploader";
import { defaultValidationLabels } from "../core/validate";
import { defaultFileUploaderLabels } from "../slots/fallbacks";
import { dropFiles, dropzone, makeFile } from "./builders";

const nl = defineLocale({
  code: "nl",
  fileUploader: { ...defaultFileUploaderLabels, browse: "Bladeren", retry: "Opnieuw uploaden" },
  fileValidation: { ...defaultValidationLabels, tooLarge: (name, max) => `${name} is te groot (max ${max})` },
});

describe("file uploader locale", () => {
  it("renders English with no locale", () => {
    render(<FileUploader />);
    expect(screen.getByText("Browse")).toBeInTheDocument();
  });
  it("takes a locale object", () => {
    render(<FileUploader locale={nl} />);
    expect(screen.getByText("Bladeren")).toBeInTheDocument();
  });
  it("reads the provider's locale", () => {
    render(<SlotsmithProvider locale="nl-BE" locales={[nl]}><FileUploader /></SlotsmithProvider>);
    expect(screen.getByText("Bladeren")).toBeInTheDocument();
  });
  it("lets the labels prop win over the locale", () => {
    render(<FileUploader locale={nl} labels={{ browse: "Kiezen" }} />);
    expect(screen.getByText("Kiezen")).toBeInTheDocument();
  });
  it("falls back to English for a key the locale lacks", () => {
    const { browse: _browse, ...rest } = nl.fileUploader as typeof defaultFileUploaderLabels;
    const old = { ...nl, fileUploader: rest } as unknown as typeof nl;
    render(<FileUploader locale={old} />);
    expect(screen.getByText("Browse")).toBeInTheDocument();
  });
  it("stays English and warns once when a tag has no pack", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<FileUploader locale="de" />);
    expect(screen.getByText("Browse")).toBeInTheDocument();
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
  it("refuses a file with the locale's validation text", async () => {
    render(<FileUploader locale={nl} maxSize={4} />);
    await dropFiles(dropzone(), [makeFile("big.png", "image/png", 100)]);
    expect(within(screen.getByRole("status")).getByText(/big\.png is te groot \(max 4 B\)/)).toBeInTheDocument();
  });
  it("formats sizes with the locale's digits", () => {
    const ar = defineLocale({ code: "ar-EG" });
    render(<FileUploader locale={ar} maxSize={1536} />);
    expect(screen.getByText(/١٫٥ KB/)).toBeInTheDocument();
  });
});
