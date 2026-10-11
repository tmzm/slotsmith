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

/** A country with the region it is listed under; a `disabled` one stays in the list but cannot be picked. */
export type RegionCountry = Country & { region: string; disabled?: boolean };

/** A short list grouped by region. Groups show in the order of their first option, so the regions come in this order. */
export const countriesByRegion: RegionCountry[] = [
  { code: "de", name: "Germany", region: "Europe" },
  { code: "fr", name: "France", region: "Europe" },
  { code: "es", name: "Spain", region: "Europe" },
  { code: "ge", name: "Georgia", region: "Europe" },
  { code: "dz", name: "Algeria", region: "Africa" },
  { code: "eg", name: "Egypt", region: "Africa" },
  { code: "ng", name: "Nigeria", region: "Africa" },
  { code: "ne", name: "Niger", region: "Africa", disabled: true },
  { code: "jp", name: "Japan", region: "Asia" },
  { code: "sg", name: "Singapore", region: "Asia" },
  { code: "sa", name: "Saudi Arabia", region: "Asia" },
  { code: "sy", name: "Syria", region: "Asia" },
];
