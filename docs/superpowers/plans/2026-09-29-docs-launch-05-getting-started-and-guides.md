# Docs launch 05 — Getting started and cross-cutting guides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Getting started, `/guides/` (the slot model), `/theming/`, `/languages/`, `/ai-tools/` and `/about/`, plus a Next.js App Router example and a Vite example that CI builds.

**Architecture:** Prose in MDX, demos as samples, the two framework examples as small workspace packages under `docs/samples/frameworks/`. Lists that exist in source (locale packs, themes, MCP tools and prompts) are read from source or checked against it by a test.

**Tech Stack:** plan 01–04 stack; `next` (App Router) and `vite` + `@vitejs/plugin-react` in the example packages only.

**Spec:** `docs/superpowers/specs/2026-09-29-docs-launch-site-design.md` (sections "Getting started", "Site map")

## Global Constraints

- Getting started covers, in order: install; styles (everything `slotsmith/styles.css`, one component `slotsmith/<c>.css`, none); theming with `--ss-*` tokens and the six themes (`minimal`, `soft`, `ocean`, `forest`, `sunset`, `contrast`), shown live; dark mode; `SlotsmithProvider` and locales; the CommonJS note; the Next.js App Router and Vite examples.
- Shared tokens, from the README: `--ss-surface, --ss-text, --ss-muted, --ss-border, --ss-accent, --ss-on-accent, --ss-danger, --ss-hover, --ss-selected, --ss-radius, --ss-font-size`. Note that only the date picker reads `--ss-on-accent` and only the table reads `--ss-selected`.
- Locale packs: 18 packs (`ar, ar-EG, ar-IQ, ar-SA, fa, he` RTL; `de, es, fr, hi, id, it, ja, ko, pt-BR, ru, tr, zh-CN` LTR), read from `src/locales/` at build, never typed by hand. There is no `en` pack (English is the default).
- MCP setup snippets for Claude Code, Cursor, VS Code (`servers` key) and Claude Desktop; the command is `npx -y slotsmith-ai mcp`. The `adapt-slots-to-library` prompt takes `component` and `library`. Do not advertise `radix` adapters.
- Do not claim "no runtime dependencies": the library depends on `@floating-ui/react-dom`.

## Review Focus

- **Previewing a theme** must restyle only the preview, not the rest of the page, and must not persist after leaving the page.
- **The Next.js example** must build with `next build` without "use client" errors; if the library's components need a client boundary, the example shows the one-file wrapper and the report lists the library issue.
- **The CommonJS note** must be true for every entry it names: `require("slotsmith/<entry>")` works in Node without `@tanstack/react-table` installed for the non-table entries (test it; audit issue 4 says the main entry does not).
- **A new MCP tool added to `packages/ai`** without being documented must fail the docs tests.
- **Language switcher demo on `/languages/`** switching to a pack with plural rules (ru, ar) shows the right plural form for counts 1, 2, 5, 11.

---

### Task 1: Framework examples

**Files:**
- Modify: `pnpm-workspace.yaml` (add `"docs/samples/frameworks/*"`), `docs/samples/tsconfig.json` (exclude `frameworks/`), `docs/src/lib/samples.ts` (glob excludes `**/node_modules/**`, `**/.next/**`, `**/dist/**`), `.github/workflows/docs.yml`
- Create: `docs/samples/frameworks/next-app/` (`package.json` name `example-next`, `app/layout.tsx`, `app/page.tsx`, `app/providers.tsx`, `next.config.ts`, `tsconfig.json`), `docs/samples/frameworks/vite/` (`package.json` name `example-vite`, `index.html`, `src/main.tsx`, `src/App.tsx`, `vite.config.ts`, `tsconfig.json`)

**Interfaces:**
- Both examples depend on `"slotsmith": "workspace:*"` (built `dist`, like a real install) and render a `DataTable` with `slotsmith/data-table.css`, inside `SlotsmithProvider` with the `ar` pack available and a language toggle.
- Next: layout sets `<html lang dir>`; `providers.tsx` is the client boundary holding `SlotsmithProvider`.
- CI gains, after the library build: `pnpm --filter example-next build` and `pnpm --filter example-vite build`.

