import { act, fireEvent, renderHook, screen, within } from "@testing-library/react";
import axe from "axe-core";
import { useState } from "react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Autocomplete, type AutocompleteProps } from "../Autocomplete";
import { useAutocomplete } from "../core/useAutocomplete";
import { VirtualAutocomplete } from "../virtual";
import { BRANDS, listbox, optionLabels, optionNamed, options, renderAutocomplete, renderWithUser, type Brand } from "./builders";

/**
 * Render in the trigger
 *
 * The autocomplete with its search box inside the trigger, named so axe and
 * the role queries can find it.
 *
 * @param props - Overrides for the component's props.
 */
const renderInTrigger = (props: Partial<AutocompleteProps<Brand>> = {}) =>
  renderAutocomplete({ searchIn: "trigger", "aria-label": "Brand", ...props } as Partial<AutocompleteProps<Brand>>);

/** The input, which is the combobox in this mode. */
const input = () => screen.getByRole("combobox") as HTMLInputElement;

/** The visual field around the input. */
const field = () => input().closest<HTMLElement>('[data-search-in="trigger"]')!;

/** The chevron button that opens and closes the list. */
const toggle = () => within(field()).getByRole("button", { name: "Show options", hidden: true });

/** The label of the option `aria-activedescendant` points at. */
const active = () => {
  const id = input().getAttribute("aria-activedescendant");
  return id ? document.getElementById(id)?.textContent?.trim() : undefined;
};

/** The labels of the tags before the input. */
const chips = () =>
  within(field())
    .queryAllByRole("button", { name: /^Remove / })
    .map((button) => button.getAttribute("aria-label")!.replace(/^Remove /, ""));

/** Runs axe over the container, without the colour checks jsdom cannot make. */
const violations = async (container: HTMLElement) => {
  const result = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
  return result.violations.map((violation) => [violation.id, violation.nodes.map((node) => node.html)]);
};

describe("the input as the combobox", () => {
  it("carries the editable combobox wiring", async () => {
    const { user } = renderInTrigger();
    const combobox = input();

    expect(combobox.tagName).toBe("INPUT");
    expect(combobox).toHaveAccessibleName("Brand");
    expect(combobox).toHaveAttribute("aria-autocomplete", "list");
    expect(combobox).toHaveAttribute("aria-expanded", "false");
    expect(combobox).not.toHaveAttribute("aria-controls");
    expect(screen.queryByRole("searchbox")).toBeNull();

    await user.click(combobox);
    await user.keyboard("{ArrowDown}");

    expect(combobox).toHaveAttribute("aria-expanded", "true");
    expect(combobox).toHaveAttribute("aria-controls", listbox().id);
    expect(combobox).toHaveAttribute("aria-activedescendant", optionNamed("Aalto").id);
  });

  it("leaves the field and the toggle out of the tab order", () => {
    renderInTrigger();

    expect(field()).not.toHaveAttribute("tabindex");
    expect(field()).not.toHaveAttribute("role");
    expect(toggle()).toHaveAttribute("tabindex", "-1");
    expect(input()).not.toHaveAttribute("tabindex", "-1");
  });

  it("is labelled by a label element through the id it is given", () => {
    renderWithUser(
      <>
        <label htmlFor="brand">Maker</label>
        <Autocomplete<Brand> searchIn="trigger" id="brand" options={BRANDS} getOptionLabel={(brand) => brand.name} />
      </>,
    );
    expect(screen.getByLabelText("Maker")).toBe(input());
  });

  it("marks the input invalid, and the field for styling", () => {
    renderInTrigger({ invalid: true });

    expect(input()).toHaveAttribute("aria-invalid", "true");
    expect(field()).toHaveAttribute("data-invalid");
    expect(field()).not.toHaveAttribute("aria-invalid");
  });

  it("has no axe violations, closed and open, single and multiple", async () => {
    const single = renderInTrigger({ defaultValue: "b3", getOptionGroup: (brand) => (brand.id < "b5" ? "Early" : "Late") });
    expect(await violations(single.container)).toEqual([]);
    await single.user.click(input());
    await single.user.keyboard("{ArrowDown}");
    expect(await violations(single.container)).toEqual([]);
    single.unmount();

    const multiple = renderInTrigger({ multiple: true, defaultValue: ["b1", "b2", "b3"] });
    expect(await violations(multiple.container)).toEqual([]);
    await multiple.user.click(input());
    await multiple.user.keyboard("{ArrowDown}");
    expect(await violations(multiple.container)).toEqual([]);
  });
});

