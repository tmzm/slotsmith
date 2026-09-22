import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataTable, type DataTableProps } from "../DataTable";
import type { DataTableColumnDef } from "../core/features";

/**
 * User
 *
 * The row shape used by the component tests.
 */
export type User = { id: string; name: string; age: number; children?: User[] };

/**
 * User builder
 *
 * @param index - Drives the id (`u1`), name (`User 01`) and age.
 * @param overrides - Fields to replace.
 * @returns A user row.
 */
export const user = (index: number, overrides: Partial<User> = {}): User => ({
  id: `u${index}`,
  name: `User ${String(index).padStart(2, "0")}`,
  age: 20 + ((index * 7) % 30),
  ...overrides,
});

/**
 * Users builder
 *
 * @param count - How many users.
 * @param from - The first index. Defaults to 1.
 * @returns Consecutive user rows.
 */
export const users = (count: number, from = 1) =>
  Array.from({ length: count }, (_, index) => user(from + index));

/**
 * Columns
 *
 * Name, plus an end-aligned age column with a cell class.
 */
export const columns: DataTableColumnDef<User>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "age", header: "Age", meta: { align: "end", cellClassName: "age-cell" } },
];

/**
 * Render table
 *
 * Renders `<DataTable>` with three users and the test columns.
 *
 * @param props - Props to add or override.
 * @returns The render result plus a `user` event instance.
 */
export function renderTable(props: Partial<DataTableProps<User>> = {}) {
  const events = userEvent.setup();
  const result = render(<DataTable<User> data={users(3)} columns={columns} {...props} />);
  return { ...result, user: events };
}

/**
 * Body rows
 *
 * @returns The body `<tr>`s, excluding the header row.
 */
export const bodyRows = () => {
  const [, body] = screen.getAllByRole("rowgroup");
  return within(body!).queryAllByRole("row");
};

/**
 * First column
 *
 * @returns The text of the first data column of every body row.
 */
export const firstColumn = () =>
  bodyRows().map((row) => {
    const cells = within(row).getAllByRole("cell");
    const nameCell = cells.find((cell) => !cell.querySelector("input[type=checkbox]"));
    return nameCell?.textContent ?? "";
  });
