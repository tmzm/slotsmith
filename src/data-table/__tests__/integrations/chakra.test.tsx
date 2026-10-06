import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { DataTable, type DataTableProps } from "../../index";
import type { SlotsmithComponents } from "../../../provider";
import { chakraAutocomplete } from "../../../autocomplete/__tests__/integrations/chakra/components";
import { chakraDatePicker } from "../../../date-picker/__tests__/integrations/chakra/components";
import { chakraFileUploader } from "../../../file-uploader/__tests__/integrations/chakra/components";
import { chakraDataTable, ChakraSpinnerSkeleton } from "./chakra/components";
import {
  bodyRows,
  dragHandles,
  employeeColumns,
  employees,
  failOnReactWarnings,
  keyboardReorder,
  names,
  ReorderableEmployees,
  pageSizeThroughAutocompleteAdapter,
  renderUnderProvider,
  stubBrowserApis,
  type Employee,
} from "./shared";

/**
 * Chakra wrapper
 *
 * `ChakraProvider` with the default system, as a dense admin table's provider does
 * (its custom system only adds tokens and recipes).
 */
const Wrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
);

/**
 * Render Chakra table
 *
 * `<DataTable>` with Chakra UI v3 slots inside `ChakraProvider`.
 */
function renderChakraTable(props: Partial<DataTableProps<Employee>> = {}) {
  const user = userEvent.setup();
  render(
    <DataTable<Employee>
      data={employees(23)}
      columns={employeeColumns}
      components={chakraDataTable}
      {...props}
    />,
    { wrapper: Wrapper },
  );
  return user;
}

/**
 * Everywhere
 *
 * All four adapters on one provider, the way the guides apply a design system
 * once. Module scope, so the object keeps its identity.
 */
const everywhere: SlotsmithComponents = {
  dataTable: chakraDataTable,
  autocomplete: chakraAutocomplete,
  datePicker: chakraDatePicker,
  fileUploader: chakraFileUploader,
};

beforeAll(stubBrowserApis);

describe("Chakra UI v3 (dense admin table)", () => {
  failOnReactWarnings();

  it("renders with Chakra's table parts", () => {
    renderChakraTable();
    expect(screen.getByRole("table")).toHaveClass("chakra-table__root");
    expect(bodyRows()[0]).toHaveClass("chakra-table__row");
    expect(within(bodyRows()[0]!).getAllByRole("cell")[0]).toHaveClass("chakra-table__cell");
    expect(screen.getAllByRole("columnheader")[0]).toHaveClass("chakra-table__columnHeader");
  });

  it("sorts from the header", async () => {
    const user = renderChakraTable({ data: employees(3).reverse() });
    await user.click(screen.getByRole("button", { name: "Name" }));
    expect(names()).toEqual(["Employee 01", "Employee 02", "Employee 03"]);
  });

  it("selects with Chakra checkboxes", async () => {
    const onSelectionChange = vi.fn();
    const user = renderChakraTable({ enableRowSelection: true, onSelectionChange });

    await user.click(screen.getAllByRole("checkbox", { name: "Select row" })[1]!);
    expect(onSelectionChange).toHaveBeenLastCalledWith([employees(2)[1]]);
    expect(bodyRows()[1]).toHaveAttribute("data-state", "selected");

    await user.click(screen.getByRole("checkbox", { name: "Select all rows on this page" }));
    expect(onSelectionChange.mock.lastCall?.[0]).toHaveLength(10);
  });

  it("paginates with Chakra's Pagination", async () => {
    const user = renderChakraTable();
    expect(names()[0]).toBe("Employee 01");

    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(names()[0]).toBe("Employee 11");

    await user.click(screen.getByRole("button", { name: /page 3/i }));
    expect(names()).toEqual(["Employee 21", "Employee 22", "Employee 23"]);
  });

  it("changes the page size with NativeSelect", async () => {
    const user = renderChakraTable();
    await user.selectOptions(screen.getByLabelText("Rows per page"), "25");
    expect(bodyRows()).toHaveLength(23);
  });

  it("can show one spinner while loading, like a dense admin table", () => {
    renderChakraTable({
      loading: true,
      components: { ...chakraDataTable, Skeleton: ChakraSpinnerSkeleton },
    });
    expect(document.querySelectorAll(".chakra-spinner")).toHaveLength(1);
  });

  it("shows Chakra's EmptyState", () => {
    renderChakraTable({ data: [] });
    expect(document.querySelector(".chakra-empty-state__root")).not.toBeNull();
    expect(screen.getByText("No data found")).toBeInTheDocument();
  });

  it("takes the empty message and the page-size name from the labels", () => {
    renderChakraTable({ data: [], labels: { empty: "Nothing here yet", rowsPerPage: "صفوف في الصفحة" } });
    expect(document.querySelector(".chakra-empty-state__root")).toHaveTextContent(/^Nothing here yet$/);
    expect(screen.getByRole("combobox", { name: "صفوف في الصفحة" })).toBeInTheDocument();
  });

  it("retries from the error state", async () => {
    const onRetry = vi.fn();
    const user = renderChakraTable({ error: new Error("500"), onRetry });
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("reorders rows by keyboard with an IconButton drag handle", async () => {
    const onMove = vi.fn();
    const user = userEvent.setup();
    render(<ReorderableEmployees components={chakraDataTable} initial={employees(3)} onMove={onMove} />, {
      wrapper: Wrapper,
    });
    expect(dragHandles()[0]).toHaveClass("chakra-button");
    await keyboardReorder(user, onMove);
  });

  /**
   * The table adapter's `Pagination` draws its own rows-per-page control, a
   * `NativeSelect`, so with every adapter at the provider that select, not
   * the autocomplete adapter, is the page-size control. A native select's
   * arrow keys are the browser's own, which jsdom does not run, so the option
   * is chosen the way `user-event` chooses one.
   */
  it("takes all four adapters from the provider and changes the page size from the focused select", async () => {
    const user = renderUnderProvider(everywhere, Wrapper);
    expect(screen.getByRole("table")).toHaveClass("chakra-table__root");
    const select = screen.getByRole("combobox", { name: "Rows per page" });
    expect(select.tagName).toBe("SELECT");
    expect(bodyRows()).toHaveLength(10);

    select.focus();
    await user.selectOptions(select, "25");
    expect(bodyRows()).toHaveLength(23);
    expect(screen.getByRole("combobox", { name: "Rows per page" })).toHaveValue("25");
  });

  it("skins the table's built-in page-size select when only the autocomplete adapter is at the provider", async () => {
    await pageSizeThroughAutocompleteAdapter(chakraAutocomplete, Wrapper, ({ trigger, listbox, options }) => {
      expect(trigger).toHaveTextContent("10");
      expect(listbox).toHaveClass("chakra-list__root");
      expect(options[0]).toHaveClass("chakra-list__item");
    });
  });
});
