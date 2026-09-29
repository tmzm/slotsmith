import type { ComponentProps } from "react";
import { cn } from "./utils";

/**
 * Avatar
 *
 * shadcn's `components/ui/avatar.tsx` root. Upstream wraps
 * `@radix-ui/react-avatar`, whose only job here is to swap the image for the
 * fallback on error; this copy does the same with a plain `<span>` and stays
 * dependency-free.
 *
 * @param props - Plain span attributes.
 */
function Avatar({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar"
      className={cn("relative flex size-10 shrink-0 overflow-hidden rounded-md", className)}
      {...props}
    />
  );
}

/**
 * AvatarImage
 *
 * The preview. The caller decides, from its own `onError`, whether this or
 * {@link AvatarFallback} is mounted.
 *
 * @param props - Plain img attributes.
 */
function AvatarImage({ className, ...props }: ComponentProps<"img">) {
  return (
    <img data-slot="avatar-image" className={cn("aspect-square size-full object-cover", className)} {...props} />
  );
}

/**
 * AvatarFallback
 *
 * What shows in place of the image: initials, or a glyph.
 *
 * @param props - Plain span attributes.
 */
function AvatarFallback({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-fallback"
      className={cn("flex size-full items-center justify-center rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback };
