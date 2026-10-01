// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ComponentType } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { t } from "@/i18n";
import SwapDemo, { retryable, type Variant } from "@/islands/SwapDemo";
import { swapMessages } from "@/lib/swap-messages";

type Loaded = { default: ComponentType };

const sources: Record<Variant, string> = {
  fallback: "import a\n<DataTable />",
  shadcn: "import a\nimport s\n<DataTable components={s} />",
  mui: "import a\nimport m\n<DataTable components={m} />",
  chakra: "import a\nimport c\n<DataTable components={c} />",
  antd: "import a\nimport d\n<DataTable components={d} />",
};

/** A loader whose promise the test settles by hand. */
function deferred(name: string) {
  const renders = vi.fn();
  let resolve!: (value: Loaded) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<Loaded>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  const Variant = () => {
    renders();
    return <p data-testid={`variant-${name}`}>{name}</p>;
  };
  return { load: vi.fn(() => promise), renders, resolve: () => resolve({ default: Variant }), reject: () => reject(new Error("offline")) };
}

const resolved = (name: string) => vi.fn(async (): Promise<Loaded> => ({ default: () => <p data-testid={`variant-${name}`}>{name}</p> }));

const radio = (name: string) => screen.getByRole("radio", { name });

afterEach(cleanup);

