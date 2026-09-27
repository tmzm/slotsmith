import type { CSSProperties, Ref } from "react";

/**
 * Merge props
 *
 * Combines the props a part sets itself with the ones a caller passed through
 * `slotProps`: class names are joined, styles are merged, and event handlers
 * are chained so neither is lost.
 *
 * Keys whose value is `undefined` are dropped, so passing
 * `{ className: undefined }` leaves a replacement component's own class
 * intact instead of erasing it.
 *
 * @param base - What the part sets.
 * @param extra - What the caller passed.
 * @returns The merged props.
 *
 * @example
 * ```tsx
 * <C.Option {...mergeProps(model.getOptionProps(option, index), slotProps.option?.(option, index))} />
 * ```
 */
export function mergeProps<A extends Record<string, any>, B extends Record<string, any> | undefined>(
  base: A,
  extra: B,
): A & NonNullable<B> {
  if (!extra) return base as A & NonNullable<B>;

  const merged: Record<string, any> = { ...base };

  for (const [key, value] of Object.entries(extra)) {
    if (value === undefined) continue;

    const current = merged[key];
    if (key === "className") {
      merged[key] = [current, value].filter(Boolean).join(" ") || undefined;
    } else if (key === "style") {
      merged[key] = { ...(current as CSSProperties), ...(value as CSSProperties) };
    } else if (key.startsWith("on") && typeof current === "function" && typeof value === "function") {
      merged[key] = (...args: unknown[]) => {
        current(...args);
        value(...args);
      };
    } else {
      merged[key] = value;
    }
  }

  return merged as A & NonNullable<B>;
}

/**
 * Merge refs
 *
 * Points several refs at one element. The trigger needs it: the engine keeps
 * a ref to focus it, and the positioner keeps its own.
 *
 * @typeParam E - The element type.
 * @param refs - The refs to fill.
 * @returns A callback ref.
 */
export function mergeRefs<E>(...refs: (Ref<E> | ((element: E | null) => void) | undefined)[]) {
  return (element: E | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(element);
      else if (ref && typeof ref === "object") (ref as { current: E | null }).current = element;
    }
  };
}
