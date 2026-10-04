// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { PROVIDERS, type ProviderName } from "@samples/adapters/providers";
import AntdDemo from "@samples/adapters/autocomplete/antd-demo";
import ChakraDemo from "@samples/adapters/autocomplete/chakra-demo";
import MuiDemo from "@samples/adapters/autocomplete/mui-demo";
import RadixDemo from "@samples/adapters/autocomplete/radix-demo";
import ShadcnDemo from "@samples/adapters/autocomplete/shadcn-demo";
import CompoundParts from "@samples/autocomplete/compound-parts";
import Creatable from "@samples/autocomplete/creatable";
import Labels from "@samples/autocomplete/labels";
import Multiple from "@samples/autocomplete/multiple";
import Overview from "@samples/autocomplete/overview";
import QuickStart from "@samples/autocomplete/quick-start";
import RemoteOptions from "@samples/autocomplete/remote-options";
import SelectOrCombobox from "@samples/autocomplete/select-or-combobox";
import States from "@samples/autocomplete/states";
import Virtual from "@samples/autocomplete/virtual";
import * as catalog from "@samples/shared/fake-catalog";

// The remote sample imports the catalog as `../shared/fake-catalog`: the same file, so this spy sees its calls.
vi.mock("@samples/shared/fake-catalog", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@samples/shared/fake-catalog")>();
  return { ...actual, searchPackages: vi.fn(actual.searchPackages) };
});

