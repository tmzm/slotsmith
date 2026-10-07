import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Autocomplete } from "../Autocomplete";
import { activeOption, BRANDS, open, renderAutocomplete, searchBox, trigger, type Brand } from "./builders";

/** The label of the option `aria-activedescendant` points at. */
const active = () => activeOption()?.textContent?.trim();

describe("autoHighlight off", () => {
  it("leaves nothing highlighted when the list opens", async () => {
    const { user } = renderAutocomplete();
    await open(user);

    expect(active()).toBeUndefined();
  });
});

describe("autoHighlight", () => {
  it("highlights the first option when the list opens", async () => {
    const { user } = renderAutocomplete({ autoHighlight: true });
    await open(user);

    expect(active()).toBe("Aalto");
  });

  it("follows the filtered list so Enter picks the first match", async () => {
    const onChange = vi.fn();
    const { user } = renderAutocomplete({ autoHighlight: true, onChange });
    await open(user);

    await user.type(searchBox(), "ha");
    expect(active()).toBe("Fritz Hansen");

    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("b6", BRANDS[5]);
  });

  it("skips an option that cannot be picked", async () => {
    const { user } = renderAutocomplete({
      autoHighlight: true,
      options: [{ id: "x", name: "Gufram", discontinued: true }, ...BRANDS],
    });
    await open(user);
    expect(active()).toBe("Aalto");

    /** Gufram matches first and cannot be picked. */
    await user.type(searchBox(), "u");
    expect(active()).toBe("Dux");
  });

  it("highlights nothing when every match is disabled", async () => {
    const { user } = renderAutocomplete({ autoHighlight: true });
    await open(user);

    await user.type(searchBox(), "gubi");
    expect(active()).toBeUndefined();
  });

  it("keeps the arrow keys' highlight until the query changes", async () => {
    const { user, rerender } = renderAutocomplete({ autoHighlight: true });
    await open(user);

    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(active()).toBe("Cassina");

    /** A new page arriving must not pull the highlight back to the top. */
    rerender(
      <Autocomplete<Brand>
        autoHighlight
        options={[...BRANDS, { id: "b11", name: "Louis Poulsen" }]}
        getOptionLabel={(brand) => brand.name}
        optionDisabled={(brand) => !!brand.discontinued}
      />,
    );
    expect(active()).toBe("Cassina");

    await user.type(searchBox(), "a");
    expect(active()).toBe("Aalto");
  });

  it("keeps the first option highlighted as later pages arrive", async () => {
    const page = BRANDS.slice(0, 3);
    const { user, rerender } = renderAutocomplete({ autoHighlight: true, options: page, hasMore: true });
    await open(user);
    expect(active()).toBe("Aalto");

    rerender(
      <Autocomplete<Brand> autoHighlight options={BRANDS} getOptionLabel={(brand) => brand.name} hasMore={false} />,
    );
    expect(active()).toBe("Aalto");
  });

  it("highlights the first result once a first page arrives", async () => {
    const { user, rerender } = renderAutocomplete({ autoHighlight: true, options: [], loading: true });
    await open(user);
    expect(active()).toBeUndefined();

    rerender(<Autocomplete<Brand> autoHighlight options={BRANDS} getOptionLabel={(brand) => brand.name} />);
    expect(active()).toBe("Aalto");
  });

  it("leaves Enter to the create row when nothing matches", async () => {
    const onCreate = vi.fn();
    const { user } = renderAutocomplete({ autoHighlight: true, creatable: true, onCreate });
    await open(user);

    await user.type(searchBox(), "Vitra");
    await user.keyboard("{Enter}");

    expect(onCreate).toHaveBeenCalledWith("Vitra");
  });

  it("starts from the top again each time the list reopens", async () => {
    const { user } = renderAutocomplete({ autoHighlight: true });
    await open(user);
    await user.keyboard("{ArrowDown}{ArrowDown}{Escape}");

    await user.click(trigger());
    expect(active()).toBe("Aalto");
  });

  it("still lets ArrowUp open on the last option", async () => {
    const { user } = renderAutocomplete({ autoHighlight: true, searchable: false });
    trigger().focus();

    await user.keyboard("{ArrowUp}");
    expect(active()).toBe("Kartell");
  });

  it("stays put after a pick in multiple mode", async () => {
    const onChange = vi.fn();
    const { user } = renderAutocomplete({ autoHighlight: true, multiple: true, onChange });
    await open(user);

    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenLastCalledWith(["b1"], [BRANDS[0]]);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(active()).toBe("Aalto");

    await user.type(searchBox(), "ca");
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenLastCalledWith(["b1", "b3"], [BRANDS[0], BRANDS[2]]);
  });
});

