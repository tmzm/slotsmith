/**
 * Knowledge generator
 *
 * Reads the library source with the TypeScript compiler API and writes what
 * an agent needs to use each component: props with their types and defaults,
 * every slot with its props and fallback, and every label. The output lands
 * in `knowledge/components/` next to the hand-written guides, the adapters
 * are generated from the tested integration skins into `knowledge/adapters/`,
 * and `knowledge/index.json` ties them together.
 *
 * Everything is derived from the source, so the knowledge cannot describe a
 * prop or a slot the library does not have. The one hand-maintained input is
 * `knowledge/groups.json`, which orders the props into the same groups the
 * documentation uses.
 *
 * Run with `node scripts/generate.ts`; it also runs before every build.
 *
 * @packageDocumentation
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { renderComponentReference } from "../src/knowledge/markdown.ts";
import { LIBRARIES } from "../src/knowledge/types.ts";
import type {
  AdapterRef,
  ComponentKnowledge,
  ComponentName,
  ControlledPair,
  GuideSummary,
  KnowledgeIndex,
  LabelInfo,
  Library,
  MemberInfo,
  PeerDependency,
  PropInfo,
  SlotInfo,
} from "../src/knowledge/types.ts";
import { peersOf, toAdapterSource } from "./adapters.ts";

/**
 * Generator options
 */
export interface GenerateOptions {
  /** The slotsmith package root: the folder holding `package.json` and `src/`. */
  libraryRoot: string;
  /** The folder holding `guides/` and `groups.json`, and receiving `adapters/`. */
  knowledgeDir: string;
}

/**
 * Generated knowledge
 */
export interface GeneratedKnowledge {
  /** The table of contents. */
  index: KnowledgeIndex;
  /** Every component, in full. */
  components: ComponentKnowledge[];
  /** Every adapter's source, by file name under `knowledge/adapters/`. */
  adapters: Map<string, string>;
}

/**
 * Parsed doc comment
 *
 * A JSDoc block split the way the library writes them: a title line, a
 * description, and tags.
 */
interface ParsedDoc {
  title: string;
  description: string;
  tags: { name: string; text: string }[];
}

/** The group any prop missing from `groups.json` falls into. */
const OTHER_GROUP = "Other";

/**
 * Pascal case
 *
 * @param name - A kebab-case folder name, e.g. `date-picker`.
 * @returns `DatePicker`.
 */
const pascal = (name: string): string =>
  name.replace(/(^|-)([a-z])/g, (_, __, letter: string) => letter.toUpperCase());

/**
 * Human title
 *
 * @param name - A kebab-case folder name, e.g. `date-picker`.
 * @returns `Date picker`.
 */
