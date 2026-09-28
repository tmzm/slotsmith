"use client";

import { useMemo, type HTMLAttributes, type ReactNode } from "react";
import { useLocaleSection } from "../locale/useLocaleSection";
import type { LocaleInput } from "../locale/types";
import { usePopupPosition, type PopupPlacement } from "../shared/position";
import type { OptionValue } from "./core/types";
import { useAutocomplete, type UseAutocompleteOptions } from "./core/useAutocomplete";
import {
  AutocompleteList,
  AutocompleteLiveRegion,
  AutocompleteOptions,
  AutocompletePopup,
  AutocompleteSearch,
  AutocompleteStatusRows,
  AutocompleteTrigger,
  mergeProps,
} from "./parts";
import { AutocompleteContext, useAutocompleteContext, type AutocompleteContextValue } from "./slots/context";
import { autocompleteFallbacks, defaultAutocompleteLabels } from "./slots/fallbacks";
import type { AutocompleteComponents, AutocompleteLabels, AutocompleteSlotProps } from "./slots/types";

/**
 * Engine options
 *
 * The parts of {@link UseAutocompleteOptions} the component passes straight
 * through. Selection is handled separately, because its shape depends on
 * `multiple`.
 *
 * @typeParam TOption - The option type.
 */
type EngineOptions<TOption> = Omit<
  UseAutocompleteOptions<TOption>,
  "multiple" | "value" | "defaultValue" | "onValuesChange" | "selected"
>;

/**
 * Shared autocomplete props
 *
 * Everything that means the same thing in both single and multiple mode.
 *
 * @typeParam TOption - The option type.
 */
export interface AutocompleteSharedProps<TOption> extends EngineOptions<TOption> {
  /** Replace any part; the rest stay as fallbacks. */
  components?: Partial<AutocompleteComponents<TOption>>;
  /** Override any string. Wins over `locale`. */
  labels?: Partial<AutocompleteLabels>;
  /** The language: a locale object, or the tag of one given to `SlotsmithProvider`. Defaults to the provider's. */
  locale?: LocaleInput;
  /** Extra DOM props for the element parts. */
  slotProps?: AutocompleteSlotProps;
  /** Trigger text when nothing is selected. Defaults to `labels.placeholder`. */
  placeholder?: string;
  /** Tags shown before the rest collapse into `+N`. Defaults to 2. */
  maxTags?: number;
  /** Which side of the trigger the popup prefers. Defaults to `bottom`. */
  placement?: PopupPlacement;
  /** Gap between trigger and popup, in pixels. Defaults to 4. */
  popupOffset?: number;
  /** Make the popup exactly as wide as the trigger. Defaults to `true`. */
  matchTriggerWidth?: boolean;
  /** Upper bound on the popup's height, in pixels. Defaults to 320. */
  popupMaxHeight?: number;
  /** Renders a hidden input per value, so a plain HTML form submits it. */
  name?: string;
}

/**
 * Single-mode selection props
 *
 * @typeParam TOption - The option type.
 */
interface SingleSelection<TOption> {
  /** One value at a time. */
  multiple?: false;
  /** The selected id, or `null` for nothing. */
  value?: OptionValue | null;
  /** The selected id while uncontrolled. */
  defaultValue?: OptionValue | null;
  /** The new id and, where known, the option behind it. `null` means cleared. */
  onChange?: (value: OptionValue | null, option?: TOption) => void;
  /** The option behind `value`, for an id whose option is not in `options`. */
  selected?: TOption | null;
}

/**
 * Multiple-mode selection props
 *
 * @typeParam TOption - The option type.
 */
interface MultipleSelection<TOption> {
  /** Several values, with the popup staying open on each pick. */
  multiple: true;
  /** The selected ids. */
  value?: OptionValue[];
  /** The selected ids while uncontrolled. */
  defaultValue?: OptionValue[];
  /**
   * The new ids, and the options index-aligned with them. An entry is
   * `undefined` only when an id was supplied that no option has been seen
   * for, so the two arrays always correspond.
   */
  onChange?: (values: OptionValue[], options: (TOption | undefined)[]) => void;
  /** The options behind `value`, for ids whose options are not in `options`. */
  selected?: TOption[];
}

