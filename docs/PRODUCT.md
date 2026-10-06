# PRODUCT.md — slotsmith docs

## What this is

The documentation site for `slotsmith`, a React library of four components:
a data table (built on TanStack Table v9), a combobox (the autocomplete), a
date picker and a file uploader. It is a multi-page static site at
<https://slotsmith.dev>: a landing page, getting started, an overview, API
reference, adapters and guides for each component, and pages for theming,
languages, AI tools, comparison, trust, the changelog and the roadmap. Every
demo runs the real package source.

Every page exists in English and in Arabic under `/ar/`, laid out right to
left. A page with no Arabic prose yet shows the English text and says so.

**Register:** brand on the landing, where the design is the pitch and has to
prove the components are worth adopting. Product on docs pages, where the
design serves lookup: calm, dense, fast to scan.

## Who it's for

React developers deciding whether to adopt the package, and developers already
using it who need the API. Most arrive from npm, a search result, an AI
answer or a shared link, skim for 30 seconds, and leave unless something
proves the idea quickly. Coding agents read it too, through the Markdown copy
of every page and `llms.txt`.

## Positioning

**Finished data table, combobox, date picker and file uploader for React that
drop into any design system: shadcn/ui, MUI, Chakra, Ant Design or your own.
Every part is a slot; what you don't replace still looks finished.**

The libraries named are examples of well-known ones, not a fixed list: the
components work with any design system. The landing, the README and the
package description use these two sentences as written, and everything on the
site serves them.

## Scene

A developer at a desk after hours, dim room, screen bright, five tabs of
component libraries open, deciding which one to try. They want to see the
thing working and find the prop they need, not read prose. Later they come
back to look up one prop.

## Author

Tareq Al-Mozayek — full-stack developer, frontend-focused, Damascus. The
About page links the ways to reach him. More components are planned under the
same idea; the Roadmap page lists what is planned.

## Success

- A visitor can tell within one screen what "every part is a slot" means, by
  swapping the design system on a live table.
- A prop, slot or label question is answered on the component's API page,
  without reading source.
- Every claim about a feature links to a live demo, and every number on the
  Trust page is measured at build.
- An Arabic reader gets the same site, mirrored, not a reduced one.
