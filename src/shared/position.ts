"use client";

import { useCallback, useEffect, useLayoutEffect, useState, type CSSProperties } from "react";

/**
 * Popup placement
 *
 * Which side of the trigger the popup prefers. It flips to the opposite side
 * when there is not enough room.
 */
export type PopupPlacement = "bottom" | "top";

/**
 * Popup position options
 *
 * How the popup is placed against the trigger.
 */
export interface UsePopupPositionOptions {
  /** Whether the popup is showing. Position is only tracked while it is. */
  open: boolean;
  /** Preferred side. Defaults to `bottom`. */
  placement?: PopupPlacement;
  /** Gap between the trigger and the popup, in pixels. Defaults to 4. */
  offset?: number;
  /** Make the popup exactly as wide as the trigger. Defaults to `true`. */
  matchTriggerWidth?: boolean;
  /** Upper bound on the popup's height, in pixels. Defaults to 320. */
  maxHeight?: number;
}

/**
 * Popup position
 *
 * The refs to attach and the style to apply.
 */
export interface PopupPosition {
  /** Attach to the element the popup is measured against. */
  setTrigger: (element: HTMLElement | null) => void;
  /** Attach to the popup element. */
  setPopup: (element: HTMLElement | null) => void;
  /**
   * The element the popup is placed against, once mounted. A slot that hands
   * the popup to a UI library's own popover anchors that popover here, and
   * leaves out `style`.
   */
  anchor: HTMLElement | null;
  /** Fixed positioning for the popup, with its width and its height cap. */
  style: CSSProperties;
  /** The side the popup ended up on, `bottom-start` or `top-start`, for transition origins. */
  placement: string;
}

/** A box on screen, in CSS pixels from the viewport's top left. */
export interface PopupRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Popup layout input
 *
 * Everything the placement depends on, measured.
 */
export interface PopupLayoutInput {
  /** The trigger's box. */
  trigger: PopupRect;
  /** The popup's natural size, before any height cap. */
  popup: { width: number; height: number };
  /** The viewport's size. */
  viewport: { width: number; height: number };
  placement: PopupPlacement;
  offset: number;
  matchTriggerWidth: boolean;
  maxHeight: number;
  /** Right to left: the popup lines up with the trigger's right edge. */
  rtl: boolean;
}

/** Where the popup goes, in viewport pixels. */
export interface PopupLayout {
  top: number;
  left: number;
  width?: number;
  minWidth?: number;
  maxHeight: number;
  side: PopupPlacement;
}

/** Breathing room kept between the popup and the viewport edge. */
export const VIEWPORT_PADDING = 8;

/**
 * Popup layout
 *
 * Places the popup against the trigger: on the preferred side unless the
 * other side has more of the room it needs, lined up with the trigger's
 * start edge, moved back inside the viewport, and capped to the height left
 * on its side.
 *
 * @param input - See {@link PopupLayoutInput}.
 * @returns See {@link PopupLayout}.
 */
export function popupLayout(input: PopupLayoutInput): PopupLayout {
  const { trigger, popup, viewport, offset, maxHeight, rtl } = input;
  const below = viewport.height - (trigger.top + trigger.height) - offset - VIEWPORT_PADDING;
  const above = trigger.top - offset - VIEWPORT_PADDING;
  const wanted = Math.min(popup.height, maxHeight);

  let side = input.placement;
  const room = side === "bottom" ? below : above;
  const other = side === "bottom" ? above : below;
  if (room < wanted && other > room) side = side === "bottom" ? "top" : "bottom";

  const cap = Math.max(0, Math.min(maxHeight, side === "bottom" ? below : above));
  const height = Math.min(wanted, cap);
  const top = side === "bottom" ? trigger.top + trigger.height + offset : trigger.top - offset - height;

  const width = input.matchTriggerWidth ? trigger.width : Math.max(popup.width, trigger.width);
  const start = rtl ? trigger.left + trigger.width - width : trigger.left;
  const limit = viewport.width - VIEWPORT_PADDING - width;
  const left = limit < VIEWPORT_PADDING ? VIEWPORT_PADDING : Math.min(Math.max(start, VIEWPORT_PADDING), limit);

  return {
    top,
    left,
    ...(input.matchTriggerWidth ? { width: trigger.width } : { minWidth: trigger.width }),
    maxHeight: cap,
    side,
  };
}

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Where an unplaced popup sits: fixed, at the origin, until the first measure. */
const INITIAL_STYLE: CSSProperties = { position: "fixed", top: 0, left: 0 };

