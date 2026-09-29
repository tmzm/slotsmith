import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult, GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import packageJson from "../../package.json";
import { adaptersFor, loadKnowledge, type Knowledge } from "../knowledge/load";
import {
  renderComponentApi,
  renderComponentList,
  renderComponentReference,
  renderSlot,
  renderSlotList,
  renderSlotSnippet,
} from "../knowledge/markdown";
import { buildSearchIndex, search } from "../knowledge/search";
import { LIBRARIES, type ComponentKnowledge } from "../knowledge/types";
import { buildSetup, FRAMEWORKS, renderSetup } from "./setup";
import { findInstalledVersion, versionWarning } from "./version";

/**
 * Server options
 */
export interface SlotsmithServerOptions {
  /** The knowledge to answer from. Defaults to the generated knowledge shipped with the package. */
  knowledge?: Knowledge;
  /** Where to look for the project's installed slotsmith. Defaults to `process.cwd()`. */
  cwd?: string;
  /** The project's slotsmith version. Defaults to the one found under `cwd`. */
  installedVersion?: string;
}

/** Display names for the libraries adapters are written for. */
const LIBRARY_NAMES: Record<(typeof LIBRARIES)[number], string> = {
  mui: "MUI",
  shadcn: "shadcn/ui",
  chakra: "Chakra UI",
  antd: "Ant Design",
  radix: "Radix Themes",
};

/**
 * Create slotsmith server
 *
 * Builds the MCP server: seven tools, the component and guide resources, and
 * two prompts, all answered from the generated knowledge. Connect it to any
 * transport; the CLI uses stdio.
 *
 * @param options - See {@link SlotsmithServerOptions}.
 * @returns The server, not yet connected.
 *
 * @example
 * ```ts
 * const server = createSlotsmithServer();
 * await server.connect(new StdioServerTransport());
 * ```
 */
