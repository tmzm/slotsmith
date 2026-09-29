import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { DataTable, type DataTableProps } from "../../index";
import { shadcnDataTable } from "./shadcn/components";
import {
  bodyRows,
  dragHandles,
  employeeColumns,
  employees,
  failOnReactWarnings,
  keyboardReorder,
  names,
  ReorderableEmployees,
  stubBrowserApis,
  type Employee,
} from "./shared";

/**
 * Render shadcn table
 *
 * `<DataTable>` with an editorial layout's shadcn slots.
 */
function renderShadcnTable(props: Partial<DataTableProps<Employee>> = {}) {
  const user = userEvent.setup();
  render(
    <DataTable<Employee>
      data={employees(23)}
      columns={employeeColumns}
      components={shadcnDataTable}
      {...props}
    />,
  );
  return user;
}

beforeAll(stubBrowserApis);

describe("shadcn/ui (editorial layout)", () => {
  failOnReactWarnings();

  it("renders with shadcn's table primitives", () => {
    renderShadcnTable();
    expect(document.querySelector("[data-slot=table-container] > table[data-slot=table]")).not.toBeNull();
    expect(document.querySelectorAll("[data-slot=table-head]")).toHaveLength(2);
    expect(bodyRows()[0]).toHaveAttribute("data-slot", "table-row");
    expect(within(bodyRows()[0]!).getAllByRole("cell")[0]).toHaveAttribute("data-slot", "table-cell");
  });

  it("keeps shadcn's classes while adding the table's", () => {
    renderShadcnTable();
    const salaryCell = within(bodyRows()[0]!).getAllByRole("cell")[1]!;
    expect(salaryCell).toHaveClass("px-6", "py-2");
    expect(salaryCell).toHaveAttribute("data-align", "end");
  });

  it("sorts from the header", async () => {
    const user = renderShadcnTable({ data: employees(3).reverse() });
    await user.click(screen.getByRole("button", { name: "Name" }));
    expect(names()).toEqual(["Employee 01", "Employee 02", "Employee 03"]);
  });

  it("selects with radix checkboxes and marks rows for data-[state=selected]", async () => {
    const onSelectionChange = vi.fn();
    const user = renderShadcnTable({ enableRowSelection: true, onSelectionChange });

    const [selectAll, first] = screen.getAllByRole("checkbox");
    expect(selectAll).toHaveAttribute("data-slot", "checkbox");

    await user.click(first!);
    expect(onSelectionChange).toHaveBeenLastCalledWith([employees(1)[0]]);
    expect(bodyRows()[0]).toHaveAttribute("data-state", "selected");
    expect(selectAll).toHaveAttribute("aria-checked", "mixed");

    await user.click(selectAll!);
    expect(onSelectionChange.mock.lastCall?.[0]).toHaveLength(10);
    expect(selectAll).toHaveAttribute("aria-checked", "true");
  });

  it("paginates with editorial-style numbered pages", async () => {
    const user = renderShadcnTable();
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Pagination" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Previous page" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "3" }));
    expect(screen.getByText("Page 3 of 3")).toBeInTheDocument();
    expect(names()).toEqual(["Employee 21", "Employee 22", "Employee 23"]);
    expect(screen.queryByRole("button", { name: "Next page" })).not.toBeInTheDocument();
  });

  it("changes the page size with the radix select (keyboard)", async () => {
    const user = renderShadcnTable();
    screen.getByRole("combobox", { name: "Rows per page" }).focus();
    await user.keyboard("{Enter}");
    await user.click(await screen.findByRole("option", { name: "25" }));
    expect(bodyRows()).toHaveLength(23);
  });

  it("shows shadcn skeletons while loading", () => {
    renderShadcnTable({ loading: true, defaultPagination: { pageIndex: 0, pageSize: 5 } });
    expect(document.querySelectorAll("[data-slot=skeleton]")).toHaveLength(5 * 2);
  });

  it("shows the empty placeholder across every column", () => {
    renderShadcnTable({ data: [], enableRowSelection: true });
    const cell = within(bodyRows()[0]!).getByRole("cell");
    expect(cell).toHaveAttribute("colspan", "3");
    expect(within(cell).getByText("No data found")).toBeInTheDocument();
    expect(cell).toHaveTextContent(/^No data found$/);
  });

  it("takes every word from the labels", async () => {
    const labels = {
      empty: "لا توجد بيانات",
      rowsPerPage: "صفوف في الصفحة",
      pageInfo: (page: number, pageCount: number) => `الصفحة ${page} من ${pageCount}`,
      pagination: "ترقيم الصفحات",
      previousPage: "الصفحة السابقة",
      nextPage: "الصفحة التالية",
    };
    const user = renderShadcnTable({ labels });
    expect(screen.getByText("الصفحة 1 من 3")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "صفوف في الصفحة" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "ترقيم الصفحات" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "الصفحة التالية" }));
    expect(screen.getByRole("button", { name: "الصفحة السابقة" })).toBeInTheDocument();
  });

  it("shows a custom empty label, and nothing else, in the empty state", () => {
    renderShadcnTable({ data: [], labels: { empty: "Nothing here yet" } });
    expect(within(bodyRows()[0]!).getByRole("cell")).toHaveTextContent(/^Nothing here yet$/);
  });

  it("retries from the error state", async () => {
    const onRetry = vi.fn();
    const user = renderShadcnTable({ error: new Error("500"), onRetry });
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("reorders rows by keyboard with a ghost icon Button drag handle", async () => {
    const onMove = vi.fn();
    const user = userEvent.setup();
    render(<ReorderableEmployees components={shadcnDataTable} initial={employees(3)} onMove={onMove} />);
    const handle = dragHandles()[0]!;
    expect(handle).toHaveAttribute("data-slot", "button");
    expect(handle).toHaveAttribute("data-variant", "ghost");
    expect(handle).toHaveAttribute("data-size", "icon");
    expect(handle.querySelector("svg.lucide-grip-vertical")).not.toBeNull();
    expect(bodyRows()[0]!.className).toContain("data-dragging:");
    await keyboardReorder(user, onMove);
  });

  it("never submits a surrounding form from its drag handle", () => {
    const onSubmit = vi.fn((event: SubmitEvent) => event.preventDefault());
    render(
      <form onSubmit={(event) => onSubmit(event.nativeEvent as SubmitEvent)}>
        <ReorderableEmployees components={shadcnDataTable} initial={employees(3)} />
      </form>,
    );
    fireEvent.click(dragHandles()[0]!);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
