# Slots: element parts and widget parts

Every component is behaviour plus a set of named parts. Pass replacements through `components`; any part you leave out keeps its built-in fallback, and every behaviour (keyboard, focus, ARIA) keeps working.

```tsx
<DataTable data={users} columns={columns} components={{ Row: TableRow, Checkbox: MyCheckbox }} />
```

## Once, for every component: the provider

`SlotsmithProvider` (from `slotsmith/provider`) takes the same maps under one key per component, and applies them to every component below it:

```tsx
import { SlotsmithProvider, type SlotsmithComponents } from "slotsmith/provider";

// Module scope (or `useMemo`), so the object keeps its identity between renders.
const components: SlotsmithComponents = {
  dataTable: { Checkbox, Pagination },
  autocomplete: { Option },
  datePicker: { Day },
  fileUploader: { Progress },
};

<SlotsmithProvider components={components}>
  <App />
</SlotsmithProvider>;
```

Each part resolves in three layers, the later one winning, one part at a time:

1. the built-in fallback;
2. the provider's `components.<key>` (`dataTable`, `autocomplete`, `datePicker`, `fileUploader`);
3. the component's own `components` prop.

- A part set to `undefined` in any layer is treated as not set; it never erases the layer below.
- Nested providers merge part by part, the inner one winning, and inherit every component the inner one does not name. A provider that only sets `locale` passes the outer `components` through.
- It reaches every way of rendering a component: the default layout, the virtual variants in `slotsmith/virtual`, and a layout rebuilt from `<Component>.Provider` and the parts. `use<Component>Context().components` returns the merged result.
- The data table's fallback page-size select is the slotsmith `Autocomplete`, so it follows `components.autocomplete`. A `PageSizeSelect` part, from `components.dataTable` or the table's own prop, replaces it altogether.
- Only `components` is shared. `slotProps` and `labels` stay on each component (the language is shared through the provider's `locale`).
- Outside a provider nothing changes.

## Two kinds of parts

| | Receives | Drop-in for |
| --- | --- | --- |
| **Element parts**: `Root`, `Table`, `Row`, `Popup`, `Day`, … | Plain DOM props, with state as `data-*` attributes | A library primitive, unchanged |
| **Widget parts**: `Checkbox`, `Pagination`, `Caption`, `Tag`, … | Semantic props (`checked`, `pageIndex`, `onMonthChange`) | Your component, through a few-line adapter |

A `<tr>` from any library can be dropped in as it is, while a checkbox, which every library models differently, is told *what is true* rather than *what to render*.

## Rules for element parts

- Spread every prop onto the rendered element. The props carry the `ref`, ARIA attributes, event handlers, `tabIndex` and `data-*` state; dropping any of them breaks keyboard support or positioning.
- Merge `className` rather than replacing it when your primitive has its own classes.
- Style state through the `data-*` attributes (`data-selected`, `data-open`, `data-disabled`, …). With Tailwind: `data-[selected]:bg-primary`.
- The DOM `color` attribute (and `size` on inputs, `align` on table cells) is removed from element props, because component libraries use those names for their own props. Nothing needs to be filtered.

## Rules for widget parts

- Render real interactive elements: a clear control must be a `<button>` reachable by keyboard.
- Use the accessible names you are given (`aria-label`, `removeLabel`, values from `labels`); they are already translated.
- A widget that sits inside a clickable element (a clear control inside a trigger) should stop the click from propagating, as the fallbacks do.

## Extra props without replacing a part

`slotProps` adds DOM props to the element parts and merges them with the component's own:

```tsx
<DataTable
  data={users}
  columns={columns}
  slotProps={{ row: (row) => ({ className: row.original.active ? "" : "opacity-50" }) }}
/>
```

## Recomposing the layout

Each component exports its provider, root and parts (`DatePickerProvider`, `DatePickerRoot`, `DatePickerTrigger`, `DatePickerPopup`, …) and a headless hook (`useDataTable`, `useAutocomplete`, `useDatePicker`, `useFileUploader`). Rebuild the layout from the parts when replacing individual slots is not enough, and read state with the component's context hook (`useDatePickerContext()`, …) inside it.
