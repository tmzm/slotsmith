import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { AutocompleteProps } from "../../index";
import {
  BRANDS,
  listbox,
  open,
  optionNamed,
  options,
  searchBox,
  trigger,
  type Brand,
} from "../builders";
import { shadcnAutocomplete } from "./shadcn/components";
import { failOnReactWarnings, itShowsTheInvalidState, removeControl, renderIntegration, stubBrowserApis, tagLabels } from "./shared";

/**
 * Render shadcn autocomplete
 *
 * `<Autocomplete>` with shadcn/ui parts.
 *
 * @param props - Overrides for the component's props.
 * @returns A user-event instance.
 */
const renderShadcnAutocomplete = (props: Partial<AutocompleteProps<Brand>> = {}) =>
  renderIntegration(shadcnAutocomplete, props);

beforeAll(stubBrowserApis);

describe("shadcn/ui", () => {
  failOnReactWarnings();
  itShowsTheInvalidState(renderShadcnAutocomplete, (trigger) => expect(trigger).toHaveClass("aria-invalid:border-destructive"));

  it("renders the popup with shadcn's parts", async () => {
    const user = renderShadcnAutocomplete();
    expect(trigger()).toHaveAttribute("data-slot", "select-trigger");

    await open(user);

    expect(listbox()).toHaveAttribute("data-slot", "command-list");
    expect(listbox().closest("[data-slot=popover-content]")).not.toBeNull();
    expect(searchBox()).toHaveAttribute("data-slot", "input");
    expect(optionNamed("Aalto")).toHaveAttribute("data-slot", "command-item");
    expect(options()).toHaveLength(BRANDS.length);
  });

  it("picks a value from a command item and shows it on the trigger", async () => {
    const onChange = vi.fn();
    const user = renderShadcnAutocomplete({ onChange });

    await open(user);
    await user.click(optionNamed("Cassina"));

    expect(onChange).toHaveBeenCalledWith("b3", BRANDS[2]);
    expect(trigger()).toHaveTextContent("Cassina");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("toggles several values and renders them as Badges", async () => {
    const onChange = vi.fn();
    const user = renderShadcnAutocomplete({ multiple: true, onChange });

    await open(user);
    await user.click(optionNamed("Aalto"));
    await user.click(optionNamed("Dux"));

    expect(onChange).toHaveBeenLastCalledWith(["b1", "b4"], [BRANDS[0], BRANDS[3]]);
    expect(tagLabels()).toEqual(["Aalto", "Dux"]);
    expect(removeControl("Aalto").closest("[data-slot=badge]")).not.toBeNull();
    expect(optionNamed("Aalto")).toHaveAttribute("aria-selected", "true");

    await user.click(removeControl("Aalto"));

    expect(onChange).toHaveBeenLastCalledWith(["b4"], [BRANDS[3]]);
    expect(tagLabels()).toEqual(["Dux"]);
  });

  it("refuses a disabled option", async () => {
    const onChange = vi.fn();
    const user = renderShadcnAutocomplete({ onChange });

    await open(user);
    await user.click(optionNamed("Gubi"));

    expect(onChange).not.toHaveBeenCalled();
    expect(optionNamed("Gubi")).toHaveAttribute("aria-disabled", "true");
    expect(listbox()).toBeInTheDocument();
  });

  it("picks with the keyboard through the command input", async () => {
    const onChange = vi.fn();
    const user = renderShadcnAutocomplete({ onChange });

    await user.click(trigger());
    expect(searchBox()).toHaveFocus();

    await user.keyboard("{ArrowDown}{Enter}");

    expect(onChange).toHaveBeenCalledWith("b1", BRANDS[0]);
    expect(trigger()).toHaveTextContent("Aalto");
  });

  it("shows the empty row when the search matches nothing", async () => {
    const user = renderShadcnAutocomplete();

    await open(user);
    await user.type(searchBox(), "zzz");

    expect(options()).toHaveLength(0);
    expect(screen.getByText("No results")).toHaveAttribute("data-slot", "command-empty");
  });

  it("retries from the error state", async () => {
    const onRetry = vi.fn();
    const user = renderShadcnAutocomplete({ error: "Could not load brands", onRetry });

    await open(user);
    expect(screen.getByText("Could not load brands")).toBeInTheDocument();
    expect(options()).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(onRetry).toHaveBeenCalledOnce();
  });
});
  it("never submits a surrounding form from its buttons", async () => {
    const onSubmit = vi.fn((event: SubmitEvent) => event.preventDefault());
    const Form = ({ children }: { children: ReactNode }) => (
      <form onSubmit={(event) => onSubmit(event.nativeEvent as SubmitEvent)}>{children}</form>
    );
    const user = renderIntegration(shadcnAutocomplete, { error: "Could not load brands", onRetry: () => {}, defaultValue: "b2" }, Form);

    await open(user);
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await user.click(screen.getByRole("button", { name: "Clear selection" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

