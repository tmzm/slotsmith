# Autocomplete guide

A combobox that is also a select: search, single or multiple selection, remote options with debounce and paging, create-as-you-type, full keyboard and typeahead.

```bash
npm i slotsmith
```

## Local options

```tsx
import { Autocomplete } from "slotsmith/autocomplete";
import "slotsmith/autocomplete.css";

const countries = [
  { value: "fr", label: "France" },
  { value: "jp", label: "Japan" },
];

<Autocomplete options={countries} value={code} onChange={setCode} />;
```

The value is the option's id, not the option. Ids are read with `getOptionValue` (default `option.value ?? option.id`) and text with `getOptionLabel` (default `option.label ?? option.name`); pass both for any other shape.

## Multiple selection

`multiple` is a discriminated union: `value`, `defaultValue`, `onChange` and `selected` all narrow from it.

```tsx
<Autocomplete multiple options={tags} value={tagIds} onChange={(ids, options) => setTagIds(ids)} maxTags={3} />
```

## A select without search

`searchable={false}` removes the search box and keeps typeahead: typing jumps to the matching option.

## Remote options

`useAsyncOptions` supplies debounced, abortable, paged options as props to spread in:

```tsx
import { Autocomplete, useAsyncOptions } from "slotsmith/autocomplete";

const [open, setOpen] = useState(false);
const brands = useAsyncOptions({
  load: (query, page, signal) => api.brands({ query, page, signal }),
  enabled: open,
});

<Autocomplete {...brands} open={open} onOpenChange={setOpen} value={brandId} onChange={setBrandId} selected={currentBrand} />;
```

Pass `selected` (the option behind `value`) when the selected option may not be in the current page of results, so the trigger can still label it.

## Creating options

`creatable` offers a "Create …" row once the search has settled and matched nothing; `onCreate(query)` receives the text and `createLoading` shows progress.

## Replacing parts

`Root`, `Trigger`, `Popup`, `Search`, `List` and `Option` are element parts. Rich option rows belong in the `OptionLabel` widget part, which receives the whole option, because `Option` only receives DOM props:

```tsx
<Autocomplete
  options={users}
  components={{
    OptionLabel: ({ option, label }) => (
      <span className="flex items-center gap-2">
        <img src={option.avatar} alt="" className="size-5 rounded-full" />
        {label}
      </span>
    ),
  }}
/>
```

Replacing `Popup` with a library popover replaces the built-in positioning too.

## Forms

`name` renders a hidden input per value, so a plain HTML form submits it; `onBlur` fires when focus leaves the whole control, for form libraries.

## Long lists

`VirtualAutocomplete` from `slotsmith/virtual` windows the options (needs `@tanstack/react-virtual`).
