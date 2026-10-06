import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MCP_PROMPTS, MCP_RESOURCES, MCP_TOOLS } from "@/data/mcp";

/** The MCP server the AI tools page documents, read as text. */
const SERVER = readFileSync(new URL("../../../../packages/ai/src/mcp/server.ts", import.meta.url), "utf8");
const PAGE = readFileSync(new URL("../../content/docs/en/ai-tools.mdx", import.meta.url), "utf8");

/** The text between the brace at `open` and its matching close, without either brace. */
function braceBody(text: string, open: number): string {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}" && --depth === 0) return text.slice(open + 1, i);
  }
  throw new Error("Unbalanced braces in server.ts");
}

/** The top-level entries of an object literal's body: each key with its value text. */
function entries(body: string): { key: string; value: string }[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < body.length; i++) {
    const char = body[i]!;
    if ("({[".includes(char)) depth++;
    else if (")}]".includes(char)) depth--;
    else if (char === "," && depth === 0) {
      parts.push(body.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(body.slice(start));
  // A key may be quoted. Anything else (a spread, a shorthand, a computed key) fails, so an argument is never skipped silently.
  return parts
    .filter((part) => part.trim() !== "")
    .map((part) => {
      const match = /^\s*(?:(\w+)|"([^"]+)"|'([^']+)')\s*:([\s\S]*)$/.exec(part);
      if (!match) throw new Error(`Cannot read this schema entry: ${part.trim()}`);
      const [, bare, double, single, value = ""] = match;
      return { key: bare ?? double ?? single ?? "", value };
    });
}

/** Every `server.<method>("name", …)` call: its name and the arguments of its `schemaKey` object, if any. */
function registered(method: string, schemaKey?: string): { name: string; args: string[]; optional: string[] }[] {
  return SERVER.split(`server.${method}(`)
    .slice(1)
    .map((chunk) => {
      const name = /^\s*"([^"]+)"/.exec(chunk)?.[1] ?? "";
      const at = schemaKey ? chunk.indexOf(`${schemaKey}: {`) : -1;
      const schema = at === -1 ? [] : entries(braceBody(chunk, chunk.indexOf("{", at)));
      return {
        name,
        args: schema.map((entry) => entry.key),
        optional: schema.filter((entry) => /\.optional\(\)/.test(entry.value)).map((entry) => entry.key),
      };
    });
}

describe("the schema reader", () => {
  it("reads bare and quoted keys, and refuses what it cannot read", () => {
    expect(entries(` component: z.string(), "slot": z.enum(["a", "b"]).optional(), `).map((entry) => entry.key)).toEqual(["component", "slot"]);
    expect(() => entries(" ...shared, limit: z.number() ")).toThrow(/Cannot read/);
  });
});

describe("MCP data", () => {
  it("documents every registered tool, with its arguments", () => {
    const tools = registered("registerTool", "inputSchema");
    expect(tools.map((tool) => tool.name)).toEqual([
      "list_components",
      "get_component_api",
      "list_slots",
      "get_slot",
      "get_adapter_example",
      "get_setup",
      "search_docs",
    ]);
    expect(MCP_TOOLS.map(({ name, args, optional = [] }) => ({ name, args, optional }))).toEqual(tools);
  });

  it("documents every registered prompt, with its arguments", () => {
    const prompts = registered("registerPrompt", "argsSchema");
    expect(prompts.find((prompt) => prompt.name === "adapt-slots-to-library")?.args).toEqual(["component", "library"]);
    expect(MCP_PROMPTS.map(({ name, args, optional = [] }) => ({ name, args, optional }))).toEqual(prompts);
  });

  it("documents every registered resource template", () => {
    const names = registered("registerResource").map((resource) => resource.name);
    const templates = [...SERVER.matchAll(/new ResourceTemplate\("([^"]+)"/g)].map(([, uri]) => uri);
    expect(templates).toHaveLength(names.length);
    expect(MCP_RESOURCES).toEqual(templates);
  });

  it("gives every tool and prompt a description", () => {
    for (const item of [...MCP_TOOLS, ...MCP_PROMPTS]) expect(item.description.length, item.name).toBeGreaterThan(20);
  });
});

describe("AI tools page", () => {
  it("has the sections other pages link to, in order", () => {
    const h2s = [...PAGE.matchAll(/^## (.+)$/gm)].map(([, text]) => text);
    expect(h2s).toEqual(["What", "Setup", "Tools", "Resources", "Prompts", "Versions"]);
  });

  it("starts the server the way the CLI expects", () => {
    const samples = ["claude-code.sh", "cursor.json", "vscode.json", "claude-desktop.json", "add.sh"].map((name) =>
      readFileSync(new URL(`../../../samples/ai/${name}`, import.meta.url), "utf8"),
    );
    const commands = [...[PAGE, ...samples].join("\n").matchAll(/npx (?:-y )?slotsmith-ai(?:@[\w.^~-]+)?(?: ([\w-]+))?/g)];
    expect(commands.length).toBeGreaterThan(0);
    for (const [command, subcommand] of commands) expect(["mcp", "add"], command).toContain(subcommand);
    for (const name of ["cursor.json", "vscode.json", "claude-desktop.json"]) {
      const config = JSON.parse(readFileSync(new URL(`../../../samples/ai/${name}`, import.meta.url), "utf8"));
      const server = (config.servers ?? config.mcpServers).slotsmith;
      expect(server, name).toMatchObject({ command: "npx", args: ["-y", "slotsmith-ai", "mcp"] });
    }
  });

  it("names every resource template", () => {
    for (const uri of MCP_RESOURCES) expect(PAGE).toContain(uri);
  });
});
