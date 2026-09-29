# Docs launch site — design

Date: 2026-09-29. Branch: `docs/launch-site`. Status: awaiting review.

## Goal

Replace the hash-routed Vite SPA (`tmzm/slotsmith-docs`) with a static,
indexable docs site inside this repo. The landing page sells the library in 30
seconds; each component page takes an engineer from `npm i` to a working
component without outside help.

## Positioning

Used verbatim in `<title>` of the landing page, the meta description, the hero,
the README and `package.json` `description`:

> Finished data table, combobox, date picker and file uploader for React that
> drop into shadcn/ui, MUI, Chakra or your own design system. Every part is a
> slot; what you don't replace still looks finished.

Where space is short (OG images, the landing meta description if it exceeds
160 characters), use only the first sentence.

The combobox is exported as `Autocomplete`. Its URL and heading use the export
name (`/components/autocomplete/`, "Autocomplete"); its one-line description is
"Combobox and select in one component". Positioning copy says "combobox".

## Decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Framework | Astro (latest major) + React islands | Brief's preference. The current app renders only in the browser and has its own router, so keeping it would mean rebuilding it anyway. Astro prerenders every route and ships zero JS for prose. |
| Location | `docs/` in this repo, a pnpm workspace package `slotsmith-docs` (private) | Samples are type-checked and rendered against the library source in the same CI run. A library change that breaks a sample fails its own PR. |
| Library import | Workspace alias to `../src` (as today), plus sub-path entries (`slotsmith/data-table`, per-component CSS, themes) | The docs show the unreleased source. The old site could not import the sub-entries its own docs recommended. |
| Site URL | One value, `SITE_URL` in `docs/site.config.ts`, currently `https://slotsmith-docs.netlify.app` | `slotsmith.dev` is coming. Switching is one edit plus the prepared 301 in `_redirects`. |
| Hosting | Netlify, building from this repo with base directory `docs/` | Already in use. Pointing the Netlify site at `tmzm/slotsmith` is done by the owner in the Netlify UI. |
| Languages | English at `/…`, Arabic at `/ar/…`, from one set of templates | See "Languages". |
| Search | Pagefind, one index per language | Static, no service, runs after the build. |
| Theme | Keep DESIGN.md: navy + gold, dark default, light toggle | It already matches the author's brand. `DESIGN.md` and `PRODUCT.md` move into `docs/` and are updated to the new positioning and multi-page site. |

## Site map

Every English page below also exists at `/ar/<same path>`.

```
/                                    landing
/getting-started/
/guides/                             slots: element vs widget parts, data-* state, wrapping fallbacks, compound parts, headless hooks
/components/<c>/                     overview, install, quick start, guide index, accessibility, limitations
/components/<c>/guides/<g>/          one page per feature
/components/<c>/api/                 slots, props, labels & locales, styling
/components/<c>/adapters/            shadcn, MUI, Chakra
/theming/
/languages/
/ai-tools/
/trust/
/roadmap/
/comparison/
/changelog/
/about/
/sitemap.xml  /robots.txt  /llms.txt  /llms-full.txt  /og/<page>.png
```

`<c>` is `data-table`, `autocomplete`, `date-picker`, `file-uploader`.

Guides per component (each has a live example and its complete code):

- **data-table:** sorting-and-selection, pagination, server-data (TanStack
  Query), tree-rows, virtual-rows, row-reorder, footers, headless-hook
- **autocomplete:** select-or-combobox, multiple, remote-options, states,
  creatable, virtual, compound-parts
- **date-picker:** modes, bounds-and-blocked-days, presets, day-content,
  compound-parts
- **file-uploader:** picker, uploads, tile, compact, editing-a-record,
  validation, virtual

Why split a component into four URLs instead of one long page: each guide is
its own search result, and no page loads more than one or two demos, which
keeps Lighthouse ≥ 95 reachable. The overview page lists every section of the
brief's template in order and links to where each lives, so the template reads
as one path: Overview → Install → Quick start → Guides → Slots → Props →
Labels & locales → Styling → Adapters → Accessibility → Limitations.

