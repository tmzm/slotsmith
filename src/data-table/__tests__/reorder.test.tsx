import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import axe from "axe-core";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DataTable, resetProviderWarnings, type DataTableProps } from "../DataTable";
import type { DataTableColumnDef } from "../core/features";
import type { RowOrderChange } from "../core/reorder";
import type { RowTransfer } from "../core/reorderGroups";
import { bodyRows, columns, renderTable, users, type User } from "./builders";

beforeEach(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Every drag handle, in row order. */
const handles = () => screen.queryAllByRole("button", { name: "Reorder row" });

/** The names shown, in row order. */
const names = () => bodyRows().map((row) => within(row).getByText(/^User \d+$/).textContent);

/** The header row's cells. */
const headerCells = () => {
  const [head] = screen.getAllByRole("rowgroup");
  return within(head!).getAllByRole("columnheader");
};

const key = (element: HTMLElement, name: string) => fireEvent.keyDown(element, { key: name });

/** The table's reorder live region; the page-size control has a status region of its own. */
const liveRegion = () =>
  screen.queryAllByRole("status").find((element) => element.getAttribute("aria-live") === "assertive") ?? null;

/**
 * Axe violations
 *
 * Colour contrast is left to the browser check, because jsdom computes no styles.
 */
async function violations(node: Element) {
  const result = await axe.run(node, { rules: { "color-contrast": { enabled: false } } });
  return result.violations.map((violation) => `${violation.id}: ${violation.nodes.map((n) => n.html).join(" | ")}`);
}

/** A table that stores the new order, the way an app does. */
function Reorderable(props: Partial<DataTableProps<User>> & { onMove?: (change: RowOrderChange<User>) => void }) {
  const { onMove, ...rest } = props;
  const [rows, setRows] = useState(users(3));
  return (
    <DataTable<User>
      data={rows}
      columns={columns}
      enableRowReorder
      onRowOrderChange={(change) => {
        onMove?.(change);
        setRows(change.data);
      }}
      {...rest}
    />
  );
}

describe("row reordering, rendered", () => {
  it("adds a handle to every row and one more column everywhere", () => {
    renderTable({ enableRowReorder: true });
    expect(handles()).toHaveLength(3);
    for (const row of bodyRows()) {
      const first = within(row).getAllByRole("cell")[0]!;
      expect(first).toHaveAttribute("data-slot", "drag");
      expect(first).toHaveClass("sdt__cell--drag");
      expect(within(first).getByRole("button", { name: "Reorder row" })).toBeInTheDocument();
    }
    expect(headerCells()).toHaveLength(3);
    expect(headerCells()[0]).toHaveAttribute("data-slot", "drag");
    expect(headerCells()[0]).toHaveTextContent("Reorder row");
  });

  it("spans the empty and loading rows over the handle column", () => {
    const { rerender } = render(<DataTable<User> data={[]} columns={columns} enableRowReorder />);
    expect(within(bodyRows()[0]!).getByRole("cell")).toHaveAttribute("colspan", "3");

    rerender(<DataTable<User> data={[]} columns={columns} enableRowReorder loading />);
    const [, body] = screen.getAllByRole("rowgroup", { hidden: true });
    const loadingRow = within(body!).getAllByRole("row", { hidden: true })[0]!;
    expect(within(loadingRow).getAllByRole("cell", { hidden: true })).toHaveLength(3);
  });

  it("adds an empty footer cell for the handle column", () => {
    renderTable({
      enableRowReorder: true,
      columns: [
        { accessorKey: "name", header: "Name", footer: "Total" },
        { accessorKey: "age", header: "Age" },
      ],
    });
    const [, , foot] = screen.getAllByRole("rowgroup");
    const cells = within(foot!).getAllByRole("cell");
    expect(cells).toHaveLength(3);
    expect(cells[0]).toHaveAttribute("data-slot", "drag");
    expect(cells[0]).toBeEmptyDOMElement();
  });

  it("keeps the handle column, disabled, while a single row shows", () => {
    renderTable({ enableRowReorder: true, data: users(1) });
    expect(handles()).toHaveLength(1);
    expect(handles()[0]).toBeDisabled();
    expect(headerCells()).toHaveLength(3);
  });

  it("renders no handle, no extra column and no live region by default", () => {
    renderTable();
    expect(handles()).toHaveLength(0);
    expect(headerCells()).toHaveLength(2);
    expect(liveRegion()).toBeNull();
    expect(document.querySelector("[data-slot=drag]")).toBeNull();
  });

  it("gives each row its id, for the engine and for styling", () => {
    renderTable({ enableRowReorder: true });
    expect(bodyRows().map((row) => row.getAttribute("data-row-id"))).toEqual(["u1", "u2", "u3"]);
  });

  it("lets the app place DataTable.DragHandle in a cell of its own", () => {
    const withHandle: DataTableColumnDef<User>[] = [
      ...columns,
      { id: "move", header: "Move", cell: () => <DataTable.DragHandle className="mine" /> },
    ];
    renderTable({ enableRowReorder: true, reorderHandleColumn: false, columns: withHandle });

    expect(headerCells()).toHaveLength(3);
    expect(document.querySelector("[data-slot=drag]")).toBeNull();
    for (const row of bodyRows()) {
      const cells = within(row).getAllByRole("cell");
      expect(within(row).getAllByRole("button", { name: "Reorder row" })).toHaveLength(1);
      expect(within(cells[2]!).getByRole("button", { name: "Reorder row" })).toHaveClass("sdt__drag", "mine");
    }
  });

  it("renders DataTable.DragHandle as nothing when reordering is off", () => {
    const withHandle: DataTableColumnDef<User>[] = [
      ...columns,
      { id: "move", header: "Move", cell: () => <DataTable.DragHandle /> },
    ];
    renderTable({ columns: withHandle });
    expect(handles()).toHaveLength(0);
  });

  it("passes slotProps.dragHandle to every handle, appending its className", () => {
    renderTable({
      enableRowReorder: true,
      slotProps: { dragHandle: (row) => ({ className: "mine", title: `Move ${row.original.name}` }) },
    });
    const [first] = handles();
    expect(first).toHaveClass("sdt__drag", "mine");
    expect(first).toHaveAttribute("title", "Move User 01");
    expect(first).toHaveAccessibleName("Reorder row");
  });

  it("keeps keyboard reordering when slotProps.dragHandle adds its own onKeyDown", () => {
    const onKeyDown = vi.fn();
    const onMove = vi.fn<(change: RowOrderChange<User>) => void>();
    render(<Reorderable onMove={onMove} slotProps={{ dragHandle: () => ({ onKeyDown }) }} />);

    const handle = handles()[0]!;
    act(() => handle.focus());
    key(handle, " ");
    key(handle, "ArrowDown");
    key(handle, " ");

    expect(onKeyDown).toHaveBeenCalledTimes(3);
    expect(onMove).toHaveBeenCalledTimes(1);
    expect(names()).toEqual(["User 02", "User 01", "User 03"]);
  });

  it("keeps pointer dragging when slotProps.dragHandle adds its own onPointerDown and onBlur", () => {
    const onPointerDown = vi.fn();
    const onBlur = vi.fn();
    render(<Reorderable slotProps={{ dragHandle: () => ({ onPointerDown, onBlur }) }} />);

    const handle = handles()[0]!;
    fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientY: 0 });
    expect(onPointerDown).toHaveBeenCalledTimes(1);
    expect(bodyRows()[0]).toHaveAttribute("data-dragging", "");
    fireEvent.pointerCancel(window, { pointerId: 1 });
    expect(bodyRows()[0]).not.toHaveAttribute("data-dragging");

    // Keyboard lift, then blur: the engine's cancel-on-blur still runs beside the app's handler.
    act(() => handle.focus());
    key(handle, " ");
    expect(bodyRows()[0]).toHaveAttribute("data-dragging", "");
    fireEvent.blur(handle);
    expect(onBlur).toHaveBeenCalled();
    expect(bodyRows()[0]).not.toHaveAttribute("data-dragging");
  });

  it("keeps the engine's handlers when DataTable.DragHandle is given its own", () => {
    const onKeyDown = vi.fn();
    const withHandle: DataTableColumnDef<User>[] = [
      ...columns,
      { id: "move", header: "Move", cell: () => <DataTable.DragHandle onKeyDown={onKeyDown} /> },
    ];
    const onMove = vi.fn<(change: RowOrderChange<User>) => void>();
    render(<Reorderable onMove={onMove} reorderHandleColumn={false} columns={withHandle} />);

    const handle = handles()[0]!;
    act(() => handle.focus());
    key(handle, " ");
    key(handle, "ArrowDown");
    key(handle, " ");
    expect(onKeyDown).toHaveBeenCalledTimes(3);
    expect(onMove).toHaveBeenCalledTimes(1);
  });

  it("describes every handle with the hidden instructions", () => {
    renderTable({ enableRowReorder: true });
    expect(handles()[0]).toHaveAccessibleDescription(
      "Press space to lift the row, the arrow keys to move it, space to drop it, escape to cancel.",
    );
  });

  it("drops by keyboard: reports the moved data, renders the new order, keeps focus on the handle", () => {
    const onMove = vi.fn<(change: RowOrderChange<User>) => void>();
    render(<Reorderable onMove={onMove} />);

    const handle = handles()[0]!;
    act(() => handle.focus());
    key(handle, " ");
    key(handle, "ArrowDown");
    key(handle, " ");

    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove.mock.calls[0]![0].data.map((row) => row.id)).toEqual(["u2", "u1", "u3"]);
    expect(names()).toEqual(["User 02", "User 01", "User 03"]);
    expect(document.activeElement).toBe(within(bodyRows()[1]!).getByRole("button", { name: "Reorder row" }));
  });

  it("announces lift, move and drop in a status region", () => {
    render(<Reorderable />);
    const status = liveRegion()!;
    expect(status).not.toBeNull();
    expect(status).toHaveAttribute("aria-atomic", "true");
    expect(status).toHaveTextContent("");

    const handle = handles()[0]!;
    act(() => handle.focus());
    key(handle, " ");
    expect(status).toHaveTextContent("Row lifted. Position 1 of 3.");
    key(handle, "ArrowDown");
    expect(status).toHaveTextContent("Position 2 of 3.");
    key(handle, " ");
    expect(status).toHaveTextContent("Row dropped at position 2 of 3.");
  });

  it("puts the drag column before the select column, and a drag selects nothing", () => {
    const onSelectionChange = vi.fn();
    renderTable({ enableRowReorder: true, enableRowSelection: true, onSelectionChange });

    const header = headerCells();
    expect(header[0]).toHaveAttribute("data-slot", "drag");
    expect(header[1]).toHaveAttribute("data-slot", "select");
    const cells = within(bodyRows()[0]!).getAllByRole("cell");
    expect(cells[0]).toHaveAttribute("data-slot", "drag");
    expect(cells[1]).toHaveAttribute("data-slot", "select");

    const handle = handles()[0]!;
    fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientY: 0 });
    fireEvent.pointerUp(handle, { pointerId: 1, clientY: 0 });
    fireEvent.click(handle);
    expect(onSelectionChange).not.toHaveBeenCalled();
    expect(screen.getAllByRole("checkbox").every((box) => !(box as HTMLInputElement).checked)).toBe(true);
  });

  it("does not call onRowClick for a press on the handle", () => {
    const onRowClick = vi.fn();
    renderTable({ enableRowReorder: true, onRowClick });

    const handle = handles()[0]!;
    fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientY: 0 });
    fireEvent.pointerUp(handle, { pointerId: 1, clientY: 0 });
    fireEvent.click(handle);
    expect(onRowClick).not.toHaveBeenCalled();

    fireEvent.click(within(bodyRows()[0]!).getByText("User 01"));
    expect(onRowClick).toHaveBeenCalledTimes(1);
  });

  it("has no axe violations with reordering on, at rest and mid-drag", async () => {
    const { container } = render(<Reorderable enableRowSelection />);
    expect(await violations(container)).toEqual([]);

    const handle = handles()[0]!;
    act(() => handle.focus());
    key(handle, " ");
    key(handle, "ArrowDown");
    expect(await violations(container)).toEqual([]);
  });
});

