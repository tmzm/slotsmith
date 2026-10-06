# Adapters

Twenty ready-made adapters — every component times five component libraries — are generated from the tested integration skins in the library source. Each one is a small `Partial<…Components>` map: element slots get the library's primitive with props spread onto it, widget slots get a component that renders the library's control from semantic props.

## Libraries

`mui`, `shadcn`, `chakra`, `antd`, `radix` (`ant-design` and `radix-themes` are accepted as aliases for `antd` and `radix`). `radix` is **Radix Themes** (`@radix-ui/themes`), the styled component library; an app built on the bare Radix primitives wants `shadcn` instead — shadcn/ui's own components are themselves built on those primitives.

`get_adapter_example` returns one adapter's map as Markdown and JSON, to read or copy by hand.

## The `add` command

`npx slotsmith-ai add` copies an adapter into the project as a real file, so it can be edited like any other component:

```
slotsmith-ai add <component...> --ui <library> [--out <dir>] [--force] [--dry-run]
slotsmith-ai add --all --ui <library>
```

- `<component>` is `data-table`, `autocomplete`, `file-uploader` or `date-picker`; `--all` adds every one.
- `--out` chooses where to write. Default: `src/components/slotsmith` when `src/` exists, else `components/slotsmith`. It must stay inside the project, also through symbolic links and junctions.
- Each file starts with a one-line comment naming the library and the `slotsmith-ai` version it came from. After writing, the command prints the import and a usage line, one `npm install …` line for whatever the project's `package.json` does not already list, and, for `shadcn`, one `npx shadcn@latest add …` line for the shadcn/ui components the adapter uses. It never installs anything itself.
- **Editing an adapter afterward is expected — it is the project's own code from that point on.** Running `add` again on an untouched file reports `unchanged` and leaves it alone (the header line is not compared, so a file from an older `slotsmith-ai` whose body is untouched still counts as unchanged). A file that has been edited is left as is: the command names it, says how many lines differ from the adapter `slotsmith-ai` would write, and exits with code `1`. Pass `--force` to replace it anyway. `--dry-run` prints what would happen and writes nothing, exiting the same way the real run would (`1` when it would refuse).

## Applying adapters once, at the provider

An adapter map can go on each component (`<DatePicker components={muiDatePicker} />`), or once on `SlotsmithProvider`, which hands it to every component of that kind below it. **Prefer the provider when an app uses a component in more than one place**: a new `<DataTable>` anywhere in the tree is then already skinned, with nothing to remember.

```tsx
import { SlotsmithProvider, type SlotsmithComponents } from "slotsmith/provider";
import { muiAutocomplete } from "@/components/slotsmith/autocomplete";
import { muiDataTable } from "@/components/slotsmith/data-table";
import { muiDatePicker } from "@/components/slotsmith/date-picker";
import { muiFileUploader } from "@/components/slotsmith/file-uploader";

// Module scope, so the object keeps its identity between renders.
const components: SlotsmithComponents = {
  dataTable: muiDataTable,
  autocomplete: muiAutocomplete,
  datePicker: muiDatePicker,
  fileUploader: muiFileUploader,
};

<SlotsmithProvider components={components}>
  <App />
</SlotsmithProvider>;
```

- The keys are `dataTable`, `autocomplete`, `datePicker` and `fileUploader`. Each takes exactly what that component's own `components` prop takes, so every adapter fits unchanged; name only the components the app uses.
- A component's own `components` prop still wins, slot by slot, so one table can swap a single part and keep the rest of the adapter: `<DataTable components={{ Empty: NoOrders }} />`.
- The virtual variants (`VirtualDataTable`, `VirtualAutocomplete`, `VirtualFileUploader`) and layouts rebuilt from `<Component>.Provider` and the parts read the same maps.
- The data table's built-in page-size select is the slotsmith `Autocomplete`, so `components.autocomplete` skins it too. An adapter that sets the table's `PageSizeSelect` slot, or draws its own control inside `Pagination`, replaces it altogether. Every generated table adapter does one or the other (`antd` and `radix` set `PageSizeSelect`, a segmented control; `mui`, `chakra` and `shadcn` draw a select inside their `Pagination`), so with a table adapter in place the page-size control is the table adapter's, and the autocomplete adapter skins it only on a table that has none.
- Provider-level autocomplete slots receive every option type, including the table's page-size options (`{ value: number, label: string }`). `components.autocomplete` is typed `Partial<AutocompleteComponents<unknown>>` for that reason: the generated adapters fit as they are, while a `Tag` or `OptionLabel` typed for one option shape is a type error at the provider. Put such a part on that autocomplete's own `components` prop.
- The same provider also sets the language (`locale`, `locales`); see the i18n guide. One provider carries both.

The slots guide has the full precedence rule and how nested providers merge.

## The shadcn registry

The same shadcn/ui adapters are also published as a [shadcn/ui registry](https://ui.shadcn.com/docs/registry): `pnpm build` (or `pnpm registry` on its own) writes one `registry-item.json`-shaped file per component into `packages/ai/registry/`, plus a `registry.json` index. Nothing under `registry/` is committed; it is rebuilt from the generated knowledge on demand.

Serve that folder from any static host and install a component the same way shadcn's own CLI installs anything else:

```bash
npx shadcn@latest add https://<your-host>/date-picker.json
```

It writes the file to the same path `slotsmith-ai add --ui shadcn` uses, installs the adapter's peers automatically, and adds any shadcn/ui components (`button`, `checkbox`, …) the adapter itself depends on.

One difference between the two routes: shadcn's own CLI strips a file's leading doc comment when it installs a `registry:component`, so a file placed this way is missing the adapter's short "what this is" header. Everything else — every slot, every prop — is the same file either way.
