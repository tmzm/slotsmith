# Docs launch 08 — SEO, search, performance and launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** sitemap, robots, llms.txt, OG images, static search, Lighthouse ≥ 95 on mobile, the new positioning in the README and package.json, Netlify building from this repo, and the launch report.

**Architecture:** SEO files are Astro endpoints generated from the same page list the site uses. Pagefind indexes `dist/` after the Astro build. Lighthouse CI runs against `dist/` in the docs workflow. `DOCS_STRICT=1` turns remaining stubs into a build failure.

**Tech Stack:** plan 01–07 stack; `satori`, `@resvg/resvg-js`, `pagefind`, `@lhci/cli`.

**Spec:** `docs/superpowers/specs/2026-09-29-docs-launch-site-design.md` (sections "SEO", "Performance", "CI", "Changes outside `docs/`")

## Global Constraints

- All absolute URLs come from `SITE.url`.
- Lighthouse mobile (default Lighthouse CI preset) ≥ 0.95 in performance, accessibility, best practices and SEO for `/` and `/components/data-table/`; CLS ≤ 0.01.
- Positioning text, verbatim: "Finished data table, combobox, date picker and file uploader for React that drop into shadcn/ui, MUI, Chakra or your own design system. Every part is a slot; what you don't replace still looks finished."
- README and docs: where they overlap, the docs are canonical; the README keeps a short version and links to the docs page.
- In the root `package.json`, change only `description`, `homepage` and the coverage devDependency added in plan 06. Stage by hunk if the owner has other edits in that file (`git diff` first; never stage theirs).
- Netlify site settings (linking the repo) are the owner's action; this plan prepares the config and writes the steps in the report.

## Review Focus

- **Two pages with the same description** (easy with component guides) must fail `verify-site`, which already checks this — make sure OG and llms generation don't mask it by reusing a fallback description.
- **Search on `/ar/`** returns Arabic-page results (Pagefind splits indexes by `lang`), and the search UI is RTL there.
- **When JS fails to load,** no dead search control appears: the search button is rendered only after hydration.
- **An OG image for a very long title** wraps within the image, not cut off; Arabic titles render with the Arabic font, right-aligned.
- **`/llms-full.txt` size:** stays under 1 MB; if it exceeds, drop fallback source code from the slots section first.

---

### Task 1: OG images

**Files:**
- Create: `docs/src/lib/og.ts`, `docs/src/pages/og/[...slug].png.ts`
- Modify: `docs/src/components/Head.astro`, `docs/src/layouts/Base.astro`
- Test: `docs/src/lib/__tests__/og.test.ts`

**Interfaces:**
- Produces from `@/lib/og`:
  ```ts
  export function ogSlug(lang: Lang, path: string): string;            // ("en", "/") → "index"; ("ar", "/theming/") → "ar/theming"
  export function ogUrl(lang: Lang, path: string): string;             // SITE.url + "/og/" + ogSlug + ".png"
  export async function renderOg(input: { title: string; section: string | null; lang: Lang }): Promise<Uint8Array>; // 1200×630 PNG, site palette, satori + resvg
  ```
- Fonts for satori: `woff` files from `@fontsource/inter` (400, 700) and `@fontsource/ibm-plex-sans-arabic` (700), read with `fs` at build.
- The endpoint's `getStaticPaths` covers every page in both languages (reuse the page lists from plan 01: `langPaths`, `componentPaths`, `guidePaths`, plus the fixed pages). `Head` emits `og:image`, `og:image:width/height`, `twitter:card=summary_large_image`, `twitter:image` with `ogUrl`.

- [ ] **Step 1: Write the failing tests:** the two `ogSlug` examples; `renderOg({ title: "Theming", section: null, lang: "en" })` returns bytes starting with the PNG signature `89 50 4E 47`; a 120-character title renders without throwing.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** tests; `build` → `dist/og/index.png` and `dist/og/ar/components/data-table.png` exist; `verify-site` meta check confirms `og:image` on every page.
- [ ] **Step 5: Commit** `feat: generate open graph images for every docs page`

### Task 2: sitemap.xml, robots.txt, llms.txt, llms-full.txt

**Files:**
- Create: `docs/src/lib/pages.ts`, `docs/src/lib/seo-files.ts`, `docs/src/pages/sitemap.xml.ts`, `docs/src/pages/robots.txt.ts`, `docs/src/pages/llms.txt.ts`, `docs/src/pages/llms-full.txt.ts`
- Test: `docs/src/lib/__tests__/seo-files.test.ts`

