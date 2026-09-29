# Docs launch 02 — Landing page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The landing page, sections a–h in the brief's order plus the closing section, in English and Arabic, designed as "The Illuminated Assembly" (`docs/DESIGN.md`), with the swap demo as an exploded view and design-system bundles loaded only when asked for.

**Architecture:** The landing is `src/pages/[...lang]/index.astro` on the `Base` layout, built from one Astro component per section in `src/components/landing/`. UI text lives in the message catalog. Every demo and every code block is a sample file (plan 01 Task 7). The swap demo is one island that renders the fallback sample in the prerendered HTML and lazy-loads the shadcn / MUI / Chakra variants. Choreography lives in one module, `src/lib/landing-motion.ts`, dynamically imported after first paint; it drives CSS custom properties (e.g. `--explode` from 0 to 1) and CSS computes the transforms, so the page is complete and correct without it.

**Tech Stack:** plan 01's stack, plus `@mui/material`, `@emotion/react`, `@emotion/styled`, `@chakra-ui/react`, `radix-ui`, `clsx`, `tailwind-merge`, `tailwindcss` + `@tailwindcss/vite` (only for the shadcn adapter's stylesheet), `@tanstack/react-query` (used by later guides; add it here once), `gsap` (ScrollTrigger; landing only, lazy).

**Design:** `docs/DESIGN.md` sections 1, 6 and 7 are part of this plan's requirements. Use the Impeccable skill (`/impeccable craft` per section, `/impeccable polish` at the end) when available.

**Spec:** `docs/superpowers/specs/2026-09-29-docs-launch-site-design.md` (section "Landing")

## Global Constraints

- Hero text is the positioning, verbatim: "Finished data table, combobox, date picker and file uploader for React that drop into shadcn/ui, MUI, Chakra or your own design system. Every part is a slot; what you don't replace still looks finished."
- Section order is fixed: positioning + install → swap demo (exploded view) → two kinds of parts → four components → works with what you have → languages/RTL → AI agents → trust strip → close.
- Bracket meaning is fixed: element parts are labelled `<Name>` in `--ink`, widget parts `{Name}` in `--gold`, everywhere on the page. Kinds come from the generated reference, never typed by hand.
- Motion: GSAP only inside `landing-motion.ts`, loaded with `import()` after `load` (and only when `prefers-reduced-motion` is not `reduce`). No content, control or label may depend on it to be visible or usable. Every directional motion mirrors under `dir="rtl"`. Animate transform, opacity and clip-path only.
- Composition per section follows DESIGN.md section 6. Not allowed: identical card grids, big-number metric rows, eyebrow labels, gradients, glow.
- In the swap demo, the four variants differ only in the `components` prop and its import. Providers (MUI theme, Chakra system, the shadcn scope class) are applied by the island, never in the sample.
- MUI, Chakra, the shadcn bundle, GSAP, TanStack Virtual and locale packs other than `ar` are not in the landing's initial JS. Prefetch a variant on hover, focus or touchstart of its segment only (not on idle: evaluating those bundles on idle adds main-thread work Lighthouse counts).
- Landing initial JS budget: 90 KB gzipped.
- Every demo reserves its height (`Demo height=…` or fixed CSS size per breakpoint); CLS 0.
- Section headings (English): "Swap the design system, keep the table" · "Two kinds of parts" · "Four components" · "Works with what you have" · "Languages and right-to-left" · "Use with AI agents". Arabic equivalents in `messages.ar.ts`.
- Copy: plain, short sentences, no adjectives. Every feature claim links to its live demo.

## Review Focus

- **Clicking a segment while its bundle is still loading, then clicking another** must end on the last choice, with no flash of the earlier one and no React warning.
- **A bundle that fails to load** (offline) must leave the previous variant in place and show a retry message inside the demo box, not a blank box.
- **Keyboard use of the segmented control:** arrow keys move and select, as a radio group; focus stays visible on the gold ring.
- **The Arabic landing (`/ar/`):** the swap demo, cards and trust strip render RTL with Arabic labels, and the languages demo still toggles en / ar / fa.
- **Theme switch while MUI or Chakra is showing** must restyle or at least stay legible in both themes (their providers read the site theme at mount and on change).
- **Reduced motion, or GSAP failing to load:** the swap section shows the table and the static labelled diagram side by side, unpinned, and every control works; nothing is left mid-explosion or invisible.
- **The poster-scale hero names at 360px, in Arabic:** no overflow; Latin names keep Big Shoulders inside the Arabic heading.

