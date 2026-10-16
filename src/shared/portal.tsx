"use client";

import type { ReactElement, ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Portal target
 *
 * Where a popup renders: `true` for `document.body`, an element of your
 * own, or `false` / `null` to stay inside the component.
 */
export type PortalTarget = boolean | HTMLElement | null;

/**
 * In portal
 *
 * Renders a popup into its portal target, or where it stands when there is
 * none. On the server there is no document, so it always stays in place.
 *
 * @param node - The popup.
 * @param target - See {@link PortalTarget}.
 * @returns The node, or a portal holding it.
 */
export function inPortal(node: ReactElement, target: PortalTarget | undefined): ReactNode {
  if (!target || typeof document === "undefined") return node;
  return createPortal(node, target === true ? document.body : target);
}
