import { describe, expect, it } from "vitest";
import { popupLayout, VIEWPORT_PADDING, type PopupLayoutInput } from "../position";

/** A 200 x 32 trigger at (100, 100) in a 1000 x 800 viewport, with a 240 x 300 popup. */
const input = (overrides: Partial<PopupLayoutInput> = {}): PopupLayoutInput => ({
  trigger: { top: 100, left: 100, width: 200, height: 32 },
  popup: { width: 240, height: 300 },
  viewport: { width: 1000, height: 800 },
  placement: "bottom",
  offset: 4,
  matchTriggerWidth: true,
  maxHeight: 320,
  rtl: false,
  ...overrides,
});

describe("popupLayout", () => {
  it("sits under the trigger, as wide as it, capped to the room below", () => {
    const layout = popupLayout(input());
    expect(layout).toMatchObject({ side: "bottom", top: 136, left: 100, width: 200 });
    expect(layout.maxHeight).toBe(320);
  });

  it("flips above when the room below is short and above has more", () => {
    const layout = popupLayout(input({ trigger: { top: 600, left: 100, width: 200, height: 32 } }));
    expect(layout.side).toBe("top");
    expect(layout.top).toBe(600 - 4 - 300);
  });

  it("stays below when neither side fits but below has more room, and caps the height", () => {
    const layout = popupLayout(input({ trigger: { top: 200, left: 100, width: 200, height: 32 }, viewport: { width: 1000, height: 500 } }));
    expect(layout.side).toBe("bottom");
    expect(layout.maxHeight).toBe(500 - 232 - 4 - VIEWPORT_PADDING);
  });

  it("honours a preference for the top while it fits", () => {
    const layout = popupLayout(input({ placement: "top", trigger: { top: 500, left: 100, width: 200, height: 32 } }));
    expect(layout).toMatchObject({ side: "top", top: 500 - 4 - 300 });
  });

  it("is at least as wide as the trigger when it does not match it", () => {
    expect(popupLayout(input({ matchTriggerWidth: false }))).toMatchObject({ minWidth: 200, left: 100 });
  });

  it("lines up with the trigger's right edge right to left, and stays inside the viewport", () => {
    expect(popupLayout(input({ matchTriggerWidth: false, rtl: true })).left).toBe(100 + 200 - 240);
    expect(popupLayout(input({ trigger: { top: 100, left: 900, width: 200, height: 32 } })).left).toBe(1000 - VIEWPORT_PADDING - 200);
    expect(popupLayout(input({ trigger: { top: 100, left: -50, width: 200, height: 32 } })).left).toBe(VIEWPORT_PADDING);
  });
});