---

### Task 1: Tabs, install command and hero

**Files:**
- Create: `docs/src/components/Tabs.astro`, `docs/src/components/landing/Hero.astro`, samples `docs/samples/install/{npm,pnpm,yarn,bun}.sh`
- Modify: `docs/src/i18n/messages.{en,ar}.ts`, `docs/src/pages/[...lang]/index.astro`
- Test: `docs/src/components/__tests__/tabs-markup.test.ts`

**Interfaces:**
- `Tabs.astro` props `{ id: string; tabs: { label: string; sample: string }[]; remember?: string }`: a `role="tablist"` of buttons and `role="tabpanel"` panels rendered by `SampleCode`; one small inline script handles arrow keys and clicks and, when `remember` is set, stores the choice under `localStorage["slotsmith-tab-" + remember]` (try/catch) so the package-manager choice carries across pages. Without JS, all panels are visible stacked.
- Produces: `Hero.astro` props `{ lang: Lang }`.

- [ ] **Step 1: Write the failing tests.** Render `Tabs.astro` with Astro's container API (`experimental_AstroContainer`) and assert: one `tablist`, `aria-controls` of each tab matches a panel `id`, the first tab has `aria-selected="true"`, panels contain the four install commands (`npm i slotsmith`, `pnpm add slotsmith`, `yarn add slotsmith`, `bun add slotsmith`). Render `Hero.astro` (en) and assert: exactly one `<h1>`; its whitespace-normalised `textContent` equals the positioning's first sentence; it contains four `.display` spans with the component names; the second sentence is in the paragraph after it.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** per DESIGN.md section 6 item 1. Hero: the first positioning sentence as the page's only `<h1>`, with "data table", "combobox", "date picker", "file uploader" wrapped in stacked `.display` spans at poster scale (`clamp()` max 6rem) and the rest of the sentence in Geist; the second sentence as the lede; the install tabs (`remember="pm"`); links "Get started" → `/getting-started/` and "GitHub" → `SITE.repo`. Mark the hero's panels `data-panel` for the first-load wave (Task 6). Replace the plan-01 smoke demo on the landing.
- [ ] **Step 4: Run** test → PASS; `pnpm --filter slotsmith-docs build` → exits 0.
- [ ] **Step 5: Commit** `feat: add the landing hero and install tabs`

### Task 2: Data-table adapters and swap samples

**Files:**
- Create: `docs/samples/shared/people.ts` (12 rows, columns name / role / team / status / joined), `docs/samples/adapters/data-table/{shadcn,mui,chakra}.tsx`, `docs/samples/adapters/shadcn.css`, `docs/samples/adapters/providers.tsx`, `docs/samples/landing/swap-{fallback,shadcn,mui,chakra}.tsx`
- Modify: `docs/astro.config.ts` (add `@tailwindcss/vite`), `docs/src/components/Demo.astro` (shared-file tabs)
- Test: `docs/samples/__tests__/swap-samples.test.tsx`

**Interfaces:**
- `adapters/data-table/<lib>.tsx`: named export `<lib>Components: Partial<DataTableComponents<any>>` (`shadcnComponents`, `muiComponents`, `chakraComponents`), copied from the library's tested adapters in `src/data-table/__tests__/integrations/<lib>/components.tsx` and adjusted only to compile standalone. The shadcn file imports `./shadcn.css`.
- `adapters/shadcn.css`: `@import "tailwindcss/theme.css" layer(theme); @import "tailwindcss/utilities.css" layer(utilities); @source "./";` (no preflight), plus shadcn's CSS variables scoped under `.shadcn-scope` for light and `[data-theme="dark"] .shadcn-scope` for dark.
- `adapters/providers.tsx`: `export const PROVIDERS: Record<"shadcn" | "mui" | "chakra", ComponentType<{ children: ReactNode; theme: "dark" | "light"; dir: "ltr" | "rtl" }>>` — shadcn: `<div className="shadcn-scope">`; MUI: `ThemeProvider` with `createTheme({ palette: { mode: theme }, direction: dir })`; Chakra: `ChakraProvider value={defaultSystem}` inside a wrapper whose `className` is `"dark"` when dark. Loaded lazily by the swap demo only.
- `landing/swap-<x>.tsx`: default export `<DataTable data={people} columns={columns} … />`; the four files are identical except for the adapter import line and the `components={…}` line (the fallback file has neither).
- Demo shared-file tabs: when a sample's source imports `../shared/<file>`, `Demo` shows that file as a second code tab. Quick-start samples must not import from `shared/` (checked in plan 03).

