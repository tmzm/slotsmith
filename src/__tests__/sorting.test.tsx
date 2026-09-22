import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { firstColumn, renderTable, user } from "./builders";

const shuffled = [user(2), user(3), user(1)];

describe("sorting", () => {
  it("sorts client-side with no sorting props (asc → desc → cleared)", async () => {
    const { user: events } = renderTable({ data: shuffled });
    const header = screen.getByRole("columnheader", { name: /name/i });
    const trigger = screen.getByRole("button", { name: /name/i });

    expect(header).toHaveAttribute("aria-sort", "none");

    await events.click(trigger);
    expect(firstColumn()).toEqual(["User 01", "User 02", "User 03"]);
    expect(header).toHaveAttribute("aria-sort", "ascending");

    await events.click(trigger);
    expect(firstColumn()).toEqual(["User 03", "User 02", "User 01"]);
    expect(header).toHaveAttribute("aria-sort", "descending");

    await events.click(trigger);
    expect(firstColumn()).toEqual(["User 02", "User 03", "User 01"]);
    expect(header).toHaveAttribute("aria-sort", "none");
  });

  it("sorts numbers ascending first too", async () => {
    const { user: events } = renderTable({
      data: [user(1, { age: 40 }), user(2, { age: 18 }), user(3, { age: 30 })],
    });
    await events.click(screen.getByRole("button", { name: "Age" }));
    expect(firstColumn()).toEqual(["User 02", "User 03", "User 01"]);
  });

  it("reports changes and leaves order alone with manualSorting", async () => {
    const onSortingChange = vi.fn();
    const { user: events } = renderTable({
      data: shuffled,
      sorting: [],
      onSortingChange,
      manualSorting: true,
    });

    await events.click(screen.getByRole("button", { name: /name/i }));

    expect(onSortingChange).toHaveBeenCalledWith([{ id: "name", desc: false }]);
    expect(firstColumn()).toEqual(["User 02", "User 03", "User 01"]);
  });

  it("follows the controlled sorting value", () => {
    renderTable({ data: shuffled, sorting: [{ id: "name", desc: true }] });
    expect(firstColumn()).toEqual(["User 03", "User 02", "User 01"]);
  });

  it("does not make columns with enableSorting: false clickable", () => {
    renderTable({
      columns: [{ accessorKey: "name", header: "Name", enableSorting: false }],
    });
    expect(screen.queryByRole("button", { name: /name/i })).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /name/i })).not.toHaveAttribute("aria-sort");
  });
});
