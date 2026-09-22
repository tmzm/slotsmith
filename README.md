# slotsmith

**A headless React component library.** Every part of every component is a slot you can replace, and anything you don't replace renders as plain, accessible HTML that is already finished — so a component fits whatever design system a project already has.

The **data table** ships first, built on [TanStack Table v9](https://tanstack.com/table/latest). More components follow, built the same way.

[![npm](https://img.shields.io/npm/v/slotsmith?color=e0a11b&label=npm)](https://www.npmjs.com/package/slotsmith)
[![bundle](https://img.shields.io/bundlephobia/minzip/slotsmith?color=e0a11b)](https://bundlephobia.com/package/slotsmith)
[![stars](https://img.shields.io/github/stars/tmzm/slotsmith?color=e0a11b)](https://github.com/tmzm/slotsmith)

**[Docs and live examples → slotsmith-docs.netlify.app](https://slotsmith-docs.netlify.app)**

If it saves you a day of work, a ⭐ on [the repo](https://github.com/tmzm/slotsmith) helps others find it.

## Components

| Component | Status | What you get |
| --- | --- | --- |
| **Data table** | shipping | Client- or server-side sorting and pagination, row selection that survives paging, tree rows, loading / error / empty states, virtualization, i18n and RTL. |
| More components | next | Same idea: headless logic, replaceable parts, fallbacks good enough to ship. |

- **Works with any UI library.** shadcn, MUI, Chakra or your own: element slots take plain DOM props, widget slots take semantic props.
- **Built-in fallbacks.** No runtime dependencies besides TanStack Table.
- **Everything is replaceable:** rows, cells, checkbox, pagination, sort icons, and the empty / error / loading states.

## Installation

```bash
pnpm add slotsmith @tanstack/react-table
# optional, for the virtualized table
pnpm add @tanstack/react-virtual
```

Peer dependencies: `react >= 18`, `react-dom`, `@tanstack/react-table ^9`, and optionally `@tanstack/react-virtual ^3`.

## Quick start

```tsx
import { DataTable, type DataTableColumnDef } from "slotsmith";
import "slotsmith/styles.css"; // optional: styles for the fallbacks

interface User {
  id: string;
  name: string;
  email: string;
}

const columns: DataTableColumnDef<User>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "email", header: "Email" },
];

export function Users({ users }: { users: User[] }) {
  return <DataTable<User> data={users} columns={columns} />;
}
```

With no other props, the table sorts and paginates on the client. Each piece of state is **uncontrolled** by default; pass the value and its `on…Change` handler to control it.

## Using your own UI library

There are two kinds of slots:

| Kind | Slots | Props they receive |
| --- | --- | --- |
| **Element** | `Root`, `Table`, `Head`, `Body`, `HeaderRow`, `HeaderCell`, `Row`, `Cell` | Plain DOM props only, so library primitives drop straight in. State comes through `data-*` attributes (`data-state="selected"`, `data-sorted`, `data-align`, …). |
| **Widget** | `Checkbox`, `SortTrigger`, `SortIcon`, `ExpandToggle`, `Skeleton`, `Empty`, `Error`, `Pagination`, `PaginationButton`, `PageSizeSelect` | Semantic props (`checked`, `onCheckedChange`, `pageIndex`, `setPageSize`, …). Write a small adapter for your library. |

### shadcn/ui

```tsx
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CheckboxSlotProps, DataTableComponents } from "slotsmith";

const ShadcnCheckbox = ({ checked, indeterminate, onCheckedChange, ...props }: CheckboxSlotProps) => (
  <Checkbox
    checked={indeterminate ? "indeterminate" : checked}
    onCheckedChange={(value) => onCheckedChange(value === true)}
    onClick={(event) => event.stopPropagation()}
    {...props}
  />
);

// Define the slot map once, outside render.
export const shadcnComponents: Partial<DataTableComponents> = {
  Table,
  Head: TableHeader,
  Body: TableBody,
  HeaderRow: TableRow,
  Row: TableRow, // styles data-[state=selected] out of the box
  HeaderCell: TableHead,
  Cell: TableCell,
  Checkbox: ShadcnCheckbox,
};

<DataTable data={data} columns={columns} components={shadcnComponents} />;
```

### Tested with

Integration suites render the table with real UI libraries and fail on any React warning. The adapters are ready to copy:

| Library | Adapter |
| --- | --- |
| shadcn/ui (radix-ui, Tailwind) | [`src/__tests__/integrations/shadcn/components.tsx`](src/__tests__/integrations/shadcn/components.tsx) |
| Chakra UI v3 | [`src/__tests__/integrations/chakra/components.tsx`](src/__tests__/integrations/chakra/components.tsx) |
| MUI v7 | [`src/__tests__/integrations/mui/components.tsx`](src/__tests__/integrations/mui/components.tsx) |

### Reading the row in a custom `Row`

Element slots only receive DOM props. Use `useDataTableRow()` to get the row, for example for drag-and-drop:

```tsx
import { useDataTableRow, type RowSlotProps } from "slotsmith";

function SortableRow(props: RowSlotProps) {
  const row = useDataTableRow<Item>();
  const { setNodeRef, transform, transition } = useSortable({ id: row!.id });
  return <tr ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} {...props} />;
}
```

### Extending a fallback

Every fallback is exported, so you can wrap one instead of rewriting it:

```tsx
import { fallbackComponents, type RowSlotProps } from "slotsmith";

const TallRow = (props: RowSlotProps) => <fallbackComponents.Row {...props} className="h-14" />;
```

## Server-side data

```tsx
const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
const [sorting, setSorting] = useState<DataTableSortingState>([]);
const { data, isFetching, error, refetch } = useQuery({
  queryKey: ["users", pagination, sorting],
  queryFn: () => api.users({ pagination, sorting }),
});

<DataTable<User>
  data={data?.rows ?? []}
  columns={columns}
  manualPagination
  manualSorting
  rowCount={data?.total}
  pagination={pagination}
  onPaginationChange={setPagination}
  sorting={sorting}
  onSortingChange={setSorting}
  loading={isFetching}
  error={error}
  onRetry={refetch}
/>;
```

If a page comes back empty (for example after its last row is deleted), the table moves back a page on its own.

## Row selection

```tsx
const [selected, setSelected] = useState<User[]>([]);

<DataTable<User>
  data={users}
  columns={columns}
  enableRowSelection={(row) => row.original.active} // or `true`
  selection={selected}
  onSelectionChange={setSelected}
/>;
```

- Selection is exposed as **row objects**. Rows are matched by `getRowId`, which defaults to `row.id`.
- The header checkbox selects **the current page** and shows an indeterminate state for partial selections.
- With `manualPagination`, rows selected on other pages stay selected. Pass `resetSelectionOnPageChange` to clear the selection instead.

## Tree rows

```tsx
<DataTable<Employee>
  data={org}
  columns={columns}
  getSubRows={(row) => row.reports}
  defaultExpanded={true} // or control it: expanded / onExpandedChange
  enableRowSelection // selecting a parent selects its children
  onRowClick={(row) => row.toggleExpanded()}
/>
```

## Virtualization

```tsx
import { VirtualDataTable } from "slotsmith/virtual";

<VirtualDataTable data={tenThousandRows} columns={columns} virtual={{ estimateSize: 40, maxHeight: 600 }} />;
```

Only the rows in view are rendered, and the header stays sticky. Pagination is off by default.

## i18n and RTL

Override any text with `labels`:

```tsx
<DataTable
  labels={{
    empty: "لا توجد بيانات",
    rowsPerPage: "عدد الصفوف",
    pageInfo: (page, count) => `صفحة ${page} من ${count}`,
    previousPage: "الصفحة السابقة",
    nextPage: "الصفحة التالية",
  }}
/>
```

Inside `dir="rtl"`, the fallbacks flip automatically: chevrons, tree indentation and alignment.

## Custom layouts

`DataTable` also exposes compound parts. Use `useDataTableContext()` to build toolbars or bulk-action bars without passing props down:

```tsx
function BulkBar() {
  const { selection, table } = useDataTableContext<User>();
  if (!selection.length) return null;
  return <button onClick={() => table.resetRowSelection()}>Clear {selection.length}</button>;
}

<DataTable.Provider data={users} columns={columns} enableRowSelection>
  <BulkBar />
  <DataTable.Root>
    <DataTable.Pagination />
    <DataTable.Table maxHeight={480} />
  </DataTable.Root>
</DataTable.Provider>;
```

Parts: `Provider`, `Root`, `Table`, `Head`, `Body`, `Row`, `StatusRows`, `Pagination`.

## Fully headless

`useDataTable` gives you the state and the TanStack instance with no UI at all:

```tsx
const { table, status, selection } = useDataTable({ data, columns, enableRowSelection: true });
```

## Styling the fallbacks

`styles.css` is optional, and every value in it is a `--rdt-*` custom property:

```css
:root {
  --rdt-border: #e4e4e7;
  --rdt-accent: #7c3aed;
  --rdt-radius: 12px;
}
```

Dark mode applies under `.dark` or `[data-theme="dark"]`. Without the stylesheet, you can style the fallbacks from their `data-*` attributes, for example with Tailwind: `[&_tr[data-state=selected]]:bg-muted`.

## API

### Options

| Prop | Type | Default |
| --- | --- | --- |
| `data` | `T[]` | — |
| `columns` | `DataTableColumnDef<T>[]` | — |
| `getRowId` | `(row, index, parent?) => string` | `row.id`, else the index path |
| `sorting` / `onSortingChange` / `defaultSorting` | `SortingState` | `[]` |
| `manualSorting` | `boolean` | `false` |
| `enableMultiSort` | `boolean` | `false` |
| `pagination` / `onPaginationChange` / `defaultPagination` | `PaginationState` | `{ pageIndex: 0, pageSize: 10 }` |
| `manualPagination` | `boolean` | `false` |
| `rowCount` | `number` | — |
| `pageSizeOptions` | `number[]` | `[10, 25, 50, 100]` |
| `enablePagination` | `boolean` | `true` |
| `enableRowSelection` | `boolean \| (row) => boolean` | — (no checkbox column) |
| `selection` / `onSelectionChange` / `defaultSelection` | `T[]` | `[]` |
| `resetSelectionOnPageChange` | `boolean` | `false` |
| `getSubRows` | `(row, index) => T[] \| undefined` | — |
| `getRowCanExpand` | `(row) => boolean` | — |
| `expanded` / `onExpandedChange` / `defaultExpanded` | `ExpandedState` | `{}` |
| `paginateExpandedRows` | `boolean` | `false` |
| `loading` | `boolean` | `false` |
| `error` / `onRetry` | `unknown` / `() => void` | — |
| `tableOptions` | `Partial<TableOptions>` | escape hatch passed to `useTable` |

### Rendering

| Prop | Type | Description |
| --- | --- | --- |
| `components` | `Partial<DataTableComponents>` | Replace any slot. |
| `labels` | `Partial<DataTableLabels>` | Override any text. |
| `slotProps` | `DataTableSlotProps<T>` | Extra props for element slots: `row`, `cell` and `headerCell` take functions. |
| `onRowClick` | `(row, event) => void` | Not triggered by the checkbox or the expand toggle. |
| `size` | `"sm" \| "default"` | Density (default `"sm"`). |
| `striped` | `boolean` | Alternate row backgrounds. |
| `footer` | `ReactNode` | Rendered between the table and the pagination. |
| `hidePagination` | `boolean` | Hide the pagination UI while still paginating. |
| `...div props` | | Forwarded to `Root`. |

### Column meta

```ts
{ align?: "start" | "center" | "end"; headerClassName?: string; cellClassName?: string }
```

## Coming from `@tmzm/react-data-table`

This package was published as `@tmzm/react-data-table@1.0.0` before it was renamed. `slotsmith` is its successor, rewritten as a headless component. The old package stays on npm at 1.0.0 and is no longer updated.

- The import changes: `slotsmith` instead of `@tmzm/react-data-table`.
- The package targets **TanStack Table v9**. Type columns with `DataTableColumnDef<T>` or `createDataTableColumnHelper<T>()`.
- `pagination` / `onPaginationChange` are now optional. Without them, pagination state is managed internally.
- `selectable` + `enableRowSelection` are merged into a single `enableRowSelection` prop.
- `paginationOptions.{manualPagination, manualSorting, resetSelection}` became the top-level props `manualPagination`, `manualSorting` and `resetSelectionOnPageChange`.
- `paginationOptions.selectLabel` and `placeholderText` moved to `labels.rowsPerPage` and `labels.empty`, and `placeholder` became the `Empty` slot.
- Columns are sortable unless they set `enableSorting: false`, which is TanStack's default.
- Radix UI and lucide are no longer dependencies. The fallbacks are native HTML.

## Development

```bash
pnpm test        # vitest + testing-library
pnpm typecheck
pnpm build       # tsup (ESM + CJS) + tsc declarations
```

## License

ISC
