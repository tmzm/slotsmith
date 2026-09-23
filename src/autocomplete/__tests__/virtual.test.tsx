import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { VirtualAutocomplete } from "../virtual";

/** jsdom has no layout: give every element a 320px-tall box so rows can be measured. */
beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(320);
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(280);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    width: 280,
    height: 320,
    top: 0,
    left: 0,
    right: 280,
    bottom: 320,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
});

afterAll(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

interface City {
  id: string;
  name: string;
}

const CITIES: City[] = Array.from({ length: 2000 }, (_, index) => ({
  id: `c${index}`,
  name: `City ${index}`,
}));

/**
 * Render a virtual autocomplete
 *
 * @param props - Overrides for the component's props.
 * @returns Testing Library's result plus `user`.
 */
function renderVirtual(props: Partial<React.ComponentProps<typeof VirtualAutocomplete<City>>> = {}) {
  const user = userEvent.setup();
  const merged = {
    options: CITIES,
    getOptionLabel: (city: City) => city.name,
    ...props,
  } as React.ComponentProps<typeof VirtualAutocomplete<City>>;
  return { ...render(<VirtualAutocomplete<City> {...merged} />), user };
}

const options = () => screen.queryAllByRole("option");

describe("the virtual option list", () => {
  it("renders a window rather than every option", async () => {
    const { user } = renderVirtual();

    await user.click(screen.getByRole("combobox"));

    expect(options().length).toBeGreaterThan(0);
    expect(options().length).toBeLessThan(CITIES.length);
  });

  it("still reports the full count to assistive technology", async () => {
    const { user } = renderVirtual();

    await user.click(screen.getByRole("combobox"));

    expect(screen.getByRole("status")).toHaveTextContent("2000 results");
  });

  it("picks the option the keyboard lands on", async () => {
    const onChange = vi.fn();
    const { user } = renderVirtual({ onChange });

    await user.click(screen.getByRole("combobox"));
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    expect(onChange).toHaveBeenCalledWith("c1", CITIES[1]);
  });

  it("narrows to the matches when searching", async () => {
    const { user } = renderVirtual();

    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByRole("searchbox"), "City 1999");

    expect(options().map((option) => option.textContent?.trim())).toEqual(["City 1999"]);
  });

  it("shows the empty state through the same parts", async () => {
    const { user } = renderVirtual();

    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByRole("searchbox"), "nowhere");

    expect(screen.getByText("No results")).toBeInTheDocument();
    expect(options()).toHaveLength(0);
  });

  it("keeps the spacer rows out of the option count", async () => {
    const { user } = renderVirtual();

    await user.click(screen.getByRole("combobox"));

    const listbox = screen.getByRole("listbox");
    const spacers = listbox.querySelectorAll('[data-slot="virtual-spacer"]');
    expect(spacers.length).toBeGreaterThan(0);
    spacers.forEach((spacer) => expect(spacer).toHaveAttribute("aria-hidden", "true"));
  });
});
