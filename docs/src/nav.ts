import type { MessageKey } from "@/i18n";
import { COMPONENTS, type ComponentMeta } from "@/data/components";

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

const component = (meta: ComponentMeta): NavItem => ({
  path: `/components/${meta.slug}/`,
  label: meta.title,
  children: [
    { path: `/components/${meta.slug}/api/`, label: "component.api" },
    { path: `/components/${meta.slug}/adapters/`, label: "component.adapters" },
    ...meta.guides.map((guide) => ({ path: `/components/${meta.slug}/guides/${guide.slug}/`, label: guide.title })),
  ],
});

const single = (path: string, label: MessageKey): NavGroup => ({ label, items: [{ path, label }] });

/**
 * The sidebar, in reading order. Each component lists its API, adapters and
 * guides as children, all built from `COMPONENTS` so the two cannot drift.
 */
export const NAV: NavGroup[] = [
  single("/getting-started/", "nav.gettingStarted"),
  {
    label: "nav.components",
    items: COMPONENTS.map(component),
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
