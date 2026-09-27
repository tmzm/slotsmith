import type { ComponentKnowledge, ComponentSummary, PropInfo, SlotInfo } from "./types";

/**
 * Table cell
 *
 * Escapes a value for a Markdown table: pipes would end the cell and
 * newlines would end the row.
 *
 * @param value - The raw text.
 * @returns Text safe inside one cell.
 */
const cell = (value: string): string => value.replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ").trim();

/**
 * Code cell
 *
 * Wraps a value in backticks for a table cell, choosing a fence long enough
 * for any backticks the value itself contains.
 *
 * @param value - The code.
 * @returns The inline code span, or an empty string for no value.
 */
const code = (value: string | undefined): string => {
  if (!value) return "";
  const text = cell(value);
  return text.includes("`") ? `\`\` ${text} \`\`` : `\`${text}\``;
};

/**
 * Default cell
 *
 * A stated default is either a value (`4`, `bottom`), shown as code, or a
 * sentence that already marks its own code (`` `true` in single mode ``),
 * shown as written.
 *
 * @param value - The default, if any.
 * @returns The cell content.
 */
const defaultCell = (value: string | undefined): string =>
  value?.includes("`") ? cell(value) : code(value);

/**
 * Peers line
 *
 * Lists a component's peer dependencies in one sentence.
 *
 * @param component - The component.
 * @returns A Markdown line.
 */
export function renderPeers(component: ComponentSummary): string {
  const required = component.requiredPeers.map((peer) => `\`${peer.name}@${peer.range}\``).join(", ");
  const optional = component.optionalPeers
    .map((peer) => `\`${peer.name}@${peer.range}\` (${peer.reason})`)
    .join(", ");
  return `Peers: ${required || "none"}${optional ? `. Optional: ${optional}` : ""}.`;
}

/**
 * Component list
 *
 * One row per component: what to import, and what else to install.
 *
 * @param components - The components to list.
 * @returns A Markdown table.
 */
export function renderComponentList(components: ComponentSummary[]): string {
  const rows = components.map((component) =>
    [
      `**${component.title}** (\`${component.name}\`)`,
      `\`import { ${component.exportName} } from "${component.entry}"\``,
      `\`import "${component.css}"\``,
      component.requiredPeers.map((peer) => `\`${peer.name}\``).join(", "),
      [
        ...component.optionalPeers.map((peer) => `\`${peer.name}\``),
        component.virtual ? `(\`${component.virtual.exportName}\`)` : "",
      ]
        .filter(Boolean)
        .join(" "),
      cell(component.summary),
    ].join(" | "),
  );
  return [
    "| Component | Import | CSS | Required peers | Optional peers | Summary |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows.map((row) => `| ${row} |`),
  ].join("\n");
}

/**
 * Prop table
 *
 * @param props - The props of one group.
 * @returns A Markdown table.
 */
const propTable = (props: PropInfo[]): string =>
  [
    "| Prop | Type | Default | Description |",
    "| --- | --- | --- | --- |",
    ...props.map(
      (prop) =>
        `| \`${prop.name}${prop.optional ? "?" : ""}\`${prop.mode ? ` (${prop.mode})` : ""} | ${code(prop.type)} | ${defaultCell(prop.default)} | ${cell(prop.description)} |`,
    ),
  ].join("\n");

/**
 * Component API
 *
 * The props of the assembled component, grouped as in the documentation,
 * followed by the controlled / uncontrolled pairs and the labels.
 *
 * @param component - The component.
 * @returns Markdown.
 */
export function renderComponentApi(component: ComponentKnowledge): string {
  const sections = [
    `# ${component.exportName} API`,
    `\`\`\`tsx\nimport { ${component.exportName}, type ${component.propsType} } from "${component.entry}";\nimport "${component.css}";\n\`\`\``,
  ];

  for (const group of component.groups) {
    const props = component.props.filter((prop) => prop.group === group);
    if (props.length > 0) sections.push(`## ${group}\n\n${propTable(props)}`);
  }

  sections.push(
    `Any other prop is forwarded to the root \`<${component.rootElement}>\`.`,
  );

  if (component.controlledPairs.length > 0) {
    sections.push(
      [
        "## Controlled and uncontrolled state",
        "",
        "Each piece of state is uncontrolled until its value prop is passed. Pass the value and its change callback together to control it, or the default alone to seed it.",
        "",
        "| Value | Default | Change callback |",
        "| --- | --- | --- |",
        ...component.controlledPairs.map(
          (pair) => `| \`${pair.value}\` | ${code(pair.defaultValue)} | ${code(pair.onChange)} |`,
        ),
      ].join("\n"),
    );
  }

  sections.push(renderLabels(component));
  sections.push(
    [
      "## Recomposing",
      "",
      `\`${component.exportName}\` is assembled from exported parts, so a layout can be rebuilt without losing behaviour: ${[`${component.exportName}Provider`, `${component.exportName}Root`, ...component.parts].map((part) => `\`${part}\``).join(", ")}. The headless hook is \`${component.hook}\`.`,
    ].join("\n"),
  );

  return sections.join("\n\n");
}

/**
 * Labels
 *
 * Every user-facing string with its English default.
 *
 * @param component - The component.
 * @returns Markdown.
 */
