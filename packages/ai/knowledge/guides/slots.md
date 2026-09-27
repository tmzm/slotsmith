# Slots: element parts and widget parts

Every component is behaviour plus a set of named parts. Pass replacements through `components`; any part you leave out keeps its built-in fallback, and every behaviour (keyboard, focus, ARIA) keeps working.

```tsx
<DataTable data={users} columns={columns} components={{ Row: TableRow, Checkbox: MyCheckbox }} />
```

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