- [ ] **Step 1: Write the failing test** (jsdom): renders each `swap-*` default export (MUI and Chakra inside their `PROVIDERS` entry) and asserts 12 body rows, no console errors (spy), and for MUI that a `.MuiTableRow-root` exists; asserts the four sources differ from `swap-fallback` in at most two lines (use `diffLines` from Task 3 once it exists; until then compare line sets).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** test → PASS; `pnpm --filter slotsmith-docs check` → no errors.
- [ ] **Step 5: Commit** `feat: add the data-table adapters and swap samples`

### Task 3: Swap demo island

**Files:**
- Create: `docs/src/islands/SwapDemo.tsx`, `docs/src/islands/ExplodedView.tsx`, `docs/src/lib/diff.ts`, `docs/src/lib/explode.ts`, `docs/src/components/landing/Swap.astro`, `docs/src/styles/explode.css`
- Test: `docs/src/lib/__tests__/diff.test.ts`, `docs/src/lib/__tests__/explode.test.ts`, `docs/src/islands/__tests__/SwapDemo.test.tsx`

**Interfaces:**
- Produces from `@/lib/diff`: `export function diffLines(base: string, next: string): { added: number[]; removed: number[] }` — 1-based line numbers in `next` / `base`, from a longest-common-subsequence over lines.
- Produces from `@/lib/explode`:
  ```ts
  export interface ExplodePart { slot: string; kind: "element" | "widget"; selector: string; dx: number; dy: number } // offsets in rem at --explode: 1
  export function explodeParts(reference: ComponentReference, selectors: Record<string, string>, pick: string[]): ExplodePart[]; // kinds from the reference, selectors from SLOT_SELECTORS; throws on a slot name not in the reference
  export function bracketLabel(part: Pick<ExplodePart, "slot" | "kind">): string; // element → "<Row>", widget → "{Checkbox}"
  ```
  The landing picks: `HeaderRow`, `HeaderCell`, `SortIcon`, `Row`, `Cell`, `Checkbox`, `Pagination`, `PageSizeSelect` (offsets chosen so parts separate vertically into layers, the checkbox column slides toward the start side, pagination drops below; mirrored in RTL by negating `dx`).
- `ExplodedView.tsx` props `{ parts: ExplodePart[]; children: ReactNode }`: wraps the table; after mount, sets `--dx`/`--dy` on each matched element and renders absolutely positioned labels (`bracketLabel`, element in `--ink`, widget in `--gold`, JetBrains Mono) with hairline leaders. `explode.css` computes `transform: translate(calc(var(--explode, 0) * var(--dx) * 1rem), calc(var(--explode, 0) * var(--dy) * 1rem))` and label `opacity: var(--explode, 0)`. Without JS or under reduced motion, `data-static` shows the labelled diagram as a separate static figure beside the table (a prerendered SVG/HTML list of the same labels), and `--explode` stays 0.
- The swap's Fallback variant renders with `Demo`'s `stock` behaviour (no `site-demo` token mapping), so it shows exactly what the library ships; the three adapters render inside their providers.
- `SwapDemo.tsx` props:
  ```ts
  { lang: Lang; sources: Record<Variant, string>; loaders?: Partial<Record<Exclude<Variant, "fallback">, () => Promise<{ default: ComponentType }>>> } // type Variant = "fallback" | "shadcn" | "mui" | "chakra"
  ```
  `loaders` defaults to `() => import("@samples/landing/swap-<x>")` (plus `PROVIDERS` import); tests inject their own. The fallback sample is imported statically, so it is in the prerendered HTML.
  - Segmented control: `role="radiogroup"`, four `role="radio"` buttons, roving tabindex, arrow keys select.
  - State machine: `current` (shown) and `requested`; a load resolves into `current` only if it is still `requested`. Failure keeps `current` and shows `t(lang, "swap.failed")` with a retry button.
  - Prefetch: call the loader on `pointerenter`, `focus`, `touchstart` of a segment; cache the promise.
  - Code panel: shows `sources[current]` highlighted, with `diffLines(sources.fallback, sources[current]).added` lines marked (`<mark>`-style class, plus an sr-only "changed line").
  - The demo box has fixed height (CSS: 26rem mobile, 30rem ≥ 768px); the table scrolls inside it.
  - Theme: reads `document.documentElement.dataset.theme` in an effect and on a `MutationObserver`; passes it to the provider.
