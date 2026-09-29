import { arSA } from "@mui/material/locale";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { DataTable, type DataTableProps } from "../../index";
import { muiComponents } from "./mui/components";
import {
  bodyRows,
  dragHandles,
  employeeColumns,
  employees,
  failOnReactWarnings,
  keyboardReorder,
  names,
  ReorderableEmployees,
  reorderStatus,
  stubBrowserApis,
  type Employee,
} from "./shared";

/**
 * MUI wrapper
 *
 * `ThemeProvider` with a default theme.
 */
const theme = createTheme();
const Wrapper = ({ children }: { children: ReactNode }) => <ThemeProvider theme={theme}>{children}</ThemeProvider>;

/**
 * RTL wrapper
 *
 * a CMS admin panel's setup: an RTL theme with the `arSA` locale, under `dir="rtl"`.
 */
const rtlTheme = createTheme({ direction: "rtl" }, arSA);
const RtlWrapper = ({ children }: { children: ReactNode }) => (
  <ThemeProvider theme={rtlTheme}>
    <div dir="rtl">{children}</div>
  </ThemeProvider>
);

/**
 * Render MUI table
 *
 * `<DataTable>` with MUI v7 slots inside `ThemeProvider`.
 */
function renderMuiTable(props: Partial<DataTableProps<Employee>> = {}, wrapper = Wrapper) {
  const user = userEvent.setup();
  render(
    <DataTable<Employee> data={employees(23)} columns={employeeColumns} components={muiComponents} {...props} />,
    { wrapper },
  );
  return user;
}

beforeAll(stubBrowserApis);

