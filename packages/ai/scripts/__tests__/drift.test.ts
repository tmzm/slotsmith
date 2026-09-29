import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { beforeAll, describe, expect, it } from "vitest";
import { LIBRARIES, type ComponentKnowledge } from "../../src/knowledge/types.ts";
import { peersOf, toAdapterSource } from "../adapters.ts";
import { componentFolders, DEFAULT_OPTIONS, generateKnowledge, type GeneratedKnowledge } from "../generate.ts";

/**
 * Knowledge drift
 *
 * The knowledge is generated, but two things around it are written by hand:
 * the guides and the prop groups. The adapters are generated from the tested
 * integration skins. These tests fail as soon as the library source moves
 * away from any of them.
 */

const srcDir = join(DEFAULT_OPTIONS.libraryRoot, "src");
const knowledgeDir = DEFAULT_OPTIONS.knowledgeDir;
const lf = (text: string) => text.replace(/\r\n/g, "\n");
const pascal = (name: string) => name.replace(/(^|-)([a-z])/g, (_, __, letter: string) => letter.toUpperCase());

/**
 * Source slot names
 *
 * Reads the keys of a component's `…Components` interface straight from the
 * source text, independently of the generator.
 *
 * @param component - The component folder.
 * @returns The slot names.
 */
function sourceSlotNames(component: string): string[] {
  const text = readFileSync(join(srcDir, component, "slots", "types.ts"), "utf8");
  const block = new RegExp(`export interface ${pascal(component)}Components[^{]*\\{([\\s\\S]*?)\\n\\}`).exec(text)?.[1];
  if (!block) throw new Error(`${component}: no ${pascal(component)}Components interface`);
  return [...block.matchAll(/^\s+(\w+):\s*ComponentType</gm)].map((match) => match[1]!);
}

/**
 * Adapter slot names
 *
 * The keys of the slot map an adapter file exports.
 *
 * @param file - The adapter file name.
 * @returns The map's type and keys.
 */
function adapterSlots(file: string): { type: string; keys: string[] } {
  const source = ts.createSourceFile(file, readFileSync(join(knowledgeDir, "adapters", file), "utf8"), ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      const type = declaration.type?.getText();
      const match = type && /^Partial<(\w+Components)>$/.exec(type);
      if (match && declaration.initializer && ts.isObjectLiteralExpression(declaration.initializer)) {
        const keys = declaration.initializer.properties.flatMap((property) =>
          property.name && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) ? [property.name.text] : [],
        );
        return { type: match[1]!, keys };
      }
    }
  }
  throw new Error(`${file}: no exported Partial<…Components> map`);
}

