# Data table guide

A headless data table on TanStack Table v9: sorting, pagination, row selection that survives server pages, tree rows, drag-to-reorder rows, loading / error / empty states, and every part replaceable.

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

With `enableRowReorder` a tree row moves among its siblings only, taking its expanded sub-rows with it; see [Reordering rows](#reordering-rows).

## Reordering rows

`enableRowReorder` lets the user drag rows into a new order, by pointer, touch or keyboard. The order is controlled: the table never reorders itself. It reports the move and the new `data`, and the app stores it.

```tsx
const [rows, setRows] = useState(initialRows);

<DataTable
  data={rows}
  columns={columns}
  getRowId={(row) => row.id}
  enableRowReorder
  onRowOrderChange={(change) => setRows(change.data)}
/>;
```

`onRowOrderChange` receives a `RowOrderChange<T>`: the moved `row` and `rowId`, the `target` and `targetId` it was dropped next to, the `position` (`"before"` or `"after"`) on the target, `data` with the row moved, and `parentId`, `parent` and `siblings` (see tree tables below). It fires only when the order really changed. `moveItem(items, from, to, position)` is exported for applying the same move to other state.

By default the table adds a leading column with each row's drag handle, like the selection column. `reorderHandleColumn={false}` removes it, so the handle can go in a cell of your own:

```tsx
const columns: DataTableColumnDef<Task>[] = [
  { id: "move", header: "", cell: () => <DataTable.DragHandle /> },
  { accessorKey: "title", header: "Title" },
];

<DataTable
  data={rows}
  columns={columns}
  enableRowReorder
  reorderHandleColumn={false}
  onRowOrderChange={(change) => setRows(change.data)}
/>;
```

Keyboard: focus a handle, then Space lifts the row, the arrow keys move it, Space drops it, and Escape (or moving focus away) cancels. A pointer drag starts on the handle and auto-scrolls near the edges of the scroll area. It is cancelled when it is released off the rows, on `pointercancel`, on window blur, or when the rows change under it. Each step is announced in a live region, using the six `reorder…` labels. A handle is disabled while its row has nothing to move past (a single row, or an only child).

### Store the new order at once

Set state synchronously inside `onRowOrderChange`, then save to the server. On drop every row animates from where it is to its place in the new `data`. An app that waits for the server reply first sees the row slide back to its old place, then jump when the data arrives. The optimistic pattern:

```tsx
onRowOrderChange={(change) => {
  const previous = rows;
  setRows(change.data); // now, in the same event
  saveOrder(change.data.map((row) => row.id)).catch(() => setRows(previous));
}}
```

### Tree tables

With `getSubRows` a row moves among its siblings only (the rows with the same parent), together with its expanded sub-rows; it never changes parent. `parentId` and `parent` are `null` for a top-level row. For a top-level move `data` is the new order and `siblings` an equal copy. For a sub-row `data` is the unchanged top level, and `siblings` is the parent's children in their new order, to store under `parent`:

```tsx
onRowOrderChange={(change) => {
  if (change.parentId === null) return setRows(change.data);
  const place = (list: Node[]): Node[] =>
    list.map((node) =>
      node.id === change.parentId
        ? { ...node, children: change.siblings }
        : node.children
          ? { ...node, children: place(node.children) }
          : node,
    );
  setRows(place);
}}
```

Positions in the announcements count the visible siblings.

### Sorted tables

Dragging stays allowed while a column sort is active, but the view does not follow the drop: the drop reorders `data`, the view keeps its sorted order, and the row slides back to where the sort puts it. Turn sorting off on a table that is reordered by hand (`enableSorting: false` on its columns).

### Styling and state

Every body row carries `data-row-id`. During a drag:

| Attribute | On |
| --- | --- |
| `data-dragging` | the lifted row, and its handle |
| `data-dragging-child` | the lifted row's visible sub-rows, which move with it |
| `data-drop-position="before"` / `"after"` | the target row |
| `data-drop-edge="before"` / `"after"` | the row to draw a drop line on: the target for `before`, the last visible row of the target's subtree for `after` |

The lifted row itself follows the pointer through an inline `transform`, and the rows it passes slide out of its way; there is no floating copy. `slotsmith/data-table.css` draws the lifted rows above the others with an opaque background and a shadow, but only on the fallback row. A library row (`TableRow` from shadcn/ui, MUI or Chakra UI) is see-through while lifted unless it styles `[data-dragging]` and `[data-dragging-child]` itself, as the adapters do (with Tailwind v4: `data-dragging:*:bg-muted`). With `prefers-reduced-motion: reduce` nothing slides: the lifted rows are dimmed in place, and a line on `data-drop-edge` shows where they will land.

### Custom drag handle

`DragHandle` is an element part: it gets plain `<button>` props, so a library's icon button drops in. Spread every prop onto a real `<button>`: the `ref`, `onPointerDown`, `onKeyDown`, `onBlur`, `onClick`, the `aria-*` attributes, `disabled` and `style` (it sets `touch-action: none`, without which a touch drag scrolls the page). `data-dragging` is set while its row is lifted.

```tsx
import { GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DragHandleSlotProps } from "slotsmith/data-table";

const DragHandle = (props: DragHandleSlotProps) => (
  <Button variant="ghost" size="icon" className="cursor-grab touch-none" {...props}>
    <GripVertical />
  </Button>
);

<DataTable data={rows} columns={columns} enableRowReorder components={{ DragHandle }} />;
```

`slotProps.dragHandle(row)` adds props to every handle. Its event handlers are chained with the table's (both run) and its `className` is appended, so extra props never break dragging.

### Stable rows

A drag is cancelled when its handle unmounts. Give rows stable ids with `getRowId`, and keep each slot component the same between renders: define `Row` and the `components` map outside the component, or memoise them. A `Row` created inline, like `components={{ Row: (props) => <tr {...props} /> }}`, re-creates every row on each render and cancels every drag.

### Headless

`useDataTable` returns `reorder` (`enabled`, `draggingId`, `target`, `announcement`, `instructionsId`, `getRowProps(rowId)` and `getHandleProps(rowId)`), plus `reorderable` and `reorderHandleColumn`. Spread `getRowProps` on each row and `getHandleProps` on each handle, render `announcement` in an `aria-live="assertive"` region, and render a visually hidden element with the id `instructionsId` holding the instructions. Pass `labels` to the hook to translate the handle's name, the instructions and the announcements; keys left out stay English.

### Not supported

`VirtualDataTable` ignores `enableRowReorder`, with a development warning. Dragging between tables, dragging several rows at once, and moving a row to another parent are not supported.

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