Sidebar groups: Getting started · Components · Guides · Theming · Languages ·
AI tools · Trust · Roadmap · Comparison · Changelog. Header: wordmark, version
badge (read from the root `package.json`), search, GitHub, npm, language
switch, theme switch. Footer of every page: "Edit this page" (links to the
page's source file on GitHub, branch `master`), license, author.

## Directory layout

```
docs/
  astro.config.ts           site, i18n, integrations, vite aliases to ../src
  site.config.ts            SITE_URL, repo, branch, npm name
  package.json              private, "slotsmith-docs"
  tsconfig.json             includes src/ and samples/
  public/                   fonts (woff2 subsets), favicon, _redirects, robots.txt
  scripts/
    reference.ts            builds src/generated/reference/*.json from source
    facts.ts                builds src/generated/facts.json (tests, sizes, versions)
    render-samples.ts       renders every sample in a browser, runs axe, writes results
    changelog.ts            parses the Changelog section of ../README.md
  samples/<area>/<name>.tsx every code sample shown on the site
  src/
    i18n/                   messages.en.ts, messages.ar.ts, t(), route helpers
    layouts/                Base, Docs
    components/             Astro components (Sidebar, Head, SlotTable, PropTable, …)
    islands/                React demos (SwapDemo, LocaleDemo, …)
    content/
      guides/en/*.mdx       prose; ar/*.mdx optional twins
      components/…          same pattern
    pages/[...lang]/…       one template per page, generated for "" and "ar"
    generated/              build output of scripts/ (git-ignored)
```

## Rendering and URLs

- `output: "static"`, `trailingSlash: "always"`, `build.format: "directory"`.
- Pages are prerendered HTML. React is shipped only for islands, hydrated with
  `client:visible` (below the fold) or `client:idle` (the landing hero).
- Everything that reads the browser (theme, stored language, `today()`) runs
  in effects or in a tiny inline script in `<head>` that sets `data-theme`
  before paint. Date demos fix their "today" to a constant during prerender and
  switch to the real date after hydration, so the HTML never mismatches.

### Redirects from the old site

Browsers never send the part after `#` to a server, so hash URLs cannot get a
server 301. Two layers:

1. An inline script on `/` maps `location.hash` and calls `location.replace()`.
2. `public/_redirects` sends real 301s for the path forms
   (`/docs/data-table` → `/components/data-table/`), for anyone who
   hand-edits the URL.

| Old | New |
| --- | --- |
| `#/` | `/` |
| `#/docs/installation` | `/getting-started/` |
| `#/docs/slots` | `/guides/` |
| `#/docs/theming` | `/theming/` |
| `#/docs/locales` | `/languages/` |
| `#/docs/ai-tools` | `/ai-tools/` |
| `#/docs/data-table` | `/components/data-table/` |
| `#/docs/file-uploader` | `/components/file-uploader/` |
| `#/docs/autocomplete` | `/components/autocomplete/` |
| `#/docs/date-picker` | `/components/date-picker/` |
| `#/docs/author` | `/about/` |
| any other `#/…` | `/` |

Prepared, commented out until the domain exists:
`https://slotsmith-docs.netlify.app/* https://slotsmith.dev/:splat 301!`.

The root `README.md` and `packages/ai/package.json` `homepage` switch to the
new path URLs in the same change.

## Languages

- **Routes:** one template per page under `src/pages/[...lang]/`, with
  `getStaticPaths` returning `lang: undefined` and `lang: "ar"`. There are no
  per-language page files or components.
- **UI text:** one typed catalog, `messages.en.ts` defines the keys,
  `messages.ar.ts` must satisfy `Record<keyof typeof en, string>` so a missing
  Arabic key fails `tsc`. Ported from today's `en.ts`/`ar.ts` where the string
  still applies.
- **Prose:** MDX in `content/**/en/`. An `ar/` file with the same slug
  replaces it; without one, `/ar/` renders the English text inside
  `lang="en" dir="ltr"` with a one-line Arabic note saying the page is not yet
  translated.
- **Generated tables** (props, slots, labels) come from English JSDoc and stay
  English on both.
- `/ar/` pages set `<html lang="ar" dir="rtl">`, use IBM Plex Sans Arabic, and
  mirror the layout with logical CSS properties. Every page emits `hreflang`
  links for `en`, `ar` and `x-default`.
- Demos inside `/ar/` pages render with the Arabic locale pack and RTL, as the
  current site does.

## Code samples

Brief requirement 8: every sample is a file that is type-checked, and rendered
where it renders.

- Each sample is `docs/samples/<area>/<name>.tsx`, a complete module that
  imports only from `slotsmith…` and real dependencies, and default-exports a
  component (or, for non-rendering snippets such as a `next.config` or a CSS
  file, is a `.ts`/`.css` file with no default export).
- A page shows a sample with `<Sample name="data-table/quick-start" />`. The
  component reads the file as text for the code block and, when the sample
  renders, imports the same file as the live island. What you read is what
  runs.
- Short illustrative fragments (one prop, one CSS rule) may stay inline in MDX
  only if they appear in a file under `samples/` too; the build checks that
  every fenced `tsx`/`ts` block in MDX appears verbatim in some sample file,
  and fails otherwise.
- `pnpm --filter slotsmith-docs check` runs `tsc --noEmit` over `samples/`
  and `src/`.
- `scripts/render-samples.ts` builds a sample gallery page, opens every
  rendering sample in headless Chromium (Playwright), fails on any console
  error or React warning, runs axe-core on every fallback sample, and writes
  `generated/a11y.json`. The Trust page publishes that file.

The Next.js App Router and Vite examples are small, complete projects in
`docs/samples/frameworks/{next-app,vite}/`. CI builds both. The Getting
Started page shows their key files.

## Generated reference

Brief requirement 4: props and slots come from source.

`scripts/reference.ts` calls `generateKnowledge()` from
`packages/ai/scripts/generate.ts` (it is already exported and already reads
the TypeScript compiler API), then writes one JSON per component to
`src/generated/reference/`. It runs as the first step of `dev` and `build`.

It provides, per component:

- **Props:** name, type, required, default (parsed from "Defaults to …"),
  description, group. Inherited DOM props are summarised in one line, not
  listed.
- **Slots:** name, kind (element / widget), props with types and
  descriptions, the fallback's source, data attributes.
- **Labels:** key, type, English default, description.
- **Parts, hooks, entry, CSS file, peers.**

Two additions made on the docs side, without changing the generator:

- **Data attributes.** The generator's list is incomplete (the table's `Row`
  reports 3 of its 5 attributes). The sample renderer records every `data-*`
  attribute on every element carrying a slot class, per slot, and the build
  merges that list with the generator's. A slot whose rendered attributes
  aren't in the table fails the build.
