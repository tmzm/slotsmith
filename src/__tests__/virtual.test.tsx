import { act, render } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { VirtualDataTable } from "../virtual";
import { bodyRows, columns, users, type User } from "./builders";

/** jsdom has no layout: give every element a 400px-tall box and a no-op ResizeObserver. */
beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(400);
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(800);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    width: 800, height: 400, top: 0, left: 0, right: 800, bottom: 400, x: 0, y: 0, toJSON: () => ({}),
  });
});

afterAll(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const dataRows = () => bodyRows().filter((row) => row.getAttribute("data-slot") !== "virtual-spacer");

describe("VirtualDataTable", () => {
  it("renders only the rows in view plus overscan", () => {
    render(
      <VirtualDataTable<User>
        data={users(1000)}
        columns={columns}
        virtual={{ estimateSize: 40, overscan: 5, maxHeight: 400 }}
      />,
    );
    const rendered = dataRows().length;
    expect(rendered).toBeGreaterThan(0);
    expect(rendered).toBeLessThan(30);
  });

  it("follows scrolling from the first mount", async () => {
    const { container } = render(
      <VirtualDataTable<User> data={users(1000)} columns={columns} virtual={{ estimateSize: 40, overscan: 0 }} />,
    );
    const scroller = container.querySelector<HTMLDivElement>(".rdt__scroll")!;
    expect(dataRows()[0]).toHaveTextContent("User 01");

    await act(async () => {
      scroller.scrollTop = 4000;
      scroller.dispatchEvent(new Event("scroll"));
    });
    expect(dataRows()[0]).toHaveTextContent("User 101");
  });

  it("pads the rest of the list with a spacer row", () => {
    const { container } = render(
      <VirtualDataTable<User> data={users(1000)} columns={columns} virtual={{ estimateSize: 40 }} />,
    );
    const spacer = container.querySelector<HTMLTableCellElement>("[data-slot=virtual-spacer] td");
    expect(spacer).not.toBeNull();
    expect(parseInt(spacer!.style.height, 10)).toBeGreaterThan(30_000);
  });

  it("does not paginate by default", () => {
    const { container } = render(<VirtualDataTable<User> data={users(50)} columns={columns} />);
    expect(container.querySelector("nav")).toBeNull();
  });

  it("still shows status rows", () => {
    const { getByText } = render(<VirtualDataTable<User> data={[]} columns={columns} />);
    expect(getByText("No data found")).toBeInTheDocument();
  });
});