- [ ] **Step 1:** Create both examples.
- [ ] **Step 2: Run** `pnpm install && pnpm build && pnpm --filter example-next build && pnpm --filter example-vite build` → both succeed. If Next fails for lack of `"use client"` in the library, keep the wrapper and add the finding to `docs/LAUNCH-REPORT.md` "Library issues".
- [ ] **Step 3: Commit** `docs: add runnable Next.js and Vite examples`

### Task 2: Getting started and theming

**Files:**
- Create: `docs/src/content/docs/en/getting-started.mdx`, `docs/src/content/docs/en/theming.mdx` (replacing the stubs), `docs/src/islands/ThemePreview.tsx`, `docs/src/lib/scope-theme.ts`, samples `docs/samples/getting-started/{styles-all.ts,styles-one.ts,provider.tsx,cjs.cjs}`, `docs/samples/theming/{tokens.css,dark.css,tailwind.tsx,own-styles.css}`
- Test: `docs/src/lib/__tests__/scope-theme.test.ts`, `docs/scripts/__tests__/cjs.test.ts`

**Interfaces:**
- Produces from `@/lib/scope-theme`: `export function scopeTheme(css: string, scope: string): string` — rewrites `:root` → `scope` and `.dark, [data-theme="dark"]` (and each alone) → `[data-theme="dark"] scope, scope.dark`, leaving other selectors untouched.
- `ThemePreview.tsx` props `{ themes: Record<string, string> }` (theme name → scoped CSS, produced at build from `?raw` imports of `slotsmith/themes/<name>.css` passed through `scopeTheme(css, ".theme-preview")`): a theme picker (radio group: None + six themes) injecting the chosen CSS in a `<style>` inside the island, over a small `DataTable` + `DatePicker` + `Autocomplete` in `.theme-preview`.
- `theming.mdx` sections with ids: `tokens`, `themes`, `dark-mode`, `tailwind`, `own-styles`, `rtl`. Per-component prefixes (`--sdt-*`, `--sac-*`, `--sdp-*`, `--sfu-*`) link to each component's `/api/#styling`.
- `getting-started.mdx` follows the order in Global Constraints and links to `/theming/` and `/languages/` for depth; the framework examples appear via `SampleCode` of `frameworks/next-app/app/providers.tsx`, `frameworks/next-app/app/page.tsx`, `frameworks/vite/src/App.tsx`.

- [ ] **Step 1: Write the failing tests.** `scopeTheme(":root{--ss-accent:red}.dark,[data-theme=\"dark\"]{--ss-accent:blue}", ".p")` → contains `.p{--ss-accent:red}` and `[data-theme="dark"] .p` with blue, and no `:root`. CJS test (node env, needs `pnpm build`): `require` of `dist/autocomplete.cjs`, `dist/date-picker.cjs`, `dist/file-uploader.cjs` succeeds with `@tanstack/react-table` made unresolvable (use a `Module._resolveFilename` stub that throws for it); record the main entry's result instead of asserting it, and print it for the report.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** The CommonJS note names only the entries the test proved.
- [ ] **Step 4: Run** tests, `check`, `build` → PASS; previewing a theme changes the preview's accent and not the header's.
- [ ] **Step 5: Commit** `docs: add getting started and theming`

### Task 3: Languages

**Files:**
- Create: `docs/src/content/docs/en/languages.mdx`, `docs/src/lib/packs.ts`, `docs/src/components/PackTable.astro`, samples `docs/samples/languages/{switcher,object-form,provider-form,custom-pack,override,precedence,plurals,next-intl,i18next}.tsx`
- Test: `docs/src/lib/__tests__/packs.test.ts`, `docs/samples/__tests__/languages.test.tsx`

**Interfaces:**
- Produces from `@/lib/packs`: `export interface PackInfo { code: string; name: string; dir: "ltr" | "rtl"; importPath: string }` and `export const PACKS: PackInfo[]` — `import.meta.glob("../../../src/locales/*.ts", { eager: true })`, `name` from `Intl.DisplayNames(["en"], { type: "language" })`, `dir` from the pack. Sorted by code.
- `languages.mdx` sections: available packs (`PackTable`), try it (`switcher`, every pack), passing a locale (object / provider forms), your own pack (`defineLocale`), overriding labels, precedence (English defaults → locale → `labels`), plurals (`createPlural`), calendars (Gregorian only; link `/roadmap/`), Next.js, next-intl and i18next bridges. Port from the old `LocalesPage.tsx`.

