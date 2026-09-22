import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataTable, type DataTableProps } from "../DataTable";
import type { DataTableColumnDef } from "../core/features";

export type User = { id: string; name: string; age: number; children?: User[] };

export const user = (index: number, overrides: Partial<User> = {}): User => ({
  id: `u${index}`,
  name: `User ${String(index).padStart(2, "0")}`,
  age: 20 + ((index * 7) % 30),
  ...overrides,
});

export const users = (count: number, from = 1) =>
  Array.from({ length: count }, (_, index) => user(from + index));

export const columns: DataTableColumnDef<User>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "age", header: "Age", meta: { align: "end", cellClassName: "age-cell" } },
];

export function renderTable(props: Partial<DataTableProps<User>> = {}) {
  const events = userEvent.setup();
  const result = render(<DataTable<User> data={users(3)} columns={columns} {...props} />);
  return { ...result, user: events };
}

/** Body rows, excluding the header row. */
export const bodyRows = () => {
  const [, body] = screen.getAllByRole("rowgroup");
  return within(body!).queryAllByRole("row");
};

/** Text of the first data column for every body row. */
export const firstColumn = () =>
  bodyRows().map((row) => {
    const cells = within(row).getAllByRole("cell");
    const nameCell = cells.find((cell) => !cell.querySelector("input[type=checkbox]"));
    return nameCell?.textContent ?? "";
  });
