/**
 * ExplodedView
 *
 * The swap demo's assembly drawing (docs/DESIGN.md section 6, item 2). It
 * wraps the live table and, after mount, gives each part's elements its
 * offset as `--dx` / `--dy` custom properties and floats a bracketed label
 * next to it. `styles/explode.css` turns `--explode` (0 to 1, driven by
 * `landing-motion.ts`) into the transforms and the labels' opacity.
 *
 * Each label is placed for the open view (`lib/label-placement`): beside its
 * part on a leader, in the room the explosion opens, never over a cell's
 * text, a control or another label, and inside the box that clips the view
 * (the nearest `[data-explode-bounds]`, inside or around the stage). A label
 * with no free place stays hidden. The place is written as custom properties
 * and applied as a transform, so moving a label never shifts the layout.
 *
 * The root starts with `data-static`: the table stays assembled and the same
 * labels sit in a separate static figure beside it. That is the whole view
 * without JavaScript, under reduced motion, and whenever the motion module has
 * not loaded; `landing-motion.ts` removes the attribute when it takes over.
 * Nothing here needs it to be visible or usable.
 *
 * With `live`, the view starts without `data-static` and without the static
 * figure: the page around it (the slot model guide's X-ray) sets `--explode`
 * itself and lists every part on its own.
 */
import "@/styles/explode.css";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { bracketLabel, type ExplodePart, type LabelHint } from "@/lib/explode";
import { placeLabels, type Box, type LabelRequest } from "@/lib/label-placement";

export interface ExplodedViewProps {
  parts: ExplodePart[];
  /** The static figure's caption. */
  caption?: ReactNode;
  /** Leaves out the static figure and `data-static`: the caller drives `--explode` and lists the parts. */
  live?: boolean;
  children: ReactNode;
}

/** A placed label: where it sits with the view open, and how its part got there. */
interface LabelPosition {
  /** The label's left and top edge in the stage, in px, with the view open. */
  x: number;
  y: number;
  /** The offset of the element it points at, in rem at `--explode: 1`: the label travels with it. */
  rx: number;
  ry: number;
  side: "above" | "below";
  /** The leader's distance from the label's left edge, and its length, in px. */
  leaderX: number;
  leader: number;
}

/** What a label must not cover, apart from text: the table's controls and icons. */
const CONTROLS = "input, button, select, textarea, svg, img";

/** The most elements of one part a label is tried against. */
const MAX_ANCHORS = 16;

/**
 * An element's offset with the view open, in rem: its own `--dx` / `--dy`
 * plus those of every part it sits inside.
 */
function offsetOf(element: Element | null, root: HTMLElement): { x: number; y: number } {
  let x = 0;
  let y = 0;
  for (let node = element; node && node !== root; node = node.parentElement) {
    if (!(node instanceof HTMLElement)) continue;
    x += Number.parseFloat(node.style.getPropertyValue("--dx")) || 0;
    y += Number.parseFloat(node.style.getPropertyValue("--dy")) || 0;
  }
  return { x, y };
}

/** A part's elements in the order its label should try them (`LabelHint.anchor`). */
function byPreference<T extends { box: Box }>(matches: T[], anchor: LabelHint["anchor"]): T[] {
  if (matches.length < 2 || anchor === "first") return matches;
  let pick = Math.floor((matches.length - 1) / 2);
  if (anchor === "row-end") {
    const top = matches[0]!.box.top;
    pick = matches.findLastIndex((match) => Math.abs(match.box.top - top) < 1);
  }
  return [matches[pick]!, ...matches.filter((_, index) => index !== pick)];
}

const same = (a: Record<string, LabelPosition | undefined>, b: Record<string, LabelPosition | undefined>) => JSON.stringify(a) === JSON.stringify(b);