const humanTitle = (name: string): string => {
  const words = name.split("-").join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/**
 * Dedent
 *
 * Removes the indentation every non-empty line shares, so a nested
 * declaration reads as if it were written at the top level.
 *
 * @param text - Source text.
 * @returns The same text, flush left.
 */
const dedent = (text: string): string => {
  const lines = text.split(/\r?\n/);
  const rest = lines.slice(1).filter((line) => line.trim().length > 0);
  const indent = Math.min(...rest.map((line) => /^ */.exec(line)?.[0].length ?? 0), Infinity);
  if (!Number.isFinite(indent) || indent === 0) return lines.join("\n");
  return [lines[0], ...lines.slice(1).map((line) => line.slice(Math.min(indent, /^ */.exec(line)?.[0].length ?? 0)))].join("\n");
};

/**
 * Parse doc
 *
 * Splits a raw `/** … *\/` block into title, description and tags.
 *
 * @param raw - The comment, delimiters included.
 * @returns The parsed parts.
 */
function parseDoc(raw: string): ParsedDoc {
  const body = raw
    .replace(/^\/\*\*/, "")
    .replace(/\*\/$/, "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\* ?/, ""));

  const text: string[] = [];
  const tags: { name: string; text: string }[] = [];
  let inFence = false;
  for (const line of body) {
    if (line.trim().startsWith("```")) inFence = !inFence;
    const tag = !inFence && /^@(\w+)\s?(.*)$/.exec(line.trim());
    if (tag) tags.push({ name: tag[1]!, text: tag[2] ?? "" });
    else if (tags.length > 0) tags[tags.length - 1]!.text += `\n${line}`;
    else text.push(line);
  }

  const joined = text.join("\n").trim();
  const [title = "", ...rest] = joined.split(/\n\s*\n/);
  return {
    title: title.replace(/\s*\n\s*/g, " ").trim(),
    description: rest.join("\n\n").trim(),
    tags: tags.map((tag) => ({ name: tag.name, text: tag.text.trim() })),
  };
}

/**
 * Leading doc
 *
 * The JSDoc block directly above a node, raw.
 *
 * @param node - A declaration.
 * @returns The comment, or `undefined` when there is none.
 */
function leadingDoc(node: ts.Node): string | undefined {
  const docs = (node as { jsDoc?: ts.JSDoc[] }).jsDoc;
  const last = docs?.[docs.length - 1];
  return last?.getText();
}

/**
 * Member description
 *
 * The prose of a member's JSDoc, with `{@link X}` flattened to `X`.
 *
 * @param node - A property signature.
 * @returns The description, or an empty string.
 */
function memberDescription(node: ts.Node): string {
  const docs = (node as { jsDoc?: ts.JSDoc[] }).jsDoc;
  if (!docs?.length) return "";
  return docs
    .map((doc) => ts.getTextOfJSDocComment(doc.comment) ?? "")
    .join("\n")
    .replace(/\{@link\s+([^}|\s]+)(?:\s*\|\s*[^}]*)?\}/g, "$1")
    .replace(/\s*\n\s*/g, " ")
    .trim();
}

/**
 * Stated default
 *
 * Reads the default a description states in the library's convention,
 * "Defaults to `x`." or "Defaults to 4.".
 *
 * @param description - A prop's description.
 * @returns The default as written, or `undefined`.
 */
