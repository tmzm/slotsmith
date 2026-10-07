import { screen, within } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";
import { Autocomplete, type AutocompleteProps } from "../Autocomplete";
import type { AutocompleteComponents, AutocompleteGroupSlotProps } from "../slots/types";
import { groupOptions } from "../core/groups";
import {
  activeOption,
  listbox,
  open,
  optionLabels,
  options,
  renderAutocomplete,
  renderWithUser,
  searchBox,
  trigger,
  type Brand,
} from "./builders";

/**
 * Maker
 *
 * A brand with the country it comes from, which is what the tests group by.
 */
interface Maker extends Brand {
  country?: string;
}

/** Three countries, interleaved, so grouping has to gather them. */
const MAKERS: Maker[] = [
  { id: "m1", name: "Aalto", country: "Finland" },
  { id: "m2", name: "Boråstapeter", country: "Sweden" },
  { id: "m3", name: "Cassina", country: "Italy" },
  { id: "m4", name: "Dux", country: "Sweden" },
  { id: "m5", name: "Iittala", country: "Finland" },
  { id: "m6", name: "Kartell", country: "Italy" },
];

const byCountry = (maker: Maker) => maker.country;

/**
 * Render grouped
 *
 * @param props - Overrides for the component's props.
 * @returns Testing Library's result plus `user`.
 */
const renderGrouped = (props: Partial<AutocompleteProps<Maker>> = {}) =>
  renderAutocomplete({ options: MAKERS, getOptionGroup: byCountry, ...props } as Partial<AutocompleteProps<Brand>>);

/** The label of the option `aria-activedescendant` points at. */
const active = () => activeOption()?.textContent?.trim();

/** Every group's accessible name, in order. */
const groupNames = () =>
  within(listbox())
    .queryAllByRole("group")
    .map((group) => group.getAttribute("aria-labelledby"))
    .map((id) => document.getElementById(id!)?.textContent?.trim());

/** The separators between sections. */
const separators = () => listbox().querySelectorAll(".sac__separator");

describe("groupOptions", () => {
  it("returns the list untouched without a reader", () => {
    const result = groupOptions(MAKERS, undefined, (group) => group);
    expect(result.options).toBe(MAKERS);
    expect(result.sections).toEqual([{ group: undefined, options: MAKERS, start: 0, labelId: undefined }]);
  });

  it("orders groups by first appearance and keeps the order inside each", () => {
    const { options: ordered, sections } = groupOptions(MAKERS, byCountry, (group) => `label-${group}`);
    expect(ordered.map((maker) => maker.name)).toEqual(["Aalto", "Iittala", "Boråstapeter", "Dux", "Cassina", "Kartell"]);
    expect(sections.map(({ group, start, labelId }) => [group, start, labelId])).toEqual([
      ["Finland", 0, "label-Finland"],
      ["Sweden", 2, "label-Sweden"],
      ["Italy", 4, "label-Italy"],
    ]);
  });
});

describe("grouped options", () => {
  it("renders each group as a labelled group, in order of first appearance", async () => {
    const { user } = renderGrouped();
    await open(user);

    expect(groupNames()).toEqual(["Finland", "Sweden", "Italy"]);
    expect(screen.getByRole("group", { name: "Sweden" })).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Sweden" })).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Boråstapeter",
      "Dux",
    ]);
    expect(optionLabels()).toEqual(["Aalto", "Iittala", "Boråstapeter", "Dux", "Cassina", "Kartell"]);
  });

  it("gathers the ungrouped options into one unlabelled section where the first appeared", async () => {
    const { user } = renderGrouped({
      options: [
        MAKERS[0]!,
        { id: "u1", name: "Vitra" },
        MAKERS[1]!,
        { id: "u2", name: "Zanotta" },
        MAKERS[4]!,
      ],
    });
    await open(user);

    expect(optionLabels()).toEqual(["Aalto", "Iittala", "Vitra", "Zanotta", "Boråstapeter"]);
    expect(groupNames()).toEqual(["Finland", "Sweden"]);
    expect(screen.getByRole("option", { name: "Vitra" }).closest('[role="group"]')).toBeNull();
    expect(separators()).toHaveLength(2);
  });

  it("puts a hidden, presentational separator between sections only", async () => {
    const { user } = renderGrouped();
    await open(user);

    expect(separators()).toHaveLength(2);
    separators().forEach((separator) => {
      expect(separator).toHaveAttribute("aria-hidden", "true");
      expect(separator).toHaveAttribute("role", "none");
      expect(separator).not.toHaveAttribute("tabindex");
    });
  });

  it("marks group labels presentational, never options", async () => {
    const { user } = renderGrouped();
    await open(user);

    const label = screen.getByText("Finland");
    expect(label).toHaveAttribute("role", "presentation");
    expect(options()).toHaveLength(MAKERS.length);
  });

  it("drops a group the search empties, with its label and separator", async () => {
    const { user } = renderGrouped();
    await open(user);

    await user.type(searchBox(), "al");
    expect(optionLabels()).toEqual(["Aalto", "Iittala"]);
    expect(groupNames()).toEqual(["Finland"]);
    expect(separators()).toHaveLength(0);
  });

  it("has no axe violations", async () => {
    const { user, container } = renderGrouped({ "aria-label": "Maker" } as never);
    await open(user);

    const result = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(result.violations.map((violation) => [violation.id, violation.nodes.map((node) => node.html + node.failureSummary)])).toEqual([]);
  });
});

