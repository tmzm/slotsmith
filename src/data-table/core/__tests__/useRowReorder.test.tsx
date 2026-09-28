import { act, fireEvent, render, renderHook } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VirtualDataTable } from "../../virtual";
import type { DataTableColumnDef } from "../features";
import type { RowOrderChange } from "../reorder";
import { defaultReorderLabels } from "../reorderLabels";
import { resetReorderWarnings, useDataTable } from "../useDataTable";
import { useRowReorder, type RowReorderModel } from "../useRowReorder";

type Item = { id: string };
const items = (ids: string) => ids.split("").map((id) => ({ id }));
const ids = (data: readonly Item[]) => data.map((item) => item.id).join("");

const ROW_HEIGHT = 40;
const TRANSITION = "transform 180ms cubic-bezier(0.2, 0, 0, 1)";

/**
 * The drawn offset of a row
 *
 * jsdom has no layout, so a row's box is its place among its siblings plus
 * whatever `translate3d` the engine wrote on it, as a browser would draw it.
 */
const drawnOffset = (element: HTMLElement) => {
  const match = /translate3d\(0(?:px)?, (-?[\d.]+)px/.exec(element.style.transform);
  return match ? Number(match[1]) : 0;
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame"] });
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    let top = 0;
    let height = 0;
    if (this instanceof HTMLElement && this.hasAttribute("data-row-id") && this.parentElement) {
      const siblings = Array.from(this.parentElement.querySelectorAll(":scope > [data-row-id]"));
      top = siblings.indexOf(this) * ROW_HEIGHT + drawnOffset(this);
      height = ROW_HEIGHT;
    }
    return { top, bottom: top + height, height, left: 0, right: 100, width: 100, x: 0, y: top, toJSON: () => ({}) };
  });
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => true);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete (window as { matchMedia?: unknown }).matchMedia;
  resetReorderWarnings();
});

interface HarnessProps {
  data: Item[];
  /** The order shown, when it differs from `data`. */
  view?: string[];
  enabled?: boolean;
  onRowOrderChange?: (change: RowOrderChange<Item>) => void;
  /** Gives each row a new key whenever the order of `data` changes, as a table that re-creates its rows would. */
  remount?: boolean;
  /** Added to every row key: changing it re-creates every row. */
  keySuffix?: string;
  model: { current: RowReorderModel | null };
  rowStyle?: Record<string, string>;
}

