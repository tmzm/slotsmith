// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import SearchDialog, { type SearchEngine } from "@/islands/SearchDialog";
import type { SearchPage } from "@/lib/search";
import { searchMessages } from "@/lib/search-messages";

const PAGES: SearchPage[] = [
  {
    url: "/components/data-table/guides/pagination/",
    excerpt: "Client and server <mark>pagination</mark>.",
    meta: { title: "Pagination", section: "Data table" },
    sub_results: [
      { title: "Pagination", url: "/components/data-table/guides/pagination/", excerpt: "top" },
      { title: "Page size", url: "/components/data-table/guides/pagination/#page-size", excerpt: "The <mark>pagination</mark> size." },
    ],
  },
  { url: "/theming/", excerpt: "Tokens for <mark>pagination</mark>.", meta: { title: "Theming", section: "Theming" } },
];

function engine(pages: SearchPage[] = PAGES): { load: () => Promise<SearchEngine>; search: ReturnType<typeof vi.fn> } {
  const search = vi.fn(async (query: string) => ({ results: (query === "nothing" ? [] : pages).map((page) => ({ data: async () => page })) }));
  const pagefind: SearchEngine = { options: async () => {}, init: async () => {}, debouncedSearch: search };
  return { load: vi.fn(async () => pagefind), search };
}

const messages = searchMessages("en");
const dialog = () => document.querySelector("dialog")!;
const input = () => within(dialog()).getByRole("combobox", { hidden: true });
const options = () => within(dialog()).getAllByRole("option", { hidden: true });

beforeAll(() => {
  // jsdom has no modal dialogs: enough of one to open, close and report `open`.
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});

afterEach(cleanup);

