# Docs launch site — plan index and handoff

Read this file first, then the spec, then plan 01.

**Spec:** `docs/superpowers/specs/2026-09-29-docs-launch-site-design.md`

## What this is

The slotsmith docs site moves from a separate repo (`tmzm/slotsmith-docs`,
checked out at `E:\Projects\Personal\react-data-table-docs`, a hash-routed Vite
SPA) into this repo as `docs/`, an Astro site with React islands. The spec says
what to build; these plans say how, in order.

## How to start

1. Finish and commit your current work on `master` (the antd suites etc.).
   Delete or git-ignore `src/__scratch__/` first: its probe test matches the
   vitest include pattern and runs with the suite.
2. `git checkout docs/launch-site && git rebase master`. The branch holds only
   the spec and these plans, so the rebase is trivial.
3. `pnpm install && pnpm build && pnpm test` — must be green before Task 1.
4. Execute the plans in order. Each plan ends with a working, deployable site;
   do not start a plan before the previous one's final verification passes.

## Plans, in order

| # | File | Delivers |
| --- | --- | --- |
| 01 | `…-01-foundation.md` | Astro app in `docs/`, `/` and `/ar/` routing, layout, sidebar, header, redirects, the sample pipeline, generated reference, the post-build verifier, CI |
| 02 | `…-02-landing.md` | The landing page, sections a–h, including the swap demo |
| 03 | `…-03-data-table.md` | The component page template, applied to the data table |
| 04 | `…-04-other-components.md` | Autocomplete, date picker, file uploader on that template |
| 05 | `…-05-getting-started-and-guides.md` | Getting started, `/guides/`, theming, languages, AI tools, about |
| 06 | `…-06-trust.md` | Generated facts, coverage, sizes, axe results, the Trust page |
| 07 | `…-07-roadmap-comparison-changelog.md` | Roadmap, Comparison (researched), Changelog |
| 08 | `…-08-seo-search-performance.md` | sitemap, robots, llms.txt, OG images, Pagefind, Lighthouse ≥ 95, README and package.json positioning, Netlify switch, final report |

## Rules for every plan

- Commit messages: one line, conventional (`feat:`, `fix:`, `docs:`,
  `chore:`, `test:`, `refactor:`). No body. **No AI attribution of any kind**
  (no `Co-Authored-By`, no "Generated with"). One commit per task unless a
  task says otherwise.
- Stage only the files the task names. Never stage unrelated work in progress.
- Do not change library source (`src/**` outside tests, `packages/ai/src/**`,
  `packages/ai/scripts/**`). When you find a library problem, add it to
  `docs/LAUNCH-REPORT.md` under "Library issues" (plan 08 creates the final
  version; create the file early if you need it) and move on. The owner
  decides which tiny fixes to make.
- Allowed outside `docs/`: `pnpm-workspace.yaml`, root `README.md`, root
  `package.json` (`description`, `homepage`, `devDependencies`), root
  `netlify.toml`, `packages/ai/package.json` `homepage`, `.github/workflows/`.
- Anything needing the owner's judgement (hosting, domain, policy text, a
  library fix): write it in `docs/LAUNCH-REPORT.md` under "Needs a decision",
  pick the reversible default, keep going.
- Copy rules: plain, specific, short sentences, no marketing adjectives. Every
  claim about a feature links to its live demo.

## Audit findings (from the old site, 2026-09-29)

These were found before the plans were written. The plans fix the docs-side
ones; the library-side ones go into the final report.

### Old site: samples that did not compile (fix when porting)

- MUI samples import nothing they use: `DataTablePage:26` (`Checkbox`,
  `Pagination`), `FileUploaderPage:39` (`Avatar`, `icons`),
  `AutocompletePage:111` (`CloseIcon`, `CircularProgress`, `Chevron`),
  `DatePickerPage:87` (`Chevron`, `TodayIcon`).
- `DataTablePage:82` and `src/content/slots.ts` snippets use undefined
  `Button`, `GripVertical`, `track`. shadcn skin samples use undefined
  `CheckIcon`, `Badge`.
- `AutocompletePage:58` spreads the whole `useAsyncOptions()` result, including
  `reload`, onto `<Autocomplete>`; `reload` is not a provider key, so it lands
  on the root `<div>` and React warns. Destructure `reload` out.
- `Skins.tsx`, `UploaderSkins.tsx` contain literal `…`; `DatePickerPage:36`
  uses top-level `await`.
- The AI tools page lists the `adapt-slots-to-library` prompt without its
  required `component` and `library` arguments, and advertises a `radix`
  adapter library that has no adapters.

### Old site: content errors (do not carry over)

- "No runtime dependencies" is false: `@floating-ui/react-dom` is a dependency.
- The table slot list had 21 of 22 slots (missing `FooterRow`).
- The peers table said the autocomplete and uploader need nothing; their
  virtual variants need `@tanstack/react-virtual`.
- `VirtualFileUploader`, the uploader's `compact` variant and its compound
  parts were undocumented.
- `@slotsmith/table` is not the package name; it is `slotsmith`.

### Positioning that must change (plan 08 does the library files)

- Root `package.json` description: "…Starting with the data table."
- `src/data-table/index.ts` header calls the library "a headless… React data
  table" (library source: report only; it feeds the MCP table summary).
- Old site `index.html` title/description, its README, `netlify.toml`,
  `PRODUCT.md`, `DESIGN.md` (these are replaced, not edited).

### Library issues to report (plan 08 puts these in the final report)

1. No `LICENSE` file; package.json and README say ISC. No `SECURITY.md`.
2. Themes are listed as Unreleased while the version is 1.6.0 (published);
   bump before release.
3. `slotsmith-ai` on npm is 1.4.0; local is 1.6.0. `npx slotsmith-ai` warns.
4. `import … from "slotsmith"` (main entry) statically loads a chunk importing
   `@tanstack/react-table`, contradicting "Autocomplete needs no peers".
   Per-component entries are clean. Needs a real-app check.
5. `splitDataTableProps` is documented as public but not exported.
6. README sizes out of date: `styles.css` 24.4 → 25.8 KB, CommonJS "23 KB" →
   27.6 KB. `dist` CSS is not minified.
7. One `.d.ts` serves both `import` and `require`; declarations emitted with
   Bundler resolution. Run arethetypeswrong.
8. JSDoc gaps: `Constraints.accept/maxSize/minSize` (units not stated), seven
   `FileUploaderLabels` keys, per-slot docs on `AutocompleteComponents` and
   `DatePickerComponents`, `DataTableLabels.error` default not stated.
9. axe-core runs in only 2 data-table tests; the other components' "a11y"
   suites are manual ARIA checks.
10. `src/__tests__/bundle.test.ts:249-251` comment is stale (the uploader no
    longer borrows the table's class helper).
11. MCP knowledge: no shadcn/chakra adapter for the file uploader; `radix`
    accepted but has no adapters; `packages/ai` uses TypeScript ^6 vs root ^7.
12. The generator's `dataAttributes` per slot are incomplete (the table's
    `Row` reports 3 of 5).
