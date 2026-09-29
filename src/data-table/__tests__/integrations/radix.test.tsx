import { Theme } from "@radix-ui/themes";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { DataTable, type DataTableProps } from "../../index";
import { radixComponents } from "./radix/components";
import {
  bodyRows,
  dragHandles,
  employeeColumns,
  employees,
  failOnReactWarnings,
  keyboardReorder,
  names,
  ReorderableEmployees,
  reorderStatus,
  stubBrowserApis,
  type Employee,
} from "./shared";

/**
 * Radix Themes wrapper
 *
 * `Theme` with its default accent and appearance. jsdom loads no stylesheet,
 * so the colours the skin paints with are checked as the Radix variables it
 * names, which is what makes them follow the app's `Theme`.
 */
const Wrapper = ({ children }: { children: ReactNode }) => <Theme>{children}</Theme>;

/**
 * RTL wrapper
 *
 * `Theme` around a right-to-left page.
 */
const RtlWrapper = ({ children }: { children: ReactNode }) => (
  <Theme>
    <div dir="rtl">{children}</div>
  </Theme>
);

/**
 * Render Radix Themes table
 *
 * `<DataTable>` with Radix Themes slots inside `Theme`.
 */
function renderRadixTable(props: Partial<DataTableProps<Employee>> = {}, wrapper = Wrapper) {
  const user = userEvent.setup();
  render(
    <DataTable<Employee> data={employees(23)} columns={employeeColumns} components={radixComponents} {...props} />,
    { wrapper },
  );
  return user;
}

beforeAll(stubBrowserApis);

