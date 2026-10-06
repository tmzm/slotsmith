/**
 * Label placement
 *
 * Finds a place for each floating label of the exploded view: next to the
 * part it names, on a straight leader, clear of every piece of text and every
 * control in the table, clear of the other labels, and inside the box that
 * clips the view. All boxes are in one coordinate space (px); the caller
 * measures them with the view fully open.
 *
 * A label that fits nowhere gets no place. The view then leaves it out: the
 * parts list beside or below the table still names the part.
 */

/** A box by its edges. */
export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** One label to place. */
export interface LabelRequest {
  id: string;
  /** The label's own size. */
  width: number;
  height: number;
  /** The boxes it may point at, best first: the same part's elements. */
  anchors: Box[];
  /** Which side of its part to try first. */
  side: "above" | "below";
}

/** Where a label goes. */
export interface LabelPlacement {
  left: number;
  top: number;
  /** The side of the part the label sits on. */
  side: "above" | "below";
  /** The leader's distance from the label's left edge. */
  leaderX: number;
  /** The leader's length, from the label to its part. */
  leaderLength: number;
  /** The index of the anchor the label points at. */
  anchor: number;
}

export interface PlaceOptions {
  /** Right-to-left: the start edge is the right one, so candidates are tried from the right. */
  rtl?: boolean;
}

/** Leader lengths to try, shortest first. Each step clears one label's height. */
const LEADERS = [8, 20, 34, 48, 62];
/** How far from an anchor's edge a leader attaches. */
const ATTACH_INSET = 10;
/** How far inside the label its leader sits, from the label's nearer edge. */
const LEADER_INSET = 9;
/** Clear space kept around text and controls. */
const TEXT_GAP = 3;
/** Clear space kept between two labels. */
const LABEL_GAP = 4;
/** How far short of its part a leader is checked: the part itself may be an obstacle (an icon, a checkbox). */
const LEADER_REACH = 3;

const overlaps = (a: Box, b: Box, gap: number) => a.left < b.right + gap && a.right > b.left - gap && a.top < b.bottom + gap && a.bottom > b.top - gap;

const inside = (box: Box, bounds: Box) => box.left >= bounds.left && box.right <= bounds.right && box.top >= bounds.top && box.bottom <= bounds.bottom;

/** Where along an anchor a leader may attach, start side first. A narrow anchor has only its middle. */
function attachPoints(anchor: Box, rtl: boolean): number[] {
  const middle = (anchor.left + anchor.right) / 2;
  if (anchor.right - anchor.left < ATTACH_INSET * 4) return [middle];
  const start = rtl ? anchor.right - ATTACH_INSET : anchor.left + ATTACH_INSET;
  const end = rtl ? anchor.left + ATTACH_INSET : anchor.right - ATTACH_INSET;
  return [start, middle, end];
}

/** The label's left edge for each way it can hang on a leader at `x`: growing toward the end side, centred, toward the start side. */
function alignments(x: number, width: number, rtl: boolean): number[] {
  const toRight = x - LEADER_INSET;
  const toLeft = x + LEADER_INSET - width;
  const centred = x - width / 2;
  return rtl ? [toLeft, centred, toRight] : [toRight, centred, toLeft];
}

/**
 * Places each label, in the order given: earlier labels are placed first and
 * later ones keep clear of them, so list the hardest to place first.
 *
 * For one label the search goes anchor by anchor, the preferred side before
 * the other, shorter leaders before longer, and takes the first candidate
 * that is inside `bounds`, off every obstacle and every placed label, with a
 * leader that crosses none of them.
 *
 * @param requests - The labels, with their sizes and the boxes they may point at.
 * @param obstacles - What a label must not cover: the boxes of the text and the controls.
 * @param bounds - The box the labels must stay inside.
 * @returns Each label's place by id; a label with no free place is left out.
 */
export function placeLabels(requests: LabelRequest[], obstacles: Box[], bounds: Box, options: PlaceOptions = {}): Record<string, LabelPlacement | undefined> {
  const rtl = options.rtl ?? false;
  const placed: Box[] = [];
  const result: Record<string, LabelPlacement | undefined> = {};

  const free = (label: Box, leader: Box) =>
    inside(label, bounds) &&
    !obstacles.some((box) => overlaps(label, box, TEXT_GAP) || overlaps(leader, box, 1)) &&
    !placed.some((box) => overlaps(label, box, LABEL_GAP) || overlaps(leader, box, 1));

  const find = (request: LabelRequest): { placement: LabelPlacement; box: Box } | undefined => {
    const sides = request.side === "above" ? (["above", "below"] as const) : (["below", "above"] as const);
    for (const [index, anchor] of request.anchors.entries()) {
      for (const side of sides) {
        for (const length of LEADERS) {
          const top = side === "above" ? anchor.top - length - request.height : anchor.bottom + length;
          for (const x of attachPoints(anchor, rtl)) {
            for (const left of alignments(x, request.width, rtl)) {
              const box = { left, top, right: left + request.width, bottom: top + request.height };
              const leader =
                side === "above"
                  ? { left: x, right: x + 1, top: box.bottom, bottom: anchor.top - LEADER_REACH }
                  : { left: x, right: x + 1, top: anchor.bottom + LEADER_REACH, bottom: box.top };
              if (free(box, leader)) return { placement: { left, top, side, leaderX: x - left, leaderLength: length, anchor: index }, box };
            }
          }
        }
      }
    }
    return undefined;
  };

  for (const request of requests) {
    if (request.width <= 0 || request.height <= 0) continue;
    const found = find(request);
    if (!found) continue;
    placed.push(found.box);
    result[request.id] = found.placement;
  }
  return result;
}
