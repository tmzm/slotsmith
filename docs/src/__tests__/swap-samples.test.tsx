// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ComponentType } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PROVIDERS } from "@samples/adapters/providers";
import Antd from "@samples/landing/swap-antd";
import Chakra from "@samples/landing/swap-chakra";
import Fallback from "@samples/landing/swap-fallback";
import Mui from "@samples/landing/swap-mui";
import Shadcn from "@samples/landing/swap-shadcn";

const VARIANTS: [name: "shadcn" | "mui" | "chakra" | "antd", Sample: ComponentType][] = [
  ["shadcn", Shadcn],
  ["mui", Mui],
  ["chakra", Chakra],
  ["antd", Antd],
];

const lines = (name: string) => readFileSync(resolve(process.cwd(), `samples/landing/swap-${name}.tsx`), "utf8").split("\n");

afterEach(cleanup);

describe("swap samples", () => {
  it("renders 12 body rows for the fallback with no console errors", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(<Fallback />);
    expect(container.querySelectorAll("tbody tr")).toHaveLength(12);
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it.each(VARIANTS)("renders 12 body rows for %s inside its provider with no console errors", (name, Sample) => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const Provider = PROVIDERS[name];
    const { container } = render(
      <Provider theme="light" dir="ltr">
        <Sample />
      </Provider>,
    );
    expect(container.querySelectorAll("tbody tr")).toHaveLength(12);
    if (name === "mui") expect(container.querySelector(".MuiTableRow-root")).not.toBeNull();
    if (name === "antd") expect(container.querySelector(".ant-checkbox")).not.toBeNull();
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it.each(["shadcn", "mui", "chakra", "antd"])("differs from the fallback in at most two lines: %s", (name) => {
    const fallback = new Set(lines("fallback"));
    const other = new Set(lines(name));
    const changed = [...other].filter((l) => !fallback.has(l)).length;
    const removed = [...fallback].filter((l) => !other.has(l)).length;
    expect(changed).toBeLessThanOrEqual(2);
    expect(removed).toBeLessThanOrEqual(2);
    expect(changed + removed).toBeGreaterThan(0);
  });
});