- `Swap.astro` props `{ lang }`: reads the four sources with `sampleSource()` and renders `<SwapDemo client:idle … />` (its table wrapped in `ExplodedView`) with the section heading and one sentence: "The same table in four design systems. Only the `components` prop changes." The section is `data-motion="swap"`; Task 6 pins it and drives `--explode`.
- `SwapDemo` exposes `onBeforeSwap` / `onAfterSwap` hooks via a `swap:before` / `swap:after` DOM `CustomEvent` on its root, so `landing-motion.ts` can play explode–swap–reassemble around a switch (≤ 700ms total) without the island importing GSAP.

- [ ] **Step 1: Write the failing tests.** `diffLines("a\nb\nc", "a\nx\nc")` → `{ added: [2], removed: [2] }`; identical → both empty. `explodeParts` with the data-table reference: `Row` has `kind: "element"`, `Checkbox` has `kind: "widget"`; an unknown slot throws; `bracketLabel` gives `"<Row>"` and `"{Checkbox}"`. SwapDemo (jsdom, injected loaders): initial render shows the fallback table and `aria-checked="true"` on "Fallback"; clicking "MUI" then "Chakra" before the MUI loader resolves ends with Chakra shown and MUI never shown; a rejecting loader leaves the fallback visible and shows the retry text; ArrowRight on the focused radio moves selection; hovering "shadcn" calls its loader once, and hovering again does not call it again.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** tests → PASS. `build`, then in Playwright or a browser with the network panel: on first load of `/`, no chunk containing `@mui` or `@chakra-ui` code is requested; clicking MUI requests it and shows the MUI table; `verify-site` passes.
- [ ] **Step 5: Commit** `feat: add the swap demo to the landing page`

### Task 4: Two kinds of parts, and the four components

**Files:**
- Create: `docs/src/components/landing/Parts.astro`, `docs/src/components/landing/Cards.astro`, samples `docs/samples/landing/element-part.tsx`, `docs/samples/landing/widget-part.tsx`, `docs/samples/landing/card-{data-table,autocomplete,date-picker,file-uploader}.tsx`
- Test: `docs/samples/__tests__/landing-cards.test.tsx`

**Interfaces:**
- `Parts.astro`: two columns framed by giant display glyphs (`<` `>` around the element column in `--ink`, `{` `}` around the widget column in `--gold`, decorative, `aria-hidden`), each with one sample (`SampleCode`, not rendered); below, the README's element/widget table (three columns: kind, what it receives, drop-in for), with the rows' text in the catalog. Link to `/guides/`.
- `element-part.tsx`: an element part replaced by a plain library primitive (e.g. `Row: TableRow` from MUI, props passed through unchanged). `widget-part.tsx`: a `Checkbox` widget adapter mapping `checked` / `onCheckedChange` / `indeterminate` to a library checkbox.
- `Cards.astro`: an asymmetric panel mosaic (CSS grid; ≥ 1024px the data table spans two columns and two rows, the other three vary in size; one column on mobile), each panel with the component name in display type, `t(lang, meta.summary)`, a `Demo` of `card-<slug>` (`height` fixed per panel, `fallback`, no code shown: add `showCode?: boolean` default `true` to `Demo`), and a link to `/components/<slug>/` covering the panel. Panel borders turn gold on hover and `:focus-within`. Mark panels `data-panel`.
- Card samples are small: table 4 rows no pagination; autocomplete closed with a value; date picker range with a value; uploader dropzone empty.

- [ ] **Step 1: Write the failing test:** each card sample renders without console errors, and its root has the component's class prefix (`sdt`, `sac`, `sdp`, `sfu`).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Note: `Demo` with `showCode={false}` still carries `data-sample`, so the unused-sample check stays meaningful.
- [ ] **Step 4: Run** test → PASS; `build` → `verify-site` passes (axe runs on the four cards).
- [ ] **Step 5: Commit** `feat: add the parts explainer and component cards to the landing`

### Task 5: Works with, languages, AI agents, trust manifest

