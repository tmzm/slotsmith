import type { MessageKey } from "@/i18n";

export type ComponentSlug = "data-table" | "autocomplete" | "date-picker" | "file-uploader";

export interface ComponentMeta {
  slug: ComponentSlug;
  exportName: "DataTable" | "Autocomplete" | "DatePicker" | "FileUploader";
  title: MessageKey;
  summary: MessageKey;
  guides: { slug: string; title: MessageKey }[];
}

/** The four components, in sidebar order, each with its guides in reading order. */
export const COMPONENTS: ComponentMeta[] = [
  {
    slug: "data-table",
    exportName: "DataTable",
    title: "nav.dataTable",
    summary: "summary.dataTable",
    guides: [
      { slug: "sorting-and-selection", title: "guide.dataTable.sortingAndSelection" },
      { slug: "pagination", title: "guide.dataTable.pagination" },
      { slug: "server-data", title: "guide.dataTable.serverData" },
      { slug: "tree-rows", title: "guide.dataTable.treeRows" },
      { slug: "virtual-rows", title: "guide.dataTable.virtualRows" },
      { slug: "row-reorder", title: "guide.dataTable.rowReorder" },
      { slug: "footers", title: "guide.dataTable.footers" },
      { slug: "headless-hook", title: "guide.dataTable.headlessHook" },
    ],
  },
  {
    slug: "autocomplete",
    exportName: "Autocomplete",
    title: "nav.autocomplete",
    summary: "summary.autocomplete",
    guides: [
      { slug: "select-or-combobox", title: "guide.autocomplete.selectOrCombobox" },
      { slug: "multiple", title: "guide.autocomplete.multiple" },
      { slug: "remote-options", title: "guide.autocomplete.remoteOptions" },
      { slug: "states", title: "guide.autocomplete.states" },
      { slug: "creatable", title: "guide.autocomplete.creatable" },
      { slug: "virtual", title: "guide.autocomplete.virtual" },
      { slug: "compound-parts", title: "guide.autocomplete.compoundParts" },
    ],
  },
  {
    slug: "date-picker",
    exportName: "DatePicker",
    title: "nav.datePicker",
    summary: "summary.datePicker",
    guides: [
      { slug: "modes", title: "guide.datePicker.modes" },
      { slug: "bounds-and-blocked-days", title: "guide.datePicker.boundsAndBlockedDays" },
      { slug: "presets", title: "guide.datePicker.presets" },
      { slug: "day-content", title: "guide.datePicker.dayContent" },
      { slug: "compound-parts", title: "guide.datePicker.compoundParts" },
    ],
  },
  {
    slug: "file-uploader",
    exportName: "FileUploader",
    title: "nav.fileUploader",
    summary: "summary.fileUploader",
    guides: [
      { slug: "picker", title: "guide.fileUploader.picker" },
      { slug: "uploads", title: "guide.fileUploader.uploads" },
      { slug: "tile", title: "guide.fileUploader.tile" },
      { slug: "compact", title: "guide.fileUploader.compact" },
      { slug: "editing-a-record", title: "guide.fileUploader.editingARecord" },
      { slug: "validation", title: "guide.fileUploader.validation" },
      { slug: "virtual", title: "guide.fileUploader.virtual" },
    ],
  },
];

/** The metadata for a component slug. Throws for an unknown slug. */
export function componentMeta(slug: string): ComponentMeta {
  const meta = COMPONENTS.find((c) => c.slug === slug);
  if (!meta) throw new Error(`Unknown component "${slug}". Expected one of: ${COMPONENTS.map((c) => c.slug).join(", ")}.`);
  return meta;
}

const languages = [undefined, "ar"] as const;

/** Static paths for `components/[component]/…` pages, English then Arabic. */
export function componentPaths(): { params: { lang: string | undefined; component: ComponentSlug } }[] {
  return languages.flatMap((lang) => COMPONENTS.map((c) => ({ params: { lang, component: c.slug } })));
}

/** Static paths for `components/[component]/guides/[guide]`, English then Arabic. */
export function guidePaths(): { params: { lang: string | undefined; component: ComponentSlug; guide: string } }[] {
  return languages.flatMap((lang) =>
    COMPONENTS.flatMap((c) => c.guides.map((g) => ({ params: { lang, component: c.slug, guide: g.slug } }))),
  );
}
