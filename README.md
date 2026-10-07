<div align="center">

# slotsmith

Finished data table, combobox, date picker and file uploader for React that drop into any design system: shadcn/ui, MUI, Chakra, Ant Design or your own. Every part is a slot; what you don't replace still looks finished.

[![npm](https://img.shields.io/npm/v/slotsmith?color=e0a11b&label=npm)](https://www.npmjs.com/package/slotsmith)
[![types](https://img.shields.io/npm/types/slotsmith?color=e0a11b)](https://www.npmjs.com/package/slotsmith)
[![stars](https://img.shields.io/github/stars/tmzm/slotsmith?color=e0a11b)](https://github.com/tmzm/slotsmith)

**[Documentation and live examples → slotsmith.dev](https://slotsmith.dev/)**

</div>

---

## The idea

Component libraries make you choose. Styled kits give you a finished table in someone else's design language, and you fight it the day your designer disagrees. Headless kits give you behaviour and a blank page, and you spend a week rebuilding the obvious parts.

slotsmith refuses the choice. Every component is **behaviour plus a set of named parts**, and every part has a fallback that is already finished:

```tsx
import { DataTable } from "slotsmith";

// Day one: it works and it looks right.
<DataTable data={users} columns={columns} />;

// Day forty: your design system arrives. Replace only what differs.
<DataTable data={users} columns={columns} components={{ Row: TableRow, Checkbox: MyCheckbox }} />;
```

Nothing is forked, nothing is re-implemented, and the parts you didn't name keep working.

### Two kinds of parts

| | Receive | Drop-in for |
| --- | --- | --- |
| **Element parts** — `Root`, `Table`, `Row`, `Cell`, … | Plain DOM props, with state as `data-*` attributes | shadcn, MUI, Chakra primitives, unchanged |
| **Widget parts** — `Checkbox`, `Pagination`, `Empty`, … | Semantic props (`checked`, `pageIndex`, `setPageSize`) | Your components, via a few-line adapter |

That split is the whole trick: a `<tr>` from any library can be dropped in as-is, while a checkbox — which every library models differently — gets told *what is true*, not *what to render*.

## Install

```bash
npm i slotsmith
# or: pnpm add slotsmith · yarn add slotsmith · bun add slotsmith
```

Peer dependencies are per component, so you only install what you use:

| Component | Also install |
| --- | --- |
| Data table | `@tanstack/react-table@^9` |
| Autocomplete | nothing |
| Date picker | nothing |
| File uploader | nothing |
| Any virtualized list | `@tanstack/react-virtual@^3` |

React 18 or 19 is required. The TanStack peers are optional — you are only asked for the one
belonging to the component you actually import.

The stylesheet is optional too. Import the whole set, or just the component you use:

```tsx
import "slotsmith/styles.css";            // all components
import "slotsmith/autocomplete.css";      // just this one
import "slotsmith/data-table.css";        // includes the autocomplete's rules, for its page-size menu
import "slotsmith/date-picker.css";
import "slotsmith/file-uploader.css";
```

Replacing every part with your own design system? Import no stylesheet at all — the
components never reference it.

## Quick start

```tsx
import { DataTable, type DataTableColumnDef } from "slotsmith";
import "slotsmith/styles.css"; // optional — the fallbacks' styles

const columns: DataTableColumnDef<User>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "email", header: "Email" },
];

export function Users({ users }: { users: User[] }) {
  return <DataTable data={users} columns={columns} enableRowSelection />;
}
```

Sorting, pagination and selection work immediately, and each piece of state stays **uncontrolled** until you pass its value — so `pagination` / `onPaginationChange` is opt-in, not required boilerplate.

[Getting started](https://slotsmith.dev/getting-started/) covers installing, styles, themes, dark mode, languages, CommonJS, and setup in Next.js and Vite. Each component's own docs are linked under [Components](#components).

### Reordering rows

Rows can be dragged into a new order by pointer, touch or keyboard (Space to lift, the arrow keys to move, Space to drop, Escape to cancel). The order is yours: the table reports each move, and you store it.

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

Store the new order in the same event, and save it to a server afterwards; a table that waits for the reply shows the row slide back, then jump. In a tree table a row moves among its siblings, with its sub-rows; for a sub-row, store `change.siblings` as the children of `change.parent`. The [row reorder guide](https://slotsmith.dev/components/data-table/guides/row-reorder/) has live examples.

## Components

| Component | Status | Docs |
| --- | --- | --- |
| **Data table** | ✅ shipping | [Docs](https://slotsmith.dev/components/data-table/) · sorting, pagination, selection that survives server pages, tree rows, drag-to-reorder rows, virtual rows, loading / error / empty states, i18n and RTL |
| **Autocomplete** | ✅ shipping | [Docs](https://slotsmith.dev/components/autocomplete/) · a combobox that is also a select; single or multiple, remote options with debounce and paging, create-as-you-type, auto highlight, full keyboard and typeahead |
| **File uploader** | ✅ shipping | [Docs](https://slotsmith.dev/components/file-uploader/) · drop zone, image tile or picker-only; queued uploads with progress, retry and real cancellation; validation by type, size and count |
| **Date picker** | ✅ shipping | [Docs](https://slotsmith.dev/components/date-picker/) · one date, several or a range as plain `YYYY-MM-DD` strings that never shift across time zones; full keyboard grid, min / max and blocked dates, presets, locale week start and RTL |
| More | 🔜 next | Same rules: headless logic, replaceable parts, fallbacks good enough to ship |

## Languages

Every component takes a `locale`: a ready-made pack, the tag of one registered with a provider, or a custom locale from `defineLocale`. `labels` still wins over any of them, one string at a time.

```tsx
import { SlotsmithProvider } from "slotsmith/provider";
import { ar } from "slotsmith/locales/ar";
import { fr } from "slotsmith/locales/fr";

<SlotsmithProvider locale={lang} locales={[ar, fr]}>…</SlotsmithProvider>
```

18 packs ship, 15 languages, each its own import under `slotsmith/locales/`: `ar`, `ar-EG`, `ar-SA`, `ar-IQ`, `fa`, `he`, `tr`, `fr`, `de`, `es`, `pt-BR`, `it`, `ru`, `zh-CN`, `ja`, `ko`, `hi` and `id`. There is no `en` pack, because English lives in each component's own defaults.

The [Languages page](https://slotsmith.dev/languages/) lists each pack's direction and review status, and covers custom packs, precedence, plurals and Next.js.

## How it compares

Styled kits such as MUI and Chakra work on day one but tie you to their design language. Headless kits such as Radix and TanStack leave the interface to you. slotsmith ships finished fallbacks and makes every part a prop, so you replace only the parts that differ.

slotsmith isn't a replacement for TanStack Table or Radix: the table is *built on* TanStack v9. The [comparison page](https://slotsmith.dev/comparison/) sets it beside other libraries, with a source for every cell.

## Bring your own UI

```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

<DataTable
  data={users}
  columns={columns}
  components={{
    Table, Head: TableHeader, Body: TableBody,
    Row: TableRow, HeaderCell: TableHead, Cell: TableCell,
    Checkbox: ShadcnCheckbox, // a 6-line adapter
  }}
/>;
```

Every component is also exercised, in every library, by an integration suite that fails on any React warning — the tested source lives in each component's `__tests__/integrations/` folder. Copy a finished adapter instead of writing one: see [Ready-made adapters](#ready-made-adapters).

### Once, for the whole app

Set the same maps once on `SlotsmithProvider` instead of on every component: `components` takes one map per component, each the same shape as that component's own `components` prop, so an adapter works in either place.

```tsx
import { SlotsmithProvider, type SlotsmithComponents } from "slotsmith/provider";

// Outside the component, so the object keeps its identity between renders.
const components: SlotsmithComponents = {
  dataTable: { Checkbox, Pagination },
  autocomplete: { Option },
  datePicker: { Day },
  fileUploader: { Progress },
};

export function Providers({ children }: { children: React.ReactNode }) {
  return <SlotsmithProvider components={components}>{children}</SlotsmithProvider>;
}
```

Each slot resolves in three layers, the later one winning: the built-in fallback, then the provider's `components`, then the component's own `components` prop. Nested providers merge slot by slot and inherit what they do not name. The table's built-in page-size select is an `Autocomplete`, so it follows `components.autocomplete` unless a `PageSizeSelect` slot replaces it. Provider-level autocomplete slots therefore receive every option type, including the table's page-size options (`{ value: number, label: string }`): the key is typed for an unknown option, so a `Tag` or `OptionLabel` written for one option shape is a type error there and goes on that autocomplete's own `components` prop instead. Define the object outside your component, as above (or memoise it), so it keeps its identity between renders; `slotProps` stay on each component.

In the Next.js App Router, or any React Server Components framework, render the provider from a `"use client"` file such as the `Providers` above: the map holds functions, and functions cannot be passed from a Server Component to a client one.

Not using a component library? Every fallback also exposes `data-*` state, so Tailwind alone is enough: `[&_tr[data-state=selected]]:bg-muted`.

## Ready-made adapters

Twenty adapters — every component times five component libraries — are generated from those tested integration suites and copied into your project as source you own, with [`slotsmith-ai`](#use-with-ai-agents):

```bash
npx slotsmith-ai add date-picker --ui mui
npx slotsmith-ai add data-table --ui antd --out src/ui/slotsmith
npx slotsmith-ai add --all --ui shadcn
```

```
slotsmith-ai add <component...> --ui <library> [--out <dir>] [--force] [--dry-run]
slotsmith-ai add --all --ui <library>
```

- `<component>` is `data-table`, `autocomplete`, `file-uploader` or `date-picker`; `--all` adds every one.
- `--ui` is `mui`, `shadcn`, `chakra`, `antd` or `radix` (`ant-design` and `radix-themes` are accepted too). `radix` is **Radix Themes** (`@radix-ui/themes`), the styled library; an app built on the bare Radix primitives — shadcn/ui's own components are built on them — wants `shadcn` instead.
- `--out` chooses where to write. Default: `src/components/slotsmith` when `src/` exists, else `components/slotsmith`.
- Each file starts with a one-line comment naming the library and the `slotsmith-ai` version it came from — the file is yours to edit from there. Running the command again on an untouched file reports `unchanged` and leaves it alone. A file you have edited is left as is: the command names it, says how many lines differ, and exits with code `1`; pass `--force` to replace it anyway. `--dry-run` prints what would happen and writes nothing, exiting the same way the real run would.
- After writing, it prints the import and a usage line, one `npm install …` line for whatever the project's `package.json` does not already list, and, for `shadcn`, one `npx shadcn@latest add …` line for the shadcn/ui components the adapter uses. It never installs anything itself.

| Component | mui | shadcn | chakra | antd | radix |
| --- | --- | --- | --- | --- | --- |
| Data table | `muiDataTable` | `shadcnDataTable` | `chakraDataTable` | `antdDataTable` | `radixDataTable` |
| Autocomplete | `muiAutocomplete` | `shadcnAutocomplete` | `chakraAutocomplete` | `antdAutocomplete` | `radixAutocomplete` |
| Date picker | `muiDatePicker` | `shadcnDatePicker` | `chakraDatePicker` | `antdDatePicker` | `radixDatePicker` |
| File uploader | `muiFileUploader` | `shadcnFileUploader` | `chakraFileUploader` | `antdFileUploader` | `radixFileUploader` |

Each component's Adapters page in the docs runs all five, starting with the [data table's](https://slotsmith.dev/components/data-table/adapters/).

### The shadcn registry

The four shadcn/ui adapters are also built into a [shadcn/ui registry](https://ui.shadcn.com/docs/registry) by `slotsmith-ai`'s own build (`packages/ai/registry/<component>.json`, plus a `registry.json` index; nothing is published from this repo — build it yourself and serve it from any static host you control):

```bash
npx shadcn@latest add https://<your-host>/date-picker.json
```

It lands at the same path `slotsmith-ai add --ui shadcn` writes to, installs its peers automatically, and pulls in any shadcn/ui components (`button`, `checkbox`, …) it depends on. One caveat: shadcn's CLI strips a file's leading doc comment when it installs a `registry:component`, so a file placed this way is missing the adapter's short "what this is" header comment that `slotsmith-ai add` keeps — every slot and prop is otherwise the same file either way.

## Theming

`slotsmith/styles.css` gives all four components one default look. Every colour, radius and font size in it reads a shared `--ss-*` token first, so a few overrides restyle everything at once:

```css
:root {
  --ss-accent: #7c3aed;
  --ss-radius: 12px;
}

.dark, [data-theme="dark"] {
  --ss-accent: #a78bfa;
}
```

Set the tokens on `:root` for the whole page, or on any wrapper element for just the components inside it. Each component's own tokens (`--sdt-*`, `--sac-*`, `--sdp-*`, `--sfu-*`) restyle one component without the others, and a component token beats the shared one wherever each is set (a `--sdt-accent` on `:root` beats a `--ss-accent` on a closer wrapper). The date picker and the uploader also still follow a theme written against the data table's `--sdt-*` when no `--ss-*` value is set for the same thing. The data table's density tokens (`--sdt-font-size`, `--sdt-padding-x`, `--sdt-padding-y`, `--sdt-checkbox-size`) are not declared by the stylesheet: the `size` prop supplies their values unless you set them, and then yours win at every size.

The colour, radius and font-size component tokens are inputs only: the stylesheet does not declare them, so `var(--sdt-accent)` in your own CSS is empty unless you set it; read `var(--ss-accent, <default>)` instead. The few tokens with no shared counterpart do have defaults on `:root`: the table's `--sdt-stripe`, `--sdt-skeleton-bg`, `--sdt-skeleton-bg-2` and `--sdt-max-height`, and the sizes `--sdp-cell`, `--sdp-gap`, `--sfu-gap` and `--sfu-tile-size`. Set a component token on the component or above it, not on an inner part such as `.sdt__row`. A popup rendered outside the wrapper, such as one portalled to `document.body`, does not see the wrapper's `--ss-*` and takes the page's values instead.

Six ready-made themes set only the shared tokens, each with a light and a dark palette: `minimal`, `soft`, `ocean`, `forest`, `sunset` and `contrast`. Import one after the stylesheet:

```ts
import "slotsmith/styles.css";
import "slotsmith/themes/soft.css";
```

The [Theming page](https://slotsmith.dev/theming/) lists every shared token and covers dark mode, Tailwind, class names for your own styles, and right-to-left layout.

## You ship only what you import

Each component is independent, and the build is arranged so your bundler can prove it: `import { Autocomplete } from "slotsmith"` already drops the other three. The one exception is deliberate: the data table's page-size control is the autocomplete, so `DataTable` and `VirtualDataTable` bring the autocomplete with them (and `slotsmith/data-table.css` its styles). A test in the suite bundles the real output and fails if anything else leaks in.

CommonJS cannot be tree-shaken, because `require()` resolves at run time, so import the component's own entry there: `slotsmith/autocomplete`, `slotsmith/data-table`, `slotsmith/date-picker` or `slotsmith/file-uploader`. Each exports exactly what the main entry does. `slotsmith/provider`, `slotsmith/locale` and `slotsmith/locales/<code>` are separate entries too, so importing a component never pulls in a language pack.

The [Trust page](https://slotsmith.dev/trust/#sizes) has the size of every import and stylesheet, minified and gzipped, measured at every build.

## Use with AI agents

[`slotsmith-ai`](https://www.npmjs.com/package/slotsmith-ai) is an MCP server that gives coding agents the real API: every prop, slot, fallback and label, generated from this source. Its `add` command copies the adapters into your project; see [Ready-made adapters](#ready-made-adapters). Nothing is installed in your project; the client runs it with `npx`.

```bash
# Claude Code
claude mcp add slotsmith -- npx -y slotsmith-ai mcp
```

The [AI tools page](https://slotsmith.dev/ai-tools/) has the setup for Cursor, VS Code and Claude Desktop, and lists the tools, resources and prompts.

## Principles

1. **Fallbacks ship.** If the built-in look isn't good enough to put in production, it isn't done.
2. **State is uncontrolled until you control it.** No required `useState` to render a component.
3. **Every string is a label.** Translation and RTL are props, not a fork.
4. **Accessible by default.** Keyboard paths, `aria-*` state and focus handling live in the fallbacks, so replacing a part can't silently remove them.
5. **Pay only for what you import.** Components are independent and tree-shake cleanly, so a project that uses one of them ships one of them — except that the data table ships the autocomplete it uses for its page size.

## Contributing

Issues and ideas are welcome — especially "I wanted to replace X and couldn't". That's a bug in the slot design, not in your code.

```bash
pnpm install
pnpm test        # vitest + testing-library
pnpm typecheck
pnpm build       # tsup (ESM + CJS) + tsc declarations
pnpm test:ai     # the MCP server in packages/ai
```

## Changelog

- **Unreleased** — Behaviour changes: component tokens (`--sdt-*`, `--sac-*`, `--sdp-*`, `--sfu-*`) are inputs only. The stylesheets no longer declare them, so read `var(--ss-accent, <default>)` instead of `var(--sdt-accent)` in your own CSS. `--ss-*` set on any wrapper now applies to the components inside it, and a component token still beats it wherever each is set (a `--sdt-accent` on `:root` beats a `--ss-accent` on a closer wrapper). A component token set on an inner part (for example `.sdt__row`) is no longer read; set it on the component or above. A popup portalled outside the wrapper does not see the wrapper's `--ss-*`; see [Theming](#theming).
- `SlotsmithProvider` takes `components`: slot overrides for every component below it, one map per component (`dataTable`, `autocomplete`, `datePicker`, `fileUploader`), so a design system is applied once instead of on every component. A component's own `components` prop still wins slot by slot, and nested providers merge; see [Once, for the whole app](#once-for-the-whole-app). `components.autocomplete` also reaches the data table's built-in page-size select, so its slots are typed for any option and must not assume one option shape. New types `SlotsmithComponents` and `SlotsmithComponentName` (the four keys), from `slotsmith/provider`.
- Fixes: the type declarations of `slotsmith/provider`, `slotsmith/locale`, the locale packs and every component but the data table no longer import `@tanstack/react-table`, so an app without that optional peer type-checks with `skipLibCheck: false`; and the main entry's and `slotsmith/locale`'s re-exports resolve to their declarations under `moduleResolution: "bundler"` instead of to the built scripts beside them, which had left them untyped.
- Fixes: the type declarations name the extension of every relative import (`./context.js`, `./provider/index.js`), so they also resolve under `moduleResolution: "node16"` and `"nodenext"`, where they had failed to load (or, with `skipLibCheck`, left every export typed as `any`). The `require` condition now points at `.d.cts` declarations, so a CommonJS app types the CommonJS build instead of being told it imports an ES module.
- Fixes: the autocomplete's and the date picker's clear buttons and the autocomplete's tag remove buttons are now 24px pointer targets (WCAG 2.5.8), with the trigger the same height and nothing beside them moved; tags are 2px taller, so wrapped rows keep their targets apart. The Ant Design date-picker adapter keeps keyboard focus on a day as it is picked (copy it again from `slotsmith-ai`). In the Arabic, Persian and Hebrew packs the file uploader's hint wraps each accepted type in invisible left-to-right isolates (U+2066 … U+2069), so `image/*` no longer shows as `*/image`, and the messages that name a file (its upload progress, its preview and the wrong-type, too-large and too-small refusals) wrap the name in a first-strong isolate, so a Latin name such as `report.v2.pdf` keeps its order; a test that compares those hints or messages as strings needs the isolates. `VirtualFileUploader` scrolls through the whole list with the default stylesheet: its spacer rows no longer shrink, and they allow for the list's row gap, so `estimateSize` is a row's height plus that gap.
- The autocomplete takes `autoHighlight` (default `false`): the first option that can be picked is highlighted whenever the list opens and whenever its contents change, as the search narrows or a page arrives, so Enter picks the top match. A highlight moved with the arrow keys or the pointer is kept until the search changes. `useAutocomplete` takes it too.

- **1.7.0** — Adapters for Ant Design and Radix Themes are now available through `slotsmith-ai`, alongside the existing MUI, shadcn/ui and Chakra UI ones — twenty ready-made adapters in all, copied into a project with `npx slotsmith-ai add` or buildable as a shadcn/ui registry; see [Ready-made adapters](#ready-made-adapters). Fixes: the data table's page-size menu follows `--sdt-*` token overrides, clicking its "Rows per page" label focuses it and its numbers use the table's locale digits, and the file uploader's size text no longer throws on a malformed locale tag.

- **1.6.0** — Drag-to-reorder rows in the data table, by pointer, touch or keyboard; see [Reordering rows](#reordering-rows). New props `enableRowReorder`, `onRowOrderChange` and `reorderHandleColumn`; a new `DragHandle` slot, `DataTable.DragHandle` for placing the handle in a cell of your own, and `slotProps.dragHandle`, whose handlers run alongside the table's own; six new labels (`reorderRow`, `reorderInstructions`, `reorderLifted`, `reorderMoved`, `reorderDropped`, `reorderCancelled`) in every locale pack; and `moveItem`. The order is controlled: `onRowOrderChange` receives `row`, `rowId`, `target`, `targetId`, `position` and the new `data`, and the table does not reorder until you store it. The dragged row follows the pointer while the others slide out of its way; with reduced motion nothing slides, the row is dimmed and a line marks where it will land. Every step is announced to screen readers.
- Tree tables reorder too: a row moves among its siblings only, together with its expanded sub-rows. `RowOrderChange` also carries `parentId`, `parent` and `siblings`; for a sub-row `data` is the unchanged top level, and `siblings` is the parent's new list of children to store.
- Row state for styling: every body row now carries `data-row-id`; during a drag the lifted row has `data-dragging`, its visible sub-rows `data-dragging-child`, the target `data-drop-position` (`before` / `after`), and the row to draw a drop line on `data-drop-edge`. A `Row` slot must keep its identity between renders (define it outside the component): a row that is re-created on every render cancels every drag.
- While a column sort is active a drop still reorders `data`, but the view keeps its sorted order, so the row slides back to where the sort puts it. Turn sorting off on a table that is reordered by hand. `VirtualDataTable` ignores `enableRowReorder` with a development warning; dragging between tables, dragging several rows at once and moving a row to another parent are not supported.
- The headless `useDataTable` returns `reorder` (the drag state, and the props for rows and handles), `reorderable` and `reorderHandleColumn`, and takes `labels` for the handle's name and the announcements.
- The shadcn/ui, MUI and Chakra UI adapters gain a drag handle, and style a lifted row themselves (an opaque background and a shadow), because the built-in drag styles apply to the fallback row only.
- `SlotsmithProvider` and `useSlotsmithLocale` now come from `slotsmith/provider`, which will also carry shared settings beyond the language. `slotsmith/locale` still exports them, marked deprecated.
- All four components now share one default palette and shape, read from the new shared `--ss-*` tokens; see [Theming](#theming). Set `--ss-accent` (and the other `--ss-*` tokens) to restyle every component at once. The per-component tokens still work, and the date picker and the uploader still follow a theme written against the data table's tokens.
- The date picker's month and year selects now use the component's colours in dark mode.
- The data table's page-size control is now the slotsmith autocomplete, so it matches the other components. The data table's bundle includes the autocomplete, and `slotsmith/data-table.css` includes the autocomplete's styles.
- The date picker's footer control now reads "Go to today" and looks like navigation, so it isn't mistaken for a preset.
- Six ready-made themes, each with a light and a dark palette, setting only the shared `--ss-*` tokens: `minimal`, `soft`, `ocean`, `forest`, `sunset` and `contrast`; see [Theming](#theming).

- **1.5.0** — Locale packs and a `SlotsmithProvider` for translating every component, formatting numbers and plurals, and right-to-left text; see [Languages](#languages). A string `locale` with no registered pack now logs one development-only warning instead of silently staying in English.
- The autocomplete now turns dark with `.dark` or `[data-theme="dark"]` on the page, like the other components, instead of with the system setting.

## Author

Built by **[Tareq Al-Mozayek](https://tareqmozayek.com)** — full-stack developer, frontend-focused, Damascus.
[Portfolio](https://tareqmozayek.com) · [LinkedIn](https://www.linkedin.com/in/tareq-al-mozayek-3ab2603a9/) · [Email](mailto:tareqmozayek@gmail.com)

If it saves you a day of work, a ⭐ on [the repo](https://github.com/tmzm/slotsmith) helps others find it.

## License

ISC
