import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { SlotsmithProvider } from "../../provider";
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

describe("the virtual layout with autoHighlight", () => {
  it("highlights the first match as the search narrows, so Enter picks it", async () => {
    const onChange = vi.fn();
    const { user } = renderVirtual({ autoHighlight: true, onChange });

    await user.click(screen.getByRole("combobox"));
    const search = screen.getByRole("searchbox");
    expect(document.getElementById(search.getAttribute("aria-activedescendant") ?? "")).toHaveTextContent("City 0");

    await user.type(search, "City 42");
    await user.keyboard("{Enter}");

    expect(onChange).toHaveBeenCalledWith("c42", CITIES[42]);
  });
});

describe("the virtual layout with groups", () => {
  /** Twenty regions of a hundred cities each. */
  const region = (city: City) => `Region ${Math.floor(Number(city.id.slice(1)) / 100)}`;
  /** Rows: 2000 options of 36px, 20 labels of 28px, 19 separators of 9px. */
  const TOTAL = 2000 * 36 + 20 * 28 + 19 * 9;

  /**
   * Scroll spy
   *
   * Records where the virtualizer scrolls the list, and moves it there, so
   * the window follows as it would in a browser.
   */
  function spyOnScroll(total = TOTAL) {
    const offsets: number[] = [];
    const scrollTo = vi.fn(function (this: HTMLElement, options: ScrollToOptions) {
      offsets.push(options.top ?? 0);
      Object.defineProperty(this, "scrollTop", { configurable: true, value: options.top ?? 0 });
      this.dispatchEvent(new Event("scroll"));
    });
    const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollTo");
    Object.defineProperty(HTMLElement.prototype, "scrollTo", { configurable: true, writable: true, value: scrollTo });
    /** The listbox scrolls through every row; nothing else scrolls. */
    const scrollHeight = vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockImplementation(function (this: HTMLElement) {
      return this.getAttribute("role") === "listbox" ? total : 0;
    });
    const clientHeight = vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(320);
    restores.push(() => {
      if (original) Object.defineProperty(HTMLElement.prototype, "scrollTo", original);
      else delete (HTMLElement.prototype as { scrollTo?: unknown }).scrollTo;
      scrollHeight.mockRestore();
      clientHeight.mockRestore();
    });
    return offsets;
  }

  /** Undoes each test's scroll spies, leaving the file's layout spies in place. */
  const restores: (() => void)[] = [];
  afterEach(() => {
    while (restores.length) restores.pop()!();
  });

  /**
   * Scroll the list
   *
   * Moves the listbox as a user scrolling it would, and lets the virtualizer
   * hear about it.
   */
  const scrollListTo = (top: number) => {
    const list = screen.getByRole("listbox");
    act(() => {
      Object.defineProperty(list, "scrollTop", { configurable: true, value: top });
      list.dispatchEvent(new Event("scroll"));
    });
  };

  const groupNamed = (name: string) => screen.getByRole("group", { name });
  const active = (search: HTMLElement) =>
    document.getElementById(search.getAttribute("aria-activedescendant") ?? "")?.textContent?.trim();

  it("windows label and separator rows, and keeps them out of the options", async () => {
    const { user } = renderVirtual({ getOptionGroup: region });
    await user.click(screen.getByRole("combobox"));

    expect(groupNamed("Region 0")).toBeInTheDocument();
    expect(options().length).toBeLessThan(100);
    expect(screen.getByText("Region 0")).toHaveAttribute("role", "presentation");
    expect(screen.getByRole("status")).toHaveTextContent("2000 results");
  });

  it("scrolls exactly to the option the keyboard lands on, and names its group", async () => {
    const offsets = spyOnScroll();
    const { user } = renderVirtual({ getOptionGroup: region });
    await user.click(screen.getByRole("combobox"));
    const search = screen.getByRole("searchbox");

    await user.keyboard("{End}");

    expect(offsets.at(-1)).toBe(TOTAL - 320);
    expect(active(search)).toBe("City 1999");
    /** Its label scrolled away long ago; a hidden copy still names the group. */
    expect(groupNamed("Region 19")).toContainElement(document.getElementById(search.getAttribute("aria-activedescendant")!));

    await user.keyboard("{Home}");
    expect(offsets.at(-1)).toBe(0);
    expect(active(search)).toBe("City 0");
  });

  it("crosses from one group into the next with the arrow keys, skipping the label", async () => {
    spyOnScroll();
    const { user } = renderVirtual({ getOptionGroup: region });
    await user.click(screen.getByRole("combobox"));
    const search = screen.getByRole("searchbox");

    await user.type(search, "City 99");
    /** City 99 in Region 0, then City 990–999 in Region 9. */
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(active(search)).toBe("City 990");
    expect(groupNamed("Region 9")).toContainElement(document.getElementById(search.getAttribute("aria-activedescendant")!));
    await user.keyboard("{ArrowUp}");
    expect(active(search)).toBe("City 99");
  });

  it("keeps its scroll when a page arrives, with autoHighlight", async () => {
    const offsets = spyOnScroll(300 * 36 + 3 * 28 + 2 * 9);
    const page = (count: number) => CITIES.slice(0, count);
    const props = { getOptionLabel: (city: City) => city.name, getOptionGroup: region, hasMore: true, autoHighlight: true };
    const user = userEvent.setup();
    const { rerender } = render(<VirtualAutocomplete<City> options={page(200)} {...props} />);
    await user.click(screen.getByRole("combobox"));
    expect(active(screen.getByRole("searchbox"))).toBe("City 0");

    const highlighted = screen.getByRole("searchbox").getAttribute("aria-activedescendant");
    scrollListTo(7000);
    const before = offsets.length;
    rerender(<VirtualAutocomplete<City> options={page(300)} {...props} />);

    expect(offsets.slice(before)).toEqual([]);
    expect(screen.getByRole("listbox").scrollTop).toBe(7000);
    /** City 0 is out of the window now, but still the highlight. */
    expect(screen.getByRole("searchbox")).toHaveAttribute("aria-activedescendant", highlighted);
  });

  it("names a group through a custom GroupLabel after its label scrolls away", async () => {
    spyOnScroll();
    const { user } = renderVirtual({
      getOptionGroup: region,
      components: { GroupLabel: ({ label, ...props }) => <li {...props}>{label.toUpperCase()}</li> },
    });
    await user.click(screen.getByRole("combobox"));
    await user.keyboard("{End}");

    expect(groupNamed("REGION 19")).toContainElement(
      document.getElementById(screen.getByRole("searchbox").getAttribute("aria-activedescendant")!),
    );
  });

  it("does not scroll to a group's label when the pointer highlights its first option", async () => {
    const offsets = spyOnScroll();
    const { user } = renderVirtual({ getOptionGroup: region });
    await user.click(screen.getByRole("combobox"));

    /** Region 1's label starts at 3637px; scrolled just past it, City 100 is the first row in view. */
    scrollListTo(3640);
    const before = offsets.length;
    fireEvent.pointerMove(screen.getByRole("option", { name: "City 100" }), { movementX: 1, movementY: 1 });

    expect(active(screen.getByRole("searchbox"))).toBe("City 100");
    expect(offsets.slice(before)).toEqual([]);
  });

  it("highlights the first option in visual order with autoHighlight", async () => {
    const { user } = renderVirtual({ getOptionGroup: (city) => (city.id === "c5" ? "First" : "Rest"), autoHighlight: true });
    await user.click(screen.getByRole("combobox"));

    expect(active(screen.getByRole("searchbox"))).toBe("City 0");
    await user.type(screen.getByRole("searchbox"), "City 5");
    expect(active(screen.getByRole("searchbox"))).toBe("City 5");
  });
});

