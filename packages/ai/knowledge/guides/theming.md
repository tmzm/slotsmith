# Theming

The stylesheet styles only the built-in fallbacks, and every colour, radius and size in it is a CSS custom property. Replaced parts are never affected.

## Tokens

Each component reads its own prefix and falls back to the data table's tokens where they overlap, so one theme covers every component:

| Prefix | Component | Tokens |
| --- | --- | --- |
| `--rdt-*` | Data table, and the shared base | `accent`, `bg`, `border`, `checkbox-size`, `danger`, `font-size`, `header-bg`, `hover`, `max-height`, `muted`, `padding-x`, `padding-y`, `radius`, `selected`, `skeleton-bg`, `stripe`, `surface`, `text` |
| `--sac-*` | Autocomplete | `accent`, `border`, `danger`, `hover`, `muted`, `radius`, `surface`, `text` |
| `--sdp-*` | Date picker | `accent`, `border`, `cell`, `gap`, `muted`, `on-accent`, `radius`, `surface`, `text` |
| `--sfu-*` | File uploader | `accent`, `bg`, `border`, `danger`, `font-size`, `gap`, `hover`, `muted`, `radius`, `surface`, `text`, `tile-size` |

```css
:root {
  --rdt-accent: #7c3aed;   /* links, focus rings, progress, selected days */
  --rdt-border: #e4e4e7;
  --rdt-radius: 12px;
  --rdt-surface: #ffffff;
}

/* Component-specific tokens on top. */
:root {
  --sfu-tile-size: 200px;
  --sac-radius: 8px;
  --sdp-cell: 2.25rem;
}
```

## Dark mode

Dark mode is a class or an attribute on any ancestor: no provider, no JavaScript.

```css
.dark, [data-theme="dark"] {
  --rdt-surface: #141416;
  --rdt-border: #2a2a2a;
  --rdt-text: #f5f5f5;
}
```

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
