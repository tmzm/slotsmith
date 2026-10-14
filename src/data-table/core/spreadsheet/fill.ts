/** Text ending in a number, such as `"Item 7"` or `"A-009"`. */
const NUMBERED = /^(.*?)(\d+)$/;

/** A run of source values read as a series. */
type Series =
  | { kind: "number"; start: number; step: number }
  | { kind: "numbered"; prefix: string; start: number; step: number; width: number }
  | { kind: "repeat" };

/** The constant step between numbers, or `null` when there is none. */
function stepOf(numbers: readonly number[]): number | null {
  if (numbers.length < 2) return null;
  const step = numbers[1]! - numbers[0]!;
  return numbers.every((value, index) => index === 0 || value - numbers[index - 1]! === step) ? step : null;
}

/**
 * Series of
 *
 * How a run of values continues: numbers with a constant step go on by it;
 * text ending in a number counts on (from one cell, by one), keeping the
 * text and the zero padding; anything else repeats. A single number repeats,
 * as in a spreadsheet.
 */
function seriesOf(source: readonly unknown[]): Series {
  if (source.every((value): value is number => typeof value === "number" && Number.isFinite(value))) {
    const step = stepOf(source);
    return step === null ? { kind: "repeat" } : { kind: "number", start: source[0]!, step };
  }
  if (source.every((value): value is string => typeof value === "string")) {
    const matches = source.map((value) => NUMBERED.exec(value));
    if (matches.every((match): match is RegExpExecArray => match !== null)) {
      const prefix = matches[0]![1]!;
      if (matches.every((match) => match[1] === prefix)) {
        const numbers = matches.map((match) => Number(match[2]));
        const step = source.length === 1 ? 1 : stepOf(numbers);
        if (step !== null) {
          return { kind: "numbered", prefix, start: numbers[0]!, step, width: matches[0]![2]!.length };
        }
      }
    }
  }
  return { kind: "repeat" };
}

/**
 * Fill values
 *
 * The values a fill writes beyond its source, continuing the series the
 * source forms (see the rules on numbers and numbered text above).
 *
 * @typeParam V - The values' type.
 * @param source - The selected values along the fill's axis, in order.
 * @param count - How many values to make.
 * @param direction - `1` to fill after the source (down, or towards the
 *   end), `-1` to fill before it. Before, the first value made is the one
 *   right next to the source.
 * @returns `count` values, nearest the source first.
 *
 * @example
 * ```ts
 * fillValues([1, 3], 3, 1); // [5, 7, 9]
 * fillValues(["Item 9"], 2, 1); // ["Item 10", "Item 11"]
 * fillValues(["a", "b"], 3, -1); // ["b", "a", "b"]
 * ```
 */
export function fillValues<V>(source: readonly V[], count: number, direction: 1 | -1): V[] {
  const series = seriesOf(source);
  const length = source.length;
  const values: V[] = [];

  for (let n = 1; n <= count; n++) {
    // Position along the series, the source at 0 … length - 1.
    const position = direction === 1 ? length - 1 + n : -n;
    if (series.kind === "number") {
      values.push((series.start + series.step * position) as V);
    } else if (series.kind === "numbered") {
      const number = Math.max(series.start + series.step * position, 0);
      values.push(`${series.prefix}${String(number).padStart(series.width, "0")}` as V);
    } else {
      values.push(source[((position % length) + length) % length]!);
    }
  }
  return values;
}