describe("row reordering with a Row slot defined during render", () => {
  /** A table whose Row slot is a new component on every render, so every row is re-created each time. */
  function InlineRowTable({ onMove }: { onMove: (change: RowOrderChange<User>) => void }) {
    const [rows, setRows] = useState(() => users(3));
    return (
      <DataTable<User>
        data={rows}
        columns={columns}
        components={{ Row: (props) => <tr {...props} /> }}
        enableRowReorder
        enablePagination={false}
        onRowOrderChange={(change) => {
          onMove(change);
          setRows(change.data);
        }}
      />
    );
  }

  it("keeps a keyboard drag going while the rows are re-created, and warns once while building", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    resetProviderWarnings();
    const onMove = vi.fn();
    const { rerender } = render(<InlineRowTable onMove={onMove} />);
    // The parent re-renders, as an app does: each time the Row slot is a new component.
    for (let n = 0; n < 3; n++) rerender(<InlineRowTable onMove={onMove} />);

    act(() => handles()[0]!.focus());
    fireEvent.keyDown(handles()[0]!, { key: " " });
    expect(handles()[0]).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
    fireEvent.keyDown(document.activeElement!, { key: " " });

    expect(onMove).toHaveBeenCalledTimes(1);
    expect(names()).toEqual(["User 02", "User 01", "User 03"]);
    expect(warn.mock.calls.filter(([message]) => String(message).includes("Row slot"))).toHaveLength(1);
  });
});

