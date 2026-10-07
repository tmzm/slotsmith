import { screen } from "@testing-library/react";
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