**Files:**
- Create: `docs/src/components/landing/{WorksWith,Languages,Agents,TrustStrip}.astro`, `docs/src/components/logos/{shadcn,mui,chakra,tailwind,tanstack}.svg` (monochrome, `currentColor`), samples `docs/samples/landing/languages.tsx`, `docs/samples/ai/{claude-code.sh,cursor.json,vscode.json}`, `docs/scripts/facts.ts`, `docs/src/lib/facts.ts`
- Modify: `docs/package.json` (`build` runs `facts.ts` after `reference.ts`)
- Test: `docs/scripts/__tests__/facts.test.ts`, `docs/samples/__tests__/languages.test.tsx`

**Interfaces:**
- `WorksWith.astro` links: shadcn, MUI, Chakra → `/components/data-table/adapters/#shadcn|#mui|#chakra`; Tailwind → `/theming/#tailwind`; TanStack Table → `/components/data-table/`; TanStack Query → `/components/data-table/guides/server-data/`. Make the anchors exist now so the link checker passes: the `adapters.astro` template renders `<h2 id="shadcn">`, `<h2 id="mui">`, `<h2 id="chakra">` (content comes in plan 03), and the theming stub MDX gets a `## Tailwind` heading (slug `tailwind`). Layout: a slow CSS marquee (`@keyframes` translate, logical direction, list duplicated with `aria-hidden` on the copy for the loop), paused on hover and `:focus-within`, static wrapped row under reduced motion.
- `landing/languages.tsx`: a 6-row `DataTable` with a three-button toggle (English / العربية / فارسی) that sets `SlotsmithProvider` `locale` to `"en-US"`, `"ar"`, `"fa"` with `locales={[ar, fa]}` and wraps the table in `dir` from `useSlotsmithLocale()`. Pagination labels and page info change language; direction flips. The sample stays standalone; `Languages.astro` adds an inline script that, on the first click of a non-English toggle inside the figure, loads the Noto Sans Arabic subset with `document.fonts.load` (URL from a `?url` import), so the English landing downloads no Arabic font until asked. `landing-motion.ts` (Task 6) plays a short sweep in the new reading direction when the demo's `dir` changes (MutationObserver).
- `Agents.astro`: `Tabs` over the three AI samples. `claude-code.sh` is `claude mcp add slotsmith -- npx -y slotsmith-ai mcp`; `cursor.json` and `vscode.json` copied from the library README's "Use with AI agents" section (VS Code uses the `servers` key). Link to `/ai-tools/`.
- Produces from `scripts/facts.ts`: `export interface Facts { version: string; license: string; react: string; testFiles: number; tests: number; integrationSuites: { component: string; library: string }[]; bundle: { entry: string; minBytes: number; gzipBytes: number }[] }` and `export function buildFacts(opts?: { skipTests?: boolean }): Promise<Facts>`; writes `docs/src/generated/facts.json`.
  - `tests` / `testFiles` from `vitest run --reporter=json` at the repo root (`numTotalTests`, `testResults.length`); with `FACTS_SKIP_TESTS=1`, reuse the previous `facts.json` counts or, if none, 0 (dev only; CI never sets it).
  - `integrationSuites` from `src/*/__tests__/integrations/*.test.tsx` file names.
  - `bundle`: esbuild-bundle each package entry from `../dist` (`slotsmith`, `slotsmith/data-table`, `slotsmith/autocomplete`, `slotsmith/date-picker`, `slotsmith/file-uploader`) with `react`, `react-dom`, `@tanstack/*`, `@floating-ui/*` external, minified; gzip with `node:zlib`.
  - `version`, `license` from the root `package.json`; `react` from its `peerDependencies.react`.
- Produces from `@/lib/facts`: `export function getFacts(): Facts` (imports the JSON; throws with a "run the facts script" message when missing).
- Produces from `@/lib/facts`: `export function manifestLine(facts: Facts): { key: string; value: string; href: string }[]` — in order `tests` (`String(facts.tests)`), `suites` (`String(facts.integrationSuites.length)`), `gzip` (DataTable entry, `"<n.n> KB"`, quoted), `license` (quoted), `react` (the peer range, quoted) — each `href` a `/trust/` anchor.
- `TrustStrip.astro`: renders `manifestLine` as one mono line styled like a `package.json` excerpt, `{ tests: 1289, suites: 12, gzip: "18.4 KB", license: "ISC", react: ">=18" }` (values from facts), keys in `--muted`, values in `--ink`, braces in `--gold`, each pair a link; wraps at key boundaries on mobile. Never a row of big numbers with small labels.

