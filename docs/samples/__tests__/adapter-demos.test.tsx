// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import SampleIsland from "@/islands/SampleIsland";
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

describe("SampleIsland with a provider", () => {
  // MUI's first import is slow when the whole suite runs at once.
  it("mounts the sample inside the design system's provider after hydration", { timeout: 60000 }, async () => {
    const { container } = render(<SampleIsland name="adapters/data-table/mui-demo" lang="en" provider="mui" />);
    await waitFor(() => expect(container.querySelector(".MuiTableRow-root")).not.toBeNull(), { timeout: 30000 });
    expect(container.querySelectorAll("tbody tr")).toHaveLength(5);
  });
});

describe("MUI provider direction", () => {
  const Provider = PROVIDERS.mui;
  /** The text of every style tag an Emotion cache with this key has written. */
  const styles = (key: string) => [...document.querySelectorAll(`style[data-emotion^="${key}"]`)].map((tag) => tag.textContent).join("");
  const cellClasses = (container: HTMLElement) => [...container.querySelector("tbody td.MuiTableCell-root:not(.MuiTableCell-paddingCheckbox)")!.classList];

  it("mirrors MUI's styles on a right-to-left page, in a cache of its own", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(
      <Provider theme="dark" dir="rtl">
        <Mui />
      </Provider>,
    );
    const classes = cellClasses(container);
    expect(classes.some((name) => name.startsWith("muirtl-"))).toBe(true);
    expect(classes.some((name) => name.startsWith("css-"))).toBe(false);
    // MUI writes `text-align: left` for a cell; the cache turns it around.
    const cell = classes.find((name) => name.startsWith("muirtl-"))!;
    expect(styles("muirtl")).toMatch(new RegExp(`\.${cell}\{[^}]*text-align:right`));
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it("leaves a left-to-right page on Emotion's default cache", () => {
    const { container } = render(
      <Provider theme="dark" dir="ltr">
        <Mui />
      </Provider>,
    );
    const classes = cellClasses(container);
    expect(classes.some((name) => name.startsWith("css-"))).toBe(true);
    expect(classes.some((name) => name.startsWith("muirtl-"))).toBe(false);
    const cell = classes.find((name) => name.startsWith("css-"))!;
    expect(styles("css")).toMatch(new RegExp(`\.${cell}\{[^}]*text-align:left`));
  });
});

describe("MUI provider language", () => {
  const Provider = PROVIDERS.mui;

  it("gives MUI's own labels in Arabic on an Arabic page", () => {
    const { container } = render(
      <Provider theme="light" dir="rtl" lang="ar">
        <Mui />
      </Provider>,
    );
    expect(container.textContent).toContain("عدد الصفوف في الصفحة");
    expect(container.textContent).toContain("1–5 من 12");
    expect(container.textContent).not.toContain("Rows per page");
  });

  it("keeps MUI's English labels when no language is given", () => {
    const { container } = render(
      <Provider theme="light" dir="ltr">
        <Mui />
      </Provider>,
    );
    expect(container.textContent).toContain("1–5 of 12");
  });
});
