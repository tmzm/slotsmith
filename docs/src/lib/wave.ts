/**
 * First-load wave order
 *
 * The landing's panels rise in a diagonal wave from the top of the start side
 * to the bottom of the end side (docs/DESIGN.md section 6, "First load"), the
 * way the portfolio's Boot sequence does it.
 */

/** The parts of a panel's viewport box the order needs. */
export interface WaveRect {
  top: number;
  left: number;
  right: number;
}

/**
 * The order in which panels join the wave: by distance from the top of the
 * start side, `x + top * 1.4`, where `x` is `left` on a left-to-right page
 * and `viewportWidth - right` on a right-to-left one. Ties keep their order.
 *
 * @param rects - Each panel's viewport box (`getBoundingClientRect()`).
 * @param viewportWidth - The viewport width, for measuring from the right.
 * @param rtl - Whether the page reads right to left.
 * @returns Indices into `rects`, first to last.
 */
export function waveOrder(rects: WaveRect[], viewportWidth: number, rtl: boolean): number[] {
  const distance = (rect: WaveRect) => (rtl ? viewportWidth - rect.right : rect.left) + rect.top * 1.4;
  return rects.map((_, index) => index).sort((a, b) => distance(rects[a]!) - distance(rects[b]!));
}