/** Shared props for the rerenders below. */
const byName = { getOptionLabel: (brand: Brand) => brand.name };

describe("autoHighlight after a keyboard open", () => {
  it.each([
    ["searchable", true],
    ["not searchable", false],
  ])("highlights the first option once it arrives (%s)", async (_, searchable) => {
    const { user, rerender } = renderAutocomplete({ autoHighlight: true, searchable, options: [], loading: true });
    trigger().focus();
    await user.keyboard("{ArrowDown}");
    expect(active()).toBeUndefined();

    rerender(<Autocomplete<Brand> autoHighlight searchable={searchable} options={BRANDS} {...byName} />);
    expect(active()).toBe("Aalto");
  });
});

describe("autoHighlight with a list the caller filters", () => {
  it("follows the search even when the options keep their reference", async () => {
    const { user } = renderAutocomplete({ autoHighlight: true, filter: false });
    await open(user);
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(active()).toBe("Cassina");

    await user.type(searchBox(), "x");
    expect(active()).toBe("Aalto");
  });

  it("waits for a refetch to settle before highlighting", async () => {
    const { user, rerender } = renderAutocomplete({ autoHighlight: true, filter: false });
    await open(user);
    rerender(<Autocomplete<Brand> autoHighlight filter={false} loading options={BRANDS} {...byName} />);
    await user.type(searchBox(), "ha");
    expect(active()).toBeUndefined();

    const results = [BRANDS[5]!, BRANDS[7]!];
    rerender(<Autocomplete<Brand> autoHighlight filter={false} options={results} {...byName} />);
    expect(active()).toBe("Fritz Hansen");
  });
});

describe("the highlight across page arrivals", () => {
  it("keeps a hovered option highlighted when a page arrives", async () => {
    const { user, rerender } = renderAutocomplete({ autoHighlight: true, options: BRANDS.slice(0, 5), hasMore: true });
    await open(user);
    fireEvent.pointerMove(screen.getByRole("option", { name: "Dux" }), { movementX: 1, movementY: 1 });
    expect(active()).toBe("Dux");

    rerender(<Autocomplete<Brand> autoHighlight options={BRANDS} {...byName} />);
    expect(active()).toBe("Dux");
  });

  it("keeps a typeahead highlight when a page arrives", async () => {
    const { user, rerender } = renderAutocomplete({
      autoHighlight: true,
      searchable: false,
      options: BRANDS.slice(0, 5),
      hasMore: true,
    });
    await open(user);
    await user.keyboard("e");
    expect(active()).toBe("Ekornes");

    rerender(<Autocomplete<Brand> autoHighlight searchable={false} options={BRANDS} {...byName} />);
    expect(active()).toBe("Ekornes");
  });
});

describe("a controlled open state", () => {
  it("resets the highlight when the parent closes the list", async () => {
    const { user, rerender } = renderAutocomplete({ open: true, searchable: false });
    trigger().focus();
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(active()).toBe("Boråstapeter");

    rerender(<Autocomplete<Brand> open={false} searchable={false} options={BRANDS} {...byName} />);
    rerender(<Autocomplete<Brand> open searchable={false} options={BRANDS} {...byName} />);
    expect(active()).toBeUndefined();
  });
});

describe("autoHighlight off while typing", () => {
  it("leaves nothing highlighted", async () => {
    const { user } = renderAutocomplete();
    await open(user);
    await user.type(searchBox(), "a");

    expect(active()).toBeUndefined();
  });
});

describe("option ids", () => {
  it("follow the option, not its position, so a new top match is announced", async () => {
    const { user } = renderAutocomplete({ autoHighlight: true });
    await open(user);
    const first = searchBox().getAttribute("aria-activedescendant");

    await user.type(searchBox(), "ha");
    const next = searchBox().getAttribute("aria-activedescendant");
    expect(next).not.toBe(first);
    expect(document.getElementById(next!)).toHaveTextContent("Fritz Hansen");
  });

  it("stay unique and free of whitespace for awkward values", async () => {
    const odd = [
      { id: "a b", name: "Space" },
      { id: "a_b", name: "Underscore" },
      { id: "a-b", name: "Hyphen" },
      { id: 1, name: "Number" },
      { id: "1", name: "String" },
    ] as unknown as Brand[];
    const { user } = renderAutocomplete({ options: odd });
    await open(user);

    const ids = screen.getAllByRole("option").map((option) => option.id);
    expect(new Set(ids).size).toBe(odd.length);
    ids.forEach((id) => expect(id).not.toMatch(/\s/));
  });
});
