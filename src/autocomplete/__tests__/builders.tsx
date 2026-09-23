import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { Autocomplete, type AutocompleteProps } from "../Autocomplete";

/**
 * Brand
 *
 * The option shape the tests pick from.
 */
export interface Brand {
  id: string;
  name: string;
  discontinued?: boolean;
}

/**
 * Brands
 *
 * Ten options with one that cannot be picked, so disabled handling is covered
 * without every test having to build its own list.
 */
export const BRANDS: Brand[] = [
  { id: "b1", name: "Aalto" },
  { id: "b2", name: "Boråstapeter" },
  { id: "b3", name: "Cassina" },
  { id: "b4", name: "Dux" },
  { id: "b5", name: "Ekornes" },
  { id: "b6", name: "Fritz Hansen" },
  { id: "b7", name: "Gubi", discontinued: true },
  { id: "b8", name: "Hay" },
  { id: "b9", name: "Iittala" },
  { id: "b10", name: "Kartell" },
];

/**
 * Render autocomplete
 *
 * Renders with the shared brand options and a user-event instance.
 *
 * @param props - Overrides for the component's props.
 * @returns Testing Library's result plus `user`.
 */
export function renderAutocomplete(props: Partial<AutocompleteProps<Brand>> = {}) {
  const user = userEvent.setup();
  const merged = {
    options: BRANDS,
    getOptionLabel: (brand: Brand) => brand.name,
    optionDisabled: (brand: Brand) => !!brand.discontinued,
    ...props,
  } as AutocompleteProps<Brand>;

  return { ...render(<Autocomplete<Brand> {...merged} />), user };
}

/**
 * Render element
 *
 * For layouts the tests build themselves out of the compound parts.
 *
 * @param element - What to render.
 * @returns Testing Library's result plus `user`.
 */
export function renderWithUser(element: ReactElement) {
  const user = userEvent.setup();
  return { ...render(element), user };
}

/** The `role="combobox"` element. */
export const trigger = () => screen.getByRole("combobox");

/** The search box inside the popup. */
export const searchBox = () => screen.getByRole("searchbox");

/** The `role="listbox"` element, once open. */
export const listbox = () => screen.getByRole("listbox");

/** Every option row currently rendered. */
export const options = () => screen.queryAllByRole("option");

/** One option row, by its visible text. */
export const optionNamed = (name: string) => screen.getByRole("option", { name });

/** The labels of the rendered options, in order. */
export const optionLabels = () => options().map((option) => option.textContent?.trim() ?? "");

/** The option the engine considers active, read through `aria-activedescendant`. */
export function activeOption(): HTMLElement | null {
  const owner = screen.queryByRole("searchbox") ?? trigger();
  const id = owner.getAttribute("aria-activedescendant");
  return id ? document.getElementById(id) : null;
}

/** The selected option rows, read through `aria-selected`. */
export const selectedOptions = () => options().filter((option) => option.getAttribute("aria-selected") === "true");

/**
 * Open the popup
 *
 * Clicks the trigger and waits for the listbox.
 *
 * @param user - The user-event instance.
 */
export async function open(user: ReturnType<typeof userEvent.setup>) {
  await user.click(trigger());
  return listbox();
}

/** The tags shown on the trigger in multiple mode. */
export const tags = () =>
  within(trigger())
    .queryAllByRole("button", { name: /^Remove / })
    .map((button) => button.closest("span")?.textContent?.trim() ?? "");