- [ ] **Step 1: Write the failing tests:** `PACKS.length === 18`; `PACKS.filter(p => p.dir === "rtl").map(p => p.code)` equals `["ar", "ar-EG", "ar-IQ", "ar-SA", "fa", "he"]`; no `en` pack. Plurals sample (jsdom): with `ru`, the selected-count text differs for 1, 2 and 5; with `ar`, for 1, 2, 5 and 11.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** tests, `check`, `build` → PASS.
- [ ] **Step 5: Commit** `docs: add the languages page`

### Task 4: The slot model (`/guides/`)

**Files:**
- Create: `docs/src/content/docs/en/guides.mdx`, `docs/src/islands/XRay.tsx` (the old site's X-ray idea rebuilt on plan 02's `ExplodedView` and `explodeParts`, reading slot names and kinds from `getReference("data-table")` passed as props, so `/guides/` and the landing share one visual language), samples `docs/samples/guides/{element-part,widget-part,wrap-fallback,data-state.css,compound-parts,headless-hooks}.tsx`
- Test: `docs/src/islands/__tests__/XRay.test.tsx`

**Interfaces:**
- `XRay.tsx` props `{ slots: { name: string; kind: "element" | "widget" }[]; lang: Lang }`: a live table with a "Show parts" toggle that sets `--explode` to 1 (CSS transition 320ms, instant under reduced motion; no GSAP on docs pages) and labels each slot with `bracketLabel` (`<Name>` element, `{Name}` widget); picking a slot links to `/components/data-table/api/#slot-<Name>`. Every slot in the table's reference must be reachable from the list (fixes the old site's 21-of-22 and hidden-slot problems).
- `guides.mdx` sections with ids: `two-kinds`, `data-state`, `wrap-fallbacks`, `compound-parts`, `headless-hooks`, `rules` (a custom `Row` keeps a stable identity; widget parts get told what is true, not what to render).

- [ ] **Step 1: Write the failing test:** XRay with the data-table reference lists 22 slots, 12 marked element and 10 widget, and each item links to `#slot-<Name>`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** test, `check`, `build` → PASS.
- [ ] **Step 5: Commit** `docs: add the slot model guide`

### Task 5: AI tools and About

**Files:**
- Create: `docs/src/content/docs/en/ai-tools.mdx`, `docs/src/content/docs/en/about.mdx`, `docs/src/data/mcp.ts`, samples `docs/samples/ai/claude-desktop.json`
- Test: `docs/src/data/__tests__/mcp.test.ts`

**Interfaces:**
- Produces from `@/data/mcp`: `export const MCP_TOOLS: { name: string; description: string; args: string[] }[]`, `export const MCP_PROMPTS: { name: string; args: string[] }[]`, `export const MCP_RESOURCES: string[]` — hand-written descriptions, names and args checked by the test.
- `ai-tools.mdx` sections with ids: `what`, `setup` (tabs: Claude Code, Cursor, VS Code, Claude Desktop — reuse `samples/ai/*`), `tools`, `resources`, `prompts`, `versions` (the server warns when its major/minor differs from the installed slotsmith).
- `about.mdx`: author, links (portfolio, LinkedIn, npm, email) ported from the old `Author.tsx`.

- [ ] **Step 1: Write the failing test:** parse `packages/ai/src/mcp/server.ts` as text and extract registered tool, prompt and resource names (and prompt argument names); assert they equal `MCP_TOOLS` / `MCP_PROMPTS` / `MCP_RESOURCES` names and args exactly. Current expected tools: `list_components, get_component_api, list_slots, get_slot, get_adapter_example, get_setup, search_docs`; prompts: `build-component`, `adapt-slots-to-library(component, library)`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** test, `check`, `build` → PASS.
- [ ] **Step 5: Commit** `docs: add the AI tools and about pages`

## Final verification for plan 05

- CI builds both framework examples.
- `/getting-started/`, `/guides/`, `/theming/`, `/languages/`, `/ai-tools/`, `/about/` have no stub marker; the landing's `/theming/#tailwind` link lands on real content.
- `verify-site` passes.
