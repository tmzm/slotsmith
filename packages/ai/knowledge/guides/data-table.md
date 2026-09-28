# Data table guide

A headless data table on TanStack Table v9: sorting, pagination, row selection that survives server pages, tree rows, loading / error / empty states, and every part replaceable.

```bash
npm i slotsmith @tanstack/react-table
```

## Basic table

```tsx
import { DataTable, type DataTableColumnDef } from "slotsmith/data-table";
import "slotsmith/data-table.css";

type User = { id: string; name: string; email: string };

const columns: DataTableColumnDef<User>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "email", header: "Email" },
];

export function Users({ users }: { users: User[] }) {
  return <DataTable data={users} columns={columns} enableRowSelection />;
}
```

Sorting, pagination and selection work immediately. Each piece of state (`sorting`, `pagination`, `selection`, `expanded`) is uncontrolled until its value prop is passed; pass the value and its `on…Change` callback together to control it.

Define `columns` outside the component, or memoise them: a new array every render resets TanStack's column state.

## Server-side data

Pass the current page plus the total, and the table stops paginating and sorting on its own:

```tsx
<DataTable
  data={page.rows}
  columns={columns}
  manualPagination
  manualSorting
  rowCount={page.total}
  pagination={pagination}
  onPaginationChange={setPagination}
  sorting={sorting}
  onSortingChange={setSorting}
  loading={isFetching}
  error={error}
  onRetry={refetch}
/>
```

Selection is exposed as row objects (`selection` / `onSelectionChange`) and is kept across server pages; rows are matched with `getRowId`, which defaults to `row.id`.

## Tree rows

`getSubRows` turns the table into a tree: the first column indents by depth and grows an expand toggle, and selection cascades to children. Use `getRowCanExpand` to lazy-load children.

## Columns

Column definitions are TanStack's, with a `meta` for alignment and classes:

```tsx
{ accessorKey: "salary", header: "Salary", meta: { align: "end", cellClassName: "tabular" } }
```

`createDataTableColumnHelper<User>()` gives the typed column helper.

## Replacing parts

The table, sections, rows and cells are element parts, so a library's table primitives drop straight in. Checkbox, sort icon, pagination, empty and error states are widget parts. The `PageSizeSelect` fallback is the slotsmith autocomplete as a plain single select (no search, no clear), labelled by `labels.rowsPerPage` and following the table's `locale`; replace the slot to use your library's select. With shadcn/ui:

```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

<DataTable
  data={users}
  columns={columns}
  components={{
    Table, Head: TableHeader, Body: TableBody,
    Row: TableRow, HeaderCell: TableHead, Cell: TableCell,
  }}
/>;
```

Selected rows carry `data-state="selected"`, so shadcn's table styles them without changes.

## Long lists

`VirtualDataTable` from `slotsmith/virtual` windows the rows (needs `@tanstack/react-virtual`); every slot keeps working.