describe("the keyboard across groups", () => {
  it("moves in visual order and never lands on a label", async () => {
    const { user } = renderGrouped();
    await open(user);

    await user.keyboard("{ArrowDown}");
    expect(active()).toBe("Aalto");
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(active()).toBe("Boråstapeter");
    await user.keyboard("{ArrowUp}");
    expect(active()).toBe("Iittala");
  });

  it("goes to the visual ends with Home and End, and pages in visual order", async () => {
    const { user } = renderGrouped({ searchable: false });
    trigger().focus();
    await user.keyboard("{ArrowDown}");

    await user.keyboard("{End}");
    expect(active()).toBe("Kartell");
    await user.keyboard("{Home}");
    expect(active()).toBe("Aalto");
    await user.keyboard("{PageDown}");
    expect(active()).toBe("Kartell");
    await user.keyboard("{PageUp}");
    expect(active()).toBe("Aalto");
  });

  it("picks what Enter is on, across groups", async () => {
    const onChange = vi.fn();
    const { user } = renderGrouped({ onChange } as never);
    await open(user);

    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}{Enter}");
    expect(onChange).toHaveBeenCalledWith("m2", MAKERS[1]);
  });
});

describe("groups with autoHighlight", () => {
  it("highlights the first enabled option in visual order", async () => {
    const { user } = renderGrouped({
      autoHighlight: true,
      options: [
        { id: "g", name: "Gubi", country: "Denmark", discontinued: true },
        { id: "a", name: "Aalto", country: "Finland" },
        { id: "h", name: "Hay", country: "Denmark" },
      ],
    });
    await open(user);

    expect(optionLabels()).toEqual(["Gubi", "Hay", "Aalto"]);
    expect(active()).toBe("Hay");
  });
});

describe("groups across pages", () => {
  it("joins a later page's options to their group and keeps the highlight on its option", async () => {
    const first = [MAKERS[0]!, MAKERS[1]!];
    const props = { getOptionLabel: (maker: Maker) => maker.name, getOptionGroup: byCountry };
    const { user, rerender } = renderWithUser(<Autocomplete<Maker> options={first} hasMore {...props} />);
    await open(user);
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(active()).toBe("Boråstapeter");

    rerender(<Autocomplete<Maker> options={[...first, MAKERS[4]!]} {...props} />);
    expect(optionLabels()).toEqual(["Aalto", "Iittala", "Boråstapeter"]);
    expect(groupNames()).toEqual(["Finland", "Sweden"]);
    expect(active()).toBe("Boråstapeter");
  });
});

describe("groups with the create row", () => {
  it("keeps the create row outside every group", async () => {
    const { user } = renderGrouped({ creatable: true });
    await open(user);

    await user.type(searchBox(), "Vitra");
    const create = screen.getByRole("button", { name: /Vitra/ });
    expect(create.closest('[role="group"]')).toBeNull();
    expect(within(listbox()).queryAllByRole("group")).toHaveLength(0);
  });
});

describe("groups in multiple mode", () => {
  it("picks across groups and keeps the groups in place", async () => {
    const onChange = vi.fn();
    const { user } = renderGrouped({ multiple: true, onChange } as never);
    await open(user);

    await user.click(screen.getByRole("option", { name: "Iittala" }));
    await user.click(screen.getByRole("option", { name: "Kartell" }));

    expect(onChange).toHaveBeenLastCalledWith(["m5", "m6"], [MAKERS[4], MAKERS[5]]);
    expect(groupNames()).toEqual(["Finland", "Sweden", "Italy"]);
  });
});

describe("groups under dir=rtl", () => {
  it("renders the same groups and keyboard order", async () => {
    const { user } = renderWithUser(
      <div dir="rtl">
        <Autocomplete<Maker> options={MAKERS} getOptionLabel={(maker) => maker.name} getOptionGroup={byCountry} />
      </div>,
    );
    await open(user);

    expect(groupNames()).toEqual(["Finland", "Sweden", "Italy"]);
    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}");
    expect(active()).toBe("Boråstapeter");
  });
});

describe("without getOptionGroup", () => {
  it("renders the same markup as before groups existed", async () => {
    const { user, container } = renderAutocomplete();
    await open(user);
    await user.keyboard("{ArrowDown}");

    expect(within(listbox()).queryAllByRole("group")).toHaveLength(0);
    expect(container.innerHTML.replace(/_r_[0-9a-z]+_/g, "ID")).toMatchSnapshot();
  });
});

describe("a custom Group, GroupLabel and Separator", () => {
  it("receive the group's name, label id and props", async () => {
    const Group = vi.fn(({ label: _label, labelId: _labelId, ...props }: AutocompleteGroupSlotProps) => (
      <li role="none">
        <ul {...props} />
      </li>
    ));
    const components: Partial<AutocompleteComponents<Maker>> = {
      Group,
      GroupLabel: ({ label, ...props }) => (
        <li data-testid="label" {...props}>
          {label.toUpperCase()}
        </li>
      ),
      Separator: (props) => <li data-testid="separator" {...props} />,
    };
    const { user } = renderGrouped({ components } as never);
    await open(user);

    const first = Group.mock.calls[0]![0];
    expect(first.label).toBe("Finland");
    expect(first.role).toBe("group");
    expect(first["aria-labelledby"]).toBe(first.labelId);
    expect(screen.getByRole("group", { name: "FINLAND" })).toBeInTheDocument();
    expect(screen.getAllByTestId("separator")).toHaveLength(2);
  });
});

