import type { MessageKey } from "@/i18n";

/**
 * One line of the roadmap. Work in progress is not listed here: the Roadmap
 * page shows the changelog's unreleased notes for that, so it is written once.
 */
export interface RoadmapItem {
  title: MessageKey;
  /** One or two sentences under the title. Text in backticks renders as code. */
  detail?: MessageKey;
  status: "shipped" | "in-progress" | "planned";
  /** The `TODO(tag)` that marks the work in the library's source. It is also the item's `id` on the page (`/roadmap/#calendars`). */
  todo?: string;
  /** The item's `id` on the page when it has no TODO tag: a plan the author has stated that the source does not mark. */
  id?: string;
  /** A language-neutral site path where the item, or today's behaviour, is documented. */
  link?: string;
}

/**
 * The roadmap, planned work first. A planned item either names the
 * `TODO(tag)` in the library's source that it comes from, or is a plan the
 * author has stated and carries an `id` of its own. A test fails when the
 * source has a tag with no item, or an item names a tag the source no longer
 * has. No item has a date.
 */
export const ROADMAP: RoadmapItem[] = [
  {
    title: "roadmap.excelMode",
    detail: "roadmap.excelModeDetail",
    status: "planned",
    id: "excel-mode",
    link: "/components/data-table/",
  },
  {
    title: "roadmap.renderPerformance",
    detail: "roadmap.renderPerformanceDetail",
    status: "planned",
    id: "render-performance",
  },
  {
    title: "roadmap.calendars",
    detail: "roadmap.calendarsDetail",
    status: "planned",
    todo: "calendars",
    link: "/languages/#calendars",
  },
  {
    title: "roadmap.serverLocales",
    detail: "roadmap.serverLocalesDetail",
    status: "planned",
    todo: "server-locales",
    link: "/languages/#nextjs",
  },
  {
    title: "roadmap.reorderSorting",
    detail: "roadmap.reorderSortingDetail",
    status: "planned",
    todo: "reorder-sorting",
    link: "/components/data-table/guides/row-reorder/#sorting-and-custom-rows",
  },

  // Shipped: the four components (the page lists each one's guides under it), then what they share.
  { title: "nav.dataTable", detail: "summary.dataTable", status: "shipped", link: "/components/data-table/" },
  { title: "nav.autocomplete", detail: "summary.autocomplete", status: "shipped", link: "/components/autocomplete/" },
  { title: "nav.datePicker", detail: "summary.datePicker", status: "shipped", link: "/components/date-picker/" },
  { title: "nav.fileUploader", detail: "summary.fileUploader", status: "shipped", link: "/components/file-uploader/" },
  { title: "roadmap.theming", detail: "roadmap.themingDetail", status: "shipped", link: "/theming/" },
  { title: "roadmap.languages", detail: "roadmap.languagesDetail", status: "shipped", link: "/languages/" },
  { title: "roadmap.aiTools", detail: "roadmap.aiToolsDetail", status: "shipped", link: "/ai-tools/" },
];

/**
 * `TODO(tag)`s in the library's source that are notes for its maintainers,
 * not roadmap items. Each needs a comment saying why. None today.
 */
export const IGNORED_TODOS: string[] = [];

/** A planned item's `id` on the Roadmap page: its TODO tag, or its own `id`. */
export function roadmapId(item: RoadmapItem): string | undefined {
  return item.todo ?? item.id;
}
