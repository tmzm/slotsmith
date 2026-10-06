import { beforeAll, describe, expect, it } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
// jsdom ships no types (it is a dev dependency of the docs).
// @ts-expect-error -- untyped module
import { JSDOM } from "jsdom";
import Tabs from "@/components/Tabs.astro";

const INSTALL_TABS = [
  { label: "npm", sample: "install/npm" },
  { label: "pnpm", sample: "install/pnpm" },
  { label: "yarn", sample: "install/yarn" },
  { label: "bun", sample: "install/bun" },
];

let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create();
});

/**
 * The tabs as a page shows them, their script run: under an MDX heading whose
 * slug equals the tabs' id, as `## Install` over `<Tabs id="install">` does.
 */
async function page(before = '<h2 id="install">Install</h2>') {
  const tabs = await container.renderToString(Tabs, { props: { id: "install", tabs: INSTALL_TABS, remember: "pm" } });
  const dom = new JSDOM(`<!doctype html><html><body>${before}${tabs}</body></html>`, {
    runScripts: "dangerously",
    url: "http://localhost/getting-started/",
  });
  const document = dom.window.document as Document;
  const tabList = () => [...document.querySelectorAll<HTMLElement>('[role="tab"]')];
  const shown = () =>
    [...document.querySelectorAll<HTMLElement>('[role="tabpanel"]')].flatMap((panel, index) => (panel.hidden ? [] : [INSTALL_TABS[index]!.label]));
  const selected = () => tabList().flatMap((tab) => (tab.getAttribute("aria-selected") === "true" ? [tab.textContent?.trim()] : []));
  const key = (tab: HTMLElement, name: string) =>
    tab.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: name, bubbles: true, cancelable: true }));
  return { document, tabList, shown, selected, key };
}

describe("Tabs script", () => {
  it("switches panels on click when a heading has the same id", async () => {
    const { tabList, shown, selected } = await page();
    tabList()[1]!.click();
    expect(selected()).toEqual(["pnpm"]);
    expect(shown()).toEqual(["pnpm"]);
  });

  it("moves with the arrow keys and jumps with Home and End, wrapping at the ends", async () => {
    const { document, tabList, shown, key } = await page();
    const tabs = tabList();
    key(tabs[0]!, "ArrowRight");
    expect(shown()).toEqual(["pnpm"]);
    expect(document.activeElement).toBe(tabs[1]);
    key(tabs[1]!, "End");
    expect(shown()).toEqual(["bun"]);
    key(tabs[3]!, "ArrowRight");
    expect(shown()).toEqual(["npm"]);
    key(tabs[0]!, "ArrowLeft");
    expect(shown()).toEqual(["bun"]);
    key(tabs[3]!, "Home");
    expect(shown()).toEqual(["npm"]);
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1, -1]);
  });

  it("remembers the choice for the next page", async () => {
    const first = await page();
    first.tabList()[2]!.click();
    expect(first.document.defaultView!.localStorage.getItem("slotsmith-tab-pm")).toBe("yarn");
  });

  it("leaves the page's own element with the same id alone", async () => {
    const { document, tabList } = await page();
    tabList()[1]!.click();
    expect(document.querySelectorAll("#install")).toHaveLength(1);
    expect(document.getElementById("install")?.tagName).toBe("H2");
  });
});

describe("Tabs copy button", () => {
  /** The tabs with their copy button, on a page whose clipboard write resolves or rejects. */
  async function withClipboard(writeText: (text: string) => Promise<void>) {
    const tabs = await container.renderToString(Tabs, { props: { id: "install", tabs: INSTALL_TABS, lang: "en" } });
    const dom = new JSDOM(`<!doctype html><html><body>${tabs}</body></html>`, { runScripts: "dangerously", url: "http://localhost/" });
    Object.defineProperty(dom.window.navigator, "clipboard", { value: { writeText }, configurable: true });
    const document = dom.window.document as Document;
    const button = document.querySelector<HTMLElement>("[data-tabs-copy]")!;
    const status = document.querySelector<HTMLElement>('[role="status"]')!;
    const settle = () => new Promise((done) => setTimeout(done, 0));
    return { button, status, settle };
  }

  it("says the shown panel was copied, in the button and in the status region", async () => {
    const written: string[] = [];
    const { button, status, settle } = await withClipboard(async (text) => void written.push(text));
    button.click();
    await settle();
    expect(written).toHaveLength(1);
    expect(written[0]).toContain("npm");
    expect(button.textContent?.trim()).toBe("Copied");
    expect(status.textContent).toBe("Copied");
    expect(button.hasAttribute("data-failed")).toBe(false);
  });

  it("says so when the clipboard write fails", async () => {
    const { button, status, settle } = await withClipboard(() => Promise.reject(new Error("denied")));
    button.click();
    await settle();
    expect(button.textContent?.trim()).toBe("Could not copy");
    expect(status.textContent).toBe("Could not copy");
    expect(button.hasAttribute("data-failed")).toBe(true);
    expect(button.hasAttribute("data-copied")).toBe(false);
  });
});

describe("Tabs without JavaScript", () => {
  it("writes the noscript rules once for a page with several tabs", async () => {
    const locals = {};
    const first = await container.renderToString(Tabs, { locals, props: { id: "one", tabs: INSTALL_TABS } });
    const second = await container.renderToString(Tabs, { locals, props: { id: "two", tabs: INSTALL_TABS } });
    expect(first.match(/<noscript>/g)).toHaveLength(1);
    expect(second).not.toContain("<noscript>");
    // Each still brings its own script, and that script still finds its own tabs.
    const dom = new JSDOM(`<!doctype html><html><body>${first}${second}</body></html>`, { runScripts: "dangerously", url: "http://localhost/" });
    const document = dom.window.document as Document;
    document.querySelector<HTMLElement>("#two-tab-1")!.click();
    expect(document.getElementById("two-panel-1")!.hidden).toBe(false);
    expect(document.getElementById("one-panel-1")!.hidden).toBe(true);
  });
});
