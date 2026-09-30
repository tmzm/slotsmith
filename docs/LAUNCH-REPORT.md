# Launch report

## Deferred (slow connection)

- `tailwindcss` and `@tailwindcss/vite` are not installed. `samples/adapters/shadcn.css` holds only the shadcn CSS variables under `.shadcn-scope`; add the Tailwind layer (`@import "tailwindcss/theme.css" layer(theme); @import "tailwindcss/utilities.css" layer(utilities); @source "./";`) and `@tailwindcss/vite` in `astro.config.ts` once installed. Until then the shadcn adapter renders unstyled.
