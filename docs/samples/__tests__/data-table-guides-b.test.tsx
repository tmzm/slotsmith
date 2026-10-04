// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import HeadlessHook from "@samples/data-table/headless-hook";
import RowReorder from "@samples/data-table/row-reorder";
import RowReorderTree from "@samples/data-table/row-reorder-tree";
import TreeRows from "@samples/data-table/tree-rows";
import VirtualRows from "@samples/data-table/virtual-rows";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const bodyRows = (container: HTMLElement) => [...container.querySelectorAll<HTMLTableRowElement>("tbody tr[data-row-id]")];
const key = (element: HTMLElement, name: string) => fireEvent.keyDown(element, { key: name });
/** The reorder live region; the page-size control has a status region of its own. */
const liveRegion = () => screen.getAllByRole("status").find((element) => element.getAttribute("aria-live") === "assertive")!;

describe("data-table guide: tree rows", () => {
  it("shows a row's children at depth 1 once it is expanded", () => {
    const error = vi.spyOn(console, "error");
    const { container } = render(<TreeRows />);
    expect(container.querySelector('tbody tr[data-depth="1"]')).toBeNull();
    const [toggle] = screen.getAllByRole("button", { name: "Expand row" });
    fireEvent.click(toggle!);
    const children = container.querySelectorAll('tbody tr[data-depth="1"]');
    expect(children.length).toBe(2);
    expect(children[0]!.textContent).toContain("Platform");
    expect(screen.getByText("Expanded: eng")).toBeTruthy();
    expect(error).not.toHaveBeenCalled();
  });
});

describe("data-table guide: virtual rows", () => {
  it("renders only a window of the 10,000 rows", () => {
    const error = vi.spyOn(console, "error");
    const warn = vi.spyOn(console, "warn");
    // jsdom has no layout: give the scroll area a 360px box and a no-op ResizeObserver.
    vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(360);
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(800);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ width: 800, height: 360, top: 0, left: 0, right: 800, bottom: 360, x: 0, y: 0, toJSON: () => ({}) });
    const { container } = render(<VirtualRows />);
    const rows = bodyRows(container);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThan(100);
    expect(rows[0]!.textContent).toContain("Request served #1");
    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("data-table guide: row reorder", () => {
  it("moves row 1 below row 2 from the keyboard and announces the drop", () => {
    const error = vi.spyOn(console, "error");
    const { container } = render(<RowReorder />);
    const ids = () => bodyRows(container).map((row) => row.getAttribute("data-row-id"));
    expect(ids().slice(0, 2)).toEqual(["s1", "s2"]);

    const handle = within(bodyRows(container)[0]!).getByRole("button", { name: "Reorder row" });
    act(() => handle.focus());
    key(handle, " ");
    expect(liveRegion()).toHaveProperty("textContent", "Row lifted. Position 1 of 6.");
    key(handle, "ArrowDown");
    key(handle, " ");

    expect(ids().slice(0, 2)).toEqual(["s2", "s1"]);
    expect(liveRegion()).toHaveProperty("textContent", "Row dropped at position 2 of 6.");
    expect(screen.getByText(/Last move: \{ rowId: "s1", targetId: "s2", position: "after" \}/)).toBeTruthy();
    expect(error).not.toHaveBeenCalled();
  });

  it("moves a sub-row among its siblings in the tree and keeps the top level", () => {
    const error = vi.spyOn(console, "error");
    const { container } = render(<RowReorderTree />);
    const ids = () => bodyRows(container).map((row) => row.getAttribute("data-row-id"));
    expect(ids()).toEqual(["t1", "t1.1", "t1.2", "t1.3", "t2", "t3"]);

    const handle = within(bodyRows(container)[1]!).getByRole("button", { name: "Reorder row" });
    act(() => handle.focus());
    key(handle, " ");
    expect(liveRegion()).toHaveProperty("textContent", "Row lifted. Position 1 of 3.");
    key(handle, "ArrowDown");
    key(handle, " ");

    expect(ids()).toEqual(["t1", "t1.2", "t1.1", "t1.3", "t2", "t3"]);
    expect(screen.getByText(/parentId: "t1"/)).toBeTruthy();
    expect(error).not.toHaveBeenCalled();
  });
});

describe("data-table guide: headless hook", () => {
  it("renders its own table, with no library classes, and reorders with custom labels", () => {
    const error = vi.spyOn(console, "error");
    const { container } = render(<HeadlessHook />);
    const table = container.querySelector("table")!;
    expect(table).not.toBeNull();
    expect(container.querySelector('[class*="sdt__"]')).toBeNull();
    expect(bodyRows(container).map((row) => row.textContent)).toEqual([
      expect.stringContaining("Morning Light"),
      expect.stringContaining("Paper Boats"),
      expect.stringContaining("Slow Tide"),
      expect.stringContaining("North Road"),
      expect.stringContaining("Last Train"),
    ]);

    const handle = within(bodyRows(container)[0]!).getByRole("button", { name: "Move track" });
    const instructions = document.getElementById(handle.getAttribute("aria-describedby")!);
    expect(instructions?.textContent).toContain("pick the track up");
    act(() => handle.focus());
    key(handle, " ");
    key(handle, "Escape");
    expect(liveRegion()).toHaveProperty("textContent", "Move cancelled.");
    expect(error).not.toHaveBeenCalled();
  });
});