export function createSlotsmithServer(options: SlotsmithServerOptions = {}): McpServer {
  const knowledge = options.knowledge ?? loadKnowledge();
  const installed = options.installedVersion ?? findInstalledVersion(options.cwd ?? process.cwd());
  const warning = versionWarning(installed, knowledge.index.version);
  const searchIndex = buildSearchIndex(knowledge);

  const names = knowledge.index.components.map((component) => component.name) as [string, ...string[]];
  const componentInput = z.enum(names).describe(`The component: ${names.join(", ")}.`);
  const libraryInput = z.enum(LIBRARIES).describe(`The component library: ${LIBRARIES.join(", ")}.`);

  const component = (name: string): ComponentKnowledge => knowledge.components.get(name)!;

  /**
   * Result
   *
   * A tool result: Markdown for the model to read, and the same facts as
   * structured content for clients that consume JSON. The version warning,
   * when there is one, leads both.
   */
  const result = (markdown: string, data: Record<string, unknown>): CallToolResult => ({
    content: [{ type: "text", text: warning ? `> ${warning}\n\n${markdown}` : markdown }],
    structuredContent: warning ? { warning, ...data } : data,
  });

  /** A tool failure the model can recover from, e.g. an unknown slot name. */
  const failure = (message: string): CallToolResult => ({
    content: [{ type: "text", text: warning ? `> ${warning}\n\n${message}` : message }],
    isError: true,
  });

  const server = new McpServer(
    { name: "slotsmith", title: "slotsmith", version: packageJson.version },
    {
      instructions: [
        `slotsmith ${knowledge.index.version} is a headless React component library (${names.join(", ")}): every part is a replaceable slot with a finished, accessible fallback.`,
        "Before writing slotsmith code, call get_component_api for props and list_slots / get_slot for parts; do not guess prop names.",
        "Element slots receive DOM props (spread them onto a primitive); widget slots receive semantic props (write a small adapter).",
        "Use get_adapter_example for ready-made MUI, shadcn/ui, Chakra UI, Ant Design and Radix Themes slot maps, and get_setup for install and import lines.",
      ].join(" "),
    },
  );

  server.registerTool(
    "list_components",
    {
      title: "List components",
      description:
        "List every slotsmith component with its entry point, CSS import, required and optional peer dependencies, and a one-line summary.",
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    () =>
      result(
        [
          `# slotsmith ${knowledge.index.version} components`,
          renderComponentList(knowledge.index.components),
          `Locale packs available (\`slotsmith/locales/<code>\`): ${knowledge.index.locales.join(", ")}. See the i18n guide for the provider and \`defineLocale\`.`,
        ].join("\n\n"),
        {
          version: knowledge.index.version,
          components: knowledge.index.components,
          locales: knowledge.index.locales,
        },
      ),
  );

  server.registerTool(
    "get_component_api",
    {
      title: "Get component API",
      description:
        "Get a component's props grouped as in the documentation, with types, defaults, the controlled / uncontrolled pairs and every label.",
      inputSchema: { component: componentInput },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ component: name }) => {
      const found = component(name);
      return result(renderComponentApi(found), {
        component: found.name,
        exportName: found.exportName,
        propsType: found.propsType,
        entry: found.entry,
        groups: found.groups,
        props: found.props,
        controlledPairs: found.controlledPairs,
        rootElement: found.rootElement,
        labels: found.labels,
        hook: found.hook,
        parts: found.parts,
      });
    },
  );

  server.registerTool(
    "list_slots",
    {
      title: "List slots",
      description: "List a component's replaceable parts (slots): name, kind (element or widget), props type and summary.",
      inputSchema: { component: componentInput },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ component: name }) => {
      const found = component(name);
      return result(renderSlotList(found), {
        component: found.name,
        componentsType: found.componentsType,
        slots: found.slots.map(({ name: slot, kind, propsType, title, summary }) => ({ name: slot, kind, propsType, title, summary })),
      });
    },
  );

  server.registerTool(
    "get_slot",
    {
      title: "Get slot",
      description:
        "Get one slot of a component: the props it receives, its fallback markup, and a snippet that replaces it.",
      inputSchema: {
        component: componentInput,
        slot: z.string().min(1).describe("The slot name as used in `components`, e.g. `Day` or `Checkbox`."),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ component: name, slot: slotName }) => {
      const found = component(name);
      const slot = found.slots.find((entry) => entry.name.toLowerCase() === slotName.toLowerCase());
      if (!slot) {
        return failure(
          `${found.exportName} has no slot named "${slotName}". Its slots are: ${found.slots.map((entry) => entry.name).join(", ")}.`,
        );
      }
      return result(renderSlot(found, slot), {
        component: found.name,
        ...slot,
        snippet: renderSlotSnippet(found, slot),
      });
    },
  );

  server.registerTool(
    "get_adapter_example",
    {
      title: "Get adapter example",
      description:
        "Get a ready-made `components` map that renders a slotsmith component with a component library's primitives (mui, shadcn, chakra, antd or radix). `radix` is Radix Themes (`@radix-ui/themes`); an app on the bare Radix primitives is served by `shadcn`, which is built on them.",
      inputSchema: { component: componentInput, library: libraryInput },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ component: name, library }) => {
      const found = component(name);
      const available = adaptersFor(knowledge, found.name);
      const adapter = available.find((entry) => entry.library === library);
      if (!adapter) {
        const others = available.map((entry) => `${entry.library} (${LIBRARY_NAMES[entry.library]})`);
        return result(
          [
            `No ${LIBRARY_NAMES[library]} adapter yet for ${found.title}.`,
            others.length > 0
              ? `Adapters that exist for ${found.title}: ${others.join(", ")}. Call get_adapter_example with one of them as a reference for the shape.`
              : `No adapters exist for ${found.title} yet.`,
            `To write one, call list_slots for the ${found.slots.length} slots: element slots take the library's primitive with the props spread onto it, widget slots need a small adapter (get_slot shows the props and the fallback of each).`,
          ].join("\n\n"),
          { component: found.name, library, found: false, available: available.map((entry) => entry.library) },
        );
      }
      const source = knowledge.adapters.get(adapter.file) ?? "";
      const exported = /export const (\w+)/.exec(source)?.[1] ?? "components";
      return result(
        [
          `# ${found.exportName} adapter for ${LIBRARY_NAMES[library]}`,
          `Copy this file into the project, keep the parts you want, and pass the map as \`<${found.exportName} components={${exported}} />\`. Slots it leaves out keep their fallbacks.`,
          `\`\`\`tsx\n${source.trimEnd()}\n\`\`\``,
        ].join("\n\n"),
        { component: found.name, library, found: true, file: adapter.file, exportName: exported, source },
      );
    },
  );

  server.registerTool(
    "get_setup",
    {
      title: "Get setup",
      description:
        "Get what a project needs to start using a component: the install command, imports, the CSS import, and framework notes (next, vite or remix).",
      inputSchema: {
        component: componentInput,
        framework: z.enum(FRAMEWORKS).optional().describe(`The application framework: ${FRAMEWORKS.join(", ")}.`),
        virtual: z.boolean().optional().describe("Whether the windowed variant from `slotsmith/virtual` is wanted."),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ component: name, framework, virtual }) => {
      const found = component(name);
      const setup = buildSetup(knowledge, found, { framework, virtual });
      return result(renderSetup(setup, found), { ...setup });
    },
  );

  server.registerTool(
    "search_docs",
    {
      title: "Search docs",
      description:
        "Search every prop, slot, label, guide and adapter. Returns ranked matches with anchors (resource URIs or tool calls) to read next.",
      inputSchema: {
        query: z.string().trim().min(1).describe("Free text, e.g. `range preview` or `disable weekends`."),
        limit: z.number().int().min(1).max(25).optional().describe("The most results to return. Defaults to 8."),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ query, limit }) => {
      const matches = search(searchIndex, query, limit ?? 8);
      const markdown =
        matches.length === 0
          ? `No matches for "${query}". Try a prop or slot name, or call list_components.`
          : [
              `# Results for "${query}"`,
              ...matches.map((match, index) => `${index + 1}. **${match.title}** — \`${match.anchor}\`\n   ${match.snippet}`),
            ].join("\n\n");
      return result(markdown, { query, results: matches });
    },
  );

  server.registerResource(
    "component",
    new ResourceTemplate("slotsmith://components/{name}", {
      list: () => ({
        resources: knowledge.index.components.map((entry) => ({
          uri: `slotsmith://components/${entry.name}`,
          name: entry.name,
          title: `${entry.title} reference`,
          description: entry.summary,
          mimeType: "text/markdown",
        })),
      }),
      complete: { name: (value) => names.filter((entry) => entry.startsWith(value)) },
    }),
    {
      title: "Component reference",
      description: "A component's full reference: import, API, labels and slots.",
      mimeType: "text/markdown",
    },
    (uri, { name }) => {
      const found = knowledge.components.get(String(name));
      if (!found) throw new Error(`Unknown component "${String(name)}". Components: ${names.join(", ")}.`);
      return { contents: [{ uri: uri.href, mimeType: "text/markdown", text: renderComponentReference(found) }] };
    },
  );

  server.registerResource(
    "guide",
    new ResourceTemplate("slotsmith://guides/{name}", {
      list: () => ({
        resources: knowledge.index.guides.map((guide) => ({
          uri: `slotsmith://guides/${guide.name}`,
          name: guide.name,
          title: guide.title,
          mimeType: "text/markdown",
        })),
      }),
      complete: { name: (value) => knowledge.index.guides.map((guide) => guide.name).filter((guide) => guide.startsWith(value)) },
    }),
    {
      title: "Guide",
      description: "A hand-written guide: setup, slots, theming, i18n, adapters, or one per component.",
      mimeType: "text/markdown",
    },
    (uri, { name }) => {
      const text = knowledge.guides.get(String(name));
      if (text === undefined) {
        throw new Error(`Unknown guide "${String(name)}". Guides: ${[...knowledge.guides.keys()].join(", ")}.`);
      }
      return { contents: [{ uri: uri.href, mimeType: "text/markdown", text }] };
    },
  );

  /**
   * Adapter context
   *
   * The adapter for a library when there is one, or the closest reference
   * when there is not, as prompt text.
   */
  const adapterContext = (found: ComponentKnowledge, library: string | undefined): string => {
    if (!library || library === "none") return "";
    const available = adaptersFor(knowledge, found.name);
    const exact = available.find((entry) => entry.library === library);
    const reference = exact ?? available[0];
    if (!reference) return `There is no ready-made adapter for ${found.title} yet.`;
    const source = knowledge.adapters.get(reference.file) ?? "";
    return [
      exact
        ? `A ready-made ${LIBRARY_NAMES[exact.library]} adapter exists; start from it:`
        : `There is no ${LIBRARY_NAMES[library as keyof typeof LIBRARY_NAMES] ?? library} adapter yet. For the shape, here is the ${LIBRARY_NAMES[reference.library]} one:`,
      `\`\`\`tsx\n${source.trimEnd()}\n\`\`\``,
    ].join("\n\n");
  };

  server.registerPrompt(
    "build-component",
    {
      title: "Build with a slotsmith component",
      description: "Build a feature with a slotsmith component, optionally styled with a component library.",
      argsSchema: {
        component: componentInput,
        library: z
          .enum([...LIBRARIES, "none"])
          .optional()
          .describe("The component library the project uses, or none for the built-in fallbacks."),
      },
    },
    ({ component: name, library }): GetPromptResult => {
      const found = component(name);
      const text = [
        `Build the feature I describe next with the slotsmith ${found.title} (\`${found.exportName}\` from \`${found.entry}\`).`,
        "Rules:",
        [
          `- Import from \`${found.entry}\` and import \`${found.css}\` once unless every part is replaced.`,
          "- Use only the props and slots in the reference below; do not invent any.",
          "- Leave state uncontrolled unless the feature needs to read or drive it; then pass the value and its change callback together.",
          "- Element slots: spread every prop onto the primitive. Widget slots: render from the semantic props and keep the accessible names.",
          "- Put every user-facing string in `labels`.",
        ].join("\n"),
        renderComponentReference(found),
        adapterContext(found, library),
      ]
        .filter(Boolean)
        .join("\n\n");
      return { messages: [{ role: "user", content: { type: "text", text } }] };
    },
  );

  server.registerPrompt(
    "adapt-slots-to-library",
    {
      title: "Adapt slots to a library",
      description: "Write a `components` map that renders a slotsmith component with a component library's primitives.",
      argsSchema: {
        component: componentInput,
        library: libraryInput,
      },
    },
    ({ component: name, library }): GetPromptResult => {
      const found = component(name);
      const text = [
        `Write a \`Partial<${found.componentsType}>\` map that renders the slotsmith ${found.title} with ${LIBRARY_NAMES[library]} primitives, in a file the project can import.`,
        [
          "- Element slots receive DOM props with state as `data-*` attributes: pass the library primitive and spread every prop, including the ref.",
          "- Widget slots receive semantic props: write a small component that renders the library's control from them.",
          "- Style state from the `data-*` attributes, not from class names.",
          "- Leave out any slot the library has no better answer for; its fallback keeps working.",
        ].join("\n"),
        renderSlotList(found),
        ...found.slots.filter((slot) => slot.kind === "widget").map((slot) => renderSlot(found, slot).replace(/^# /, "## ")),
        adapterContext(found, library),
      ]
        .filter(Boolean)
        .join("\n\n");
      return { messages: [{ role: "user", content: { type: "text", text } }] };
    },
  );

  return server;
}
