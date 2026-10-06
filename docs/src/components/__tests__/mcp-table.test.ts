import { beforeAll, describe, expect, it } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
// jsdom ships no types.
// @ts-expect-error -- untyped module
import { JSDOM } from "jsdom";
import McpTable from "@/components/McpTable.astro";
import { MCP_PROMPTS, MCP_TOOLS } from "@/data/mcp";

let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create();
});

async function render(kind: "tools" | "prompts"): Promise<Document> {
  return new JSDOM(await container.renderToString(McpTable, { props: { kind } })).window.document as Document;
}

describe("McpTable", () => {
  it.each([
    ["tools", MCP_TOOLS.length],
    ["prompts", MCP_PROMPTS.length],
  ] as const)("keeps the %s table's semantics when its rows stack: every part names its role", async (kind, count) => {
    const doc = await render(kind);
    const table = doc.querySelector("table")!;
    expect(table.getAttribute("role")).toBe("table");
    expect([...table.children].map((group) => group.getAttribute("role"))).toEqual(["rowgroup", "rowgroup"]);
    const rows = [...table.querySelectorAll("tr")];
    expect(rows).toHaveLength(count + 1);
    expect(rows.every((row) => row.getAttribute("role") === "row")).toBe(true);
    expect([...rows[0]!.children].map((cell) => cell.getAttribute("role"))).toEqual(["columnheader", "columnheader", "columnheader"]);
    for (const row of rows.slice(1)) {
      expect([...row.children].map((cell) => cell.getAttribute("role"))).toEqual(["rowheader", "cell", "cell"]);
    }
  });
});
