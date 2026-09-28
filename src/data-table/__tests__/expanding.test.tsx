import { act, fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { resetReorderWarnings } from "../core/useDataTable";
import { bodyRows, firstColumn, renderTable, user, type User } from "./builders";

const tree: User[] = [
  user(1, { children: [user(11), user(12, { children: [user(121)] })] }),
  user(2),
];
const getSubRows = (row: User) => row.children;

describe("expandable rows", () => {
  it("renders only top-level rows until expanded", () => {
    renderTable({ data: tree, getSubRows });
    expect(firstColumn()).toEqual(["User 01", "User 02"]);
  });

  it("expands and collapses with the toggle", async () => {
    const { user: events } = renderTable({ data: tree, getSubRows });

    await events.click(screen.getByRole("button", { name: "Expand row" }));
    expect(firstColumn()).toEqual(["User 01", "User 11", "User 12", "User 02"]);
    expect(bodyRows()[1]).toHaveAttribute("data-depth", "1");

    await events.click(screen.getAllByRole("button", { name: "Collapse row" })[0]!);
    expect(firstColumn()).toEqual(["User 01", "User 02"]);
  });

  it("only shows toggles on rows that have children", () => {
    renderTable({ data: tree, getSubRows });
    expect(within(bodyRows()[1]!).queryByRole("button")).not.toBeInTheDocument();
  });

  it("expands everything with defaultExpanded: true", () => {
    renderTable({ data: tree, getSubRows, defaultExpanded: true });
    expect(firstColumn()).toEqual(["User 01", "User 11", "User 12", "User 121", "User 02"]);
  });

  it("reports controlled expansion", async () => {
    const onExpandedChange = vi.fn();
    const { user: events } = renderTable({ data: tree, getSubRows, expanded: {}, onExpandedChange });
    await events.click(screen.getByRole("button", { name: "Expand row" }));
    expect(onExpandedChange).toHaveBeenCalledWith({ u1: true });
  });

  it("selecting a parent selects its children", async () => {
    const onSelectionChange = vi.fn();
    const { user: events } = renderTable({
      data: tree,
      getSubRows,
      defaultExpanded: true,
      enableRowSelection: true,
      onSelectionChange,
    });

    await events.click(within(bodyRows()[0]!).getByRole("checkbox"));
    const ids = onSelectionChange.mock.lastCall?.[0].map((row: User) => row.id);
    expect(ids).toEqual(expect.arrayContaining(["u1", "u11", "u12", "u121"]));
  });

  it("reorders with enableRowReorder: a handle on every row, sub-rows too, and no warning", async () => {
    resetReorderWarnings();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { container, user: events } = renderTable({ data: tree, getSubRows, enableRowReorder: true });
    await events.click(screen.getByRole("button", { name: "Expand row" }));

    const handles = screen.getAllByRole("button", { name: "Reorder row" });
    expect(handles).toHaveLength(4);
    expect(within(bodyRows()[1]!).getAllByRole("cell")[0]).toHaveAttribute("data-slot", "drag");
    expect(container.querySelector("[role=status][aria-live=assertive]")).not.toBeNull();
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
    resetReorderWarnings();
  });

  it("moves a sub-row among its siblings by keyboard, and marks the lifted block", () => {
    const onRowOrderChange = vi.fn();
    renderTable({ data: tree, getSubRows, defaultExpanded: true, enableRowReorder: true, onRowOrderChange });
    const handleOf = (index: number) => within(bodyRows()[index]!).getByRole("button", { name: "Reorder row" });

    // Rows: User 01, User 11, User 12, User 121 (an only child), User 02.
    expect(handleOf(3)).toBeDisabled();
    act(() => handleOf(0).focus());
    fireEvent.keyDown(handleOf(0), { key: " " });
    expect(bodyRows()[0]).toHaveAttribute("data-dragging", "");
    expect(bodyRows().slice(1, 4).every((row) => row.hasAttribute("data-dragging-child"))).toBe(true);
    fireEvent.keyDown(handleOf(0), { key: "Escape" });

    act(() => handleOf(1).focus());
    fireEvent.keyDown(handleOf(1), { key: " " });
    fireEvent.keyDown(handleOf(1), { key: "ArrowDown" });
    fireEvent.keyDown(handleOf(1), { key: " " });
    expect(onRowOrderChange).toHaveBeenCalledTimes(1);
    const change = onRowOrderChange.mock.calls[0]![0];
    expect(change.parentId).toBe("u1");
    expect(change.siblings.map((row: User) => row.id)).toEqual(["u12", "u11"]);
    expect(change.data).toEqual(tree);
  });
});
