/** Line diff for the swap demo's code panel. */

/**
 * The lines that differ between two texts, from a longest common subsequence
 * over whole lines.
 *
 * @param base - The text compared against (the fallback sample).
 * @param next - The text shown (a variant's sample).
 * @returns `added`: 1-based line numbers in `next` that are not in the common
 * subsequence; `removed`: 1-based line numbers in `base` that are not.
 */
export function diffLines(base: string, next: string): { added: number[]; removed: number[] } {
  const a = base.split("\n");
  const b = next.split("\n");
  // lcs[i][j]: length of the common subsequence of a[i..] and b[j..].
  const lcs = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i]![j] = a[i] === b[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }
  const added: number[] = [];
  const removed: number[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
    } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) {
      removed.push(++i);
    } else {
      added.push(++j);
    }
  }
  while (i < a.length) removed.push(++i);
  while (j < b.length) added.push(++j);
  return { added, removed };
}
