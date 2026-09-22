import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { DataTable, type DataTableProps } from "../../index";
import { chakraComponents, ChakraSpinnerSkeleton } from "./chakra/components";
import {
  bodyRows,
  employeeColumns,
  employees,
  failOnReactWarnings,
  names,
  stubBrowserApis,
  type Employee,
} from "./shared";

/**
 * Chakra wrapper
 *
 * `ChakraProvider` with the default system, as anes-track-new's provider does
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
      components={chakraComponents}
      {...props}
    />,
    { wrapper: Wrapper },
  );
  return user;
}

beforeAll(stubBrowserApis);

describe("Chakra UI v3 (anes-track-new)", () => {
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

  it("can show one spinner while loading, like anes-track-new", () => {
    renderChakraTable({
      loading: true,
      components: { ...chakraComponents, Skeleton: ChakraSpinnerSkeleton },
    });
    expect(document.querySelectorAll(".chakra-spinner")).toHaveLength(1);
  });

  it("shows Chakra's EmptyState", () => {
    renderChakraTable({ data: [] });
    expect(document.querySelector(".chakra-empty-state__root")).not.toBeNull();
    expect(screen.getByText("No data found")).toBeInTheDocument();
  });

  it("retries from the error state", async () => {
    const onRetry = vi.fn();
    const user = renderChakraTable({ error: new Error("500"), onRetry });
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