- [ ] **Step 1: Write the failing tests.** Facts (with `skipTests: true`): `version` equals the root `package.json` version; `integrationSuites` includes `{ component: "data-table", library: "mui" }`; `bundle` has 5 entries with `gzipBytes < minBytes`. `manifestLine(fixture)` keys are exactly `["tests", "suites", "gzip", "license", "react"]` and `gzip` matches `/^"\d+\.\d KB"$/`. Languages sample (jsdom): clicking "العربية" sets `dir="rtl"` on the wrapper and changes the "rows per page" label to the Arabic pack's `table.rowsPerPage`; "فارسی" keeps `rtl` and shows the Persian label.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** tests → PASS; `pnpm build` (library) then `pnpm --filter slotsmith-docs build` → passes; the landing shows the eight sections in order in both languages.
- [ ] **Step 5: Commit** `feat: add works-with, languages, agents and the trust manifest to the landing`

### Task 6: Close section and landing motion

**Files:**
- Create: `docs/src/components/landing/Close.astro`, `docs/src/lib/landing-motion.ts`, `docs/src/lib/wave.ts`, `docs/src/components/landing/MotionLoader.astro`
- Test: `docs/src/lib/__tests__/wave.test.ts`, `docs/src/lib/__tests__/landing-motion.test.ts`

**Interfaces:**
- `Close.astro`: the one drenched section: `--gold` background, `npm i slotsmith` at display scale in `--on-gold` with a copy button, links to Getting started and GitHub (contrast checked: `--on-gold` on `--gold` ≥ 4.5:1).
- Produces from `@/lib/wave`: `export function waveOrder(rects: { top: number; left: number; right: number }[], viewportWidth: number, rtl: boolean): number[]` — indices sorted by `x + top * 1.4`, where `x` is `left` (LTR) or `viewportWidth - right` (RTL), as in the portfolio's `components/boot.tsx`.
- Produces from `@/lib/landing-motion`: `export async function startLandingMotion(root: Document, opts: { reducedMotion: boolean; rtl: boolean }): Promise<() => void>` — returns a cleanup; with `reducedMotion: true` returns a no-op without importing GSAP. Otherwise imports `gsap` and `gsap/ScrollTrigger` and sets up:
  1. **First-load wave** (once per session, `sessionStorage["slotsmith-boot"]`, try/catch): above-the-fold `[data-panel]` elements rise from `clipPath: inset(0 0 100% 0)` with `y: 18` in `waveOrder`, borders flashing `--gold` as they land, 0.62s each, staggered. Panels are visible in the HTML; the wave only runs from an explicit `from` state set in the same frame.
  2. **Exploded view**: pins `[data-motion="swap"]` for about one viewport of scroll and tweens its `--explode` 0 → 1 → 0 with `scrub`; listens for `swap:after` and plays `--explode` 0 → 0.6 → 0 over ≤ 700ms.
  3. **Languages sweep**: on the languages demo's `dir` change, a 280ms clip-path sweep in the new reading direction.
- `MotionLoader.astro`: an inline script that, after `window.load`, checks `matchMedia("(prefers-reduced-motion: reduce)")` and `document.documentElement.dir`, then `import()`s `landing-motion.ts` and calls `startLandingMotion`. Included on the landing only.

- [ ] **Step 1: Write the failing tests.** `waveOrder` for two rects at the same `top`: LTR puts the smaller `left` first; RTL puts the larger `right` first. `startLandingMotion(document, { reducedMotion: true, rtl: false })` resolves without importing `gsap` (mock the module and assert it was not loaded).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** tests → PASS; `build`; in Playwright: cold load of `/` requests no `gsap` chunk before `load`; with `reducedMotion: "reduce"` emulated, no `gsap` chunk at all and the static diagram is visible; screenshot the landing at 360px and 1440px, en and ar, dark and light, and check against DESIGN.md section 6 (run `/impeccable polish` on the landing if available).
- [ ] **Step 5: Commit** `feat: add the landing close and choreography`

## Final verification for plan 02

- `/` and `/ar/` render sections a–h and the close, in order; the swap demo switches all four variants and plays the exploded view; the languages demo flips direction live.
- Network panel on a cold load of `/`: no MUI, Chakra, shadcn-CSS, GSAP, TanStack Virtual chunk before interaction or `load`; total initial JS ≤ 90 KB gzipped (sum the `script`/`modulepreload` files referenced by `dist/index.html`, gzipped).
- With reduced motion emulated and with JS disabled, every section is visible and readable, and the swap section shows its static labelled diagram.
- `verify-site` passes: no console errors, axe clean on fallback demos, no dead links.