/**
 * Autocomplete provider props
 *
 * A discriminated union on `multiple`: `value`, `defaultValue`, `onChange`
 * and `selected` all narrow from it, so neither mode can be handed the
 * other's shape.
 *
 * @typeParam TOption - The option type.
 */
export type AutocompleteProviderProps<TOption> = AutocompleteSharedProps<TOption> &
  (SingleSelection<TOption> | MultipleSelection<TOption>) & {
    /** Your layout, built from the compound parts. */
    children?: ReactNode;
  };

/**
 * Loose props
 *
 * The union flattened for the implementation. This is the one cast the
 * component keeps; everything downstream works on normalized arrays.
 *
 * @typeParam TOption - The option type.
 */
type LooseProps<TOption> = AutocompleteSharedProps<TOption> & {
  multiple?: boolean;
  value?: OptionValue | OptionValue[] | null;
  defaultValue?: OptionValue | OptionValue[] | null;
  onChange?: (value: never, option: never) => void;
  selected?: TOption | TOption[] | null;
  children?: ReactNode;
};

/**
 * To array
 *
 * Normalizes a selection to a list, dropping the values a form library uses
 * for "nothing": `null`, `undefined` and the empty string.
 *
 * @typeParam T - The entry type.
 * @param value - One entry, several, or nothing.
 * @returns The entries that count as a selection.
 */
const toArray = <T,>(value: T | T[] | null | undefined): T[] => {
  if (value === null || value === undefined) return [];
  const list = Array.isArray(value) ? value : [value];
  return list.filter((entry) => entry !== null && entry !== undefined && entry !== ("" as unknown as T));
};

/**
 * Without undefined
 *
 * Drops `undefined` entries, so `{ Option: undefined }` keeps the fallback
 * instead of erasing it.
 *
 * @typeParam O - The object type.
 * @param object - The overrides, or nothing.
 * @returns The defined entries.
 */
const withoutUndefined = <O extends object>(object: O | undefined): Partial<O> =>
  Object.fromEntries(Object.entries(object ?? {}).filter(([, value]) => value !== undefined)) as Partial<O>;

/**
 * Autocomplete.Provider
 *
 * Runs the engine and shares it with the compound parts and
 * `useAutocompleteContext()`. Renders no markup of its own, so the layout is
 * entirely yours.
 *
 * @typeParam TOption - The option type.
 * @param props - See {@link AutocompleteProviderProps}.
 *
 * @example
 * ```tsx
 * <Autocomplete.Provider options={brands} value={brandId} onChange={setBrandId}>
 *   <Autocomplete.Root>
 *     <Autocomplete.Trigger />
 *     <Autocomplete.Popup />
 *   </Autocomplete.Root>
 * </Autocomplete.Provider>
 * ```
 */
export function AutocompleteProvider<TOption>(props: AutocompleteProviderProps<TOption>) {
  const {
    components,
    labels: labelOverrides,
    locale,
    slotProps,
    placeholder,
    maxTags = 2,
    placement,
    popupOffset,
    matchTriggerWidth,
    popupMaxHeight,
    name,
    multiple,
    value,
    defaultValue,
    onChange,
    selected,
    children,
    ...engineOptions
  } = props as LooseProps<TOption>;

  const { labels: localeLabels } = useLocaleSection("autocomplete", locale);
  /** English, then the locale, then the caller's own overrides. */
  const labels = useMemo(
    () => ({
      ...defaultAutocompleteLabels,
      ...withoutUndefined(localeLabels),
      ...withoutUndefined(labelOverrides),
    }),
    [localeLabels, labelOverrides],
  );
  const parts = useMemo(
    () => ({ ...autocompleteFallbacks, ...withoutUndefined(components) }) as AutocompleteComponents<TOption>,
    [components],
  );

  const model = useAutocomplete<TOption>({
    ...engineOptions,
    multiple,
    selected: toArray(selected),
    value: value === undefined ? undefined : toArray(value),
    defaultValue: defaultValue === undefined ? undefined : toArray(defaultValue),
    onValuesChange: (values, options) => {
      const emit = onChange as unknown as ((next: unknown, option: unknown) => void) | undefined;
      if (multiple) emit?.(values, options);
      else emit?.(values[0] ?? null, options[0]);
    },
  });

  const position = usePopupPosition({
    open: model.open,
    placement,
    offset: popupOffset,
    matchTriggerWidth,
    maxHeight: popupMaxHeight,
  });

  const contextValue: AutocompleteContextValue<TOption> = {
    ...model,
    components: parts,
    labels,
    slotProps: slotProps ?? {},
    position,
    placeholder: placeholder ?? labels.placeholder,
    maxTags,
  };

  return (
    <AutocompleteContext.Provider value={contextValue as AutocompleteContextValue}>
      {children}
      {name
        ? model.values.map((entry) => (
            <input key={String(entry)} type="hidden" name={name} value={String(entry)} />
          ))
        : null}
    </AutocompleteContext.Provider>
  );
}

