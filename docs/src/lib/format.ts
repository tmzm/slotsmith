/**
 * Formatting for the generated reference tables: defaults, function
 * signatures, prop groups, and the example arguments a function label is
 * called with to show what it prints.
 */

/** What a table cell shows when there is no value. */
export const NONE = "—";

/**
 * A default value as the table shows it.
 *
 * @param raw - The default as source text, e.g. `"Retry"` (with its quotes) or `{ pageIndex: 0 }`.
 * @returns The text unchanged, or "—" when there is none.
 */
export function formatDefault(raw: string | undefined): string {
  return raw === undefined || raw.trim() === "" ? NONE : raw;
}

/** The index of the parenthesis that closes the one at `open`, or -1. */
function closingParen(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "(") depth++;
    else if (text[i] === ")" && --depth === 0) return i;
  }
  return -1;
}

/**
 * Whether a type is a function signature as a whole, such as
 * `(page: number) => string`. A union that only contains a function
 * (`boolean | ((row) => boolean)`) is not one.
 *
 * @param type - The type as written in the source.
 */
export function isFunctionType(type: string): boolean {
  const text = type.trim();
  if (!text.startsWith("(")) return false;
  const close = closingParen(text, 0);
  return close > 0 && /^\s*=>/.test(text.slice(close + 1));
}

/**
 * Props sorted into their API groups.
 *
 * @param props - The props, each with an optional `group`.
 * @param order - The group titles in documentation order (the reference's `groups`).
 * @returns One entry per non-empty group, in `order`; props with no group or a
 * group outside `order` come last, under "Other".
 */
export function groupProps<T extends { group?: string }>(props: T[], order: string[]): { group: string; props: T[] }[] {
  const groups = order.map((group) => ({ group, props: props.filter((prop) => prop.group === group) }));
  const other = props.filter((prop) => !prop.group || !order.includes(prop.group));
  return [...groups, { group: "Other", props: other }].filter((group) => group.props.length > 0);
}

/** Splits `text` at the separators that are not nested in brackets. */
function splitTopLevel(text: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;
    if ("([{<".includes(char)) depth++;
    else if (")]}>".includes(char) && text[i - 1] !== "=") depth--;
    else if (char === separator && depth === 0) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts.map((part) => part.trim()).filter(Boolean);
}

/** One parameter of a signature. */
export interface Param {
  name: string;
  type: string;
}

/** Splits `name?: type` into its name and type. */
function member(text: string): Param {
  const colon = text.indexOf(":");
  if (colon < 0) return { name: text.replace(/\?$/, ""), type: "unknown" };
  return { name: text.slice(0, colon).trim().replace(/\?$/, ""), type: text.slice(colon + 1).trim() };
}

/**
 * The parameters of a function signature.
 *
 * @param signature - E.g. `(page: number, pageCount: number) => ReactNode`.
 * @returns Each parameter's name and type, in order.
 */
export function splitParams(signature: string): Param[] {
  const text = signature.trim();
  const close = closingParen(text, 0);
  if (!text.startsWith("(") || close < 0) return [];
  return splitTopLevel(text.slice(1, close), ",").map(member);
}

/** Example values for string parameters, by parameter name; other names get "…". */
const STRING_EXAMPLES: Record<string, string> = {
  label: "Lisbon",
  query: "Lis",
  name: "photo.jpg",
  from: "Mar 3",
  to: "Mar 9",
  accept: "image/*,.pdf",
  maxSize: "5 MB",
};

/** Example numbers, handed out in order so two number parameters differ. */
const NUMBER_EXAMPLES = [3, 12, 5, 8];

/**
 * Example arguments for a function label, so the table can call the English
 * default and show what it prints. Numbers come from a fixed list in order,
 * strings by parameter name, and object parameters member by member.
 *
 * @param signature - The label's type, e.g. `(count: number) => string`.
 * @returns One value per parameter.
 */
export function exampleArgs(signature: string): unknown[] {
  let next = 0;
  const value = ({ name, type }: Param): unknown => {
    const trimmed = type.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      return Object.fromEntries(splitTopLevel(trimmed.slice(1, -1), ";").map(member).map((m) => [m.name, value(m)]));
    }
    if (trimmed === "number") return NUMBER_EXAMPLES[next++ % NUMBER_EXAMPLES.length];
    if (trimmed === "boolean") return true;
    return STRING_EXAMPLES[name] ?? "…";
  };
  return splitParams(signature).map(value);
}

/**
 * An example argument as source text, for the call shown in the table:
 * strings quoted, objects as `{ key: value }`.
 */
export function formatArg(arg: unknown): string {
  if (typeof arg === "string") return JSON.stringify(arg);
  if (arg && typeof arg === "object") {
    return `{ ${Object.entries(arg)
      .map(([key, value]) => `${key}: ${formatArg(value)}`)
      .join(", ")} }`;
  }
  return String(arg);
}

/** A run of description text: plain, or code that was in backticks. */
export interface Segment {
  text: string;
  code: boolean;
}

/**
 * Splits JSDoc text at its backticks, so the tables can set `code` in mono.
 *
 * @param text - E.g. "Defaults to `row.id`.".
 * @returns The plain and code runs, in order; empty runs are dropped.
 */
export function codeSegments(text: string): Segment[] {
  return text
    .split("`")
    .map((part, index) => ({ text: part, code: index % 2 === 1 }))
    .filter((segment) => segment.text !== "");
}

/**
 * A type split where a line may break: after `<`, `(`, `{`, `,`, `|`, `&`, `_` and `.`,
 * and before `=>` and `[`. The table joins the pieces with `<wbr>`, so a long union or
 * signature wraps at its punctuation instead of in the middle of a name.
 *
 * @param type - The type as written in the source.
 * @returns The pieces, which join back to `type`.
 */
export function typeBreaks(type: string): string[] {
  return type.split(/(?<=[<({,|&_.])|(?==>)|(?=\[)/).filter((piece) => piece !== "");
}
