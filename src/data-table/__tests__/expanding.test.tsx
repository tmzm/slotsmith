import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
});
