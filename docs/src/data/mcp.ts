/**
 * MCP server reference
 *
 * What the `slotsmith-ai` MCP server offers, for the AI tools page: its
 * tools, prompts and resource templates. Names and arguments mirror
 * `packages/ai/src/mcp/server.ts`, and `__tests__/mcp.test.ts` parses that
 * file, so a tool, prompt or argument added to the server without a line
 * here fails the docs tests. The descriptions are written for people.
 */

/**
 * MCP tool
 *
 * One tool the server registers.
 */
export interface McpTool {
  name: string;
  /** What the tool returns, in a sentence. */
  description: string;
  /** Its arguments, in the server's order. */
  args: string[];
  /** The arguments that may be left out. */
  optional?: string[];
}

/**
 * MCP prompt
 *
 * One prompt the server registers.
 */
export interface McpPrompt {
  name: string;
  /** What the prompt asks the agent to do. */
  description: string;
  /** Its arguments, in the server's order. */
  args: string[];
  /** The arguments that may be left out. */
  optional?: string[];
}

/** The server's tools, in the order it registers them. */
export const MCP_TOOLS: McpTool[] = [
  {
    name: "list_components",
    description: "Every component with its entry point, CSS import, required and optional peers and a one-line summary, plus the locale packs.",
    args: [],
  },
  {
    name: "get_component_api",
    description: "A component's props grouped as in these docs, with types and defaults, the controlled and uncontrolled pairs, and every label.",
    args: ["component"],
  },
  {
    name: "list_slots",
    description: "A component's replaceable parts: each slot's name, kind (element or widget), props type and summary.",
    args: ["component"],
  },
  {
    name: "get_slot",
    description: "One slot: the props it receives, its fallback markup, and a snippet that replaces it.",
    args: ["component", "slot"],
  },
  {
    name: "get_adapter_example",
    description: "A ready-made `components` map that renders the component with a library's primitives.",
    args: ["component", "library"],
  },
  {
    name: "get_setup",
    description: "The install command, the imports, the CSS import, and notes for Next.js, Vite or Remix.",
    args: ["component", "framework", "virtual"],
    optional: ["framework", "virtual"],
  },
  {
    name: "search_docs",
    description: "Ranked matches across props, slots, labels, guides and adapters, each with the resource or tool call to read next.",
    args: ["query", "limit"],
    optional: ["limit"],
  },
];

/** The server's prompts, in the order it registers them. */
export const MCP_PROMPTS: McpPrompt[] = [
  {
    name: "build-component",
    description: "Build a feature with a component, from its real API. With a library, the prompt includes that library's adapter.",
    args: ["component", "library"],
    optional: ["library"],
  },
  {
    name: "adapt-slots-to-library",
    description: "Write a `components` map that renders a component with a library's primitives, starting from the ready-made adapter.",
    args: ["component", "library"],
  },
];

/** The server's resource templates, in the order it registers them. */
export const MCP_RESOURCES: string[] = ["slotsmith://components/{name}", "slotsmith://guides/{name}"];
