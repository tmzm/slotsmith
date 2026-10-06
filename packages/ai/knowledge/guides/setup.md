# Setting up slotsmith

slotsmith is a headless React component library: every part of every component is a slot you can replace, and anything you don't replace renders as plain, accessible HTML that is already finished.

## Install

```bash
npm i slotsmith
# or: pnpm add slotsmith · yarn add slotsmith · bun add slotsmith
```

React 18 or 19. Peer dependencies are per component, so only install what the component you import needs:

| Component | Also install |
| --- | --- |
| Data table | `@tanstack/react-table@^9` |
| Autocomplete | nothing |
| Date picker | nothing |
| File uploader | nothing |
| Any virtualized list (`slotsmith/virtual`) | `@tanstack/react-virtual@^3` |

## Entry points

Every component has its own entry point, and the root entry re-exports all of them:

```tsx
import { DataTable } from "slotsmith/data-table";
import { Autocomplete } from "slotsmith/autocomplete";
import { DatePicker } from "slotsmith/date-picker";
import { FileUploader } from "slotsmith/file-uploader";

// The same exports, from one place. ES module bundlers drop what is unused.
import { DataTable, DatePicker } from "slotsmith";

// Windowed variants for lists that can grow without bound.
import { VirtualAutocomplete, VirtualDataTable, VirtualFileUploader } from "slotsmith/virtual";
```

Prefer the per-component entry: on CommonJS it is the only way to avoid loading every component, and it states the intent.

Importing one component never pulls in another, with one deliberate exception: the data table's page-size control is the autocomplete, so `DataTable` and `VirtualDataTable` bundle the autocomplete. The autocomplete never pulls in the table, and packs and `slotsmith/provider` pull in no component.

## Styles

The stylesheet only styles the built-in fallbacks. Import it once, near the root of the app, either whole or per component:

```tsx
import "slotsmith/styles.css";         // every component
import "slotsmith/data-table.css";     // or just the ones you use (this one includes the autocomplete's rules)
import "slotsmith/autocomplete.css";
import "slotsmith/date-picker.css";
import "slotsmith/file-uploader.css";
```

When every part is replaced by your own design system, import no stylesheet at all; the components never reference it.

## One provider for the whole app

`SlotsmithProvider`, from `slotsmith/provider`, is optional. Put one near the root when the app wants either of the two settings it shares with every component below it:

```tsx
import { SlotsmithProvider } from "slotsmith/provider";

<SlotsmithProvider locale={language} locales={[ar, fr]} components={components}>
  <App />
</SlotsmithProvider>;
```

- `locale` / `locales` set the language; see the i18n guide.
- `components` replaces parts for every component at once (`{ dataTable, autocomplete, datePicker, fileUploader }`), which is how a design-system adapter is applied once instead of on each component; see the slots and adapters guides.

The provider imports no component, so it adds nothing to the bundle beyond itself. It is a client component like the rest; in a React Server Components framework render it from a `"use client"` file, because the parts in `components` are functions.

## Client components

Every entry point starts with `"use client"`. The components use state, effects and context, and they accept functions (`onChange`, `components`, label callbacks). In a React Server Components framework, render them from a file marked `"use client"` that owns the state.

## Next.js

App Router: import the stylesheet once in `app/layout.tsx`, and use the component inside a client component.

```tsx
// app/layout.tsx
import "slotsmith/styles.css";
```

```tsx
// app/bookings/stay-picker.tsx
"use client";

import { useState } from "react";
import { DatePicker, type DateRange } from "slotsmith/date-picker";

export function StayPicker() {
  const [stay, setStay] = useState<DateRange | null>(null);
  return <DatePicker mode="range" value={stay} onChange={setStay} />;
}
```

Pages Router: import the stylesheet in `pages/_app.tsx`; no `"use client"` is needed.

## Vite

Import the stylesheet in the entry file (`src/main.tsx`) or next to the component that uses it. Nothing else is required.

```tsx
// src/main.tsx
import "slotsmith/styles.css";
```

## Remix

Remix on Vite (and React Router 7 in framework mode) accepts a side-effect import in `app/root.tsx`:

```tsx
// app/root.tsx
import "slotsmith/styles.css";
```

With the classic Remix compiler, link the stylesheet instead:

```tsx
// app/root.tsx
import slotsmithStyles from "slotsmith/styles.css";

export const links = () => [{ rel: "stylesheet", href: slotsmithStyles }];
```

The components are server-rendered and hydrate like any other React component.

## Virtualized lists

The data table, the autocomplete and the file uploader each have a windowed variant in `slotsmith/virtual`. It renders only what is in view and keeps every slot working. It is a separate entry so the optional peer is only needed by projects that use it:

```bash
npm i @tanstack/react-virtual
```

```tsx
import { VirtualDataTable } from "slotsmith/virtual";

<VirtualDataTable data={logLines} columns={columns} virtual={{ estimateSize: 36 }} />;
```

The date picker has no virtual variant: a calendar has no unbounded list.
