import type { ComponentKnowledge, LabelInfo } from "../../../packages/ai/src/knowledge/types.ts";
import type { ComponentSlug } from "@/data/components";

/**
 * The generator's component record plus the custom properties its CSS sets or
 * reads and the class names its markup uses. A component with a second labels
 * section (the file uploader's validation messages) also carries those labels
 * and the name of the export holding their defaults.
 */
export type ComponentReference = ComponentKnowledge & {
  tokens: string[];
  classes: string[];
  validationLabels?: LabelInfo[];
  validationLabelsExport?: string;
};

const files = import.meta.glob<ComponentReference>("../generated/reference/*.json", {
  eager: true,
  import: "default",
});

/**
 * The generated reference for one component.
 *
 * @param slug - The component.
 * @returns Its props, slots, labels and tokens.
 * @throws When the reference has not been generated.
 */
export function getReference(slug: ComponentSlug): ComponentReference {
  const found = files[`../generated/reference/${slug}.json`];
  if (!found) throw new Error(`No reference data for "${slug}". Run: pnpm --filter slotsmith-docs reference`);
  return found;
}
