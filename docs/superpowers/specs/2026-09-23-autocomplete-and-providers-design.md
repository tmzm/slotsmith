# Autocomplete, and Provider + virtual everywhere

**Date:** 2026-09-23
**Status:** approved in conversation, validated by a working prototype in the playground

## Goal

Add a third component to slotsmith — an autocomplete that is also a select — and bring
the two affordances the data table already has to every component: a **Provider with
compound parts** for custom layouts, and an **optional virtualized list** behind
`slotsmith/virtual`.

Distilled from a typical app-level autocomplete, minus its usual bugs. Such a component is often
hundreds of lines of composition over cmdk + Radix Popover + TanStack Query; roughly 70% of what
makes it work lives in those libraries. This is that 70%, written once and made
replaceable.

## Decisions

Each was chosen explicitly; the alternatives are recorded because they will be asked again.

| Decision | Choice | Rejected |
| --- | --- | --- |
| Select vs autocomplete | **One component.** `searchable={false}` is a select, with typeahead. | Two components sharing an engine. |
| Trigger shape | **Button-like trigger** in both modes: one focus model, one code path. | MUI-style input trigger. Addable later without a break. |
| Trigger element | **`<div role="combobox" tabindex="0">`** | `<button>` — it cannot legally contain the tag-remove and clear buttons. |
| Remote options | **Dumb component + opt-in `useAsyncOptions` hook** returning props to spread. | `loadOptions` baked into the component; caller-owns-everything. |
| Popup | **`Popup` slot + zero-dep fallback positioner**, plus `slotsmith/floating` wrapping `@floating-ui/react-dom` as an optional peer. | Hard dependency; inline-only. |
| `value` | **Ids.** `onChange(value, option)` also hands back the option. `selected` labels an id whose option never loaded. | Option objects; a generic `getOptionValue` returning either. |
| `multiple` typing | **Discriminated union**, like `date-picker/types.ts`. | Conditional generic `M extends boolean`, as app-level autocompletes often do — it needs casts and mis-infers a dynamic boolean. |
| `onChange` second arg, multiple mode | **`(TOption \| undefined)[]`, index-aligned with the values.** | `TOption[]` with unresolved entries filtered out — the arrays then silently disagree. |
| Grouping | **Not in v1.** Render loop stays group-ready. | — |
| Create flow | `creatable` + `onCreate(query)`. Extra fields (a colour picker, say) come from replacing the `Create` slot. | Porting `withColorPicker` as a built-in second step. |

## Architecture

```
src/autocomplete/
  core/
    types.ts            Option, value and label types
    useAutocomplete.ts  the engine: open, highlight, value, keyboard, typeahead
    useAsyncOptions.ts  debounce + AbortController + sequence guard + paging
    filter.ts           default filter, typeahead matcher
    position.ts         zero-dep positioner: match trigger width, flip, clamp
  slots/
    types.ts            slot prop types
    fallbacks.tsx       plain accessible HTML
    context.tsx         AutocompleteContext, useAutocompleteContext
  parts.tsx             compound parts
  Autocomplete.tsx      Provider + Root + default layout + splitAutocompleteProps
  virtual.tsx           virtualized option list
  styles.css
```

`useAutocomplete` is exported, so an unanticipated shape — an input trigger, a command
palette — is buildable without forking.

## Anatomy — 16 slots

```
 ┌─ Root ────────────────────────────────┐
 │ ┌─ Trigger  role=combobox ──────────┐ │
 │ │ Value / Tag Tag +2    Clear  Ind. │ │
 │ └───────────────────────────────────┘ │
 └───────────────────────────────────────┘
   ┌─ Popup ────────────────────────────┐
   │ Search                             │
   │ ┌─ List  role=listbox ───────────┐ │
   │ │ Option  role=option            │ │
   │ │   OptionLabel      Check       │ │
   │ │ Empty / Loading / Error+retry  │ │
   │ │ Create "foo"                   │ │
   │ │ LoadMore ───────── sentinel    │ │
   │ └────────────────────────────────┘ │
   └────────────────────────────────────┘
```

