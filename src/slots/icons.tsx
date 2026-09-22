import type { SVGProps } from "react";

/**
 * Svg
 *
 * A 16px, stroke-based, decorative SVG shared by the fallback icons.
 */
const Svg = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    {...props}
  />
);

/**
 * Arrow up icon
 *
 * Sorted ascending.
 */
export const ArrowUpIcon = () => (
  <Svg>
    <path d="m5 12 7-7 7 7" />
    <path d="M12 19V5" />
  </Svg>
);

/**
 * Arrow down icon
 *
 * Sorted descending.
 */
export const ArrowDownIcon = () => (
  <Svg>
    <path d="M12 5v14" />
    <path d="m19 12-7 7-7-7" />
  </Svg>
);

/**
 * Arrow up-down icon
 *
 * Sortable, not sorted.
 */
export const ArrowUpDownIcon = () => (
  <Svg>
    <path d="m21 16-4 4-4-4" />
    <path d="M17 20V4" />
    <path d="m3 8 4-4 4 4" />
    <path d="M7 4v16" />
  </Svg>
);

/**
 * Chevron icon
 *
 * Points to the previous page, the next page, or down. The stylesheet flips
 * `previous` / `next` in RTL.
 */
export const ChevronIcon = ({ direction }: { direction: "previous" | "next" | "down" }) => (
  <Svg data-direction={direction}>
    <path d={direction === "previous" ? "m15 18-6-6 6-6" : direction === "next" ? "m9 18 6-6-6-6" : "m6 9 6 6 6-6"} />
  </Svg>
);
