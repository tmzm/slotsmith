/**
 * Knowledge types
 *
 * The shape of the generated knowledge. `scripts/generate.ts` writes it from
 * the library source; the MCP server, and anything else that describes the
 * components, only ever reads it.
 *
 * @packageDocumentation
 */

/**
 * Component name
 *
 * A component's folder name in the library source, which is also the name
 * of its entry point (`slotsmith/<name>`).
 */
export type ComponentName = "data-table" | "autocomplete" | "file-uploader" | "date-picker";

/**
 * Supported libraries
 *
 * The component libraries an adapter can be asked for. Not every component
 * has an adapter for every library; the index records which exist.
 */
export const LIBRARIES = ["mui", "shadcn", "chakra", "radix"] as const;

/**
 * Library
 *
 * One of {@link LIBRARIES}.
 */
export type Library = (typeof LIBRARIES)[number];

/**
 * Peer dependency
 *
 * A package the application installs next to slotsmith.
 */
export interface PeerDependency {
  /** The package name. */
  name: string;
  /** The version range the library declares. */
  range: string;
  /** Why and when it is needed. */
  reason: string;
}

/**
 * Component summary
 *
 * What a listing needs to know about a component without its full API.
 */
export interface ComponentSummary {
  /** The folder and entry-point name, e.g. `date-picker`. */
  name: ComponentName;
  /** A human name, e.g. `Date picker`. */
  title: string;
  /** The exported component, e.g. `DatePicker`. */
  exportName: string;
  /** One sentence on what it is. */
  summary: string;
  /** The per-component entry point, e.g. `slotsmith/date-picker`. */
  entry: string;
  /** The per-component stylesheet, e.g. `slotsmith/date-picker.css`. */
  css: string;
  /** The windowed variant, when the component has one. */
  virtual?: { entry: string; exportName: string };
  /** Peers the component cannot work without. */
  requiredPeers: PeerDependency[];
  /** Peers only some usages need. */
  optionalPeers: PeerDependency[];
  /** How many slots it has. */
  slotCount: number;
}

/**
 * Prop
 *
 * One prop of a component, as declared in the source.
 */
export interface PropInfo {
  /** The prop name. */
  name: string;
  /** The type, as written in the source. */
  type: string;
  /** Whether it may be left out. */
  optional: boolean;
  /** The JSDoc description. */
  description: string;
  /** The default, when the JSDoc states one ("Defaults to …"). */
  default?: string;
  /** The API group it belongs to, as in the documentation. */
  group: string;
  /** The mode this declaration applies to, for props whose type depends on a mode. */
  mode?: string;
  /** The interface that declares it. */
  declaredIn: string;
}

/**
 * Controlled pair
 *
 * A piece of state that is uncontrolled until its value prop is passed.
 */
export interface ControlledPair {
  /** The controlled value prop, e.g. `value`. */
  value: string;
  /** The uncontrolled initial value prop, e.g. `defaultValue`. */
  defaultValue?: string;
  /** The change callback, e.g. `onChange`. */
  onChange?: string;
}

/**
 * Member
 *
 * One member of a slot's props, or of a labels object.
 */
export interface MemberInfo {
  /** The member name. */
  name: string;
  /** The type, as written in the source. */
  type: string;
  /** Whether it may be absent. */
  optional: boolean;
  /** The JSDoc description. */
  description: string;
}

/**
 * Slot kind
 *
 * `element` slots receive DOM props with state as `data-*` attributes, so a
 * library primitive drops straight in. `widget` slots receive semantic props
 * and usually need a short adapter.
 */
export type SlotKind = "element" | "widget";

/**
 * Slot
 *
 * One replaceable part of a component.
 */
export interface SlotInfo {
  /** The key in `components`, e.g. `Day`. */
  name: string;
  /** Element or widget. */
  kind: SlotKind;
  /** The exported props type, e.g. `DpDayProps`. */
  propsType: string;
  /** For element slots, the DOM attributes type the props extend. */
  domType?: string;
  /** The first line of the props type's JSDoc. */
  title: string;
  /** The rest of the props type's JSDoc. */
  summary: string;
  /** The `data-*` attributes the JSDoc says the part carries. */
  dataAttributes: string[];
  /** Props declared by the slot itself (for element slots, on top of the DOM ones). */
  props: MemberInfo[];
  /** The source of the built-in fallback. */
  fallback: string;
}

/**
 * Label
 *
 * One user-facing string of a component.
 */
export interface LabelInfo extends MemberInfo {
  /** The English default, as source text. */
  default?: string;
}

/**
 * Component knowledge
 *
 * Everything known about one component.
 */
export interface ComponentKnowledge extends ComponentSummary {
  /** The entry point's full description. */
  description: string;
  /** The entry point's example, as source text. */
  example?: string;
  /** The API group titles, in documentation order. */
  groups: string[];
  /** Every prop of the assembled component. */
  props: PropInfo[];
  /** Props that come as controlled / uncontrolled sets. */
  controlledPairs: ControlledPair[];
  /** The element any remaining prop is forwarded to. */
  rootElement: string;
  /** The props type of the assembled component. */
  propsType: string;
  /** The headless hook, e.g. `useDatePicker`. */
  hook: string;
  /** The compound parts exported for recomposition. */
  parts: string[];
  /** The exported fallbacks object. */
  fallbacksExport: string;
  /** The exported default labels object. */
  labelsExport: string;
  /** The labels interface, e.g. `DatePickerLabels`. */
  labelsType: string;
  /** The components interface, e.g. `DatePickerComponents`. */
  componentsType: string;
  /** Every user-facing string. */
  labels: LabelInfo[];
  /** Every replaceable part, in declaration order. */
  slots: SlotInfo[];
}

/**
 * Guide summary
 *
 * A hand-written guide, listed by name.
 */
export interface GuideSummary {
  /** The file name without `.md`, e.g. `setup`. */
  name: string;
  /** The guide's first heading. */
  title: string;
}

/**
 * Adapter reference
 *
 * One ready-made slot map for a component library.
 */
export interface AdapterRef {
  /** The component it adapts. */
  component: ComponentName;
  /** The library it is written for. */
  library: Library;
  /** Its file name under `knowledge/adapters/`. */
  file: string;
}

/**
 * Knowledge index
 *
 * The table of contents `knowledge/index.json` holds.
 */
export interface KnowledgeIndex {
  /** The slotsmith version the knowledge was generated from. */
  version: string;
  /** The package's peer dependency ranges. */
  peers: Record<string, string>;
  /** Every component. */
  components: ComponentSummary[];
  /** Every guide. */
  guides: GuideSummary[];
  /** Every adapter. */
  adapters: AdapterRef[];
}
