import { describe, expect, it } from "vitest";
import { VirtualAutocomplete } from "../virtual";
import { BRANDS, open, renderAutocomplete, renderWithUser, type Brand } from "./builders";
import type { AutocompleteProps } from "../Autocomplete";

/**
 * Markup
 *
 * The rendered HTML of everything the test drew, the live region included.
 *
 * @param container - Testing Library's container.
 * @returns Its HTML.
 */
const markup = (container: HTMLElement) => container.innerHTML;

/** Every shape the default search box renders in, recorded before `searchIn` existed. */
const CASES: [string, Partial<AutocompleteProps<Brand>>][] = [
  ["single", { "aria-label": "Brand", defaultValue: "b3" } as never],
  ["multiple", { multiple: true, defaultValue: ["b1", "b2", "b3"], maxTags: 2 }],
  ["invalid and grouped", { invalid: true, getOptionGroup: (brand: Brand) => (brand.id < "b5" ? "Early" : "Late") }],
  ["select", { searchable: false, defaultValue: "b4" }],
  ["disabled", { disabled: true, defaultValue: "b4" }],
];

describe("the search box in the popup", () => {
  for (const [name, props] of CASES) {
    it(`renders the same markup as before searchIn, ${name}, closed and open`, async () => {
      const { user, container } = renderAutocomplete(props);
      expect(markup(container)).toMatchSnapshot("closed");
      if (props.disabled) return;
      await open(user);
      await user.keyboard("{ArrowDown}");
      expect(markup(container)).toMatchSnapshot("open");
    });
  }

  it("renders the same virtual markup as before searchIn", async () => {
    const { user, container } = renderWithUser(
      <VirtualAutocomplete<Brand> options={BRANDS} getOptionLabel={(brand) => brand.name} defaultValue="b2" />,
    );
    expect(markup(container)).toMatchSnapshot("closed");
    await open(user);
    await user.keyboard("{ArrowDown}");
    expect(markup(container)).toMatchSnapshot("open");
  });
});
