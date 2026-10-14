import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { SlotsmithProvider } from "../../provider";
import { useVirtualizer } from "@tanstack/react-virtual";
import { DataTable } from "../DataTable";
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
    const scroller = container.querySelector<HTMLDivElement>(".sdt__scroll")!;
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

  it("reorders rows, keeping the lifted row rendered while it is scrolled out of the window", () => {
    const onRowOrderChange = vi.fn();
    const { container } = render(
      <VirtualDataTable<User>
        data={users(1000)}
        columns={columns}
        enableRowReorder
        onRowOrderChange={onRowOrderChange}
        virtual={{ estimateSize: 40, overscan: 2, maxHeight: 400 }}
      />,
    );
    const row = (id: string) => container.querySelector<HTMLElement>(`[data-row-id="${id}"]`);
    const handle = () => row("u1")!.querySelector<HTMLElement>("[data-slot=drag] button")!;

    act(() => handle().focus());
    fireEvent.keyDown(handle(), { key: " " });
    expect(row("u1")).toHaveAttribute("data-dragging");

    const area = container.querySelector<HTMLElement>(".sdt__scroll")!;
    act(() => {
      area.scrollTop = 20_000;
      fireEvent.scroll(area);
    });
    expect(row("u500")).not.toBeNull();
    expect(row("u1")).toHaveAttribute("data-dragging");
    expect(handle()).toHaveFocus();

    fireEvent.keyDown(handle(), { key: "ArrowDown" });
    fireEvent.keyDown(handle(), { key: " " });
    expect(onRowOrderChange).toHaveBeenCalledTimes(1);
    const { data } = onRowOrderChange.mock.calls[0]![0] as { data: User[] };
    expect(data.slice(0, 3).map((user) => user.id)).toEqual(["u2", "u1", "u3"]);
  });
});

describe("DataTable with virtual", () => {
  it("windows the rows with the hook it is given, from the main entry", () => {
    const { container } = render(
      <DataTable<User> data={users(1000)} columns={columns} virtual={{ use: useVirtualizer, estimateSize: 40, overscan: 0 }} />,
    );
    expect(container.firstElementChild).toHaveAttribute("data-virtual");
    expect(dataRows().length).toBeLessThan(30);
    expect(screen.queryByRole("navigation")).toBeNull();
  });
});

describe("VirtualDataTable under a SlotsmithProvider", () => {
  const ProviderEmpty = () => <span data-testid="provider-empty" />;

  it("takes the provider's data table slots", () => {
    render(
      <SlotsmithProvider components={{ dataTable: { Empty: ProviderEmpty } }}>
        <VirtualDataTable<User> data={[]} columns={columns} />
      </SlotsmithProvider>,
    );
    expect(screen.getByTestId("provider-empty")).toBeInTheDocument();
  });

  it("lets its own components prop win", () => {
    render(
      <SlotsmithProvider components={{ dataTable: { Empty: ProviderEmpty } }}>
        <VirtualDataTable<User> data={[]} columns={columns} components={{ Empty: () => <span data-testid="own-empty" /> }} />
      </SlotsmithProvider>,
    );
    expect(screen.getByTestId("own-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("provider-empty")).not.toBeInTheDocument();
  });
});
