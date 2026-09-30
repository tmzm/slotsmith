// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ar } from "slotsmith/locales/ar";
import { fa } from "slotsmith/locales/fa";
import { SlotsmithProvider } from "slotsmith/provider";
import Languages from "../landing/languages";

afterEach(cleanup);

/** The element the sample sets `dir` on: the one around the table. */
const wrapper = (container: HTMLElement) => container.querySelector(".sdt")!.closest("[dir]")!;

/** A pack's "rows per page" label; a pack's section is its labels or a function of the tag. */
function rowsPerPage(pack: typeof ar): string {
  const table = typeof pack.table === "function" ? pack.table(pack.code) : pack.table;
  return String(table!.rowsPerPage);
}

describe("landing/languages", () => {
  it("starts in English, left to right", () => {
    const { container } = render(<Languages />);
    expect(wrapper(container).getAttribute("dir")).toBe("ltr");
    expect(container.textContent).toContain("Rows per page");
    expect(screen.getAllByRole("row")).toHaveLength(1 + 5);
  });

  it("switches to Arabic: right to left, with the Arabic pack's labels", () => {
    const { container } = render(<Languages />);
    fireEvent.click(screen.getByRole("button", { name: "العربية" }));
    expect(wrapper(container).getAttribute("dir")).toBe("rtl");
    expect(container.textContent).toContain(rowsPerPage(ar));
    expect(screen.getByRole("button", { name: "العربية" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("switches to Persian: still right to left, with the Persian labels", () => {
    const { container } = render(<Languages />);
    fireEvent.click(screen.getByRole("button", { name: "العربية" }));
    fireEvent.click(screen.getByRole("button", { name: "فارسی" }));
    expect(wrapper(container).getAttribute("dir")).toBe("rtl");
    expect(container.textContent).toContain(rowsPerPage(fa));
    expect(container.textContent).not.toContain(rowsPerPage(ar));
  });

  it("names the toggle in the page's language", () => {
    render(<Languages />);
    expect(screen.getByRole("group", { name: "Language" })).toBeTruthy();
    cleanup();
    render(
      <SlotsmithProvider locale="ar" locales={[ar]}>
        <Languages />
      </SlotsmithProvider>,
    );
    expect(screen.getByRole("group", { name: "اللغة" })).toBeTruthy();
    cleanup();
    render(
      <SlotsmithProvider locale="fa" locales={[fa]}>
        <Languages />
      </SlotsmithProvider>,
    );
    expect(screen.getByRole("group", { name: "زبان" })).toBeTruthy();
  });

  it("switches back to English", () => {
    const { container } = render(<Languages />);
    fireEvent.click(screen.getByRole("button", { name: "فارسی" }));
    fireEvent.click(screen.getByRole("button", { name: "English" }));
    expect(wrapper(container).getAttribute("dir")).toBe("ltr");
    expect(container.textContent).toContain("Rows per page");
  });
});