/**
 * usePopupPosition
 *
 * Places the popup against the trigger: it flips when there is no room,
 * moves to stay on screen, matches or at least fills the trigger's width,
 * and caps its height to the space actually available. While open it
 * follows every scroll, resize and size change of either element.
 *
 * `position: fixed` escapes an ancestor's `overflow: hidden`, so the popup
 * works inside cards, drawers and scroll areas, and in a portal. An ancestor
 * with a `transform` or `filter` moves what `fixed` is measured from; the
 * popup measures where it landed and makes up the difference.
 *
 * @param options - See {@link UsePopupPositionOptions}.
 * @returns See {@link PopupPosition}.
 *
 * @example
 * ```tsx
 * const { setTrigger, setPopup, style } = usePopupPosition({ open });
 * return (
 *   <>
 *     <div ref={setTrigger} />
 *     {open ? <div ref={setPopup} style={style} /> : null}
 *   </>
 * );
 * ```
 */
export function usePopupPosition({
  open,
  placement = "bottom",
  offset = 4,
  matchTriggerWidth = true,
  maxHeight = 320,
}: UsePopupPositionOptions): PopupPosition {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [popup, setPopupElement] = useState<HTMLElement | null>(null);
  const [style, setStyle] = useState<CSSProperties>(INITIAL_STYLE);
  const [side, setSide] = useState<PopupPlacement>(placement);

  const setTrigger = useCallback((element: HTMLElement | null) => setAnchor(element), []);
  const setPopup = useCallback((element: HTMLElement | null) => setPopupElement(element), []);

  useIsomorphicLayoutEffect(() => {
    if (!open || !anchor || !popup) return;
    let frame = 0;

    const update = () => {
      frame = 0;
      const triggerBox = anchor.getBoundingClientRect();
      const popupBox = popup.getBoundingClientRect();
      const root = document.documentElement;
      const layout = popupLayout({
        trigger: { top: triggerBox.top, left: triggerBox.left, width: triggerBox.width, height: triggerBox.height },
        popup: { width: popupBox.width, height: Math.max(popupBox.height, popup.scrollHeight) },
        viewport: { width: root.clientWidth || window.innerWidth, height: window.innerHeight },
        placement,
        offset,
        matchTriggerWidth,
        maxHeight,
        rtl: getComputedStyle(popup).direction === "rtl",
      });

      // A transformed ancestor makes `fixed` relative to itself: the gap between where the popup was put and where it is.
      const placedTop = parseFloat(popup.style.top) || 0;
      const placedLeft = parseFloat(popup.style.left) || 0;
      const shiftTop = popup.style.position === "fixed" ? popupBox.top - placedTop : 0;
      const shiftLeft = popup.style.position === "fixed" ? popupBox.left - placedLeft : 0;

      const next: CSSProperties = {
        position: "fixed",
        top: Math.round(layout.top - shiftTop),
        left: Math.round(layout.left - shiftLeft),
        maxHeight: layout.maxHeight,
        ...(layout.width !== undefined ? { width: layout.width } : { minWidth: layout.minWidth }),
      };
      setStyle((previous) => (sameStyle(previous, next) ? previous : next));
      setSide(layout.side);
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    // Capture catches a scroll in any ancestor, not only the page.
    window.addEventListener("scroll", schedule, { capture: true, passive: true });
    window.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    observer?.observe(anchor);
    observer?.observe(popup);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      observer?.disconnect();
    };
  }, [open, anchor, popup, placement, offset, matchTriggerWidth, maxHeight]);

  return { setTrigger, setPopup, anchor, style, placement: `${side}-start` };
}

/** Whether two placed styles are the same, so an unchanged frame does not re-render the popup. */
function sameStyle(a: CSSProperties, b: CSSProperties): boolean {
  return a.top === b.top && a.left === b.left && a.maxHeight === b.maxHeight && a.width === b.width && a.minWidth === b.minWidth;
}
