/**
 * TODO tags
 *
 * The library marks planned work in its source as `TODO(tag)`. The roadmap
 * lists each tag, and a test compares the two, so a tag added to the source
 * without a roadmap entry fails the docs tests.
 */

const TODO_TAG = /TODO\(([a-z0-9-]+)\)/g;

/**
 * Finds every `TODO(tag)` in the given files.
 *
 * @param files - Source files, each with the path to report and its text.
 * @returns Each tag with the paths of the files that carry it, in the order given, each path once.
 */
export function findTodoTags(files: { path: string; text: string }[]): Map<string, string[]> {
  const tags = new Map<string, string[]>();
  for (const file of files) {
    for (const [, tag = ""] of file.text.matchAll(TODO_TAG)) {
      const paths = tags.get(tag) ?? [];
      if (!paths.includes(file.path)) paths.push(file.path);
      tags.set(tag, paths);
    }
  }
  return tags;
}
