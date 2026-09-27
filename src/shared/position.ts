"use client";

import { autoUpdate, flip, offset as offsetMiddleware, shift, size, useFloating } from "@floating-ui/react-dom";
import type { CSSProperties } from "react";

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
  /** Absolute positioning for the popup. */
  style: CSSProperties;
  /** The side the popup ended up on, for transition origins. */
  placement: string;
}

/** Breathing room kept between the popup and the viewport edge. */
const VIEWPORT_PADDING = 8;

/**
 * usePopupPosition
 *
 * Places the popup with Floating UI: it flips when there is no room, shifts
 * to stay on screen, matches the trigger's width, and caps its height to the
 * space actually available. Position is tracked while open, so scrolling an
 * ancestor or resizing the window keeps it attached.
 *
 * `position: fixed` in a strategy that escapes an ancestor's `overflow:
 * hidden`, so the popup works inside cards, drawers and scroll areas without
 * a portal.
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
  const floating = useFloating<HTMLElement>({
    open,
    placement: placement === "top" ? "top-start" : "bottom-start",
    strategy: "fixed",
    whileElementsMounted: autoUpdate,
    middleware: [
      offsetMiddleware(offset),
      flip({ padding: VIEWPORT_PADDING }),
      shift({ padding: VIEWPORT_PADDING }),
      size({
        padding: VIEWPORT_PADDING,
        apply({ rects, availableHeight, elements }) {
          Object.assign(elements.floating.style, {
            maxHeight: `${Math.min(maxHeight, availableHeight)}px`,
            ...(matchTriggerWidth
              ? { width: `${rects.reference.width}px` }
              : { minWidth: `${rects.reference.width}px` }),
          });
        },
      }),
    ],
  });

  return {
    setTrigger: floating.refs.setReference,
    setPopup: floating.refs.setFloating,
    style: floating.floatingStyles,
    placement: floating.placement,
  };
}
