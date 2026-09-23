import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  activeOption,
  open,
  optionLabels,
  renderAutocomplete,
  searchBox,
  trigger,
} from "./builders";

/** The label of the option `aria-activedescendant` points at. */
const active = () => activeOption()?.textContent?.trim();

describe("opening by keyboard", () => {
  it("opens on Enter with the first option active", async () => {
    const { user } = renderAutocomplete();
    trigger().focus();

    await user.keyboard("{Enter}");

    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(active()).toBe("Aalto");
  });

  it("opens on ArrowUp with the last option active", async () => {
    const { user } = renderAutocomplete();
    trigger().focus();

    await user.keyboard("{ArrowUp}");

    expect(active()).toBe("Kartell");
  });

  it("opens on Space", async () => {
    const { user } = renderAutocomplete();
    trigger().focus();

    await user.keyboard(" ");

    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });
});

describe("moving the highlight", () => {
  it("steps down and up", async () => {
    const { user } = renderAutocomplete();
    await open(user);

    await user.keyboard("{ArrowDown}");
    expect(active()).toBe("Aalto");
    await user.keyboard("{ArrowDown}");
    expect(active()).toBe("Boråstapeter");
    await user.keyboard("{ArrowUp}");
    expect(active()).toBe("Aalto");
  });

  it("skips an option that cannot be picked", async () => {
    const { user } = renderAutocomplete();
    await open(user);

    await user.keyboard("{End}");
    expect(active()).toBe("Kartell");
    await user.keyboard("{ArrowUp}");
    expect(active()).toBe("Iittala");
    await user.keyboard("{ArrowUp}");
    expect(active()).toBe("Hay");
    /** Gubi sits between Hay and Fritz Hansen and is disabled. */
    await user.keyboard("{ArrowUp}");
    expect(active()).toBe("Fritz Hansen");
  });

  it("stops at the ends by default and wraps with loop", async () => {
    const { user, unmount } = renderAutocomplete();
    await open(user);

    await user.keyboard("{Home}");
    await user.keyboard("{ArrowUp}");
    expect(active()).toBe("Aalto");
    unmount();

    const looped = renderAutocomplete({ loop: true });
    await open(looped.user);
    await looped.user.keyboard("{Home}");
    await looped.user.keyboard("{ArrowUp}");
    expect(active()).toBe("Kartell");
  });

  it("jumps with Home and End", async () => {
    const { user } = renderAutocomplete();
    await open(user);

    await user.keyboard("{End}");
    expect(active()).toBe("Kartell");
    await user.keyboard("{Home}");
    expect(active()).toBe("Aalto");
  });

  it("moves by a page with PageDown and PageUp", async () => {
    const { user } = renderAutocomplete();
    await open(user);

    await user.keyboard("{Home}");
    await user.keyboard("{PageDown}");
    expect(active()).toBe("Kartell");
    await user.keyboard("{PageUp}");
    expect(active()).toBe("Aalto");
  });
});

describe("committing and dismissing", () => {
  it("picks the active option on Enter", async () => {
    const onChange = vi.fn();
    const { user } = renderAutocomplete({ onChange });
    await open(user);

    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    expect(onChange).toHaveBeenCalledWith("b2", expect.objectContaining({ name: "Boråstapeter" }));
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const { user } = renderAutocomplete();
    await open(user);

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  it("closes on Tab", async () => {
    const { user } = renderAutocomplete();
    await open(user);

    await user.keyboard("{Tab}");

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("removes the last tag on Backspace in an empty search", async () => {
    const onChange = vi.fn();
    const { user } = renderAutocomplete({ multiple: true, defaultValue: ["b1", "b4"], onChange });
    await open(user);

    await user.keyboard("{Backspace}");

    expect(onChange).toHaveBeenCalledWith(["b1"], [expect.objectContaining({ name: "Aalto" })]);
  });

  it("leaves the search text alone when Backspace has something to delete", async () => {
    const onChange = vi.fn();
    const { user } = renderAutocomplete({ multiple: true, defaultValue: ["b1"], onChange });
    await open(user);

    await user.type(searchBox(), "ha");
    await user.keyboard("{Backspace}");

    expect(searchBox()).toHaveValue("h");
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("typeahead, with no search box", () => {
  it("jumps to the option a letter points at", async () => {
    const { user } = renderAutocomplete({ searchable: false });
    await open(user);

    await user.keyboard("k");

    expect(active()).toBe("Kartell");
  });

  it("narrows as more letters arrive", async () => {
    const { user } = renderAutocomplete({ searchable: false });
    await open(user);

    await user.keyboard("ca");

    expect(active()).toBe("Cassina");
  });

  it("cycles through the options starting with the same letter", async () => {
    const { user } = renderAutocomplete({
      searchable: false,
      options: [
        { id: "1", name: "Alpha" },
        { id: "2", name: "Anvil" },
        { id: "3", name: "Beta" },
      ],
      optionDisabled: () => false,
    });
    await open(user);

    await user.keyboard("a");
    expect(active()).toBe("Alpha");
    await user.keyboard("a");
    expect(active()).toBe("Anvil");
  });

  it("opens straight into a typeahead when closed", async () => {
    const { user } = renderAutocomplete({ searchable: false });
    trigger().focus();

    await user.keyboard("d");

    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(active()).toBe("Dux");
  });

  it("renders no search box at all", async () => {
    const { user } = renderAutocomplete({ searchable: false });
    await open(user);

    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(optionLabels()).toHaveLength(10);
  });
});

describe("when disabled", () => {
  it("does not open", async () => {
    const { user } = renderAutocomplete({ disabled: true });

    await user.click(trigger());

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(trigger()).toHaveAttribute("aria-disabled", "true");
  });
});
