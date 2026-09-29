<div align="center">

# slotsmith

**React components you can take apart.**

Headless logic with finished fallbacks: ship a component as it comes, then replace any part of it — one prop at a time — with your own design system.

[![npm](https://img.shields.io/npm/v/slotsmith?color=e0a11b&label=npm)](https://www.npmjs.com/package/slotsmith)
[![bundle](https://img.shields.io/bundlephobia/minzip/slotsmith?color=e0a11b)](https://bundlephobia.com/package/slotsmith)
[![types](https://img.shields.io/npm/types/slotsmith?color=e0a11b)](https://www.npmjs.com/package/slotsmith)
[![stars](https://img.shields.io/github/stars/tmzm/slotsmith?color=e0a11b)](https://github.com/tmzm/slotsmith)

**[Documentation and live examples → slotsmith-docs.netlify.app](https://slotsmith-docs.netlify.app)**

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

React 18 or 19. Every peer is optional — you are only asked for the one belonging to the
component you actually import.

The stylesheet is optional too. Import the whole set, or just the component you use:

```tsx
import "slotsmith/styles.css";            // all components — 24.4 KB
import "slotsmith/autocomplete.css";      // just this one — 5.5 KB
import "slotsmith/data-table.css";        // includes the autocomplete's rules, for its page-size menu
import "slotsmith/date-picker.css";       // 7.0 KB
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

Store the new order in the same event, and save it to a server afterwards; a table that waits for the reply shows the row slide back, then jump. In a tree table a row moves among its siblings, with its sub-rows; for a sub-row, store `change.siblings` as the children of `change.parent`.

## Components

| Component | Status | Docs |
| --- | --- | --- |
| **Data table** | ✅ shipping | [Docs](https://slotsmith-docs.netlify.app/#/docs/data-table) · sorting, pagination, selection that survives server pages, tree rows, drag-to-reorder rows, virtual rows, loading / error / empty states, i18n and RTL |
| **Autocomplete** | ✅ shipping | [Docs](https://slotsmith-docs.netlify.app/#/docs/autocomplete) · a combobox that is also a select; single or multiple, remote options with debounce and paging, create-as-you-type, full keyboard and typeahead |
| **File uploader** | ✅ shipping | [Docs](https://slotsmith-docs.netlify.app/#/docs/file-uploader) · drop zone, image tile or picker-only; queued uploads with progress, retry and real cancellation; validation by type, size and count |
| **Date picker** | ✅ shipping | [Docs](https://slotsmith-docs.netlify.app/#/docs/date-picker) · one date, several or a range as plain `YYYY-MM-DD` strings that never shift across time zones; full keyboard grid, min / max and blocked dates, presets, locale week start and RTL |
| More | 🔜 next | Same rules: headless logic, replaceable parts, fallbacks good enough to ship |

## Languages

Every component takes a `locale`: a ready-made pack, the tag of one registered with a provider, or a custom locale from `defineLocale`. `labels` still wins over any of them, one string at a time.

```tsx
// 1. A ready-made pack, passed as an object. No provider needed.
import { ar } from "slotsmith/locales/ar";
<DatePicker locale={ar} />

// 2. A provider for the whole app. Strings resolve against the packs it was given.
import { SlotsmithProvider } from "slotsmith/provider";
import { ar } from "slotsmith/locales/ar";
import { fr } from "slotsmith/locales/fr";
<SlotsmithProvider locale={lang} locales={[ar, fr]}>…</SlotsmithProvider>

// 3. A custom locale. Each section that is present must be complete.
import { defineLocale } from "slotsmith/locale";
const ku = defineLocale({ code: "ckb", table: { /* every DataTableLabels key */ } });
<DataTable locale={ku} />

// 4. One-off overrides still win.
<DataTable locale={ar} labels={{ empty: "لا توجد طلبات" }} />
```

Precedence per string: `labels` on the component beats its own `locale`, which beats the provider's `locale`, which beats the English default.

A section can also be a function of the active tag, built with `createNumber` and `createPlural` from `slotsmith/locale` — the same two helpers every pack above uses to format numbers and pick plural forms.

18 packs ship, 15 languages. "Drafted" means translated from the English labels and not yet checked by a native speaker; "reviewed by Tareq" means a native speaker checked it; "same text as `ar`" means the region pack reuses the `ar` pack's text, formatted for its own tag.

| Import | Language | Direction | Status |
| --- | --- | --- | --- |
| `slotsmith/locales/ar` | Arabic | rtl | reviewed by Tareq |
| `slotsmith/locales/ar-EG` | Arabic, Egypt | rtl | same text as `ar` |
| `slotsmith/locales/ar-SA` | Arabic, Saudi Arabia | rtl | same text as `ar` |
| `slotsmith/locales/ar-IQ` | Arabic, Iraq | rtl | same text as `ar` |
| `slotsmith/locales/fa` | Persian | rtl | drafted |
| `slotsmith/locales/he` | Hebrew | rtl | drafted |
| `slotsmith/locales/tr` | Turkish | ltr | drafted |
| `slotsmith/locales/fr` | French | ltr | drafted |
| `slotsmith/locales/de` | German | ltr | drafted |
| `slotsmith/locales/es` | Spanish | ltr | drafted |
| `slotsmith/locales/pt-BR` | Portuguese, Brazil | ltr | drafted |
| `slotsmith/locales/it` | Italian | ltr | drafted |
| `slotsmith/locales/ru` | Russian | ltr | drafted |
| `slotsmith/locales/zh-CN` | Chinese, simplified | ltr | drafted |
| `slotsmith/locales/ja` | Japanese | ltr | drafted |
| `slotsmith/locales/ko` | Korean | ltr | drafted |
| `slotsmith/locales/hi` | Hindi | ltr | drafted |
| `slotsmith/locales/id` | Indonesian | ltr | drafted |

There is no `en` pack — English lives in each component's own defaults — and no bundled "all packs" entry; import only the languages an app ships. The date picker's calendar grid is always Gregorian, whatever the locale.

## How it compares

|  | Styled kits (MUI, Chakra) | Headless kits (Radix, TanStack) | **slotsmith** |
| --- | --- | --- | --- |
| Works on day one | ✅ | ❌ you build the UI | ✅ fallbacks are finished |
| Matches your design system | ⚠️ theme overrides | ✅ you wrote it | ✅ replace only the parts that differ |
| Escape hatch | eject or fight the theme | n/a | every part is a prop |
| Runtime dependencies | many | few | one, and only for the components that need it |

slotsmith isn't a replacement for TanStack Table or Radix — the table is *built on* TanStack v9. It's the layer those libraries leave to you, written once and made replaceable.

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

Ready-made adapters for **shadcn/ui**, **MUI v7** and **Chakra UI v3** live in [`src/data-table/__tests__/integrations/`](src/data-table/__tests__/integrations/) — each one is exercised by an integration suite that fails on any React warning.

Not using a component library? Every fallback also exposes `data-*` state, so Tailwind alone is enough: `[&_tr[data-state=selected]]:bg-muted`.

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

The shared tokens are `--ss-surface`, `--ss-text`, `--ss-muted`, `--ss-border`, `--ss-accent`, `--ss-on-accent`, `--ss-danger`, `--ss-hover`, `--ss-selected`, `--ss-radius` and `--ss-font-size`. Each component's own tokens (`--sdt-*`, `--sac-*`, `--sdp-*`, `--sfu-*`) still work, for restyling one component without the others; the date picker and the uploader also still follow a theme written against the data table's `--sdt-*`. A value set on `:root` applies to both themes, so set its dark value under `.dark, [data-theme="dark"]` too.

Every component names its classes the same way: `s` plus the component's initials (`sdt`, `sac`, `sdp`, `sfu`), then `__part`, then `--modifier`, with state as `data-*` attributes.

> **Deprecated:** before 1.6.0 the data table's prefix was `rdt`. The old `rdt__*` classes are still on every element and the `--rdt-*` tokens are still read (set on `:root` or under `.dark, [data-theme="dark"]`, they win over `--ss-*` as before), so a theme or an override written against them keeps working. The stylesheet itself uses only the new names. Both are removed in 2.0: rename `.rdt__row` to `.sdt__row` and `--rdt-accent` to `--sdt-accent`, and so on. A `--rdt-*` value set on a single table's element rather than on `:root` no longer reaches it; set the `--sdt-*` token there instead.

## You ship only what you import

Each component is independent, and the build is arranged so your bundler can prove it.
Measured on the published output, bundling a single component:

| What you import | JavaScript |
| --- | --- |
| `Autocomplete` alone | 16.5 KB |
| `useAutocomplete` alone | 7.9 KB |
| `DatePicker` alone | 16.7 KB |
| `useDatePicker` alone | 9.1 KB |
| all four components | 62.3 KB |

Nothing special is required — `import { Autocomplete } from "slotsmith"` already drops
the other three. The one exception is deliberate: the data table's page-size control is
the autocomplete, so `DataTable` and `VirtualDataTable` bring the autocomplete with them
(and `slotsmith/data-table.css` its styles). Nothing else pulls in another component, and
the autocomplete never pulls in the table. A test in the suite bundles the real output and fails if any of it leaks
back in.

Two cases a bundler cannot solve on its own, and what to do about them:

```tsx
// CommonJS cannot be tree-shaken, because require() resolves at run time.
// Import the component's own entry and you get 23 KB instead of 81 KB.
const { Autocomplete } = require("slotsmith/autocomplete");

// CSS has no import graph to follow, so pick the stylesheet you need.
import "slotsmith/autocomplete.css";
```

Per-component entries exist for every component — `slotsmith/autocomplete`,
`slotsmith/data-table`, `slotsmith/date-picker`, `slotsmith/file-uploader` — and they
export exactly what the main entry does. On ES modules they make no difference at all;
use them when you are on CommonJS, or when you want the guarantee written down rather
than inferred.

`slotsmith/provider` (`SlotsmithProvider`), `slotsmith/locale` (`defineLocale`, and
`SlotsmithProvider` still, for compatibility) and `slotsmith/locales/<code>` (one entry
per pack, e.g. `slotsmith/locales/ar`) are separate entries too, so importing a
component never pulls in a language pack, and importing one language never pulls in
another.

## Use with AI agents

[`slotsmith-ai`](https://www.npmjs.com/package/slotsmith-ai) is an MCP server that gives coding agents the real API —
every prop, slot, fallback and label, generated from this source — plus ready-made
MUI, shadcn/ui and Chakra UI adapters. Nothing is installed in your project; the client
runs it with `npx`.

```bash
# Claude Code
claude mcp add slotsmith -- npx -y slotsmith-ai mcp
```

```jsonc
// Cursor: .cursor/mcp.json · Claude Desktop: claude_desktop_config.json
{ "mcpServers": { "slotsmith": { "command": "npx", "args": ["-y", "slotsmith-ai", "mcp"] } } }

// VS Code: .vscode/mcp.json (note the "servers" key)
{ "servers": { "slotsmith": { "type": "stdio", "command": "npx", "args": ["-y", "slotsmith-ai", "mcp"] } } }
```

Tools, resources and prompts are listed in the [package README](https://github.com/tmzm/slotsmith/tree/master/packages/ai#readme);
the [AI tools guide](https://slotsmith-docs.netlify.app/#/docs/ai-tools) walks through
each client.

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

- **1.6.0** — Drag-to-reorder rows in the data table, by pointer, touch or keyboard; see [Reordering rows](#reordering-rows). New props `enableRowReorder`, `onRowOrderChange` and `reorderHandleColumn`; a new `DragHandle` slot, `DataTable.DragHandle` for placing the handle in a cell of your own, and `slotProps.dragHandle`, whose handlers run alongside the table's own; six new labels (`reorderRow`, `reorderInstructions`, `reorderLifted`, `reorderMoved`, `reorderDropped`, `reorderCancelled`) in every locale pack; and `moveItem`. The order is controlled: `onRowOrderChange` receives `row`, `rowId`, `target`, `targetId`, `position` and the new `data`, and the table does not reorder until you store it. The dragged row follows the pointer while the others slide out of its way; with reduced motion nothing slides, the row is dimmed and a line marks where it will land. Every step is announced to screen readers.
- Tree tables reorder too: a row moves among its siblings only, together with its expanded sub-rows. `RowOrderChange` also carries `parentId`, `parent` and `siblings`; for a sub-row `data` is the unchanged top level, and `siblings` is the parent's new list of children to store.
- Row state for styling: every body row now carries `data-row-id`; during a drag the lifted row has `data-dragging`, its visible sub-rows `data-dragging-child`, the target `data-drop-position` (`before` / `after`), and the row to draw a drop line on `data-drop-edge`. A `Row` slot must keep its identity between renders (define it outside the component): a row that is re-created on every render cancels every drag.
- While a column sort is active a drop still reorders `data`, but the view keeps its sorted order, so the row slides back to where the sort puts it. Turn sorting off on a table that is reordered by hand. `VirtualDataTable` ignores `enableRowReorder` with a development warning; dragging between tables, dragging several rows at once and moving a row to another parent are not supported.
- The headless `useDataTable` returns `reorder` (the drag state, and the props for rows and handles), `reorderable` and `reorderHandleColumn`, and takes `labels` for the handle's name and the announcements.
- The shadcn/ui, MUI and Chakra UI adapters gain a drag handle, and style a lifted row themselves (an opaque background and a shadow), because the built-in drag styles apply to the fallback row only.
- `SlotsmithProvider` and `useSlotsmithLocale` now come from `slotsmith/provider`, which will also carry shared settings beyond the language. `slotsmith/locale` still exports them, marked deprecated.
- The data table's class prefix is now `sdt` and its tokens are `--sdt-*`, like the other components' `sac`, `sdp` and `sfu`. The `rdt__*` classes stay on the elements and the `--rdt-*` tokens are still read, so existing overrides and themes keep working; both are deprecated and removed in 2.0. See [Theming](#theming).
- All four components now share one default palette and shape, read from the new shared `--ss-*` tokens; see [Theming](#theming). Set `--ss-accent` (and the other `--ss-*` tokens) to restyle every component at once. The per-component tokens still work, and the date picker and the uploader still follow a theme written against the data table's tokens.
- The date picker's month and year selects now use the component's colours in dark mode.
- The data table's page-size control is now the slotsmith autocomplete, so it matches the other components. The data table's bundle includes the autocomplete, and `slotsmith/data-table.css` includes the autocomplete's styles.
- The date picker's footer control now reads "Go to today" and looks like navigation, so it isn't mistaken for a preset.

- **1.5.0** — Locale packs and a `SlotsmithProvider` for translating every component, formatting numbers and plurals, and right-to-left text; see [Languages](#languages). A string `locale` with no registered pack now logs one development-only warning instead of silently staying in English.
- The autocomplete now turns dark with `.dark` or `[data-theme="dark"]` on the page, like the other components, instead of with the system setting.

## Author

Built by **[Tareq Al-Mozayek](https://tareq-mozayek-portfolio.netlify.app/en)** — full-stack developer, frontend-focused, Damascus.
[Portfolio](https://tareq-mozayek-portfolio.netlify.app/en) · [LinkedIn](https://www.linkedin.com/in/tareq-al-mozayek-3ab2603a9/) · [Email](mailto:tareqmozayek@gmail.com)

If it saves you a day of work, a ⭐ on [the repo](https://github.com/tmzm/slotsmith) helps others find it.

## License

ISC