beforeAll(() => {
  // jsdom has no layout: the highlight scrolls its row into view, and the virtual list observes its size.
  Element.prototype.scrollIntoView ??= () => {};
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

let consoleError: MockInstance;
beforeEach(() => {
  consoleError = vi.spyOn(console, "error");
});

afterEach(() => {
  expect(consoleError).not.toHaveBeenCalled();
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.mocked(catalog.searchPackages).mockClear();
});

const key = (element: Element, name: string) => fireEvent.keyDown(element, { key: name });
/** The open listbox's options, by their text. */
const optionTexts = () => screen.queryAllByRole("option").map((option) => option.textContent);
/** The autocomplete's own live region (`aria-live="polite"`, visually hidden). */
const liveRegion = (container: HTMLElement) => container.querySelector<HTMLElement>('.sac__sr-only[role="status"]')!;
const tagLabels = (combobox: HTMLElement) => within(combobox).queryAllByRole("button", { name: /^Remove / }).map((b) => b.getAttribute("aria-label"));

describe("autocomplete: catalog", () => {
  it("answers one page at a time, deterministically, after a delay", async () => {
    vi.useFakeTimers();
    const first = catalog.searchPackages("kit", 1, new AbortController().signal);
    await vi.advanceTimersByTimeAsync(250);
    const again = catalog.searchPackages("kit", 1, new AbortController().signal);
    await vi.advanceTimersByTimeAsync(250);
    const [a, b] = await Promise.all([first, again]);
    expect(a).toEqual(b);
    expect(a.data.length).toBeGreaterThan(0);
    expect(a.data.every((pkg) => pkg.name.startsWith("@acme/") && pkg.name.includes("kit"))).toBe(true);
  });

  it("rejects with an AbortError once its signal aborts", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const result = catalog.searchPackages("", 1, controller.signal);
    controller.abort();
    await expect(result).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("autocomplete: quick start", () => {
  it("opens with ArrowDown and selects the highlighted option with Enter", () => {
    render(<QuickStart />);
    const combobox = screen.getByRole("combobox", { name: "Fruit" });
    expect(combobox.getAttribute("aria-expanded")).toBe("false");
    act(() => combobox.focus());
    key(combobox, "ArrowDown");
    expect(combobox.getAttribute("aria-expanded")).toBe("true");
    const search = screen.getByRole("searchbox");
    expect(document.activeElement).toBe(search);
    const [first] = screen.getAllByRole("option");
    expect(search.getAttribute("aria-activedescendant")).toBe(first!.id);
    key(search, "Enter");
    expect(combobox.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(combobox);
    expect(combobox.textContent).toContain(first!.textContent);
  });
});

describe("autocomplete: overview", () => {
  it("names both pickers from their visible labels and reports the selection", () => {
    render(<Overview />);
    expect(screen.getByRole("combobox", { name: "Country" })).toBeTruthy();
    const topics = screen.getByRole("combobox", { name: "Topics" });
    expect(tagLabels(topics)).toHaveLength(2);
    expect(screen.getByText(/^Topics: /)).toBeTruthy();
  });
});

describe("autocomplete guide: select or combobox", () => {
  it("is a combobox with a search box, and a select with typeahead once searchable is off", () => {
    render(<SelectOrCombobox />);
    const combobox = screen.getByRole("combobox", { name: "Country" });
    fireEvent.click(combobox);
    expect(screen.getByRole("searchbox")).toBeTruthy();
    key(screen.getByRole("searchbox"), "Escape");
    expect(document.activeElement).toBe(combobox);

    fireEvent.click(screen.getByRole("checkbox", { name: /searchable/ }));
    const select = screen.getByRole("combobox", { name: "Country" });
    act(() => select.focus());
    // Typing on a closed select opens it and jumps to the first match.
    key(select, "j");
    expect(screen.queryByRole("searchbox")).toBeNull();
    const highlighted = document.getElementById(select.getAttribute("aria-activedescendant")!);
    expect(highlighted?.textContent).toBe("Japan");
    key(select, "Enter");
    expect(screen.getByText("Selected: jp")).toBeTruthy();
  });
});

describe("autocomplete guide: multiple values", () => {
  it("shows two tags, and Backspace in the empty search removes the last one", () => {
    const { container } = render(<Multiple />);
    const combobox = screen.getByRole("combobox", { name: "Topics" });
    expect(tagLabels(combobox)).toEqual(["Remove Accessibility", "Remove Forms"]);
    expect(screen.queryByRole("listbox")).toBeNull();
    fireEvent.click(combobox);
    expect(screen.getByRole("listbox").getAttribute("aria-multiselectable")).toBe("true");
    expect(liveRegion(container).textContent).toMatch(/^\d+ results$/);
    const search = screen.getByRole("searchbox");
    key(search, "Backspace");
    expect(tagLabels(combobox)).toEqual(["Remove Accessibility"]);
    expect(screen.getByText("Selected: accessibility")).toBeTruthy();
    // With text in the search box, Backspace edits the text instead.
    fireEvent.change(search, { target: { value: "te" } });
    key(search, "Backspace");
    expect(tagLabels(combobox)).toEqual(["Remove Accessibility"]);
  });

  it("announces the result count as the search narrows the list", () => {
    const { container } = render(<Multiple />);
    fireEvent.click(screen.getByRole("combobox", { name: "Topics" }));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "test" } });
    expect(optionTexts()).toEqual(["Testing"]);
    expect(liveRegion(container).textContent).toBe("1 result");
  });

  it("keeps the archived topic visible but out of reach", () => {
    render(<Multiple />);
    fireEvent.click(screen.getByRole("combobox", { name: "Topics" }));
    const legacy = screen.getByRole("option", { name: "Legacy browsers" });
    expect(legacy.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(legacy);
    expect(legacy.getAttribute("aria-selected")).toBe("false");
  });
});

describe("autocomplete guide: remote options", () => {
  it("shows the loading row, then the first page of packages", async () => {
    vi.useFakeTimers();
    render(<RemoteOptions />);
    fireEvent.click(screen.getByRole("combobox", { name: "Package" }));
    // Nothing is fetched until the 300ms debounce settles; then the loading row shows while the request runs.
    expect(catalog.searchPackages).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(300));
    expect(catalog.searchPackages).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("listbox").textContent).toContain("Loading…");
    expect(screen.getByRole("listbox").getAttribute("aria-busy")).toBe("true");
    await act(() => vi.advanceTimersByTimeAsync(250));
    expect(screen.getByRole("listbox").getAttribute("aria-busy")).toBeNull();
    expect(optionTexts().length).toBeGreaterThan(0);
    expect(screen.getAllByRole("option")[0]!.textContent).toContain("@acme/");
    expect(screen.getByText(/GET \/packages\?q=&page=1/)).toBeTruthy();
  });

  it("aborts the earlier request when a newer query supersedes it, and keeps the previous results meanwhile", async () => {
    vi.useFakeTimers();
    render(<RemoteOptions />);
    // At 250 ms a request answers inside the next search's 300 ms debounce; the slow network (2 s) lets a newer search overtake it.
    fireEvent.click(screen.getByRole("checkbox", { name: /Slow network/ }));
    fireEvent.click(screen.getByRole("combobox", { name: "Package" }));
    await act(() => vi.advanceTimersByTimeAsync(300 + 2000));
    const before = optionTexts();
    const search = screen.getByRole("searchbox");

    fireEvent.change(search, { target: { value: "ui" } });
    await act(() => vi.advanceTimersByTimeAsync(300 + 500));
    // The "ui" request is in flight: the previous page stays on screen, marked busy.
    expect(optionTexts()).toEqual(before);
    expect(screen.getByRole("listbox").getAttribute("aria-busy")).toBe("true");

    fireEvent.change(search, { target: { value: "ui-k" } });
    await act(() => vi.advanceTimersByTimeAsync(300 + 2000));

    const calls = vi.mocked(catalog.searchPackages).mock.calls;
    const ui = calls.find(([query]) => query === "ui")!;
    expect(ui[2].aborted).toBe(true);
    expect(calls.at(-1)![0]).toBe("ui-k");
    expect(calls.at(-1)![2].aborted).toBe(false);
    // Only the newest query's results show; the aborted one never lands.
    expect(optionTexts().length).toBeGreaterThan(0);
    expect(screen.getAllByRole("option").every((option) => option.textContent!.includes("ui-kit"))).toBe(true);
    expect(screen.getByText(/q=ui&page=1 · cancelled/)).toBeTruthy();
    // A request that had already answered stays "done", although the next search aborts its signal.
    expect(screen.getByText(/q=&page=1 · done/)).toBeTruthy();
  });
});

describe("autocomplete guide: states", () => {
  const openPicker = (name: string) => {
    fireEvent.click(screen.getByRole("combobox", { name }));
    return screen.getByRole("listbox");
  };

  it("renders the loading row", () => {
    render(<States />);
    const list = openPicker("Loading");
    expect(list.textContent).toBe("Loading…");
    expect(list.getAttribute("aria-busy")).toBe("true");
  });

  it("renders the empty row", () => {
    render(<States />);
    expect(openPicker("Empty").textContent).toBe("No countries match");
  });

  it("renders the error row, and its retry recovers", () => {
    render(<States />);
    const list = openPicker("Error");
    expect(list.textContent).toContain("503 Service Unavailable");
    fireEvent.click(within(list).getByRole("button", { name: "Retry" }));
    expect(screen.getAllByRole("option").length).toBeGreaterThan(0);
  });

  it("asks for more characters before it searches", () => {
    render(<States />);
    const list = openPicker("Min. characters");
    expect(list.textContent).toBe("Type 3 or more characters to search");
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "ger" } });
    expect(optionTexts()).toEqual(["Germany"]);
  });
});

