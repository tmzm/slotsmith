import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadKnowledge, type Knowledge } from "../../knowledge/load";
import { createSlotsmithServer } from "../server";
import { findInstalledVersion, versionWarning } from "../version";

let knowledge: Knowledge;

/**
 * Connect
 *
 * Starts a server and a client joined by an in-memory transport.
 *
 * @param installedVersion - The project's slotsmith version to simulate.
 * @returns The connected client.
 */
async function connect(installedVersion?: string): Promise<Client> {
  const server = createSlotsmithServer({ knowledge, installedVersion, cwd: tmpdir() });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "1.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

/**
 * Call
 *
 * @param client - A connected client.
 * @param name - The tool.
 * @param args - Its arguments.
 * @returns The result, and its text joined.
 */
async function call(client: Client, name: string, args: Record<string, unknown> = {}) {
  const result = (await client.callTool({ name, arguments: args })) as CallToolResult;
  const text = result.content.map((part) => (part.type === "text" ? part.text : "")).join("\n");
  return { result, text, data: result.structuredContent as Record<string, any> | undefined };
}

describe("slotsmith MCP server", () => {
  let client: Client;

  beforeAll(async () => {
    knowledge = loadKnowledge();
    client = await connect(knowledge.index.version);
  });

  afterAll(async () => {
    await client.close();
  });

  it("lists the seven tools with their inputs", async () => {
    const { tools } = await client.listTools();
    const inputs = Object.fromEntries(tools.map((tool) => [tool.name, Object.keys(tool.inputSchema.properties ?? {})]));
    expect(inputs).toEqual({
      list_components: [],
      get_component_api: ["component"],
      list_slots: ["component"],
      get_slot: ["component", "slot"],
      get_adapter_example: ["component", "library"],
      get_setup: ["component", "framework", "virtual"],
      search_docs: ["query", "limit"],
    });
  });

  it("list_components returns every component with its entry point, CSS and peers", async () => {
    const { text, data } = await call(client, "list_components");
    const components = data!.components as { name: string; entry: string; css: string; requiredPeers: { name: string }[] }[];
    expect(components.map((component) => component.name)).toEqual(["autocomplete", "data-table", "date-picker", "file-uploader"]);
    const table = components.find((component) => component.name === "data-table")!;
    expect(table.entry).toBe("slotsmith/data-table");
    expect(table.css).toBe("slotsmith/data-table.css");
    expect(table.requiredPeers.map((peer) => peer.name)).toContain("@tanstack/react-table");
    expect(text).toContain('import { DatePicker } from "slotsmith/date-picker"');
  });

  it("list_components names the available locale packs", async () => {
    const { text, data } = await call(client, "list_components");
    const locales = data!.locales as string[];
    expect(locales).toHaveLength(18);
    expect(locales).toContain("ar");
    expect(locales).toContain("ar-EG");
    expect(locales).toContain("zh-CN");
    expect(text).toContain("ar-EG");
  });

  it("search_docs for defineLocale returns the i18n guide first", async () => {
    const { data } = await call(client, "search_docs", { query: "defineLocale" });
    const [first] = data!.results as { anchor: string }[];
    expect(first!.anchor).toContain("slotsmith://guides/i18n");
  });

  it("get_component_api returns grouped props, defaults, pairs and labels", async () => {
    const { text, data } = await call(client, "get_component_api", { component: "date-picker" });
    expect(data!.groups).toEqual(["Value and mode", "Calendar", "Bounds", "Open state", "Display", "Slots and labels"]);
    const popupOffset = (data!.props as { name: string; default?: string }[]).find((prop) => prop.name === "popupOffset");
    expect(popupOffset?.default).toBe("4");
    expect(data!.controlledPairs).toContainEqual({ value: "open", defaultValue: "defaultOpen", onChange: "onOpenChange" });
    expect(text).toContain("## Bounds");
    expect(text).toContain("`minDate?`");
    expect(text).toContain("defaultDatePickerLabels");
  });

  it("list_slots returns each slot's name, kind and summary", async () => {
    const { text, data } = await call(client, "list_slots", { component: "data-table" });
    const slots = data!.slots as { name: string; kind: string }[];
    expect(slots).toHaveLength(21);
    expect(slots.find((slot) => slot.name === "Checkbox")?.kind).toBe("widget");
    expect(text).toContain("| `Row` | element |");
  });

  it("get_slot returns props, fallback and a replacement snippet", async () => {
    const { text, data } = await call(client, "get_slot", { component: "autocomplete", slot: "tag" });
    expect(data!.name).toBe("Tag");
    expect((data!.props as { name: string }[]).map((prop) => prop.name)).toEqual([
      "label",
      "value",
      "option",
      "onRemove",
      "removeLabel",
      "disabled",
    ]);
    expect(text).toContain("## Fallback");
    expect(data!.snippet).toContain("components={{ Tag: MyTag }}");
  });

  it("get_slot reports an unknown slot with the ones that exist", async () => {
    const { result, text } = await call(client, "get_slot", { component: "date-picker", slot: "Grid" });
    expect(result.isError).toBe(true);
    expect(text).toContain('no slot named "Grid"');
    expect(text).toContain("DayContent");
  });

  it("get_adapter_example returns the adapter source", async () => {
    const { text, data } = await call(client, "get_adapter_example", { component: "date-picker", library: "shadcn" });
    expect(data!.found).toBe(true);
    expect(data!.source).toContain('from "slotsmith/date-picker"');
    expect(text).toContain("components={shadcnComponents}");
  });

  it("get_adapter_example says when no adapter exists yet, and lists the ones that do", async () => {
    const { result, text, data } = await call(client, "get_adapter_example", { component: "file-uploader", library: "radix" });
    expect(result.isError).toBeFalsy();
    expect(data!.found).toBe(false);
    expect(data!.available).toEqual(["mui"]);
    expect(text).toContain("No Radix UI adapter yet for File uploader");
    expect(text).toContain("mui (MUI)");
  });

  it("get_setup returns the install command, imports, CSS and framework notes", async () => {
    const { text, data } = await call(client, "get_setup", { component: "data-table", framework: "next", virtual: true });
    expect(data!.install).toBe("npm i slotsmith @tanstack/react-table @tanstack/react-virtual");
    expect(data!.imports).toEqual(['import { VirtualDataTable } from "slotsmith/virtual";']);
    expect(data!.css).toBe('import "slotsmith/data-table.css";');
    expect(text).toContain("## Next.js");
    expect(text).toContain("app/layout.tsx");
  });

  it("get_setup notes when a component has no virtual variant", async () => {
    const { data } = await call(client, "get_setup", { component: "date-picker", virtual: true });
    expect(data!.install).toBe("npm i slotsmith");
    expect(data!.virtual).toBe(false);
    expect((data!.notes as string[])[0]).toContain("has no virtual variant");
  });

  it("search_docs ranks the matching prop first, with an anchor", async () => {
    const { data } = await call(client, "search_docs", { query: "disable weekends" });
    const [first] = data!.results as { anchor: string; title: string }[];
    expect(first!.anchor).toBe("slotsmith://components/date-picker#prop-disabledDates");
  });

  it("search_docs finds guide sections", async () => {
    const { data } = await call(client, "search_docs", { query: "server side pagination", limit: 3 });
    const anchors = (data!.results as { anchor: string }[]).map((result) => result.anchor);
    expect(anchors).toContain("slotsmith://guides/data-table#server-side-data");
    expect(anchors).toHaveLength(3);
  });

  it.each([
    ["an unknown component", "get_component_api", { component: "calendar" }],
    ["a missing component", "list_slots", {}],
    ["an unknown library", "get_adapter_example", { component: "date-picker", library: "bootstrap" }],
    ["an unknown framework", "get_setup", { component: "date-picker", framework: "angular" }],
    ["a missing slot", "get_slot", { component: "date-picker" }],
    ["an empty query", "search_docs", { query: "   " }],
    ["an out-of-range limit", "search_docs", { query: "value", limit: 500 }],
  ])("rejects %s", async (_, name, args) => {
    const { result, text } = await call(client, name, args);
    expect(result.isError).toBe(true);
    expect(text).toContain("Input validation error");
  });

  it("serves the component and guide resources", async () => {
    const { resources } = await client.listResources();
    const uris = resources.map((resource) => resource.uri);
    expect(uris).toContain("slotsmith://components/date-picker");
    expect(uris).toContain("slotsmith://guides/setup");

    const component = await client.readResource({ uri: "slotsmith://components/file-uploader" });
    expect(component.contents[0]).toMatchObject({ mimeType: "text/markdown" });
    expect((component.contents[0] as { text: string }).text).toContain("# File uploader (`file-uploader`)");

    const guide = await client.readResource({ uri: "slotsmith://guides/slots" });
    expect((guide.contents[0] as { text: string }).text).toContain("# Slots: element parts and widget parts");

    const { resourceTemplates } = await client.listResourceTemplates();
    expect(resourceTemplates.map((template) => template.uriTemplate)).toEqual([
      "slotsmith://components/{name}",
      "slotsmith://guides/{name}",
    ]);
  });

  it("serves the two prompts", async () => {
    const { prompts } = await client.listPrompts();
    expect(prompts.map((prompt) => prompt.name)).toEqual(["build-component", "adapt-slots-to-library"]);

    const build = await client.getPrompt({ name: "build-component", arguments: { component: "autocomplete", library: "mui" } });
    const buildText = (build.messages[0]!.content as { text: string }).text;
    expect(buildText).toContain('from "slotsmith/autocomplete"');
    expect(buildText).toContain("A ready-made MUI adapter exists");

    const adapt = await client.getPrompt({ name: "adapt-slots-to-library", arguments: { component: "file-uploader", library: "chakra" } });
    const adaptText = (adapt.messages[0]!.content as { text: string }).text;
    expect(adaptText).toContain("Partial<FileUploaderComponents>");
    expect(adaptText).toContain("There is no Chakra UI adapter yet");
  });
});

describe("version check", () => {
  let dir: string;

  beforeAll(() => {
    knowledge ??= loadKnowledge();
    dir = mkdtempSync(join(tmpdir(), "slotsmith-ai-"));
    mkdirSync(join(dir, "node_modules", "slotsmith"), { recursive: true });
    writeFileSync(join(dir, "node_modules", "slotsmith", "package.json"), JSON.stringify({ name: "slotsmith", version: "1.3.1" }));
    mkdirSync(join(dir, "app", "src"), { recursive: true });
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("finds the installed slotsmith from the project or any parent", () => {
    expect(findInstalledVersion(dir)).toBe("1.3.1");
    expect(findInstalledVersion(join(dir, "app", "src"))).toBe("1.3.1");
  });

  it("warns only when the major or minor differs", () => {
    expect(versionWarning(undefined, "1.4.0")).toBeUndefined();
    expect(versionWarning("1.4.7", "1.4.0")).toBeUndefined();
    expect(versionWarning("1.3.1", "1.4.0")).toContain("slotsmith 1.3.1 installed");
    expect(versionWarning("2.4.0", "1.4.0")).toBeDefined();
  });

  it("prepends the warning to every tool result", async () => {
    const server = createSlotsmithServer({ knowledge, cwd: dir });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test", version: "1.0.0" });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    for (const [name, args] of [
      ["list_components", {}],
      ["get_slot", { component: "date-picker", slot: "Day" }],
      ["get_slot", { component: "date-picker", slot: "Nope" }],
      ["search_docs", { query: "range" }],
    ] as const) {
      const { text, data } = await call(client, name, args);
      expect(text.split("\n")[0], name).toMatch(/^> Warning: this project has slotsmith 1\.3\.1 installed/);
      if (data) expect(data.warning).toContain("1.3.1");
    }
    await client.close();
  });

  it("stays quiet when the versions agree", async () => {
    const quiet = await connect(`${knowledge.index.version.split(".").slice(0, 2).join(".")}.99`);
    const { text, data } = await call(quiet, "list_components");
    expect(text).not.toContain("Warning");
    expect(data!.warning).toBeUndefined();
    await quiet.close();
  });
});
