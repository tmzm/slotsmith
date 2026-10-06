// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { isSearchShortcut, type ShortcutEvent } from "@/lib/search";

const press = (key: string, more: Partial<ShortcutEvent> = {}) =>
  isSearchShortcut({ key, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, repeat: false, defaultPrevented: false, target: document.body, ...more });

/** An element built from HTML, in the page; `inner` picks a descendant to return instead. */
function element(html: string, inner?: string): Element {
  document.body.innerHTML = html;
  const root = document.body.firstElementChild!;
  return inner ? root.querySelector(inner)! : root;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("isSearchShortcut", () => {
  it("accepts Ctrl+K and ⌘K in either case, and a bare slash", () => {
    expect(press("k", { ctrlKey: true })).toBe(true);
    expect(press("K", { metaKey: true })).toBe(true);
    expect(press("/")).toBe(true);
  });

  it("accepts Ctrl+K from inside a text field", () => {
    expect(press("k", { ctrlKey: true, target: element("<input>") })).toBe(true);
  });

  it("rejects a bare K, Ctrl+slash, and the chord with Alt or with Shift (a browser console shortcut)", () => {
    expect(press("k")).toBe(false);
    expect(press("/", { ctrlKey: true })).toBe(false);
    expect(press("k", { ctrlKey: true, altKey: true })).toBe(false);
    expect(press("K", { ctrlKey: true, shiftKey: true })).toBe(false);
  });

  it("rejects a key that is repeating", () => {
    expect(press("k", { ctrlKey: true, repeat: true })).toBe(false);
    expect(press("/", { repeat: true })).toBe(false);
  });

  it("rejects a slash something on the page already handled", () => {
    expect(press("/", { defaultPrevented: true })).toBe(false);
  });

  it("rejects a slash typed into an input, a textarea, a select or editable text", () => {
    expect(press("/", { target: element("<input>") })).toBe(false);
    expect(press("/", { target: element("<textarea></textarea>") })).toBe(false);
    expect(press("/", { target: element("<select></select>") })).toBe(false);
    expect(press("/", { target: element('<div contenteditable="true"><b>x</b></div>', "b") })).toBe(false);
  });

  it("rejects a slash pressed on a widget that takes typed characters, or anywhere in a demo", () => {
    expect(press("/", { target: element('<div role="combobox" tabindex="0"></div>') })).toBe(false);
    expect(press("/", { target: element('<ul role="listbox"><li role="option" tabindex="0">x</li></ul>', "li") })).toBe(false);
    expect(press("/", { target: element('<div role="textbox" tabindex="0"></div>') })).toBe(false);
    expect(press("/", { target: element('<div role="searchbox" tabindex="0"></div>') })).toBe(false);
    expect(press("/", { target: element('<figure data-sample="data-table/quick-start"><button>Sort</button></figure>', "button") })).toBe(false);
  });

  it("accepts a slash pressed on a button or a link outside a demo", () => {
    expect(press("/", { target: element("<button>Menu</button>") })).toBe(true);
    expect(press("/", { target: element('<a href="/theming/">Theming</a>') })).toBe(true);
  });
});
