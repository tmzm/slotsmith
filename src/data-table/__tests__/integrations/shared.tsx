import { act, screen, within } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, expect, vi, type MockInstance } from "vitest";
import { DataTable, type DataTableColumnDef, type DataTableComponents, type RowOrderChange } from "../../index";

/**
 * Employee
 *
 * The row shape used by the UI library integration tests. `reports` makes a
 * tree for the tree-table tests.
 */
export type Employee = { id: string; name: string; salary: number; active: boolean; reports?: Employee[] };

/**
 * Employees builder
 *
 * @param count - How many employees.
 * @returns Employees `e1…eN`, named `Employee 01…`, with varied salaries.
 */
export const employees = (count: number): Employee[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `e${i + 1}`,
    name: `Employee ${String(i + 1).padStart(2, "0")}`,
    salary: 1000 + ((i * 37) % 50) * 100,
    active: i % 4 !== 3,
  }));

/**
 * Employee columns
 *
 * Name and an end-aligned salary column.
 */
export const employeeColumns: DataTableColumnDef<Employee>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "salary", header: "Salary", meta: { align: "end" } },
];

/**
 * Stub browser APIs
 *
 * jsdom lacks APIs that radix, Ark/zag (Chakra) and MUI call: pointer
 * capture, scrollIntoView, matchMedia and ResizeObserver.
 */
export function stubBrowserApis() {
  const proto = window.HTMLElement.prototype as unknown as Record<string, unknown>;
  proto.hasPointerCapture ??= () => false;
  proto.setPointerCapture ??= () => {};
  proto.releasePointerCapture ??= () => {};
  proto.scrollIntoView ??= () => {};
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

/**
 * Fail on React warnings
 *
 * Spies on `console.error` / `console.warn` around every test and fails it if
 * React complained — e.g. about an unknown prop reaching the DOM, which would
 * mean a slot received something other than DOM props.
 */
export function failOnReactWarnings() {
  let error: MockInstance;
  let warn: MockInstance;
  beforeEach(() => {
    error = vi.spyOn(console, "error");
    warn = vi.spyOn(console, "warn");
  });
  afterEach(() => {
    const messages = [...error.mock.calls, ...warn.mock.calls].map((call) => call.map(String).join(" "));
    error.mockRestore();
    warn.mockRestore();
    expect(messages).toEqual([]);
  });
}

/**
 * Body rows
 *
 * @returns The `<tr>`s of the table body.
 */
export const bodyRows = () => {
  const [, body] = within(screen.getByRole("table")).getAllByRole("rowgroup");
  return within(body!).queryAllByRole("row");
};

/**
 * Names
 *
 * @returns The Name column's text for every body row.
 */
export const names = () =>
  bodyRows().map((row) => within(row).getByText(/^Employee \d+$/).textContent);

/**
 * Drag handles
 *
 * @returns Every row's drag handle, in row order.
 */
export const dragHandles = () => screen.getAllByRole("button", { name: "Reorder row" });

/**
 * Reorder live region
 *
 * @returns The table's assertive status region, which announces each reorder step.
 */
export const reorderStatus = () =>
  screen.getAllByRole("status").find((element) => element.getAttribute("aria-live") === "assertive")!;

/**
 * Store a reorder
 *
 * What an app does with a change: keep the new `data` for a top-level move,
 * or put the new `siblings` under their parent for a nested one.
 *
 * @param rows - The current rows.
 * @param change - The change the table reported.
 * @returns The rows in their new order.
 */
function storeOrder(rows: Employee[], change: RowOrderChange<Employee>): Employee[] {
  if (change.parentId === null) return change.data;
  const place = (list: Employee[]): Employee[] =>
    list.map((row) =>
      row.id === change.parentId ? { ...row, reports: change.siblings } : row.reports ? { ...row, reports: place(row.reports) } : row,
    );
  return place(rows);
}

/**
 * Reorderable employees
 *
 * A reorderable table, fully expanded, that stores each new order at once.
 */
export function ReorderableEmployees({
  components,
  initial,
  onMove,
}: {
  components: Partial<DataTableComponents>;
  initial: Employee[];
  onMove?: (change: RowOrderChange<Employee>) => void;
}) {
  const [rows, setRows] = useState(initial);
  return (
    <DataTable<Employee>
      data={rows}
      columns={employeeColumns}
      components={components}
      getRowId={(row) => row.id}
      getSubRows={(row) => row.reports}
      defaultExpanded
      enableRowReorder
      onRowOrderChange={(change) => {
        onMove?.(change);
        setRows((current) => storeOrder(current, change));
      }}
    />
  );
}

/**
 * Keyboard reorder
 *
 * Lifts the first of three rows with Space, moves it down one place and
 * drops it, checking the drag state and the announcements on the way.
 *
 * @param user - The test's user-event instance.
 * @param onMove - The spy passed to {@link ReorderableEmployees}.
 */
export async function keyboardReorder(user: UserEvent, onMove: MockInstance) {
  const handle = dragHandles()[0]!;
  expect(handle.tagName).toBe("BUTTON");
  expect(handle).toHaveAccessibleDescription(
    "Press space to lift the row, the arrow keys to move it, space to drop it, escape to cancel.",
  );

  act(() => handle.focus());
  await user.keyboard(" ");
  expect(bodyRows()[0]).toHaveAttribute("data-dragging", "");
  expect(handle).toHaveAttribute("aria-pressed", "true");
  expect(reorderStatus()).toHaveTextContent("Row lifted. Position 1 of 3.");

  await user.keyboard("{ArrowDown}");
  expect(bodyRows()[1]).toHaveAttribute("data-drop-position", "after");
  expect(reorderStatus()).toHaveTextContent("Position 2 of 3.");

  await user.keyboard(" ");
  expect(onMove).toHaveBeenCalledTimes(1);
  expect(names()).toEqual(["Employee 02", "Employee 01", "Employee 03"]);
  expect(reorderStatus()).toHaveTextContent("Row dropped at position 2 of 3.");
  expect(bodyRows().some((row) => row.hasAttribute("data-dragging"))).toBe(false);
  expect(document.activeElement).toBe(dragHandles()[1]);
}
