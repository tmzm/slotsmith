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

Each component also reads its own prefix, which overrides the shared token for that component alone. The date picker and the file uploader read the shared token first and the data table's `--rdt-*` token second, so a theme written against `--rdt-*` still reaches them:

| Prefix | Component | Tokens |
| --- | --- | --- |
| `--rdt-*` | Data table | `accent`, `bg`, `border`, `checkbox-size`, `danger`, `font-size`, `header-bg`, `hover`, `max-height`, `muted`, `padding-x`, `padding-y`, `radius`, `selected`, `skeleton-bg`, `skeleton-bg-2`, `stripe`, `surface`, `text` |
| `--sac-*` | Autocomplete | `accent`, `border`, `danger`, `font-size`, `hover`, `muted`, `radius`, `surface`, `text` |
| `--sdp-*` | Date picker (falls back to `--rdt-*`) | `accent`, `border`, `cell`, `font-size`, `gap`, `hover`, `muted`, `on-accent`, `radius`, `surface`, `text` |
| `--sfu-*` | File uploader (falls back to `--rdt-*`) | `accent`, `bg`, `border`, `danger`, `font-size`, `gap`, `hover`, `muted`, `radius`, `surface`, `text`, `tile-size` |

Every component token is declared on `:root`, so override it there (or on a component's root element for one instance). A value set on `:root`, shared or not, applies to both themes: set its dark value under `.dark, [data-theme="dark"]` too.

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

Fallback classes are prefixed per component (`rdt__`, `sac__`, `sdp__`, `sfu__`), so they never collide with an application's classes. Target state with the `data-*` attributes rather than modifier classes: the attributes are part of the public contract, the class names are not.

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
