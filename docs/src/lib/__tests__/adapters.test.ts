import { describe, expect, it } from "vitest";
import { adapterNeeds } from "@/lib/adapters";
import { sampleSource } from "@/lib/samples";

describe("adapterNeeds", () => {
  it("lists package names once, without React or slotsmith", () => {
    const code = [
      'import Box from "@mui/material/Box";',
      'import Table from "@mui/material/Table";',
      'import { useId } from "react";',
      "import {",
      "  useDataTableContext,",
      '} from "slotsmith/data-table";',
      'import { Button } from "antd";',
    ].join("\n");
    expect(adapterNeeds(code)).toEqual({ packages: ["@mui/material", "antd"], shadcn: [] });
  });

  it("lists shadcn/ui components and skips the app's own helpers", () => {
    const code = 'import { Button } from "@/components/ui/button";\nimport { cn } from "@/lib/utils";\nimport { Table } from "@/components/ui/table";';
    expect(adapterNeeds(code)).toEqual({ packages: [], shadcn: ["button", "table"] });
  });

  it("reads the shipped data-table adapters", () => {
    expect(adapterNeeds(sampleSource("adapters/data-table/radix").code).packages).toEqual(["@radix-ui/react-icons", "@radix-ui/themes"]);
    expect(adapterNeeds(sampleSource("adapters/data-table/chakra").code).packages).toEqual(["@chakra-ui/react"]);
    expect(adapterNeeds(sampleSource("adapters/data-table/shadcn").code).shadcn).toEqual(["button", "checkbox", "select", "skeleton", "table"]);
  });
});
