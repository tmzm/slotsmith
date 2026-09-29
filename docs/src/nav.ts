import type { MessageKey } from "@/i18n";

/** One sidebar link. `path` is language-neutral; the sidebar adds the language prefix. */
export interface NavItem {
  path: string;
  label: MessageKey;
  children?: NavItem[];
}

export interface NavGroup {
  label: MessageKey;
  items: NavItem[];
}

const component = (slug: string, label: MessageKey): NavItem => ({
  path: `/components/${slug}/`,
  label,
  children: [
    { path: `/components/${slug}/api/`, label: "component.api" },
    { path: `/components/${slug}/adapters/`, label: "component.adapters" },
  ],
});

const single = (path: string, label: MessageKey): NavGroup => ({ label, items: [{ path, label }] });

/**
 * The sidebar, in reading order. A component's guides are listed on its
 * overview page, so the sidebar links the overview, API and adapters only.
 */
export const NAV: NavGroup[] = [
  single("/getting-started/", "nav.gettingStarted"),
  {
    label: "nav.components",
    items: [
      component("data-table", "nav.dataTable"),
      component("autocomplete", "nav.autocomplete"),
      component("date-picker", "nav.datePicker"),
      component("file-uploader", "nav.fileUploader"),
    ],
  },
  single("/guides/", "nav.guides"),
  single("/theming/", "nav.theming"),
  single("/languages/", "nav.languages"),
  single("/ai-tools/", "nav.aiTools"),
  single("/trust/", "nav.trust"),
  single("/roadmap/", "nav.roadmap"),
  single("/comparison/", "nav.comparison"),
  single("/changelog/", "nav.changelog"),
];
