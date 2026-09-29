/**
 * English message catalog
 *
 * The source of truth for every string the layout renders. Keys are flat and
 * dotted. `{name}` marks a placeholder filled by `t()`. The Arabic catalog is
 * typed against this one, so a key added here and forgotten there fails `tsc`.
 */
export const en = {
  "site.name": "slotsmith",
  "site.tagline": "React components you can take apart",
  "site.positioning":
    "Finished data table, combobox, date picker and file uploader for React that drop into shadcn/ui, MUI, Chakra or your own design system.",

  "common.skip": "Skip to content",
  "common.home": "slotsmith home",
  "common.githubLabel": "slotsmith on GitHub",
  "common.npmLabel": "slotsmith on npm",
  "common.menu": "Menu",
  "common.close": "Close",
  "common.version": "v{version}",
  "common.github": "GitHub",
  "common.npm": "npm",
  "common.search": "Search",
  "common.copy": "Copy",
  "common.copied": "Copied",
  "common.editPage": "Edit this page",
  "common.onThisPage": "On this page",
  "common.untranslated": "This page is not translated yet. It is shown in English.",
  "common.footerLicense": "ISC license",
  "common.footerAuthor": "By Tareq Al-Mozayek",

  "switch.theme": "Color theme",
  "switch.light": "Light",
  "switch.dark": "Dark",
  "switch.toLight": "Switch to the light theme",
  "switch.toDark": "Switch to the dark theme",
  "switch.language": "Switch the site language to Arabic",
  "switch.otherLanguage": "العربية",

  "nav.sidebar": "Documentation",
  "nav.dock": "Quick actions",
  "nav.gettingStarted": "Getting started",
  "nav.guides": "Guides",
  "nav.components": "Components",
  "nav.dataTable": "Data table",
  "nav.autocomplete": "Autocomplete",
  "nav.datePicker": "Date picker",
  "nav.fileUploader": "File uploader",
  "nav.theming": "Theming",
  "nav.languages": "Languages",
  "nav.aiTools": "AI tools",
  "nav.trust": "Trust",
  "nav.roadmap": "Roadmap",
  "nav.comparison": "Comparison",
  "nav.changelog": "Changelog",
  "nav.about": "About",

  "component.overview": "Overview",
  "component.install": "Install",
  "component.quickStart": "Quick start",
  "component.guides": "Guides",
  "component.api": "API",
  "component.adapters": "Adapters",
  "component.accessibility": "Accessibility",
  "component.limitations": "Limitations",
} as const;
