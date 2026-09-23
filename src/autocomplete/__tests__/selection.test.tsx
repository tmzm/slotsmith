import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  BRANDS,
  open,
  optionLabels,
  optionNamed,
  options,
  renderAutocomplete,
  searchBox,
  selectedOptions,
  tags,
  trigger,
} from "./builders";

describe("selecting", () => {
  it("shows the placeholder until something is picked", async () => {
    const { user } = renderAutocomplete({ placeholder: "Pick a brand" });
    expect(trigger()).toHaveTextContent("Pick a brand");

    await open(user);
    await user.click(optionNamed("Cassina"));

    expect(trigger()).toHaveTextContent("Cassina");
  });

  it("hands onChange the id and the option behind it", async () => {
    const onChange = vi.fn();
    const { user } = renderAutocomplete({ onChange });

    await open(user);
    await user.click(optionNamed("Dux"));

    expect(onChange).toHaveBeenCalledWith("b4", BRANDS[3]);
  });

  it("closes after a single-mode pick and reopens empty", async () => {
    const { user } = renderAutocomplete();

    await open(user);
    await user.click(optionNamed("Hay"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    await open(user);
    expect(searchBox()).toHaveValue("");
  });

  it("treats an empty string as no selection, the way a form library means it", () => {
    renderAutocomplete({ value: "" });

    expect(trigger()).toHaveTextContent("Select…");
    expect(screen.queryByRole("button", { name: "Clear selection" })).not.toBeInTheDocument();
  });

  it("refuses a disabled option", async () => {
    const onChange = vi.fn();
    const { user } = renderAutocomplete({ onChange });

    await open(user);
    await user.click(optionNamed("Gubi"));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("clears the selection", async () => {
    const onChange = vi.fn();
    const { user } = renderAutocomplete({ defaultValue: "b3", onChange });

    await user.click(screen.getByRole("button", { name: "Clear selection" }));

    expect(onChange).toHaveBeenCalledWith(null, undefined);
    expect(trigger()).toHaveTextContent("Select…");
  });

  it("keeps the label of a selection the search has filtered away", async () => {
    const { user } = renderAutocomplete({ defaultValue: "b3" });
    expect(trigger()).toHaveTextContent("Cassina");

    await open(user);
    await user.type(searchBox(), "hay");

    expect(optionLabels()).toEqual(["Hay"]);
    expect(trigger()).toHaveTextContent("Cassina");
  });

  it("labels an id whose option was never in the list, via selected", () => {
    renderAutocomplete({
      options: [],
      value: "b99",
      selected: { id: "b99", name: "Vitra" },
    });

    expect(trigger()).toHaveTextContent("Vitra");
  });

  it("falls back to the raw id when nothing can label it", () => {
    renderAutocomplete({ options: [], value: "b99" });
    expect(trigger()).toHaveTextContent("b99");
  });
});

describe("selecting several", () => {
  it("toggles values and keeps the popup open", async () => {
    const onChange = vi.fn();
    const { user } = renderAutocomplete({ multiple: true, onChange });

    await open(user);
    await user.click(optionNamed("Aalto"));
    await user.click(optionNamed("Dux"));

    expect(onChange).toHaveBeenLastCalledWith(["b1", "b4"], [BRANDS[0], BRANDS[3]]);
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.click(optionNamed("Aalto"));
    expect(onChange).toHaveBeenLastCalledWith(["b4"], [BRANDS[3]]);
  });

  it("marks chosen options with aria-selected, not just an icon", async () => {
    const { user } = renderAutocomplete({ multiple: true, defaultValue: ["b1", "b4"] });

    await open(user);

    expect(selectedOptions().map((option) => option.textContent?.trim())).toEqual(["Aalto", "Dux"]);
    expect(screen.getByRole("listbox")).toHaveAttribute("aria-multiselectable", "true");
  });

  it("collapses the tags past maxTags into a count", () => {
    renderAutocomplete({ multiple: true, defaultValue: ["b1", "b4", "b8"], maxTags: 2 });

    expect(tags()).toEqual(["Aalto", "Dux"]);
    expect(trigger()).toHaveTextContent("+1");
  });

  it("removes one value from its tag without opening the popup", async () => {
    const onChange = vi.fn();
    const { user } = renderAutocomplete({ multiple: true, defaultValue: ["b1", "b4"], onChange });

    await user.click(within(trigger()).getByRole("button", { name: "Remove Aalto" }));

    expect(onChange).toHaveBeenCalledWith(["b4"], [BRANDS[3]]);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("keeps the options array index-aligned with the values", async () => {
    const onChange = vi.fn();
    const { user } = renderAutocomplete({
      multiple: true,
      defaultValue: ["ghost"],
      onChange,
    });

    await open(user);
    await user.click(optionNamed("Dux"));

    expect(onChange).toHaveBeenCalledWith(["ghost", "b4"], [undefined, BRANDS[3]]);
  });
});

describe("controlled use", () => {
  it("does not move until the value prop changes", async () => {
    const onChange = vi.fn();
    const { user } = renderAutocomplete({ value: "b1", onChange });

    await open(user);
    await user.click(optionNamed("Dux"));

    expect(onChange).toHaveBeenCalledWith("b4", BRANDS[3]);
    expect(trigger()).toHaveTextContent("Aalto");
  });

  it("renders nothing selected when given an empty list", async () => {
    const { user } = renderAutocomplete({ multiple: true, value: [] });
    await open(user);
    expect(options()).toHaveLength(BRANDS.length);
    expect(selectedOptions()).toHaveLength(0);
  });
});
