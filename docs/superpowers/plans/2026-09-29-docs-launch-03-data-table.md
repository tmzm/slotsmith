# Docs launch 03 — Component template and the data table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A component page template (overview, guides, API, adapters) driven by generated reference data, and the complete data-table docs on it.

**Architecture:** The four templates from plan 01 (`components/[component]/index.astro`, `guides/[guide].astro`, `api.astro`, `adapters.astro`) become generic. Generated tables come from `getReference(slug)`. Hand-written prose lives in MDX under `src/content/docs/en/components/<slug>/`, which receives the template's building blocks (`<Install />`, `<QuickStart />`, `<GuideList />`, `<Demo />`) through the MDX `components` map. Plan 04 fills the other three components without touching the templates.

**Tech Stack:** plan 01–02 stack.

**Spec:** `docs/superpowers/specs/2026-09-29-docs-launch-site-design.md` (sections "Component pages", "Generated reference")

## Global Constraints

- The overview page lists the brief's template in this order: Overview + live demo → Install → Quick start → Guides → Reference (Slots, Props, Labels & locales, Styling — links to `/api/`) → Adapters → Accessibility → Limitations.
- Props, Slots, Labels and Styling tables come only from `getReference()`. No hand-written prop, slot or label names in `.astro` or `.mdx` files outside prose sentences.
- Slots table columns, in order: Name · Kind (element / widget) · Props it receives · Default fallback (collapsed source) · `data-*` attributes. The Kind cell shows `<element>` in `--ink` or `{widget}` in `--gold` (JetBrains Mono), matching the landing's bracket meaning.
- Visual treatment follows `docs/DESIGN.md` section 5: pages open with `PageHeader` (meta row `{entry} slotsmith/<c>`, `{css} slotsmith/<c>.css`), reference tables are dense hairline tables with `--panel-2` row hover and a sticky header, limitations and warnings use `Note` (`{ limitation }`, `{ warning }`), demos are panels. CSS-only motion on docs pages.
- Quick-start samples are standalone: data inline, imports only from `slotsmith…`, `react` and the component's peers. No `../shared/` imports.
- Every guide has at least one live `Demo` and shows its complete code.
- Data-table limitations, exactly: `VirtualDataTable` ignores row reorder; a drop while sorted reorders `data` but the view stays sorted; no dragging between tables, no multi-row drag, no moving a row to another parent; a custom `Row` slot must keep a stable identity.
- Port demos from the old site (`E:\Projects\Personal\react-data-table-docs\src\components\{Recipes,ReorderDemos,Skins,MuiExample}.tsx`, `src\pages\DataTablePage.tsx`) as samples; fix the audit's broken samples on the way (see plan 00, "samples that did not compile").

## Review Focus

- **A prop whose type is a long union or function signature** must wrap inside its table cell on a 360px screen without horizontal page scroll (the table itself may scroll inside its wrapper).
- **A slot with no data attributes** shows "—", not an empty cell; a slot whose fallback source is long is collapsed by default.
- **A label whose default is a function** (e.g. `pageInfo`) shows its signature and an example output, not `[Function]`.
- **The `/ar/` data-table pages:** tables stay LTR for code cells (`dir="ltr"` on code), prose around them RTL.
- **A guide demo that errors at runtime** must fail `verify-site` (console error), never ship a broken demo silently.

---

### Task 1: Reference table components

**Files:**
- Create: `docs/src/components/reference/{SlotTable,PropTable,LabelTable,StylingTable}.astro`, `docs/src/lib/format.ts`
- Test: `docs/src/lib/__tests__/format.test.ts`, `docs/src/components/reference/__tests__/tables.test.ts`

**Interfaces:**
- Consumes: `getReference(slug)` / `ComponentReference` (plan 01 Task 6).
- Produces from `@/lib/format`:
  ```ts
  export function formatDefault(raw: string | undefined): string;   // undefined → "—"; "\"Retry\"" → "\"Retry\""; keeps code as-is
  export function isFunctionType(type: string): boolean;            // "(page: number) => string" → true
  export function groupProps<T extends { group?: string }>(props: T[], order: string[]): { group: string; props: T[] }[]; // groups in `order` (the reference's `groups`), ungrouped last as "Other"
  ```
