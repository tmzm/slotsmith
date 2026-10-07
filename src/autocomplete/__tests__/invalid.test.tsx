import { renderHook, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useAutocomplete } from "../core/useAutocomplete";
import { BRANDS, open, renderAutocomplete, searchBox, trigger } from "./builders";

describe("the invalid state", () => {
  it("is off by default", () => {
    const { container } = renderAutocomplete();

    expect(trigger()).not.toHaveAttribute("aria-invalid");
    expect(trigger()).not.toHaveAttribute("data-invalid");
    expect(container.querySelector("[data-invalid]")).toBeNull();
  });

  it("marks the combobox invalid and flags the root and trigger for styling", () => {
    const { container } = renderAutocomplete({ invalid: true });

    expect(trigger()).toHaveAttribute("aria-invalid", "true");
    expect(trigger()).toHaveAttribute("data-invalid");
    expect(container.querySelector(".sac")).toHaveAttribute("data-invalid");
  });

  it("leaves the search box alone, since its text is a filter rather than the value", async () => {
    const { user } = renderAutocomplete({ invalid: true });
    await open(user);

    expect(searchBox()).not.toHaveAttribute("aria-invalid");
    expect(trigger()).toHaveAttribute("aria-invalid", "true");
  });

  it("points the combobox at the error message", () => {
    renderAutocomplete({
      invalid: true,
      "aria-label": "Brand",
      "aria-errormessage": "brand-error",
      "aria-describedby": "brand-hint",
    } as never);

    const combobox = screen.getByRole("combobox", { name: "Brand" });
    expect(combobox).toHaveAttribute("aria-errormessage", "brand-error");
    expect(combobox).toHaveAttribute("aria-describedby", "brand-hint");
    expect(combobox.parentElement).not.toHaveAttribute("aria-errormessage");
  });

  it("is exposed by the headless hook", () => {
    const { result } = renderHook(() => useAutocomplete({ options: BRANDS, invalid: true }));

    expect(result.current.invalid).toBe(true);
    expect(result.current.getTriggerProps()["aria-invalid"]).toBe(true);
    expect(result.current.getRootProps()["data-invalid"]).toBe(true);
    expect(result.current.getSearchProps()["aria-invalid"]).toBeUndefined();
  });
});
