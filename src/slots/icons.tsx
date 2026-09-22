import type { SVGProps } from "react";

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

export const ArrowUpIcon = () => (
  <Svg>
    <path d="m5 12 7-7 7 7" />
    <path d="M12 19V5" />
  </Svg>
);

export const ArrowDownIcon = () => (
  <Svg>
    <path d="M12 5v14" />
    <path d="m19 12-7 7-7-7" />
  </Svg>
);

export const ArrowUpDownIcon = () => (
  <Svg>
    <path d="m21 16-4 4-4-4" />
    <path d="M17 20V4" />
    <path d="m3 8 4-4 4 4" />
    <path d="M7 4v16" />
  </Svg>
);

/** Points to the inline end; flipped in RTL by CSS. */
export const ChevronIcon = ({ direction }: { direction: "previous" | "next" | "down" }) => (
  <Svg data-direction={direction}>
    <path d={direction === "previous" ? "m15 18-6-6 6-6" : direction === "next" ? "m9 18 6-6-6-6" : "m6 9 6 6 6-6"} />
  </Svg>
);
