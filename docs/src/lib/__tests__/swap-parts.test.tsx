// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { PROVIDERS } from "@samples/adapters/providers";
import Antd from "@samples/landing/swap-antd";
import Chakra from "@samples/landing/swap-chakra";
import Fallback from "@samples/landing/swap-fallback";
import Mui from "@samples/landing/swap-mui";
import Shadcn from "@samples/landing/swap-shadcn";
import { explodeParts } from "@/lib/explode";
import { getReference } from "@/lib/reference";
import { locateSwapPart, SWAP_OFFSETS, SWAP_PICKS } from "@/lib/swap-parts";
import { SLOT_SELECTORS } from "../../../scripts/slot-selectors.ts";

const VARIANTS: [name: "fallback" | "shadcn" | "mui" | "chakra" | "antd", Sample: ComponentType][] = [
  ["fallback", Fallback],
  ["shadcn", Shadcn],
  ["mui", Mui],
  ["chakra", Chakra],
  ["antd", Antd],
];

/** How many elements each part has on the first page: five rows of five columns, with the select column. */
const COUNTS: Record<string, number> = { HeaderRow: 1, HeaderCell: 5, SortTrigger: 5, Row: 5, Cell: 25, Checkbox: 6, Pagination: 1, PageSizeSelect: 1 };

afterEach(cleanup);

describe("swap parts", () => {
  it("labels at least the header row and cells, the sort trigger, rows, cells, checkbox, pagination and page-size select", () => {
    expect(SWAP_PICKS).toEqual(expect.arrayContaining(["HeaderRow", "HeaderCell", "SortTrigger", "Row", "Cell", "Checkbox", "Pagination", "PageSizeSelect"]));
    const parts = explodeParts(getReference("data-table"), SLOT_SELECTORS["data-table"], SWAP_PICKS, SWAP_OFFSETS);
    expect(parts.map((part) => part.slot)).toEqual(SWAP_PICKS);
  });

  it.each(VARIANTS)("finds every labelled part in the %s table", (name, Sample) => {
    const Provider = name === "fallback" ? undefined : PROVIDERS[name];
    const { container } = render(
      Provider ? (
        <Provider theme="light" dir="ltr">
          <Sample />
        </Provider>
      ) : (
        <Sample />
      ),
    );
    const found = Object.fromEntries(SWAP_PICKS.map((slot) => [slot, locateSwapPart(container, { slot }).length]));
    expect(found).toEqual(COUNTS);
    // The pagination is outside the table, and the page-size control inside the pagination.
    const [pagination] = locateSwapPart(container, { slot: "Pagination" });
    const [pageSize] = locateSwapPart(container, { slot: "PageSizeSelect" });
    expect(pagination!.contains(container.querySelector("table"))).toBe(false);
    expect(container.querySelector("table")!.contains(pagination!)).toBe(false);
    expect(pagination!.contains(pageSize!)).toBe(true);
    // Each sort trigger sits in a sortable header cell, each checkbox in a selection cell.
    for (const trigger of locateSwapPart(container, { slot: "SortTrigger" })) expect(trigger.parentElement!.hasAttribute("aria-sort")).toBe(true);
    for (const box of locateSwapPart(container, { slot: "Checkbox" })) expect(box.parentElement!.getAttribute("data-slot")).toBe("select");
  });
});
