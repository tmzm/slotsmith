import type { Knowledge } from "../knowledge/load";
import type { ComponentKnowledge } from "../knowledge/types";

/**
 * Framework
 *
 * The application frameworks `get_setup` has notes for.
 */
export const FRAMEWORKS = ["next", "vite", "remix"] as const;

/**
 * Framework name
 *
 * One of {@link FRAMEWORKS}.
 */
export type Framework = (typeof FRAMEWORKS)[number];

/** The `setup` guide heading that holds each framework's notes. */
const FRAMEWORK_HEADINGS: Record<Framework, string> = { next: "Next.js", vite: "Vite", remix: "Remix" };

/**
 * Setup
 *
 * What an application needs to start using one component.
 */
export interface Setup {
  component: string;
  framework?: Framework;
  virtual: boolean;
  /** The packages to install. */
  packages: string[];
  /** The install command, with npm. */
  install: string;
  /** The import lines. */
  imports: string[];
  /** The stylesheet import. */
  css: string;
  /** A minimal usage line. */
  usage: string;
  /** Things worth knowing, in order of importance. */
  notes: string[];
  /** The framework's section of the setup guide. */
  frameworkNotes?: string;
}

/**
 * Guide section
 *
 * @param markdown - A guide.
 * @param heading - A `##` heading in it.
 * @returns The section's body, without its heading.
 */
function guideSection(markdown: string, heading: string): string | undefined {
  const section = markdown.split(/^(?=## )/m).find((part) => part.startsWith(`## ${heading}\n`));
  return section?.slice(`## ${heading}\n`.length).trim();
}

/** A minimal usage line per component. */
const USAGE: Record<string, (name: string) => string> = {
  "data-table": (name) => `<${name} data={rows} columns={columns} />`,
  autocomplete: (name) => `<${name} options={options} value={value} onChange={setValue} />`,
  "date-picker": (name) => `<${name} value={date} onChange={setDate} />`,
  "file-uploader": (name) => `<${name} multiple upload={upload} onUrlsChange={setUrls} />`,
};

/**
 * Build setup
 *
 * @param knowledge - The knowledge.
 * @param component - The component.
 * @param options - The framework, and whether the windowed variant is wanted.
 * @returns The setup, as data.
 */
export function buildSetup(
  knowledge: Knowledge,
  component: ComponentKnowledge,
  options: { framework?: Framework; virtual?: boolean },
): Setup {
  const notes: string[] = [];
  const wantsVirtual = options.virtual === true;
  const virtual = wantsVirtual && component.virtual !== undefined;
  if (wantsVirtual && !component.virtual) {
    notes.push(`${component.title} has no virtual variant; use \`${component.exportName}\` from \`${component.entry}\`.`);
  }

  const peers = component.requiredPeers.filter((peer) => peer.name !== "react" && peer.name !== "react-dom");
  const packages = [
    "slotsmith",
    ...peers.map((peer) => peer.name),
    ...(virtual ? component.optionalPeers.map((peer) => peer.name) : []),
  ];

  const name = virtual ? component.virtual!.exportName : component.exportName;
  const imports = [
    virtual
      ? `import { ${name} } from "${component.virtual!.entry}";`
      : `import { ${name} } from "${component.entry}";`,
  ];

  notes.push("Requires React 18 or 19.");
  for (const peer of peers) notes.push(`\`${peer.name}@${peer.range}\` is required: ${peer.reason}.`);
  if (component.virtual && !virtual) {
    notes.push(
      `For long lists, \`${component.virtual.exportName}\` from \`${component.virtual.entry}\` renders only what is in view; it needs ${component.optionalPeers.map((peer) => `\`${peer.name}\``).join(", ")}.`,
    );
  }
  notes.push(
    'Every entry point starts with "use client". In a Server Components framework, render the component from a client component that owns its state.',
    `The stylesheet is optional: it styles only the built-in fallbacks. \`slotsmith/styles.css\` covers every component; \`${component.css}\` covers just this one.`,
  );

  const setupGuide = knowledge.guides.get("setup");
  const frameworkNotes =
    options.framework && setupGuide ? guideSection(setupGuide, FRAMEWORK_HEADINGS[options.framework]) : undefined;

  return {
    component: component.name,
    framework: options.framework,
    virtual,
    packages,
    install: `npm i ${packages.join(" ")}`,
    imports,
    css: `import "${component.css}";`,
    usage: (USAGE[component.name] ?? ((exportName: string) => `<${exportName} />`))(name),
    notes,
    frameworkNotes,
  };
}

/**
 * Render setup
 *
 * @param setup - From {@link buildSetup}.
 * @param component - The component.
 * @returns Markdown.
 */
export function renderSetup(setup: Setup, component: ComponentKnowledge): string {
  const sections = [
    `# Setting up ${component.title}${setup.framework ? ` with ${FRAMEWORK_HEADINGS[setup.framework]}` : ""}`,
    `## Install\n\n\`\`\`bash\n${setup.install}\n# or: pnpm add ${setup.packages.join(" ")}\n\`\`\``,
    `## Import\n\n\`\`\`tsx\n${[...setup.imports, setup.css, "", `${setup.usage};`].join("\n")}\n\`\`\``,
    `## Notes\n\n${setup.notes.map((note) => `- ${note}`).join("\n")}`,
  ];
  if (setup.frameworkNotes && setup.framework) {
    sections.push(`## ${FRAMEWORK_HEADINGS[setup.framework]}\n\n${setup.frameworkNotes}`);
  }
  return sections.join("\n\n");
}