export default function ExplodedView({ parts, caption, live = false, children }: ExplodedViewProps) {
  const view = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<Record<string, LabelPosition | undefined>>({});

  useEffect(() => {
    const root = stage.current;
    if (!root) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // Offsets are written for left-to-right; right-to-left mirrors them.
        const rtl = getComputedStyle(root).direction === "rtl";
        const sign = rtl ? -1 : 1;
        // Every part gets its offset before anything is measured: an element's place depends on the parts around it.
        const found = parts.map((part) => {
          const matches = [...root.querySelectorAll<HTMLElement>(part.selector)].filter((element) => !element.closest(".explode__label"));
          for (const element of matches) {
            element.style.setProperty("--dx", String(part.dx * sign));
            element.style.setProperty("--dy", String(part.dy));
          }
          return { part, matches };
        });

        const origin = root.getBoundingClientRect();
        const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        // The parts may be mid-explosion (a swap lands on an open view, the X-ray's toggle is in transition).
        const open = Number.parseFloat(getComputedStyle(root).getPropertyValue("--explode")) || 0;
        const rest = (1 - open) * rem;
        /** A box as it will sit with the view open, in the stage's coordinates: what is left of each part's travel is added. */
        const opened = (rect: DOMRect, offset: { x: number; y: number }): Box => ({
          left: rect.left - origin.left + offset.x * rest,
          right: rect.right - origin.left + offset.x * rest,
          top: rect.top - origin.top + offset.y * rest,
          bottom: rect.bottom - origin.top + offset.y * rest,
        });

        const clip = (root.querySelector("[data-explode-bounds]") ?? root.closest("[data-explode-bounds]") ?? root).getBoundingClientRect();
        const bounds: Box = { left: clip.left - origin.left + 2, right: clip.right - origin.left - 2, top: clip.top - origin.top + 2, bottom: clip.bottom - origin.top - 2 };
        const inBounds = (box: Box) => box.right > bounds.left && box.left < bounds.right && box.bottom > bounds.top && box.top < bounds.bottom;

        // Everything a label must stay off: each run of text and each control, where the open view puts it.
        const obstacles: Box[] = [];
        const add = (rects: Iterable<DOMRect>, owner: Element | null) => {
          const offset = offsetOf(owner, root);
          for (const rect of rects) {
            // A visually hidden note is a 1px box: nothing to cover.
            if (rect.width < 2 || rect.height < 2) continue;
            const box = opened(rect, offset);
            if (inBounds(box)) obstacles.push(box);
          }
        };
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const range = document.createRange();
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          if (!node.nodeValue?.trim() || node.parentElement?.closest(".explode__label")) continue;
          range.selectNodeContents(node);
          add(range.getClientRects?.() ?? [], node.parentElement);
        }
        for (const control of root.querySelectorAll<HTMLElement>(CONTROLS)) add([control.getBoundingClientRect()], control);

        const offsets: Record<string, { x: number; y: number }[]> = {};
        const requests: LabelRequest[] = found.map(({ part, matches }) => {
          const label = root.querySelector<HTMLElement>(`.explode__label[data-slot="${part.slot}"]`);
          const anchors = byPreference(
            matches
              .map((element) => {
                const offset = offsetOf(element, root);
                return { offset, box: opened(element.getBoundingClientRect(), offset) };
              })
              // A part scrolled out of the box, or not laid out, cannot be pointed at.
              .filter(({ box }) => box.right > box.left && box.top >= bounds.top && box.bottom <= bounds.bottom && box.left >= bounds.left && box.right <= bounds.right),
            part.label.anchor,
          ).slice(0, MAX_ANCHORS);
          offsets[part.slot] = anchors.map((anchor) => anchor.offset);
          return { id: part.slot, width: label?.offsetWidth ?? 0, height: label?.offsetHeight ?? 0, anchors: anchors.map((anchor) => anchor.box), side: part.label.side };
        });

        // Narrow parts first: a checkbox or an icon has one place for its leader, a row has its whole width.
        const width = (request: LabelRequest) => (request.anchors[0] ? request.anchors[0].right - request.anchors[0].left : Infinity);
        const placed = placeLabels([...requests].sort((a, b) => width(a) - width(b)), obstacles, bounds, { rtl });
        const next: Record<string, LabelPosition | undefined> = {};
        for (const { part } of found) {
          const at = placed[part.slot];
          const offset = at && offsets[part.slot]?.[at.anchor];
          if (!at || !offset) continue;
          const round = (value: number) => Math.round(value * 10) / 10;
          next[part.slot] = { x: round(at.left), y: round(at.top), rx: offset.x, ry: offset.y, side: at.side, leaderX: round(at.leaderX), leader: at.leaderLength };
        }
        setPositions((current) => (same(current, next) ? current : next));
      });
    };
    measure();
    // The table re-renders on every swap, page change and sort; re-measure after each.
    const mutations = new MutationObserver(measure);
    mutations.observe(root, { childList: true, subtree: true });
    // The motion module removes data-static, which gives the box room for the parts: the layout moves.
    if (view.current) mutations.observe(view.current, { attributes: true, attributeFilter: ["data-static"] });
    const resize = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(measure);
    resize?.observe(root);
    root.addEventListener("scroll", measure, true);
    // Web fonts change every label's width and the table's columns.
    document.fonts?.ready.then(measure).catch(() => {});
    return () => {
      cancelAnimationFrame(frame);
      mutations.disconnect();
      resize?.disconnect();
      root.removeEventListener("scroll", measure, true);
    };
  }, [parts]);

  return (
    <div className="explode" data-static={live ? undefined : ""} ref={view}>
      <div className="explode__stage" ref={stage}>
        {children}
        {parts.map((part) => {
          const at = positions[part.slot];
          return (
            <span
              key={part.slot}
              className={`explode__label explode__label--${part.kind}`}
              data-slot={part.slot}
              data-side={at?.side}
              aria-hidden="true"
              style={
                at
                  ? ({ "--lx": at.x, "--ly": at.y, "--rx": at.rx, "--ry": at.ry, "--leader-x": at.leaderX, "--leader": at.leader } as CSSProperties)
                  : undefined
              }
            >
              {bracketLabel(part)}
            </span>
          );
        })}
      </div>
      {!live && (
        <figure className="explode__diagram">
          <ol className="explode__parts">
            {parts.map((part) => (
              <li key={part.slot} className="explode__part" data-slot={part.slot}>
                <span className="explode__glyph" aria-hidden="true" />
                <span className="explode__leader" aria-hidden="true" />
                <code className={`explode__name explode__name--${part.kind}`}>{bracketLabel(part)}</code>
              </li>
            ))}
          </ol>
          {caption && <figcaption className="explode__caption">{caption}</figcaption>}
        </figure>
      )}
    </div>
  );
}
