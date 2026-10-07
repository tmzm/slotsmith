# Launch report

Written 2026-10-07 at commit `6519b87` (`master`). Every number below comes from a run made for this report unless it says otherwise.

**At a glance**

- The site is live at https://slotsmith.dev (Netlify, built from this repo). The old `slotsmith-docs.netlify.app` address, `http://` and `www.` all send a 301 to it.
- Build: 100 pages, 0 problems, 0 stubs. axe: 0 violations; 18 findings of one known library issue.
- Lighthouse (mobile, median of 3): every gated page scores 0.97 or more in all four categories, CLS 0.
- Library: 1456 tests in 65 files pass; `slotsmith-ai`: 110 tests in 6 files pass.
- One thing blocks the announcement: GitHub private vulnerability reporting is off (see [Needs a decision](#6-needs-a-decision)).

## 1. Checklist

The plans' "brief requirements 1–10" come from a brief that is not in the repo; the spec (`superpowers/specs/2026-09-29-docs-launch-site-design.md`) covers all of them, so this list follows the spec section by section.

### Site and pages

| Item | Status | Where |
| --- | --- | --- |
| Static Astro site in `docs/`, English at `/`, Arabic at `/ar/` | Done | `src/pages/`, `src/i18n/` |
| Every page of the site map (100 pages: 50 English, 50 Arabic) | Done | `src/content/docs/en/` |
| Props and slots generated from source (brief req. 4) | Done | `scripts/reference.ts`, `/components/<c>/api/` |
| Every sample is a type-checked file, rendered and checked (brief req. 8) | Done | `samples/`, `scripts/check-snippets.ts`, `scripts/verify-site.ts` |
| Getting started, slot model guide, theming, languages, AI tools, about | Done | `src/content/docs/en/*.mdx` |
| Next.js App Router and Vite examples, built in CI | Done | `samples/frameworks/next-app/`, `samples/frameworks/vite/` |
| Trust page, generated at build (tests, coverage, suites, sizes, axe, policies) | Done; on Netlify the axe table is replaced by a note (see 6) | `src/content/docs/en/trust.mdx`, `scripts/facts.ts` |
| Roadmap, Comparison (researched, dated sources), Changelog (from the README) | Done | `src/data/roadmap.ts`, `src/data/comparison.ts`, `/changelog/` |
| Header (version badge, search, GitHub, npm, language, theme), footer (edit link, license, author) | Done | `src/components/Header.astro` |
| Collapsible sidebar, wider container (owner requests) | Done | header menu button, `src/components/Header.astro` |
| Arabic prose for guides | Not done (out of scope; Arabic chrome, titles and demos only) | |

### Landing (a–h and the close)

| Section | Status | Where |
| --- | --- | --- |
| a. Positioning + install (tabs for npm / pnpm / yarn / bun) | Done (positioning reworded by the owner: "any design system", the libraries are examples) | `src/components/landing/Hero.astro` |
| b. Swap demo, exploded view (Fallback, shadcn, MUI, Chakra, Ant Design) | Done | `Swap.astro`, `samples/landing/` |
| c. Two kinds of parts | Done | `Parts.astro` |
| d. The four components (mosaic with live mini demos) | Done | `Cards.astro` |
| e. Works with what you have (marquee with logos) | Done | `WorksWith.astro` |
| f. Languages and RTL (en / ar / fa) | Done | `Languages.astro` |
| g. Use with AI agents | Done | `Agents.astro` |
| h. Trust strip from generated facts | Done | `TrustStrip.astro` |
| Close (gold band) | Done | `Close.astro` |
| GSAP scroll choreography (lazy, ≥ 1024×660, never under reduced motion) | Done | `src/lib/landing-motion.ts` |
| Initial JS within 90 KB gzipped | **Not met**: about 123 KB (see 6) | |

### Component template (all four components)

| Item | Status | Where |
| --- | --- | --- |
| Overview: demo, install, quick start, guide list, accessibility, limitations, FAQ | Done | `src/content/docs/en/components/<c>/index.mdx` |
| Guides: 27 pages (data table 8, autocomplete 7, date picker 5, file uploader 7), each with a live demo and full code | Done (server-data guide included) | `…/components/<c>/guides/` |
| API: slots, props, labels and locales, styling (generated) | Done | `/components/<c>/api/` |
| Adapters: shadcn/ui, MUI, Chakra, Ant Design, Radix Themes, each live | Done | `/components/<c>/adapters/` |

### SEO, GEO, search, performance, CI

| Item | Status | Where |
| --- | --- | --- |
| Unique title and description per page, canonical, hreflang, OG and Twitter tags | Done (checked by `verify-site`) | `src/layouts/Base.astro` |
| OG image per page (100 PNGs, Arabic set right to left) | Done | `src/lib/og.ts` |
| `sitemap.xml` (100 URLs), `robots.txt`, `llms.txt` (11 KB), `llms-full.txt` (545 KB, under 1 MB) | Done | `src/pages/*.ts` |
| JSON-LD, Markdown copies, answer-first check, FAQs, AI-crawler rules, last-updated dates | Done (see 3a) | `src/lib/seo-files.ts`, `src/lib/git-dates.ts`, `scripts/check-structure.ts` |
| Pagefind search, one index per language | Done | `scripts/search-index.ts` |
| Lighthouse ≥ 0.95 on `/` and `/components/data-table/`, CLS ≤ 0.01 | Done (gate also covers `/components/data-table/api/` and `/theming/`) | `lighthouserc.cjs` |
| `DOCS_STRICT=1` fails on stubs (Netlify builds with it) | Done | `netlify.toml` |
| Docs workflow: install, library build, examples, test, check, build + verify, Lighthouse | Done (its runs on GitHub were not checked for this report) | `.github/workflows/docs.yml` |
| Netlify builds from this repo (`docs/` base) | Done and live | `netlify.toml` |
| Old hash and path URLs redirect | Done (see 5) | `public/_redirects`, script on `/` |

### Outside `docs/` and process

| Item | Status |
| --- | --- |
| README positioning, short versions linking to the docs | Done |
| Root `package.json` `description` and `homepage`; `packages/ai/package.json` `homepage` | Done |
| `@vitest/coverage-v8` and `vitest` pinned to 5.0.1 | Done |
| `pnpm-workspace.yaml` includes `docs` and the example apps | Done |
| Library changes only with the owner's approval | Done (each fix below was approved) |
| One-line conventional commits, no AI attribution | Done |
| Old repo `tmzm/slotsmith-docs` archived | Not done (owner step, see 7) |

## 2. Lighthouse

Run on 2026-10-07 at commit `6519b87`: `pnpm --filter slotsmith-docs exec lhci autorun` against the full build, Lighthouse 12.6.1, installed Chrome on Windows, mobile preset (412×823), 3 runs per page. The run passed every assertion.

| Page | Performance | Accessibility | Best practices | SEO | CLS | LCP | FCP |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 0.99 (runs 0.99, 0.99, 0.97) | 1 | 1 | 1 | 0 | 1.8 s | 1.3 s |
| `/components/data-table/` | 0.97 (0.97, 0.97, 0.99) | 1 | 1 | 1 | 0 | 2.4 s | 1.5 s |
| `/components/data-table/api/` | 1 | 1 | 1 | 1 | 0 | 1.7 s | 1.1 s |
| `/theming/` | 1 (1, 0.99, 1) | 1 | 1 | 1 | 0 | 1.7 s | 1.0 s |
| `/ar/` (one run, not gated) | **0.89** | 1 | 1 | 1 | 0 | 3.6 s | 1.6 s |

- `/ar/` is slower because of fonts: the page loads three Noto Sans Arabic weights (49, 51 and 53 KB) and Alexandria 800 (13 KB) on top of the Latin fonts. Subsetting or dropping a weight is the fix (see 6).
- The landing's file-uploader card trips Lighthouse's `label-content-name-mismatch` check (the dropzone is named "Add files" but shows other text). It does not lower the score; the fix is the same library change as the axe finding below.

## 3. axe

`verify-site` output from the full build: **100 pages, 0 problems, 0 stubs, 18 known library a11y issues.** `dist/a11y.json` holds 84 demo results with 0 violations.

- No axe rule is disabled.
- One rule is allowlisted, with its reason, in `scripts/lib/axe-allowlist.ts`: `nested-interactive` on `.sfu__zone`. It accounts for all 18 findings (9 file-uploader demos, English and Arabic). It is a library issue (see 4); remove the entry once it is fixed.

## 3a. GEO

- **Structured data.** The schema.org validator (validator.schema.org, live site, 2026-10-07) reports 0 errors and 0 warnings for the landing (`SoftwareSourceCode`, `FAQPage`) and for `/components/data-table/guides/pagination/` (`TechArticle`, `BreadcrumbList`). Google's Rich Results Test has no API and was not run; FAQ rich results only show for government and health sites anyway, so `FAQPage` is there for AI search.
- **`robots.txt`** allows, by name: GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-User, Claude-SearchBot, PerplexityBot, Perplexity-User, Google-Extended, Applebot-Extended, CCBot, then every other crawler, then the sitemap. Live at https://slotsmith.dev/robots.txt.
- **Markdown copies.** 100 `index.md` files in the build; live ones answer `200 text/markdown; charset=utf-8` (checked `/components/data-table/index.md` and `/ar/index.md`). Each page links its copy with `<link rel="alternate" type="text/markdown">`.
- **Last-updated dates** are live and differ per page (for example `/components/data-table/` 2026-10-04, `/theming/` 2026-10-06, `/about/` 2026-10-07), so **Netlify's clone has full history**: `netlify.toml` runs `git fetch --unshallow` first. If history were shallow, `src/lib/git-dates.ts` would show no date rather than a wrong one. CI checks out with `fetch-depth: 0`.

## 4. Library issues

Still open. "Tiny fix" marks the ones that are a few lines and safe to approve.

**File uploader**

1. **The dropzone is a button that contains a button** (the one allowlisted axe rule, and Lighthouse's name mismatch). `useFileUploader` gives the zone `role="button"` and `tabIndex: 0` (`src/file-uploader/core/useFileUploader.ts:567`), and the zone holds the Browse `<button>`. Fix: drop the zone's role and tab stop when Browse is shown (Browse already opens the dialog), or leave Browse out of a focusable zone.
2. **Refusals may not be announced the first time.** `FileUploader.Rejections` returns `null` until a file is refused (`src/file-uploader/parts.tsx:326`), so the live region arrives with its first message. Fix: keep an empty region mounted. *Tiny fix.*
3. **Item buttons share one name.** Every item's buttons read "Remove file", "Retry upload", "Cancel upload" (`src/file-uploader/slots/fallbacks.tsx:304-306`). Fix: make them functions of the file name, like `progress` and `preview`.
4. **The hidden file input is a second "Add files" button in Chrome.** It keeps the zone's label (`useFileUploader.ts:576-583`). Fix: `aria-hidden` on the input when a zone or Browse button exists. *Tiny fix.*
5. **A cancelled upload cannot be restarted from its row.** `cancel` sets the item back to `ready` (`useFileUploader.ts:478-484`) and Retry shows only for `error` (`parts.tsx:95`). Fix: show Retry (or Upload) for a cancelled item.
6. **`rejectedTitle` is never rendered** (`fallbacks.tsx:314`; in every locale pack). Fix: render it as the rejections heading, or remove the label.
7. **The tile's filled-border rule always matches.** `.sfu[data-variant="tile"] .sfu__zone:not([data-empty])` (`src/file-uploader/styles.css:320`), but only the root carries `data-empty`. Fix: `.sfu[data-variant="tile"]:not([data-empty]) .sfu__zone`. *Tiny fix.*
8. **Chakra uploader adapter: the progress bar is named "20%".** The skin spreads the label onto `Progress.Root`, which has no role (`src/file-uploader/__tests__/integrations/chakra/components.tsx:121-129`). Fix: pass it to `Progress.Track`, then regenerate the `slotsmith-ai` adapter. *Tiny fix.*

**Autocomplete and date picker**

9. **A remote autocomplete shows "No results" for its first 300 ms.** `loading` is set only when the debounced request starts (`src/autocomplete/core/useAsyncOptions.ts:91-99`), so the status is `empty` until then (`src/autocomplete/core/useAutocomplete.ts:352`). Fix: count a scheduled request as loading, or skip the debounce for the first request.
10. **A date range can span blocked days; presets are not checked.** `pick` checks only the clicked day (`src/date-picker/core/useDatePicker.ts:528-530`), `applyPreset` checks nothing (`:565`). Fix: an option to reject such ranges and to clamp presets.
11. **The date picker has no `name` prop** (no hidden input), unlike the autocomplete. Fix: render one hidden input per value when `name` is set.

**Generated reference and knowledge**

12. **Missing `data-*` attributes in slot JSDoc.** The docs fill them in from `docs/src/data/data-attributes.json`: data table `Row` (`data-row-id`, `data-state`, `data-dragging`, …), `Root`, `HeaderCell`, `Cell`, `ExpandToggle`; autocomplete and date picker `Trigger` / `Popup` (`src/autocomplete/slots/types.ts:43,54`, `src/date-picker/slots/types.ts:38,49`); uploader `Dropzone`, `Icon`, `Progress`, `Action`. Fix: list them in the JSDoc so the JSON file can go. *Tiny fix (comments only).*
13. **`HeaderRow` and `FooterRow` are documented with body-row attributes** (`src/data-table/slots/types.ts:46`, `:316`, `:322`); they never carry them (`src/data-table/parts.tsx:126`, `:234`). Fix: their own props type or JSDoc.
14. **The knowledge generator drops spread-in label defaults** (the six reorder labels): `objectValues` reads only plain properties (`packages/ai/scripts/generate.ts:374-381`). Fix: resolve `...defaultReorderLabels`. *Tiny fix.*
15. **JSDoc gaps:** `Constraints.accept`, `maxSize`, `minSize` (units not stated; `src/file-uploader/core/validate.ts:115-117`); six `FileUploaderLabels` keys (`remove`, `retry`, `cancel`, `uploading`, `done`, `failed`; `src/file-uploader/slots/types.ts:225-234`); per-slot docs on `AutocompleteComponents` and `DatePickerComponents`. *Tiny fix.*

**Packaging and tests**

16. **`import … from "slotsmith"` still imports `@tanstack/react-table`.** The main entry pulls a chunk that imports it (`dist/chunk-*.js`), so an autocomplete-only app depends on the bundler dropping it. ES module tree shaking is tested; a real app without the peer is not. Fix: a test app with no TanStack installed, per bundler.
17. **One `.d.ts` serves both `import` and `require`** (every entry in `package.json` `exports`). Fix: run arethetypeswrong; emit `.d.cts` if it complains.
18. **`dist` CSS is not minified** (`dist/styles.css` is 32,460 bytes as shipped; the Trust page measures 27,712 minified). Fix: minify the CSS in `tsup.config.ts`. *Tiny fix.*
19. **Stale test comment.** `src/__tests__/bundle.test.ts:273-276` says the uploader borrows the table's class helper; it now uses `src/shared/cx`, so the uploader could join the CommonJS test. *Tiny fix.*
20. **axe runs in only two library tests** (`page-size.test.tsx`, `reorder.test.tsx`); other "a11y" suites check ARIA by hand. The docs build runs axe on all 84 demos, which covers most of the gap.
21. **`packages/ai` uses TypeScript ^6, the root ^7** (the docs also need 6 for `astro check`). Align when Astro supports 7.

Not slotsmith bugs, noted for users: shadcn/ui's table uses physical sides (`text-left`), so its headers stay left on RTL pages (the docs mirror them in `samples/adapters/shadcn.css`); shadcn's `Progress` fills from the left in RTL; MUI's `Alert` puts its close button at the far left in Arabic.

### Fixed for 1.8.0 (owner-approved, in `master`, not yet on npm)

- `--ss-*` tokens set on a wrapper now reach the components (token scope).
- The shadcn file-uploader adapter works with the real shadcn/ui `Alert` and `Progress`.
- Provider and component types no longer need `@tanstack/react-table` installed.
- **Published bug:** the main entry's and `slotsmith/locale`'s type re-exports resolved to the built scripts, so `import { DataTable } from "slotsmith"` was untyped under `moduleResolution: "bundler"`. This affects every 1.7.0 user and is a strong reason to release 1.8.0 soon.
- Clear and tag-remove buttons are 24px targets.
- The Ant Design date-picker adapter keeps focus on the picked day.
- Arabic, Persian and Hebrew packs isolate file types in the uploader hint (`image/*` no longer reads `*/image`) and file names in its messages, including the wrong-type refusal.
- `VirtualFileUploader` scrolls the whole list with the default stylesheet.
- New: `SlotsmithProvider` `components` (global slot overrides).

## 5. Redirects

From the spec. Hash URLs never reach a server, so an inline script on `/` maps them with `location.replace()`:

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

`public/_redirects` (generated by `scripts/redirects.ts`) sends real 301s for the path forms and the old domain. Checked live: `/docs/data-table` → `/components/data-table/`, and `slotsmith-docs.netlify.app` → `https://slotsmith.dev/`.

```
# Old path forms of the hash routes. Generated by scripts/redirects.ts.
/docs/installation  /getting-started/  301
/docs/installation/  /getting-started/  301
/docs/slots  /guides/  301
/docs/slots/  /guides/  301
/docs/theming  /theming/  301
/docs/theming/  /theming/  301
/docs/locales  /languages/  301
/docs/locales/  /languages/  301
/docs/ai-tools  /ai-tools/  301
/docs/ai-tools/  /ai-tools/  301
/docs/data-table  /components/data-table/  301
/docs/data-table/  /components/data-table/  301
/docs/file-uploader  /components/file-uploader/  301
/docs/file-uploader/  /components/file-uploader/  301
/docs/autocomplete  /components/autocomplete/  301
/docs/autocomplete/  /components/autocomplete/  301
/docs/date-picker  /components/date-picker/  301
/docs/date-picker/  /components/date-picker/  301
/docs/author  /about/  301
/docs/author/  /about/  301

# The old Netlify address sends every path to the real domain (forced, so it wins over a file).
https://slotsmith-docs.netlify.app/*  https://slotsmith.dev/:splat  301!
```

## 6. Needs a decision

**Blocks launch**

- **Turn on GitHub private vulnerability reporting.** The Trust page sends reporters to `github.com/tmzm/slotsmith/security/advisories/new`; GitHub's API says the feature is off (`"enabled": false`, checked 2026-10-07), so outsiders cannot use that form. Settings → Code security → Private vulnerability reporting → Enable. Or change the Security text to another private channel.

**Open**

- **The live Trust page has no axe table.** Netlify skips the verifier's browser checks (`DOCS_SKIP_VERIFY=1`, no browser in its build image; the static checks still run there), so the deployed page shows a short note linking to the workflow runs (checked live). Options: publish the CI-built `dist` (the `docs-dist` artifact) to Netlify from the workflow; install Chromium in the Netlify build; or keep the note. Default: keep the note.
- **Arabic fonts slow `/ar/`** (performance 0.89, LCP 3.6 s). Options: subset Noto Sans Arabic to the characters the site uses, drop a weight (400, 500 and 700 all load), or preload fewer. Default: as built; `/ar/` is not in the Lighthouse gate.
- **No `LICENSE` file** (both packages say ISC; GitHub shows no license) and **no `SECURITY.md`**. Adding both at the root is a small owner commit; the Trust page would then link them.
- **Landing initial JS is about 123 KB gzipped against a 90 KB budget.** Measured from the landing's Lighthouse run (scripts it loaded, gzipped locally): 170 KB in all, of which GSAP, ScrollTrigger and the motion code (47 KB) load after first paint and sit outside the budget. The rest is mostly React (64 KB) and the data table with its autocomplete and floating-ui (34 KB). GSAP also downloads on phones, where the pin never runs. Options: load GSAP only on screens ≥ 1024×660, render the swap table server-only until first interaction, or raise the budget. Default: as built (scores are 0.97–0.99).
- **Google Tag Manager on every page** (`GTM-NV899NTZ`). Visitors' browsers contact Google on each view (119 KB from `googletagmanager.com` on the landing). EU and UK visitors may need a consent notice and the privacy text should say what the container collects. Default: as built, no consent banner.
- **The site's focus ring is under 3:1 in light mode** (`--gold` #c9a14a: 2.18:1 on the background; `src/styles/base.css:148`). Options: use `--gold-text` for focus in light mode, add an inner dark ring, or accept. Default: as built.
- **Library tiny fixes** in section 4 (items 2, 4, 7, 8, 12, 14, 15, 18, 19): approve any for 1.8.0, or leave them for later.

**Defaults taken (say if you disagree)**

- The marquee pauses on hover, focus and reduced motion, but has no pause button (WCAG 2.2.2 asks for one).
- The facts step runs the library's test suite on every docs build (counts never go stale; costs about 35 s per build).
- Sizes use 1000-byte kilobytes everywhere.
- Library logos are recoloured to the site's text colour (MUI's and Tailwind's guidelines ask for unaltered marks).
- Changelog: 1.0.0–1.4.0 have no written notes and no release shows a date; nothing is invented.
- Roadmap and site Arabic text are drafts that need a native review; "Spreadsheet mode" has no "how it works today" link (no cell-editing page yet).

**Decided (not asked again)**

- Library fixes: fixed for 1.8.0 (list in 4). Release as **1.8.0** (minor) with release notes.
- Author link: tareqmozayek.com. Bundlephobia badge: removed.
- Headings stay Big Shoulders 900 on the site; OG images use 800.
- "Excel mode" is "Spreadsheet mode" (`#spreadsheet-mode`).
- Trust policies accepted as written: SemVer, latest minor supported, aim to answer security reports within seven days.
- `@vitest/coverage-v8` installed and `vitest` pinned to 5.0.1; network downloads done.
- README size figures replaced by a link to the Trust page's sizes.

## 7. Owner steps to launch

1. **Push `master` after this report.** There is no `docs/launch-site` branch any more; all work is on `master`. `origin/master` already has every commit up to `6519b87` (last pushed 2026-10-07 12:20), so only this report is unpushed. Those pushes, and several earlier ones, came from outside the agents; check they were yours. Netlify is linked, so every push to `master` deploys.
2. **Netlify: already done** (checked 2026-10-07). The site builds from `tmzm/slotsmith` with base directory `docs` and publish `dist`, both read from `netlify.toml`. Leave the UI build settings empty.
3. **Domain: already done.** `slotsmith.dev` serves the site over HTTPS; `www.`, `http://` and `slotsmith-docs.netlify.app` 301 to it. Keep `slotsmith-docs.netlify.app` as a domain alias so the forced rule in `_redirects` keeps working, and keep Force HTTPS on.
4. **Turn on private vulnerability reporting** (see 6).
5. **Google Search Console:** the verification tag and file are live (`/google4048afc7f0404042.html` answers 200). Verify the `slotsmith.dev` property, submit `https://slotsmith.dev/sitemap.xml`, and run the Rich Results Test on `/` once.
6. **Archive `tmzm/slotsmith-docs`.** Replace its README with one line pointing to https://slotsmith.dev, then Settings → Archive. (Anonymous requests get "Not Found", so it may be private already; archive it either way.)
7. **Release 1.8.0.** Rename the README's `Unreleased` changelog entry to `1.8.0`, bump `version` in the root `package.json` and `packages/ai/package.json` (they share major and minor), then `npm publish` both. The docs' header badge, Changelog and Roadmap follow on the next build. Your rule: a version bump also updates the docs and the portfolio, and the portfolio is pushed to its default branch.
8. **Publish `slotsmith-ai` 1.8.0 with it.** npm has 1.7.0 (the same as the repo today), but 1.8.0 adds the provider guides and the regenerated Ant Design date-picker and shadcn uploader adapters.

## Notes

- **Search** covers the docs pages, not the landing (only the docs layout carries `data-pagefind-body`). `/ar/` results rank less well until Arabic prose exists.
- **Open Graph images** are drawn at build with `satori` and `@resvg/resvg-js` from local fonts (Big Shoulders 800, Geist, JetBrains Mono, Alexandria). Arabic titles are set right to left by the image code; Arabic vowel marks are left out because `satori` draws them on top of the letters.
- **The first-load wave animates `border-color`** (accepted exception to DESIGN §7: a short paint-only gold flash).
- **Design-system demos are scoped.** Chakra's global reset is confined to `.chakra-scope`; Ant Design adds no global styles; the shadcn variant runs on Tailwind v4 with a stylesheet scoped to `.shadcn-scope` and loaded only with that segment. None changes anything outside its demo (checked in Chrome, en/ar, light/dark).
- **The docs' shadcn/ui files match upstream** `npx shadcn add` output (new-york, Tailwind v4), with lucide icons drawn inline.
- **MUI demos use the `arEG` locale on `/ar/`**, so MUI's own labels are Arabic.
- **Landing choreography** was checked by hand at the forced exploded state; floating labels never cover text and hide when they have no free place (`{PageSizeSelect}` in the slot guide's X-ray at 360px).
- **Structured data:** `TechArticle` carries the page's OG image and a `dateModified` from git, no `datePublished`.
