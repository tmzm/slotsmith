/**
 * Known library accessibility issues
 *
 * Axe findings in the library's own fallback parts that the docs show as they
 * ship, on purpose: a fallback demo must show the real parts, so the fix
 * belongs in the library, not in the sample. The verifier records a matching
 * finding in `dist/a11y.json` as a known library issue instead of failing the
 * build; anything else still fails it. Each entry is listed in
 * `docs/LAUNCH-REPORT.md` under "Needs a decision"; remove it once the
 * library is fixed.
 */

export interface KnownIssue {
  /** The axe rule id. */
  rule: string;
  /** A class selector the finding's element matches (`.sfu__zone`). */
  selector: string;
  /** Why it fails, in a sentence. */
  reason: string;
}

export const KNOWN_LIBRARY_ISSUES: KnownIssue[] = [
  {
    rule: "nested-interactive",
    selector: ".sfu__zone",
    reason: "The file uploader's dropzone is role=button with a tab stop, and holds the Browse <button>.",
  },
  {
    rule: "target-size",
    selector: ".sac__clear",
    reason: "The combobox clear button is 20px square, under the 24px minimum, next to other targets.",
  },
  {
    rule: "target-size",
    selector: ".sac__tag-remove",
    reason: "The combobox tag's remove button is 16px square, under the 24px minimum, next to the next tag.",
  },
  {
    rule: "target-size",
    selector: ".sdp__clear",
    reason: "The date picker clear button is 20px square, under the 24px minimum, next to other targets.",
  },
];

/** The part of an axe result the verifier reads. */
export interface AxeViolation {
  id: string;
  impact?: string | null;
  help: string;
  /** `html` is the element's opening markup; axe may name an element by another attribute than its class. */
  nodes: { target: unknown[]; html?: string }[];
}

export interface KnownFinding {
  rule: string;
  target: string;
  reason: string;
}

export interface ProblemFinding {
  id: string;
  impact: string;
  help: string;
  targets: string[];
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The classes on the element itself, read from the opening tag in axe's `html`. */
const ownClasses = (html = "") => /^<[^>]*?\sclass="([^"]*)"/.exec(html)?.[1]?.split(/\s+/) ?? [];

/**
 * Splits axe violations into known library issues and problems, node by node.
 *
 * @param violations - Axe's violations for one demo.
 * @param allowlist - The known issues (defaults to `KNOWN_LIBRARY_ISSUES`).
 * @returns The known findings, and the violations left with only their unmatched nodes.
 */
export function sortViolations(
  violations: AxeViolation[],
  allowlist: KnownIssue[] = KNOWN_LIBRARY_ISSUES,
): { known: KnownFinding[]; problems: ProblemFinding[] } {
  const known: KnownFinding[] = [];
  const problems: ProblemFinding[] = [];
  for (const violation of violations) {
    const left: string[] = [];
    for (const node of violation.nodes) {
      const target = node.target.map(String).join(" ");
      const classes = ownClasses(node.html);
      // The selector must end a compound class name, so `.sfu__zone` does not match `.sfu__zone-extra`.
      // When axe names the element by another attribute (`button[aria-label="…"]`), the element's own class decides.
      const issue = allowlist.find(
        (entry) =>
          entry.rule === violation.id &&
          (new RegExp(`${escape(entry.selector)}(?![\\w-])`).test(target) || classes.includes(entry.selector.slice(1))),
      );
      if (issue) known.push({ rule: violation.id, target, reason: issue.reason });
      else left.push(target);
    }
    if (left.length) problems.push({ id: violation.id, impact: violation.impact ?? "unknown", help: violation.help, targets: left });
  }
  return { known, problems };
}
