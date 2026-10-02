import type { ComponentSlug } from "@/data/components";
import type { Lang } from "@/i18n";

/**
 * Component context
 *
 * What a block inside a component overview's MDX needs to know about the page
 * it renders on. The overview template stores it in `Astro.locals` before the
 * MDX renders, so the MDX writes `<Install />` rather than repeating the slug
 * and the language on every block.
 */
export interface ComponentContext {
  slug: ComponentSlug;
  /** The page's language: links go to this language's pages. */
  lang: Lang;
  /** The language the prose is shown in: an Arabic page with no Arabic MDX shows English, and its blocks follow the prose. */
  contentLang: Lang;
}

const KEY = Symbol.for("slotsmith-docs.component-context");

/** Stores the component context for the rest of this page's render. */
export function setComponentContext(locals: object, context: ComponentContext): void {
  (locals as Record<symbol, ComponentContext>)[KEY] = context;
}

/**
 * The component context of the page being rendered.
 *
 * @throws When the block renders outside a component overview, naming the block, so a misplaced block fails the build.
 */
export function componentContext(locals: object, block: string): ComponentContext {
  const context = (locals as Record<symbol, ComponentContext | undefined>)[KEY];
  if (!context) throw new Error(`<${block} /> renders only inside a component overview's MDX, or with its props passed.`);
  return context;
}

/** The component context, or undefined outside a component overview. */
export function optionalComponentContext(locals: object): ComponentContext | undefined {
  return (locals as Record<symbol, ComponentContext | undefined>)[KEY];
}