**Interfaces:**
- Produces from `@/lib/pages`: `export async function allPages(): Promise<{ path: string; lang: Lang; title: string; description: string; kind: "landing" | "doc" | "component" | "guide" | "api" | "adapters" }[]>` — one list used by the sitemap, llms files and OG endpoint (refactor Task 1's paths onto it).
- Produces from `@/lib/seo-files` (pure):
  ```ts
  export function renderSitemap(pages: { path: string; lang: Lang }[]): string; // <urlset> with xhtml:link alternates en/ar/x-default per English path; one <url> per page per language
  export function renderRobots(): string;                                        // "User-agent: *\nAllow: /\nSitemap: <SITE.url>/sitemap.xml\n"
  export function renderLlms(pages: …[]): string;                                // "# slotsmith\n\n> <positioning>\n\n## Docs\n- [Title](url): description" (English pages only), grouped by kind
  export function renderLlmsFull(sections: { title: string; url: string; markdown: string }[]): string;
  ```
- `llms-full.txt` content: every English page's prose as Markdown (MDX body with components replaced by their sample code or omitted), then each component's generated reference as Markdown. If `packages/ai/scripts/generate.ts` exports its Markdown renderer, use it; otherwise render props/slots/labels tables from the JSON.

- [ ] **Step 1: Write the failing tests:** sitemap for one page `/theming/` contains `<loc>https://slotsmith-docs.netlify.app/theming/</loc>`, `<loc>…/ar/theming/</loc>` and `hreflang="x-default"`; robots names the sitemap; `renderLlms` starts with `# slotsmith` and the positioning quote and contains no `/ar/` URL.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** tests; `build` → the four files exist in `dist/`; `llms-full.txt` < 1 MB.
- [ ] **Step 5: Commit** `feat: add sitemap, robots and llms files to the docs`

### Task 3: Search

**Files:**
- Create: `docs/src/components/Search.astro`, `docs/src/islands/SearchDialog.tsx`
- Modify: `docs/package.json` (dev dependency `pagefind`; `build` adds `pagefind --site dist` after `astro build`, before `verify-site`), `docs/src/components/Header.astro` (fill `#search-slot`), `docs/src/layouts/Docs.astro` (`data-pagefind-body` on the prose container; `data-pagefind-ignore` on demo figures and generated fallback source)
- Modify: `docs/scripts/verify-site.ts` (search check)

**Interfaces:**
- `SearchDialog.tsx` props `{ lang: Lang }`: a button (rendered only after hydration) that opens a dialog; on first open it dynamically imports `/pagefind/pagefind.js` (`/ar/` pages use the same bundle; Pagefind picks the index by the page's `lang`); shortcut `/` and `Ctrl/Cmd+K`; results as links with excerpts; Escape closes and returns focus.
- `verify-site` search check: load `dist/pagefind/pagefind.js` through the served site in Playwright and search "reorder" → the first 5 results include `/components/data-table/guides/row-reorder/`; on `/ar/`, a search returns only `/ar/` URLs.

- [ ] **Step 1:** Add the `verify-site` search check first; run `build` → FAIL (no index).
- [ ] **Step 2:** Implement Pagefind in the build and the search UI.
- [ ] **Step 3: Run** `build` → PASS; manual: `/` key opens search, results navigate, the dialog passes axe.
- [ ] **Step 4: Commit** `feat: add static search to the docs`

### Task 4: Positioning in the README and package.json

**Files:**
- Modify: `README.md`, `package.json` (`description`, `homepage`), `packages/ai/package.json` (`homepage`)
- Create: `docs/DESIGN.md`, `docs/PRODUCT.md` (ported from the old repo and updated: multi-page site, four components, the new positioning, `/ar/`)
- Test: `docs/src/__tests__/positioning.test.ts`

**Interfaces:**
- README: first paragraph is the positioning; every docs link uses path URLs under `SITE.url` (no `#/`); sections that the docs now cover in depth (Theming, Languages, Use with AI agents, How it compares, bundle sizes) shrink to a short summary and a link. The element/widget table stays (the landing reuses it). Changelog stays in the README (the docs page is generated from it).
- `package.json` `homepage`: `SITE.url` + `/`. `packages/ai/package.json` `homepage`: `SITE.url` + `/ai-tools/`.

- [ ] **Step 1: Write the failing test:** root `package.json` `description` equals the positioning; `README.md` contains the positioning and no `/#/docs/` link; `pageTitle("en", null)` and the landing meta description contain the positioning's first sentence; `packages/ai/package.json` `homepage` has no `#`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Before staging `package.json`, run `git diff package.json`; stage only the `description` / `homepage` lines if anything else changed.
- [ ] **Step 4: Run** test → PASS; library `pnpm test` still green.
- [ ] **Step 5: Commit** `docs: use the launch positioning in the readme and package metadata`

### Task 5: Netlify, strict mode and Lighthouse CI

**Files:**
- Create: `netlify.toml` (repo root), `docs/lighthouserc.cjs`
- Modify: `.github/workflows/docs.yml`, `docs/package.json`

**Interfaces:**
- `netlify.toml`:
  ```toml
  [build]
    base = "docs"
    command = "cd .. && pnpm install --frozen-lockfile && pnpm build && cd docs && DOCS_STRICT=1 pnpm build"
    publish = "dist"
  [build.environment]
    NODE_VERSION = "22"
  [[headers]]
    for = "/_astro/*"
    [headers.values]
      Cache-Control = "public, max-age=31536000, immutable"
  ```
  (Netlify needs Chromium for `verify-site`: set `PLAYWRIGHT_BROWSERS_PATH=0` and run `pnpm exec playwright install chromium` in the command before `pnpm build`; if Netlify's image cannot run Chromium, skip `verify-site` on Netlify with `DOCS_SKIP_VERIFY=1` — CI already gates every merge — and note it in the report.)
- `lighthouserc.cjs`: `ci.collect.staticDistDir: "./dist"`, `url: ["http://localhost/", "http://localhost/components/data-table/"]`, `numberOfRuns: 3`; `ci.assert.assertions`: `categories:performance`, `categories:accessibility`, `categories:best-practices`, `categories:seo` each `["error", { minScore: 0.95 }]`; `cumulative-layout-shift` `["error", { maxNumericValue: 0.01 }]`; `ci.upload.target: "temporary-public-storage"` off (use `filesystem`, output `./.lighthouseci`).
- CI: the docs build step sets `DOCS_STRICT=1`; add `pnpm --filter slotsmith-docs exec lhci autorun` after it; upload `.lighthouseci` as an artifact.

- [ ] **Step 1:** Write the config files.
- [ ] **Step 2: Run** locally: `DOCS_STRICT=1 pnpm --filter slotsmith-docs build` → 0 stubs, PASS; `pnpm --filter slotsmith-docs exec lhci autorun` → record the scores.
- [ ] **Step 3: Commit** `ci: gate the docs on lighthouse and strict mode, and build them on netlify`

### Task 6: Lighthouse pass

**Files:** whatever the audit points at (expected: font preloads, image sizes, unused CSS in `site.css`, island hydration directives, `Demo` height reservations).

- [ ] **Step 1:** Run `lhci autorun`; list every failing audit on both URLs.
- [ ] **Step 2:** Fix one cause at a time; rerun after each; commit each fix separately (`perf: …` or `fix: …`).
- [ ] **Step 3:** Stop when all four categories are ≥ 0.95 on both URLs in three consecutive runs. Record the median scores for the report.

### Task 7: Launch report

**Files:**
- Create or complete: `docs/LAUNCH-REPORT.md`

**Interfaces:** sections, in order:
1. **Checklist** — every brief requirement (1–10 and landing a–h, component template, process items) with done / not done and a link to where it lives.
2. **Lighthouse** — median scores per URL per category, date, commit.
3. **axe** — the summary line from `dist/a11y.json` and any rules disabled (there should be none).
4. **Library issues** — plan 00's list plus everything found since, each with file:line and a suggested fix; mark which are "tiny fixes" the owner may approve.
5. **Redirects** — the exact table from the spec, plus the `_redirects` file contents.
6. **Needs a decision** — policy drafts, domain switch steps (`SITE.url`, uncomment the 301 in `_redirects`, `homepage` fields), anything else.
7. **Owner steps to launch** — in Netlify: link the site to `tmzm/slotsmith`, base directory `docs` (read from `netlify.toml`); merge `docs/launch-site`; archive `tmzm/slotsmith-docs` with a README pointing to the new site.

- [ ] **Step 1:** Write the report from real outputs (no numbers from memory).
- [ ] **Step 2: Commit** `docs: add the launch report`

## Final verification for plan 08

- `DOCS_STRICT=1 pnpm --filter slotsmith-docs build` passes with 0 stubs, 0 meta problems, 0 dead links, 0 console errors, 0 axe violations.
- Lighthouse CI passes on both URLs.
- `pnpm test` (library) green; `pnpm --filter slotsmith-docs test` and `check` green.
- `docs/LAUNCH-REPORT.md` complete.