- **Styling.** Class names come from each component's `classes.ts` (the
  generator already reads them); tokens are read from the component's CSS by
  matching `--s[a-z]+-[a-z-]+` and `--ss-*`.

Generator gaps found along the way (e.g. missing per-slot docs on the
autocomplete and date-picker slots) go on the library-issues list, not fixed
here.

## Pages

### Landing (in this order)

1. **Positioning + install.** The positioning text, a copyable
   `npm i slotsmith` (with a pnpm / yarn / bun switch), and links to Getting
   started and GitHub.
2. **Swap demo.** A live `DataTable` with a segmented control: Fallback,
   shadcn, MUI, Chakra. Switching changes only the `components` prop. Beside
   it, the code with the lines that change highlighted.
   - The fallback renders in the prerendered HTML.
   - Each design-system adapter is a separate dynamic import, prefetched on
     hover, focus or touchstart of its segment. Not on idle: evaluating MUI or
     Chakra on idle adds main-thread work that Lighthouse counts.
   - The shadcn adapter uses real shadcn component sources (Radix + Tailwind);
     its Tailwind CSS is compiled at build into a stylesheet scoped to the
     demo and loaded with the adapter.
   - MUI and Chakra run inside their own providers, created only when chosen.
   - The demo box has fixed dimensions per breakpoint, so no layout shift.
   - Adapters come from the library's tested integration adapters
     (`src/*/__tests__/integrations/*/components.tsx`), copied into
     `samples/adapters/` so the site and the Adapters pages show the same code.
