import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { SlotsmithProvider } from "../../provider";
import { VirtualFileUploader } from "../virtual";
import { fileInput, items, makeFile } from "./builders";

/** jsdom has no layout: give every element a 400px-tall box so rows can be measured. */
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
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(600);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    width: 600,
    height: 400,
    top: 0,
    left: 0,
    right: 600,
    bottom: 400,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
});

afterAll(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** The item rows. Spacers carry no `data-status`, so they are excluded already. */
const rows = items;

describe("VirtualFileUploader", () => {
  it("renders only the rows in view", async () => {
    const user = userEvent.setup();
    render(<VirtualFileUploader multiple maxFiles={300} virtual={{ estimateSize: 56, overscan: 2 }} />);

    const files = Array.from({ length: 120 }, (_, index) => makeFile(`file-${index}.png`));
    await user.upload(fileInput(), files);

    expect(rows().length).toBeGreaterThan(0);
    expect(rows().length).toBeLessThan(files.length);
  });

  it("pads the rest of the list with spacers hidden from assistive technology", async () => {
    const user = userEvent.setup();
    const { container } = render(<VirtualFileUploader multiple maxFiles={300} virtual={{ estimateSize: 56 }} />);

    await user.upload(
      fileInput(),
      Array.from({ length: 60 }, (_, index) => makeFile(`file-${index}.png`)),
    );

    const spacers = container.querySelectorAll('[data-slot="virtual-spacer"]');
    expect(spacers.length).toBeGreaterThan(0);
    spacers.forEach((spacer) => expect(spacer).toHaveAttribute("aria-hidden", "true"));
  });

  /**
   * In the fallback list, a flex column with a gap, a spacer that may shrink
   * collapses inside the capped height, and the gap is added around each
   * spacer as well as between rows. The spacers keep their height and give
   * the gap back, so the content is as tall as the virtualizer's total, less
   * the one gap after the last row.
   */
  it("keeps the scroll height at the virtualizer's total in a flex list with a gap", async () => {
    const user = userEvent.setup();
    const estimate = 72.5;
    const gap = 8;
    const { container } = render(
      <VirtualFileUploader
        multiple
        maxFiles={300}
        virtual={{ estimateSize: estimate, overscan: 2 }}
        slotProps={{ list: { style: { display: "flex", flexDirection: "column", rowGap: `${gap}px` } } }}
      />,
    );
    const count = 300;
    await user.upload(
      fileInput(),
      Array.from({ length: count }, (_, index) => makeFile(`file-${index}.png`)),
    );

    const list = screen.getByRole("list");
    Object.defineProperty(list, "scrollTop", { configurable: true, value: 100 * estimate });
    fireEvent.scroll(list);

    await waitFor(() => expect(container.querySelectorAll('[data-slot="virtual-spacer"]')).toHaveLength(2));
    const spacers = [...container.querySelectorAll<HTMLElement>('[data-slot="virtual-spacer"]')];
    for (const spacer of spacers) expect(spacer.style.flexShrink).toBe("0");

    // The content as the flex column lays it out: every child, a gap between each two, rows at the estimate less the gap.
    const rendered = rows().length;
    const children = spacers.length + rendered;
    const content =
      spacers.reduce((sum, spacer) => sum + parseFloat(spacer.style.height), 0) +
      rendered * (estimate - gap) +
      (children - 1) * gap;
    expect(content).toBeCloseTo(count * estimate - gap);

    // The first rendered row starts where the virtualizer puts it: a whole number of rows down.
    const firstStart = parseFloat(spacers[0]!.style.height) + gap;
    expect(firstStart / estimate).toBeCloseTo(Math.round(firstStart / estimate));
    expect(firstStart).toBeGreaterThan(0);
  });

  it("renders no list at all until something is picked", () => {
    render(<VirtualFileUploader multiple />);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("keeps each row's own parts working", async () => {
    const user = userEvent.setup();
    render(<VirtualFileUploader multiple />);

    await user.upload(fileInput(), makeFile("report.pdf"));

    expect(screen.getByText("report.pdf")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove file" })).toBeInTheDocument();
  });
});

describe("VirtualFileUploader under a SlotsmithProvider", () => {
  const ProviderIcon = () => <span data-testid="provider-icon" />;

  it("takes the provider's file uploader slots", () => {
    render(
      <SlotsmithProvider components={{ fileUploader: { Icon: ProviderIcon } }}>
        <VirtualFileUploader />
      </SlotsmithProvider>,
    );
    expect(screen.getByTestId("provider-icon")).toBeInTheDocument();
  });

  it("lets its own components prop win", () => {
    render(
      <SlotsmithProvider components={{ fileUploader: { Icon: ProviderIcon } }}>
        <VirtualFileUploader components={{ Icon: () => <span data-testid="own-icon" /> }} />
      </SlotsmithProvider>,
    );
    expect(screen.getByTestId("own-icon")).toBeInTheDocument();
    expect(screen.queryByTestId("provider-icon")).not.toBeInTheDocument();
  });
});