**Element parts** (DOM props, state as `data-*`): `Root`, `Trigger`, `Popup`, `Search`,
`List`, `Option`.
**Widget parts** (semantic props): `Value`, `Tag`, `Clear`, `Indicator`, `OptionLabel`,
`Check`, `Empty`, `Loading`, `Error`, `Create`, `LoadMore`.

`OptionLabel` exists so rich rows do not require passing the option object to a `<li>`.
`LoadMore` renders a real button as well as being the observed sentinel — an
IntersectionObserver alone strands anyone not using a mouse.

Element slot prop types `Omit` `color` and `size`: MUI reuses those DOM attribute names
for its own semantic props, the same collision the table has on `TableCell`'s `align`.

## Behaviour

**Keyboard.** Closed: `Enter`/`Space` open; `↓` opens on the first option, `↑` on the
last; a printable key does typeahead when `searchable={false}`, otherwise opens and seeds
the search. Open: `↓`/`↑` move past disabled options, `Home`/`End` jump, `PgUp`/`PgDn`
move by ten, `Enter` selects, `Esc` closes and returns focus, `Tab` closes and moves on,
and in multiple mode `Backspace` on an empty search removes the last tag. The highlight
scrolls into view; wrapping is opt-in via `loop`.

**Accessibility.** `aria-activedescendant` tracks the highlight while `aria-selected`
marks what is chosen — implementations that conflate them mean a screen reader never learns the
selection. `aria-multiselectable` on the list. Clear and tag-remove are real buttons with
labels. A `role="status"` region announces result counts.

**Paging.** The sentinel is observed against the **list's** scroll box, not the viewport.

## Common autocomplete bugs this design avoids

The trigger going blank when the selected option is not on the loaded page · `creatable`
offering to create a duplicate while the list is still loading · an unhandled rejection
leaving the create row stuck · no error state at all, so one failure reads as "No items
found" forever · a fetch on mount for every picker on the page · search surviving
close/reopen · `key={index}` on a paged list · popup width unrelated to the trigger ·
`{} as T` handed to `onChange` · non-keyboard-accessible clear and tag-remove.

## Provider and parts, for every component

`<Autocomplete>` follows the table exactly: `Autocomplete.Provider` runs the engine and
renders no markup, `Autocomplete.Root` is the `Root` slot, and the parts
(`.Trigger`, `.Popup`, `.List`, `.Options`, `.Empty`) compose any layout.
`splitAutocompleteProps` separates provider options from DOM props, guarded at compile
time by the same `MissingProviderKeys` trick.

The **file uploader** gains the same: `FileUploader.Provider`, `.Root`, `.Dropzone`,
`.List`, `.Item`, `.Rejections`, a `useFileUploaderContext()` hook and a
`useUploadItem()` row context, with `<FileUploader>` rebuilt on top so behaviour is
unchanged.

## Virtualization

`slotsmith/virtual` grows two exports beside `VirtualDataTable`:

- `AutocompleteVirtualList` / `VirtualAutocomplete` — windows the option list, for the
  thousands-of-rows case that paging alone does not solve.
- `FileUploaderVirtualList` / `VirtualFileUploader` — windows the item list, for bulk
  uploads of hundreds of files.

Both take the same `{ estimateSize, overscan, maxHeight }` options and keep every slot
working, the way the table's spacer rows do.

## Testing

Mirrors the table and uploader: unit tests for the engine and the async hook (fake timers
— debounce collapses, a newer query aborts the older, out-of-order responses are
discarded, paging appends, errors surface, retry works), a keyboard matrix, an aria
suite, a react-hook-form suite proving focus-on-error and touched actually fire, and
three integration suites — shadcn, MUI, Chakra — that fail on any React warning.

Then playground demos, a docs page per component, and a `1.2.0` release.