describe("row reordering while a column is sorted", () => {
  /** A reorderable table that stores each new order, sorted by name, descending. */
  function SortedTable(props: Partial<DataTableProps<User>>) {
    const [rows, setRows] = useState(() => users(3));
    return (
      <DataTable<User>
        data={rows}
        columns={columns}
        enableRowReorder
        enablePagination={false}
        defaultSorting={[{ id: "name", desc: true }]}
        onRowOrderChange={(change) => setRows(change.data)}
        {...props}
      />
    );
  }

  it("clears the sort on a drop by default, so the new order shows", () => {
    const onSortingChange = vi.fn();
    render(<SortedTable onSortingChange={onSortingChange} />);
    expect(names()).toEqual(["User 03", "User 02", "User 01"]);

    act(() => handles()[0]!.focus());
    fireEvent.keyDown(handles()[0]!, { key: " " });
    fireEvent.keyDown(handles()[0]!, { key: "ArrowDown" });
    fireEvent.keyDown(handles()[0]!, { key: " " });

    expect(onSortingChange).toHaveBeenLastCalledWith([]);
    // The order on screen, with User 03 moved below User 02, is what is stored and shown.
    expect(names()).toEqual(["User 02", "User 03", "User 01"]);
    expect(headerCells().find((cell) => cell.textContent === "Name")).toHaveAttribute("aria-sort", "none");
  });

  it("disables the handles while sorted with reorderWhileSorted=\"block\"", () => {
    const { rerender } = render(<SortedTable reorderWhileSorted="block" />);
    expect(handles().every((handle) => handle.hasAttribute("disabled"))).toBe(true);
    rerender(<SortedTable reorderWhileSorted="block" sorting={[]} />);
    expect(handles().some((handle) => handle.hasAttribute("disabled"))).toBe(false);
  });
});

