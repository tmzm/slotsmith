import { act, fireEvent, render, screen, within } from "@testing-library/react";
import axe from "axe-core";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DataTable, type DataTableProps } from "../DataTable";
import type { DataTableColumnDef } from "../core/features";
import type { RowOrderChange } from "../core/reorder";
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
