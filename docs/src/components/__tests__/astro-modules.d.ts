/**
 * Plain `tsc` cannot read `.astro` files (`astro check` can). Tests import
 * components only to hand them to the container API, so an opaque component
 * type is enough here.
 */
declare module "*.astro" {
  import type { AstroComponentFactory } from "astro/runtime/server/index.js";

  const Component: AstroComponentFactory;
  export default Component;
}
