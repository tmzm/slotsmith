/**
 * Changelog
 *
 * The release notes, read from the `## Changelog` section of the root README,
 * the one place they are written. The Changelog page renders each release and
 * the Roadmap page shows the unreleased one as work in progress.
 */

/** One release of the library. */
export interface Release {
  /** The heading as written: `1.6.0`, or `Unreleased`. */
  version: string;
  /** True for the entry that collects changes not published yet. */
  unreleased: boolean;
  /** The notes as Markdown, as written, with lists and code intact. Empty when the entry has none. */
  markdown: string;
}

const SECTION = /^##[ \t]+Changelog[ \t]*$/i;
const NEXT_SECTION = /^##[ \t]+\S/;
const FENCE = /^[ \t]*(`{3,}|~{3,})/;
/** `### 1.6.0`: a release as a heading. */
const HEADING = /^###[ \t]+(.+?)[ \t]*#*[ \t]*$/;
/** A top-level bullet that opens with bold text: `- **1.6.0** — notes` is a release, the README's form. */
const BOLD_BULLET = /^[-*][ \t]+\*\*([^*]*)\*\*[ \t]*(?:[—–:-][ \t]*)?(.*)$/;
/** What a release may be called: `Unreleased`, or a version such as `1.6.0` or `2.0.0-beta.1`. */
const RELEASE_NAME = /^(?:unreleased|\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/i;
/** Bold text that was meant as a version: it starts with a digit, or with `v` and a digit. */
const VERSION_LIKE = /^\s*v?\d/i;

/**
 * Splits the README's changelog into releases, in the order written.
 *
 * The section runs from `## Changelog` to the next `## ` heading. A release
 * starts at a `### <heading>` line or at a top-level bullet that opens with a
 * bold version (`- **1.6.0** — …`); with the bullet form the text after the
 * version is the release's first bullet. Lines inside a fenced code block
 * never start a release or end the section.
 *
 * A section the page could only show wrongly is an error, not a guess: a
 * release named twice, text before the first release, a `###` heading or a
 * bold version-like bullet that is not `Unreleased` or `x.y.z`.
 *
 * @param readme - The README's text.
 * @returns The releases, or an empty list when there is no changelog section.
 * @throws When the section is malformed; the message names the line.
 */
export function parseChangelog(readme: string): Release[] {
  const releases: { version: string; lines: string[] }[] = [];
  const fail = (index: number, line: string, why: string): never => {
    throw new Error(`README changelog, line ${index + 1}: ${why}\n  ${line}`);
  };
  let inSection = false;
  let fence: string | null = null;
  for (const [index, line] of readme.split(/\r?\n/).entries()) {
    if (!inSection) {
      inSection = SECTION.test(line);
      continue;
    }
    const mark = FENCE.exec(line)?.[1];
    if (fence) {
      // A fence closes on the same character, at least as long as the one that opened it.
      if (mark && mark[0] === fence[0] && mark.length >= fence.length && line.trim() === mark) fence = null;
      releases.at(-1)?.lines.push(line);
      continue;
    }
    if (NEXT_SECTION.test(line)) break;
    const heading = mark ? null : HEADING.exec(line);
    const bullet = mark || heading ? null : BOLD_BULLET.exec(line);
    const name = heading ? heading[1]! : bullet && (RELEASE_NAME.test(bullet[1]!) || VERSION_LIKE.test(bullet[1]!)) ? bullet[1]! : null;
    if (name !== null) {
      if (!RELEASE_NAME.test(name)) fail(index, line, `"${name}" is not a release name. Use "Unreleased" or a version such as "1.8.0", with no spaces inside the bold.`);
      if (releases.some((release) => release.version.toLowerCase() === name.toLowerCase())) fail(index, line, `the release "${name}" is listed twice.`);
      releases.push({ version: name, lines: bullet?.[2] ? [`- ${bullet[2]}`] : [] });
      continue;
    }
    if (releases.length === 0) {
      if (line.trim() !== "") fail(index, line, "text before the first release. Start the section with a release.");
      continue;
    }
    if (mark) fence = mark;
    releases.at(-1)!.lines.push(line);
  }
  return releases.map(({ version, lines }) => ({
    version,
    unreleased: /^unreleased$/i.test(version),
    markdown: lines.join("\n").replace(/^(?:[ \t]*\n)+/, "").trimEnd(),
  }));
}

/** The `id` of a release's heading on the Changelog page: its version, or `unreleased`. */
export function releaseId(release: Pick<Release, "version" | "unreleased">): string {
  return release.unreleased ? "unreleased" : release.version;
}

/** The newest published version, or null when the changelog names none. */
export function latestVersion(releases: Release[]): string | null {
  return releases.find((release) => !release.unreleased)?.version ?? null;
}

/** Whether a release has notes to show. An Unreleased entry is empty right after a release. */
export function hasNotes(release: Release): boolean {
  return release.markdown.trim() !== "";
}

/**
 * Where a README heading the notes link to lives on this site, as a
 * language-neutral path, with the section's id when the heading became part
 * of a page. A test keeps every anchor the notes use in this map.
 */
export const README_ANCHOR_PATHS: Record<string, string> = {
  "reordering-rows": "/components/data-table/guides/row-reorder/",
  "ready-made-adapters": "/ai-tools/",
  "once-for-the-whole-app": "/guides/#once-for-the-whole-app",
  theming: "/theming/",
  languages: "/languages/",
};

/**
 * Rewrites the notes' links to README headings (`[Theming](#theming)`), which
 * point nowhere outside the README. Code spans are left as written.
 *
 * @param markdown - A release's notes.
 * @param resolve - Gives the URL for a README anchor (without the `#`).
 */
export function resolveReadmeLinks(markdown: string, resolve: (anchor: string) => string): string {
  return markdown
    .split(/(`+[^`]*`+)/)
    .map((part, index) => (index % 2 === 1 ? part : part.replace(/\]\(#([^)\s]+)\)/g, (_whole, anchor: string) => `](${resolve(anchor)})`)))
    .join("");
}
