import { useContext, useMemo } from "react";
import { withoutUndefined, type SlotsmithComponentName } from "./components";
import { SlotsmithContext } from "./context";

/**
 * useSlots
 *
 * Resolves every slot of one component, in the order the labels use: the
 * built-in fallbacks, then the provider's `components` for that component,
 * then the component's own `components` prop. Each layer wins slot by slot,
 * and an `undefined` entry leaves the layer below in place.
 *
 * The result keeps its identity while the three inputs keep theirs.
 *
 * @typeParam C - The component's full slot map.
 * @param name - The component's key in the provider's `components`.
 * @param fallbacks - The built-in slots.
 * @param own - The component's own `components` prop.
 * @returns Every slot, filled in.
 */
export function useSlots<C extends object>(name: SlotsmithComponentName, fallbacks: C, own: Partial<C> | undefined): C {
  const provided = useContext(SlotsmithContext).components[name] as Partial<C> | undefined;
  return useMemo(
    () => ({ ...fallbacks, ...withoutUndefined(provided), ...withoutUndefined(own) }),
    [fallbacks, provided, own],
  );
}
