import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DataTable } from "../DataTable";
import { bodyRows, columns, firstColumn, renderTable, users, type User } from "./builders";

describe("pagination", () => {
  it("paginates client-side with internal state", async () => {
    const { user: events } = renderTable({ data: users(25) });

    expect(bodyRows()).toHaveLength(10);
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();

    await events.click(screen.getByRole("button", { name: "Next page" }));
    expect(firstColumn()[0]).toBe("User 11");
    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
  });

  it("changes the page size from the select", async () => {
    const { user: events } = renderTable({ data: users(30) });
    await events.selectOptions(screen.getByLabelText("Rows per page"), "25");
    expect(bodyRows()).toHaveLength(25);
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
  });

  it("uses custom page size options and keeps an unlisted current size", () => {
    renderTable({
      data: users(5),
      pageSizeOptions: [5, 20],
      defaultPagination: { pageIndex: 0, pageSize: 7 },
    });
    const options = screen.getAllByRole("option").map((option) => option.textContent);
    expect(options).toEqual(["5", "7", "20"]);
  });

  it("uses rowCount for manual (server-side) pagination", async () => {
    const onPaginationChange = vi.fn();
    const { user: events } = renderTable({
      data: users(10),
      manualPagination: true,
      rowCount: 42,
      pagination: { pageIndex: 0, pageSize: 10 },
      onPaginationChange,
    });

    expect(screen.getByText("Page 1 of 5")).toBeInTheDocument();
    await events.click(screen.getByRole("button", { name: "Next page" }));
    expect(onPaginationChange).toHaveBeenCalledWith({ pageIndex: 1, pageSize: 10 });
  });

  it("renders every row and no pagination with enablePagination={false}", () => {
    renderTable({ data: users(15), enablePagination: false });
    expect(bodyRows()).toHaveLength(15);
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("hides the pagination UI but still paginates with hidePagination", () => {
    renderTable({ data: users(15), hidePagination: true });
    expect(bodyRows()).toHaveLength(10);
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("steps back a page when the current page comes back empty", () => {
    const onPaginationChange = vi.fn();
    const props = {
      columns,
      manualPagination: true,
      pagination: { pageIndex: 2, pageSize: 10 },
      onPaginationChange,
    };
    const { rerender } = renderTable({ ...props, data: users(10, 21), rowCount: 30 });
    expect(onPaginationChange).not.toHaveBeenCalled();

    /** The last row of page 3 was deleted: the server now reports 20 rows. */
    rerender(<DataTable<User> {...props} data={[]} rowCount={20} />);
    expect(onPaginationChange).toHaveBeenCalledWith({ pageIndex: 1, pageSize: 10 });
  });

  it("waits for the new page's data before stepping back again", () => {
    const onPaginationChange = vi.fn();
    const props = { columns, manualPagination: true, onPaginationChange };
    const { rerender } = renderTable({
      ...props,
      data: [],
      rowCount: 130,
      pagination: { pageIndex: 13, pageSize: 10 },
    });
    expect(onPaginationChange).toHaveBeenLastCalledWith({ pageIndex: 12, pageSize: 10 });

    /** The parent moved to page 13 but hasn't started fetching it: `data` is still the old, empty page. */
    onPaginationChange.mockClear();
    rerender(
      <DataTable<User> {...props} data={[]} rowCount={130} pagination={{ pageIndex: 12, pageSize: 10 }} />,
    );
    expect(onPaginationChange).not.toHaveBeenCalled();
  });

  it("does not step back while loading", () => {
    const onPaginationChange = vi.fn();
    renderTable({
      data: [],
      loading: true,
      manualPagination: true,
      rowCount: 20,
      pagination: { pageIndex: 1, pageSize: 10 },
      onPaginationChange,
    });
    expect(onPaginationChange).not.toHaveBeenCalled();
  });
});