function Harness({ data, view, enabled = true, onRowOrderChange, remount, keySuffix = "", model, rowStyle }: HarnessProps) {
  const visibleIds = view ?? data.map((item) => item.id);
  const reorder = useRowReorder({
    enabled,
    visibleIds,
    rows: data.map((item) => ({ id: item.id, original: item })),
    labels: defaultReorderLabels,
    onRowOrderChange,
  });
  model.current = reorder;
  return (
    <table>
      <tbody>
        {visibleIds.map((id) => (
          <tr key={(remount ? `${id}-${ids(data)}` : id) + keySuffix} {...reorder.getRowProps(id)} style={rowStyle?.[id] ? { transform: rowStyle[id] } : undefined}>
            <td>
              <button type="button" {...reorder.getHandleProps(id)}>
                {id}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** A harness that stores the new order, the way an app does. */
function Stateful(props: Omit<HarnessProps, "data"> & { initial: Item[] }) {
  const { initial, onRowOrderChange, ...rest } = props;
  const [data, setData] = useState(initial);
  return (
    <Harness
      {...rest}
      data={data}
      onRowOrderChange={(change) => {
        onRowOrderChange?.(change);
        setData(change.data);
      }}
    />
  );
}

function setup(props: Partial<Omit<HarnessProps, "model">> & { stateful?: boolean } = {}) {
  const model: { current: RowReorderModel | null } = { current: null };
  const onRowOrderChange = vi.fn<(change: RowOrderChange<Item>) => void>();
  const { stateful = true, data = items("abcd"), ...rest } = props;
  const utils = render(
    stateful ? (
      <Stateful initial={data} onRowOrderChange={onRowOrderChange} model={model} {...rest} />
    ) : (
      <Harness data={data} onRowOrderChange={onRowOrderChange} model={model} {...rest} />
    ),
  );
  const row = (id: string) => utils.container.querySelector<HTMLElement>(`[data-row-id="${id}"]`)!;
  const handle = (id: string) => row(id).querySelector("button")!;
  const allRows = () => Array.from(utils.container.querySelectorAll<HTMLElement>("[data-row-id]"));
  return { ...utils, model, onRowOrderChange, row, handle, allRows };
}

const frame = () => act(() => void vi.advanceTimersByTime(16));
const settleTimer = () => act(() => void vi.advanceTimersByTime(250));

function pointerDrag(handle: HTMLElement, from: number, to: number) {
  fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientY: from });
  fireEvent.pointerMove(handle, { pointerId: 1, clientY: to });
  frame();
}

const key = (element: HTMLElement, name: string) => fireEvent.keyDown(element, { key: name });

/**
 * Auto-scroll steps a little every frame. A page with `scroll-behavior:
 * smooth` would turn each step into an animation that the next step restarts,
 * so the view crawls; every step must ask for an instant scroll.
 */
describe("useRowReorder, auto-scroll", () => {
  it("scrolls the window instantly near its bottom edge", () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const scrollHeight = vi.spyOn(document.documentElement, "scrollHeight", "get").mockReturnValue(5000);
    const { handle } = setup();
    fireEvent.pointerDown(handle("a"), { button: 0, pointerId: 1, clientY: 20 });
    fireEvent.pointerMove(handle("a"), { pointerId: 1, clientY: window.innerHeight - 2 });
    frame();

    expect(scrollTo).toHaveBeenCalledWith({ top: expect.any(Number), behavior: "instant" });
    expect(scrollTo.mock.calls.at(-1)![0]).toMatchObject({ top: expect.toSatisfy((top: number) => top > 0) });
    fireEvent.pointerCancel(handle("a"), { pointerId: 1 });
    scrollHeight.mockRestore();
  });

  it("falls back to a plain scroll where behavior: instant throws, and keeps dragging", () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(((options: unknown) => {
      if (typeof options === "object") throw new TypeError("The provided value 'instant' is not a valid enum value");
    }) as typeof window.scrollTo);
    const scrollHeight = vi.spyOn(document.documentElement, "scrollHeight", "get").mockReturnValue(5000);
    const { handle, row } = setup();
    fireEvent.pointerDown(handle("a"), { button: 0, pointerId: 1, clientY: 20 });
    fireEvent.pointerMove(handle("a"), { pointerId: 1, clientY: window.innerHeight - 2 });
    frame();
    frame();

    expect(scrollTo).toHaveBeenCalledWith(expect.any(Number), expect.any(Number));
    expect(row("a")).toHaveAttribute("data-dragging", "");
    fireEvent.pointerCancel(handle("a"), { pointerId: 1 });
    scrollHeight.mockRestore();
  });

  it("scrolls a scroll area instantly near its bottom edge", () => {
    const { handle, container } = setup();
    container.style.overflowY = "auto";
    vi.spyOn(container, "scrollHeight", "get").mockReturnValue(2000);
    vi.spyOn(container, "clientHeight", "get").mockReturnValue(100);
    const scrollTo = vi.fn();
    container.scrollTo = scrollTo as typeof container.scrollTo;

    fireEvent.pointerDown(handle("a"), { button: 0, pointerId: 1, clientY: 20 });
    fireEvent.pointerMove(handle("a"), { pointerId: 1, clientY: 200 });
    frame();

    expect(scrollTo).toHaveBeenCalledWith({ top: expect.toSatisfy((top: number) => top > 0), behavior: "instant" });
    fireEvent.pointerCancel(handle("a"), { pointerId: 1 });
  });
});

describe("useRowReorder, pointer", () => {
  it("drops after the target in the lower half of a row", () => {
    const { handle, onRowOrderChange } = setup();
    pointerDrag(handle("a"), 20, 110);
    fireEvent.pointerUp(handle("a"), { pointerId: 1, clientY: 110 });

    expect(onRowOrderChange).toHaveBeenCalledTimes(1);
    const change = onRowOrderChange.mock.calls[0]![0];
    expect(ids(change.data)).toBe("bcad");
    expect(change).toMatchObject({ rowId: "a", targetId: "c", position: "after", row: { id: "a" }, target: { id: "c" } });
  });

  it("drops before the target in the upper half of a row", () => {
    const { handle, onRowOrderChange } = setup();
    pointerDrag(handle("a"), 20, 95);
    fireEvent.pointerUp(handle("a"), { pointerId: 1, clientY: 95 });

    const change = onRowOrderChange.mock.calls[0]![0];
    expect(ids(change.data)).toBe("bacd");
    expect(change).toMatchObject({ targetId: "c", position: "before" });
  });

  it("does not report a drop within the row's own place", () => {
    const { handle, onRowOrderChange } = setup();
    pointerDrag(handle("a"), 20, 30);
    fireEvent.pointerUp(handle("a"), { pointerId: 1, clientY: 30 });
    expect(onRowOrderChange).not.toHaveBeenCalled();
  });

  it("cancels on pointercancel", () => {
    const { handle, onRowOrderChange, allRows, model } = setup();
    pointerDrag(handle("a"), 20, 110);
    fireEvent.pointerCancel(handle("a"), { pointerId: 1 });

    expect(onRowOrderChange).not.toHaveBeenCalled();
    for (const row of allRows()) {
      expect(row).not.toHaveAttribute("data-dragging");
      expect(row).not.toHaveAttribute("data-drop-position");
    }
    expect(model.current!.draggingId).toBeNull();
  });

  it("cancels on lostpointercapture", () => {
    const { handle, onRowOrderChange, model } = setup();
    pointerDrag(handle("a"), 20, 110);
    fireEvent(handle("a"), new PointerEvent("lostpointercapture", { pointerId: 1, bubbles: true }));
    fireEvent.pointerUp(handle("a"), { pointerId: 1, clientY: 110 });

    expect(onRowOrderChange).not.toHaveBeenCalled();
    expect(model.current!.draggingId).toBeNull();
  });

  it("cancels when the window loses focus", () => {
    const { handle, onRowOrderChange, model } = setup();
    pointerDrag(handle("a"), 20, 110);
    fireEvent.blur(window);
    fireEvent.pointerUp(handle("a"), { pointerId: 1, clientY: 110 });

    expect(onRowOrderChange).not.toHaveBeenCalled();
    expect(model.current).toMatchObject({ draggingId: null, target: null });
  });

  it("cancels when the dragged row leaves the data", () => {
    const model: { current: RowReorderModel | null } = { current: null };
    const onRowOrderChange = vi.fn();
    const { container, rerender } = render(<Harness data={items("abcd")} model={model} onRowOrderChange={onRowOrderChange} />);
    const handleA = container.querySelector<HTMLElement>('[data-row-id="a"] button')!;
    pointerDrag(handleA, 20, 110);

    rerender(<Harness data={items("bcd")} model={model} onRowOrderChange={onRowOrderChange} />);
    fireEvent.pointerUp(handleA, { pointerId: 1, clientY: 110 });

    expect(model.current).toMatchObject({ draggingId: null, target: null });
    expect(onRowOrderChange).not.toHaveBeenCalled();
    for (const row of Array.from(container.querySelectorAll<HTMLElement>("[data-row-id]"))) {
      expect(row).not.toHaveAttribute("data-drop-position");
      expect(row.style.transform).toBe("");
    }
  });

  describe("a release off the rows cancels", () => {
    const cases: [string, number, number][] = [
      ["below the table", 5000, 0],
      ["above the table", -500, 0],
      ["beside the table", 150, 500],
    ];
    it.each(cases)("%s", (_, y, x) => {
      const { handle, onRowOrderChange, allRows, model } = setup();
      fireEvent.pointerDown(handle("b"), { button: 0, pointerId: 1, clientY: 60, clientX: 10 });
      fireEvent.pointerMove(handle("b"), { pointerId: 1, clientY: y, clientX: x });
      frame();
      fireEvent.pointerUp(handle("b"), { pointerId: 1, clientY: y, clientX: x });

      expect(onRowOrderChange).not.toHaveBeenCalled();
      expect(model.current).toMatchObject({ draggingId: null, target: null });
      settleTimer();
      for (const row of allRows()) {
        expect(row).not.toHaveAttribute("data-dragging");
        expect(row).not.toHaveAttribute("data-drop-position");
        expect(row.style.transform).toBe("");
        expect(row.style.transition).toBe("");
      }
    });
  });

  it("ends the drag when its handle is re-created, and a new drag can start", () => {
    const model: { current: RowReorderModel | null } = { current: null };
    const onRowOrderChange = vi.fn();
    const { container, rerender } = render(<Harness data={items("abcd")} model={model} onRowOrderChange={onRowOrderChange} />);
    const handleOf = (id: string) => container.querySelector<HTMLElement>(`[data-row-id="${id}"] button`)!;
    pointerDrag(handleOf("a"), 20, 110);

    rerender(<Harness data={items("abcd")} model={model} onRowOrderChange={onRowOrderChange} keySuffix="-new" />);
    fireEvent.pointerUp(window, { pointerId: 1, clientY: 110 });
    settleTimer();

    expect(onRowOrderChange).not.toHaveBeenCalled();
    expect(model.current).toMatchObject({ draggingId: null, target: null });
    for (const row of Array.from(container.querySelectorAll<HTMLElement>("[data-row-id]"))) {
      expect(row).not.toHaveAttribute("data-dragging");
      expect(row.style.transform).toBe("");
    }

    pointerDrag(handleOf("a"), 20, 110);
    expect(model.current!.draggingId).toBe("a");
    fireEvent.pointerUp(handleOf("a"), { pointerId: 1, clientY: 110 });
    expect(onRowOrderChange).toHaveBeenCalledTimes(1);
  });

  it("follows a pointer released away from the handle", () => {
    const { handle, onRowOrderChange } = setup();
    pointerDrag(handle("a"), 20, 110);
    fireEvent.pointerUp(document.body, { pointerId: 1, clientY: 110 });
    expect(onRowOrderChange).toHaveBeenCalledTimes(1);
  });

  it("cancels when the rows change mid-drag, even with the dragged row kept", () => {
    const model: { current: RowReorderModel | null } = { current: null };
    const onRowOrderChange = vi.fn();
    const { container, rerender } = render(<Harness data={items("abcd")} model={model} onRowOrderChange={onRowOrderChange} />);
    const handleB = container.querySelector<HTMLElement>('[data-row-id="b"] button')!;
    pointerDrag(handleB, 60, 150);

    rerender(<Harness data={items("xabcd")} model={model} onRowOrderChange={onRowOrderChange} />);
    fireEvent.pointerUp(handleB, { pointerId: 1, clientY: 150 });
    settleTimer();

    expect(onRowOrderChange).not.toHaveBeenCalled();
    expect(model.current).toMatchObject({ draggingId: null, target: null });
    for (const row of Array.from(container.querySelectorAll<HTMLElement>("[data-row-id]"))) {
      expect(row).not.toHaveAttribute("data-dragging");
      expect(row).not.toHaveAttribute("data-drop-position");
      expect(row.style.transform).toBe("");
      expect(row.style.transition).toBe("");
    }
  });

  it("keeps the drag through a render that changes nothing", () => {
    const { handle, model, rerender, onRowOrderChange } = setup({ stateful: false });
    pointerDrag(handle("a"), 20, 110);
    rerender(<Harness data={items("abcd")} model={model} onRowOrderChange={onRowOrderChange} />);
    expect(model.current!.draggingId).toBe("a");
  });

  it("ignores the secondary button", () => {
    const { handle, model } = setup();
    fireEvent.pointerDown(handle("a"), { button: 2, pointerId: 1, clientY: 20 });
    expect(model.current!.draggingId).toBeNull();
    expect(HTMLElement.prototype.setPointerCapture).not.toHaveBeenCalled();
  });

  it("marks the dragged row and the target row", () => {
    const { handle, row, model } = setup();
    pointerDrag(handle("a"), 20, 110);

    expect(row("a")).toHaveAttribute("data-dragging", "");
    expect(handle("a")).toHaveAttribute("data-dragging", "");
    expect(row("c")).toHaveAttribute("data-drop-position", "after");
    expect(row("b")).not.toHaveAttribute("data-drop-position");
    expect(model.current).toMatchObject({ draggingId: "a", target: { id: "c", position: "after" } });
    expect(HTMLElement.prototype.setPointerCapture).toHaveBeenCalledWith(1);
  });

  it("moves the dragged row with the pointer and slides the rows it passes", () => {
    const { handle, row } = setup();
    pointerDrag(handle("a"), 20, 110);

    expect(row("a").style.transform).toBe("translate3d(0, 90px, 0)");
    expect(row("a").style.transition).not.toContain("transform");
    expect(row("b").style.transform).toBe("translate3d(0, -40px, 0)");
    expect(row("b").style.transition).toBe(TRANSITION);
    expect(row("c").style.transform).toBe("translate3d(0, -40px, 0)");
    expect(row("c").style.transition).toBe(TRANSITION);
    expect(row("d").style.transform).toBe("");
  });

  it("keeps the dragged row between the first and the last row", () => {
    const { handle, row } = setup();
    pointerDrag(handle("b"), 60, -500);
    expect(row("b").style.transform).toBe("translate3d(0, -40px, 0)");

    fireEvent.pointerMove(handle("b"), { pointerId: 1, clientY: 2000 });
    frame();
    expect(row("b").style.transform).toBe("translate3d(0, 80px, 0)");
  });

  it("announces the lift and the drop", () => {
    const { handle, model } = setup();
    fireEvent.pointerDown(handle("a"), { button: 0, pointerId: 1, clientY: 20 });
    expect(model.current!.announcement).toBe("Row lifted. Position 1 of 4.");
    fireEvent.pointerMove(handle("a"), { pointerId: 1, clientY: 110 });
    expect(model.current!.announcement).toBe("Position 3 of 4.");
    fireEvent.pointerUp(handle("a"), { pointerId: 1, clientY: 110 });
    expect(model.current!.announcement).toBe("Row dropped at position 3 of 4.");
  });
});

describe("useRowReorder, motion", () => {
  const clean = (rows: HTMLElement[]) => {
    for (const row of rows) {
      expect(row.style.transform).toBe("");
      expect(row.style.transition).toBe("");
    }
  };

  it("leaves no inline style once a drop has settled", () => {
    const { handle, allRows, row } = setup();
    pointerDrag(handle("a"), 20, 110);
    fireEvent.pointerUp(handle("a"), { pointerId: 1, clientY: 110 });

    // The moved row was drawn at 90 and now rests at 80: it glides the last 10px.
    expect(row("a").style.transition).toBe(TRANSITION);
    settleTimer();
    clean(allRows());
  });

  it("slides the rows back on cancel, then leaves no inline style", () => {
    const { handle, allRows, row } = setup();
    pointerDrag(handle("a"), 20, 110);
    fireEvent.pointerCancel(handle("a"), { pointerId: 1 });

    expect(row("b").style.transition).toBe(TRANSITION);
    settleTimer();
    clean(allRows());
  });

  it("slides the rows back when the app keeps the order", () => {
    const { handle, allRows, onRowOrderChange } = setup({ stateful: false });
    pointerDrag(handle("a"), 20, 110);
    fireEvent.pointerUp(handle("a"), { pointerId: 1, clientY: 110 });

    expect(onRowOrderChange).toHaveBeenCalledTimes(1);
    settleTimer();
    clean(allRows());
  });

  it("removes the inline transition on transitionend", () => {
    const { handle, row } = setup();
    pointerDrag(handle("a"), 20, 110);
    fireEvent.pointerUp(handle("a"), { pointerId: 1, clientY: 110 });

    const event = new Event("transitionend", { bubbles: true });
    Object.assign(event, { propertyName: "transform" });
    fireEvent(row("a"), event);
    expect(row("a").style.transition).toBe("");
  });

  it("leaves no inline style after an unmount", () => {
    const { handle, allRows, unmount } = setup();
    pointerDrag(handle("a"), 20, 110);
    const rows = allRows();
    unmount();
    settleTimer();
    clean(rows);
  });

  it("gives a row its own inline transform back", () => {
    const { handle, row } = setup({ rowStyle: { b: "translateX(3px)" } });
    pointerDrag(handle("a"), 20, 110);
    expect(row("b").style.transform).toBe("translate3d(0, -40px, 0)");
    fireEvent.pointerUp(handle("a"), { pointerId: 1, clientY: 110 });
    settleTimer();
    expect(row("b").style.transform).toBe("translateX(3px)");
  });

  it("writes no transform with reduced motion, but still marks the rows", () => {
    const matchMedia = vi.fn((query: string) => ({ matches: query === "(prefers-reduced-motion: reduce)" }));
    Object.assign(window, { matchMedia });
    const { handle, row, allRows } = setup();
    pointerDrag(handle("a"), 20, 110);

    expect(matchMedia).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
    expect(row("a")).toHaveAttribute("data-dragging", "");
    expect(row("c")).toHaveAttribute("data-drop-position", "after");
    clean(allRows());

    fireEvent.pointerUp(handle("a"), { pointerId: 1, clientY: 110 });
    clean(allRows());
  });

  it("animates without matchMedia", () => {
    expect(window.matchMedia).toBeUndefined();
    const { handle, row } = setup();
    pointerDrag(handle("a"), 20, 110);
    expect(row("a").style.transform).toBe("translate3d(0, 90px, 0)");
  });
});

describe("useRowReorder, keyboard", () => {
  it("moves the rows in steps, all with a transition", () => {
    const { handle, row } = setup();
    key(handle("a"), " ");
    key(handle("a"), "ArrowDown");

    expect(row("a").style.transform).toBe("translate3d(0, 40px, 0)");
    expect(row("a").style.transition).toBe(TRANSITION);
    expect(row("b").style.transform).toBe("translate3d(0, -40px, 0)");
    expect(row("b").style.transition).toBe(TRANSITION);
    expect(row("c").style.transform).toBe("");
  });

  it("drops with space", () => {
    const { handle, onRowOrderChange } = setup();
    key(handle("a"), " ");
    key(handle("a"), "ArrowDown");
    key(handle("a"), "ArrowDown");
    key(handle("a"), " ");

    expect(onRowOrderChange).toHaveBeenCalledTimes(1);
    expect(ids(onRowOrderChange.mock.calls[0]![0].data)).toBe("bcad");
  });

  it("lifts and drops with enter too", () => {
    const { handle, onRowOrderChange } = setup();
    key(handle("a"), "Enter");
    key(handle("a"), "ArrowDown");
    key(handle("a"), "Enter");
    expect(ids(onRowOrderChange.mock.calls[0]![0].data)).toBe("bacd");
  });

  it("cancels with escape", () => {
    const { handle, onRowOrderChange, model } = setup();
    key(handle("a"), " ");
    key(handle("a"), "ArrowDown");
    key(handle("a"), "Escape");

    expect(onRowOrderChange).not.toHaveBeenCalled();
    expect(model.current!.announcement).toBe("Reordering cancelled.");
    expect(model.current!.draggingId).toBeNull();
  });

  it("stays in place when the first row moves up", () => {
    const { handle, onRowOrderChange, model } = setup();
    key(handle("a"), " ");
    key(handle("a"), "ArrowUp");
    expect(model.current!.target).toBeNull();
    key(handle("a"), " ");
    expect(onRowOrderChange).not.toHaveBeenCalled();
  });

  it("does not report a row moved back to its own place", () => {
    const { handle, onRowOrderChange } = setup();
    key(handle("a"), " ");
    key(handle("a"), "ArrowDown");
    key(handle("a"), "ArrowUp");
    key(handle("a"), " ");
    expect(onRowOrderChange).not.toHaveBeenCalled();
  });

  it("announces each step", () => {
    const { handle, model } = setup();
    key(handle("a"), " ");
    expect(model.current!.announcement).toBe("Row lifted. Position 1 of 4.");
    key(handle("a"), "ArrowDown");
    expect(model.current!.announcement).toBe("Position 2 of 4.");
    key(handle("a"), " ");
    expect(model.current!.announcement).toBe("Row dropped at position 2 of 4.");
  });

  it("prevents the default of the keys it handles, and only those", () => {
    const { handle } = setup();
    expect(key(handle("a"), "ArrowDown")).toBe(true);
    expect(key(handle("a"), " ")).toBe(false);
    expect(key(handle("a"), "ArrowDown")).toBe(false);
    expect(key(handle("a"), "x")).toBe(true);
    expect(key(handle("a"), "Tab")).toBe(true);
  });

  it("cancels on tab and on blur", () => {
    const { handle, model, onRowOrderChange } = setup();
    key(handle("a"), " ");
    key(handle("a"), "ArrowDown");
    key(handle("a"), "Tab");
    expect(model.current!.draggingId).toBeNull();

    key(handle("a"), " ");
    key(handle("a"), "ArrowDown");
    fireEvent.blur(handle("a"));
    expect(model.current!.draggingId).toBeNull();
    expect(onRowOrderChange).not.toHaveBeenCalled();
  });

  it("scrolls the target row into view", () => {
    const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView");
    const { handle, row } = setup();
    key(handle("a"), " ");
    key(handle("a"), "ArrowDown");
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest" });
    expect(scrollIntoView.mock.contexts.at(-1)).toBe(row("b"));
  });

  it("marks the lifted handle as pressed", () => {
    const { handle } = setup();
    key(handle("a"), " ");
    expect(handle("a")).toHaveAttribute("aria-pressed", "true");
    expect(handle("b")).not.toHaveAttribute("aria-pressed");
  });

  it("gives focus back to the handle when the row is re-created", () => {
    const { handle } = setup({ remount: true });
    handle("a").focus();
    key(handle("a"), " ");
    key(handle("a"), "ArrowDown");
    key(handle("a"), " ");
    expect(document.activeElement).toBe(handle("a"));
  });
});

describe("useRowReorder, handle", () => {
  it("labels the handle and points it at the instructions", () => {
    const { handle, model } = setup();
    expect(handle("a")).toHaveAttribute("aria-label", "Reorder row");
    expect(model.current!.instructionsId).toBeTruthy();
    expect(handle("a")).toHaveAttribute("aria-describedby", model.current!.instructionsId);
  });

  it("does nothing when disabled", () => {
    const { handle, model, onRowOrderChange } = setup({ enabled: false });
    expect(handle("a")).toBeDisabled();
    fireEvent.pointerDown(handle("a"), { button: 0, pointerId: 1, clientY: 20 });
    expect(model.current!.draggingId).toBeNull();
    key(handle("a"), " ");
    expect(model.current!.draggingId).toBeNull();
    expect(onRowOrderChange).not.toHaveBeenCalled();
    expect(model.current!.enabled).toBe(false);
  });
});

describe("useRowReorder, in useDataTable", () => {
  const columns: DataTableColumnDef<Item>[] = [{ accessorKey: "id", header: "Id" }];

  function Table(props: {
    data: Item[];
    sort?: boolean;
    page?: number;
    onRowOrderChange: (change: RowOrderChange<Item>) => void;
  }) {
    const model = useDataTable<Item>({
      data: props.data,
      columns,
      enableRowReorder: true,
      onRowOrderChange: props.onRowOrderChange,
      defaultSorting: props.sort ? [{ id: "id", desc: true }] : [],
      defaultPagination: { pageIndex: props.page ?? 0, pageSize: 3 },
    });
    return (
      <table>
        <tbody>
          {model.table.getRowModel().rows.map((row) => (
            <tr key={row.id} {...model.reorder.getRowProps(row.id)}>
              <td>
                <button type="button" {...model.reorder.getHandleProps(row.id)}>
                  {row.id}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  const handleOf = (container: HTMLElement, id: string) =>
    container.querySelector<HTMLElement>(`[data-row-id="${id}"] button`)!;

  it("moves within data, not within a sorted view", () => {
    const onRowOrderChange = vi.fn();
    const { container } = render(<Table data={items("abcd")} sort onRowOrderChange={onRowOrderChange} />);
    // Sorted descending and paged by three: the view is d, c, b.
    const handle = handleOf(container, "d");
    key(handle, " ");
    key(handle, "ArrowDown");
    key(handle, "ArrowDown");
    key(handle, " ");

    const change = onRowOrderChange.mock.calls[0]![0] as RowOrderChange<Item>;
    expect(change).toMatchObject({ targetId: "b", position: "after" });
    expect(ids(change.data)).toBe("abdc");
  });

  it("uses indexes in data, not in the page", () => {
    const onRowOrderChange = vi.fn();
    const { container } = render(<Table data={items("abcdef")} page={1} onRowOrderChange={onRowOrderChange} />);
    const handle = handleOf(container, "d");
    key(handle, " ");
    key(handle, "ArrowDown");
    key(handle, " ");
    expect(ids((onRowOrderChange.mock.calls[0]![0] as RowOrderChange<Item>).data)).toBe("abcedf");
  });

  it("is off with a single row", () => {
    const { result } = renderHook(() => useDataTable<Item>({ data: items("a"), columns, enableRowReorder: true }));
    expect(result.current.reorder.enabled).toBe(false);
  });

  it("is off unless asked for", () => {
    const { result } = renderHook(() => useDataTable<Item>({ data: items("ab"), columns }));
    expect(result.current.reorder.enabled).toBe(false);
    const on = renderHook(() => useDataTable<Item>({ data: items("ab"), columns, enableRowReorder: true }));
    expect(on.result.current.reorder.enabled).toBe(true);
  });

  it("is off in a tree table, with one development warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { result, rerender } = renderHook(() =>
      useDataTable<Item>({ data: items("ab"), columns, enableRowReorder: true, getSubRows: () => undefined }),
    );
    rerender();
    expect(result.current.reorder.enabled).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toContain("enableRowReorder");
  });

  it("is off in a virtual table, with one development warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    const { container } = render(<VirtualDataTable<Item> data={items("abc")} columns={columns} enableRowReorder />);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toContain("VirtualDataTable");
    expect(container.querySelector("[data-dragging]")).toBeNull();
    vi.unstubAllGlobals();
  });

  it("does not warn when reordering is not asked for", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderHook(() => useDataTable<Item>({ data: items("ab"), columns, getSubRows: () => undefined }));
    expect(warn).not.toHaveBeenCalled();
  });
});
