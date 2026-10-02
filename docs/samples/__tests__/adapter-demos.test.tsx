// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PROVIDERS, type ProviderName } from "@samples/adapters/providers";
import Antd from "@samples/adapters/data-table/antd-demo";
import Chakra from "@samples/adapters/data-table/chakra-demo";
import Mui from "@samples/adapters/data-table/mui-demo";
import Radix from "@samples/adapters/data-table/radix-demo";
import Shadcn from "@samples/adapters/data-table/shadcn-demo";

/** Each adapter demo and an element only that library renders. */
const DEMOS: [name: ProviderName, Demo: ComponentType, marker: string][] = [
  ["shadcn", Shadcn, '[data-slot="table"]'],
  ["mui", Mui, ".MuiTableRow-root"],
  ["chakra", Chakra, ".chakra-table__root, [class*='chakra-table']"],
  ["antd", Antd, ".ant-checkbox"],
  ["radix", Radix, ".rt-TableRow"],
];

afterEach(cleanup);

describe("data-table adapter demos", () => {
  it.each(DEMOS)("%s: renders a page of rows with selection and sorting, in its provider, with no console errors", (name, Demo, marker) => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const Provider = PROVIDERS[name];
    const { container } = render(
      <Provider theme="dark" dir="ltr">
        <Demo />
      </Provider>,
    );
    expect(container.querySelectorAll("tbody tr")).toHaveLength(5);
    expect(container.querySelector(marker), `${name} parts`).not.toBeNull();
    // A select-all checkbox in the header and one per row.
    expect(container.querySelectorAll('[role="checkbox"], input[type="checkbox"]').length).toBeGreaterThanOrEqual(6);
    // Every column header is sortable.
    expect(container.querySelectorAll("thead button").length).toBeGreaterThanOrEqual(5);
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });
});
