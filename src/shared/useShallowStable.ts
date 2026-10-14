import { useRef } from "react";

/**
 * Shallow equal
 *
 * Whether two objects hold the same values under the same keys, compared
 * with `Object.is`.
 */
export function shallowEqual<V extends object>(a: V | null | undefined, b: V | null | undefined): boolean {
  if (Object.is(a, b)) return true;
  if (!a || !b) return false;
  const keysA = Object.keys(a) as (keyof V)[];
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => Object.prototype.hasOwnProperty.call(b, key) && Object.is(a[key], b[key]));
}

/**
 * useShallowStable
 *
 * Keeps the previous object while a new one is shallowly equal to it, so an
 * object prop written inline (`labels={{ empty: "…" }}`) does not count as a
 * change on every render.
 *
 * @typeParam V - The object's type.
 * @param value - The object passed this render.
 * @returns The previous object when equal, otherwise `value`.
 */
export function useShallowStable<V extends object>(value: V): V;
export function useShallowStable<V extends object>(value: V | undefined): V | undefined;
export function useShallowStable<V extends object>(value: V | undefined): V | undefined {
  const previous = useRef(value);
  if (!shallowEqual(previous.current, value)) previous.current = value;
  return previous.current;
}
