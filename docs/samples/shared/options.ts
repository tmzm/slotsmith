export type Country = { code: string; name: string };

/** Sorted by name, as a picker shows them. */
export const countries: Country[] = [
  { code: "ar", name: "Argentina" },
  { code: "au", name: "Australia" },
  { code: "br", name: "Brazil" },
  { code: "ca", name: "Canada" },
  { code: "eg", name: "Egypt" },
  { code: "fr", name: "France" },
  { code: "de", name: "Germany" },
  { code: "in", name: "India" },
  { code: "jp", name: "Japan" },
  { code: "jo", name: "Jordan" },
  { code: "ke", name: "Kenya" },
  { code: "mx", name: "Mexico" },
  { code: "ma", name: "Morocco" },
  { code: "nl", name: "Netherlands" },
  { code: "no", name: "Norway" },
  { code: "pt", name: "Portugal" },
  { code: "sa", name: "Saudi Arabia" },
  { code: "za", name: "South Africa" },
  { code: "es", name: "Spain" },
  { code: "se", name: "Sweden" },
  { code: "tr", name: "Türkiye" },
  { code: "ae", name: "United Arab Emirates" },
  { code: "gb", name: "United Kingdom" },
  { code: "us", name: "United States" },
];

/** `id` and `label` are the names the autocomplete reads by default, so topics need no getters. */
export type Topic = { id: string; label: string; archived?: boolean };

export const topics: Topic[] = [
  { id: "accessibility", label: "Accessibility" },
  { id: "animation", label: "Animation" },
  { id: "caching", label: "Caching" },
  { id: "design-systems", label: "Design systems" },
  { id: "forms", label: "Forms" },
  { id: "i18n", label: "Internationalisation" },
  { id: "performance", label: "Performance" },
  { id: "rtl", label: "Right-to-left" },
  { id: "server-components", label: "Server components" },
  { id: "state", label: "State" },
  { id: "testing", label: "Testing" },
  { id: "typescript", label: "TypeScript" },
  { id: "legacy", label: "Legacy browsers", archived: true },
];