describe("SearchDialog", () => {
  it("stays closed and loads nothing until asked, then opens on the open-search event and loads the engine once", () => {
    const { load } = engine();
    render(<SearchDialog lang="en" messages={messages} load={load} />);
    expect(dialog().open).toBe(false);
    expect(load).not.toHaveBeenCalled();
    act(() => void window.dispatchEvent(new Event("open-search")));
    expect(dialog().open).toBe(true);
    act(() => void window.dispatchEvent(new Event("open-search")));
    expect(load).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(input());
  });

  it("opens on mount for the loader, toggles on Ctrl+K and opens on a slash typed outside a field", () => {
    render(<SearchDialog lang="en" messages={messages} load={engine().load} defaultOpen />);
    expect(dialog().open).toBe(true);
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(dialog().open).toBe(false);
    fireEvent.keyDown(document.body, { key: "/" });
    expect(dialog().open).toBe(true);
    // Typed into the search field, a slash is text.
    fireEvent.keyDown(input(), { key: "/" });
    expect(dialog().open).toBe(true);
  });

  it("lists results as links grouped by section, with headings nested, and names them for assistive tech", async () => {
    render(<SearchDialog lang="en" messages={messages} load={engine().load} defaultOpen />);
    expect(input().getAttribute("aria-expanded")).toBe("false");
    expect(input().hasAttribute("aria-controls")).toBe(false);
    fireEvent.change(input(), { target: { value: "pagination" } });
    await waitFor(() => expect(options()).toHaveLength(3));

    const list = within(dialog()).getByRole("listbox", { hidden: true });
    expect(input().getAttribute("aria-controls")).toBe(list.id);
    expect(input().getAttribute("aria-expanded")).toBe("true");
    const groups = within(list).getAllByRole("group", { hidden: true });
    expect(groups.map((group) => document.getElementById(group.getAttribute("aria-labelledby")!)!.textContent)).toEqual(["Data table", "Theming"]);
    expect(options().map((option) => option.getAttribute("href"))).toEqual([
      "/components/data-table/guides/pagination/",
      "/components/data-table/guides/pagination/#page-size",
      "/theming/",
    ]);
    expect(options()[0]!.querySelector("mark")!.textContent).toBe("pagination");
    expect(within(dialog()).getByRole("status", { hidden: true }).textContent).toBe("Results: 3");
  });

  it("moves the active row with the arrows, wrapping, and keeps focus in the field", async () => {
    render(<SearchDialog lang="en" messages={messages} load={engine().load} defaultOpen />);
    fireEvent.change(input(), { target: { value: "pagination" } });
    await waitFor(() => expect(options()).toHaveLength(3));
    const selected = () => options().findIndex((option) => option.getAttribute("aria-selected") === "true");
    expect(selected()).toBe(0);
    fireEvent.keyDown(input(), { key: "ArrowDown" });
    expect(selected()).toBe(1);
    expect(input().getAttribute("aria-activedescendant")).toBe(options()[1]!.id);
    fireEvent.keyDown(input(), { key: "ArrowUp" });
    fireEvent.keyDown(input(), { key: "ArrowUp" });
    expect(selected()).toBe(2);
    expect(document.activeElement).toBe(input());
  });

  it("follows the active row on Enter and closes", async () => {
    render(<SearchDialog lang="en" messages={messages} load={engine().load} defaultOpen />);
    fireEvent.change(input(), { target: { value: "pagination" } });
    await waitFor(() => expect(options()).toHaveLength(3));
    fireEvent.keyDown(input(), { key: "ArrowDown" });
    const followed: string[] = [];
    options()[1]!.addEventListener("click", (event) => {
      event.preventDefault();
      followed.push((event.currentTarget as HTMLAnchorElement).getAttribute("href")!);
    });
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(followed).toEqual(["/components/data-table/guides/pagination/#page-size"]);
    expect(dialog().open).toBe(false);
  });

  it("opens the active row in a new tab on Ctrl+Enter", async () => {
    const opened = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<SearchDialog lang="en" messages={messages} load={engine().load} defaultOpen />);
    fireEvent.change(input(), { target: { value: "pagination" } });
    await waitFor(() => expect(options()).toHaveLength(3));
    fireEvent.keyDown(input(), { key: "Enter", ctrlKey: true });
    expect(opened).toHaveBeenCalledWith("/components/data-table/guides/pagination/", "_blank", "noopener");
    expect(dialog().open).toBe(false);
    opened.mockRestore();
  });

  it("returns focus to the control that had it when the dialog closes", () => {
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();
    render(<SearchDialog lang="en" messages={messages} load={engine().load} />);
    act(() => void window.dispatchEvent(new Event("open-search")));
    expect(document.activeElement).toBe(input());
    act(() => {
      dialog().close();
      dialog().dispatchEvent(new Event("close"));
    });
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it("does not say it is searching when the answer comes quickly", async () => {
    render(<SearchDialog lang="en" messages={messages} load={engine().load} defaultOpen />);
    const said: string[] = [];
    const status = within(dialog()).getByRole("status", { hidden: true });
    const observer = new MutationObserver(() => said.push(status.textContent ?? ""));
    observer.observe(status, { childList: true, characterData: true, subtree: true });
    fireEvent.change(input(), { target: { value: "pagination" } });
    await waitFor(() => expect(options()).toHaveLength(3));
    observer.disconnect();
    expect(said).not.toContain(messages.loading);
    expect(status.getAttribute("data-query")).toBe("pagination");
  });

  it("keeps Tab inside the dialog, and closes from the Esc button", () => {
    render(<SearchDialog lang="en" messages={messages} load={engine().load} defaultOpen />);
    const closeButton = within(dialog()).getByRole("button", { name: "Close", hidden: true });
    closeButton.focus();
    fireEvent.keyDown(closeButton, { key: "Tab" });
    expect(document.activeElement).toBe(input());
    fireEvent.keyDown(input(), { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(closeButton);
    fireEvent.click(closeButton);
    expect(dialog().open).toBe(false);
  });

  it("says when a query has no results", async () => {
    render(<SearchDialog lang="en" messages={messages} load={engine().load} defaultOpen />);
    fireEvent.change(input(), { target: { value: "nothing" } });
    await waitFor(() => expect(within(dialog()).getByRole("status", { hidden: true }).textContent).toBe("No results for “nothing”."));
    expect(within(dialog()).queryByRole("listbox", { hidden: true })).toBeNull();
  });

  it("explains that the dev server has no index when the engine cannot load", async () => {
    const load = vi.fn(async (): Promise<SearchEngine> => {
      throw new Error("404");
    });
    render(<SearchDialog lang="en" messages={messages} load={load} defaultOpen />);
    // Tests run as a dev build, where the missing index is the expected cause.
    await waitFor(() => expect(within(dialog()).getByRole("status", { hidden: true }).textContent).toBe(messages.devOnly));
    fireEvent.change(input(), { target: { value: "pagination" } });
    await waitFor(() => expect(within(dialog()).getByRole("status", { hidden: true }).textContent).toBe(messages.devOnly));
  });

  it("renders Arabic text and marks result text to find its own direction", async () => {
    const ar = searchMessages("ar");
    render(<SearchDialog lang="ar" messages={ar} load={engine().load} defaultOpen />);
    expect(dialog().getAttribute("aria-label")).toBe(ar.title);
    fireEvent.change(input(), { target: { value: "pagination" } });
    await waitFor(() => expect(options()).toHaveLength(3));
    expect(options()[0]!.querySelector("[dir=auto]")).not.toBeNull();
  });
});
