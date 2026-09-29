# Docs launch 06 — Trust page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `/trust/` page where every number is generated at build: tests and coverage, what the integration suites and the tree-shaking test assert, axe results for every fallback demo, bundle sizes per entry, plus support and security policy text.

**Architecture:** `scripts/facts.ts` (started in plan 02) grows to one test run with coverage and per-test titles. axe results only exist after the Astro build, so `verify-site` writes them into the built Trust pages by replacing a marker comment. No second build.

**Tech Stack:** plan 01–05 stack; root dev dependency `@vitest/coverage-v8` (same major as the root `vitest`).

**Spec:** `docs/superpowers/specs/2026-09-29-docs-launch-site-design.md` (section "Trust")

## Global Constraints

- One vitest run produces both the test JSON and the coverage summary: `vitest run --coverage --coverage.reporter=json-summary --reporter=json --outputFile=<tmp>/tests.json` at the repo root.
- Browser support is stated as: the last two versions of Chrome, Edge, Firefox and Safari; requires ES2022, `Intl` and `IntersectionObserver`. React 18 and 19.
- Policy text (SemVer, support, security) is a draft until the owner approves. Add each to `docs/LAUNCH-REPORT.md` under "Needs a decision".
- No number on the page is typed by hand.

## Review Focus

- **A failing library test during the docs build** must fail the build with the vitest output, not publish a lower test count.
- **An integration suite added later** (e.g. the owner's antd suites, radix) appears on the page with no docs change.
- **The Arabic Trust page** gets the axe table too (the marker exists in both `dist/trust/` and `dist/ar/trust/`).
- **Coverage below a meaningful level for one component** is shown per component, not hidden in a total.
- **Bundle sizes** state what was measured (minified + gzipped, React and peers excluded) next to the numbers.

---

### Task 1: Facts — coverage, suites and assertions

**Files:**
- Modify: root `package.json` (devDependency `@vitest/coverage-v8`), `docs/scripts/facts.ts`, `docs/src/lib/facts.ts`
- Test: `docs/scripts/__tests__/facts.test.ts`

**Interfaces:**
- `Facts` (plan 02) gains:
  ```ts
  coverage: { component: string; lines: number; branches: number; functions: number; statements: number }[] // percent, per src/<component>/ excluding __tests__, plus a "total" row
  suites: { file: string; component: string; library: string | null; kind: "integration" | "bundle" | "a11y" | "unit"; tests: string[] }[] // tests = full titles from the JSON reporter
  css: { entry: string; minBytes: number; gzipBytes: number }[] // styles.css and each per-component CSS, minified with esbuild's CSS loader
  ```
- `buildFacts()` exits non-zero and prints vitest's output when any test fails (`success: false` in the JSON).
- `kind`: files under `__tests__/integrations/` → `integration` (`library` from the file name); `src/__tests__/bundle.test.ts` → `bundle`; files named `a11y.test.tsx` or containing `axe` → `a11y`; others → `unit`.

- [ ] **Step 1: Write the failing tests** against a fixture vitest JSON and coverage summary (put small fixtures in `docs/scripts/__tests__/fixtures/`): a failing fixture makes `buildFacts` reject; `suites` classifies `src/data-table/__tests__/integrations/mui.test.tsx` as `{ component: "data-table", library: "mui", kind: "integration" }`; coverage rows exist for the four components and `total`. (Make `buildFacts` accept `{ testsJson?: string; coverageJson?: string }` paths for testing; the real run passes none.)
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** tests → PASS; run the real script once → `facts.json` has a test count matching `pnpm test`'s summary.
- [ ] **Step 5: Commit** `feat: add coverage and suite details to the docs facts`

### Task 2: axe results injected after the build

**Files:**
- Create: `docs/scripts/lib/a11y-report.ts`
- Modify: `docs/scripts/verify-site.ts`
- Test: `docs/scripts/lib/__tests__/a11y-report.test.ts`

**Interfaces:**
- Produces from `scripts/lib/a11y-report.ts`:
  ```ts
  export interface A11yResult { page: string; sample: string; violations: { id: string; impact: string; nodes: number }[]; passes: number }
  export const A11Y_MARKER = "<!--a11y-results-->";
  export function renderA11yTable(results: A11yResult[], lang: Lang): string; // <table> with sample, page link, rules passed, violations; summary line above: "<n> fallback demos, <m> violations, axe-core <version>, WCAG 2.2 AA"
  export function injectA11y(html: string, table: string): string;           // replaces A11Y_MARKER; throws if the marker is missing
  ```
- `verify-site` collects `A11yResult`s (it already runs axe per fallback figure), writes `dist/a11y.json`, and injects the table into `dist/trust/index.html` and `dist/ar/trust/index.html`. It still fails the build on any violation.

- [ ] **Step 1: Write the failing tests:** `renderA11yTable` with two results, one violation → summary "2 fallback demos, 1 violations…" (fix the plural in English: "1 violation"), a row per sample with a link to its page; `injectA11y` without the marker throws; with it, replaces exactly once.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** tests → PASS.
- [ ] **Step 5: Commit** `feat: publish axe results for every fallback demo`

### Task 3: The Trust page

**Files:**
- Create: `docs/src/content/docs/en/trust.mdx`, `docs/src/components/trust/{TestsSummary,CoverageTable,SuitesList,SizesTable,A11yResults}.astro`
- Test: `docs/src/components/trust/__tests__/trust.test.ts`

**Interfaces:**
- Consumes: `getFacts()`.
- `trust.mdx` sections with ids: `tests` (`TestsSummary`: tests, files, `CoverageTable`), `integrations` (`SuitesList` for `kind: "integration"`, grouped by library, each suite expandable to its test titles; one sentence on the shared harness that fails on any React warning), `tree-shaking` (what `bundle.test.ts` proves, from its test titles), `accessibility` (`A11yResults` renders `A11Y_MARKER` plus a line on what runs: axe-core in Chromium on every fallback demo at every deploy), `sizes` (`SizesTable` for JS and CSS, with the measurement note), `support` (browsers and React per Global Constraints, Node for `slotsmith-ai` ≥ 20), `versioning` (SemVer draft: breaking changes only in majors, deprecations warned for one minor first), `security` (draft: report privately via GitHub security advisories on `tmzm/slotsmith`, response target, supported versions = latest minor), `changelog` (link to `/changelog/`).
- The landing's `TrustStrip` links now point at these anchors (`/trust/#tests`, `#integrations`, `#sizes`, `#support`).

- [ ] **Step 1: Write the failing test** (container API, fixture facts): `SuitesList` groups a MUI and a Chakra suite under their libraries; `SizesTable` shows `KB` with one decimal (`(bytes / 1000).toFixed(1)`); `A11yResults` output contains `A11Y_MARKER`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Add the three policy drafts to `docs/LAUNCH-REPORT.md` "Needs a decision".
- [ ] **Step 4: Run** tests, `check`, `build` → PASS; `dist/trust/index.html` contains the axe table and no marker.
- [ ] **Step 5: Commit** `docs: add the trust page`

## Final verification for plan 06

- `/trust/` and `/ar/trust/` show generated tests, coverage, suites, tree-shaking, axe, sizes, support, versioning, security and changelog sections.
- Breaking one library test locally makes `pnpm --filter slotsmith-docs build` fail (then revert).
