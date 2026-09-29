import { ConfigProvider, theme } from "antd";
import arEG from "antd/locale/ar_EG";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { DataTable, type DataTableProps } from "../../index";
import { antdDataTable } from "./antd/components";
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
 * Ant Design wrapper
 *
 * `ConfigProvider` with the default theme.
 */
const Wrapper = ({ children }: { children: ReactNode }) => <ConfigProvider>{children}</ConfigProvider>;

/**
 * RTL wrapper
 *
 * An Arabic admin panel's setup: `ConfigProvider` in RTL with the `ar_EG`
 * locale, under `dir="rtl"`.
 */
const RtlWrapper = ({ children }: { children: ReactNode }) => (
  <ConfigProvider direction="rtl" locale={arEG}>
    <div dir="rtl">{children}</div>
  </ConfigProvider>
);

/** The default theme's tokens, to check the colours the skin paints with. */
const token = theme.getDesignToken();

/**
 * CSS colour
 *
 * @param color - A token colour, in any CSS syntax.
 * @returns The same colour as `getComputedStyle` reports it.
 */
function cssColor(color: string) {
  const probe = document.createElement("i");
  probe.style.backgroundColor = color;
  document.body.append(probe);
  const value = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return value;
}

/**
 * Render Ant Design table
 *
 * `<DataTable>` with Ant Design v6 slots inside `ConfigProvider`.
 */
function renderAntdTable(props: Partial<DataTableProps<Employee>> = {}, wrapper = Wrapper) {
  const user = userEvent.setup();
  render(
    <DataTable<Employee> data={employees(23)} columns={employeeColumns} components={antdDataTable} {...props} />,
    { wrapper },
  );
  return user;
}

beforeAll(stubBrowserApis);

