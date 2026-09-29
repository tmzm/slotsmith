import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_OPTIONS, generateKnowledge } from "../generate.ts";
import { buildRegistryIndex, buildRegistryItems, writeRegistry, type RegistryItem } from "../registry.ts";

/**
 * Vendored schema
 *
 * A copy of `https://ui.shadcn.com/schema/registry-item.json`, fetched for
 * this task, so the test runs offline. Re-vendor the fixture (and re-read
 * `https://ui.shadcn.com/docs/registry`) if shadcn changes the format.
 */
interface RegistryItemSchema {
  required: string[];
  properties: {
    type: { enum: string[] };
    files: {
      items: {
        properties: { type: { enum: string[] } };
        if: { properties: { type: { enum: string[] } } };
        then: { required: string[] };
        else: { required: string[] };
      };
    };
  };
}

const schema = JSON.parse(
  readFileSync(fileURLToPath(new URL("./fixtures/registry-item.schema.json", import.meta.url)), "utf8"),
) as RegistryItemSchema;

/**
 * Schema errors
 *
 * Not a general JSON Schema Draft-07 evaluator: it checks the parts of the
 * vendored schema a registry item actually touches (the top-level required
 * fields, the `type` enum, and each file entry's conditional `target`
 * requirement), reading them from the fixture rather than hard-coding them,
 * so a future re-vendor of the schema is what this test would react to.
 *
 * @param item - A registry item, as plain JSON.
 * @returns Every violation found; empty when the item conforms.
 */
function schemaErrors(item: Record<string, unknown>): string[] {
  const errors: string[] = [];
  for (const field of schema.required) if (!(field in item)) errors.push(`missing required field "${field}"`);

  const typeEnum = schema.properties.type.enum;
  if (typeof item.type === "string" && !typeEnum.includes(item.type)) {
    errors.push(`type "${item.type}" is not one of ${typeEnum.join(", ")}`);
  }

  for (const field of ["dependencies", "registryDependencies"]) {
    const value = item[field];
    if (value !== undefined && (!Array.isArray(value) || value.some((entry) => typeof entry !== "string"))) {
      errors.push(`"${field}" must be an array of strings`);
    }
  }

  const filesSchema = schema.properties.files.items;
  const files = item.files;
  if (!Array.isArray(files) || files.length === 0) {
    errors.push('"files" must be a non-empty array');
    return errors;
  }
  files.forEach((file: unknown, index: number) => {
    if (typeof file !== "object" || file === null) {
      errors.push(`files[${index}] is not an object`);
      return;
    }
    const entry = file as Record<string, unknown>;
    const needsTarget = typeof entry.type === "string" && filesSchema.if.properties.type.enum.includes(entry.type);
    for (const field of needsTarget ? filesSchema.then.required : filesSchema.else.required) {
      if (!(field in entry)) errors.push(`files[${index}] missing required field "${field}"`);
    }
    const fileTypeEnum = filesSchema.properties.type.enum;
    if (typeof entry.type === "string" && !fileTypeEnum.includes(entry.type)) {
      errors.push(`files[${index}].type "${entry.type}" is not one of ${fileTypeEnum.join(", ")}`);
    }
    if (typeof entry.path !== "string") errors.push(`files[${index}].path must be a string`);
    if (entry.content !== undefined && typeof entry.content !== "string") {
      errors.push(`files[${index}].content must be a string`);
    }
  });
  return errors;
}

