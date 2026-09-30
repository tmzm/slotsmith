# Launch report

## Deferred (slow connection)

- `tailwindcss` and `@tailwindcss/vite` are not installed. `samples/adapters/shadcn.css` holds only the shadcn CSS variables under `.shadcn-scope`; add the Tailwind layer (`@import "tailwindcss/theme.css" layer(theme); @import "tailwindcss/utilities.css" layer(utilities); @source "./";`) and `@tailwindcss/vite` in `astro.config.ts` once installed. Until then the shadcn adapter renders unstyled.
- GSAP is not installed. The swap section's choreography (pinned scroll, explode, explode–swap–reassemble around a switch) waits in `src/lib/landing-motion.ts` (a documented no-op stub, not imported yet). The CSS hooks (`--explode`, `--dx`/`--dy`, `data-static`, `swap:before`/`swap:after`) are in place; until the module lands the swap section always shows the table beside the static labelled diagram, which is also its reduced-motion and no-JS state. When wiring it: the forced exploded state was only checked by hand (`--explode: 1`); Pagination and PageSizeSelect sit below the fold of the scrolling demo box and get no floating label, and removing `data-static` adds room inside the box (a layout change to keep out of CLS, e.g. by doing it while pinned).
- The shadcn ui files under `docs/src/components/ui/` are the repo's test-kit versions, not real `shadcn add` output. Regenerate them with the shadcn CLI once Tailwind is installed, and check the shadcn swap variant again.

## Needs a decision

- Landing initial JS is about 111 KB gzipped at 360px and 112 KB at 1440px (the hero peek table hydrates only there), against the 90 KB budget. React (client + react-dom) is about 68 KB and the data table with its page-size select about 37 KB; the swap demo itself adds about 4 KB (island 3.1 KB, sample and data 0.8 KB). Meeting 90 KB needs a smaller first island (for example rendering the swap table server-only until first interaction) or a budget change.

## Notes

- Chakra UI's provider puts a reset and global styles on `html` and every element (colour, background, line height, font family, `font-feature-settings: "cv11"`, border colours). The swap demo's Chakra provider (`samples/adapters/provider-chakra.tsx`) scopes Chakra's system to `.chakra-scope` (`cssVarsRoot`, `preflight.scope`, scoped `globalCss`); with it, loading the Chakra variant changes no computed style outside the demo.
