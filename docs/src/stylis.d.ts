/**
 * stylis ships no types. These cover what the MUI provider of the adapter
 * demos uses: the prefixer, and the plugin type `stylis-plugin-rtl` is
 * written against.
 */
declare module "stylis" {
  export interface Element {
    type: string;
    value: string;
    props: string[] | string;
    root: Element | null;
    parent: Element | null;
    children: Element[] | string;
    line: number;
    column: number;
    length: number;
    return: string;
  }
  export type Middleware = (element: Element, index: number, children: Element[], callback: Middleware) => string | void;
  export const prefixer: Middleware;
}