describe("the virtual layout's props", () => {
  it("names the combobox rather than the wrapper", () => {
    renderVirtual({ "aria-label": "City" } as never);

    expect(screen.getByRole("combobox", { name: "City" })).toBeInTheDocument();
  });
});

describe("VirtualAutocomplete under a SlotsmithProvider", () => {
  const ProviderIndicator = () => <span data-testid="provider-indicator" />;

  it("takes the provider's autocomplete slots", () => {
    render(
      <SlotsmithProvider components={{ autocomplete: { Indicator: ProviderIndicator } }}>
        <VirtualAutocomplete<City> options={CITIES} getOptionLabel={(city) => city.name} />
      </SlotsmithProvider>,
    );
    expect(screen.getByTestId("provider-indicator")).toBeInTheDocument();
  });

  it("lets its own components prop win", () => {
    render(
      <SlotsmithProvider components={{ autocomplete: { Indicator: ProviderIndicator } }}>
        <VirtualAutocomplete<City>
          options={CITIES}
          getOptionLabel={(city) => city.name}
          components={{ Indicator: () => <span data-testid="own-indicator" /> }}
        />
      </SlotsmithProvider>,
    );
    expect(screen.getByTestId("own-indicator")).toBeInTheDocument();
    expect(screen.queryByTestId("provider-indicator")).not.toBeInTheDocument();
  });
});
