/**
 * Comparison
 *
 * What the comparison page states about slotsmith and five other projects,
 * one cell per subject and attribute. Every cell of another project names
 * the official page or repository file it was read from, and each subject
 * carries the date it was checked. A cell that could not be read from such a
 * source says "Not documented". Cells describe; none ranks a project.
 *
 * slotsmith's own license, peers and right-to-left packs are read from the
 * library, so they cannot drift from what ships.
 */
import { PACKS } from "@/lib/packs";

export type Attribute = "components" | "styling" | "replaceParts" | "builtOn" | "dependencies" | "license" | "rtl" | "virtualisation" | "typescript";

/** One statement about one subject. Backticks in `text` and `note` mark code. */
export interface Cell {
  text: string;
  /** Where the statement was read: an https URL, or a site path for slotsmith's own cells. Required for every other subject. */
  source?: string;
  /** Further pages the statement draws on, after `source`. */
  also?: string[];
  /** A caveat about the sources, such as two that disagree. */
  note?: string;
}

export interface Subject {
  name: string;
  /** The project's home page. */
  url: string;
  /** The day its cells were checked against their sources, `YYYY-MM-DD`. */
  checked: string;
  /** A caveat that applies to the whole subject. */
  note?: string;
  cells: Record<Attribute, Cell>;
}

/** The rows, in page order, with their labels. */
export const ATTRIBUTES: { key: Attribute; label: string }[] = [
  { key: "components", label: "Components covered" },
  { key: "styling", label: "Styling model" },
  { key: "replaceParts", label: "How you replace a part" },
  { key: "builtOn", label: "Built on" },
  { key: "dependencies", label: "Required dependencies and peers" },
  { key: "license", label: "License" },
  { key: "rtl", label: "RTL support" },
  { key: "virtualisation", label: "Virtualisation" },
  { key: "typescript", label: "TypeScript" },
];

/** Words of praise or blame no cell may use. */
export const BANNED_WORDS: string[] = ["best", "powerful", "beautiful", "simple", "easy", "blazing", "modern", "lightweight", "robust", "seamless", "elegant", "intuitive"];

/** Where a reader reports a cell that is wrong or out of date. */
export const CORRECTION_URL = "https://github.com/tmzm/slotsmith/issues/new?title=Comparison%20correction";

interface LibraryPackage {
  license: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
}

const packages = import.meta.glob<LibraryPackage>("../../../package.json", { eager: true, import: "default" });
const library = Object.values(packages)[0];
if (!library) throw new Error("The comparison could not read the library's package.json.");

/** `name` range pairs as a sentence fragment: "`react` >=18, `react-dom` >=18". */
const ranges = (entries: [string, string][]) => entries.map(([name, range]) => `\`${name}\` ${range}`).join(", ");

const peers = Object.entries(library.peerDependencies ?? {});
const isOptional = (name: string) => library.peerDependenciesMeta?.[name]?.optional === true;
const rtlPacks = PACKS.filter((pack) => pack.dir === "rtl");

const DOCS = {
  mrt: "https://www.material-react-table.com/docs",
  mrtRepo: "https://raw.githubusercontent.com/KevinVandy/material-react-table/v3",
  mantine: "https://v2.mantine-react-table.com/docs",
  mantineRepo: "https://raw.githubusercontent.com/KevinVandy/mantine-react-table/v2",
  shadcn: "https://ui.shadcn.com/docs",
  aria: "https://react-aria.adobe.com",
  ariaRepo: "https://raw.githubusercontent.com/adobe/react-spectrum/main/packages/react-aria-components",
  ark: "https://ark-ui.com/docs",
  arkRepo: "https://raw.githubusercontent.com/chakra-ui/ark/main",
  park: "https://park-ui.com/docs",
  parkRepo: "https://raw.githubusercontent.com/chakra-ui/park-ui/main",
} as const;

