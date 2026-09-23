import { useCallback, useRef, useState } from "react";

/**
 * Updater
 *
 * A next value, or a function from the current one.
 *
 * @typeParam S - The state type.
 */
export type Updater<S> = S | ((previous: S) => S);

/**
 * useControllableState
 *
 * One piece of state that stays uncontrolled until its value prop is passed,
 * so nothing needs a `useState` to render. Separate from the data table's
 * equivalent, which is built on TanStack's `functionalUpdate`; this component
 * has no peer dependencies.
 *
 * The current value is mirrored in a ref so that two updates within the same
 * event both read the newest value rather than the one captured when the
 * handler was created.
 *
 * @typeParam S - The state type.
 * @param value - The controlled value, or `undefined` to stay uncontrolled.
 * @param defaultValue - The starting value while uncontrolled.
 * @param onChange - Told about every change, controlled or not.
 * @returns The value and a setter that also accepts an updater function.
 */
export function useControllableState<S>(
  value: S | undefined,
  defaultValue: S,
  onChange?: (next: S) => void,
): [S, (updater: Updater<S>) => void] {
  const [internal, setInternal] = useState(defaultValue);
  const controlled = value !== undefined;
  const current = controlled ? value : internal;

  const latest = useRef(current);
  latest.current = current;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const set = useCallback(
    (updater: Updater<S>) => {
      const next = typeof updater === "function" ? (updater as (previous: S) => S)(latest.current) : updater;
      if (Object.is(next, latest.current)) return;
      latest.current = next;
      if (!controlled) setInternal(next);
      onChangeRef.current?.(next);
    },
    [controlled],
  );

  return [current, set];
}