describe("dragging several selected rows", () => {
  function SelectableTable({ onMove }: { onMove: (change: RowOrderChange<User>) => void }) {
    const [rows, setRows] = useState(() => users(5));
    return (
      <DataTable<User>
        data={rows}
        columns={columns}
        enableRowSelection
        enableRowReorder
        enablePagination={false}
        onRowOrderChange={(change) => {
          onMove(change);
          setRows(change.data);
        }}
      />
    );
  }

  const select = (name: string) =>
    fireEvent.click(within(bodyRows().find((row) => row.textContent?.includes(name))!).getByRole("checkbox"));

  it("moves every selected sibling with the dragged one, together and in their order", () => {
    const onMove = vi.fn();
    render(<SelectableTable onMove={onMove} />);
    select("User 01");
    select("User 03");

    act(() => handles()[0]!.focus());
    fireEvent.keyDown(handles()[0]!, { key: " " });
    expect(bodyRows()[2]).toHaveAttribute("data-dragging-child");
    fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
    fireEvent.keyDown(document.activeElement!, { key: " " });

    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove.mock.calls[0]![0]).toMatchObject({ rowId: "u1", rowIds: ["u1", "u3"], targetId: "u4", position: "before" });
    expect(names()).toEqual(["User 02", "User 01", "User 03", "User 04", "User 05"]);
  });

  it("puts a scattered selection together where it is dropped, even without moving", () => {
    const onMove = vi.fn();
    render(<SelectableTable onMove={onMove} />);
    select("User 02");
    select("User 05");
    act(() => handles()[1]!.focus());
    fireEvent.keyDown(handles()[1]!, { key: " " });
    fireEvent.keyDown(document.activeElement!, { key: " " });
    expect(names()).toEqual(["User 01", "User 02", "User 05", "User 03", "User 04"]);
  });

  it("moves the dragged row alone when it is not selected", () => {
    const onMove = vi.fn();
    render(<SelectableTable onMove={onMove} />);
    select("User 03");
    act(() => handles()[0]!.focus());
    fireEvent.keyDown(handles()[0]!, { key: " " });
    fireEvent.keyDown(handles()[0]!, { key: "ArrowDown" });
    fireEvent.keyDown(handles()[0]!, { key: " " });
    expect(onMove.mock.calls[0]![0]).toMatchObject({ rowIds: ["u1"] });
    expect(names()).toEqual(["User 02", "User 01", "User 03", "User 04", "User 05"]);
  });
});