describe("Ant Design v6 (admin panel)", () => {
  failOnReactWarnings();

  it("paints the table with the theme's tokens", () => {
    renderAntdTable();
    expect(getComputedStyle(screen.getAllByRole("columnheader")[0]!).fontWeight).toBe(String(token.fontWeightStrong));
    expect(getComputedStyle(within(bodyRows()[0]!).getAllByRole("cell")[0]!).borderBottomColor).toBe(
      cssColor(token.colorBorderSecondary),
    );
  });

  it("pads the cells like Ant's small table at the small size, and stripes every other row", () => {
    renderAntdTable({ size: "sm", striped: true });
    const cells = bodyRows().map((row) => within(row).getAllByRole("cell")[0]!);
    expect(getComputedStyle(cells[0]!).paddingTop).toBe(`${token.paddingXS}px`);
    expect(getComputedStyle(screen.getAllByRole("columnheader")[0]!).paddingTop).toBe(`${token.paddingXS}px`);
    expect(getComputedStyle(cells[0]!).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(getComputedStyle(cells[1]!).backgroundColor).toBe(cssColor(token.colorFillAlter));
  });

  it("pads the cells like Ant's default table at the default size, with no stripes unless asked", () => {
    renderAntdTable({ size: "default" });
    const cells = bodyRows().map((row) => within(row).getAllByRole("cell")[0]!);
    expect(getComputedStyle(cells[0]!).paddingTop).toBe(`${token.padding}px`);
    expect(getComputedStyle(cells[1]!).backgroundColor).toBe("rgba(0, 0, 0, 0)");
  });

  it("puts the ConfigProvider's CSP nonce on its sheet", () => {
    renderAntdTable({}, ({ children }: { children: ReactNode }) => (
      <ConfigProvider csp={{ nonce: "abc123" }}>{children}</ConfigProvider>
    ));
    const sheet = screen.getByRole("table").closest("[data-size]")!.querySelector("style")!;
    expect(sheet.nonce).toBe("abc123");
  });

  it("sorts from an Ant Button in the header", async () => {
    const user = renderAntdTable({ data: employees(3).reverse() });
    const sort = screen.getByRole("button", { name: /Name/ });
    expect(sort).toHaveClass("ant-btn");
    await user.click(sort);
    expect(names()).toEqual(["Employee 01", "Employee 02", "Employee 03"]);
    expect(getComputedStyle(sort.querySelector(".anticon-caret-up")!).color).toBe(cssColor(token.colorPrimary));
    expect(getComputedStyle(sort.querySelector(".anticon-caret-down")!).color).toBe(cssColor(token.colorTextQuaternary));
  });

  it("selects with Ant checkboxes and tints the selected row", async () => {
    const onSelectionChange = vi.fn();
    const user = renderAntdTable({ enableRowSelection: true, onSelectionChange });

    const first = screen.getAllByRole("checkbox", { name: "Select row" })[0]!;
    expect(first.closest(".ant-checkbox-wrapper")).not.toBeNull();
    await user.click(first);
    expect(onSelectionChange).toHaveBeenLastCalledWith([employees(1)[0]]);
    expect(bodyRows()[0]).toHaveAttribute("data-state", "selected");
    expect(getComputedStyle(within(bodyRows()[0]!).getAllByRole("cell")[0]!).backgroundColor).toBe(
      cssColor(token.controlItemBgActive),
    );

    const selectAll = screen.getByRole("checkbox", { name: "Select all rows on this page" });
    expect(selectAll.closest(".ant-checkbox-indeterminate")).not.toBeNull();
    await user.click(selectAll);
    expect(onSelectionChange.mock.lastCall?.[0]).toHaveLength(10);
  });

  it("paginates with Ant Buttons", async () => {
    const user = renderAntdTable();
    const next = screen.getByRole("button", { name: "Next page" });
    expect(next).toHaveClass("ant-btn");
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();

    await user.click(next);
    await user.click(next);
    expect(names()).toEqual(["Employee 21", "Employee 22", "Employee 23"]);
    expect(screen.getByText("Page 3 of 3")).toBeInTheDocument();
    expect(next).toBeDisabled();
  });

  it("changes the page size with a Segmented control", async () => {
    const user = renderAntdTable();
    const sizes = screen.getByRole("radiogroup", { name: "Rows per page" });
    expect(sizes).toHaveClass("ant-segmented");
    expect(within(sizes).getByRole("radio", { name: "10" })).toBeChecked();
    // Ant hides the radio under its label, which is what a pointer lands on.
    await user.click(within(sizes).getByText("25"));
    expect(within(sizes).getByRole("radio", { name: "25" })).toBeChecked();
    expect(bodyRows()).toHaveLength(23);
  });

  it("shows Ant skeletons while loading", () => {
    renderAntdTable({ loading: true });
    const rows = document.querySelectorAll("tbody tr");
    expect(rows.length).toBeGreaterThan(0);
    expect(document.querySelectorAll("tbody .ant-skeleton")).toHaveLength(rows.length * 2);
    expect(screen.getByRole("table").closest("[aria-busy]")).toHaveAttribute("aria-busy", "true");
  });

  it("shows Ant's Empty across every column", () => {
    renderAntdTable({ data: [], enableRowSelection: true, labels: { empty: "لا يوجد بيانات" } });
    const cell = within(bodyRows()[0]!).getByRole("cell");
    expect(cell).toHaveAttribute("colspan", "3");
    expect(cell.querySelector(".ant-empty")).not.toBeNull();
    expect(within(cell).getByText("لا يوجد بيانات")).toBeInTheDocument();
  });

  it("retries from the error state", async () => {
    const onRetry = vi.fn();
    const user = renderAntdTable({ error: new Error("500"), onRetry });
    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
    const retry = screen.getByRole("button", { name: "Retry" });
    expect(retry).toHaveClass("ant-btn");
    await user.click(retry);
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("works in RTL with the ar_EG locale, with the page arrows turned round", () => {
    renderAntdTable({ labels: { selectRow: "تحديد الصف" }, enableRowSelection: true }, RtlWrapper);
    expect(screen.getAllByRole("checkbox", { name: "تحديد الصف" })).toHaveLength(10);
    const previous = screen.getByRole("button", { name: "Previous page" });
    expect(previous).toHaveClass("ant-btn-rtl");
    expect(within(previous).getByRole("img", { name: "right" })).toBeInTheDocument();
  });

  it("expands a tree row from an Ant Button", async () => {
    const user = userEvent.setup();
    const lead = { ...employees(1)[0]!, reports: employees(3).slice(1) };
    render(<DataTable<Employee> data={[lead]} columns={employeeColumns} components={antdDataTable} getSubRows={(row) => row.reports} />, {
      wrapper: Wrapper,
    });
    const toggle = screen.getByRole("button", { name: "Expand row" });
    expect(toggle).toHaveClass("ant-btn");
    await user.click(toggle);
    expect(names()).toEqual(["Employee 01", "Employee 02", "Employee 03"]);
    expect(screen.getByRole("button", { name: "Collapse row" })).toHaveAttribute("aria-expanded", "true");
  });

  it("reorders rows by keyboard with a HolderOutlined drag handle", async () => {
    const onMove = vi.fn();
    const user = userEvent.setup();
    render(<ReorderableEmployees components={antdDataTable} initial={employees(3)} onMove={onMove} />, { wrapper: Wrapper });
    expect(dragHandles()[0]).toHaveClass("ant-btn");
    expect(within(dragHandles()[0]!).getByRole("img", { name: "holder" })).toBeInTheDocument();
    await keyboardReorder(user, onMove);
    expect(onMove.mock.calls[0]![0].data.map((row: Employee) => row.id)).toEqual(["e2", "e1", "e3"]);
  });

  it("lifts a row on pointer down and disables a lone row’s handle", () => {
    render(<ReorderableEmployees components={antdDataTable} initial={employees(3)} />, { wrapper: Wrapper });
    fireEvent.pointerDown(dragHandles()[1]!, { button: 0, pointerId: 1, clientY: 0 });
    expect(bodyRows()[1]).toHaveAttribute("data-dragging", "");
    fireEvent.pointerCancel(window, { pointerId: 1 });
    expect(bodyRows()[1]).not.toHaveAttribute("data-dragging");

    const lone = { ...employees(1)[0]!, reports: employees(3).slice(1, 2) };
    render(<ReorderableEmployees components={antdDataTable} initial={[lone, ...employees(3).slice(2)]} />, { wrapper: Wrapper });
    expect(within(screen.getAllByRole("table")[1]!).getAllByRole("button", { name: "Reorder row" })[1]).toBeDisabled();
  });

  it("moves a sub-row among its siblings by keyboard in a tree table", async () => {
    const onMove = vi.fn();
    const user = userEvent.setup();
    const [lead, first, second, other] = employees(4);
    const tree = [{ ...lead!, reports: [first!, second!] }, other!];
    render(<ReorderableEmployees components={antdDataTable} initial={tree} onMove={onMove} />, { wrapper: Wrapper });
    // Rows: Employee 01, its reports 02 and 03, then Employee 04.

    act(() => dragHandles()[0]!.focus());
    await user.keyboard(" ");
    expect(bodyRows()[0]).toHaveAttribute("data-dragging", "");
    expect(bodyRows()[1]).toHaveAttribute("data-dragging-child", "");
    expect(bodyRows()[2]).toHaveAttribute("data-dragging-child", "");
    // The lifted block is opaque, so the rows it passes never show through.
    const surface = cssColor(token.colorBgContainer);
    for (const row of bodyRows().slice(0, 3)) expect(getComputedStyle(row.querySelector("td")!).backgroundColor).toBe(surface);
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
