# Docs launch 04 — Autocomplete, date picker, file uploader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete docs for the autocomplete, date picker and file uploader on the plan-03 template: overview, every guide, adapters, accessibility and limitations.

**Architecture:** No template changes. Each component adds its overview MDX, guide MDX, samples and adapter samples. If a component needs a template change, stop and make it a separate task that also re-verifies the data table.

**Tech Stack:** plan 01–03 stack.

**Spec:** `docs/superpowers/specs/2026-09-29-docs-launch-site-design.md` (sections "Site map", "Component pages")

## Global Constraints

- Everything in plan 03's Global Constraints applies.
- The autocomplete's page title is "Autocomplete"; its summary line is "Combobox and select in one component."
- Guide slugs are exactly those in `COMPONENTS` (plan 01 Task 4).
- Adapters come from `src/<component>/__tests__/integrations/{shadcn,mui,chakra}/components.tsx`. The file uploader's MCP knowledge lacks shadcn/Chakra adapters, but the integration suites have them; use those.
- Port from the old site where a demo exists (`AutocompletePage.tsx`, `AutocompleteStates.tsx`, `AutocompleteSkins.tsx`, `DatePickerPage.tsx`, `DatePickerStates.tsx`, `DatePickerSkins.tsx`, `FileUploaderPage.tsx`, `UploaderSkins.tsx`, `lib/fakeCatalog.ts`, `lib/fakeUpload.ts`), fixing the audit's broken samples. Rename the fake catalog's `@slotsmith/…` package names to something that is not a real npm scope (e.g. `@acme/…`).
- Date demos must be deterministic during prerender: samples take "today" from a `useToday()` helper in `samples/shared/today.ts` that returns a fixed ISO date (`"2026-03-16"`) on the server and during hydration, then the real date after mount.

## Review Focus

- **Autocomplete in multiple mode, keyboard only:** Backspace with an empty query removes the last tag; the live region announces result counts.
- **Date picker range across a month boundary in RTL (`/ar/`):** arrow keys move visually (mirrored), PageDown changes month, the range stays selected.
- **File uploader with a rejected file** (too large, wrong type) shows the rejection with the English (or Arabic on `/ar/`) validation label and is announced.
- **Remote options guide under a slow network** shows loading and keeps previous results; typing fast does not show stale results for an earlier query.
- **Hydration of date demos** produces no React hydration warning (verify-site treats console warnings as failures).

---

### Task 1: Autocomplete

**Files:**
- Create: `docs/src/content/docs/en/components/autocomplete/index.mdx`, `…/autocomplete/guides/{select-or-combobox,multiple,remote-options,states,creatable,virtual,compound-parts}.mdx`, samples `docs/samples/autocomplete/{overview,quick-start,labels,select-or-combobox,multiple,remote-options,states,creatable,virtual,compound-parts}.tsx`, `docs/samples/shared/fake-catalog.ts`, `docs/samples/adapters/autocomplete/{shadcn,mui,chakra,shadcn-demo,mui-demo,chakra-demo}.tsx`
- Modify: `docs/scripts/slot-selectors.ts` only if a selector turns out wrong, `docs/src/data/data-attributes.json` for attributes `verify-site` reports
- Test: `docs/samples/__tests__/autocomplete.test.tsx`

