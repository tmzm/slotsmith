// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import XRay from "@/islands/XRay";
import { getReference } from "@/lib/reference";

const slots = getReference("data-table").slots.map(({ name, kind }) => ({ name, kind }));

afterEach(cleanup);

describe("XRay", () => {
  it("lists every data-table slot, 12 element and 10 widget, each linking to its API row", () => {
    render(<XRay slots={slots} lang="en" />);
    const list = screen.getByRole("list", { name: /every part/i });
    const links = within(list).getAllByRole("link");
    expect(links).toHaveLength(22);
    expect(links.filter((link) => link.textContent?.startsWith("<"))).toHaveLength(12);
    expect(links.filter((link) => link.textContent?.startsWith("{"))).toHaveLength(10);
    for (const slot of slots) {
      const link = links.find((candidate) => candidate.getAttribute("href")?.endsWith(`#slot-${slot.name}`));
      expect(link, slot.name).toBeTruthy();
      expect(link!.getAttribute("href")).toBe(`/components/data-table/api/#slot-${slot.name}`);
      expect(link!.textContent).toContain(slot.kind === "element" ? `<${slot.name}>` : `{${slot.name}}`);
    }
  });

  it("links to the Arabic API page on Arabic pages, whatever language the prose is in", async () => {
    render(<XRay slots={slots} lang="ar" contentLang="en" />);
    const link = (await screen.findAllByRole("link")).find((candidate) => candidate.getAttribute("href")?.endsWith("#slot-Row"));
    expect(link!.getAttribute("href")).toBe("/ar/components/data-table/api/#slot-Row");
  });

  it("renders the live table and a Show parts toggle that explodes it", () => {
    const { container } = render(<XRay slots={slots} lang="en" />);
    expect(container.querySelectorAll(".sdt__body .sdt__row").length).toBeGreaterThan(0);
    const toggle = screen.getByRole("button", { name: "Show parts" });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    const root = container.querySelector(".xray")!;
    expect(root.hasAttribute("data-exploded")).toBe(false);
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(root.hasAttribute("data-exploded")).toBe(true);
  });

  it("highlights the slot under focus with a selector, so rows rendered later match too", () => {
    const { container } = render(<XRay slots={slots} lang="en" />);
    const root = container.querySelector(".xray")!;
    const link = screen.getAllByRole("link").find((candidate) => candidate.getAttribute("href")?.endsWith("#slot-Row"))!;
    fireEvent.focus(link);
    expect(root.getAttribute("data-highlight")).toBe("Row");
    expect(container.querySelector("style")!.textContent).toContain('.xray[data-highlight="Row"]');
    fireEvent.blur(link);
    expect(root.hasAttribute("data-highlight")).toBe(false);
  });
});