export function renderLabels(component: ComponentKnowledge): string {
  return [
    "## Labels",
    "",
    `Every user-facing string is a key of \`labels\` (\`Partial<${component.labelsType}>\`); the English defaults are exported as \`${component.labelsExport}\`.`,
    "",
    "| Label | Type | Default | Description |",
    "| --- | --- | --- | --- |",
    ...component.labels.map(
      (label) => `| \`${label.name}\` | ${code(label.type)} | ${code(label.default)} | ${cell(label.description)} |`,
    ),
  ].join("\n");
}

/**
 * Slot list
 *
 * @param component - The component.
 * @returns A Markdown table of every slot.
 */
export function renderSlotList(component: ComponentKnowledge): string {
  return [
    `# ${component.exportName} slots`,
    "",
    `Pass replacements as \`components={{ … }}\` (\`Partial<${component.componentsType}>\`). Element slots receive DOM props with state as \`data-*\` attributes — spread them onto a library primitive. Widget slots receive semantic props and need a short adapter.`,
    "",
    "| Slot | Kind | Props type | Summary |",
    "| --- | --- | --- | --- |",
    ...component.slots.map(
      (slot) => `| \`${slot.name}\` | ${slot.kind} | \`${slot.propsType}\` | ${cell(slot.summary || slot.title)} |`,
    ),
  ].join("\n");
}

/**
 * Slot snippet
 *
 * A starting point for replacing one slot: a typed component that receives
 * exactly what the fallback receives, and the prop that installs it.
 *
 * @param component - The component.
 * @param slot - The slot.
 * @returns TSX source.
 */
export function renderSlotSnippet(component: ComponentKnowledge, slot: SlotInfo): string {
  const name = `My${slot.name}`;
  const imports = `import { ${component.exportName}, type ${slot.propsType} } from "${component.entry}";`;

  if (slot.kind === "element") {
    return [
      imports,
      "",
      `// Spread every prop: they carry the ref, ARIA attributes, handlers and data-* state.`,
      `const ${name} = (props: ${slot.propsType}) => <YourPrimitive {...props} />;`,
      "",
      `<${component.exportName} components={{ ${slot.name}: ${name} }} />;`,
    ].join("\n");
  }

  const fields = slot.props.map((prop) => prop.name).filter((prop) => /^[A-Za-z_$][\w$]*$/.test(prop));
  const quoted = slot.props.filter((prop) => !/^[A-Za-z_$][\w$]*$/.test(prop.name));
  const destructured = [...fields, ...(quoted.length > 0 ? ["...rest"] : [])].join(", ");
  return [
    imports,
    "",
    `const ${name} = ({ ${destructured} }: ${slot.propsType}) => (`,
    `  // Render your own markup from the props above.${quoted.length > 0 ? ` Spread \`rest\` for ${quoted.map((prop) => `\`${prop.name}\``).join(", ")}.` : ""}`,
    "  <YourWidget />",
    ");",
    "",
    `<${component.exportName} components={{ ${slot.name}: ${name} }} />;`,
  ].join("\n");
}

/**
 * Slot
 *
 * Everything about one slot: what it receives, its fallback, and how to
 * replace it.
 *
 * @param component - The component.
 * @param slot - The slot.
 * @returns Markdown.
 */
export function renderSlot(component: ComponentKnowledge, slot: SlotInfo): string {
  const sections = [
    `# ${component.exportName} \`${slot.name}\` slot`,
    `**${slot.kind === "element" ? "Element" : "Widget"} slot** · props type \`${slot.propsType}\`${slot.domType ? ` (extends \`${slot.domType}\`)` : ""}`,
    slot.summary || slot.title,
  ];

  if (slot.dataAttributes.length > 0) {
    sections.push(`State attributes: ${slot.dataAttributes.map((attribute) => `\`${attribute}\``).join(", ")}.`);
  }

  if (slot.props.length > 0) {
    sections.push(
      [
        slot.kind === "element" ? "## Props (on top of the DOM attributes)" : "## Props",
        "",
        "| Prop | Type | Description |",
        "| --- | --- | --- |",
        ...slot.props.map(
          (prop) => `| \`${prop.name}${prop.optional ? "?" : ""}\` | ${code(prop.type)} | ${cell(prop.description)} |`,
        ),
      ].join("\n"),
    );
  }

  sections.push(`## Fallback\n\n\`\`\`tsx\n${slot.fallback}\n\`\`\``);
  sections.push(`## Replacing it\n\n\`\`\`tsx\n${renderSlotSnippet(component, slot)}\n\`\`\``);
  return sections.join("\n\n");
}

/**
 * Component reference
 *
 * The whole component on one page: what it is, how to import it, its API
 * and its slots.
 *
 * @param component - The component.
 * @returns Markdown.
 */
export function renderComponentReference(component: ComponentKnowledge): string {
  const sections = [
    `# ${component.title} (\`${component.name}\`)`,
    component.description,
    [
      "```tsx",
      `import { ${component.exportName} } from "${component.entry}";`,
      `import "${component.css}";`,
      "```",
    ].join("\n"),
    renderPeers(component),
  ];
  if (component.virtual) {
    sections.push(
      `For long lists, \`${component.virtual.exportName}\` from \`${component.virtual.entry}\` renders only what is in view and keeps every slot working.`,
    );
  }
  if (component.example) sections.push(`## Example\n\n\`\`\`tsx\n${component.example}\n\`\`\``);
  sections.push(renderComponentApi(component).replace(/^# /, "## ").replace(/\n## /g, "\n### "));
  sections.push(renderSlotList(component).replace(/^# /, "## "));
  return sections.join("\n\n");
}
