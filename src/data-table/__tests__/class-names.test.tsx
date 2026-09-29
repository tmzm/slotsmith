import { describe, expect, it } from "vitest";
import { renderTable } from "./builders";

/**
 * Same role, same name
 *
 * A part that does the same job as one in another component carries the same
 * name, so one rule or one query reaches both: the autocomplete's
 * `sac__sr-only`, `sac__message` and `sac__error`.
 */
describe("class names shared with the other components", () => {
  it("names the screen-reader announcer __sr-only", () => {
    const { container } = renderTable({ enableRowReorder: true });
    expect(container.querySelector("[role=status].sdt__sr-only")).toBeInTheDocument();
  });

  it("names the empty state __message and the error state __error", () => {
    const empty = renderTable({ data: [] });
    expect(empty.container.querySelector(".sdt__message")).toBeInTheDocument();
    empty.unmount();

    const failed = renderTable({ error: new Error("Down"), onRetry: () => {} });
    const error = failed.container.querySelector(".sdt__error");
    expect(error).toHaveAttribute("role", "alert");
    expect(error).not.toHaveClass("sdt__message");
  });
});