3. **Two kinds of parts.** The README's element/widget table, with one short
   example of each.
4. **The four components.** One card each: name, one line, a live mini demo
   (`client:visible`), link.
5. **Works with what you have.** shadcn, MUI, Chakra, Tailwind, TanStack
   Table, TanStack Query. Each links to the page or guide that shows it
   working. Logos are inline SVGs, monochrome.
6. **Languages and RTL.** A `DataTable` with an en / ar / fa toggle; direction
   flips live.
7. **Use with AI agents.** `slotsmith-ai` setup for Claude Code, Cursor,
   VS Code, as tabs.
8. **Trust strip.** Test count, integration suites, bundle size, license,
   React versions. Every number comes from `generated/facts.json` and links to
   `/trust/`.

### Component pages

- **Overview** (`/components/<c>/`): what it is (one paragraph), live demo,
  Install (with this component's peers and CSS import), Quick start (a
  standalone sample), the guide list, Accessibility (keyboard map as a table,
  ARIA roles and states, screen-reader announcements), Limitations (an honest
  list from the code and README).
- **Guides:** one page each, as listed above.
- **API** (`/api/`): Slots, Props, Labels & locales, Styling, all generated.
  - Slots table columns: name, kind, props it receives, default fallback (the
    fallback source, collapsed), `data-*` attributes.
  - Styling: class names, tokens, dark mode.
- **Adapters** (`/adapters/`): tabs for shadcn, MUI, Chakra. Each shows the
  full adapter file and a live table/combobox/… using it.

Limitations known today (the list to start from):

- Data table: `VirtualDataTable` ignores row reorder; a drop while sorted
  reorders `data` but the view stays sorted; no dragging between tables, no
  multi-row drag, no moving a row to another parent; a custom `Row` slot must
  keep a stable identity.
- Date picker: Gregorian calendar only.

### Getting started

Install; styles (everything, one component, none); theming with `--ss-*`
tokens and the six themes, each shown live on the same component; dark mode;
`SlotsmithProvider` and locales; the CommonJS note; the Next.js App Router
and Vite examples.

### Trust

Everything on it is generated at build except the policy text:

- Tests: count of files and cases, from `vitest run --reporter=json`.
  Coverage from `vitest --coverage` (adds `@vitest/coverage-v8` as a root
  dev dependency).
- The integration suites (shadcn, MUI, Chakra, and the others in the repo at
  build time) and what each asserts, summarised from the test titles.
- The tree-shaking test and what it proves.
- axe-core results for every fallback demo (from `render-samples.ts`).
- Bundle size per entry, measured with esbuild at build (minified and
  gzipped).
- Browser support (stated as: the last two versions of Chrome, Edge, Firefox,
  Safari; ES2022, `Intl`, `IntersectionObserver`), React 18 and 19.
- SemVer and support policy, changelog link, security policy.

The security policy and support policy need text the owner agrees to. Drafts
are written into the page and listed in the final report for approval.

### Roadmap and Comparison

- Roadmap: what is shipped, in progress (from the README's Unreleased
  section) and planned (Hijri and Persian calendars, server-side locales,
  others from `TODO(...)` comments). No dates.