describe("knowledge drift", () => {
  let generated: GeneratedKnowledge;
  let byName: Map<string, ComponentKnowledge>;

  beforeAll(() => {
    generated = generateKnowledge(DEFAULT_OPTIONS);
    byName = new Map(generated.components.map((component) => [component.name, component]));
  });

  it("finds all four components in the library source", () => {
    expect(componentFolders(srcDir)).toEqual(["autocomplete", "data-table", "date-picker", "file-uploader"]);
    expect([...byName.keys()].sort()).toEqual(componentFolders(srcDir));
  });

  it("has a hand-written guide for every component", () => {
    const guides = readdirSync(join(knowledgeDir, "guides")).map((file) => file.replace(/\.md$/, ""));
    for (const component of componentFolders(srcDir)) {
      expect(guides, `knowledge/guides/${component}.md is missing`).toContain(component);
    }
    for (const general of ["setup", "slots", "theming", "i18n", "adapters"]) expect(guides).toContain(general);
  });

  it("generates every slot the source declares, in order", () => {
    for (const component of componentFolders(srcDir)) {
      const generatedSlots = byName.get(component)!.slots.map((slot) => slot.name);
      expect(generatedSlots, `${component} slots`).toEqual(sourceSlotNames(component));
    }
  });

  it("gives every slot a fallback and a kind", () => {
    for (const component of generated.components) {
      for (const slot of component.slots) {
        expect(slot.fallback.length, `${component.name}.${slot.name} fallback`).toBeGreaterThan(0);
        expect(["element", "widget"]).toContain(slot.kind);
      }
    }
  });

  it("shows real class names in the fallbacks, not the class map's keys", () => {
    for (const component of generated.components) {
      for (const slot of component.slots) {
        expect(slot.fallback, `${component.name}.${slot.name} fallback`).not.toMatch(/\bclasses\./);
      }
    }
    const table = generated.components.find((component) => component.name === "data-table")!;
    expect(table.slots.find((slot) => slot.name === "Row")!.fallback).toContain('cx("sdt__row", className)');
  });

  it("classifies element and widget slots the way the library does", () => {
    const kinds = (name: string) =>
      Object.fromEntries(byName.get(name)!.slots.map((slot) => [slot.name, slot.kind]));
    expect(kinds("date-picker")).toMatchObject({ Root: "element", Day: "element", DayContent: "widget", Caption: "widget" });
    expect(kinds("data-table")).toMatchObject({ Row: "element", Cell: "element", Checkbox: "widget", Pagination: "widget", DragHandle: "element" });
    expect(kinds("autocomplete")).toMatchObject({ Option: "element", OptionLabel: "widget" });
    expect(kinds("file-uploader")).toMatchObject({ Dropzone: "element", List: "element", Thumbnail: "widget" });
  });

  // The global setup leaves `knowledge/adapters/` alone, so these are the committed files.
  it("commits an adapter equal to its tested skin for every component and every library, and nothing else", () => {
    const expected: string[] = [];
    for (const component of componentFolders(srcDir)) {
      for (const library of LIBRARIES) {
        const file = `${component}.${library}.tsx`;
        expected.push(file);
        const skinPath = join(srcDir, component, "__tests__", "integrations", library, "components.tsx");
        const adapterPath = join(knowledgeDir, "adapters", file);
        expect(existsSync(skinPath), `${component} has no ${library} skin`).toBe(true);
        expect(existsSync(adapterPath), `${file} is missing; run pnpm build:ai`).toBe(true);
        const fromSkin = toAdapterSource(readFileSync(skinPath, "utf8"), component);
        expect(lf(readFileSync(adapterPath, "utf8")), `${file} differs from its skin; edit the skin and run pnpm build:ai`).toBe(lf(fromSkin));
      }
    }
    expect(readdirSync(join(knowledgeDir, "adapters")).sort()).toEqual(expected.sort());
  });

  it("indexes every adapter with the packages it imports", () => {
    expect(generated.index.adapters).toHaveLength(componentFolders(srcDir).length * LIBRARIES.length);
    for (const adapter of generated.index.adapters) {
      const source = readFileSync(join(knowledgeDir, "adapters", adapter.file), "utf8");
      expect(adapter.peers, adapter.file).toEqual(peersOf(source));
    }
    const peers = (component: string, library: string) =>
      generated.index.adapters.find((adapter) => adapter.component === component && adapter.library === library)!.peers;
    expect(peers("data-table", "mui")).toEqual(["@mui/material"]);
    expect(peers("date-picker", "shadcn")).toEqual([]);
  });

  it("names each adapter's map after its library and component", () => {
    for (const adapter of generated.index.adapters) {
      const source = readFileSync(join(knowledgeDir, "adapters", adapter.file), "utf8");
      const name = `${adapter.library}${pascal(adapter.component)}`;
      expect(source, adapter.file).toMatch(new RegExp(`^export const ${name}: Partial<${pascal(adapter.component)}Components> = \\{`, "m"));
    }
  });

  it("only references slots that exist in every adapter", () => {
    const adapters = readdirSync(join(knowledgeDir, "adapters")).filter((file) => file.endsWith(".tsx"));
    expect(adapters.length).toBeGreaterThan(0);
    for (const file of adapters) {
      const [component] = file.split(".");
      const known = byName.get(component!);
      expect(known, `${file} names an unknown component`).toBeDefined();
      const { type, keys } = adapterSlots(file);
      expect(type, `${file} map type`).toBe(known!.componentsType);
      const slots = known!.slots.map((slot) => slot.name);
      for (const key of keys) expect(slots, `${file} references slot "${key}"`).toContain(key);
    }
  });

  it("gives every data table adapter a drag handle", () => {
    const tables = readdirSync(join(knowledgeDir, "adapters")).filter((file) => file.startsWith("data-table."));
    expect(tables.length).toBeGreaterThan(0);
    for (const file of tables) expect(adapterSlots(file).keys, file).toContain("DragHandle");
  });

  it("imports each adapter's types from the component's own entry point", () => {
    for (const adapter of generated.index.adapters) {
      const source = readFileSync(join(knowledgeDir, "adapters", adapter.file), "utf8");
      expect(source, adapter.file).toContain(`from "slotsmith/${adapter.component}"`);
      expect(source, adapter.file).not.toMatch(/from "\.\.?\//);
    }
  });

  it("places every prop in a documented group, and groups only real props", () => {
    const groups = JSON.parse(readFileSync(join(knowledgeDir, "groups.json"), "utf8")) as Record<string, Record<string, string[]>>;
    for (const component of generated.components) {
      const ungrouped = component.props.filter((prop) => prop.group === "Other").map((prop) => prop.name);
      expect(ungrouped, `${component.name} props missing from groups.json`).toEqual([]);
      const names = new Set(component.props.map((prop) => prop.name));
      const listed = Object.values(groups[component.name] ?? {}).flat();
      for (const name of listed) expect(names, `groups.json lists ${component.name}.${name}`).toContain(name);
    }
  });

  it("reads the discriminated value props once per mode", () => {
    const value = byName.get("date-picker")!.props.filter((prop) => prop.name === "value");
    expect(value.map((prop) => [prop.mode, prop.type])).toEqual([
      ["single", "ISODate | null"],
      ["multiple", "ISODate[]"],
      ["range", "DateRange | null"],
    ]);
    const multiple = byName.get("autocomplete")!.props.filter((prop) => prop.name === "onChange");
    expect(multiple.map((prop) => prop.mode)).toEqual(["single", "multiple"]);
  });

  it("describes the version in the library's package.json", () => {
    const manifest = JSON.parse(readFileSync(join(DEFAULT_OPTIONS.libraryRoot, "package.json"), "utf8")) as { version: string };
    expect(generated.index.version).toBe(manifest.version);
  });

  it("lists every locale pack, and names each one in the i18n guide and the README", () => {
    const localesDir = join(srcDir, "locales");
    const fromSource = readdirSync(localesDir)
      .filter((file) => file.endsWith(".ts"))
      .map((file) => file.replace(/\.ts$/, ""))
      .sort();
    expect(fromSource.length).toBeGreaterThan(0);
    expect([...generated.index.locales].sort()).toEqual(fromSource);

    const guide = readFileSync(join(knowledgeDir, "guides", "i18n.md"), "utf8");
    const readme = readFileSync(join(DEFAULT_OPTIONS.libraryRoot, "README.md"), "utf8");
    for (const code of fromSource) {
      expect(guide, `i18n guide is missing "${code}"`).toContain(code);
      expect(readme, `README is missing "${code}"`).toContain(code);
    }
  });
});
