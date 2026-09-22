import { render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { DataTable } from "../DataTable";
import { bodyRows, columns, renderTable, user, users, type User } from "./builders";

const rowCheckbox = (index: number) => within(bodyRows()[index]!).getByRole("checkbox");
const selectAll = () => screen.getByRole("checkbox", { name: "Select all rows on this page" });

describe("row selection", () => {
  it("shows no checkboxes unless enableRowSelection is set", () => {
    renderTable();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("reports selected rows as data objects", async () => {
    const onSelectionChange = vi.fn();
    const data = users(3);
    const { user: events } = renderTable({ data, enableRowSelection: true, onSelectionChange });

    await events.click(rowCheckbox(1));
    expect(onSelectionChange).toHaveBeenLastCalledWith([data[1]]);
    expect(bodyRows()[1]).toHaveAttribute("data-state", "selected");
  });

  it("select-all only selects the current page", async () => {
    const onSelectionChange = vi.fn();
    const { user: events } = renderTable({
      data: users(15),
      enableRowSelection: true,
      onSelectionChange,
    });

    await events.click(selectAll());
    expect(onSelectionChange.mock.lastCall?.[0]).toHaveLength(10);
    expect(selectAll()).toBeChecked();
  });

  it("marks select-all as indeterminate on a partial selection", async () => {
    const { user: events } = renderTable({ data: users(3), enableRowSelection: true });
    await events.click(rowCheckbox(0));
    expect((selectAll() as HTMLInputElement).indeterminate).toBe(true);
  });

  it("disables rows rejected by an enableRowSelection function", () => {
    renderTable({
      data: users(3),
      enableRowSelection: (row) => row.original.id !== "u2",
    });
    expect(rowCheckbox(0)).toBeEnabled();
    expect(rowCheckbox(1)).toBeDisabled();
  });

  it("keeps rows from other server pages selected", async () => {
    const onSelectionChange = vi.fn();
    const fromOtherPage = user(99);
    const page = users(3);
    const { user: events } = renderTable({
      data: page,
      manualPagination: true,
      rowCount: 100,
      enableRowSelection: true,
      selection: [fromOtherPage],
      onSelectionChange,
    });

    await events.click(rowCheckbox(0));
    expect(onSelectionChange).toHaveBeenLastCalledWith([fromOtherPage, page[0]]);
  });

  it("recognises a controlled selection made of fresh objects (by id)", () => {
    renderTable({
      data: users(3),
      enableRowSelection: true,
      selection: [{ ...user(2) }],
    });
    expect(rowCheckbox(1)).toBeChecked();
  });

  it("clears the selection on page change with resetSelectionOnPageChange", async () => {
    const onSelectionChange = vi.fn();
    const { user: events } = renderTable({
      data: users(15),
      enableRowSelection: true,
      resetSelectionOnPageChange: true,
      onSelectionChange,
    });

    await events.click(rowCheckbox(0));
    await events.click(screen.getByRole("button", { name: "Next page" }));
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
  });

  it("works fully controlled", async () => {
    const events = userEvent.setup();
    function Controlled() {
      const [selection, setSelection] = useState<User[]>([]);
      return (
        <>
          <output>{selection.map((row) => row.id).join(",")}</output>
          <DataTable<User>
            data={users(3)}
            columns={columns}
            enableRowSelection
            selection={selection}
            onSelectionChange={setSelection}
          />
        </>
      );
    }
    render(<Controlled />);

    await events.click(rowCheckbox(2));
    await events.click(rowCheckbox(0));
    expect(screen.getByRole("status")).toHaveTextContent("u3,u1");

    await events.click(rowCheckbox(2));
    expect(screen.getByRole("status")).toHaveTextContent("u1");
  });

  it("does not trigger onRowClick when clicking a checkbox", async () => {
    const onRowClick = vi.fn();
    const { user: events } = renderTable({ enableRowSelection: true, onRowClick });

    await events.click(rowCheckbox(0));
    expect(onRowClick).not.toHaveBeenCalled();

    await events.click(within(bodyRows()[0]!).getByText("User 01"));
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick.mock.calls[0]?.[0].original.id).toBe("u1");
  });
});
