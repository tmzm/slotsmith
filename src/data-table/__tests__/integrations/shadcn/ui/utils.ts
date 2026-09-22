import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * cn
 *
 * meliving's `lib/utils.ts` class-name helper: clsx, then tailwind-merge.
 *
 * @param inputs - Class values.
 * @returns The merged class string.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