/** The subjects, slotsmith first. */
export const SUBJECTS: Subject[] = [
  {
    name: "slotsmith",
    url: "https://slotsmith.dev/",
    checked: "2026-10-06",
    cells: {
      components: {
        text: "Data table, autocomplete (a select or a combobox), date picker and file uploader.",
        source: "/getting-started/",
      },
      styling: {
        text: "Optional stylesheets, one for everything or one per component, that read `--ss-*` CSS custom properties. Without a stylesheet the parts are plain HTML with stable class names, styled by your CSS, Tailwind or design system.",
        source: "/theming/",
      },
      replaceParts: {
        text: "Each component is made of named slots; its `components` prop takes your component for any of them. Slots you leave alone keep their fallbacks.",
        source: "/guides/",
      },
      builtOn: {
        text: "React. The data table uses TanStack Table 9; `@floating-ui/react-dom` places the popups.",
        source: "/getting-started/#install",
      },
      dependencies: {
        text: `Peers: ${ranges(peers.filter(([name]) => !isOptional(name)))}. Optional peers: ${ranges(peers.filter(([name]) => isOptional(name)))}. Dependencies: ${ranges(Object.entries(library.dependencies ?? {}))}.`,
        source: "/getting-started/#install",
      },
      license: { text: library.license, source: "/trust/#license" },
      rtl: {
        text: `The stylesheets use CSS logical properties, so components mirror inside \`dir="rtl"\`. ${rtlPacks.length} of the ${PACKS.length} locale packs are right-to-left: ${rtlPacks.map((pack) => `\`${pack.code}\``).join(", ")}.`,
        source: "/theming/#rtl",
        also: ["/languages/#available-packs"],
      },
      virtualisation: {
        text: "`VirtualDataTable`, `VirtualAutocomplete` and `VirtualFileUploader` from `slotsmith/virtual` render only the rows or options in view. They need `@tanstack/react-virtual`.",
        source: "/components/data-table/guides/virtual-rows/",
      },
      typescript: {
        text: "Written in TypeScript; the package ships its type declarations.",
        source: "/components/data-table/api/",
      },
    },
  },
  {
    name: "Material React Table",
    url: "https://www.material-react-table.com/",
    checked: "2026-10-06",
    note: "Read from the repository's `v3` branch (package version 3.2.1) and the V3 docs.",
    cells: {
      components: {
        text: "Data table. Combobox, date picker and file uploader are not part of the package.",
        source: `${DOCS.mrtRepo}/README.md`,
      },
      styling: {
        text: "Styled by Material UI. It follows the app's Material UI theme; the docs recommend the `sx` prop, passed through the `mui…Props` options, for styling its parts.",
        source: `${DOCS.mrt}/guides/customize-components`,
      },
      replaceParts: {
        text: "`mui…Props` options pass props to the Material UI components inside the table. `renderTopToolbar` and `renderBottomToolbar` replace the toolbars, and `MRT_` sub-components such as `MRT_TableContainer` can be arranged in your own layout.",
        source: `${DOCS.mrt}/guides/toolbar-customization`,
        also: [`${DOCS.mrt}/guides/customize-components`],
      },
      builtOn: {
        text: "Material UI V6 and TanStack Table V8, as its README states.",
        source: `${DOCS.mrtRepo}/README.md`,
      },
      dependencies: {
        text: "Peers: `@mui/material` >=6, `@mui/icons-material` >=6, `@mui/x-date-pickers` >=7.15, `@emotion/react` >=11.13, `@emotion/styled` >=11.13, `react` >=18.0, `react-dom` >=18.0. Dependencies: `@tanstack/react-table`, `@tanstack/react-virtual`, `@tanstack/match-sorter-utils`, `highlight-words`.",
        source: `${DOCS.mrtRepo}/packages/material-react-table/package.json`,
      },
      license: { text: "MIT", source: `${DOCS.mrtRepo}/packages/material-react-table/package.json` },
      rtl: {
        text: "The column resizing guide documents `columnResizeDirection: \"rtl\"` for right-to-left tables, set automatically from the Material UI theme's `direction`. The localization guide lists `ar`, `fa` and `he` among the included locales and does not mention RTL.",
        source: `${DOCS.mrt}/guides/column-resizing`,
        also: [`${DOCS.mrt}/guides/localization`],
      },
      virtualisation: {
        text: "Row and column virtualisation, turned on with `enableRowVirtualization` and `enableColumnVirtualization`, using `@tanstack/react-virtual`.",
        source: `${DOCS.mrt}/guides/virtualization`,
      },
      typescript: {
        text: "Its README lists \"Advanced TypeScript Generics Support (TypeScript Optional)\".",
        source: `${DOCS.mrtRepo}/README.md`,
      },
    },
  },
  {
    name: "Mantine React Table",
    url: "https://www.mantine-react-table.com/",
    checked: "2026-10-06",
    note: "The repository's default branch is `v2` (package version 2.0.0-beta.9, for Mantine V7), while www.mantine-react-table.com documents V1, for Mantine V6. This column follows the repository and the V2 docs.",
    cells: {
      components: {
        text: "Data table. Combobox, date picker and file uploader are not part of the package.",
        source: `${DOCS.mantineRepo}/README.md`,
      },
      styling: {
        text: "Styled by Mantine. It follows the app's Mantine theme; parts are restyled with its CSS variables, the `mrt-` and `mantine-` class names, or `style` on the `mantine…Props` options. The install guide has you import `mantine-react-table/styles.css`.",
        source: `${DOCS.mantine}/guides/customize-components`,
        also: [`${DOCS.mantine}/getting-started/install`],
      },
      replaceParts: {
        text: "`mantine…Props` options pass props to the Mantine components inside the table. `renderTopToolbar` and `renderBottomToolbar` replace the toolbars, and `MRT_` sub-components such as `MRT_TableContainer` can be arranged in your own layout.",
        source: `${DOCS.mantine}/guides/toolbar-customization`,
        also: [`${DOCS.mantine}/guides/customize-components`],
      },
      builtOn: {
        text: "Mantine V7 and TanStack Table V8, as its README states.",
        source: `${DOCS.mantineRepo}/README.md`,
      },
      dependencies: {
        text: "Peers: `@mantine/core` ^7.17.7, `@mantine/dates` ^7.17.7, `@mantine/hooks` ^7.17.7, `@tabler/icons-react` >=2.23.0, `clsx` >=2, `dayjs` >=1.11, `react` >=18.0, `react-dom` >=18.0. Dependencies: `@tanstack/react-table`, `@tanstack/react-virtual`, `@tanstack/match-sorter-utils`.",
        source: `${DOCS.mantineRepo}/packages/mantine-react-table/package.json`,
        also: [`${DOCS.mantineRepo}/README.md`],
        note: "The same branch's README still lists Mantine V6 and `@emotion/react` in its install step. The package.json is used here.",
      },
      license: { text: "MIT", source: `${DOCS.mantineRepo}/packages/mantine-react-table/package.json` },
      rtl: {
        text: "The column resizing guide documents `columnResizeDirection: \"rtl\"` for right-to-left tables. The localization guide lists `ar`, `fa` and `he` among the included locales and does not mention RTL.",
        source: `${DOCS.mantine}/guides/column-resizing`,
        also: [`${DOCS.mantine}/guides/localization`],
      },
      virtualisation: {
        text: "Row and column virtualisation, turned on with `enableRowVirtualization` and `enableColumnVirtualization`, using `@tanstack/react-virtual`.",
        source: `${DOCS.mantine}/guides/virtualization`,
      },
      typescript: {
        text: "Its README lists \"Advanced TypeScript Generics Support (TypeScript Optional)\".",
        source: `${DOCS.mantineRepo}/README.md`,
      },
    },
  },
  {
    name: "shadcn/ui data table",
    url: "https://ui.shadcn.com/docs/components/data-table",
    checked: "2026-10-06",
    note: "This is a guide in the shadcn/ui docs, not an npm package: you write the table component in your own project.",
    cells: {
      components: {
        text: "The guide covers a data table. shadcn/ui's component list also has Combobox and Date Picker; it has no file uploader entry, and the Input page shows `<Input type=\"file\" />`.",
        source: `${DOCS.shadcn}/components/data-table`,
        also: [`${DOCS.shadcn}/components`, `${DOCS.shadcn}/components/input`],
      },
      styling: {
        text: "Tailwind CSS classes in component source that lives in your project. The manual install says \"Components are styled using Tailwind CSS.\"",
        source: `${DOCS.shadcn}/installation/manual`,
      },
      replaceParts: {
        text: "You edit the code. The guide has you build the `DataTable` component yourself from TanStack Table and the `<Table />` parts, so every element is in your own file.",
        source: `${DOCS.shadcn}/components/data-table`,
      },
      builtOn: {
        text: "TanStack Table and the shadcn/ui `<Table />` component. The guide says it uses TanStack Table v9.",
        source: `${DOCS.shadcn}/components/data-table`,
      },
      dependencies: {
        text: "The guide's install step adds the `table` component with the shadcn CLI and installs `@tanstack/react-table`. shadcn/ui's manual install requires Tailwind CSS.",
        source: `${DOCS.shadcn}/components/data-table`,
        also: [`${DOCS.shadcn}/installation/manual`],
      },
      license: { text: "MIT", source: "https://raw.githubusercontent.com/shadcn-ui/ui/main/LICENSE.md" },
      rtl: {
        text: "The guide links to shadcn/ui's RTL guide: with `rtl: true` in `components.json`, the CLI rewrites physical classes as logical ones. That guide says the automatic rewrite is for projects created with `shadcn create` and the new styles, and that Calendar, Pagination and Sidebar need manual migration.",
        source: `${DOCS.shadcn}/rtl`,
        also: [`${DOCS.shadcn}/components/data-table`],
      },
      virtualisation: {
        text: "Not documented. The guide does not mention virtualisation.",
        source: `${DOCS.shadcn}/components/data-table`,
      },
      typescript: {
        text: "The guide's code is TypeScript. shadcn/ui states that its components are written in TypeScript and that a JavaScript version is available through the CLI.",
        source: `${DOCS.shadcn}/javascript`,
        also: [`${DOCS.shadcn}/components/data-table`],
      },
    },
  },
  {
    name: "React Aria Components",
    url: "https://react-aria.adobe.com/",
    checked: "2026-10-06",
    note: "Read from the docs and the `react-aria-components` package.json (version 1.21.1) on the repository's `main` branch.",
    cells: {
      components: {
        text: "Table, ComboBox and DatePicker. For files it has DropZone and FileTrigger; their pages do not describe an upload queue or upload progress.",
        source: `${DOCS.aria}/Table`,
        also: [`${DOCS.aria}/ComboBox`, `${DOCS.aria}/DatePicker`, `${DOCS.aria}/DropZone`, `${DOCS.aria}/FileTrigger`],
      },
      styling: {
        text: "No styles by default. Each component has a default class name, `react-aria-ComponentName`, and data attributes for its states; `className` and `style` also accept functions of the state.",
        source: `${DOCS.aria}/styling`,
      },
      replaceParts: {
        text: "Components are composed from child components that you arrange. The `render` prop swaps a component's DOM element, each component exports a context for building custom children with `useContextProps`, and a hook-based API sits underneath.",
        source: `${DOCS.aria}/customization`,
      },
      builtOn: {
        text: "The `react-aria` and `react-stately` packages, which its package.json lists as dependencies.",
        source: `${DOCS.ariaRepo}/package.json`,
      },
      dependencies: {
        text: "Peers: `react` and `react-dom`, each ^16.8.0 || ^17.0.0-rc.1 || ^18.0.0 || ^19.0.0-rc.1. Dependencies include `react-aria`, `react-stately` and `@internationalized/date`.",
        source: `${DOCS.ariaRepo}/package.json`,
      },
      license: { text: "Apache-2.0", source: `${DOCS.ariaRepo}/package.json` },
      rtl: {
        text: "The docs state that it \"supports right-to-left interactions (e.g. keyboard navigation)\" and includes localized strings for 30+ languages.",
        source: `${DOCS.aria}/quality`,
      },
      virtualisation: {
        text: "A `Virtualizer` component renders only the visible items of a ListBox, GridList or Table, with list, grid, waterfall and table layouts.",
        source: `${DOCS.aria}/Virtualizer`,
      },
      typescript: {
        text: "The package ships type declarations: its package.json has a `types` entry.",
        source: `${DOCS.ariaRepo}/package.json`,
      },
    },
  },
  {
    name: "Ark UI / Park UI",
    url: "https://ark-ui.com/",
    checked: "2026-10-06",
    note: "Two projects: Ark UI is the headless library (`@ark-ui/react` 5.39.3 on the repository's `main` branch); Park UI (park-ui.com) is a styled set of components built on it.",
    cells: {
      components: {
        text: "Ark UI has Combobox, Date Picker and File Upload; its component list has no table. Park UI lists a Table, described as \"A component for displaying data in rows and columns\", plus Combobox, Date Picker (marked WIP) and File Upload.",
        source: `${DOCS.ark}/components/combobox`,
        also: [`${DOCS.ark}/components/date-picker`, `${DOCS.ark}/components/file-upload`, `${DOCS.park}/components/table`, `${DOCS.park}/components/date-picker`],
      },
      styling: {
        text: "Ark UI is headless: parts carry `data-scope`, `data-part` and `data-state` attributes and take `className`; its styling guide covers CSS, Panda CSS and Tailwind CSS. Park UI is a styled layer built with Panda CSS.",
        source: `${DOCS.ark}/guides/styling`,
        also: [`${DOCS.park}/introduction`],
      },
      replaceParts: {
        text: "Components are composed from parts such as `Root`, `Trigger` and `Item`. The `asChild` prop renders your own element or component in place of a part's default element. Park UI's CLI adds component source to your project.",
        source: `${DOCS.ark}/guides/composition`,
        also: [`${DOCS.park}/introduction`],
      },
      builtOn: {
        text: "Ark UI: Zag.js state machines, for React, Solid, Vue and Svelte. Park UI: Ark UI and Panda CSS.",
        source: `${DOCS.arkRepo}/README.md`,
        also: [`${DOCS.parkRepo}/README.md`],
      },
      dependencies: {
        text: "`@ark-ui/react` peers: `react` >=18.0.0, `react-dom` >=18.0.0. Its dependencies are `@zag-js/*` packages and `@internationalized/date`. Park UI's install guide asks for a Panda CSS project, `@ark-ui/react` and `lucide-react`.",
        source: `${DOCS.arkRepo}/packages/react/package.json`,
        also: [`${DOCS.park}/installation`],
      },
      license: {
        text: "MIT, for both.",
        source: `${DOCS.arkRepo}/packages/react/package.json`,
        also: [`${DOCS.parkRepo}/LICENSE`],
      },
      rtl: {
        text: "Ark UI's `LocaleProvider` is described as setting \"the locale and direction of the app\", and `useLocaleContext` returns `locale` and `dir`. Park UI: Not documented. Its docs navigation has no RTL page.",
        source: `${DOCS.ark}/utilities/locale`,
        also: [`${DOCS.park}/installation`],
      },
      virtualisation: {
        text: "Ark UI has no table component. Its Combobox page has a virtualised example that uses `@tanstack/virtual`. Park UI: Not documented on its Table page.",
        source: `${DOCS.ark}/components/combobox`,
        also: [`${DOCS.park}/components/table`],
      },
      typescript: {
        text: "Ark UI's README says \"Fully typed with TypeScript\". Park UI: Not documented on the pages checked.",
        source: `${DOCS.arkRepo}/README.md`,
        also: [`${DOCS.park}/introduction`],
      },
    },
  },
];