describe("focus", () => {
  it("goes to the input from a click anywhere on the field", async () => {
    const { user } = renderInTrigger({ multiple: true, defaultValue: ["b1"] });

    await user.click(field());
    expect(input()).toHaveFocus();
  });

  it("never leaves the input while searching, picking and toggling", async () => {
    const onChange = vi.fn();
    const { user } = renderInTrigger({ onChange, multiple: true });

    await user.click(toggle());
    expect(listbox()).toBeInTheDocument();
    expect(input()).toHaveFocus();

    await user.click(optionNamed("Cassina"));
    expect(onChange).toHaveBeenLastCalledWith(["b3"], [BRANDS[2]]);
    expect(input()).toHaveFocus();
    expect(listbox()).toBeInTheDocument();

    await user.click(within(field()).getByRole("button", { name: "Remove Cassina" }));
    expect(input()).toHaveFocus();

    await user.click(toggle());
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(input()).toHaveFocus();
  });

  it("keeps focus in the input when a row's button is pressed", async () => {
    const onLoadMore = vi.fn();
    const onRetry = vi.fn();
    const { user, rerender } = renderInTrigger({ hasMore: true, onLoadMore });

    await user.click(input());
    await user.keyboard("{ArrowDown}");
    await user.click(screen.getByRole("button", { name: "Load more" }));
    expect(onLoadMore).toHaveBeenCalled();
    expect(input()).toHaveFocus();

    rerender(
      <Autocomplete<Brand>
        searchIn="trigger"
        aria-label="Brand"
        options={[]}
        error="Offline"
        onRetry={onRetry}
        defaultOpen
      />,
    );
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("returns to the input after clearing", async () => {
    const onChange = vi.fn();
    const { user } = renderInTrigger({ defaultValue: "b3", onChange });

    await user.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(onChange).toHaveBeenCalledWith(null, undefined);
    expect(input()).toHaveFocus();
    expect(input()).toHaveValue("");
    expect(input()).toHaveAttribute("placeholder", "Select…");
  });

  it("keeps the clear control in the tab order, after the input", async () => {
    const { user } = renderInTrigger({ defaultValue: "b3" });

    await user.tab();
    expect(input()).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Clear selection" })).toHaveFocus();
  });
});

describe("the value in the input, single mode", () => {
  it("shows the picked label while closed, and the placeholder only when nothing is picked", () => {
    const { unmount } = renderInTrigger({ defaultValue: "b3" });
    expect(input()).toHaveValue("Cassina");
    expect(input()).not.toHaveAttribute("placeholder", "Select…");
    unmount();

    renderInTrigger();
    expect(input()).toHaveValue("");
    expect(input()).toHaveAttribute("placeholder", "Select…");
  });

  it("replaces the label with the query when typing, and opens the list", async () => {
    const onSearchChange = vi.fn();
    const { user } = renderInTrigger({ defaultValue: "b3", onSearchChange });

    await user.tab();
    await user.keyboard("Du");

    expect(input()).toHaveValue("Du");
    expect(onSearchChange).toHaveBeenLastCalledWith("Du");
    expect(optionLabels()).toEqual(["Dux"]);
  });

  it("replaces the label after a click too", async () => {
    const { user } = renderInTrigger({ defaultValue: "b3" });

    await user.click(input());
    await user.keyboard("Ha");

    expect(input()).toHaveValue("Ha");
  });

  it.each([
    ["Escape", "{Escape}"],
    ["Tab", "{Tab}"],
  ])("restores the label when leaving with %s without picking", async (_, key) => {
    const { user } = renderInTrigger({ defaultValue: "b3" });

    await user.click(input());
    await user.keyboard("Du");
    await user.keyboard(key);

    expect(screen.queryByRole("listbox")).toBeNull();
    expect(input()).toHaveValue("Cassina");
  });

  it("restores the label when focus leaves for something outside", async () => {
    const { user } = renderWithUser(
      <>
        <Autocomplete<Brand> searchIn="trigger" aria-label="Brand" options={BRANDS} getOptionLabel={(b) => b.name} defaultValue="b3" />
        <button type="button">Elsewhere</button>
      </>,
    );

    await user.click(input());
    await user.keyboard("Du");
    await user.click(screen.getByRole("button", { name: "Elsewhere" }));

    expect(screen.queryByRole("listbox")).toBeNull();
    expect(input()).toHaveValue("Cassina");
  });

  it("sets the label and closes on a pick", async () => {
    const onChange = vi.fn();
    const { user } = renderInTrigger({ onChange });

    await user.click(input());
    await user.keyboard("ka{ArrowDown}{Enter}");

    expect(onChange).toHaveBeenCalledWith("b10", BRANDS[9]);
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(input()).toHaveValue("Kartell");
    expect(input()).toHaveFocus();
  });

  it("follows a controlled value", () => {
    const { rerender } = renderInTrigger({ value: "b3" });
    expect(input()).toHaveValue("Cassina");

    rerender(
      <Autocomplete<Brand> searchIn="trigger" aria-label="Brand" options={BRANDS} getOptionLabel={(b) => b.name} value="b4" />,
    );
    expect(input()).toHaveValue("Dux");
  });
});

describe("the value in the field, multiple mode", () => {
  it("puts the tags before the input, then the overflow count", () => {
    renderInTrigger({ multiple: true, defaultValue: ["b1", "b2", "b3"], maxTags: 2 });

    expect(chips()).toEqual(["Aalto", "Boråstapeter"]);
    expect(within(field()).getByText("+1")).toBeInTheDocument();
    expect(input()).toHaveValue("");
    expect(input()).not.toHaveAttribute("placeholder", "Select…");
    /** The tags come first in document order. */
    const remove = within(field()).getByRole("button", { name: "Remove Aalto" });
    expect(remove.compareDocumentPosition(input()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("removes the last tag on Backspace in an empty input, open or closed", async () => {
    const onChange = vi.fn();
    const { user } = renderInTrigger({ multiple: true, defaultValue: ["b1", "b2", "b3"], onChange });

    await user.click(input());
    await user.keyboard("{Backspace}");
    expect(onChange).toHaveBeenLastCalledWith(["b1", "b2"], [BRANDS[0], BRANDS[1]]);

    await user.keyboard("{ArrowDown}{Backspace}");
    expect(onChange).toHaveBeenLastCalledWith(["b1"], [BRANDS[0]]);
  });

  it("only edits the text while there is text", async () => {
    const onChange = vi.fn();
    const { user } = renderInTrigger({ multiple: true, defaultValue: ["b1"], onChange });

    await user.click(input());
    await user.keyboard("Ha{Backspace}");

    expect(input()).toHaveValue("H");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("keeps the list open and clears the query on a pick", async () => {
    const onChange = vi.fn();
    const { user } = renderInTrigger({ multiple: true, onChange });

    await user.click(input());
    await user.keyboard("ka{ArrowDown}{Enter}");

    expect(onChange).toHaveBeenLastCalledWith(["b10"], [BRANDS[9]]);
    expect(input()).toHaveValue("");
    expect(options()).toHaveLength(BRANDS.length);
    /** The highlight stays on what was just picked. */
    expect(active()).toBe("Kartell");
  });
});

describe("the keyboard", () => {
  it("opens on ArrowDown and ArrowUp, moving to the first or last option", async () => {
    const { user } = renderInTrigger();

    await user.click(input());
    await user.keyboard("{ArrowDown}");
    expect(active()).toBe("Aalto");
    await user.keyboard("{Escape}{ArrowUp}");
    expect(active()).toBe("Kartell");
  });

  it("opens on Alt+ArrowDown without moving the highlight, and closes on Alt+ArrowUp", async () => {
    const { user } = renderInTrigger();

    await user.click(input());
    await user.keyboard("{Alt>}{ArrowDown}{/Alt}");
    expect(listbox()).toBeInTheDocument();
    expect(active()).toBeUndefined();

    await user.keyboard("{Alt>}{ArrowUp}{/Alt}");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("leaves Home and End to the caret, and pages the list", async () => {
    const { user } = renderInTrigger();

    await user.click(input());
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(active()).toBe("Boråstapeter");

    expect(fireEvent.keyDown(input(), { key: "Home" })).toBe(true);
    expect(fireEvent.keyDown(input(), { key: "End" })).toBe(true);
    expect(active()).toBe("Boråstapeter");

    await user.keyboard("{PageDown}");
    expect(active()).toBe("Kartell");
    await user.keyboard("{PageUp}");
    expect(active()).toBe("Aalto");
  });

  it("does not open on Space, which is typed", async () => {
    const { user } = renderInTrigger();

    await user.click(input());
    await user.keyboard(" ");
    expect(input()).toHaveValue(" ");
  });

  it("closes on the first Escape and clears the query on the next", async () => {
    const onSearchChange = vi.fn();
    /** A parent that keeps the list shut leaves the query standing while closed. */
    const { user } = renderInTrigger({ open: false, onSearchChange });

    await user.click(input());
    await user.keyboard("Du");
    expect(input()).toHaveValue("Du");

    await user.keyboard("{Escape}");
    expect(onSearchChange).toHaveBeenLastCalledWith("");
  });

  it("closes on Tab and moves on", async () => {
    const { user } = renderWithUser(
      <>
        <Autocomplete<Brand> searchIn="trigger" aria-label="Brand" options={BRANDS} getOptionLabel={(b) => b.name} />
        <button type="button">Next</button>
      </>,
    );

    await user.click(input());
    await user.keyboard("{ArrowDown}{Tab}");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.getByRole("button", { name: "Next" })).toHaveFocus();
  });

  it("does nothing on Enter while an IME composition is in progress", async () => {
    const onChange = vi.fn();
    const { user } = renderInTrigger({ onChange });

    await user.click(input());
    await user.keyboard("{ArrowDown}");
    fireEvent.keyDown(input(), { key: "Enter", isComposing: true });
    fireEvent.keyDown(input(), { key: "Enter", keyCode: 229 });
    fireEvent.keyDown(input(), { key: "Escape", isComposing: true });

    expect(onChange).not.toHaveBeenCalled();
    expect(listbox()).toBeInTheDocument();
  });

  it("picks the top match on Enter with autoHighlight", async () => {
    const onChange = vi.fn();
    const { user } = renderInTrigger({ autoHighlight: true, onChange });

    await user.click(input());
    await user.keyboard("ha");
    expect(active()).toBe("Fritz Hansen");
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("b6", BRANDS[5]);
  });

  it("creates the query on Enter when nothing matches", async () => {
    const onCreate = vi.fn();
    const { user } = renderInTrigger({ creatable: true, onCreate });

    await user.click(input());
    await user.keyboard("Zanotta{Enter}");
    expect(onCreate).toHaveBeenCalledWith("Zanotta");
  });
});

describe("states", () => {
  it("cannot be opened, typed in or cleared when disabled", async () => {
    const { user } = renderInTrigger({ disabled: true, defaultValue: "b3" });

    expect(input()).toBeDisabled();
    expect(toggle()).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Clear selection" })).toBeNull();
    await user.click(field());
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("submits the values through hidden inputs, never the text", () => {
    const { container } = renderInTrigger({ name: "brand", defaultValue: "b3" });

    expect(container.querySelectorAll('input[name="brand"]')).toHaveLength(1);
    expect(container.querySelector('input[name="brand"]')).toHaveAttribute("type", "hidden");
    expect(input()).not.toHaveAttribute("name");
  });

  it("shows the minimum-length, loading and error rows", async () => {
    /** Remote options: nothing until the search is long enough. */
    const { user, rerender } = renderInTrigger({ minChars: 2, options: [] });

    await user.click(input());
    await user.keyboard("a");
    expect(listbox()).toHaveTextContent("Type 2 or more characters to search");

    rerender(<Autocomplete<Brand> searchIn="trigger" aria-label="Brand" options={[]} loading defaultOpen />);
    expect(listbox()).toHaveTextContent("Loading…");
  });

  it("follows a controlled open state and query", async () => {
    const onOpenChange = vi.fn();
    const { user } = renderInTrigger({ open: true, searchQuery: "ca", onOpenChange });

    expect(input()).toHaveValue("ca");
    expect(optionLabels()).toEqual(["Cassina"]);
    await user.click(toggle());
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("is a button trigger when searchable is off", () => {
    renderAutocomplete({ searchIn: "trigger", searchable: false, "aria-label": "Brand" } as Partial<AutocompleteProps<Brand>>);

    expect(screen.getByRole("combobox").tagName).toBe("DIV");
    expect(screen.getByRole("combobox")).toHaveAttribute("tabindex", "0");
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(document.querySelector('[data-search-in="trigger"]')).toBeNull();
  });
});

describe("the virtual variant", () => {
  beforeAll(() => {
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(320);
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(280);
  });
  afterAll(() => vi.restoreAllMocks());

  it("searches from the trigger, in groups", async () => {
    const onChange = vi.fn();
    const { user, container } = renderWithUser(
      <VirtualAutocomplete<Brand>
        searchIn="trigger"
        aria-label="Brand"
        options={BRANDS}
        getOptionLabel={(brand) => brand.name}
        getOptionGroup={(brand) => (brand.id < "b5" ? "Early" : "Late")}
        onChange={onChange}
      />,
    );

    await user.click(input());
    await user.keyboard("a");
    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(within(listbox()).getAllByRole("group").length).toBeGreaterThan(0);
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onChange).toHaveBeenCalledWith("b1", BRANDS[0]);
    expect(input()).toHaveValue("Aalto");
    expect(input()).toHaveFocus();
    expect(await violations(container)).toEqual([]);
  });
});

describe("useAutocomplete", () => {
  it("hands out the input's props and keeps the trigger a plain field", () => {
    const { result } = renderHook(() => useAutocomplete({ options: BRANDS, searchIn: "trigger" }));

    expect(result.current.searchIn).toBe("trigger");
    expect(result.current.getTriggerProps()).not.toHaveProperty("role");
    expect(result.current.getTriggerProps()).toHaveProperty("data-search-in", "trigger");
    expect(result.current.getTriggerInputProps()).toMatchObject({ role: "combobox", "aria-autocomplete": "list" });
    expect(result.current.getToggleProps()).toMatchObject({ tabIndex: -1 });
  });

  it("falls back to the popup without a search box", () => {
    const { result } = renderHook(() => useAutocomplete({ options: BRANDS, searchIn: "trigger", searchable: false }));
    expect(result.current.searchIn).toBe("popup");
  });

  it("restores the label after a controlled close", () => {
    function Controlled() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <button type="button" onClick={() => setOpen(false)}>
            Close
          </button>
          <Autocomplete<Brand>
            searchIn="trigger"
            aria-label="Brand"
            options={BRANDS}
            getOptionLabel={(b) => b.name}
            defaultValue="b3"
            open={open}
            onOpenChange={setOpen}
          />
        </>
      );
    }
    renderWithUser(<Controlled />);
    fireEvent.change(input(), { target: { value: "Du" } });
    expect(input()).toHaveValue("Du");
    act(() => screen.getByRole("button", { name: "Close" }).click());
    expect(input()).toHaveValue("Cassina");
  });
});
