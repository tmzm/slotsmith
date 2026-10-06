/**
 * ExplodedView
 *
 * The swap demo's assembly drawing (docs/DESIGN.md section 6, item 2). It
 * wraps the live table and, after mount, gives each part's elements its
 * offset as `--dx` / `--dy` custom properties and floats a bracketed label
 * over it. `styles/explode.css` turns `--explode` (0 to 1, driven by
 * `landing-motion.ts`) into the transforms and the labels' opacity.
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
import { useEffect, useRef, useState, type ReactNode } from "react";
import { bracketLabel, type ExplodePart } from "@/lib/explode";

export interface ExplodedViewProps {
  parts: ExplodePart[];
  /** The static figure's caption. */
  caption?: ReactNode;
  /** Leaves out the static figure and `data-static`: the caller drives `--explode` and lists the parts. */
  live?: boolean;
  children: ReactNode;
}

interface LabelPosition {
  x: number;
  y: number;
  /** -1 on right-to-left pages, where every `dx` is mirrored. */
  sign: number;
}

/**
 * The element a part's label points at: the middle one of its matches that is
 * in view inside the stage (the table scrolls in its box), so labels spread
 * over the table and none points at a part scrolled out of sight.
 */
function anchor(matches: HTMLElement[], box: DOMRect): DOMRect | undefined {
  const inView = matches
    .map((element) => element.getBoundingClientRect())
    .filter((rect) => rect.width > 0 && rect.top >= box.top && rect.bottom <= box.bottom && rect.left >= box.left && rect.right <= box.right);
  return inView[Math.floor((inView.length - 1) / 2)];
}

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
        const sign = getComputedStyle(root).direction === "rtl" ? -1 : 1;
        const box = root.getBoundingClientRect();
        const next: Record<string, LabelPosition | undefined> = {};
        for (const part of parts) {
          const matches = [...root.querySelectorAll<HTMLElement>(part.selector)].filter((element) => !element.closest(".explode__label"));
          for (const element of matches) {
            element.style.setProperty("--dx", String(part.dx * sign));
            element.style.setProperty("--dy", String(part.dy));
          }
          // Measured at rest: labels ride along with their part through the same --dx/--dy.
          const rect = anchor(matches, box);
          // x is the part's start edge: its left in left-to-right, its right in right-to-left.
          next[part.slot] = rect ? { x: (sign > 0 ? rect.left : rect.right) - box.left, y: rect.top - box.top, sign } : undefined;
        }
        setPositions(next);
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
              aria-hidden="true"
              hidden={!at}
              style={at ? { left: at.x, top: at.y, ["--dx" as string]: part.dx * at.sign, ["--dy" as string]: part.dy } : undefined}
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
