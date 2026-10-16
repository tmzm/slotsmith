import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { listbox, open, renderAutocomplete } from "./builders";

describe("a popup in a portal", () => {
  it("renders under body, keeps the search box focused, and picks an option", async () => {
    const onChange = vi.fn();
    const { container, user } = renderAutocomplete({ portal: true, onChange });
    await open(user);
    const popup = listbox().closest<HTMLElement>("[id$='-popup']")!;
    expect(container.contains(popup)).toBe(false);
    expect(popup.parentElement).toBe(document.body);
    // Focus moved into the portal counts as inside the control: the list stays open while typing.
    expect(screen.getByRole("searchbox")).toHaveFocus();
    await user.keyboard("Hay");
    expect(screen.getAllByRole("option")).toHaveLength(1);
    await user.click(screen.getByRole("option", { name: "Hay" }));
    expect(onChange).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ name: "Hay" }));
  });

  it("renders into an element of your own", async () => {
    const target = document.createElement("div");
    document.body.append(target);
    const { user } = renderAutocomplete({ portal: target });
    await open(user);
    expect(target.contains(listbox())).toBe(true);
    target.remove();
  });
});