function statedDefault(description: string): string | undefined {
  const match = /Defaults to (.+?)(?:\.(?:\s|$)|$)/.exec(description);
  if (!match) return undefined;
  const value = match[1]!.trim();
  // A single code span is unwrapped; anything longer is kept as prose.
  return /^`[^`]*`$/.test(value) ? value.slice(1, -1) : value;
}

/**
 * First sentence
 *
 * @param text - Prose.
 * @returns Everything up to the first full stop that ends a sentence.
 */
const firstSentence = (text: string): string => {
  const flat = text.replace(/\s*\n\s*/g, " ").trim();
  const match = /^(.+?[.!?])(\s|$)/.exec(flat);
  return match ? match[1]! : flat;
};

/**
 * Property name
 *
 * @param name - A property name node.
 * @returns Its text, without quotes.
 */
const propertyName = (name: ts.PropertyName): string =>
  ts.isStringLiteral(name) || ts.isIdentifier(name) ? name.text : name.getText();

/**
 * Members of
 *
 * The property signatures a type literal or interface declares itself.
 *
 * @param members - The members to read.
 * @returns One entry per property.
 */
function membersOf(members: ts.NodeArray<ts.TypeElement>): MemberInfo[] {
  return members.filter(ts.isPropertySignature).map((member) => ({
    name: propertyName(member.name),
    type: member.type ? member.type.getText().replace(/\s*\n\s*/g, " ") : "unknown",
    optional: Boolean(member.questionToken),
    description: memberDescription(member),
  }));
}

/**
 * Top-level declarations
 *
 * Indexes a file's top-level interfaces, type aliases, functions and
 * variables by name.
 *
 * @param file - The source file.
 * @returns Name to declaration statement.
 */
function topLevel(file: ts.SourceFile): Map<string, ts.Statement> {
  const byName = new Map<string, ts.Statement>();
  for (const statement of file.statements) {
    if (
      (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement) || ts.isFunctionDeclaration(statement)) &&
      statement.name
    ) {
      byName.set(statement.name.text, statement);
    } else if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) byName.set(declaration.name.text, statement);
      }
    }
  }
  return byName;
}

/**
 * Exported object
 *
 * Finds the exported `const` annotated with a given type, e.g. the
 * fallbacks object typed `DatePickerComponents`.
 *
 * @param file - The source file.
 * @param typeName - The annotation to look for.
 * @returns The variable's name and object literal.
 */
function exportedObject(
  file: ts.SourceFile,
  typeName: string,
): { name: string; object: ts.ObjectLiteralExpression } | undefined {
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    if (!statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.type?.getText() === typeName &&
        declaration.initializer &&
        ts.isObjectLiteralExpression(declaration.initializer)
      ) {
        return { name: declaration.name.text, object: declaration.initializer };
      }
    }
  }
  return undefined;
}

/**
 * Object entries
 *
 * The source of each property of an object literal. A property whose value
 * is a local name (`Root,` or `Error: ErrorState`) resolves to that
 * declaration, so a fallback reads as the code that renders it.
 *
 * @param object - The object literal.
 * @param declarations - The file's top-level declarations.
 * @returns Property name to source text.
 */
function objectEntries(object: ts.ObjectLiteralExpression, declarations: Map<string, ts.Statement>): Map<string, string> {
  const entries = new Map<string, string>();
  for (const property of object.properties) {
    if (ts.isShorthandPropertyAssignment(property)) {
      const declaration = declarations.get(property.name.text);
      entries.set(property.name.text, declaration ? dedent(declaration.getText()) : property.name.text);
    } else if (ts.isPropertyAssignment(property)) {
      const name = propertyName(property.name);
      const value = property.initializer;
      const declaration = ts.isIdentifier(value) ? declarations.get(value.text) : undefined;
      entries.set(name, declaration ? dedent(declaration.getText()) : `${name}: ${dedent(value.getText())}`);
    }
  }
  return entries;
}

/**
 * Class map
 *
 * A component's `classes.ts`, the one object holding every class name its
 * markup uses.
 *
 * @param folder - The component folder.
 * @returns Key to class name, empty when the component has no map.
 */
function readClasses(folder: string): Map<string, string> {
  const path = join(folder, "classes.ts");
  if (!existsSync(path)) return new Map();
  const text = readFileSync(path, "utf8");
  return new Map([...text.matchAll(/^\s*(\w+): "([^"]+)",?\r?$/gm)].map((match) => [match[1]!, match[2]!]));
}

/**
 * Resolve classes
 *
 * Writes a fallback's `classes.x` references as the class names they hold,
 * so the generated source shows real class names (`className="sdt__row"`)
 * rather than identifiers an agent cannot see.
 *
 * @param text - Fallback source.
 * @param classes - The component's class map.
 * @returns The source with every known reference replaced.
 */
function resolveClasses(text: string, classes: Map<string, string>): string {
  if (classes.size === 0) return text;
  const name = (key: string) => {
    const value = classes.get(key);
    if (value === undefined) throw new Error(`classes.${key} is not in the class map`);
    return value;
  };
  return text
    .replace(/className=\{classes\.(\w+)\}/g, (_, key: string) => `className="${name(key)}"`)
    .replace(/className=\{cx\(((?:classes\.\w+(?:, )?)+)\)\}/g, (_, keys: string) =>
      `className="${keys.split(", ").map((key) => name(key.slice("classes.".length))).join(" ")}"`,
    )
    .replace(/\bclasses\.(\w+)/g, (_, key: string) => JSON.stringify(name(key)));
}

/**
 * Value of entry
 *
 * The right-hand side of an object property, as written.
 *
 * @param object - The object literal.
 * @returns Property name to value text.
 */
function objectValues(object: ts.ObjectLiteralExpression): Map<string, string> {
  const values = new Map<string, string>();
  for (const property of object.properties) {
    if (ts.isPropertyAssignment(property)) {
      values.set(propertyName(property.name), dedent(property.initializer.getText()));
    }
  }
  return values;
}

/**
 * Read slots
 *
 * Every entry of a component's `…Components` interface, with the props its
 * type declares and the fallback that renders it.
 *
 * @param typesFile - `slots/types.ts`.
 * @param fallbacksFile - `slots/fallbacks.tsx`.
 * @param componentsType - The interface name, e.g. `DatePickerComponents`.
 * @param classes - The component's class map, resolved into the fallback source.
 * @returns The slots and the name of the exported fallbacks object.
 */
function readSlots(
  typesFile: ts.SourceFile,
  fallbacksFile: ts.SourceFile,
  componentsType: string,
  classes: Map<string, string> = new Map(),
): { slots: SlotInfo[]; fallbacksExport: string } {
  const declarations = topLevel(typesFile);
  const components = declarations.get(componentsType);
  if (!components || !ts.isInterfaceDeclaration(components)) {
    throw new Error(`${typesFile.fileName}: no interface ${componentsType}`);
  }

  const fallbacks = exportedObject(fallbacksFile, componentsType);
  if (!fallbacks) throw new Error(`${fallbacksFile.fileName}: no exported object typed ${componentsType}`);
  const fallbackSources = objectEntries(fallbacks.object, topLevel(fallbacksFile));

  /** Expands a local alias such as `DomProps<HTMLDivElement>` into what it stands for. */
  const expandAlias = (text: string): string => {
    const match = /^(\w+)<(.+)>$/.exec(text);
    const alias = match ? declarations.get(match[1]!) : undefined;
    if (!match || !alias || !ts.isTypeAliasDeclaration(alias) || alias.typeParameters?.length !== 1) return text;
    const parameter = alias.typeParameters[0]!.name.text;
    return alias.type.getText().replace(new RegExp(`\\b${parameter}\\b`, "g"), match[2]!);
  };
  const isDom = (text: string): boolean => /HTMLAttributes|DomProps/.test(text);

  const slots = components.members.filter(ts.isPropertySignature).map((member): SlotInfo => {
    const name = propertyName(member.name);
    const typeNode = member.type;
    if (!typeNode || !ts.isTypeReferenceNode(typeNode) || !typeNode.typeArguments?.[0]) {
      throw new Error(`${componentsType}.${name} is not a ComponentType<…>`);
    }
    const argument = typeNode.typeArguments[0];
    const propsType = ts.isTypeReferenceNode(argument) ? argument.typeName.getText() : argument.getText();
    const declaration = declarations.get(propsType);

    let kind: SlotInfo["kind"] = "widget";
    let domType: string | undefined;
    let props: MemberInfo[] = [];
    if (declaration && ts.isInterfaceDeclaration(declaration)) {
      const heritage = declaration.heritageClauses?.flatMap((clause) => clause.types.map((type) => type.getText())) ?? [];
      const dom = heritage.find(isDom);
      if (dom) {
        kind = "element";
        domType = expandAlias(dom);
      }
      props = membersOf(declaration.members);
    } else if (declaration && ts.isTypeAliasDeclaration(declaration)) {
      const parts = ts.isIntersectionTypeNode(declaration.type) ? declaration.type.types : [declaration.type];
      const dom = parts.filter((part) => !ts.isTypeLiteralNode(part)).map((part) => part.getText());
      if (dom.some(isDom)) {
        kind = "element";
        domType = dom.map(expandAlias).join(" & ");
      }
      props = parts.flatMap((part) => (ts.isTypeLiteralNode(part) ? membersOf(part.members) : []));
    }

    const doc = declaration ? parseDoc(leadingDoc(declaration) ?? "") : { title: "", description: "", tags: [] };
    const summary = doc.description.replace(/\s*\n\s*/g, " ").replace(/\{@link\s+([^}\s]+)\}/g, "$1");
    const dataAttributes = [...new Set([...summary.matchAll(/`(data-[a-z-]+)`/g)].map((match) => match[1]!))];
    const source = fallbackSources.get(name);
    if (source === undefined) throw new Error(`${fallbacks.name} has no fallback for ${name}`);
    const fallback = resolveClasses(source, classes);

    return { name, kind, propsType, domType, title: doc.title, summary, dataAttributes, props, fallback };
  });

  return { slots, fallbacksExport: fallbacks.name };
}

/**
 * Group map
 *
 * `groups.json`: for each component, group titles in documentation order,
 * each with the props it holds.
 */
type GroupMap = Record<string, Record<string, string[]>>;

/**
 * Read props
 *
 * Every prop of the assembled component, except the root element's own DOM
 * attributes, which come from React's types. A discriminated union
 * (the selection mode) is walked member by member, so `value` appears once
 * per mode with that mode's type.
 *
 * @param checker - The type checker.
 * @param moduleSymbol - The component's entry module.
 * @param typeName - The props type, e.g. `DatePickerProps`.
 * @param groups - This component's groups from `groups.json`.
 * @returns The props, ordered by group.
 */
function readProps(
  checker: ts.TypeChecker,
  moduleSymbol: ts.Symbol,
  typeName: string,
  groups: Record<string, string[]>,
): PropInfo[] {
  let symbol = checker.getExportsOfModule(moduleSymbol).find((entry) => entry.name === typeName);
  if (!symbol) throw new Error(`${typeName} is not exported`);
  if (symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
  const type = checker.getDeclaredTypeOfSymbol(symbol);
  const constituents = type.isUnion() ? type.types : [type];

  const groupOf = new Map<string, string>();
  for (const [group, names] of Object.entries(groups)) for (const name of names) groupOf.set(name, group);

  const seen = new Map<string, PropInfo>();
  for (const constituent of constituents) {
    for (const property of checker.getPropertiesOfType(constituent)) {
      // `Omit` over a union keeps every member's declaration on one symbol,
      // so each declaration is read on its own to keep the per-mode types.
      for (const declaration of property.declarations ?? []) {
        // The root element's own attributes come from React's types; they are summarised, not listed.
        if (declaration.getSourceFile().isDeclarationFile) continue;
        const container = declaration.parent;
        const declaredIn = ts.isInterfaceDeclaration(container)
          ? container.name.text
          : ts.isTypeLiteralNode(container) && ts.isTypeAliasDeclaration(container.parent)
            ? container.parent.name.text
            : "inline";
        const key = `${property.name}::${declaredIn}`;
        if (seen.has(key) || (property.name === "children" && declaredIn.endsWith("ProviderProps"))) continue;

        const signature = ts.isPropertySignature(declaration) ? declaration : undefined;
        const description = memberDescription(declaration);
        const selection = /^(\w+)Selection$/.exec(declaredIn);

        seen.set(key, {
          name: property.name,
          type: signature?.type
            ? signature.type.getText().replace(/\s*\n\s*/g, " ")
            : checker.typeToString(checker.getTypeOfSymbol(property)),
          optional: signature ? Boolean(signature.questionToken) : (property.flags & ts.SymbolFlags.Optional) !== 0,
          description,
          default: statedDefault(description),
          group: groupOf.get(property.name) ?? OTHER_GROUP,
          mode: selection ? selection[1]!.toLowerCase() : undefined,
          declaredIn,
        });
      }
    }
  }

  const order = Object.keys(groups);
  const rank = (prop: PropInfo): number => {
    const group = order.indexOf(prop.group);
    const within = groups[prop.group]?.indexOf(prop.name) ?? 0;
    return (group === -1 ? order.length : group) * 1000 + within;
  };
  return [...seen.values()].map((prop, index) => ({ prop, index })).sort((a, b) => rank(a.prop) - rank(b.prop) || a.index - b.index).map(({ prop }) => prop);
}

/**
 * Controlled pairs
 *
 * Finds the `x` / `defaultX` / `onXChange` sets (and `value` / `defaultValue`
 * / `onChange`) among a component's props.
 *
 * @param props - The props.
 * @returns One entry per controllable piece of state.
 */
function controlledPairs(props: PropInfo[]): ControlledPair[] {
  const names = new Set(props.map((prop) => prop.name));
  const pairs: ControlledPair[] = [];
  for (const name of names) {
    if (name.startsWith("default") || name.startsWith("on")) continue;
    const capital = name.charAt(0).toUpperCase() + name.slice(1);
    const defaultValue = names.has(`default${capital}`) ? `default${capital}` : undefined;
    const stem = capital.replace(/(Query|State)$/, "");
    const change = [name === "value" ? "onChange" : "", `on${capital}Change`, `on${stem}Change`].find(
      (candidate) => candidate && names.has(candidate),
    );
    if (defaultValue || change) pairs.push({ value: name, defaultValue, onChange: change });
  }
  return pairs;
}

/**
 * Read labels
 *
 * Every member of the labels interface, with its English default.
 *
 * @param typesFile - `slots/types.ts`.
 * @param fallbacksFile - `slots/fallbacks.tsx`.
 * @param labelsType - The interface name, e.g. `DatePickerLabels`.
 * @returns The labels and the name of the exported defaults.
 */
function readLabels(
  typesFile: ts.SourceFile,
  fallbacksFile: ts.SourceFile,
  labelsType: string,
): { labels: LabelInfo[]; labelsExport: string } {
  const declaration = topLevel(typesFile).get(labelsType);
  if (!declaration || !ts.isInterfaceDeclaration(declaration)) throw new Error(`no interface ${labelsType}`);
  const defaults = exportedObject(fallbacksFile, labelsType);
  if (!defaults) throw new Error(`${fallbacksFile.fileName}: no exported object typed ${labelsType}`);
  const values = objectValues(defaults.object);
  return {
    labels: membersOf(declaration.members).map((member) => ({ ...member, default: values.get(member.name) })),
    labelsExport: defaults.name,
  };
}

/**
 * Read peers
 *
 * Which of the package's peer dependencies a component imports. A peer that
 * only the windowed variant imports is optional for it.
 *
 * @param folder - The component folder.
 * @param peers - The package's peer dependency ranges.
 * @returns Required and optional peers.
 */
function readPeers(
  folder: string,
  peers: Record<string, string>,
): { requiredPeers: PeerDependency[]; optionalPeers: PeerDependency[] } {
  const imported = new Map<string, Set<string>>();
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "__tests__") continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.tsx?$/.test(entry.name)) {
        for (const match of readFileSync(path, "utf8").matchAll(/from\s+"([^"]+)"/g)) {
          const specifier = match[1]!;
          const name = specifier.startsWith("@") ? specifier.split("/").slice(0, 2).join("/") : specifier.split("/")[0]!;
          if (!(name in peers)) continue;
          if (!imported.has(name)) imported.set(name, new Set());
          imported.get(name)!.add(entry.name);
        }
      }
    }
  };
  walk(folder);

  const requiredPeers: PeerDependency[] = [
    { name: "react", range: peers.react ?? ">=18", reason: "React 18 or 19." },
    { name: "react-dom", range: peers["react-dom"] ?? ">=18", reason: "React 18 or 19." },
  ];
  const optionalPeers: PeerDependency[] = [];
  for (const [name, files] of imported) {
    if (name === "react" || name === "react-dom") continue;
    const range = peers[name]!;
    if ([...files].every((file) => file === "virtual.tsx")) {
      optionalPeers.push({ name, range, reason: "only for the windowed variant from `slotsmith/virtual`" });
    } else {
      requiredPeers.push({ name, range, reason: "the component is built on it" });
    }
  }
  return { requiredPeers, optionalPeers };
}

/**
 * Read exports from
 *
 * The value names an entry module re-exports from one of its files.
 *
 * @param file - The entry module.
 * @param from - The module specifier, e.g. `./parts`.
 * @returns The exported names, as the entry exposes them.
 */
function exportsFrom(file: ts.SourceFile, from: string): string[] {
  const names: string[] = [];
  for (const statement of file.statements) {
    if (
      ts.isExportDeclaration(statement) &&
      !statement.isTypeOnly &&
      statement.moduleSpecifier &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === from &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause)
    ) {
      for (const element of statement.exportClause.elements) if (!element.isTypeOnly) names.push(element.name.text);
    }
  }
  return names;
}

/**
 * List guides
 *
 * @param dir - `knowledge/guides`.
 * @returns Each guide's name and first heading.
 */
function listGuides(dir: string): GuideSummary[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => file.endsWith(".md"))
    .sort()
    .map((file) => {
      const text = readFileSync(join(dir, file), "utf8");
      return { name: basename(file, ".md"), title: /^#\s+(.+)$/m.exec(text)?.[1]?.trim() ?? basename(file, ".md") };
    });
}

/**
 * Generate adapters
 *
 * One adapter per component and library, from the integration skin at
 * `src/<component>/__tests__/integrations/<library>/components.tsx`. A
 * missing skin is an error: every library in `LIBRARIES` covers every
 * component.
 *
 * @param srcDir - The library's `src/`.
 * @param names - The component folders.
 * @returns The index entries, and each adapter's source by file name.
 */
function generateAdapters(srcDir: string, names: string[]): { refs: AdapterRef[]; sources: Map<string, string> } {
  const refs: AdapterRef[] = [];
  const sources = new Map<string, string>();
  for (const component of names) {
    for (const library of LIBRARIES) {
      const skin = join(srcDir, component, "__tests__", "integrations", library, "components.tsx");
      if (!existsSync(skin)) throw new Error(`${component} has no ${library} skin at ${skin}`);
      const file = `${component}.${library}.tsx`;
      const source = toAdapterSource(readFileSync(skin, "utf8"), component);
      sources.set(file, source);
      refs.push({ component: component as ComponentName, library: library as Library, file, peers: peersOf(source) });
    }
  }
  refs.sort((a, b) => (a.file < b.file ? -1 : 1));
  return { refs, sources };
}

/**
 * Component folders
 *
 * Every folder under `src/` that is a component: it has `slots/types.ts`.
 *
 * @param srcDir - The library's `src/`.
 * @returns The folder names, sorted.
 */
export function componentFolders(srcDir: string): string[] {
  return readdirSync(srcDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(srcDir, entry.name, "slots", "types.ts")))
    .map((entry) => entry.name)
    .sort();
}

/**
 * List locales
 *
 * Every ready-made pack's BCP 47 tag, one per file under `src/locales/`
 * (`src/locale/` is the provider and stays out of this list).
 *
 * @param srcDir - The library's `src/`.
 * @returns The tags, sorted.
 */
export function listLocales(srcDir: string): string[] {
  const dir = join(srcDir, "locales");
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
    .map((entry) => entry.name.replace(/\.ts$/, ""))
    .sort();
}

/**
 * Generate knowledge
 *
 * Builds the knowledge in memory, without writing anything.
 *
 * @param options - Where the library and the hand-written knowledge live.
 * @returns The index and every component.
 */
export function generateKnowledge(options: GenerateOptions): GeneratedKnowledge {
  const srcDir = join(options.libraryRoot, "src");
  const manifest = JSON.parse(readFileSync(join(options.libraryRoot, "package.json"), "utf8")) as {
    version: string;
    peerDependencies?: Record<string, string>;
  };
  const peers = manifest.peerDependencies ?? {};
  const groups = JSON.parse(readFileSync(join(options.knowledgeDir, "groups.json"), "utf8")) as GroupMap;
  const names = componentFolders(srcDir);

  const roots = names.map((name) => join(srcDir, name, "index.ts"));
  const program = ts.createProgram(roots, {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    strict: true,
    skipLibCheck: true,
    noEmit: true,
  });
  const checker = program.getTypeChecker();
  const source = (path: string): ts.SourceFile => {
    const file = program.getSourceFile(path);
    if (!file) throw new Error(`not in the program: ${path}`);
    return file;
  };

  const adapters = generateAdapters(srcDir, names);

  const virtualFile = existsSync(join(srcDir, "virtual.ts"))
    ? ts.createSourceFile("virtual.ts", readFileSync(join(srcDir, "virtual.ts"), "utf8"), ts.ScriptTarget.ES2022, true)
    : undefined;

  const components = names.map((name): ComponentKnowledge => {
    const Name = pascal(name);
    const folder = join(srcDir, name);
    const entry = source(join(folder, "index.ts"));
    const typesFile = source(join(folder, "slots", "types.ts"));
    const fallbacksFile = source(join(folder, "slots", "fallbacks.tsx"));
    const moduleSymbol = checker.getSymbolAtLocation(entry);
    if (!moduleSymbol) throw new Error(`${name}/index.ts has no module symbol`);

    const [header] = ts.getLeadingCommentRanges(entry.text, 0) ?? [];
    const doc = parseDoc(header ? entry.text.slice(header.pos, header.end) : "");
    const example = doc.tags.find((tag) => tag.name === "example")?.text.replace(/^```\w*\n?|\n?```$/g, "").trim();

    const componentsType = `${Name}Components`;
    const labelsType = `${Name}Labels`;
    const { slots, fallbacksExport } = readSlots(typesFile, fallbacksFile, componentsType, readClasses(folder));
    const { labels, labelsExport } = readLabels(typesFile, fallbacksFile, labelsType);
    const componentGroups = groups[name] ?? {};
    const props = readProps(checker, moduleSymbol, `${Name}Props`, componentGroups);
    const groupOrder = [...Object.keys(componentGroups), OTHER_GROUP].filter((group) => props.some((prop) => prop.group === group));

    const rootDeclaration = topLevel(source(join(folder, `${Name}.tsx`))).get(`${Name}RootProps`);
    const rootElement =
      /HTML(\w+)Element/.exec(rootDeclaration?.getText() ?? "")?.[1]?.toLowerCase().replace(/^u?list$/, "ul") ?? "div";

    const virtualExport = virtualFile ? exportsFrom(virtualFile, `./${name}/virtual`).find((entryName) => entryName.startsWith("Virtual")) : undefined;
    const description = doc.description.replace(/\s*\n(?!\s*\n)\s*/g, " ").trim();

    return {
      name: name as ComponentName,
      title: humanTitle(name),
      exportName: Name,
      summary: firstSentence(doc.description),
      entry: `slotsmith/${name}`,
      css: `slotsmith/${name}.css`,
      virtual: virtualExport ? { entry: "slotsmith/virtual", exportName: virtualExport } : undefined,
      ...readPeers(folder, peers),
      slotCount: slots.length,
      description,
      example,
      groups: groupOrder,
      props,
      controlledPairs: controlledPairs(props),
      rootElement,
      propsType: `${Name}Props`,
      hook: `use${Name}`,
      parts: exportsFrom(entry, "./parts").filter((part) => part.startsWith(Name)),
      fallbacksExport,
      labelsExport,
      labelsType,
      componentsType,
      labels,
      slots,
    };
  });

  const index: KnowledgeIndex = {
    version: manifest.version,
    peers,
    components: components.map(
      ({ name, title, exportName, summary, entry, css, virtual, requiredPeers, optionalPeers, slotCount }) => ({
        name,
        title,
        exportName,
        summary,
        entry,
        css,
        virtual,
        requiredPeers,
        optionalPeers,
        slotCount,
      }),
    ),
    guides: listGuides(join(options.knowledgeDir, "guides")),
    adapters: adapters.refs,
    locales: listLocales(srcDir),
  };

  return { index, components, adapters: adapters.sources };
}

/**
 * Write knowledge
 *
 * Generates the knowledge and writes `index.json`, one JSON and one
 * Markdown file per component, and every adapter. Both folders are emptied
 * first, so nothing stale survives a removed component or skin.
 *
 * @param options - Where the library and the hand-written knowledge live.
 * @returns What was written.
 */
export function writeKnowledge(options: GenerateOptions): GeneratedKnowledge {
  const generated = generateKnowledge(options);
  const componentsDir = join(options.knowledgeDir, "components");
  rmSync(componentsDir, { recursive: true, force: true });
  mkdirSync(componentsDir, { recursive: true });
  for (const component of generated.components) {
    writeFileSync(join(componentsDir, `${component.name}.json`), `${JSON.stringify(component, null, 2)}\n`);
    writeFileSync(join(componentsDir, `${component.name}.md`), `${renderComponentReference(component)}\n`);
  }
  const adaptersDir = join(options.knowledgeDir, "adapters");
  rmSync(adaptersDir, { recursive: true, force: true });
  mkdirSync(adaptersDir, { recursive: true });
  for (const [file, source] of generated.adapters) writeFileSync(join(adaptersDir, file), source);
  writeFileSync(join(options.knowledgeDir, "index.json"), `${JSON.stringify(generated.index, null, 2)}\n`);
  return generated;
}

/** The package root: `packages/ai`. */
export const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** The default options: this package's knowledge, the library two levels up. */
export const DEFAULT_OPTIONS: GenerateOptions = {
  libraryRoot: resolve(PACKAGE_ROOT, "..", ".."),
  knowledgeDir: join(PACKAGE_ROOT, "knowledge"),
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { index } = writeKnowledge(DEFAULT_OPTIONS);
  process.stdout.write(
    `Generated knowledge for slotsmith ${index.version}: ${index.components.map((component) => `${component.name} (${component.slotCount} slots)`).join(", ")}, and ${index.adapters.length} adapters.\n`,
  );
}
