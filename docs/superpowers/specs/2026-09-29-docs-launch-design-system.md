---
name: slotsmith docs
description: The Illuminated Assembly. A gold-on-ink docs site where every component is an exploded assembly drawing of its slots.
---

# Design System: slotsmith docs

Plan 01 copies this file to `docs/DESIGN.md`. It is the design source of truth
for every plan. Run design passes with the Impeccable skill (`/impeccable
craft`, `polish`, `audit`) against it.

## 1. Overview

**Creative North Star: "The Illuminated Assembly"**

A sibling of the author's portfolio (`E:\Projects\Personal\portfolio`, whose
DESIGN.md is "The Illuminated Source"), not a copy. It shares the portfolio's
DNA: manuscript gold on deep ink, condensed display type at poster scale, a
mono voice for machine-flavoured information, the logo's bracket motif, panels
instead of cards. It adds its own idea: **components shown as exploded
assembly drawings**, the way a workshop manual shows a machine, because
slotsmith's one claim is that every part is a slot.

The brackets carry meaning:

- `<Row>`, in Vellum: an **element part** (plain DOM props, state as `data-*`).
- `{Checkbox}`, in Gold: a **widget part** (semantic props).

One glance at any labelled diagram teaches the two kinds of parts.

**Wordmark:** `<slot>{smith}` set in JetBrains Mono, the angle brackets and
braces in Gold, the letters in Vellum. It echoes the portfolio's
`<Tareq> {AlMozayek}`.

**Register:** brand on the landing (design is the pitch), product on docs
pages (design serves lookup). The landing is loud; docs pages are calm.

**Scene:** a developer at night, a dark IDE open beside five table-library
tabs, deciding in thirty seconds whether to try this one, and coming back
later to look up a prop.

## 2. Colors

Tokens are the portfolio's, verbatim, so the two sites sit side by side.

| Token | Dark (default) | Light (Vellum) | Role |
| --- | --- | --- | --- |
| `--bg` | `#0f0e0b` | `#f4f3ef` | Ink / Vellum page |
| `--panel` | `#1a1813` | `#fbfaf7` | Raised panel |
| `--panel-2` | `#25221b` | `#efece4` | Hover row, inner panel |
| `--line` | `#2e2a22` | `#dcd6c8` | Hairlines |
| `--line-strong` | `#4a443a` | `#bdb5a3` | Stronger rules, scrollbar |
| `--ink` | `#ece9e2` | `#16140f` | Primary text |
| `--ink-2` | `#cfcac0` | `#3b372e` | Secondary text |
| `--muted` | `#a29c90` | `#625c50` | Metadata (passes 4.5:1) |
| `--gold` | `#c9a14a` | `#c9a14a` | Brand surfaces, brackets, focus |
| `--gold-text` | `#d2ab57` | `#7d5f1c` | Gold used as text (4.5:1) |
| `--on-gold` | `#0f0e0b` | `#0f0e0b` | Text on gold |
| `--ok` / `--danger` | `#6fcf7f` / `#f0a08f` | `#2f8a44` / `#b3412c` | Semantic only |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | | All transitions |

**Strategy.** Landing: Committed (gold owns the hero names, the widget
brackets, the swap control, and one drenched close). Docs pages: Restrained
(gold ≤ 10%: links, focus, active nav, brackets).

**Library demos** use slotsmith's own `--ss-*` tokens mapped to this palette
(`--ss-surface: var(--panel)`, `--ss-accent: var(--gold)`, …), which is also
a live proof of theming. Exception: the swap demo's "Fallback" state uses the
library's stock tokens, so it shows exactly what ships.

**Rules.** No second accent hue. No gradients, no gradient text, no glow, no
glassmorphism. If a new gold makes the portfolio's logo look off, it is wrong.

## 3. Typography

| Role | Latin | Arabic |
| --- | --- | --- |
| Display | Big Shoulders, 900, uppercase, line-height 0.88, tracking −0.005em | Alexandria 800, natural case, line-height 1.15 |
| Body | Geist 400/500/600 | Noto Sans Arabic 400/500/700 |
| Mono (labels, code, wordmark) | JetBrains Mono 400/500 | (Latin only) |

- Display `clamp()` max: 6rem on the landing, 4.5rem for docs page titles.
  Test every heading at 360px in both languages; reduce the clamp or rewrite
  before allowing overflow.
- Latin names inside Arabic display text (`slotsmith`, `DataTable`) stay in
  Big Shoulders with `lang="en"`, as in the portfolio.
- Body: 1.0625rem, line-height 1.65 (1.75 on dark), prose ≤ 68ch,
  `text-wrap: pretty`; headings `text-wrap: balance`.
- Mono is for machine-flavoured text only: code, prop names, entries,
  versions, dates, key caps, the wordmark. Never prose.
- No tiny uppercase tracked label above sections.
- Self-hosted woff2 subsets (Latin for Big Shoulders, Geist, JetBrains Mono;
  Arabic for Alexandria and Noto Sans Arabic on `/ar/` pages). Preload Geist
  400 and Big Shoulders 900.

## 4. Elevation and structure

Flat and tonal. Depth comes from ink steps (`--bg` → `--panel` →
`--panel-2`), hairlines, and motion. No drop shadows, no glow.

**The panel** is the unit: `--panel` background, 1px `--line` border, no
radius above 6px. Interactive panels turn their border gold on hover and on
`:focus-within` (320ms `--ease-out`).