- `SlotTable.astro` props `{ slug: ComponentSlug }`: one row per slot, columns per Global Constraints; props listed as `name: type` with description on hover-free second line; fallback in `<details><summary>Fallback source</summary><Code … /></details>`; row `id="slot-<name>"`.
- `PropTable.astro` props `{ slug }`: grouped by `groupProps`, columns Name · Type · Default · Description; required props marked; one final line naming the root element whose DOM props are also accepted (`rootElement`).
- `LabelTable.astro` props `{ slug }`: Key · Type · English default · Description; function labels show their signature.
- `StylingTable.astro` props `{ slug }`: class names (from the reference's classes) and tokens (`tokens`), plus the dark-mode note (tokens switch under `.dark, [data-theme="dark"]`).

- [ ] **Step 1: Write the failing tests.** Format: the three examples above; `groupProps` keeps reference order and puts ungrouped last. Tables (Astro container API, data-table): `SlotTable` renders 22 rows and a row `#slot-FooterRow`; `Row` row lists `data-state`, `data-row-id`, `data-depth`, `data-expanded`, `data-clickable` (from generator ∪ `data-attributes.json` — add the missing ones to the JSON now); `PropTable` has a group heading "Row reordering"; `LabelTable` has a `retry` row with `"Retry"`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Wrap each table in a horizontally scrollable, focusable region (`tabindex="0"`, `role="region"`, `aria-label`) so axe's scrollable-region rule passes.
- [ ] **Step 4: Run** tests → PASS.
- [ ] **Step 5: Commit** `feat: add generated slot, prop, label and styling tables`

### Task 2: Generic API and adapters templates

**Files:**
- Modify: `docs/src/pages/[...lang]/components/[component]/api.astro`, `…/adapters.astro`, `docs/src/islands/SampleIsland.tsx`
- Create: `docs/src/components/reference/InstallBlock.astro`
- Test: `docs/src/components/reference/__tests__/install.test.ts`

**Interfaces:**
- `api.astro`: sections `#slots`, `#props`, `#labels`, `#styling` in that order, each an `<h2>` + one-paragraph lead from the catalog + the table. `#labels` also shows how to pass `labels` and `locale` (sample `<slug>/labels.tsx`, rendered) and links to `/languages/`.
- `adapters.astro`: `<h2 id="shadcn">`, `#mui`, `#chakra`; under each, `SampleCode` of `adapters/<slug>/<lib>.tsx` (the full adapter) and a `Demo` of `adapters/<slug>/<lib>-demo.tsx` with `provider="<lib>"`.
- `SampleIsland` gains `provider?: "shadcn" | "mui" | "chakra"`: lazy-loads `PROVIDERS[provider]` (plan 02) and wraps the sample; `Demo` passes it through.
- `InstallBlock.astro` props `{ slug }`: the install `Tabs` (`remember="pm"`) with `slotsmith` plus the reference's `requiredPeers`; a line naming `optionalPeers` and what needs them (virtual variants need `@tanstack/react-virtual`); the CSS import line (`import "slotsmith/<slug>.css"` or `slotsmith/styles.css`) from the reference's `css`. These commands are built from reference data, so render them with `<Code>` directly rather than as sample files (`check-snippets` covers MDX only, and shell commands are not type-checked).

- [ ] **Step 1: Write the failing test:** `InstallBlock` for `data-table` contains `npm i slotsmith @tanstack/react-table` and `import "slotsmith/data-table.css"`; for `autocomplete` contains `npm i slotsmith` with no TanStack package, and a line mentioning `@tanstack/react-virtual` for `VirtualAutocomplete`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Copy `src/data-table/__tests__/integrations/{shadcn,mui,chakra}/components.tsx` into `docs/samples/adapters/data-table/` only if Task 2 of plan 02 did not already; write the three `-demo.tsx` samples (the same 12-row table as the swap demo, with selection and sorting on, so checkbox and sort widgets show).
- [ ] **Step 4: Run** test → PASS; `build` → `/components/data-table/api/` and `/adapters/` pass `verify-site`.
- [ ] **Step 5: Commit** `feat: add the component API and adapters pages`

### Task 3: Overview template and data-table overview

**Files:**
- Modify: `docs/src/pages/[...lang]/components/[component]/index.astro`
- Create: `docs/src/components/reference/{QuickStart,GuideList,KeyboardTable}.astro`, `docs/src/content/docs/en/components/data-table/index.mdx`, samples `docs/samples/data-table/{overview,quick-start,labels}.tsx`, `docs/scripts/check-structure.ts`
- Modify: `docs/package.json` (`check` runs `check-structure.ts`)
- Test: `docs/scripts/__tests__/check-structure.test.ts`

**Interfaces:**
- The overview template renders the MDX `index.mdx` with components `{ Install: InstallBlock, QuickStart, GuideList, Reference, Demo, KeyboardTable }` bound to the current `slug` and `lang`.
- `QuickStart.astro` props `{ slug }`: `Demo` of `<slug>/quick-start` with `fallback`.
- `GuideList.astro` props `{ slug }`: list of `COMPONENTS[slug].guides` with each guide's frontmatter description.
- `Reference` (inline in the template): four links to `/api/#slots`, `#props`, `#labels`, `#styling`, and one to `/adapters/`.
- `KeyboardTable.astro` props `{ rows: { keys: string[]; action: string }[] }`: `<kbd>` per key.
- Produces from `scripts/check-structure.ts`:
  ```ts
  export const OVERVIEW_HEADINGS = ["Overview", "Install", "Quick start", "Guides", "Reference", "Adapters", "Accessibility", "Limitations"] as const;
  export function findStructureProblems(file: string, mdx: string): string[]; // overview MDX: h2s must equal OVERVIEW_HEADINGS in order; guide MDX: at least one <Demo; quick-start sample: no "../shared/" import
  ```
- Data-table accessibility content (in `index.mdx`), from the library source (`core/useRowReorder.ts`, fallbacks): sort triggers are buttons with `aria-sort` on headers; shift-click multi-sort; reorder keys Space/Enter lift, ArrowUp/ArrowDown move, Space/Enter drop, Escape cancel, and Tab behaviour as coded; the live region (`role="status"`) and `aria-describedby` instructions; `role="alert"` on the error state; the labels that feed announcements (`reorderLifted`, `reorderMoved`, `reorderDropped`, `reorderCancelled`).

- [ ] **Step 1: Write the failing tests:** an overview MDX missing "Adapters" → one problem naming it; headings out of order → one problem; a guide MDX with no `<Demo` → problem; a quick-start sample importing `../shared/people` → problem.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** the template, blocks and the data-table overview MDX (Overview paragraph ≤ 60 words + `Demo` of `data-table/overview`, then the rest in order; Limitations exactly as in Global Constraints, each linking to the guide it concerns).
- [ ] **Step 4: Run** tests and `check` → PASS; `build` → `verify-site` passes; `/components/data-table/` no longer has `data-stub`.
- [ ] **Step 5: Commit** `feat: add the component overview template and the data-table overview`

### Task 4: Data-table guides — sorting and selection, pagination, server data, footers

**Files:**
- Create: `docs/src/content/docs/en/components/data-table/guides/{sorting-and-selection,pagination,server-data,footers}.mdx`, samples `docs/samples/data-table/{sorting-and-selection,pagination,server-data,footers}.tsx`, `docs/samples/shared/fake-api.ts`
- Test: `docs/samples/__tests__/data-table-guides-a.test.tsx`

**Interfaces:**
- `shared/fake-api.ts`: `export function fetchPeople(params: { pageIndex: number; pageSize: number; sorting: { id: string; desc: boolean }[] }): Promise<{ rows: Person[]; total: number }>` with a 300 ms delay and deterministic data (no `Math.random`, no `Date.now` in output).
- `server-data.tsx` uses `@tanstack/react-query` (`useQuery` with `placeholderData: keepPreviousData`), manual pagination and sorting, and shows loading via the table's status.
- Each guide: one-sentence lead, the `Demo`, then short sections explaining the props used, each prop name linking to `/components/data-table/api/#props` (or the slot to `#slot-<Name>`).

- [ ] **Step 1: Write the failing test** (jsdom): sorting sample — clicking a header button sets `aria-sort="ascending"`; pagination sample — "next page" moves `pageInfo` text; server-data — renders the loading status, then rows after the fake API resolves (fake timers); footers — renders a `tfoot` row with a total.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** samples and MDX.
- [ ] **Step 4: Run** test, `check`, `build` → PASS.
- [ ] **Step 5: Commit** `docs: add the data-table sorting, pagination, server-data and footer guides`

### Task 5: Data-table guides — tree rows, virtual rows, row reorder, headless hook

**Files:**
- Create: `docs/src/content/docs/en/components/data-table/guides/{tree-rows,virtual-rows,row-reorder,headless-hook}.mdx`, samples `docs/samples/data-table/{tree-rows,virtual-rows,row-reorder,row-reorder-tree,headless-hook}.tsx`
- Test: `docs/samples/__tests__/data-table-guides-b.test.tsx`

**Interfaces:**
- `virtual-rows.tsx`: `VirtualDataTable` from `slotsmith/virtual` with 10,000 generated rows (deterministic), `maxHeight` set; the MDX states it ignores row reorder.
- `row-reorder.tsx` / `row-reorder-tree.tsx`: ported from the old `ReorderDemos.tsx`; the MDX covers keyboard reordering, the drag-handle slot, `data-dragging` / `data-drop-position` styling, labels, the sorted-view limitation and stable `Row` identity.
- `headless-hook.tsx`: `useDataTable` rendering its own markup, using `reorder.getRowProps` / `getHandleProps` / `instructionsId` / `announcement` (exist in the library, per the audit).

- [ ] **Step 1: Write the failing test** (jsdom): tree — expanding a row shows its children with `data-depth="1"`; row-reorder — focusing the handle and pressing Space, ArrowDown, Space moves row 1 below row 2 and the live region announces the drop; headless-hook — renders a `<table>` without `sdt__` classes and with the rows.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** samples and MDX.
- [ ] **Step 4: Run** test, `check`, `build` → PASS; all eight data-table guide pages have no `data-stub`.
- [ ] **Step 5: Commit** `docs: add the data-table tree, virtual, reorder and headless guides`

## Final verification for plan 03

- `/components/data-table/`, its 8 guides, `/api/` and `/adapters/` exist in both languages with no stub marker.
- The slots table shows 22 slots, and `verify-site`'s data-attribute check passes against every rendered data-table demo.
- `check` passes (types, snippets, structure); `verify-site` passes.
