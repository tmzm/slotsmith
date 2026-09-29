import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { peersOf, toAdapterSource } from "../adapters.ts";
import { DEFAULT_OPTIONS } from "../generate.ts";

/**
 * Adapter source
 *
 * Each import form the skins use, as the skins write it, and what an app
 * gets instead.
 */

/**
 * Skin
 *
 * @param component - The component folder.
 * @param library - The library folder.
 * @returns The skin's source text.
 */
const skin = (component: string, library: string): string =>
  readFileSync(join(DEFAULT_OPTIONS.libraryRoot, "src", component, "__tests__", "integrations", library, "components.tsx"), "utf8");

describe("toAdapterSource", () => {
  it("points a type import from the component's entry at its published entry point", () => {
    expect(toAdapterSource('import type { DatePickerComponents } from "../../../index";', "date-picker")).toBe(
      'import type { DatePickerComponents } from "slotsmith/date-picker";',
    );
  });

  it("points a runtime import from the component's entry at its published entry point", () => {
    const source = ["import {", "  useDataTableContext,", "  type CellSlotProps,", '} from "../../../index";'].join("\n");
    expect(toAdapterSource(source, "data-table")).toBe(
      ["import {", "  useDataTableContext,", "  type CellSlotProps,", '} from "slotsmith/data-table";'].join("\n"),
    );
  });

  it("points the test-local shadcn components at the app's own", () => {
    expect(toAdapterSource('import { Button } from "./ui/button";', "autocomplete")).toBe(
      'import { Button } from "@/components/ui/button";',
    );
    expect(toAdapterSource('import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";', "data-table")).toBe(
      'import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";',
    );
  });

  it("points the test-local `cn` at the app's `@/lib/utils`", () => {
    expect(toAdapterSource('import { cn } from "./ui/utils";', "file-uploader")).toBe('import { cn } from "@/lib/utils";');
  });

  it("leaves package imports alone", () => {
    const source = [
      'import Box from "@mui/material/Box";',
      'import { Select as SelectPrimitive } from "radix-ui";',
      'import { Button, theme } from "antd";',
      'import { useState } from "react";',
    ].join("\n");
    expect(toAdapterSource(source, "data-table")).toBe(source);
  });

  it("refuses an import only the repository has, so the skin is fixed instead", () => {
    expect(() => toAdapterSource('import { employees } from "../shared";', "data-table")).toThrow(/\.\.\/shared/);
    expect(() => toAdapterSource('import { GripVertical } from "./ui/icons";', "data-table")).toThrow(/not a shadcn\/ui component/);
  });

  it("leaves no relative import in any real skin", () => {
    const adapter = toAdapterSource(skin("data-table", "shadcn"), "data-table");
    expect(adapter).not.toMatch(/from "\.\.?\//);
    expect(adapter).toContain('from "slotsmith/data-table"');
    expect(adapter).toContain('from "@/components/ui/button"');
    expect(adapter).toContain('from "@/lib/utils"');
  });
});

describe("peersOf", () => {
  it("names each package once, by its package name, and leaves out React, slotsmith and the app's aliases", () => {
    const source = [
      'import Box from "@mui/material/Box";',
      'import Button from "@mui/material/Button";',
      'import DragIndicator from "@mui/icons-material/DragIndicator";',
      'import { useState } from "react";',
      'import { createPortal } from "react-dom";',
      'import type { DataTableComponents } from "slotsmith/data-table";',
      'import { Button as UiButton } from "@/components/ui/button";',
      'import { cn } from "@/lib/utils";',
    ].join("\n");
    expect(peersOf(source)).toEqual(["@mui/icons-material", "@mui/material"]);
  });

  it("reads the peers of the generated adapters", () => {
    expect(peersOf(toAdapterSource(skin("data-table", "mui"), "data-table"))).toEqual(["@mui/material"]);
    expect(peersOf(toAdapterSource(skin("data-table", "shadcn"), "data-table"))).toEqual(["radix-ui"]);
    expect(peersOf(toAdapterSource(skin("date-picker", "antd"), "date-picker"))).toEqual(["@ant-design/icons", "antd"]);
    expect(peersOf(toAdapterSource(skin("autocomplete", "radix"), "autocomplete"))).toEqual(["@radix-ui/react-icons", "@radix-ui/themes"]);
  });
});
