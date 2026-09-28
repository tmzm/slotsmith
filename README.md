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
import "slotsmith/data-table.css";
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

## Components

| Component | Status | Docs |
| --- | --- | --- |
| **Data table** | ✅ shipping | [Docs](https://slotsmith-docs.netlify.app/#/docs/data-table) · sorting, pagination, selection that survives server pages, tree rows, virtual rows, loading / error / empty states, i18n and RTL |
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
import { SlotsmithProvider } from "slotsmith/locale";
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
the other three. A test in the suite bundles the real output and fails if any of it leaks
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

`slotsmith/locale` (the provider and `defineLocale`) and `slotsmith/locales/<code>` (one
entry per pack, e.g. `slotsmith/locales/ar`) are separate entries too, so importing a
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
5. **Pay only for what you import.** Components are independent and tree-shake cleanly, so a project that uses one of them ships one of them.

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

- **1.5.0** — Locale packs and a `SlotsmithProvider` for translating every component, formatting numbers and plurals, and right-to-left text; see [Languages](#languages). A string `locale` with no registered pack now logs one development-only warning instead of silently staying in English.
- The autocomplete now turns dark with `.dark` or `[data-theme="dark"]` on the page, like the other components, instead of with the system setting.

## Author

Built by **[Tareq Al-Mozayek](https://tareq-mozayek-portfolio.netlify.app/en)** — full-stack developer, frontend-focused, Damascus.
[Portfolio](https://tareq-mozayek-portfolio.netlify.app/en) · [LinkedIn](https://www.linkedin.com/in/tareq-al-mozayek-3ab2603a9/) · [Email](mailto:tareqmozayek@gmail.com)

If it saves you a day of work, a ⭐ on [the repo](https://github.com/tmzm/slotsmith) helps others find it.

## License

ISC
