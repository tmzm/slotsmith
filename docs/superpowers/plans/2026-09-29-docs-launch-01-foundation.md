# Docs launch 01 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A prerendered Astro site in `docs/` with real path URLs in English and Arabic, the shared layout, redirects from the old hash URLs, the sample pipeline, generated reference data, a post-build verifier and CI, with every page of the site map present (as a stub where later plans fill it).

**Architecture:** `docs/` is a pnpm workspace package. It aliases `slotsmith…` imports to `../src`, so pages always show the current source. Pages are Astro templates under `src/pages/[...lang]/`, prose is MDX in a content collection, demos are React islands loaded through one `SampleIsland`. Scripts in `docs/scripts/` run before the build (reference data) and after it (verification against `dist/`).

**Tech Stack:** Astro (latest major) + `@astrojs/react` + `@astrojs/mdx`, React 19, TypeScript 7, Vitest, Playwright + `@axe-core/playwright`, `@fontsource/*` for self-hosted fonts, Node ≥ 22.18 (runs `.ts` scripts directly, as `packages/ai` already does).

**Spec:** `docs/superpowers/specs/2026-09-29-docs-launch-site-design.md`

## Global Constraints

- Site URL is `SITE.url` in `docs/site.config.ts`, value `https://slotsmith-docs.netlify.app`. Nothing else hard-codes the domain.
- Languages: English at `/…`, Arabic at `/ar/…`. One template per page; no per-language page files or components.
- `trailingSlash: "always"`, `build.format: "directory"`, `output: "static"`.
- Arabic catalog must be typed `Record<MessageKey, string>` so a missing key fails `tsc`.
- Theme: navy + gold per the old site's `DESIGN.md`; dark default; stored under `localStorage["slotsmith-theme"]`.
- Fonts self-hosted: Inter 400/500/700 and JetBrains Mono 400/500 (Latin), IBM Plex Sans Arabic 400/500/700 (Arabic subset, `/ar/` pages only).
- No browser API in render paths: `window`, `document`, `localStorage`, `today()` only inside effects or the inline head script.
- Library source is read-only. Commits: one line, conventional, no AI attribution.

## Review Focus