describe("MUI v7 (CMS admin panel)", () => {
  failOnReactWarnings();

  it("renders with MUI's table components", () => {
    renderMuiTable();
    expect(screen.getByRole("table")).toHaveClass("MuiTable-root");
    expect(screen.getAllByRole("columnheader")[0]).toHaveClass("MuiTableCell-head");
    expect(bodyRows()[0]).toHaveClass("MuiTableRow-root");
    expect(within(bodyRows()[0]!).getAllByRole("cell")[0]).toHaveClass("MuiTableCell-body");
  });

  it("sorts from the header", async () => {
    const user = renderMuiTable({ data: employees(3).reverse() });
    await user.click(screen.getByRole("button", { name: /Name/ }));
    expect(names()).toEqual(["Employee 01", "Employee 02", "Employee 03"]);
  });

  it("selects with MUI checkboxes and marks the row Mui-selected", async () => {
    const onSelectionChange = vi.fn();
    const user = renderMuiTable({ enableRowSelection: true, onSelectionChange });

    await user.click(screen.getAllByRole("checkbox", { name: "Select row" })[0]!);
    expect(onSelectionChange).toHaveBeenLastCalledWith([employees(1)[0]]);
    expect(bodyRows()[0]).toHaveClass("Mui-selected");

    const selectAll = screen.getByRole("checkbox", { name: "Select all rows on this page" });
    expect(selectAll).toHaveAttribute("data-indeterminate", "true");
    await user.click(selectAll);
    expect(onSelectionChange.mock.lastCall?.[0]).toHaveLength(10);
  });

  it("paginates with MUI's Pagination", async () => {
    const user = renderMuiTable();
    await user.click(screen.getByRole("button", { name: "Go to page 3" }));
    expect(names()).toEqual(["Employee 21", "Employee 22", "Employee 23"]);
    expect(screen.getByText("21–23 of 23")).toBeInTheDocument();
  });

  it("changes the page size with TablePagination's select", async () => {
    const user = renderMuiTable();
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "25" }));
    expect(bodyRows()).toHaveLength(23);
  });

  it("shows one CircularProgress while loading, like a CMS admin panel", () => {
    renderMuiTable({ loading: true });
    /** Loading rows are aria-hidden; the root announces aria-busy instead. */
    expect(screen.getAllByRole("progressbar", { hidden: true })).toHaveLength(1);
    expect(screen.getByRole("table").closest("[aria-busy]")).toHaveAttribute("aria-busy", "true");
  });

  it("shows the empty message across every column", () => {
    renderMuiTable({ data: [], enableRowSelection: true, labels: { empty: "لا يوجد بيانات" } });
    const cell = within(bodyRows()[0]!).getByRole("cell");
    expect(cell).toHaveAttribute("colspan", "3");
    expect(within(cell).getByText("لا يوجد بيانات")).toBeInTheDocument();
  });

  it("retries from the error state", async () => {
    const onRetry = vi.fn();
    const user = renderMuiTable({ error: new Error("500"), onRetry });
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("works in RTL with the arSA locale, like a CMS admin panel", () => {
    const labelRowsPerPage = arSA.components?.MuiTablePagination?.defaultProps?.labelRowsPerPage;
    renderMuiTable({ labels: { selectRow: "تحديد الصف" }, enableRowSelection: true }, RtlWrapper);
    expect(screen.getByText(String(labelRowsPerPage))).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox", { name: "تحديد الصف" })).toHaveLength(10);
  });

  it("reorders rows by keyboard with an IconButton drag handle", async () => {
    const onMove = vi.fn();
    const user = userEvent.setup();
    render(<ReorderableEmployees components={muiComponents} initial={employees(3)} onMove={onMove} />, { wrapper: Wrapper });
    expect(dragHandles()[0]).toHaveClass("MuiIconButton-root");
    expect(within(dragHandles()[0]!).getByTestId("DragIndicatorIcon")).toBeInTheDocument();
    await keyboardReorder(user, onMove);
    expect(onMove.mock.calls[0]![0].data.map((row: Employee) => row.id)).toEqual(["e2", "e1", "e3"]);
  });

  it("lifts a row on pointer down and disables a lone row’s handle", () => {
    render(<ReorderableEmployees components={muiComponents} initial={employees(3)} />, { wrapper: Wrapper });
    fireEvent.pointerDown(dragHandles()[1]!, { button: 0, pointerId: 1, clientY: 0 });
    expect(bodyRows()[1]).toHaveAttribute("data-dragging", "");
    fireEvent.pointerCancel(window, { pointerId: 1 });
    expect(bodyRows()[1]).not.toHaveAttribute("data-dragging");

    const lone = { ...employees(1)[0]!, reports: employees(3).slice(1, 2) };
    render(<ReorderableEmployees components={muiComponents} initial={[lone, ...employees(3).slice(2)]} />, { wrapper: Wrapper });
    expect(within(screen.getAllByRole("table")[1]!).getAllByRole("button", { name: "Reorder row" })[1]).toBeDisabled();
  });

  it("moves a sub-row among its siblings by keyboard in a tree table", async () => {
    const onMove = vi.fn();
    const user = userEvent.setup();
    const [lead, first, second, other] = employees(4);
    const tree = [{ ...lead!, reports: [first!, second!] }, other!];
    render(<ReorderableEmployees components={muiComponents} initial={tree} onMove={onMove} />, { wrapper: Wrapper });
    // Rows: Employee 01, its reports 02 and 03, then Employee 04.

    act(() => dragHandles()[0]!.focus());
    await user.keyboard(" ");
    expect(bodyRows()[0]).toHaveAttribute("data-dragging", "");
    expect(bodyRows()[1]).toHaveAttribute("data-dragging-child", "");
    expect(bodyRows()[2]).toHaveAttribute("data-dragging-child", "");
    // The lifted block is opaque, so the rows it passes never show through.
    for (const row of bodyRows().slice(0, 3)) expect(getComputedStyle(row.querySelector("td")!).backgroundColor).toBe("rgb(255, 255, 255)");
    expect(getComputedStyle(bodyRows()[3]!.querySelector("td")!).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    await user.keyboard("{Escape}");
    expect(reorderStatus()).toHaveTextContent("Reordering cancelled.");

    act(() => dragHandles()[1]!.focus());
    await user.keyboard(" ");
    expect(reorderStatus()).toHaveTextContent("Row lifted. Position 1 of 2.");
    await user.keyboard("{ArrowDown}");
    expect(bodyRows()[2]).toHaveAttribute("data-drop-edge", "after");
    await user.keyboard(" ");

    const change = onMove.mock.calls[0]![0];
    expect(change.parentId).toBe("e1");
    expect(change.siblings.map((row: Employee) => row.id)).toEqual(["e3", "e2"]);
    expect(names()).toEqual(["Employee 01", "Employee 03", "Employee 02", "Employee 04"]);
    expect(document.activeElement).toBe(dragHandles()[2]);
  });
});
