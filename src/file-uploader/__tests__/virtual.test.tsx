import { render, screen } from "@testing-library/react";
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