describe("dragging rows between tables of a reorder group", () => {
  /** Two tables in one group, each storing what a transfer gives it. */
  function Board({
    todo: firstTodo = users(3),
    done: firstDone = users(2, 10),
    onTransfer,
    canDropDone,
  }: {
    todo?: User[];
    done?: User[];
    onTransfer?: (table: string, transfer: RowTransfer<User>) => void;
    canDropDone?: DataTableProps<User>["canDrop"];
  }) {
    const [todo, setTodo] = useState(firstTodo);
    const [done, setDone] = useState(firstDone);
    return (
      <>
        <DataTable<User>
          data={todo}
          columns={columns}
          enableRowReorder
          enablePagination={false}
          reorderGroup="board"
          reorderTableId="todo"
          onRowOrderChange={(change) => setTodo(change.data)}
          onRowTransfer={(transfer) => {
            onTransfer?.("todo", transfer);
            setTodo(transfer.data);
          }}
          aria-label="Todo"
        />
        <DataTable<User>
          data={done}
          columns={columns}
          enableRowReorder
          enablePagination={false}
          reorderGroup="board"
          reorderTableId="done"
          canDrop={canDropDone}
          onRowOrderChange={(change) => setDone(change.data)}
          onRowTransfer={(transfer) => {
            onTransfer?.("done", transfer);
            setDone(transfer.data);
          }}
          aria-label="Done"
        />
      </>
    );
  }

  const tableNames = (index: number) => {
    const body = screen.getAllByRole("rowgroup").filter((group) => group.hasAttribute("data-reorder-table"))[index]!;
    return within(body).queryAllByRole("row").map((row) => within(row).queryByText(/^User \d+$/)?.textContent ?? "");
  };

  it("moves a row into the next table with the keyboard, past its last row", () => {
    const onTransfer = vi.fn();
    render(<Board onTransfer={onTransfer} />);
    const handle = handles()[2]!;
    act(() => handle.focus());
    fireEvent.keyDown(handle, { key: " " });
    // Already the last row: the next step goes into Done, above its first row.
    fireEvent.keyDown(handle, { key: "ArrowDown" });
    expect(tableNames(1)[0]).toBe("User 10");
    const doneRows = screen.getAllByRole("rowgroup").filter((group) => group.hasAttribute("data-reorder-table"))[1]!;
    expect(within(doneRows).getAllByRole("row")[0]).toHaveAttribute("data-drop-incoming");
    fireEvent.keyDown(handle, { key: " " });

    expect(tableNames(0)).toEqual(["User 01", "User 02"]);
    expect(tableNames(1)).toEqual(["User 03", "User 10", "User 11"]);
    expect(onTransfer).toHaveBeenCalledTimes(2);
    const [, transfer] = onTransfer.mock.calls[0]!;
    expect(transfer).toMatchObject({ rowIds: ["u3"], from: { tableId: "todo" }, to: { tableId: "done", index: 0, targetId: "u10", position: "before" } });
  });

  it("comes back to its own table with the keyboard", () => {
    const onTransfer = vi.fn();
    render(<Board onTransfer={onTransfer} />);
    const handle = handles()[2]!;
    act(() => handle.focus());
    fireEvent.keyDown(handle, { key: " " });
    fireEvent.keyDown(handle, { key: "ArrowDown" });
    fireEvent.keyDown(handle, { key: "ArrowUp" });
    fireEvent.keyDown(handle, { key: "ArrowUp" });
    fireEvent.keyDown(handle, { key: " " });
    expect(onTransfer).not.toHaveBeenCalled();
    expect(tableNames(0)).toEqual(["User 01", "User 03", "User 02"]);
  });

  it("does not drop where the other table's canDrop refuses", () => {
    const onTransfer = vi.fn();
    render(<Board onTransfer={onTransfer} canDropDone={(move) => move.fromTableId !== "todo"} />);
    const handle = handles()[2]!;
    act(() => handle.focus());
    fireEvent.keyDown(handle, { key: " " });
    fireEvent.keyDown(handle, { key: "ArrowDown" });
    fireEvent.keyDown(handle, { key: " " });
    expect(onTransfer).not.toHaveBeenCalled();
    expect(tableNames(1)).toEqual(["User 10", "User 11"]);
  });

  it("drops into an empty table, and lets a table's only row leave", () => {
    const onTransfer = vi.fn();
    render(<Board todo={users(1)} done={[]} onTransfer={onTransfer} />);
    const handle = handles()[0]!;
    expect(handle).not.toBeDisabled();
    act(() => handle.focus());
    fireEvent.keyDown(handle, { key: " " });
    fireEvent.keyDown(handle, { key: "ArrowDown" });
    fireEvent.keyDown(handle, { key: " " });
    expect(onTransfer.mock.calls[0]![1]).toMatchObject({ to: { tableId: "done", index: 0, targetId: null }, from: { data: [] } });
    expect(tableNames(1)).toEqual(["User 01"]);
  });

  it("drops a row into another table with the pointer, a floating copy following it", async () => {
    const onTransfer = vi.fn();
    render(<Board onTransfer={onTransfer} />);
    const [todoBody, doneBody] = screen.getAllByRole("rowgroup").filter((group) => group.hasAttribute("data-reorder-table"));
    // Todo's body spans 0-120, Done's 200-280, each row 40 tall.
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
      const box = (top: number, height: number) => ({ top, bottom: top + height, height, left: 0, right: 300, width: 300, x: 0, y: top, toJSON: () => ({}) });
      if (this === todoBody) return box(0, 120);
      if (this === doneBody) return box(200, 80);
      const row = this.closest("[data-row-id]");
      if (row && row.parentElement) {
        const index = Array.from(row.parentElement.children).indexOf(row);
        return box((row.parentElement === doneBody ? 200 : 0) + index * 40, 40);
      }
      return box(0, 0);
    });
    const handle = handles()[0]!;
    fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientX: 10, clientY: 20 });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 10, clientY: 270 });
    await waitFor(() => expect(document.querySelector("[data-reorder-ghost]")).not.toBeNull());
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 10, clientY: 270 });
    expect(onTransfer.mock.calls[0]![1]).toMatchObject({ rowIds: ["u1"], to: { tableId: "done", index: 2, targetId: "u11", position: "after" } });
    expect(tableNames(1)).toEqual(["User 10", "User 11", "User 01"]);
    expect(document.querySelector("[data-reorder-ghost]")).toBeNull();
  });
});
