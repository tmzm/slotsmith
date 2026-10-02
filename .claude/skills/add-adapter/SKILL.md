---
name: add-adapter
description: Use when adding a design-system adapter, or changing a component's slots, props or slot props in a way every adapter must follow. Covers the tested integration skins in src, the generated slotsmith-ai adapters, and the hand-written docs samples, so the five libraries (antd, chakra, mui, radix, shadcn) stay in step across all four components.
---

# Adapters

An adapter is a `components` map that renders a slotsmith component with one
design system's primitives. Each one exists in up to three places, and only
one of them is written by hand per adapter.

| Place | Path | Written by |
|---|---|---|
| Tested skin (source of truth) | `src/<component>/__tests__/integrations/<library>/components.tsx` | Hand |
| Skin's test suite | `src/<component>/__tests__/integrations/<library>.test.tsx`, helpers in `shared.tsx` | Hand |
| AI adapter | `packages/ai/knowledge/adapters/<component>.<library>.tsx` | `packages/ai/scripts/generate.ts`, never by hand |
| Docs sample (data table only) | `docs/samples/adapters/data-table/<library>.tsx` and `<library>-demo.tsx`, providers in `docs/samples/adapters/provider-<library>.tsx` | Hand |

Components: `autocomplete`, `data-table`, `date-picker`, `file-uploader`.
Libraries: `antd`, `chakra`, `mui`, `radix`, `shadcn`.

## Rules for a skin

`packages/ai/scripts/adapters.ts` turns a skin into the adapter an app copies,
and only rewrites import paths. A skin may import:

- the component's entry, `../../../index`;
- for shadcn, its test-local copies under `./ui/`, and only names in the
  `SHADCN_UI` set, because an app gets them with `npx shadcn@latest add`;
- packages the app would install (the library itself, its icons).

Any other relative import, side-effect imports included, makes generation
throw. Fix the skin; never special-case the generator.

Every slot a skin overrides must be a key of the component's
`<Component>Components` interface in `src/<component>/slots/types.ts`. The
drift test reads that interface straight from source.

Comments follow the house style: JSDoc with a short title line, a blank line,
then the description. Never name a client or another project.

## Changing a slot, prop or slot prop

1. Change the source under `src/<component>/`.
2. Update all five skins for that component. Read one finished skin first and
   match its structure; the five should differ only where the libraries do.
3. Extend the shared assertions in `shared.tsx` when the behaviour is common,
   rather than repeating it in each `<library>.test.tsx`.
4. For the data table, update the five docs samples the same way.
5. Run the checks below.

## Adding a library

1. Add `<library>/components.tsx` and `<library>.test.tsx` under the
   integrations folder of all four components, modelled on an existing library.
2. Add the library to `LIBRARIES` in `packages/ai/src/knowledge/types.ts` and
   install its packages as dev dependencies at the root.
3. For the data table docs, add `<library>.tsx`, `<library>-demo.tsx` and a
   `provider-<library>.tsx`, and register the provider in `providers.tsx`.
4. Run the checks below, then update the README's "Ready-made adapters"
   section and the changelog.

## Checks

```bash
pnpm test           # the integration suites for every library
pnpm typecheck
pnpm build:ai       # regenerates packages/ai/knowledge/adapters
pnpm test:ai        # drift.test.ts fails if any adapter no longer matches its skin
pnpm --filter slotsmith-docs check   # type-checks the docs samples
```

Commit the regenerated files under `packages/ai/knowledge/adapters/` together
with the skin change that produced them.
