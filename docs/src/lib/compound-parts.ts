import * as slotsmith from "slotsmith";
import type { ComponentSlug } from "@/data/components";
import { getReference } from "@/lib/reference";

/** One compound part: how it is written (`FileUploader.Item`) and the named export it is (`FileUploaderItemView`). */
export interface CompoundPart {
  member: string;
  named: string;
}

/**
 * The compound parts of a component, read from the library: every component
 * hung on the main export (`FileUploader.Provider`, `.Root`, ...) with the
 * named export it is. The named exports are the generated reference's
 * `parts` plus the component's provider and root, so the list follows the
 * installed version and nothing is typed by hand.
 *
 * @param slug - The component.
 * @returns The parts, in the order the library attaches them.
 * @throws When a member matches none of those exports, or there are none.
 */
export function compoundParts(slug: ComponentSlug): CompoundPart[] {
  const { exportName, parts } = getReference(slug);
  const library = slotsmith as unknown as Record<string, unknown>;
  const main = library[exportName] as Record<string, unknown> | undefined;
  if (!main) throw new Error(`slotsmith does not export "${exportName}".`);

  const known = [...parts, `${exportName}Provider`, `${exportName}Root`];
  const rows = Object.entries(main)
    .filter(([, value]) => typeof value === "function")
    .map(([member, value]) => {
      const named = known.find((name) => library[name] === value);
      if (!named) throw new Error(`${exportName}.${member} is not one of the reference's parts (${known.join(", ")}).`);
      return { member: `${exportName}.${member}`, named };
    });
  if (rows.length === 0) throw new Error(`${exportName} has no compound parts.`);
  return rows;
}
