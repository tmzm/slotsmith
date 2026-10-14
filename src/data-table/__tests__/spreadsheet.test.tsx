import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { DataTable } from "../DataTable";
import type { DataTableColumnDef } from "../core/features";
import type { DataTableValueChange } from "../core/spreadsheet/types";
import { useDataTableContext } from "../slots/context";

interface Item {
  id: string;
  name: string;
  qty: number;
  kind: "a" | "b";
  done: boolean;
  code: string;
}

const items = (): Item[] => [
  { id: "r1", name: "Alpha", qty: 1, kind: "a", done: false, code: "X1" },
  { id: "r2", name: "Beta", qty: 2, kind: "b", done: true, code: "X2" },
  { id: "r3", name: "Gamma", qty: 3, kind: "a", done: false, code: "X3" },
];

const renders = new Map<string, number>();

const columns: DataTableColumnDef<Item>[] = [
  { accessorKey: "name", header: "Name", edit: { validate: (name) => (name ? null : "Required") } },
  { accessorKey: "qty", header: "Qty", edit: true },
  {
    accessorKey: "kind",
    header: "Kind",
    edit: { options: [{ value: "a", label: "Apple" }, { value: "b", label: "Banana" }] },
  },
  { accessorKey: "done", header: "Done", edit: true, cell: ({ getValue }) => (getValue() ? "yes" : "no") },
  { accessorKey: "code", header: "Code" },
  {
    id: "renders",
    header: "Renders",
    cell: ({ row }) => {
      renders.set(row.id, (renders.get(row.id) ?? 0) + 1);
      return null;
    },
  },
];

function UndoButton() {
  const { spreadsheet } = useDataTableContext<Item>();
  return (
    <button type="button" onClick={spreadsheet.undo}>
      undo
    </button>
  );
}

function Sheet({ onChange }: { onChange?: (value: Item[], change: DataTableValueChange<Item>) => void }) {
  const [value, setValue] = useState(items);
  return (
    <DataTable.Provider<Item>
      value={value}
      onValueChange={(next, change) => {
        setValue(next);
        onChange?.(next, change);
      }}
      columns={columns}
      spreadsheet
      enablePagination={false}
    >
      <UndoButton />
      <DataTable.Root>
        <DataTable.Table />
      </DataTable.Root>
    </DataTable.Provider>
  );
}

const setup = () => {
  const onChange = vi.fn();
  renders.clear();
  const user = userEvent.setup();
  render(<Sheet onChange={onChange} />);
  return { user, onChange };
};

/** The grid cell at a row and a column, from zero. */
const cellAt = (row: number, column: number) => {
  // The table is the first grid; a date editor's calendar is another, inside a cell.
  const rows = within(screen.getAllByRole("grid")[0]!).getAllByRole("row").slice(1);
  return within(rows[row]!).getAllByRole("gridcell")[column]!;
};

