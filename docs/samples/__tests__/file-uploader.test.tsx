// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { ar } from "slotsmith/locales/ar";
import { SlotsmithProvider } from "slotsmith/provider";
import { PROVIDERS, type ProviderName } from "@samples/adapters/providers";
import AntdDemo from "@samples/adapters/file-uploader/antd-demo";
import ChakraDemo from "@samples/adapters/file-uploader/chakra-demo";
import MuiDemo from "@samples/adapters/file-uploader/mui-demo";
import RadixDemo from "@samples/adapters/file-uploader/radix-demo";
import ShadcnDemo from "@samples/adapters/file-uploader/shadcn-demo";
import Compact from "@samples/file-uploader/compact";
import EditingARecord from "@samples/file-uploader/editing-a-record";
import Labels from "@samples/file-uploader/labels";
import Overview from "@samples/file-uploader/overview";
import Picker from "@samples/file-uploader/picker";
import QuickStart from "@samples/file-uploader/quick-start";
import Tile from "@samples/file-uploader/tile";
import Uploads from "@samples/file-uploader/uploads";
import Validation from "@samples/file-uploader/validation";
import Virtual from "@samples/file-uploader/virtual";
import { fakeUpload } from "@samples/shared/fake-upload";

let consoleError: MockInstance;
beforeEach(() => {
  consoleError = vi.spyOn(console, "error");
});