describe("shadcn registry", () => {
  let items: RegistryItem[];

  beforeAll(() => {
    const { index, adapters } = generateKnowledge(DEFAULT_OPTIONS);
    items = buildRegistryItems(index, adapters);
  });

  it("builds one item per component, and every one validates against the fetched schema", () => {
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) expect(schemaErrors(item as unknown as Record<string, unknown>), item.name).toEqual([]);
  });

  it("sets the item schema, the component type, and a name unique per component", () => {
    for (const item of items) {
      expect(item.$schema).toBe("https://ui.shadcn.com/schema/registry-item.json");
      expect(item.type).toBe("registry:component");
      expect(item.name).toMatch(/^slotsmith-[a-z-]+$/);
    }
    expect(new Set(items.map((item) => item.name)).size).toBe(items.length);
  });

  it("titles and describes each item after the component, lowercase", () => {
    const datePicker = items.find((item) => item.name === "slotsmith-date-picker")!;
    expect(datePicker.title).toBe("slotsmith date picker");
    expect(datePicker.description).toBe("shadcn parts for the slotsmith date picker.");
  });

  it("writes the file at the same path the CLI's `add --ui shadcn` uses", () => {
    for (const item of items) {
      const component = item.name.replace(/^slotsmith-/, "");
      expect(item.files).toHaveLength(1);
      expect(item.files[0]!.path).toBe(`components/slotsmith/${component}.tsx`);
      expect(item.files[0]!.type).toBe("registry:component");
      // shadcn's CLI drops every subfolder in `path` for a `registry:component`
      // file and writes `<components alias>/<basename>` unless `target` says
      // otherwise (confirmed against the real CLI); `target` is what actually
      // lands the file next to the CLI's own `components/slotsmith/*.tsx`.
      expect(item.files[0]!.target).toBe(`@components/slotsmith/${component}.tsx`);
    }
  });

  it("gives the file the adapter's exact source, with no CLI-generated header", () => {
    for (const item of items) {
      const component = item.name.replace(/^slotsmith-/, "");
      const skinSource = readFileSync(join(DEFAULT_OPTIONS.knowledgeDir, "adapters", `${component}.shadcn.tsx`), "utf8");
      expect(item.files[0]!.content).toBe(skinSource);
      expect(item.files[0]!.content).not.toMatch(/generated by slotsmith-ai/);
    }
  });

  it("lists slotsmith plus the adapter's own peers as dependencies", () => {
    expect(items.find((item) => item.name === "slotsmith-date-picker")!.dependencies).toEqual(["slotsmith"]);
    expect(items.find((item) => item.name === "slotsmith-data-table")!.dependencies).toEqual(["slotsmith", "radix-ui"]);
  });

  it("lists every @/components/ui import as a registryDependency, sorted", () => {
    expect(items.find((item) => item.name === "slotsmith-data-table")!.registryDependencies).toEqual([
      "button",
      "checkbox",
      "skeleton",
      "table",
    ]);
    expect(items.find((item) => item.name === "slotsmith-date-picker")!.registryDependencies).toEqual([]);
  });

  it("builds a registry index that lists every item without repeating its file content", () => {
    const index = buildRegistryIndex(items, { name: "slotsmith", homepage: "https://slotsmith-docs.netlify.app" });
    expect(index.$schema).toBe("https://ui.shadcn.com/schema/registry.json");
    expect(index.name).toBe("slotsmith");
    expect(index.items).toHaveLength(items.length);
    for (const entry of index.items) {
      expect(entry.files[0]).not.toHaveProperty("content");
      expect(schemaErrors(entry as unknown as Record<string, unknown>), entry.name).toEqual([]);
    }
  });
});

describe("writeRegistry", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "slotsmith-registry-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("writes one JSON file per shadcn component plus the top-level index", () => {
    const { items } = writeRegistry({
      knowledgeDir: DEFAULT_OPTIONS.knowledgeDir,
      outDir: dir,
      registryName: "slotsmith",
      homepage: "https://slotsmith-docs.netlify.app",
    });

    const expected = [...items.map((item) => `${item.name.replace(/^slotsmith-/, "")}.json`), "registry.json"].sort();
    expect(readdirSync(dir).sort()).toEqual(expected);
    expect(existsSync(join(dir, "date-picker.json"))).toBe(true);

    const onDisk = JSON.parse(readFileSync(join(dir, "date-picker.json"), "utf8")) as RegistryItem;
    expect(onDisk.name).toBe("slotsmith-date-picker");
    expect(schemaErrors(onDisk as unknown as Record<string, unknown>)).toEqual([]);
  });

  it("empties the folder first, so a removed item leaves no stale file", () => {
    writeRegistry({ knowledgeDir: DEFAULT_OPTIONS.knowledgeDir, outDir: dir, registryName: "slotsmith", homepage: "https://slotsmith-docs.netlify.app" });
    const before = readdirSync(dir).sort();

    // Plants a file no current component would produce, standing in for an
    // item a past run wrote and the source no longer has (a removed
    // component, or a renamed adapter file).
    writeFileSync(join(dir, "removed-component.json"), "{}");

    writeRegistry({ knowledgeDir: DEFAULT_OPTIONS.knowledgeDir, outDir: dir, registryName: "slotsmith", homepage: "https://slotsmith-docs.netlify.app" });
    expect(readdirSync(dir).sort()).toEqual(before);
  });
});
