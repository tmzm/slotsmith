import { describe, expect, it } from "vitest";
import { classes } from "../classes";
import { bodyRows, renderTable, user, users, type User } from "./builders";

const tree: User[] = [user(1, { children: [user(11)] }), user(2)];

/**
 * Pairs
 *
 * @returns Every entry in the class map as its current and deprecated name.
 */
const pairs = () =>
  Object.values(classes).map((value) => {
    const [name, ...old] = value.split(" ");
    return { name: name!, old };
  });

/**
 * Class names
 *
 * The prefix is `sdt`; until 2.0 every element also keeps the `rdt` name it
 * had before, so an application's own rules written against it keep matching.
 * These tests fail if that compatibility silently disappears.
 */
describe("class names", () => {
  it("names every part sdt and keeps its deprecated rdt name", () => {
    for (const { name, old } of pairs()) {
      expect(name).toMatch(/^sdt(__|$)/);
      expect(old.length, name).toBeGreaterThan(0);
      for (const legacy of old) expect(legacy, name).toMatch(/^rdt(__|$)/);
    }
  });

  it("puts the deprecated name beside the current one on every rendered part", () => {
    const { container } = renderTable({
      data: tree,
      getSubRows: (row) => row.children,
      defaultExpanded: true,
      enableRowSelection: true,
      enableRowReorder: true,
      columns: [
        { accessorKey: "name", header: "Name", footer: "Total" },
        { accessorKey: "age", header: "Age" },
      ],
    });

    const root = container.firstElementChild!;
    expect(root).toHaveClass("sdt", "rdt");
    expect(bodyRows()[0]).toHaveClass("sdt__row", "rdt__row");
    expect(container.querySelector(".sdt__drag")).toHaveClass("rdt__drag");

    let seen = 0;
    for (const { name, old } of pairs()) {
      for (const element of container.querySelectorAll(`.${CSS.escape(name)}`)) {
        expect(element, name).toHaveClass(...old);
        seen += 1;
      }
    }
    expect(seen).toBeGreaterThan(20);
  });

  it("keeps the deprecated names on the loading, empty and error states", () => {
    const loading = renderTable({ loading: true, data: users(1) });
    expect(loading.container.querySelector(".sdt__skeleton")).toHaveClass("rdt__skeleton");
    loading.unmount();

    const empty = renderTable({ data: [] });
    expect(empty.container.querySelector(".sdt__message")).toHaveClass("rdt__placeholder");
    empty.unmount();

    const failed = renderTable({ error: new Error("Down"), onRetry: () => {} });
    const error = failed.container.querySelector(".sdt__error");
    expect(error).toHaveClass("rdt__placeholder", "rdt__placeholder--error");
    expect(error).not.toHaveClass("sdt__message");
    expect(error!.querySelector(".sdt__button")).toHaveClass("rdt__button");
  });

  /**
   * Same role, same name
   *
   * A part that does the same job as one in another component carries the
   * same name, so one rule or one query reaches both.
   */
  it("names parts after the autocomplete's parts with the same role", () => {
    const { container } = renderTable({ enableRowReorder: true });
    expect(container.querySelector("[role=status].sdt__sr-only")).toHaveClass("rdt__sr");

    const failed = renderTable({ error: new Error("Down") });
    expect(failed.container.querySelector(".sdt__error")).toBeInTheDocument();
    failed.unmount();
    const empty = renderTable({ data: [] });
    expect(empty.container.querySelector(".sdt__message")).toBeInTheDocument();
  });
});