- **A hash URL with a trailing slash or query** (`#/docs/data-table/`, `#/docs/data-table?x=1`) must still redirect to `/components/data-table/`.
- **An Arabic page whose prose has no Arabic twin** must render English prose inside `lang="en" dir="ltr"` with the untranslated note, not an error and not an empty page.
- **A sample name typo in MDX** (`<Demo name="data-table/quik-start" />`) must fail the build with the bad name in the message, not render nothing.
- **A new slot added to the library** without a selector in `slot-selectors.ts` must fail the docs tests.
- **An in-page anchor link** (`/components/data-table/#install`) must be checked by the link checker, and in-page anchors must scroll, not navigate home (the old site's bug).

---

### Task 1: Workspace and Astro scaffold

**Files:**
- Modify: `pnpm-workspace.yaml` (add `- "docs"` under `packages`)
- Create: `docs/package.json`, `docs/astro.config.ts`, `docs/tsconfig.json`, `docs/vitest.config.ts`, `docs/site.config.ts`, `docs/.gitignore`, `docs/src/pages/[...lang]/index.astro` (temporary "hello" page)
- Test: `docs/src/lib/__tests__/alias.test.ts`

**Interfaces:**
- Produces: `SITE` from `docs/site.config.ts`:
  ```ts
  export const SITE = {
    url: "https://slotsmith-docs.netlify.app",
    repo: "https://github.com/tmzm/slotsmith",
    branch: "master",
    npm: "slotsmith",
    docsDir: "docs",
  } as const;
  ```
- Produces: import aliases available to pages, islands, samples and tests: `slotsmith`, `slotsmith/virtual`, `slotsmith/data-table`, `slotsmith/autocomplete`, `slotsmith/date-picker`, `slotsmith/file-uploader`, `slotsmith/locale`, `slotsmith/provider`, `slotsmith/locales/*`, `slotsmith/styles.css`, `slotsmith/<component>.css`, `slotsmith/themes/*.css` → `../src/...`; `@samples/*` → `docs/samples/*`; `@/*` → `docs/src/*`.
- Produces scripts in `docs/package.json`: `dev`, `build`, `check`, `test`, `verify`, `reference` (filled by later tasks; `build` is final in Task 8).

- [ ] **Step 1: Write the failing test** — `alias.test.ts` imports `{ DataTable } from "slotsmith/data-table"` and `{ ar } from "slotsmith/locales/ar"` and asserts both are defined, and that `SITE.url` has no trailing slash.
- [ ] **Step 2: Run it:** `pnpm --filter slotsmith-docs test` → FAIL (package missing).
- [ ] **Step 3: Scaffold.** `docs/package.json` is `"private": true`, `"name": "slotsmith-docs"`, `"type": "module"`. Dependencies: `astro`, `@astrojs/react`, `@astrojs/mdx`, `react`, `react-dom`, `@tanstack/react-table`, `@tanstack/react-virtual`, `@floating-ui/react-dom`. Dev: `vitest`, `typescript`, `@astrojs/check`, `playwright`, `@axe-core/playwright`. Mirror the aliases in three places: `astro.config.ts` `vite.resolve.alias` (regex list as in the old site's `vite.config.ts`, extended with the sub-path entries and per-component CSS; component CSS files live next to each component's source — look them up in `tsup.config.ts`), `tsconfig.json` `paths`, and `vitest.config.ts`. Set `vite.resolve.dedupe` to `react`, `react-dom`, `@tanstack/react-table`, `@tanstack/react-virtual`. `.gitignore`: `dist/`, `src/generated/`, `.astro/`.
- [ ] **Step 4: Run** `pnpm install`, `pnpm --filter slotsmith-docs test` → PASS; `pnpm --filter slotsmith-docs exec astro build` → `docs/dist/index.html` exists.
- [ ] **Step 5: Commit** `chore: add the docs workspace package`

### Task 2: Languages and messages

**Files:**
- Create: `docs/src/i18n/messages.en.ts`, `docs/src/i18n/messages.ar.ts`, `docs/src/i18n/index.ts`
- Test: `docs/src/i18n/__tests__/i18n.test.ts`

**Interfaces:**
- Produces from `@/i18n`:
  ```ts
  export type Lang = "en" | "ar";
  export const LANGS: readonly Lang[];                     // ["en", "ar"]
  export type MessageKey = keyof typeof en;
  export function t(lang: Lang, key: MessageKey, vars?: Record<string, string | number>): string; // "{name}" placeholders
  export function localePath(lang: Lang, path: string): string;  // ("ar", "/theming/") → "/ar/theming/"; ("en", "/") → "/"
  export function stripLang(pathname: string): { lang: Lang; path: string }; // "/ar/theming/" → { lang: "ar", path: "/theming/" }
  export function dirOf(lang: Lang): "ltr" | "rtl";
  export function langFromParam(param: string | undefined): Lang; // undefined → "en", "ar" → "ar", anything else throws
  export function langPaths(): { params: { lang: string | undefined } }[]; // for getStaticPaths
  ```

- [ ] **Step 1: Write the failing tests:** `localePath("ar", "/")` → `"/ar/"`; `localePath("en", "/components/data-table/")` → `"/components/data-table/"`; `stripLang("/ar/")` → `{ lang: "ar", path: "/" }`; `t("en", "nav.theming")` → `"Theming"`; `t("ar", …)` returns the Arabic string; `t("en", "common.version", { version: "1.6" })` interpolates; `langFromParam("fr")` throws.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Seed `messages.en.ts` with the keys the layout needs (nav labels for every sidebar entry, header buttons, footer, "Edit this page", "On this page", untranslated note, copy button, skip link, theme/language switch labels). Port matching Arabic strings from the old site's `src/content/locales/ar.ts` at `E:\Projects\Personal\react-data-table-docs`; write new ones where none exist. `messages.ar.ts` is `export const ar: Record<MessageKey, string> = { … }`.
- [ ] **Step 4: Run** tests → PASS; `pnpm --filter slotsmith-docs exec tsc --noEmit` → no errors.
- [ ] **Step 5: Commit** `feat: add the docs message catalog and language helpers`

### Task 3: Layout, header, sidebar, theme, fonts

**Files:**
- Create: `docs/src/layouts/Base.astro`, `docs/src/layouts/Docs.astro`, `docs/src/components/Head.astro`, `Header.astro`, `Sidebar.astro`, `Footer.astro`, `ThemeScript.astro`, `LangSwitch.astro`, `docs/src/nav.ts`, `docs/src/lib/page.ts`, `docs/src/styles/{tokens,base,site}.css`
- Test: `docs/src/lib/__tests__/page.test.ts`, `docs/src/__tests__/nav.test.ts`

**Interfaces:**
- Produces from `@/nav`:
  ```ts
  export interface NavItem { path: string; label: MessageKey; children?: NavItem[] }
  export interface NavGroup { label: MessageKey; items: NavItem[] }
  export const NAV: NavGroup[];
  ```
  Groups, in order: Getting started · Components (each component's overview, with children Guides index anchors, API, Adapters) · Guides · Theming · Languages · AI tools · Trust · Roadmap · Comparison · Changelog. Paths are language-neutral (`/theming/`); `Sidebar` applies `localePath`.
- Produces from `@/lib/page`:
  ```ts
  export function pageTitle(lang: Lang, title: string | null): string; // null → landing title (positioning); else "<title> · slotsmith"
  export function canonicalUrl(lang: Lang, path: string): string;       // SITE.url + localePath(lang, path)
  export function editUrl(sourcePath: string): string;                 // `${SITE.repo}/edit/${SITE.branch}/${SITE.docsDir}/${sourcePath}`
  export function alternates(path: string): { hreflang: string; href: string }[]; // en, ar, x-default (= en)
  ```
- Produces layouts:
  - `Base.astro` props `{ lang: Lang; title: string | null; description: string; path: string; ogImage?: string }` — `<html lang dir data-theme>`, `Head`, skip link to `#content`, `Header`, `<slot />`, `Footer`.
  - `Docs.astro` props = Base props + `{ sourcePath: string; toc?: { id: string; text: string; depth: 2 | 3 }[] }` — adds `Sidebar`, "On this page" from `toc`, and the "Edit this page" link.
- `Header`: wordmark, version badge (`v<major>.<minor>` from the root `package.json` `version`), an empty `<div id="search-slot">` (plan 08 fills it), GitHub, npm, `LangSwitch` (links to the same path in the other language), theme button.

- [ ] **Step 1: Write the failing tests:** `pageTitle("en", "Theming")` → `"Theming · slotsmith"`; `pageTitle("en", null)` starts with `"Finished data table, combobox, date picker and file uploader for React"`; `canonicalUrl("ar", "/theming/")` → `"https://slotsmith-docs.netlify.app/ar/theming/"`; `editUrl("src/content/docs/en/theming.mdx")` → `"https://github.com/tmzm/slotsmith/edit/master/docs/src/content/docs/en/theming.mdx"`; `alternates("/")` has three entries with `x-default` equal to the English URL. Nav test: every `NavItem.path` starts and ends with `/`, and every `label` exists in `messages.en.ts`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Port `tokens.css` / `base.css` / `site.css` from the old site, converting physical properties (`left`, `margin-right`, …) to logical ones so `/ar/` mirrors. `ThemeScript` is an `is:inline` script in `<head>` that reads the stored theme (dark default) and sets `data-theme` before paint. Fonts: import the `@fontsource` CSS files for the weights and subsets in Global Constraints; preload Inter 400 and 700 woff2 via `?url` imports; the Arabic family is imported only when `lang === "ar"`. Sidebar marks the current page with `aria-current="page"` and collapses into a menu button below 1024px.
- [ ] **Step 4: Run** tests → PASS. `astro build`, open `dist/index.html` and `dist/ar/index.html`: `lang`/`dir` correct, one `<title>`, no external font requests (grep `fonts.googleapis` → none).
- [ ] **Step 5: Commit** `feat: add the docs layout, header, sidebar and theme`

### Task 4: Prose collection and every page of the site map

**Files:**
- Create: `docs/src/content.config.ts`, `docs/src/lib/prose.ts`, `docs/src/data/components.ts`, `docs/src/components/Prose.astro`, pages under `docs/src/pages/[...lang]/`: `index.astro`, `getting-started/index.astro`, `guides/index.astro`, `theming/index.astro`, `languages/index.astro`, `ai-tools/index.astro`, `trust/index.astro`, `roadmap/index.astro`, `comparison/index.astro`, `changelog/index.astro`, `about/index.astro`, `components/[component]/index.astro`, `components/[component]/guides/[guide].astro`, `components/[component]/api.astro`, `components/[component]/adapters.astro`; one MDX stub per non-component page in `docs/src/content/docs/en/`
- Test: `docs/src/lib/__tests__/prose.test.ts`, `docs/src/data/__tests__/components.test.ts`

**Interfaces:**
- Content collection `docs`: glob loader over `src/content/docs/**/*.mdx`; ids like `en/theming`, `ar/theming`, `en/components/data-table/guides/tree-rows`. Schema: `title: string`, `description: string` (1–160 chars), `draft?: boolean`.
- Produces from `@/lib/prose`:
  ```ts
  export interface Prose { entry: CollectionEntry<"docs">; lang: Lang; translated: boolean; sourcePath: string }
  export async function getProse(lang: Lang, slug: string): Promise<Prose>; // Arabic missing → English entry, translated: false. English missing → throws with the slug.
  ```
- `Prose.astro` props `{ prose: Prose }`: renders the entry; when `translated === false` on an Arabic page, wraps it in `<div lang="en" dir="ltr">` preceded by `t("ar", "common.untranslated")`.
- Produces from `@/data/components`:
  ```ts
  export type ComponentSlug = "data-table" | "autocomplete" | "date-picker" | "file-uploader";
  export interface ComponentMeta {
    slug: ComponentSlug; exportName: "DataTable" | "Autocomplete" | "DatePicker" | "FileUploader";
    title: MessageKey; summary: MessageKey; guides: { slug: string; title: MessageKey }[];
  }
  export const COMPONENTS: ComponentMeta[];
  export function componentPaths(): { params: { lang: string | undefined; component: ComponentSlug } }[];
  export function guidePaths(): { params: { lang: string | undefined; component: ComponentSlug; guide: string } }[];
  ```
  Guide slugs, exactly as in the spec: data-table `sorting-and-selection, pagination, server-data, tree-rows, virtual-rows, row-reorder, footers, headless-hook`; autocomplete `select-or-combobox, multiple, remote-options, states, creatable, virtual, compound-parts`; date-picker `modes, bounds-and-blocked-days, presets, day-content, compound-parts`; file-uploader `picker, uploads, tile, compact, editing-a-record, validation, virtual`.
- Stub convention: an MDX stub has `draft: true` and the body "This page is being written."; pages render `data-stub` on `<main>` when the entry is a draft. Component pages without prose yet render the same marker. Plan 08 turns stubs into a build failure.

- [ ] **Step 1: Write the failing tests:** `getProse("ar", "theming")` with only `en/theming` present → `translated: false`, `lang: "ar"`; `getProse("en", "nope")` rejects with a message containing `"nope"`. Components test: `guidePaths()` has `(8 + 7 + 5 + 7) × 2 = 54` entries; slugs are unique per component; every `title` key exists in the English catalog. (Test `getProse` through a small injectable lookup so it runs outside Astro: `getProse` delegates to `resolveProse(lang, slug, lookup: (id: string) => Entry | undefined)`, which is what the test calls.)
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** the collection, helpers and every page template. Each template's `getStaticPaths` uses `langPaths()` / `componentPaths()` / `guidePaths()`. Component pages use `Docs` layout; the landing uses `Base`. Titles and descriptions come from frontmatter or, for component pages without prose, from `t(lang, meta.title)` and `t(lang, meta.summary)`.
- [ ] **Step 4: Run** tests → PASS; `astro build` → `dist/` has 2 × (11 + 4 × 3 + 27) = 100 `index.html` files (`find docs/dist -name index.html | wc -l`).
- [ ] **Step 5: Commit** `feat: add every docs route with prose fallback to English`

### Task 5: Redirects from the old hash URLs

**Files:**
- Create: `docs/src/lib/redirects.ts`, `docs/scripts/redirects.ts`, `docs/src/components/HashRedirect.astro`
- Modify: `docs/src/pages/[...lang]/index.astro` (include `HashRedirect` on the English landing only)
- Test: `docs/src/lib/__tests__/redirects.test.ts`

**Interfaces:**
- Produces from `@/lib/redirects`:
  ```ts
  export const HASH_ROUTES: Record<string, string>; // "installation" → "/getting-started/", … exactly the spec table; "" → "/"
  export function resolveHashRedirect(hash: string): string | null; // "" or "#" → null; unknown "#/…" → "/"; non-route hash like "#install" → null
  export function netlifyRedirects(): string;       // body of public/_redirects
  ```
- `netlifyRedirects()` emits `/docs/<slug>  <new>  301` and `/docs/<slug>/  <new>  301` for every entry, then the commented-out domain rule from the spec verbatim.
- `HashRedirect.astro` inlines `resolveHashRedirect` as an `is:inline` script (serialise `HASH_ROUTES` into it) that calls `location.replace(target)`.
- `scripts/redirects.ts` writes `docs/public/_redirects` from `netlifyRedirects()`; run as part of `build` (Task 8).

- [ ] **Step 1: Write the failing tests:** every row of the spec's redirect table (12 rows); `#/docs/data-table/` → `/components/data-table/`; `#/docs/data-table?tab=mui` → `/components/data-table/`; `#/docs/unknown` → `/`; `#content` → `null`; `netlifyRedirects()` contains `"/docs/autocomplete  /components/autocomplete/  301"` and `"# https://slotsmith-docs.netlify.app/* https://slotsmith.dev/:splat 301!"`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** tests → PASS. `astro build`, serve `dist`, open `/#/docs/date-picker` in a browser → lands on `/components/date-picker/`.
- [ ] **Step 5: Commit** `feat: redirect the old hash URLs to the new paths`

### Task 6: Generated reference data

**Files:**
- Create: `docs/scripts/reference.ts`, `docs/scripts/lib/tokens.ts`, `docs/scripts/slot-selectors.ts`, `docs/src/data/data-attributes.json` (starts as `{}`), `docs/src/lib/reference.ts`
- Test: `docs/scripts/lib/__tests__/tokens.test.ts`, `docs/scripts/__tests__/slot-selectors.test.ts`, `docs/scripts/__tests__/reference.test.ts`

**Interfaces:**
- Consumes: `generateKnowledge(options)` and `DEFAULT_OPTIONS` exported by `packages/ai/scripts/generate.ts` (read its `GeneratedKnowledge` type; do not modify the file).
- Produces `docs/src/generated/reference/<slug>.json`, one per component: the generator's component object plus
  - `tokens: string[]` — sorted, unique, from the component's CSS (and `--ss-*` it reads),
  - every `slots[i].dataAttributes` merged (union, sorted) with `data-attributes.json[slug][slotName] ?? []`.
- Produces from `@/lib/reference`: `export type ComponentReference = …` (derived from the generator's type plus `tokens`) and `export function getReference(slug: ComponentSlug): ComponentReference` (imports the JSON; throws with a "run pnpm --filter slotsmith-docs reference" message when missing).
- Produces from `scripts/lib/tokens.ts`: `export function extractTokens(css: string): string[]` — matches `--s[a-z]+-[a-z0-9-]+` in declarations and `var()` calls.
- Produces from `scripts/slot-selectors.ts`: `export const SLOT_SELECTORS: Record<ComponentSlug, Record<string, string>>` — slot name → CSS selector for the fallback element (e.g. data-table `Row: ".sdt__row"`). Build it from each component's `classes.ts`.

- [ ] **Step 1: Write the failing tests:**
  - `extractTokens(".a{color:var(--sdt-text, var(--ss-text));--sdt-radius:4px}")` → `["--sdt-radius", "--sdt-text", "--ss-text"]`.
  - For every component, every slot name in the generated reference has a key in `SLOT_SELECTORS[slug]`, and there are no extra keys (this is the "new slot fails the build" guard).
  - Reference test: after running the script, `data-table.json` has 22 slots, `autocomplete.json` 17, `date-picker.json` 13, `file-uploader.json` 13; every slot has `kind` of `"element"` or `"widget"`; `data-table` label `retry` has default `"\"Retry\""`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** `scripts/reference.ts` exports `buildReference(): ComponentReference[]` (used by the test) and writes files when run directly.
- [ ] **Step 4: Run** `pnpm --filter slotsmith-docs reference && pnpm --filter slotsmith-docs test` → PASS.
- [ ] **Step 5: Commit** `feat: generate the docs reference data from the library source`

### Task 7: Sample pipeline

**Files:**
- Create: `docs/src/islands/SampleIsland.tsx`, `docs/src/components/Demo.astro`, `docs/src/components/SampleCode.astro`, `docs/src/lib/samples.ts`, `docs/scripts/check-snippets.ts`, `docs/samples/smoke/hello-table.tsx` (a 3-row `DataTable`, used on the stub landing until plan 02)
- Test: `docs/src/lib/__tests__/samples.test.ts`, `docs/scripts/__tests__/check-snippets.test.ts`

**Interfaces:**
- Sample file contract: `docs/samples/<area>/<name>.tsx` default-exports a React component taking no props and imports only from `slotsmith…`, `react` and real third-party packages. Non-rendering samples are `.ts`, `.css`, `.json` or `.sh` files. A sample's name is its path under `samples/` without extension (`data-table/quick-start`).
- Produces from `@/lib/samples`:
  ```ts
  export const SAMPLE_SOURCES: Record<string, { code: string; lang: "tsx" | "ts" | "css" | "json" | "bash" }>; // import.meta.glob("/samples/**/*", { query: "?raw", eager: true })
  export function sampleSource(name: string): { code: string; lang: … }; // unknown name → throws `Unknown sample "<name>"`
  export function sampleNames(): string[];
  ```
- `SampleIsland.tsx` props `{ name: string; lang: Lang; locales?: "site" | "all" }`: a non-eager `import.meta.glob("../../samples/**/*.tsx")` map, `React.lazy` of the named loader, wrapped in `SlotsmithProvider` (`locale` `"en-US"` or `"ar"`, `locales={[ar]}` for `"site"`) and a `dir` wrapper. Throws `Unknown sample` for a bad name.
- `Demo.astro` props `{ name: string; lang: Lang; height: string; fallback?: boolean; hydrate?: "visible" | "idle" | "load" }` (default `visible`): renders `<figure data-sample={name} data-fallback={fallback || undefined} style={`--demo-h:${height}`}>` containing `<SampleIsland client:… />` above the code (`astro:components` `<Code>` with `sampleSource(name)`), plus a copy button. `height` reserves space so hydration causes no layout shift.
- `SampleCode.astro` props `{ name: string }`: code only, same `data-sample` attribute.
- Produces from `scripts/check-snippets.ts`:
  ```ts
  export function findUnbackedSnippets(mdx: string, samples: string[]): string[]; // fenced tsx/ts/jsx/css blocks whose whitespace-normalised text is not a substring of any sample
  ```
  Run over every MDX file by `pnpm --filter slotsmith-docs check`; non-empty result → exit 1 listing file and first line of each block.

- [ ] **Step 1: Write the failing tests:** `sampleSource("smoke/hello-table").lang` → `"tsx"`; `sampleSource("nope")` throws `Unknown sample "nope"`. Snippets: a block that is a substring of a sample (with different indentation) → `[]`; a block not in any sample → one entry; a ` ```bash ` block is ignored.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** `check` script: `astro check && tsc --noEmit -p samples && node scripts/check-snippets.ts`; add `docs/samples/tsconfig.json` extending the docs one with `include: ["**/*"]`.
- [ ] **Step 4: Run** tests → PASS. Put `<Demo name="smoke/hello-table" lang={lang} height="14rem" fallback />` on the stub landing; `astro build`; `grep -c 'sdt__row' docs/dist/index.html` ≥ 3 (the table is in the prerendered HTML, not only after hydration).
- [ ] **Step 5: Commit** `feat: add the sample pipeline for docs demos and code`

### Task 8: Post-build verifier and the build script

**Files:**
- Create: `docs/scripts/verify-site.ts`, `docs/scripts/lib/serve.ts`, `docs/scripts/lib/html.ts`
- Modify: `docs/package.json` (`build`, `verify`)
- Test: `docs/scripts/lib/__tests__/html.test.ts`

**Interfaces:**
- Produces from `scripts/lib/serve.ts`: `export function serveDir(dir: string, port: number): Promise<{ url: string; close(): Promise<void> }>` — static server on `node:http`, directory-format (`/x/` → `/x/index.html`), 404 otherwise.
- Produces from `scripts/lib/html.ts` (pure, tested):
  ```ts
  export interface PageFacts { path: string; title: string; description: string; canonical: string; ogImage: string | null; alternates: string[]; links: string[]; ids: string[]; samples: string[]; stub: boolean }
  export function readPage(path: string, html: string): PageFacts;
  export function findMetaProblems(pages: PageFacts[]): string[];   // empty/duplicate title or description, canonical ≠ SITE.url + path, missing en/ar/x-default alternates
  export function findDeadLinks(pages: PageFacts[]): string[];      // internal href to a path with no page, or `#id` not in the target page's ids
  export function findUnusedSamples(pages: PageFacts[], names: string[]): string[];
  ```
- `verify-site.ts` (Playwright, Chromium): serves `docs/dist`, reads every `index.html` with `readPage`, reports `findMetaProblems`, `findDeadLinks`, `findUnusedSamples`; then visits every page and fails on any console `error`/`warning` or `pageerror`; runs `@axe-core/playwright` scoped to each `[data-fallback]` figure (all rules, WCAG 2.2 AA tags) and fails on violations; for each `[data-sample]` figure collects the `data-*` attribute names (excluding `data-sample`, `data-fallback`, `data-astro-*`) of elements matching each `SLOT_SELECTORS` entry and fails when one is missing from that slot's reference `dataAttributes`, printing the JSON to add to `data-attributes.json`; writes `docs/dist/a11y.json` (`{ page, sample, violations: number, passes: number }[]`); prints the count of `stub` pages and fails on stubs only when `DOCS_STRICT=1`.
- `build` becomes: `node scripts/reference.ts && node scripts/redirects.ts && astro build && node scripts/verify-site.ts`. (`facts.ts` joins in plan 06, Pagefind in plan 08.)

- [ ] **Step 1: Write the failing tests** for `readPage` (extracts title, description, canonical, hreflang alternates, internal links, ids, `data-sample` names, `data-stub`), `findMetaProblems` (duplicate title → one problem naming both paths), `findDeadLinks` (`/theming/#nope` when `/theming/` has no `nope` id → problem; `/theming/#tokens` when it has → none; external links ignored).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Add in-page anchors to headings in `Prose.astro` (`id` from the heading slug) so `toc` and links have targets.
- [ ] **Step 4: Run** `pnpm --filter slotsmith-docs exec playwright install chromium`, then `pnpm --filter slotsmith-docs build` → exits 0, prints "100 pages, 0 problems, N stubs".
- [ ] **Step 5: Commit** `feat: verify the built docs for meta, links, console errors and axe`

### Task 9: CI

**Files:**
- Create: `.github/workflows/docs.yml`

**Interfaces:**
- Workflow `docs`, on `push` to `master` and `pull_request`, paths `src/**`, `docs/**`, `packages/ai/**`, `README.md`, `package.json`, `pnpm-lock.yaml`, `.github/workflows/docs.yml`. Ubuntu, Node 22, pnpm via `pnpm/action-setup` (version from the root `packageManager` field if present, else 11). Steps: checkout → `pnpm install --frozen-lockfile` → `pnpm build` (library) → `pnpm --filter slotsmith-docs exec playwright install --with-deps chromium` → `pnpm --filter slotsmith-docs test` → `pnpm --filter slotsmith-docs check` → `pnpm --filter slotsmith-docs build` → upload `docs/dist` as an artifact. Later plans add steps (example apps in 05, Lighthouse and `DOCS_STRICT=1` in 08).

- [ ] **Step 1:** Write the workflow.
- [ ] **Step 2:** Run the same commands locally in order from a clean `docs/dist` → all exit 0.
- [ ] **Step 3: Commit** `ci: build and verify the docs site`

## Final verification for plan 01

- `pnpm test` (library) still green; `pnpm --filter slotsmith-docs test`, `check`, `build` all exit 0.
- `dist/` has 100 pages; `/ar/` pages are RTL; `/#/docs/theming` redirects to `/theming/`; no request to Google Fonts; in-page anchor links scroll.
