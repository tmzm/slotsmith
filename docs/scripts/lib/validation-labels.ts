import { readFileSync } from "node:fs";
import ts from "typescript";
import type { LabelInfo } from "../../../packages/ai/src/knowledge/types.ts";

/**
 * What each validation message is for. The library's `ValidationLabels`
 * members carry no JSDoc of their own; these follow `screenFiles` in
 * `src/file-uploader/core/validate.ts`, which picks the message per refused
 * file, checking in this order: count, type, maximum size, minimum size.
 */
const DESCRIPTIONS: Record<string, string> = {
  wrongType: "A file that matches none of the `accept` tokens. Receives the file name.",
  tooLarge: "A file over `maxSize`. Receives the file name and the limit, formatted (`5 MB`).",
  tooSmall: "A file under `minSize`. Receives the file name and the limit, formatted (`1 KB`).",
  tooMany: "A file past `maxFiles`, counting the items already listed. Receives the limit.",
};

/**
 * Reads the file uploader's validation messages from the library source: each
 * member of the `ValidationLabels` interface with its type, and the English
 * default from `defaultValidationLabels`, as source text.
 *
 * @param file - Path to `src/file-uploader/core/validate.ts`.
 * @returns One label per member, in declaration order.
 * @throws When the interface or the defaults object is missing.
 */
export function readValidationLabels(file: string): LabelInfo[] {
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  let members: ts.NodeArray<ts.TypeElement> | undefined;
  const defaults = new Map<string, string>();

  for (const statement of source.statements) {
    if (ts.isInterfaceDeclaration(statement) && statement.name.text === "ValidationLabels") members = statement.members;
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== "defaultValidationLabels") continue;
      if (!declaration.initializer || !ts.isObjectLiteralExpression(declaration.initializer)) continue;
      for (const property of declaration.initializer.properties) {
        if (ts.isPropertyAssignment(property) && ts.isIdentifier(property.name)) {
          defaults.set(property.name.text, property.initializer.getText(source));
        }
      }
    }
  }

  if (!members) throw new Error(`${file}: no ValidationLabels interface`);
  if (defaults.size === 0) throw new Error(`${file}: no defaultValidationLabels object`);
  return members.filter(ts.isPropertySignature).map((member) => {
    const name = member.name.getText(source);
    return {
      name,
      type: member.type?.getText(source) ?? "unknown",
      optional: !!member.questionToken,
      description: DESCRIPTIONS[name] ?? "",
      default: defaults.get(name),
    };
  });
}
