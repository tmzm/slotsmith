# Docs launch 07 — Roadmap, Comparison, Changelog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A changelog generated from the README, a roadmap kept in sync with the source's `TODO(...)` tags and the Unreleased section, and a factual comparison page with a source and check date for every cell.

**Architecture:** Data files in `docs/src/data/` plus pure parsers in `docs/src/lib/`, each guarded by a test that reads the real source (README, `src/**`) so the pages cannot drift silently.

**Tech Stack:** plan 01–06 stack. Web research for the comparison (official docs, READMEs, package.json of each project).

**Spec:** `docs/superpowers/specs/2026-09-29-docs-launch-site-design.md` (sections "Roadmap and Comparison", "Changelog")

## Global Constraints

- Comparison subjects: Material React Table, Mantine React Table, the shadcn/ui data-table recipe, React Aria Components, Ark UI / Park UI. slotsmith is the first column.
- Comparison attributes (rows): components covered (data table, combobox, date picker, file uploader); styling model; how you replace a part; built on; required dependencies/peers; license; RTL support; virtualisation; TypeScript.
- Every non-slotsmith cell has a source URL (official docs, repo README or package.json) and the page shows a "checked on" date per subject. Unknown or undocumented → "Not documented", never a guess.
- No adjectives of praise or blame anywhere on the page. Include an "I'm wrong? Open an issue" link to `https://github.com/tmzm/slotsmith/issues/new?title=Comparison%20correction`.
- Roadmap has no dates.

## Review Focus

- **A README changelog entry with nested lists or code** renders correctly, not flattened.
- **A new `TODO(tag)` added to library source** without a roadmap entry fails the docs tests.
- **A comparison cell with a stale fact:** each subject shows its check date so readers can judge; the issue link is present on every row group.
- **The Unreleased section being empty** (after a release) removes "In progress" rather than showing an empty heading.
- **Arabic pages** for these three: generated content stays English, the frame is Arabic, and nothing breaks.

---

### Task 1: Changelog

**Files:**
- Create: `docs/src/lib/changelog.ts`, `docs/src/pages/[...lang]/changelog/index.astro` (replace the stub body)
- Test: `docs/src/lib/__tests__/changelog.test.ts`

**Interfaces:**
- Produces from `@/lib/changelog`:
  ```ts
  export interface Release { version: string; unreleased: boolean; markdown: string }
  export function parseChangelog(readme: string): Release[]; // the "## Changelog" section up to the next "## "; each "### <heading>" is one release; "Unreleased" → unreleased: true
  ```
- The page renders each release's markdown with Astro's markdown processor, with `id` = version (`1.6.0` → `id="1.6.0"`, Unreleased → `id="unreleased"`) so the Trust page and roadmap can link to it. Title "Changelog", description names the latest version.

- [ ] **Step 1: Write the failing tests** against the real root `README.md`: the first release is Unreleased (as of this plan; if the owner has released since, assert against whatever the README says, not a hard-coded version); a release `1.6.0` exists; a fixture with a nested list and a fenced code block keeps both in `markdown`; a README without "## Changelog" → `[]`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** tests, `build` → PASS.
- [ ] **Step 5: Commit** `docs: generate the changelog page from the readme`

### Task 2: Roadmap

**Files:**
- Create: `docs/src/data/roadmap.ts`, `docs/src/lib/todos.ts`, `docs/src/content/docs/en/roadmap.mdx`
- Test: `docs/src/data/__tests__/roadmap.test.ts`

**Interfaces:**
- Produces from `@/lib/todos`: `export function findTodoTags(files: { path: string; text: string }[]): Map<string, string[]>` — tag → file paths, matching `TODO\(([a-z0-9-]+)\)`.
- Produces from `@/data/roadmap`:
  ```ts
  export interface RoadmapItem { title: MessageKey; status: "shipped" | "in-progress" | "planned"; todo?: string; link?: string }
  export const ROADMAP: RoadmapItem[];
  export const IGNORED_TODOS: string[]; // tags that are internal notes, not roadmap items, each with a comment saying why
  ```
  Planned today: Hijri and Persian calendars (`todo: "calendars"`), server-side locale resolution (`todo: "server-locales"`), keeping the sorted view on reorder (`todo: "reorder-sorting"`). Shipped: the four components and their headline features, each linking to its page. In progress: rendered from the changelog's Unreleased release (Task 1), not duplicated in `ROADMAP`.

- [ ] **Step 1: Write the failing test:** read every `src/**/*.{ts,tsx}` excluding `__tests__`; every tag from `findTodoTags` is either some `ROADMAP[i].todo` or in `IGNORED_TODOS`; every `todo` in `ROADMAP` still exists in source (so finished work moves to shipped).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** test, `build` → PASS.
- [ ] **Step 5: Commit** `docs: add the roadmap page`

### Task 3: Comparison

**Files:**
- Create: `docs/src/data/comparison.ts`, `docs/src/content/docs/en/comparison.mdx`, `docs/src/components/ComparisonTable.astro`
- Test: `docs/src/data/__tests__/comparison.test.ts`

**Interfaces:**
- Produces from `@/data/comparison`:
  ```ts
  export type Attribute = "components" | "styling" | "replaceParts" | "builtOn" | "dependencies" | "license" | "rtl" | "virtualisation" | "typescript";
  export interface Cell { text: string; source?: string } // source required for non-slotsmith subjects
  export interface Subject { name: string; url: string; checked: string /* YYYY-MM-DD */; cells: Record<Attribute, Cell> }
  export const SUBJECTS: Subject[]; // slotsmith first
  export const BANNED_WORDS: string[]; // "best", "powerful", "beautiful", "simple", "easy", "blazing", "modern", "lightweight", "robust", "seamless", "elegant", "intuitive"
  ```
- slotsmith's cells come from facts and reference where possible (license from `package.json`, peers from the reference, RTL from the locale packs), with links to its own docs pages.
- `ComparisonTable.astro`: subjects as columns on wide screens, stacked per subject on narrow ones; each non-slotsmith cell links to its source; each subject header shows "checked on <date>".
- `comparison.mdx`: two sentences of context (what is compared and how it was checked), the table, and the correction link.

- [ ] **Step 1: Write the failing test:** `SUBJECTS[0].name === "slotsmith"`; there are 6 subjects; every non-slotsmith cell has an `https://` source; every `checked` is a valid date not in the future; no cell text contains a `BANNED_WORDS` word (case-insensitive, whole word).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Research and implement.** For each subject, read its official docs and repository (README, `package.json` for license and peers). Record exactly what the source says. Where two sources disagree, use the repository and note it.
- [ ] **Step 4: Run** test, `build` → PASS.
- [ ] **Step 5: Commit** `docs: add the comparison page`

## Final verification for plan 07

- `/changelog/`, `/roadmap/`, `/comparison/` (and `/ar/…`) have no stub marker; `verify-site` passes.
