import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  activeOption,
  listbox,
  open,
  optionNamed,
  options,
  renderAutocomplete,
  searchBox,
  trigger,
} from "./builders";

describe("the combobox itself", () => {
  it("announces itself, its state and what it controls", async () => {
    const { user } = renderAutocomplete();
    const combobox = trigger();

    expect(combobox).toHaveAttribute("aria-haspopup", "listbox");
    expect(combobox).toHaveAttribute("aria-expanded", "false");
    expect(combobox).not.toHaveAttribute("aria-controls");

    await open(user);

    expect(combobox).toHaveAttribute("aria-expanded", "true");
    expect(combobox).toHaveAttribute("aria-controls", listbox().id);
  });

  it("is reachable by keyboard", () => {
    renderAutocomplete();
    expect(trigger()).toHaveAttribute("tabindex", "0");
  });

  it("is skipped by the tab order when disabled", () => {
    renderAutocomplete({ disabled: true });
    expect(trigger()).toHaveAttribute("tabindex", "-1");
  });

  it("takes an accessible name from the caller", () => {
    renderAutocomplete({ "aria-label": "Brand" } as never);
    expect(screen.getByRole("combobox", { name: "Brand" })).toBeInTheDocument();
  });
});

describe("the active option", () => {
  it("is pointed at by whatever element holds focus", async () => {
    const { user } = renderAutocomplete();
    await open(user);
    await user.keyboard("{ArrowDown}");

    /** With a search box, focus is in it, so it carries the pointer. */
    expect(searchBox()).toHaveAttribute("aria-activedescendant", optionNamed("Aalto").id);
    expect(trigger()).not.toHaveAttribute("aria-activedescendant");
  });

  it("is pointed at by the trigger when there is no search box", async () => {
    const { user } = renderAutocomplete({ searchable: false });
    await open(user);
    await user.keyboard("{ArrowDown}");

    expect(trigger()).toHaveAttribute("aria-activedescendant", optionNamed("Aalto").id);
  });

  it("points at nothing before anything is highlighted", async () => {
    const { user } = renderAutocomplete();
    await open(user);

    expect(activeOption()).toBeNull();
  });
});

describe("the options", () => {
  it("separates being chosen from being active", async () => {
    const { user } = renderAutocomplete({ defaultValue: "b4" });
    await open(user);
    await user.keyboard("{ArrowDown}");

    /** Aalto is active, Dux is chosen. The two must not be conflated. */
    expect(activeOption()).toBe(optionNamed("Aalto"));
    expect(optionNamed("Aalto")).toHaveAttribute("aria-selected", "false");
    expect(optionNamed("Dux")).toHaveAttribute("aria-selected", "true");
  });

  it("marks the ones that cannot be picked", async () => {
    const { user } = renderAutocomplete();
    await open(user);

    expect(optionNamed("Gubi")).toHaveAttribute("aria-disabled", "true");
    expect(optionNamed("Hay")).not.toHaveAttribute("aria-disabled");
  });

  it("declares whether several may be chosen", async () => {
    const { user, unmount } = renderAutocomplete({ multiple: true });
    await open(user);
    expect(listbox()).toHaveAttribute("aria-multiselectable", "true");
    unmount();

    const single = renderAutocomplete();
    await open(single.user);
    expect(listbox()).not.toHaveAttribute("aria-multiselectable");
  });

  it("marks the list busy while it loads", async () => {
    const { user } = renderAutocomplete({ loading: true });
    await open(user);

    expect(listbox()).toHaveAttribute("aria-busy", "true");
  });
});

describe("the controls inside the trigger", () => {
  it("makes clearing a real, named button", async () => {
    const { user } = renderAutocomplete({ defaultValue: "b3" });
    const clear = screen.getByRole("button", { name: "Clear selection" });

    expect(clear).toBeInstanceOf(HTMLButtonElement);

    /** Reaching it must not open the popup. */
    await user.click(clear);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("makes each tag removable by a real, named button", () => {
    renderAutocomplete({ multiple: true, defaultValue: ["b1", "b4"] });

    expect(within(trigger()).getByRole("button", { name: "Remove Aalto" })).toBeInstanceOf(HTMLButtonElement);
    expect(within(trigger()).getByRole("button", { name: "Remove Dux" })).toBeInTheDocument();
  });

  it("does not nest a button inside the combobox element itself", () => {
    renderAutocomplete({ multiple: true, defaultValue: ["b1"] });

    /** The trigger is a div precisely so these buttons are legal. */
    expect(trigger().tagName).toBe("DIV");
  });
});

describe("announcements", () => {
  it("reports how many options are available", async () => {
    const { user } = renderAutocomplete();
    await open(user);

    expect(screen.getByRole("status")).toHaveTextContent("10 results");

    await user.type(searchBox(), "hay");
    expect(screen.getByRole("status")).toHaveTextContent("1 result");
  });

  it("says nothing while closed", () => {
    renderAutocomplete();
    expect(screen.getByRole("status")).toHaveTextContent("");
  });
});

describe("option ids", () => {
  it("gives every option a unique id for the pointer to reference", async () => {
    const { user } = renderAutocomplete();
    await open(user);

    const ids = options().map((option) => option.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every(Boolean)).toBe(true);
  });
});
