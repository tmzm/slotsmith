// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Footers from "@samples/data-table/footers";
import Pagination from "@samples/data-table/pagination";
import SortingAndSelection from "@samples/data-table/sorting-and-selection";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("data-table guide: sorting and selection", () => {
  it("sorts a column ascending when its header button is clicked", () => {
    const error = vi.spyOn(console, "error");
    const { container } = render(<SortingAndSelection />);
    const header = within(container.querySelector("thead")!).getByRole("button", { name: "Name" });
    const cell = header.closest("th")!;
    expect(cell.getAttribute("aria-sort")).toBe("none");
    fireEvent.click(header);
    expect(cell.getAttribute("aria-sort")).toBe("ascending");
    expect(error).not.toHaveBeenCalled();
  });

  it("keeps the rows its rule excludes from being selected", () => {
    const { container } = render(<SortingAndSelection />);
    const disabled = [...container.querySelectorAll<HTMLInputElement>('tbody input[type="checkbox"]')].filter((box) => box.disabled);
    expect(disabled.length).toBeGreaterThan(0);
  });

  it("reports the selected rows below the table", () => {
    const { container } = render(<SortingAndSelection />);
    const first = container.querySelector<HTMLInputElement>('tbody input[type="checkbox"]:not(:disabled)')!;
    fireEvent.click(first);
    expect(screen.getByText(/^Selected: /)).toBeTruthy();
  });
});

describe("data-table guide: pagination", () => {
  it("moves the page info when the next-page button is clicked", () => {
    const error = vi.spyOn(console, "error");
    const { container } = render(<Pagination />);
    const info = () => container.querySelector('[aria-live="polite"]')?.textContent;
    expect(info()).toBe("Page 1 of 3");
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(info()).toBe("Page 2 of 3");
    expect(error).not.toHaveBeenCalled();
  });
});

describe("data-table guide: footers", () => {
  it("renders a tfoot row with the total", () => {
    const error = vi.spyOn(console, "error");
    const { container } = render(<Footers />);
    const row = container.querySelector("tfoot tr");
    expect(row).not.toBeNull();
    expect(row!.textContent).toContain("Total");
    expect(row!.textContent).toContain("$1,240.00");
    expect(error).not.toHaveBeenCalled();
  });
});

describe("data-table guide: server data", () => {
  // Deferred: the sample needs @tanstack/react-query, which is downloaded at the end of the run (docs/LAUNCH-REPORT.md "Deferred").
  it.todo("renders the loading status, then rows after the fake API resolves");
});