describe("autocomplete guide: creatable", () => {
  it("offers to create an unknown name, and selects what it creates", () => {
    render(<Creatable />);
    fireEvent.click(screen.getByRole("combobox", { name: "Tag" }));
    const search = screen.getByRole("searchbox");
    fireEvent.change(search, { target: { value: "Zebra" } });
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Create “Zebra”" })).toBeTruthy();
    // Enter with no option highlighted creates, like the button.
    key(search, "Enter");
    expect(screen.getByText("Selected: zebra")).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Tag" }).textContent).toContain("Zebra");
  });

  it("does not offer it for a name that exists", () => {
    render(<Creatable />);
    fireEvent.click(screen.getByRole("combobox", { name: "Tag" }));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Design" } });
    expect(screen.queryByRole("button", { name: /^Create/ })).toBeNull();
  });
});

describe("autocomplete guide: virtual lists", () => {
  it("renders only a window of the 5,000 options", () => {
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(280);
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(320);
    render(<Virtual />);
    fireEvent.click(screen.getByRole("combobox", { name: "City" }));
    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThan(0);
    expect(options.length).toBeLessThan(60);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "4999" } });
    expect(optionTexts()).toEqual([expect.stringMatching(/^[A-Za-z ]+ 4999$/)]);
  });
});

describe("autocomplete guide: compound parts", () => {
  it("labels the trigger from its own <label> and reads the selection through the context", () => {
    render(<CompoundParts />);
    const combobox = screen.getByRole("combobox", { name: "Topics" });
    expect(screen.getByText("Nothing selected.")).toBeTruthy();
    fireEvent.click(combobox);
    fireEvent.click(screen.getByRole("option", { name: "Forms" }));
    fireEvent.click(screen.getByRole("option", { name: "Testing" }));
    expect(screen.getByText(/^2 selected/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(tagLabels(combobox)).toEqual([]);
    expect(screen.getByText("Nothing selected.")).toBeTruthy();
  });
});

describe("autocomplete: labels", () => {
  it("speaks German, with one label replaced", () => {
    render(<Labels />);
    const combobox = screen.getByRole("combobox", { name: "Stadt" });
    expect(combobox.textContent).toContain("Stadt wählen…");
    fireEvent.click(combobox);
    expect(screen.getByRole("searchbox").getAttribute("aria-label")).toBe("Suchen…");
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "xyz" } });
    expect(screen.getByRole("listbox").textContent).toBe("Keine Stadt gefunden");
  });
});

/** Each adapter demo and an element only that library renders. */
const ADAPTER_DEMOS: [name: ProviderName, Demo: ComponentType, marker: string][] = [
  ["shadcn", ShadcnDemo, '[data-slot="badge"]'],
  ["mui", MuiDemo, ".MuiChip-root"],
  ["chakra", ChakraDemo, "[class*='chakra-tag']"],
  ["antd", AntdDemo, ".ant-tag"],
  ["radix", RadixDemo, ".rt-Badge"],
];

describe("autocomplete adapter demos", () => {
  beforeAll(() => {
    // MUI, Chakra and Radix read these on mount.
    const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
    proto.hasPointerCapture ??= () => false;
    proto.releasePointerCapture ??= () => {};
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

  it.each(ADAPTER_DEMOS)("%s: renders two tags with the library's parts, opens, and removes a tag", { timeout: 60000 }, (name, Demo, marker) => {
    const Provider = PROVIDERS[name];
    const { container } = render(
      <Provider theme="dark" dir="ltr">
        <Demo />
      </Provider>,
    );
    const combobox = screen.getByRole("combobox", { name: "Topics" });
    expect(container.querySelector(marker), `${name} parts`).not.toBeNull();
    expect(tagLabels(combobox)).toEqual(["Remove Accessibility", "Remove Forms"]);
    fireEvent.click(combobox);
    expect(screen.getAllByRole("option").length).toBeGreaterThan(5);
    key(screen.getByRole("searchbox"), "Backspace");
    expect(tagLabels(combobox)).toEqual(["Remove Accessibility"]);
  });
});
