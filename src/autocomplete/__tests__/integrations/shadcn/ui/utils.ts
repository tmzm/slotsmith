import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * cn
 *
 * The class-name helper a shadcn project keeps in `lib/utils.ts`: clsx, then
 * tailwind-merge so later classes win over earlier ones.
 *
 * @param inputs - Class values.
 * @returns The merged class string.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