/**
 * Root props
 *
 * Plain `<div>` props for the element the popup is positioned against.
 */
export interface AutocompleteRootProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {}

/**
 * Autocomplete.Root
 *
 * The `Root` part, carrying `data-open`, `data-disabled` and `data-empty`,
 * and the element the outside-click check measures against.
 *
 * @param props - See {@link AutocompleteRootProps}.
 */
export function AutocompleteRoot(props: AutocompleteRootProps) {
  const { components: C, slotProps, getRootProps } = useAutocompleteContext();

  return <C.Root {...mergeProps(mergeProps(getRootProps(), slotProps.root), props)} />;
}

/**
 * Autocomplete props
 *
 * The provider props plus the root's `<div>` props.
 *
 * @typeParam TOption - The option type.
 */
export type AutocompleteProps<TOption> = Omit<AutocompleteProviderProps<TOption>, "children"> &
  Omit<AutocompleteRootProps, "children" | "defaultValue" | "onChange">;

/**
 * Provider keys
 *
 * The props that belong to the provider; anything else lands on the root.
 */
const PROVIDER_KEYS = [
  "options", "getOptionValue", "getOptionLabel", "optionDisabled", "filter", "selected",
  "multiple", "value", "defaultValue", "onChange",
  "searchable", "searchQuery", "defaultSearchQuery", "onSearchChange", "minChars",
  "open", "defaultOpen", "onOpenChange",
  "loading", "error", "onRetry", "hasMore", "onLoadMore", "loadingMore",
  "creatable", "onCreate", "createLoading",
  "clearable", "closeOnSelect", "loop", "disabled", "onBlur",
  "components", "labels", "locale", "slotProps", "placeholder", "maxTags",
  "placement", "popupOffset", "matchTriggerWidth", "popupMaxHeight", "name",
] as const;

/**
 * Missing provider keys
 *
 * Compile-time guard: adding a provider option without listing it above fails
 * to type-check.
 */
type MissingProviderKeys = Exclude<
  keyof AutocompleteProviderProps<unknown>,
  (typeof PROVIDER_KEYS)[number] | "children"
>;
const _allProviderKeysListed: [MissingProviderKeys] extends [never] ? true : MissingProviderKeys = true;
void _allProviderKeysListed;

const providerKeys = new Set<string>(PROVIDER_KEYS);

/**
 * Split autocomplete props
 *
 * Separates `<Autocomplete>` props into provider options and root DOM props.
 * Useful when wrapping the component in one of your own on the same props.
 *
 * @typeParam TOption - The option type.
 * @typeParam P - The full props type.
 * @param props - The component's props.
 * @returns `providerProps` for `Autocomplete.Provider`, `rest` for your layout.
 *
 * @example
 * ```tsx
 * function BrandPicker(props: AutocompleteProps<Brand> & { hint?: string }) {
 *   const { providerProps, rest } = splitAutocompleteProps<Brand, typeof props>(props);
 *   const { hint, ...rootProps } = rest;
 *   return (
 *     <Autocomplete.Provider {...providerProps}>
 *       <Autocomplete.Root {...rootProps}>
 *         <Autocomplete.Trigger />
 *         <Autocomplete.Popup />
 *       </Autocomplete.Root>
 *       {hint ? <p>{hint}</p> : null}
 *     </Autocomplete.Provider>
 *   );
 * }
 * ```
 */