**Interfaces:**
- `remote-options.tsx` uses `useAsyncOptions` and destructures `reload` out before spreading the rest onto `<Autocomplete>` (the audit's bug). `fake-catalog.ts` exports `searchPackages(query: string, page: number, signal: AbortSignal): Promise<{ options: Pkg[]; hasMore: boolean }>`, deterministic, 250 ms delay, honours `signal`.
- `virtual.tsx`: `VirtualAutocomplete` from `slotsmith/virtual` with 5,000 options.
- Accessibility section (from `core/useAutocomplete.ts`): closed — Enter / Space / ArrowDown / ArrowUp open (ArrowUp highlights the last option), typeahead when `searchable={false}`; open — ArrowUp/Down, Home/End, PageUp/PageDown, Enter selects, Escape closes and refocuses the trigger, Tab closes, Backspace removes the last tag in multiple mode with an empty query; `role="combobox"` trigger, `listbox`/`option`, `aria-activedescendant`, `aria-multiselectable`, `aria-busy`; result counts via a `role="status"` live region; naming attributes route to the trigger.
- Limitations: list only what the source confirms (read `src/autocomplete/**` for `TODO(` and README notes). If nothing is confirmed, write the section as what it deliberately does not do (e.g. it does not fetch; `useAsyncOptions` calls your function), each verified in source.

- [ ] **Step 1: Write the failing test** (jsdom): quick start opens with ArrowDown and selects with Enter; multiple sample shows two tags and Backspace in the empty search removes one; remote-options (fake timers) shows loading then options, and a second query aborts the first (`signal.aborted`); states sample renders the empty, loading and error rows; creatable shows the create option for an unknown query.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** samples, adapters and MDX.
- [ ] **Step 4: Run** test, `check`, `build` → PASS; no autocomplete page has `data-stub`; `verify-site` data-attribute check passes for the autocomplete.
- [ ] **Step 5: Commit** `docs: add the autocomplete docs`

### Task 2: Date picker

**Files:**
- Create: `docs/src/content/docs/en/components/date-picker/index.mdx`, `…/date-picker/guides/{modes,bounds-and-blocked-days,presets,day-content,compound-parts}.mdx`, samples `docs/samples/date-picker/{overview,quick-start,labels,modes,bounds-and-blocked-days,presets,day-content,compound-parts}.tsx`, `docs/samples/shared/today.ts`, `docs/samples/adapters/date-picker/{shadcn,mui,chakra,shadcn-demo,mui-demo,chakra-demo}.tsx`
- Test: `docs/samples/__tests__/date-picker.test.tsx`, `docs/samples/shared/__tests__/today.test.tsx`

**Interfaces:**
- `shared/today.ts`: `export const PRERENDER_TODAY = "2026-03-16"; export function useToday(): ISODate` — `useSyncExternalStore` with server snapshot `PRERENDER_TODAY` and client snapshot the real date, so hydration matches and the value updates after mount.
- Accessibility section (from `core/useDatePicker.ts`): trigger Enter / Space / ArrowUp / ArrowDown opens; grid arrows (mirrored in RTL), Home/End, PageUp/PageDown (Shift = year), Enter/Space picks, Escape closes; trigger `role="combobox"` with `aria-haspopup="dialog"`; non-modal `role="dialog"`; `grid` / `row` / `columnheader` / `gridcell`, `aria-selected`, `aria-current` on today, roving tabindex; blocked days `aria-disabled` but focusable.
- Limitations: Gregorian calendar only (Hijri and Persian are planned — link `/roadmap/`); plus anything else the source confirms.

- [ ] **Step 1: Write the failing tests.** `useToday` rendered with `renderToString` returns `PRERENDER_TODAY`. Date picker (jsdom): range sample — picking two days sets `data-range-start` and `data-range-end`; bounds sample — a day before `minDate` has `aria-disabled="true"` and stays focusable; presets — clicking a preset sets the value; RTL — with `locale="ar"` and `dir="rtl"`, ArrowLeft moves focus to the next day.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** tests, `check`, `build` → PASS; no hydration warning in `verify-site`.
- [ ] **Step 5: Commit** `docs: add the date-picker docs`

### Task 3: File uploader

**Files:**
- Create: `docs/src/content/docs/en/components/file-uploader/index.mdx`, `…/file-uploader/guides/{picker,uploads,tile,compact,editing-a-record,validation,virtual}.mdx`, samples `docs/samples/file-uploader/{overview,quick-start,labels,picker,uploads,tile,compact,editing-a-record,validation,virtual}.tsx`, `docs/samples/shared/fake-upload.ts`, `docs/samples/adapters/file-uploader/{shadcn,mui,chakra,shadcn-demo,mui-demo,chakra-demo}.tsx`, a local image `docs/public/samples/avatar.jpg` (replaces the old site's picsum URL; no third-party request)
- Test: `docs/samples/__tests__/file-uploader.test.tsx`

**Interfaces:**
- `shared/fake-upload.ts`: `export function fakeUpload(file: File, ctx: { signal: AbortSignal; onProgress(p: number): void }, opts?: { fail?: boolean }): Promise<{ url: string }>` — progress in 5 steps over 1 s, honours `signal`, resolves `/samples/uploaded/<name>`.
- `compact.tsx` documents the `compact` variant (missing on the old site). `virtual.tsx` documents `VirtualFileUploader` (missing on the old site). `editing-a-record.tsx` starts from `defaultValue` with the local avatar URL.
- The overview's Reference section also lists the compound parts (`FileUploader.Provider`, `Root`, `Dropzone`, `Compact`, `List`, `Item`, `Actions`, `Rejections`) — these come from the reference's `parts`, not typed by hand.
- Accessibility section (from `core/useFileUploader.ts`): dropzone `role="button"` with tabindex, Enter/Space opens the file dialog; the real `<input type="file">` stays in the accessibility tree; progress `role="progressbar"` with `aria-valuenow/min/max`; rejections announced via `aria-live`.
- Labels & locales: the file uploader has two label sections, `fileUploader` and `fileValidation`. `LabelTable` must show both: if the reference lists validation labels separately, render a second table; if not, add them to the reference in `scripts/reference.ts` from `defaultValidationLabels` (docs-side only).

- [ ] **Step 1: Write the failing test** (jsdom): quick start — `userEvent.upload` of a file lists it; uploads — progress bar reaches `aria-valuenow="100"` (fake timers) and a failing upload shows retry; validation — a 6 MB file with `maxSize` 5 MB is rejected with the `tooLarge` text; compact — renders `data-variant="compact"`; virtual — renders a scroll container with fewer DOM items than files.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** test, `check`, `build` → PASS; no file-uploader page has `data-stub`.
- [ ] **Step 5: Commit** `docs: add the file-uploader docs`

## Final verification for plan 04

- All four components have overview, all guides, API and adapters pages in both languages, with no stub markers.
- `verify-site`: no console errors or warnings, axe clean on every fallback demo, data-attribute check passes for all four components, no dead links.