describe("SwapDemo", () => {
  it("renders the fallback table first, with Fallback checked", () => {
    const { container } = render(<SwapDemo lang="en" messages={swapMessages("en")} sources={sources} />);
    expect(container.querySelectorAll("tbody tr")).toHaveLength(12);
    expect(screen.getByRole("radiogroup")).toBeTruthy();
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    expect(radio("Fallback").getAttribute("aria-checked")).toBe("true");
    expect(radio("MUI").getAttribute("aria-checked")).toBe("false");
  });

  it("ends on the last choice when an earlier bundle is still loading, and never shows the earlier one", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const mui = deferred("mui");
    const chakra = deferred("chakra");
    render(<SwapDemo lang="en" messages={swapMessages("en")} sources={sources} loaders={{ mui: mui.load, chakra: chakra.load }} />);
    fireEvent.click(radio("MUI"));
    fireEvent.click(radio("Chakra"));
    await act(async () => chakra.resolve());
    await act(async () => mui.resolve());
    expect(screen.getByTestId("variant-chakra")).toBeTruthy();
    expect(screen.queryByTestId("variant-mui")).toBeNull();
    expect(mui.renders).not.toHaveBeenCalled();
    expect(radio("Chakra").getAttribute("aria-checked")).toBe("true");
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it("stays on the previous variant when an earlier choice loads while the latest is pending", async () => {
    const mui = deferred("mui");
    const chakra = deferred("chakra");
    const { container } = render(<SwapDemo lang="en" messages={swapMessages("en")} sources={sources} loaders={{ mui: mui.load, chakra: chakra.load }} />);
    const shown = () => container.querySelector(".swap")!.getAttribute("data-current");
    fireEvent.click(radio("MUI"));
    fireEvent.click(radio("Chakra"));
    await act(async () => mui.resolve());
    expect(shown()).toBe("fallback");
    expect(mui.renders).not.toHaveBeenCalled();
    expect(container.querySelectorAll("tbody tr")).toHaveLength(12);
    await act(async () => chakra.resolve());
    expect(shown()).toBe("chakra");
    expect(screen.getByTestId("variant-chakra")).toBeTruthy();
    expect(mui.renders).not.toHaveBeenCalled();
  });

  it("keeps the previous variant and offers a retry when a bundle fails to load", async () => {
    const shadcn = deferred("shadcn");
    const { container } = render(<SwapDemo lang="en" messages={swapMessages("en")} sources={sources} loaders={{ shadcn: shadcn.load }} />);
    fireEvent.click(radio("shadcn"));
    await act(async () => shadcn.reject());
    expect(container.querySelectorAll("tbody tr")).toHaveLength(12);
    expect(screen.getByText(t("en", "swap.failed"), { exact: false })).toBeTruthy();
    expect(screen.getByRole("button", { name: t("en", "swap.retry") })).toBeTruthy();
  });

  it("loads again when retry is pressed after a failure", async () => {
    let fail = true;
    const load = vi.fn(async (): Promise<Loaded> => {
      if (fail) throw new Error("offline");
      return { default: () => <p data-testid="variant-mui">mui</p> };
    });
    render(<SwapDemo lang="en" messages={swapMessages("en")} sources={sources} loaders={{ mui: load }} />);
    await act(async () => fireEvent.click(radio("MUI")));
    fail = false;
    await act(async () => fireEvent.click(screen.getByRole("button", { name: t("en", "swap.retry") })));
    expect(screen.getByTestId("variant-mui")).toBeTruthy();
    expect(screen.queryByRole("button", { name: t("en", "swap.retry") })).toBeNull();
  });

  it("offers a page reload when the retry fails too", async () => {
    const load = vi.fn(async (): Promise<Loaded> => {
      throw new Error("offline");
    });
    const { container } = render(<SwapDemo lang="en" messages={swapMessages("en")} sources={sources} loaders={{ mui: load }} />);
    await act(async () => fireEvent.click(radio("MUI")));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: t("en", "swap.retry") })));
    expect(load).toHaveBeenCalledTimes(2);
    expect(screen.getByText(t("en", "swap.reload"))).toBeTruthy();
    expect(screen.getByRole("button", { name: t("en", "swap.reloadButton") })).toBeTruthy();
    expect(container.querySelectorAll("tbody tr")).toHaveLength(12);
  });

  it("moves and selects with the arrow keys, as a radio group", async () => {
    render(<SwapDemo lang="en" messages={swapMessages("en")} sources={sources} loaders={{ shadcn: resolved("shadcn"), mui: resolved("mui"), chakra: resolved("chakra"), antd: resolved("antd") }} />);
    const fallback = radio("Fallback");
    expect(fallback.tabIndex).toBe(0);
    expect(radio("shadcn").tabIndex).toBe(-1);
    fallback.focus();
    await act(async () => fireEvent.keyDown(fallback, { key: "ArrowRight" }));
    expect(radio("shadcn").getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(radio("shadcn"));
    expect(radio("shadcn").tabIndex).toBe(0);
    expect(screen.getByTestId("variant-shadcn")).toBeTruthy();
    await act(async () => fireEvent.keyDown(radio("shadcn"), { key: "ArrowLeft" }));
    expect(radio("Fallback").getAttribute("aria-checked")).toBe("true");
    // Up and Down move to the previous and next choice, wrapping, whatever the direction.
    await act(async () => fireEvent.keyDown(radio("Fallback"), { key: "ArrowDown" }));
    expect(radio("shadcn").getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(radio("shadcn"));
    await act(async () => fireEvent.keyDown(radio("shadcn"), { key: "ArrowUp" }));
    await act(async () => fireEvent.keyDown(radio("Fallback"), { key: "ArrowUp" }));
    expect(radio("Ant Design").getAttribute("aria-checked")).toBe("true");
    expect(screen.getByTestId("variant-antd")).toBeTruthy();
    // Right from the last choice wraps back to the first.
    await act(async () => fireEvent.keyDown(radio("Ant Design"), { key: "ArrowRight" }));
    expect(radio("Fallback").getAttribute("aria-checked")).toBe("true");
  });

  it("prefetches a variant once on hover", () => {
    const shadcn = deferred("shadcn");
    render(<SwapDemo lang="en" messages={swapMessages("en")} sources={sources} loaders={{ shadcn: shadcn.load }} />);
    fireEvent.pointerEnter(radio("shadcn"));
    fireEvent.pointerEnter(radio("shadcn"));
    fireEvent.focus(radio("shadcn"));
    expect(shadcn.load).toHaveBeenCalledTimes(1);
  });

  it("marks the lines the current variant changes", async () => {
    const { container } = render(<SwapDemo lang="en" messages={swapMessages("en")} sources={sources} loaders={{ mui: resolved("mui") }} />);
    // Every pane is rendered; CSS shows the one named by the root's data-current.
    const shownPane = () => {
      const current = container.querySelector(".swap")!.getAttribute("data-current");
      return container.querySelector(`.swap__pane[data-code="${current}"]`)!;
    };
    expect(shownPane().querySelectorAll(".swap__line--added")).toHaveLength(0);
    await act(async () => fireEvent.click(radio("MUI")));
    expect(shownPane().getAttribute("data-code")).toBe("mui");
    const marked = [...shownPane().querySelectorAll(".swap__line--added")].map((line) => line.textContent);
    expect(marked).toEqual([`import m ${t("en", "swap.changedLine")}`, `<DataTable components={m} /> ${t("en", "swap.changedLine")}`]);
  });

  it("announces the swap to the page with swap:before and swap:after events", async () => {
    const { container } = render(<SwapDemo lang="en" messages={swapMessages("en")} sources={sources} loaders={{ mui: resolved("mui") }} />);
    const root = container.firstElementChild!;
    const events: string[] = [];
    root.addEventListener("swap:before", (event) => events.push(`before:${(event as CustomEvent).detail.to}`));
    root.addEventListener("swap:after", (event) => events.push(`after:${(event as CustomEvent).detail.to}`));
    await act(async () => fireEvent.click(radio("MUI")));
    expect(events).toEqual(["before:mui", "after:mui"]);
  });

  it("lets a swap:before listener hold the switch until its promise settles", async () => {
    const { container } = render(<SwapDemo lang="en" messages={swapMessages("en")} sources={sources} loaders={{ mui: resolved("mui") }} />);
    const root = container.firstElementChild!;
    const events: string[] = [];
    let release!: () => void;
    root.addEventListener("swap:before", (event) => {
      events.push("before");
      (event as CustomEvent<{ waitUntil: (promise: Promise<unknown>) => void }>).detail.waitUntil(new Promise<void>((done) => (release = done)));
    });
    root.addEventListener("swap:after", () => events.push("after"));
    await act(async () => fireEvent.click(radio("MUI")));
    expect(events).toEqual(["before"]);
    expect(root.getAttribute("data-current")).toBe("fallback");
    expect(radio("MUI").getAttribute("aria-checked")).toBe("true");
    await act(async () => release());
    expect(root.getAttribute("data-current")).toBe("mui");
    expect(events).toEqual(["before", "after"]);
  });

  it("switches after 700ms even when a swap:before promise never settles", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      const { container } = render(<SwapDemo lang="en" messages={swapMessages("en")} sources={sources} loaders={{ mui: resolved("mui") }} />);
      const root = container.firstElementChild!;
      root.addEventListener("swap:before", (event) => (event as CustomEvent<{ waitUntil: (promise: Promise<unknown>) => void }>).detail.waitUntil(new Promise(() => {})));
      await act(async () => fireEvent.click(radio("MUI")));
      await act(async () => vi.advanceTimersByTimeAsync(699));
      expect(root.getAttribute("data-current")).toBe("fallback");
      await act(async () => vi.advanceTimersByTimeAsync(1));
      expect(root.getAttribute("data-current")).toBe("mui");
    } finally {
      vi.useRealTimers();
    }
  });

  it("drops a held switch when a later choice comes in while it waits", async () => {
    const { container } = render(
      <SwapDemo lang="en" messages={swapMessages("en")} sources={sources} loaders={{ mui: resolved("mui"), chakra: resolved("chakra") }} />,
    );
    const root = container.firstElementChild!;
    const releases: (() => void)[] = [];
    const after: string[] = [];
    root.addEventListener("swap:before", (event) =>
      (event as CustomEvent<{ waitUntil: (promise: Promise<unknown>) => void }>).detail.waitUntil(new Promise<void>((done) => releases.push(done))),
    );
    root.addEventListener("swap:after", (event) => after.push((event as CustomEvent).detail.to));
    await act(async () => fireEvent.click(radio("MUI")));
    await act(async () => fireEvent.click(radio("Chakra")));
    await act(async () => releases[0]!());
    expect(root.getAttribute("data-current")).toBe("fallback");
    await act(async () => releases[1]!());
    expect(root.getAttribute("data-current")).toBe("chakra");
    expect(after).toEqual(["chakra"]);
  });

  it("labels the segments in Arabic on Arabic pages", async () => {
    render(<SwapDemo lang="ar" messages={swapMessages("ar")} sources={sources} />);
    // The Arabic locale pack loads lazily, so the first client render waits for it.
    expect(await screen.findByRole("radio", { name: t("ar", "swap.fallback") })).toBeTruthy();
    expect(screen.getByRole("radiogroup").getAttribute("aria-label")).toBe(t("ar", "swap.label"));
  });

  it("keeps design-system code and the message catalogs out of its first load", () => {
    const source = readFileSync(resolve(process.cwd(), "src/islands/SwapDemo.tsx"), "utf8");
    const staticImports = [...source.matchAll(/^import (?!type )[^;]*from ["']([^"']+)["']/gm)].map((match) => match[1]);
    expect(staticImports.filter((path) => /@mui|@chakra-ui|antd|@ant-design|swap-(shadcn|mui|chakra|antd)|provider|^@\/i18n$/.test(path!))).toEqual([]);
  });
});

describe("retryable", () => {
  it("loads again after a failure that names no module URL", async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce("loaded");
    const again = retryable(load);
    await expect(again()).rejects.toThrow("offline");
    await expect(again()).resolves.toBe("loaded");
    expect(load).toHaveBeenCalledTimes(2);
  });
});
