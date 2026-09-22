import { screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, vi, type MockInstance } from "vitest";
import type { DataTableColumnDef } from "../../index";

/**
 * Employee
 *
 * The row shape used by the UI library integration tests.
 */
export type Employee = { id: string; name: string; salary: number; active: boolean };

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