export function splitAutocompleteProps<TOption, P extends AutocompleteProps<TOption>>(props: P) {
  const providerProps: Record<string, unknown> = {};
  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    (providerKeys.has(key) ? providerProps : rest)[key] = value;
  }
  return {
    providerProps: providerProps as unknown as AutocompleteProviderProps<TOption>,
    rest: rest as Omit<P, keyof AutocompleteProviderProps<TOption>>,
  };
}

/**
 * Trigger prop keys
 *
 * Attributes that name or validate the control. They belong on the element
 * carrying `role="combobox"`, not on the wrapper, because that element is
 * what assistive technology announces.
 */
const TRIGGER_PROP_KEYS = new Set([
  "id",
  "title",
  "aria-label",
  "aria-labelledby",
  "aria-describedby",
  "aria-details",
  "aria-errormessage",
  "aria-invalid",
  "aria-required",
]);

/**
 * Split root props
 *
 * Routes the naming and validation attributes to the trigger and leaves
 * everything else — `className`, `style`, data attributes — on the root.
 *
 * Exported so alternative layouts, such as the virtualized one, name the
 * combobox the same way the default layout does.
 *
 * @param rest - The DOM props passed to `<Autocomplete>`.
 * @returns Props for the trigger and props for the root.
 */
export function splitRootProps(rest: Record<string, unknown>) {
  const triggerProps: Record<string, unknown> = {};
  const rootProps: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rest)) {
    (TRIGGER_PROP_KEYS.has(key) ? triggerProps : rootProps)[key] = value;
  }
  return { triggerProps, rootProps };
}

/**
 * Autocomplete component
 *
 * The default layout: root, trigger, popup and the live region.
 *
 * @typeParam TOption - The option type.
 */
function AutocompleteComponent<TOption>(props: AutocompleteProps<TOption>) {
  const { providerProps, rest } = splitAutocompleteProps<TOption, AutocompleteProps<TOption>>(props);
  const { triggerProps, rootProps } = splitRootProps(rest as Record<string, unknown>);

  return (
    <AutocompleteProvider<TOption> {...providerProps}>
      <AutocompleteRoot {...(rootProps as AutocompleteRootProps)}>
        <AutocompleteTrigger {...triggerProps} />
        <AutocompletePopup />
        <AutocompleteLiveRegion />
      </AutocompleteRoot>
    </AutocompleteProvider>
  );
}

/**
 * Autocomplete
 *
 * A combobox that is also a select: leave `searchable` on and it filters as
 * you type, turn it off and it is a plain select with typeahead. One trigger,
 * one focus model, one keyboard path.
 *
 * Every part is replaceable through `components`, every string through
 * `labels`, and the fallbacks are plain accessible HTML. The compound parts
 * (`Autocomplete.Provider`, `.Root`, `.Trigger`, `.Popup`, `.List`,
 * `.Options`) are there when the default layout is not enough.
 *
 * @typeParam TOption - The option type.
 * @param props - See {@link AutocompleteProps}.
 *
 * @example
 * ```tsx
 * // A select.
 * <Autocomplete searchable={false} options={countries} value={code} onChange={setCode} />
 *
 * // A combobox, remote and paged.
 * const brands = useAsyncOptions({ load: (q, page, signal) => api.brands({ q, page, signal }) });
 * <Autocomplete {...brands} value={brandId} onChange={setBrandId} />
 *
 * // Several at once.
 * <Autocomplete multiple options={tags} value={tagIds} onChange={setTagIds} />
 * ```
 */
export const Autocomplete = /* @__PURE__ */ Object.assign(AutocompleteComponent, {
  Provider: AutocompleteProvider,
  Root: AutocompleteRoot,
  Trigger: AutocompleteTrigger,
  Popup: AutocompletePopup,
  Search: AutocompleteSearch,
  List: AutocompleteList,
  Options: AutocompleteOptions,
  StatusRows: AutocompleteStatusRows,
  LiveRegion: AutocompleteLiveRegion,
});