**The bracket** is the one ornament. It frames labels, marks the current
page, and wraps notes. Never decorative corner brackets on every panel.

## 5. Components

- **Header.** Wordmark, version tag (`v1.6` in mono inside `{ }`), search
  button (shows `⌘K`), GitHub, npm, language, theme. Hairline bottom border.
- **Sidebar.** An indexed list. Group names in Geist 600 (not mono, not
  uppercase). The current page renders as a gold mono tag `<Theming />`;
  hover reveals faint brackets around any item. Collapses to a sheet below
  1024px.
- **Mobile dock.** Below 768px, a bottom dock with Menu, Search, Theme (as
  the portfolio's mobile dock), respecting safe-area insets.
- **Page header (docs).** Title in display type (≤ 4.5rem), then the
  answer-first paragraph in Geist at 1.25rem, then a mono meta row:
  `{entry} slotsmith/data-table  {css} slotsmith/data-table.css  {updated} 2026-09-29`.
- **Demo panel.** Panel with a mono tab row (`preview` / `code` / shared
  files), the live demo above, code below or in the tab; reserved height; a
  copy button that says `Copied` in mono for 1.5s.
- **Code block.** Panel, mono, filename tab, line highlights as a Gold-tinted
  background (never a side stripe), `dir="ltr"` always.
- **Reference tables.** Dense like the portfolio's work table: hairline rows,
  `--panel-2` on hover, sticky header. The Kind column shows `<element>` in
  Vellum or `{widget}` in Gold. Types in mono, wrapping.
- **Note.** A panel whose first line is `{ note }`, `{ limitation }` or
  `{ warning }` in mono, tinted background for warning. No side stripes.
- **Search.** A command palette dialog (⌘K, `/`), results grouped by section,
  keyboard-first, like the portfolio's command palette.
- **Tabs / segmented controls.** Mono labels; the selected item is a Gold
  panel with `--on-gold` text.
- **Focus.** 2px Gold outline, 2px offset, everywhere.

## 6. The landing

Order is fixed by the spec. Composition per section:

1. **Hero.** Inside the `<h1>`, the four component names stacked at poster
   scale (DATA TABLE / COMBOBOX / DATE PICKER / FILE UPLOADER), the rest of
   the first positioning sentence in Geist around them; the second sentence as
   the lede. Install tabs and two links below. Asymmetric: names on the start
   side, a live table peeking in from the end side on wide screens.
2. **Swap: the exploded view.** A pinned scroll section (GSAP ScrollTrigger).
   The live table separates into its parts (header row, body rows, the
   checkbox column, sort triggers, pagination, page-size select), each
   labelled `<Name>` or `{Name}` on a hairline leader, then reassembles. The
   segmented control (Fallback / shadcn / MUI / Chakra) then appears; each
   switch plays a short explode–swap–reassemble (≤ 700ms) and the code panel
   highlights the changed lines. Reduced motion or no JS: no pin; the table
   and a static labelled diagram sit side by side, the control swaps instantly.
3. **Two kinds of parts.** Two columns framed by giant `<` `>` and `{` `}`
   display glyphs; one example each; the README table below.
4. **Four components.** An asymmetric panel mosaic (table spans two columns
   and two rows; the others vary), each with its live mini demo and a link.
   Not identical cards.
5. **Works with.** A slow marquee of monochrome logos (paused on hover and
   focus, static under reduced motion), each a link.
6. **Languages.** A full-width panel; toggling en / ar / fa mirrors the table
   with a short FLIP (direction flips live); the Arabic font loads on first
   toggle.
7. **AI agents.** A mono panel with client tabs.
8. **Trust.** One manifest line in mono, like a `package.json` excerpt:
   `{ tests: 1289, suites: 12, gzip: "18.4 KB", license: "ISC", react: ">=18" }`,
   every value generated and each key linking to `/trust/`. Never a row of
   big numbers with small labels.
9. **Close.** The one drenched Gold section: `npm i slotsmith` at display
   scale in `--on-gold`, a copy button, links to Getting started and GitHub.

**First load.** Above-the-fold panels rise out of a clip mask in a diagonal
wave (top-start to bottom-end, mirrored in RTL), outlined in Gold as they
land: the portfolio's Boot sequence, once per session, landing only.

## 7. Motion

- **Landing:** choreographed with GSAP + ScrollTrigger, dynamically imported
  after first paint (not in the 90 KB initial budget). Content is visible and
  usable before and without it.
- **Docs pages:** CSS only, 120–320ms `--ease-out`, on hover, focus, tab
  switch, copy, sidebar open. Theme switch crossfades via the View
  Transitions API where supported.
- Every sequence has a `prefers-reduced-motion` alternative (instant or
  crossfade). Every directional motion mirrors in RTL.
- Animate transforms, opacity, clip-path only.

## 8. Do and don't

**Do:** anchor every colour to the portfolio's tokens; use brackets with
their meaning (element vs widget); design Arabic as a first-class layout;
test every display heading at 360px in both languages; keep WCAG 2.2 AA
(4.5:1 body, 3:1 large text and UI, visible gold focus).

**Don't:** gradients or gradient text; glow or glass; identical card grids;
hero-metric rows; eyebrow labels or 01/02/03 above sections; coloured side
stripes; mono prose; a second accent hue; Inter, IBM Plex, or any font
outside section 3.
