# Theming

The stylesheet styles only the built-in fallbacks, and every colour, radius and size in it is a CSS custom property. Replaced parts are never affected.

## Tokens

All four components share one default look. Every colour, radius and font-size token reads a shared `--ss-*` token first, so setting the shared ones restyles every component at once:

| Shared token | Default (light / dark) |
| --- | --- |
| `--ss-surface` | `#ffffff` / `#141416` |
| `--ss-text` | `#111827` / `#f5f5f5` |
| `--ss-muted` | `#6b7280` / `#a3a3a3` |
| `--ss-border` | `#e5e7eb` / `#2a2a2a` |
| `--ss-accent` | `#2563eb` / `#60a5fa` |
| `--ss-on-accent` | `#ffffff` / `#0b0b0c` |
| `--ss-danger` | `#dc2626` / `#f87171` |
| `--ss-hover` | `rgb(0 0 0 / 4%)` / `rgb(255 255 255 / 6%)` |
| `--ss-selected` | `rgb(37 99 235 / 8%)` / `rgb(96 165 250 / 12%)` |
| `--ss-radius` | `8px` |
| `--ss-font-size` | `14px` |

Each component also reads its own prefix, which overrides the shared token for that component alone. The date picker and the file uploader read the shared token first and the data table's `--sdt-*` token second, so a theme written against the table's tokens still reaches them:

| Prefix | Component | Tokens |
| --- | --- | --- |
| `--sdt-*` | Data table | `accent`, `bg`, `border`, `checkbox-size`\*, `danger`, `font-size`\*, `header-bg`, `hover`, `max-height`, `muted`, `padding-x`\*, `padding-y`\*, `radius`, `selected`, `skeleton-bg`, `skeleton-bg-2`, `stripe`, `surface`, `text` |
| `--sac-*` | Autocomplete | `accent`, `border`, `danger`, `font-size`, `hover`, `muted`, `radius`, `surface`, `text` |
| `--sdp-*` | Date picker (falls back to `--sdt-*`) | `accent`, `border`, `cell`, `font-size`, `gap`, `hover`, `muted`, `on-accent`, `radius`, `surface`, `text` |
| `--sfu-*` | File uploader (falls back to `--sdt-*`) | `accent`, `bg`, `border`, `danger`, `font-size`, `gap`, `hover`, `muted`, `radius`, `surface`, `text`, `tile-size` |

\* The data table's density tokens (`--sdt-font-size`, `--sdt-padding-x`, `--sdt-padding-y`, `--sdt-checkbox-size`) are not declared by the stylesheet: the `size` prop supplies their values unless you set them, on `:root`, a wrapper or the table, and then yours win at every size. `--sdt-font-size` otherwise follows `--ss-font-size` (one pixel smaller at the default `sm` size).

The colour, radius and font-size tokens are not declared on `:root` either: each component resolves them on its own root element (and popup), reading your component token first, then the shared `--ss-*` one, then its default. So set any of them, shared or per component, on `:root` for the whole page or on any wrapper element (or a component's root) for just the components inside it; a component token beats the shared one wherever each is set. The remaining tokens (`stripe`, `skeleton-bg`, `max-height`, `cell`, `gap`, `tile-size`) are declared on `:root`; override them there or on any wrapper. A value you set applies to both themes: set its dark value under `.dark, [data-theme="dark"]` too.

```css
:root {
  --ss-accent: #7c3aed;   /* links, focus rings, progress, selected days */
  --ss-border: #e4e4e7;
  --ss-radius: 12px;
}

/* Component-specific tokens on top. */
:root {
  --sac-accent: #0f766e;  /* only the autocomplete */
  --sfu-tile-size: 200px;
  --sdp-cell: 2.25rem;
}
```

## Dark mode

Dark mode is a class or an attribute on any ancestor: no provider, no JavaScript. The stylesheet never follows the system setting on its own.

```css
.dark, [data-theme="dark"] {
  --ss-surface: #0f172a;
  --ss-border: #1e293b;
  --ss-text: #f1f5f9;
}
```

A light island inside a dark page (`[data-theme="light"]` nested under `.dark`) is not supported.

## Class prefixes

Fallback classes follow one scheme in every component: `s` plus the component's initials (`sdt`, `sac`, `sdp`, `sfu`), then `__part`, then `--modifier`, so they never collide with an application's classes. A part with the same role has the same name in every component: `__popup`, `__trigger`, `__value` (`--empty` when it shows the placeholder), `__clear`, `__list`, `__message` for an empty state, `__error` for an error state, `__sr-only` for text read only by screen readers. Target state with the `data-*` attributes rather than modifier classes: the attributes are part of the public contract, the class names are not. Select `.sdt__message, .sdt__error` to style both states of the data table at once.

## Ready-made themes

Six theme stylesheets set only the shared `--ss-*` tokens above, each with a light palette on `:root` and a dark one on `.dark, [data-theme="dark"]`: `minimal`, `soft`, `ocean`, `forest`, `sunset` and `contrast` (a high-contrast palette for accessibility). Import one after the main stylesheet:

```ts
import "slotsmith/styles.css";
import "slotsmith/themes/soft.css";
```

A theme sets the same `--ss-*` tokens as an app's own overrides, so import order decides which wins: import the app's own overrides after the theme to keep them.

Write a custom theme the same way: a stylesheet that sets only the shared `--ss-*` tokens above, nothing else, on `:root` and again under `.dark, [data-theme="dark"]`. No component-specific token (`--sdt-*`, `--sac-*`, `--sdp-*`, `--sfu-*`) and no other selector belongs in a theme file — those stay for an app's own per-component overrides, applied on top.

## Without the stylesheet

Skip the import and style the parts yourself, for example with Tailwind on element parts:

```tsx
<FileUploader
  components={{
    Dropzone: (props) => (
      <div className="rounded-lg border border-dashed p-8 data-[dragging]:border-primary" {...props} />
    ),
  }}
/>
```