afterEach(() => {
  cleanup();
  expect(consoleError).not.toHaveBeenCalled();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const file = (name: string, type: string, size = 2048) => new File([new Uint8Array(size)], name, { type });
/** Picks files through the real `<input type="file">`, the way the file dialog does. */
const pick = (files: File[], root: ParentNode = document) => {
  const input = root.querySelector<HTMLInputElement>('input[type="file"]')!;
  fireEvent.change(input, { target: { files } });
  return input;
};
/** Runs the fake timers forward and lets the uploads' promises settle. */
const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

describe("fakeUpload", () => {
  const context = (signal = new AbortController().signal) => ({ signal, onProgress: vi.fn() });

  it("reports progress in five steps over one second and resolves a local URL", async () => {
    vi.useFakeTimers();
    const ctx = context();
    const result = fakeUpload(file("a b.png", "image/png"), ctx);
    await vi.advanceTimersByTimeAsync(1000);
    await expect(result).resolves.toEqual({ url: "/samples/uploaded/a%20b.png" });
    expect(ctx.onProgress.mock.calls.map(([percent]) => percent)).toEqual([20, 40, 60, 80, 100]);
  });

  it("fails at 60% when asked to", async () => {
    vi.useFakeTimers();
    const ctx = context();
    const result = fakeUpload(file("a.png", "image/png"), ctx, { fail: true });
    const settled = expect(result).rejects.toThrow("503");
    await vi.advanceTimersByTimeAsync(1000);
    await settled;
    expect(ctx.onProgress.mock.calls.map(([percent]) => percent)).toEqual([20, 40]);
  });

  it("rejects with an AbortError when aborted mid-flight, and at once when already aborted", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const ctx = context(controller.signal);
    const result = fakeUpload(file("a.png", "image/png"), ctx);
    const settled = expect(result).rejects.toMatchObject({ name: "AbortError" });
    await vi.advanceTimersByTimeAsync(300);
    controller.abort();
    await settled;
    expect(ctx.onProgress).toHaveBeenCalledTimes(1);

    const aborted = new AbortController();
    aborted.abort();
    await expect(fakeUpload(file("b.png", "image/png"), context(aborted.signal))).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("file uploader: quick start", () => {
  it("lists a picked file and hands back the File objects", () => {
    render(<QuickStart />);
    pick([file("report.pdf", "application/pdf")]);
    const list = screen.getByRole("list");
    expect(within(list).getByText("report.pdf")).toBeTruthy();
    // A picker: nothing is uploaded, the item stays ready with no status text.
    expect(within(list).queryByText("Ready")).toBeNull();
    expect(screen.getByText("Picked: report.pdf")).toBeTruthy();
  });

  it("follows the dropzone contract: a named button with a tab stop, Enter and Space open the real file input", () => {
    render(<QuickStart />);
    const zone = screen.getByRole("button", { name: "Add files" });
    expect(zone.getAttribute("tabindex")).toBe("0");
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    // The input stays in the accessibility tree, named, and out of the tab order.
    expect(input.getAttribute("aria-label")).toBe("Add files");
    expect(input.getAttribute("aria-hidden")).toBeNull();
    expect(input.tabIndex).toBe(-1);
    expect(input.accept).toBe("image/*,.pdf");
    const click = vi.spyOn(input, "click").mockImplementation(() => {});
    fireEvent.keyDown(zone, { key: "Enter" });
    fireEvent.keyDown(zone, { key: " " });
    expect(click).toHaveBeenCalledTimes(2);
    expect(screen.getByText("image/*, .pdf · up to 5 MB")).toBeTruthy();
  });
});

describe("file uploader: overview", () => {
  it("uploads two at a time and counts the finished ones", async () => {
    vi.useFakeTimers();
    render(<Overview />);
    expect(screen.getByText("No files yet.")).toBeTruthy();
    pick([file("a.png", "image/png"), file("b.png", "image/png"), file("c.pdf", "application/pdf")]);
    await advance(200);
    // concurrency 2: the third waits.
    expect(screen.getAllByRole("progressbar")).toHaveLength(2);
    expect(screen.getByText("Ready")).toBeTruthy();
    await advance(2000);
    expect(screen.getByText("3 of 3 files uploaded.")).toBeTruthy();
  });
});

describe("file uploader guide: uploads", () => {
  it("shows progress through the five steps, then Uploaded and the stored URL", async () => {
    vi.useFakeTimers();
    render(<Uploads />);
    pick([file("photo.png", "image/png")]);
    const values: string[] = [];
    for (let step = 1; step <= 4; step += 1) {
      await advance(200);
      const bar = screen.getByRole("progressbar", { name: "Uploading photo.png" });
      expect(bar.getAttribute("aria-valuemin")).toBe("0");
      expect(bar.getAttribute("aria-valuemax")).toBe("100");
      values.push(bar.getAttribute("aria-valuenow")!);
    }
    expect(values).toEqual(["20", "40", "60", "80"]);
    // The last step reports 100 and finishes in the same tick: the bar gives way to the status.
    await advance(200);
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.getByText("Uploaded")).toBeTruthy();
    expect(screen.getByText("Stored: /samples/uploaded/photo.png")).toBeTruthy();
  });

  it("shows the error and a Retry button when an upload fails, and retries", async () => {
    vi.useFakeTimers();
    render(<Uploads />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Make the next uploads fail" }));
    pick([file("photo.png", "image/png")]);
    await advance(600);
    expect(screen.getByText("The server answered 503. Try again.")).toBeTruthy();
    const item = document.querySelector('[data-status="error"]')!;
    expect(item).not.toBeNull();

    fireEvent.click(screen.getByRole("checkbox", { name: "Make the next uploads fail" }));
    fireEvent.click(within(item as HTMLElement).getByRole("button", { name: "Retry upload" }));
    await advance(1000);
    expect(screen.getByText("Uploaded")).toBeTruthy();
    expect(document.querySelector('[data-status="done"]')).not.toBeNull();
  });

  it("cancels an upload through its signal, leaving the item ready", async () => {
    vi.useFakeTimers();
    render(<Uploads />);
    pick([file("photo.png", "image/png")]);
    await advance(400);
    fireEvent.click(screen.getByRole("button", { name: "Cancel upload" }));
    await advance(1000);
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.getByText("Ready")).toBeTruthy();
    expect(screen.getByText("Stored: nothing yet.")).toBeTruthy();
  });
});

describe("file uploader guide: picker", () => {
  it("keeps the files local and sends them with the form", () => {
    render(<Picker />);
    expect(screen.getByText("CSV, Excel or PDF · up to 3 files · sent on submit")).toBeTruthy();
    pick([file("q1.csv", "text/csv", 1536), file("q2.pdf", "application/pdf", 3072)]);
    fireEvent.click(screen.getByRole("button", { name: "Send the form" }));
    expect(screen.getByText("The form would send: q1.csv (1.5 KB), q2.pdf (3 KB).")).toBeTruthy();
  });
});

describe("file uploader guide: tile", () => {
  it("shows the picked image in place of the drop zone, with its actions", async () => {
    vi.useFakeTimers();
    URL.createObjectURL = vi.fn(() => "blob:preview");
    URL.revokeObjectURL = vi.fn();
    const { container } = render(<Tile />);
    expect(container.querySelector('[data-variant="tile"]')).not.toBeNull();
    const zone = screen.getByRole("button", { name: "Profile photo" });
    expect(within(zone).getByText("Add a photo")).toBeTruthy();
    pick([file("me.png", "image/png")]);
    expect(within(zone).getByRole<HTMLImageElement>("img", { name: "Preview of me.png" }).src).toBe("blob:preview");
    expect(within(zone).getByRole("progressbar")).toBeTruthy();
    await advance(1000);
    expect(within(zone).queryByRole("progressbar")).toBeNull();
    // A tile has no list.
    expect(screen.queryByRole("list")).toBeNull();
    fireEvent.click(within(zone).getByRole("button", { name: "Remove file" }));
    expect(within(zone).getByText("Add a photo")).toBeTruthy();
  });
});

describe("file uploader guide: compact", () => {
  it("renders the compact variant: a Browse button and the hint, no drop zone", async () => {
    vi.useFakeTimers();
    const { container } = render(<Compact />);
    expect(container.querySelector('[data-variant="compact"]')).not.toBeNull();
    expect(container.querySelector('[role="button"]')).toBeNull();
    expect(screen.getByRole("button", { name: "Attach files" })).toBeTruthy();
    expect(screen.getByText(".pdf, .docx · up to 10 MB · max 3 files")).toBeTruthy();
    const input = pick([file("brief.pdf", "application/pdf")]);
    expect(input.getAttribute("aria-label")).toBe("Attachments");
    await advance(1000);
    expect(within(screen.getByRole("list")).getByText("brief.pdf")).toBeTruthy();
    expect(screen.getByText("Uploaded")).toBeTruthy();
  });
});

describe("file uploader guide: editing a record", () => {
  it("starts from the stored URL, with a preview, and saves what is left", () => {
    render(<EditingARecord />);
    const image = screen.getByRole<HTMLImageElement>("img", { name: "Preview of avatar.jpg" });
    expect(image.getAttribute("src")).toBe("/samples/avatar.jpg");
    expect(document.querySelector('[data-status="done"]')).not.toBeNull();
    expect(screen.getByText("Saves images: /samples/avatar.jpg")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Remove file" }));
    expect(screen.getByText("Saves images: none")).toBeTruthy();
  });
});

describe("file uploader guide: validation", () => {
  it("refuses a 6 MB file over the 5 MB maxSize with the tooLarge message, in a polite live region", () => {
    render(<Validation />);
    fireEvent.click(screen.getByRole("button", { name: "A 6 MB photo" }));
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.textContent).toContain("holiday.jpg is too large (max 5 MB)");
    // Refused: nothing was added to the list.
    expect(document.querySelectorAll(".sfu__item")).toHaveLength(0);
    // A later refusal is added to the same live region, so it is announced as a change.
    fireEvent.click(screen.getByRole("button", { name: "A text file" }));
    expect(screen.getByRole("status")).toBe(status);
    expect(within(status).getAllByRole("listitem")).toHaveLength(2);
  });

  it("explains each rule: type, minimum size, the custom rule and the file count", () => {
    render(<Validation />);
    for (const name of ["A text file", "An empty image", "A draft", "Four photos"]) {
      fireEvent.click(screen.getByRole("button", { name }));
    }
    const status = screen.getByRole("status");
    const messages = within(status).getAllByRole("listitem").map((item) => item.textContent);
    expect(messages).toEqual([
      "notes.txt is not an allowed file type",
      "blank.png is too small (min 1 KB)",
      "cover-draft.png is a draft. Upload the final version.",
      "Only 3 files allowed",
    ]);
    // Three of the four photos fit under maxFiles.
    expect(document.querySelectorAll(".sfu__item")).toHaveLength(3);
    fireEvent.click(within(status).getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("words the refusal in Arabic under the ar pack", () => {
    render(
      <div dir="rtl" lang="ar">
        <SlotsmithProvider locale="ar" locales={[ar]}>
          <Validation />
        </SlotsmithProvider>
      </div>,
    );
    fireEvent.click(screen.getByRole("button", { name: "A 6 MB photo" }));
    const message = screen.getByRole("status").textContent!;
    expect(message).toContain("holiday.jpg");
    expect(message).toContain("يتجاوز");
  });
});

describe("file uploader guide: virtual", () => {
  beforeEach(() => {
    // jsdom has no layout: give every element a 320px-tall box so the visible rows can be worked out.
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(320);
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(600);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(DOMRect.fromRect({ width: 600, height: 320 }));
  });

  it("renders a scroll container with fewer rows in the DOM than files", () => {
    render(<Virtual />);
    const list = document.querySelector<HTMLElement>(".sfu__list")!;
    // The sample's workaround for the flex list that shrinks the spacer rows.
    expect(list.style.display).toBe("block");
    expect(list.style.maxHeight).toBe("320px");
    expect(list.style.overflowY).toBe("auto");
    const rows = list.querySelectorAll(".sfu__item");
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThan(300);
    expect(within(list).getByText("scan-001.pdf")).toBeTruthy();
    expect(within(list).queryByText("scan-300.pdf")).toBeNull();
  });
});

describe("file uploader: labels", () => {
  it("shows the German pack with two labels replaced, and the replaced rejection message", () => {
    render(<Labels />);
    expect(screen.getByText("Belege hierher ziehen")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Belege auswählen" })).toBeTruthy();
    pick([file("notes.txt", "text/plain")]);
    expect(screen.getByRole("status").textContent).toContain("notes.txt: bitte nur Bilder");
    pick([file("big.png", "image/png", 3 * 1024 * 1024)]);
    expect(screen.getByRole("status").textContent).toContain("big.png ist zu groß (max. 2 MB)");
  });
});

describe("file uploader samples: prerender", () => {
  const SAMPLES: [string, ComponentType][] = [
    ["overview", Overview],
    ["editing-a-record", EditingARecord],
    ["validation", Validation],
    ["virtual", Virtual],
    ["compact", Compact],
    ["tile", Tile],
  ];

  it.each(SAMPLES)("%s: hydrates the server markup without a mismatch", async (_name, Sample) => {
    const html = renderToString(<Sample />);
    const recoverable = vi.fn();
    const container = document.createElement("div");
    document.body.append(container);
    container.innerHTML = html;
    const root = await act(async () => hydrateRoot(container, <Sample />, { onRecoverableError: recoverable }));
    expect(recoverable).not.toHaveBeenCalled();
    act(() => root.unmount());
    container.remove();
  });
});

/** Each adapter demo, an element only that library renders, and the role of its refusal region. */
const ADAPTER_DEMOS: [name: ProviderName, Demo: ComponentType, marker: string, refusalRole: "status" | "alert"][] = [
  ["shadcn", ShadcnDemo, '[data-slot="dropzone"]', "status"],
  ["mui", MuiDemo, ".MuiPaper-root", "status"],
  ["chakra", ChakraDemo, "[class*='chakra-button']", "status"],
  ["antd", AntdDemo, ".ant-btn", "status"],
  ["radix", RadixDemo, ".rt-Button, .rt-IconButton", "status"],
];

const Wrapped = ({ name, children }: { name: ProviderName; children: ReactNode }) => {
  const Provider = PROVIDERS[name];
  return (
    <Provider theme="dark" dir="ltr">
      {children}
    </Provider>
  );
};

describe("file uploader adapter demos", () => {
  beforeAll(() => {
    // MUI, Chakra and Radix read these on mount.
    const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
    proto.hasPointerCapture ??= () => false;
    proto.releasePointerCapture ??= () => {};
    Element.prototype.scrollIntoView ??= () => {};
    globalThis.ResizeObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
    window.matchMedia ??= ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
  });

  it.each(ADAPTER_DEMOS)("%s: shows the stored file with the library's parts, uploads a new one and refuses a wrong type", { timeout: 60000 }, async (name, Demo, marker, refusalRole) => {
    vi.useFakeTimers();
    const { container } = render(
      <Wrapped name={name}>
        <Demo />
      </Wrapped>,
    );
    expect(container.querySelector(marker), `${name} parts`).not.toBeNull();
    expect(screen.getByText("avatar.jpg")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add files" }).getAttribute("tabindex")).toBe("0");

    pick([file("plan.pdf", "application/pdf")], container);
    await advance(400);
    expect(screen.getByText("plan.pdf")).toBeTruthy();
    const bar = screen.getByRole("progressbar");
    if (name === "chakra") {
      // Known library issue (LAUNCH-REPORT): the adapter's label lands on Progress.Root, and the
      // element with the role, Chakra's Track, is named by its own percentage instead.
      expect(bar.getAttribute("aria-label")).toBe("40%");
    } else {
      expect(screen.getByRole("progressbar", { name: "Uploading plan.pdf" })).toBe(bar);
    }
    expect(bar.getAttribute("aria-valuenow")).toBe("40");
    await advance(1000);
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.getAllByRole("button", { name: "Remove file" })).toHaveLength(2);

    pick([file("notes.txt", "text/plain")], container);
    const refusal = screen.getByText("notes.txt is not an allowed file type");
    const region = refusal.closest('[role="status"],[role="alert"]');
    expect(region, `${name} refusal region`).not.toBeNull();
    expect(region!.getAttribute("role")).toBe(refusalRole);
    if (refusalRole === "status") expect(region!.getAttribute("aria-live") ?? "polite").toBe("polite");
  });
});
