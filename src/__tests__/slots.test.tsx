import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { HTMLAttributes } from "react";
import { describe, expect, it, vi } from "vitest";
import { DataTable } from "../DataTable";
import { useDataTableContext, useDataTableRow } from "../slots/context";
import { fallbackComponents } from "../slots/fallbacks";
import type { CheckboxSlotProps, PaginationSlotProps } from "../slots/types";
import { bodyRows, columns, renderTable, users, type User } from "./builders";

/**
 * Library row
 *
 * Stands in for a UI library's row (like shadcn's TableRow): spreads
 * everything onto the DOM, so it must only get DOM props.
 */
const LibraryRow = (props: HTMLAttributes<HTMLTableRowElement>) => (
  <tr data-library="row" {...props} />
);

/**
 * Library checkbox
 *
 * Stands in for a UI library's checkbox with its own API.
 */
const LibraryCheckbox = ({ checked, onCheckedChange, ...props }: CheckboxSlotProps) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={props["aria-label"]}
    onClick={() => onCheckedChange(!checked)}
  />
);

/**
 * Library pagination
 *
 * Stands in for a UI library's pagination.
 */
const LibraryPagination = ({ pageIndex, pageCount, nextPage }: PaginationSlotProps) => (
  <div data-testid="library-pagination">
    {pageIndex + 1}/{pageCount}
    <button type="button" onClick={nextPage}>
      more
    </button>
  </div>
);

describe("slots", () => {
  it("renders the plain-HTML fallbacks by default", () => {
    const { container } = renderTable();
    expect(container.querySelector("table.rdt__table")).toBeInTheDocument();
    expect(container.querySelector("select.rdt__select")).toBeInTheDocument();
  });

  it("replaces only the slots that are passed", async () => {
    const events = userEvent.setup();
    render(
      <DataTable<User>
        data={users(15)}
        columns={columns}
        enableRowSelection
        components={{ Row: LibraryRow, Checkbox: LibraryCheckbox, Pagination: LibraryPagination }}
      />,
    );

    expect(bodyRows()[0]).toHaveAttribute("data-library", "row");
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getAllByRole("switch")).toHaveLength(11);
    expect(screen.getByTestId("library-pagination")).toHaveTextContent("1/2");

    await events.click(screen.getByRole("button", { name: "more" }));
    expect(screen.getByTestId("library-pagination")).toHaveTextContent("2/2");

    /** Unreplaced slots still use the fallbacks. */
    expect(document.querySelector("table.rdt__table")).toBeInTheDocument();
  });

  it("passes selection state to element slots as data attributes", async () => {
    const events = userEvent.setup();
    render(
      <DataTable<User>
        data={users(2)}
        columns={columns}
        enableRowSelection
        components={{ Row: LibraryRow, Checkbox: LibraryCheckbox }}
      />,
    );
    await events.click(within(bodyRows()[0]!).getByRole("switch"));
    expect(bodyRows()[0]).toHaveAttribute("data-state", "selected");
  });

  it("gives custom rows the row through useDataTableRow", () => {
    function RowWithId(props: HTMLAttributes<HTMLTableRowElement>) {
      const row = useDataTableRow<User>();
      return <tr data-row-id={row?.original.id} {...props} />;
    }
    render(<DataTable<User> data={users(2)} columns={columns} components={{ Row: RowWithId }} />);
    expect(bodyRows().map((row) => row.getAttribute("data-row-id"))).toEqual(["u1", "u2"]);
  });

  it("never passes undefined props that would override a slot's own defaults", () => {
    const Cell = (props: HTMLAttributes<HTMLTableCellElement>) => <td className="library-cell" {...props} />;
    render(<DataTable<User> data={users(1)} columns={[{ accessorKey: "name", header: "Name" }]} components={{ Cell }} />);
    expect(within(bodyRows()[0]!).getByRole("cell")).toHaveClass("library-cell");
  });

  it("lets a slot wrap its fallback", () => {
    const Wrapped = (props: HTMLAttributes<HTMLTableRowElement>) => (
      <fallbackComponents.Row {...props} className="mine" />
    );
    render(<DataTable<User> data={users(1)} columns={columns} components={{ Row: Wrapped }} />);
    expect(bodyRows()[0]).toHaveClass("rdt__row", "mine");
  });

  it("merges slotProps and column meta into cells", () => {
    renderTable({
      slotProps: {
        row: (row) => ({ className: row.index === 0 ? "first" : undefined }),
        cell: (cell) => ({ "data-column": cell.column.id }) as HTMLAttributes<HTMLTableCellElement>,
      },
    });
    const [first, second] = bodyRows();
    expect(first).toHaveClass("rdt__row", "first");
    expect(second).not.toHaveClass("first");

    const ageCell = within(first!).getAllByRole("cell")[1]!;
    expect(ageCell).toHaveClass("age-cell");
    expect(ageCell).toHaveAttribute("data-column", "age");
    expect(ageCell).toHaveAttribute("data-align", "end");
    expect(ageCell).toHaveStyle({ textAlign: "end" });
  });

  it("forwards HTML attributes to the root", () => {
    const { container } = renderTable({ className: "outer", id: "users", striped: true });
    const root = container.firstElementChild!;
    expect(root).toHaveClass("rdt", "outer");
    expect(root).toHaveAttribute("id", "users");
    expect(root).toHaveAttribute("data-striped", "true");
    expect(root).toHaveAttribute("data-size", "sm");
  });

  it("renders the footer between the table and the pagination", () => {
    renderTable({ footer: <div data-testid="totals">Total</div> });
    const totals = screen.getByTestId("totals");
    expect(totals.previousElementSibling).toHaveClass("rdt__scroll");
    expect(totals.nextElementSibling?.tagName).toBe("NAV");
  });
});

describe("compound parts", () => {
  it("supports a custom layout around the parts", async () => {
    const events = userEvent.setup();
    function Toolbar() {
      const { table, selection } = useDataTableContext<User>();
      return (
        <p>
          {selection.length} selected of {table.getRowCount()}
        </p>
      );
    }
    render(
      <DataTable.Provider data={users(4)} columns={columns} enableRowSelection>
        <DataTable.Pagination />
        <Toolbar />
        <DataTable.Root>
          <DataTable.Table />
        </DataTable.Root>
      </DataTable.Provider>,
    );

    expect(screen.getByText("0 selected of 4")).toBeInTheDocument();
    await events.click(within(bodyRows()[0]!).getByRole("checkbox"));
    expect(screen.getByText("1 selected of 4")).toBeInTheDocument();
    expect(screen.getByRole("navigation").compareDocumentPosition(screen.getByRole("table"))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("throws a helpful error outside a provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<DataTable.Table />)).toThrow(/inside <DataTable>/);
    spy.mockRestore();
  });
});