- Comparison: Material React Table, Mantine React Table, the shadcn data-table
  recipe, React Aria Components, Ark UI / Park UI. A facts table (what
  components, styling model, how parts are replaced, peers, license, RTL,
  virtualisation) with a source link and a "checked on" date per row, and an
  "I'm wrong? Open an issue" link. No adjectives.

### Changelog

Generated from the `## Changelog` section of the root README.

## SEO

- Every page has a unique `<title>` (`<Page> · slotsmith`, the landing uses
  the positioning), meta description (from frontmatter; the build fails when
  one is missing or duplicated), canonical URL, `hreflang` links, Open Graph
  and Twitter card tags.
- OG images: one PNG per page, generated at build with satori +
  @resvg/resvg-js from the page title and section, in the site palette.
- `/sitemap.xml` from an Astro endpoint listing every page with its
  `hreflang` alternates; `robots.txt` pointing at it.
- `/llms.txt`: title, positioning, and a linked list of every page with its
  description. `/llms-full.txt`: every page's prose plus the generated
  reference as plain Markdown. Both generated from the content collections.

## Performance

Targets: Lighthouse mobile ≥ 95 (all four categories) on `/` and
`/components/data-table/`, CLS 0 from demos (the Lighthouse CI gate is
CLS ≤ 0.01, to absorb rounding).

- Fonts self-hosted as woff2 subsets (Latin for Inter and JetBrains Mono,
  Arabic for IBM Plex Sans Arabic on `/ar/` pages only); Inter 400 and 700
  preloaded; `font-display: swap` with metric-matched fallbacks.
- Landing initial JS budget: 90 KB gzipped (React + the fallback DataTable +
  segmented control). MUI, Chakra, the shadcn bundle, locale packs and
  TanStack Virtual are never in the initial load.
- Demos reserve their height in CSS.
- Lighthouse CI runs in the docs workflow and fails below 95.

## CI

A GitHub Actions workflow, `.github/workflows/docs.yml`, on pushes and PRs
touching `src/`, `docs/`, `packages/ai/` or the README:

1. `pnpm install --frozen-lockfile`, `pnpm build` (library).
2. `pnpm --filter slotsmith-docs check` (types for site and samples).
3. `pnpm --filter slotsmith-docs build`, which runs reference → facts →
   Astro build → render-samples (console errors, React warnings, axe, data-*
   check) → Pagefind.
4. Build the Next.js and Vite example projects.
5. Lighthouse CI on `/` and `/components/data-table/`.

Netlify builds from `docs/` with `pnpm --filter slotsmith-docs build`. The
committed `dist/` goes away. Linking the Netlify site to `tmzm/slotsmith` is
done by the owner in the Netlify UI.

## Changes outside `docs/`

Allowed, each its own commit:

- `README.md`: new positioning, links to the new path URLs; where README and
  docs overlap, the README keeps a short version and links to the docs page.
- `package.json` `description` (new positioning) and `homepage`.
- `packages/ai/package.json` `homepage`.
- `pnpm-workspace.yaml`: add `docs`.
- Root dev dependency `@vitest/coverage-v8`, for the coverage figure.

Not allowed: library source changes. Tiny fixes found along the way are
listed separately, and only made after the owner agrees.

Never staged: the owner's uncommitted work in the main checkout (the antd
suites, the scratch probe, their `package.json` edits). This work happens in a
separate worktree.

## Out of scope

- Translating guide prose into Arabic beyond what exists today.
- Buying or configuring the `slotsmith.dev` domain.
- Publishing the library or `slotsmith-ai`.
- Archiving `tmzm/slotsmith-docs`.

## Risks

- **Coverage run time.** Adding coverage slows the test job. Coverage runs
  once per docs build, not on every test run.
- **shadcn in the swap demo** needs Tailwind at build for one island only. If
  the scoped stylesheet leaks, fall back to prefixing its classes with a
  wrapper selector.
- **Comparison facts** go stale. Each row carries its check date and source.
- **Chakra and MUI weight** only affects the swap demo and adapter pages, where
  they are lazy.