describe("spreadsheet mode", () => {
  it("renders an ARIA grid with one tab stop", () => {
    setup();
    const grid = screen.getByRole("grid");
    expect(grid).toHaveAttribute("aria-multiselectable", "true");
    expect(within(grid).getAllByRole("columnheader")).toHaveLength(6);
    const stops = within(grid).getAllByRole("gridcell").filter((cell) => cell.tabIndex === 0);
    expect(stops).toEqual([cellAt(0, 0)]);
    expect(cellAt(0, 4)).toHaveAttribute("aria-readonly", "true");
  });

  it("moves the active cell with the arrow keys and extends with Shift", async () => {
    const { user } = setup();
    await user.click(cellAt(0, 0));
    expect(cellAt(0, 0)).toHaveAttribute("data-active");
    await user.keyboard("{ArrowDown}{ArrowRight}");
    expect(cellAt(1, 1)).toHaveFocus();
    expect(cellAt(1, 1)).toHaveAttribute("data-active");
    expect(cellAt(0, 0)).not.toHaveAttribute("data-active");
    await user.keyboard("{Shift>}{ArrowDown}{ArrowRight}{/Shift}");
    expect(cellAt(2, 2)).toHaveAttribute("data-selected");
    expect(cellAt(1, 1)).toHaveAttribute("data-range-edge", "top start");
    expect(cellAt(0, 0)).not.toHaveAttribute("data-selected");
  });

  it("types over a cell and commits with Enter, moving down", async () => {
    const { user, onChange } = setup();
    await user.click(cellAt(0, 0));
    await user.keyboard("Z");
    const input = within(cellAt(0, 0)).getByRole("textbox", { name: "Edit Name" });
    expect(input).toHaveFocus();
    expect(input).toHaveValue("Z");
    await user.keyboard("ed{Enter}");
    expect(cellAt(0, 0)).toHaveTextContent("Zed");
    expect(cellAt(1, 0)).toHaveFocus();
    const [next, change] = onChange.mock.calls[0]! as [Item[], DataTableValueChange<Item>];
    expect(change.source).toBe("edit");
    expect(change.rows).toEqual([{ rowId: "r1", previous: items()[0], next: { ...items()[0], name: "Zed" }, columnIds: ["name"] }]);
    expect(next[1]).toEqual(items()[1]);
  });

  it("re-renders only the edited row", async () => {
    const { user } = setup();
    await user.click(cellAt(0, 0));
    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowUp}");
    const before = new Map(renders);
    await user.keyboard("{Enter}");
    await user.keyboard("{Control>}a{/Control}New{Enter}");
    expect(renders.get("r2")).toBe(before.get("r2")! + 1);
    expect(renders.get("r1")).toBe(before.get("r1"));
    expect(renders.get("r3")).toBe(before.get("r3"));
  });

  it("keeps an invalid value in the editor with its message", async () => {
    const { user, onChange } = setup();
    // A click opens the editor with the text selected: Backspace empties it.
    await user.click(cellAt(0, 0));
    await user.keyboard("{Backspace}{Enter}");
    expect(within(cellAt(0, 0)).getByRole("alert")).toHaveTextContent("Required");
    expect(within(cellAt(0, 0)).getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
    expect(onChange).not.toHaveBeenCalled();
    await user.keyboard("{Escape}");
    expect(cellAt(0, 0)).toHaveTextContent("Alpha");
  });

  it("reads numbers and rejects text in a number column", async () => {
    const { user, onChange } = setup();
    await user.click(cellAt(0, 1));
    await user.keyboard("abc{Enter}");
    expect(within(cellAt(0, 1)).getByRole("alert")).toHaveTextContent("Enter a number.");
    await user.keyboard("{Control>}a{/Control}42{Tab}");
    expect(cellAt(0, 1)).toHaveTextContent("42");
    expect(cellAt(0, 2)).toHaveFocus();
    expect((onChange.mock.calls[0]![0] as Item[])[0]!.qty).toBe(42);
  });

  it("toggles a checkbox column with Space, and clears with Delete", async () => {
    const { user, onChange } = setup();
    const box = () => within(cellAt(0, 3)).getByRole("checkbox", { name: "Done" });
    expect(box()).not.toBeChecked();
    await user.click(cellAt(0, 3));
    await user.keyboard(" ");
    expect(box()).toBeChecked();
    await user.click(box());
    expect(box()).not.toBeChecked();
    expect(cellAt(0, 3)).toHaveFocus();
    // A required name cannot be cleared: nothing is written.
    await user.click(cellAt(0, 0));
    await user.keyboard("{Delete}");
    expect(onChange).toHaveBeenCalledTimes(2);
    await user.click(cellAt(0, 3));
    await user.keyboard("{Shift>}{ArrowDown}{/Shift}{Delete}");
    expect(onChange).toHaveBeenCalledTimes(3);
    const last = onChange.mock.calls.at(-1)! as [Item[], DataTableValueChange<Item>];
    expect(last[1].source).toBe("clear");
    expect(last[0].map((item) => item.done)).toEqual([false, false, false]);
  });

  it("undoes and redoes with the keyboard and from code", async () => {
    const { user } = setup();
    await user.click(cellAt(0, 1));
    await user.keyboard("9{Enter}");
    expect(cellAt(0, 1)).toHaveTextContent("9");
    await user.click(cellAt(0, 1));
    await user.keyboard("{Control>}z{/Control}");
    expect(cellAt(0, 1)).toHaveTextContent("1");
    await user.keyboard("{Control>}y{/Control}");
    expect(cellAt(0, 1)).toHaveTextContent("9");
    await user.click(screen.getByRole("button", { name: "undo" }));
    expect(cellAt(0, 1)).toHaveTextContent("1");
  });

  it("pastes tab-separated text, skipping cells that do not fit", async () => {
    const { user, onChange } = setup();
    await user.click(cellAt(0, 0));
    fireEvent.paste(cellAt(0, 0), { clipboardData: { getData: () => "One\t7\nTwo\tnope\n" } });
    expect(cellAt(0, 0)).toHaveTextContent("One");
    expect(cellAt(0, 1)).toHaveTextContent("7");
    expect(cellAt(1, 0)).toHaveTextContent("Two");
    expect(cellAt(1, 1)).toHaveTextContent("2");
    const [, change] = onChange.mock.calls[0]! as [Item[], DataTableValueChange<Item>];
    expect(change.source).toBe("paste");
    expect(screen.getByRole("status")).toHaveTextContent("3 cells pasted, 1 skipped.");
    expect(cellAt(1, 1)).toHaveAttribute("data-selected");
  });

  it("pastes an option by its label", async () => {
    const { user } = setup();
    await user.click(cellAt(0, 2));
    fireEvent.paste(cellAt(0, 2), { clipboardData: { getData: () => "banana" } });
    expect(cellAt(0, 2)).toHaveTextContent("b");
  });

  it("copies the selection as TSV and HTML", async () => {
    const { user } = setup();
    await user.click(cellAt(0, 0));
    await user.keyboard("{Shift>}{ArrowDown}{ArrowRight}{/Shift}");
    const setData = vi.fn();
    fireEvent.copy(cellAt(0, 0), { clipboardData: { setData } });
    expect(setData).toHaveBeenCalledWith("text/plain", "Alpha\t1\nBeta\t2");
    expect(setData).toHaveBeenCalledWith("text/html", expect.stringContaining("<td>Beta</td>"));
    expect(cellAt(1, 1)).toHaveAttribute("data-copied");
  });

  it("fills down with Ctrl+D", async () => {
    const { user, onChange } = setup();
    await user.click(cellAt(0, 1));
    await user.keyboard("{Shift>}{ArrowDown}{ArrowDown}{/Shift}{Control>}d{/Control}");
    expect([cellAt(1, 1), cellAt(2, 1)].map((cell) => cell.textContent)).toEqual(["1", "1"]);
    expect((onChange.mock.calls[0]![1] as DataTableValueChange<Item>).source).toBe("fill");
  });

  it("does not count a press on a cell as a row click", async () => {
    const onRowClick = vi.fn();
    const user = userEvent.setup();
    render(<DataTable<Item> value={items()} columns={columns} spreadsheet onRowClick={onRowClick} />);
    await user.click(cellAt(0, 0));
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("edits a select column with the Autocomplete, writing on pick", async () => {
    const { user, onChange } = setup();
    await user.click(cellAt(0, 2));
    const combobox = within(cellAt(0, 2)).getByRole("combobox", { name: "Edit Kind" });
    expect(combobox).toHaveFocus();
    await user.click(within(cellAt(0, 2)).getByRole("option", { name: "Banana" }));
    expect((onChange.mock.calls[0]![0] as Item[])[0]!.kind).toBe("b");
    await waitFor(() => expect(cellAt(0, 2)).toHaveFocus());
    expect(within(cellAt(0, 2)).queryByRole("combobox")).toBeNull();
  });

  it("edits a date column with the DatePicker", async () => {
    type Dated = { id: string; due: string | null };
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(
      <DataTable<Dated>
        value={[{ id: "d1", due: "2026-03-10" }]}
        onValueChange={onValueChange}
        columns={[{ accessorKey: "due", header: "Due", edit: { editor: "date" } }]}
        spreadsheet
      />,
    );
    await user.click(cellAt(0, 0));
    const day = within(cellAt(0, 0)).getAllByRole("gridcell").find((cell) => cell.textContent === "12")!;
    await user.click(within(day).queryByRole("button") ?? day);
    expect(onValueChange.mock.calls[0]![0]).toEqual([{ id: "d1", due: "2026-03-12" }]);
  });

  it("opens the editor on one click, its text selected, and keeps the arrow keys moving", async () => {
    const { user, onChange } = setup();
    await user.click(cellAt(1, 0));
    const input = within(cellAt(1, 0)).getByRole<HTMLInputElement>("textbox", { name: "Edit Name" });
    expect(input).toHaveFocus();
    expect([input.selectionStart, input.selectionEnd]).toEqual([0, 4]);
    await user.keyboard("{ArrowDown}");
    expect(cellAt(2, 0)).toHaveFocus();
    expect(within(cellAt(1, 0)).queryByRole("textbox")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("is off unless asked for", () => {
    render(<DataTable<Item> data={items()} columns={columns} />);
    expect(screen.queryByRole("grid")).toBeNull();
    expect(screen.getAllByRole("cell").length).toBeGreaterThan(0);
  });

  it("leaves the edit open on the active cell after the value updates", async () => {
    const { user } = setup();
    await user.click(cellAt(2, 0));
    await act(async () => {
      await user.keyboard("{F2}");
    });
    expect(within(cellAt(2, 0)).getByRole("textbox")).toHaveValue("Gamma");
  });
});