describe("Radix Themes v3", () => {
  failOnReactWarnings();

  it("renders with Radix Themes' table parts", () => {
    renderRadixTable();
    const table = screen.getByRole("table");
    expect(table).toHaveClass("rt-TableRootTable");
    expect(table.closest(".rt-TableRoot")).toHaveClass("rt-variant-surface");
    expect(screen.getAllByRole("columnheader")[0]).toHaveClass("rt-TableColumnHeaderCell");
    expect(bodyRows()[0]).toHaveClass("rt-TableRow");
    expect(within(bodyRows()[0]!).getAllByRole("cell")[0]).toHaveClass("rt-TableCell");
  });

  it("sorts from a ghost Button in the header, the active arrow in the accent colour", async () => {
    const user = renderRadixTable({ data: employees(3).reverse() });
    const sort = screen.getByRole("button", { name: /Name/ });
    expect(sort).toHaveClass("rt-Button", "rt-variant-ghost");
    await user.click(sort);
    expect(names()).toEqual(["Employee 01", "Employee 02", "Employee 03"]);
    expect(sort.querySelector<HTMLElement>("[data-sort-icon]")!.style.color).toBe("var(--accent-11)");
  });

  it("selects with Radix checkboxes, mapping indeterminate both ways, and tints the selected row", async () => {
    const onSelectionChange = vi.fn();
    const user = renderRadixTable({ enableRowSelection: true, onSelectionChange });

    const first = screen.getAllByRole("checkbox", { name: "Select row" })[0]!;
    expect(first).toHaveClass("rt-CheckboxRoot");
    await user.click(first);
    expect(onSelectionChange).toHaveBeenLastCalledWith([employees(1)[0]]);
    expect(bodyRows()[0]).toHaveAttribute("data-state", "selected");
    expect(getComputedStyle(within(bodyRows()[0]!).getAllByRole("cell")[0]!).backgroundColor).toBe("var(--accent-a3)");

    const selectAll = screen.getByRole("checkbox", { name: "Select all rows on this page" });
    expect(selectAll).toHaveAttribute("aria-checked", "mixed");
    await user.click(selectAll);
    expect(onSelectionChange.mock.lastCall?.[0]).toHaveLength(10);
    expect(selectAll).toHaveAttribute("aria-checked", "true");
  });

  it("paginates with Radix IconButtons", async () => {
    const user = renderRadixTable();
    const next = screen.getByRole("button", { name: "Next page" });
    expect(next).toHaveClass("rt-IconButton");
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();

    await user.click(next);
    await user.click(next);
    expect(names()).toEqual(["Employee 21", "Employee 22", "Employee 23"]);
    expect(screen.getByText("Page 3 of 3")).toBeInTheDocument();
    expect(next).toBeDisabled();
  });

  it("changes the page size with a SegmentedControl", async () => {
    const user = renderRadixTable();
    const sizes = screen.getByRole("radiogroup", { name: "Rows per page" });
    expect(sizes).toHaveClass("rt-SegmentedControlRoot");
    expect(within(sizes).getByRole("radio", { name: "10" })).toBeChecked();
    await user.click(within(sizes).getByRole("radio", { name: "25" }));
    expect(within(sizes).getByRole("radio", { name: "25" })).toBeChecked();
    expect(bodyRows()).toHaveLength(23);
  });

  it("shows Radix skeletons while loading", () => {
    renderRadixTable({ loading: true });
    const rows = document.querySelectorAll("tbody tr");
    expect(rows.length).toBeGreaterThan(0);
    expect(document.querySelectorAll("tbody .rt-Skeleton")).toHaveLength(rows.length * 2);
    expect(screen.getByRole("table").closest("[aria-busy]")).toHaveAttribute("aria-busy", "true");
  });

  it("shows the empty message across every column", () => {
    renderRadixTable({ data: [], enableRowSelection: true, labels: { empty: "لا يوجد بيانات" } });
    const cell = within(bodyRows()[0]!).getByRole("cell");
    expect(cell).toHaveAttribute("colspan", "3");
    expect(within(cell).getByText("لا يوجد بيانات")).toHaveClass("rt-Text");
  });

  it("retries from the error state", async () => {
    const onRetry = vi.fn();
    const user = renderRadixTable({ error: new Error("500"), onRetry });
    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
    const retry = screen.getByRole("button", { name: "Retry" });
    expect(retry).toHaveClass("rt-Button");
    await user.click(retry);
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("works in RTL, with the arrows turned round", () => {
    renderRadixTable({ labels: { selectRow: "تحديد الصف" }, enableRowSelection: true }, RtlWrapper);
    expect(screen.getAllByRole("checkbox", { name: "تحديد الصف" })).toHaveLength(10);
    const arrow = screen.getByRole("button", { name: "Previous page" }).querySelector("[data-flip]")!;
    expect(getComputedStyle(arrow).transform).toBe("scaleX(-1)");
  });

  it("keeps the arrows as drawn left to right", () => {
    renderRadixTable();
    const arrow = screen.getByRole("button", { name: "Previous page" }).querySelector("[data-flip]")!;
    expect(getComputedStyle(arrow).transform).not.toBe("scaleX(-1)");
  });

  it("expands a tree row from an IconButton", async () => {
    const user = userEvent.setup();
    const lead = { ...employees(1)[0]!, reports: employees(3).slice(1) };
    render(<DataTable<Employee> data={[lead]} columns={employeeColumns} components={radixComponents} getSubRows={(row) => row.reports} />, {
      wrapper: Wrapper,
    });
    const toggle = screen.getByRole("button", { name: "Expand row" });
    expect(toggle).toHaveClass("rt-IconButton");
    await user.click(toggle);
    expect(names()).toEqual(["Employee 01", "Employee 02", "Employee 03"]);
    expect(screen.getByRole("button", { name: "Collapse row" })).toHaveAttribute("aria-expanded", "true");
  });

  it("reorders rows by keyboard with a DragHandleDots2Icon drag handle", async () => {
    const onMove = vi.fn();
    const user = userEvent.setup();
    render(<ReorderableEmployees components={radixComponents} initial={employees(3)} onMove={onMove} />, { wrapper: Wrapper });
    expect(dragHandles()[0]).toHaveClass("rt-IconButton", "rt-variant-ghost");
    expect(dragHandles()[0]!.querySelector("svg")).not.toBeNull();
    await keyboardReorder(user, onMove);
    expect(onMove.mock.calls[0]![0].data.map((row: Employee) => row.id)).toEqual(["e2", "e1", "e3"]);
  });

  it("lifts a row on pointer down and disables a lone row’s handle", () => {
    render(<ReorderableEmployees components={radixComponents} initial={employees(3)} />, { wrapper: Wrapper });
    fireEvent.pointerDown(dragHandles()[1]!, { button: 0, pointerId: 1, clientY: 0 });
    expect(bodyRows()[1]).toHaveAttribute("data-dragging", "");
    expect(dragHandles()[1]!.style.cursor).toBe("grabbing");
    fireEvent.pointerCancel(window, { pointerId: 1 });
    expect(bodyRows()[1]).not.toHaveAttribute("data-dragging");

    const lone = { ...employees(1)[0]!, reports: employees(3).slice(1, 2) };
    render(<ReorderableEmployees components={radixComponents} initial={[lone, ...employees(3).slice(2)]} />, { wrapper: Wrapper });
    expect(within(screen.getAllByRole("table")[1]!).getAllByRole("button", { name: "Reorder row" })[1]).toBeDisabled();
  });

  it("moves a sub-row among its siblings by keyboard in a tree table", async () => {
    const onMove = vi.fn();
    const user = userEvent.setup();
    const [lead, first, second, other] = employees(4);
    const tree = [{ ...lead!, reports: [first!, second!] }, other!];
    render(<ReorderableEmployees components={radixComponents} initial={tree} onMove={onMove} />, { wrapper: Wrapper });
    // Rows: Employee 01, its reports 02 and 03, then Employee 04.

    act(() => dragHandles()[0]!.focus());
    await user.keyboard(" ");
    expect(bodyRows()[0]).toHaveAttribute("data-dragging", "");
    expect(bodyRows()[1]).toHaveAttribute("data-dragging-child", "");
    expect(bodyRows()[2]).toHaveAttribute("data-dragging-child", "");
    // The lifted block is opaque, so the rows it passes never show through.
    for (const row of bodyRows().slice(0, 3)) {
      expect(getComputedStyle(row.querySelector("td")!).backgroundColor).toBe("var(--color-panel-solid)");
    }
    expect(getComputedStyle(bodyRows()[3]!.querySelector("td")!).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    await user.keyboard("{Escape}");
    expect(reorderStatus()).toHaveTextContent("Reordering cancelled.");

    act(() => dragHandles()[1]!.focus());
    await user.keyboard(" ");
    expect(reorderStatus()).toHaveTextContent("Row lifted. Position 1 of 2.");
    await user.keyboard("{ArrowDown}");
    expect(bodyRows()[2]).toHaveAttribute("data-drop-edge", "after");
    await user.keyboard(" ");

    const change = onMove.mock.calls[0]![0];
    expect(change.parentId).toBe("e1");
    expect(change.siblings.map((row: Employee) => row.id)).toEqual(["e3", "e2"]);
    expect(names()).toEqual(["Employee 01", "Employee 03", "Employee 02", "Employee 04"]);
    expect(document.activeElement).toBe(dragHandles()[2]);
  });
});
