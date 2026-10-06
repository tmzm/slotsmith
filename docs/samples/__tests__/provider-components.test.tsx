// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProviderComponents from "@samples/guides/provider-components";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** The border radius of every checkbox in one table: the header's and each row's. */
const radii = (table: Element) => [...table.querySelectorAll<HTMLElement>('[role="checkbox"]')].map((box) => box.style.borderRadius);

describe("slot model guide: provider components", () => {
  it("gives the table the provider's checkbox and the date picker the provider's icon", () => {
    const error = vi.spyOn(console, "error");
    const { container } = render(<ProviderComponents />);
    const [first] = container.querySelectorAll(".sdt");
    // The header checkbox and one per row, none of them the native fallback.
    expect(radii(first!)).toEqual(["50%", "50%", "50%", "50%"]);
    expect(first!.querySelector('input[type="checkbox"]')).toBeNull();
    const trigger = container.querySelector(".sdp__trigger")!;
    expect(trigger.querySelector("svg path")?.getAttribute("d")).toBe("M12 3 21 12 12 21 3 12Z");
    expect(trigger.querySelector(".sdp__icon")).toBeNull();
    expect(error).not.toHaveBeenCalled();
  });

  it("lets a table's own components prop win over the provider", () => {
    const { container } = render(<ProviderComponents />);
    const [, second] = container.querySelectorAll(".sdt");
    expect(radii(second!)).toEqual(["4px", "4px", "4px", "4px"]);
  });

  it("keeps the fallback for every slot neither layer names", () => {
    const { container } = render(<ProviderComponents />);
    const tables = [...container.querySelectorAll(".sdt")];
    expect(tables).toHaveLength(2);
    for (const table of tables) {
      expect(table.querySelectorAll("tbody tr.sdt__row")).toHaveLength(3);
      expect(table.querySelectorAll("tbody td.sdt__cell").length).toBeGreaterThan(0);
    }
    // The date picker's trigger and value are still the built-in parts.
    expect(container.querySelector(".sdp__trigger .sdp__value")?.textContent).toBe("Pick a date");
  });

  it("selects a row through the provider's checkbox", () => {
    const { container } = render(<ProviderComponents />);
    const [first, second] = container.querySelectorAll(".sdt");
    const box = first!.querySelector<HTMLElement>('tbody [role="checkbox"]')!;
    expect(box.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(box);
    expect(box.getAttribute("aria-checked")).toBe("true");
    expect(box.closest("tr")!.getAttribute("data-state")).toBe("selected");
    expect(first!.querySelector('thead [role="checkbox"]')!.getAttribute("aria-checked")).toBe("mixed");
    // Each table keeps its own selection.
    expect(second!.querySelector('tbody [role="checkbox"]')!.getAttribute("aria-checked")).toBe("false");
  });
});
