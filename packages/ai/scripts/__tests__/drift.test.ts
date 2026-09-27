import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { beforeAll, describe, expect, it } from "vitest";
import type { ComponentKnowledge } from "../../src/knowledge/types.ts";
import { componentFolders, DEFAULT_OPTIONS, generateKnowledge, type GeneratedKnowledge } from "../generate.ts";

/**
 * Knowledge drift
 *
 * The knowledge is generated, but three things around it are written by
 * hand: the guides, the adapters and the prop groups. These tests fail as
 * soon as the library source moves away from any of them.
 */

const srcDir = join(DEFAULT_OPTIONS.libraryRoot, "src");
const knowledgeDir = DEFAULT_OPTIONS.knowledgeDir;
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
    for (const general of ["setup", "slots", "theming", "i18n"]) expect(guides).toContain(general);
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

  it("classifies element and widget slots the way the library does", () => {
    const kinds = (name: string) =>
      Object.fromEntries(byName.get(name)!.slots.map((slot) => [slot.name, slot.kind]));
    expect(kinds("date-picker")).toMatchObject({ Root: "element", Day: "element", DayContent: "widget", Caption: "widget" });
    expect(kinds("data-table")).toMatchObject({ Row: "element", Cell: "element", Checkbox: "widget", Pagination: "widget" });
    expect(kinds("autocomplete")).toMatchObject({ Option: "element", OptionLabel: "widget" });
    expect(kinds("file-uploader")).toMatchObject({ Dropzone: "element", List: "element", Thumbnail: "widget" });
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
