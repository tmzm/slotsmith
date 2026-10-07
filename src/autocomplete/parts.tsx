"use client";

import { Fragment, type ReactNode, type Ref } from "react";
import type { AutocompleteSection } from "./core/groups";
import { mergeProps, mergeRefs } from "../shared/mergeProps";
import { useAutocompleteContext } from "./slots/context";
import { classes } from "./classes";

export { mergeProps, mergeRefs };

/**
 * Trigger prop keys
 *
 * Attributes that name or validate the control. They belong on the element
 * carrying `role="combobox"` — the trigger, or the input inside it with
 * `searchIn="trigger"` — not on a wrapper, because that element is what
 * assistive technology announces.
 */
export const TRIGGER_PROP_KEYS = new Set([
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
 * Autocomplete.Trigger
 *
 * The `Trigger` part with what it contains: the selected value or its tags,
 * the clear control, and the indicator. Carries `role="combobox"`.
 *
 * With `searchIn="trigger"` it is a field instead: the tags, then the
 * `TriggerInput` that is the combobox, the clear control and the `Toggle`.
 * Naming and validation props (`id`, `aria-label`, `aria-describedby`…)
 * then go to the input and the rest to the field.
 *
 * @example
 * ```tsx
 * <Autocomplete.Provider options={brands} value={value} onChange={setValue}>
 *   <Autocomplete.Root>
 *     <label id="brand-label">Brand</label>
 *     <Autocomplete.Trigger aria-labelledby="brand-label" />
 *     <Autocomplete.Popup />
 *   </Autocomplete.Root>
 * </Autocomplete.Provider>
 * ```
 */
export function AutocompleteTrigger(props: Record<string, unknown> = {}) {
  const {
    components: C,
    labels,
    slotProps,
    position,
    multiple,
    values,
    selected,
    getOptionLabel,
    remove,
    clear,
    showClear,
    open,
    loading,
    disabled,
    placeholder,
    maxTags,
    triggerRef,
    searchRef,
    searchIn,
    getTriggerProps,
    getTriggerInputProps,
    getToggleProps,
  } = useAutocompleteContext();

  const shown = selected.slice(0, maxTags);
  const overflow = values.length - shown.length;
  const first = selected[0];
  const firstLabel = first?.option ? getOptionLabel(first.option) : first ? String(first.value) : undefined;

  const triggerProps = getTriggerProps();

  const tags = (
    <>
      {shown.map(({ value, option }) => {
        const label = option ? getOptionLabel(option) : String(value);
        return (
          <C.Tag
            key={String(value)}
            value={value}
            option={option}
            label={label}
            removeLabel={labels.remove(label)}
            disabled={disabled}
            onRemove={() => remove(value)}
          />
        );
      })}
      {overflow > 0 ? <span className={classes.overflow}>{labels.more(overflow)}</span> : null}
    </>
  );

  if (searchIn === "trigger") {
    /** The naming and validation attributes belong on the input, which is the combobox; the rest style the field. */
    const inputProps: Record<string, unknown> = {};
    const fieldProps: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
      (TRIGGER_PROP_KEYS.has(key) ? inputProps : fieldProps)[key] = value;
    }
    /** The placeholder stands in only for an empty value; in single mode a picked label waits there while searching. */
    const inputPlaceholder = values.length === 0 ? placeholder : multiple ? undefined : firstLabel;

    return (
      <C.Trigger
        {...mergeProps(
          mergeProps(triggerProps, slotProps.trigger),
          { ...fieldProps, ref: mergeRefs(triggerRef, position.setTrigger) },
        )}
      >
        <span className={classes.body}>
          {multiple ? tags : null}
          <C.TriggerInput
            {...mergeProps(
              mergeProps({ ...getTriggerInputProps(), placeholder: inputPlaceholder }, slotProps.triggerInput),
              { ...inputProps, ref: searchRef },
            )}
          />
        </span>

        {showClear ? <C.Clear aria-label={labels.clear} onClick={clear} /> : null}
        <C.Toggle {...getToggleProps()} aria-label={labels.toggle}>
          <C.Indicator open={open} loading={loading} />
        </C.Toggle>
      </C.Trigger>
    );
  }

  return (
    <C.Trigger
      {...mergeProps(
        mergeProps(triggerProps, slotProps.trigger),
        { ...props, ref: mergeRefs(triggerRef, position.setTrigger) },
      )}
    >
      <span className={classes.body}>
        {multiple ? (
          values.length === 0 ? (
            <C.Value placeholder={placeholder} empty />
          ) : (
            tags
          )
        ) : (
          <C.Value
            label={firstLabel}
            placeholder={placeholder}
            empty={values.length === 0}
          />
        )}
      </span>

      {showClear ? <C.Clear aria-label={labels.clear} onClick={clear} /> : null}
      <C.Indicator open={open} loading={loading} />
    </C.Trigger>
  );
}

/**
 * Autocomplete.Search
 *
 * The search box inside the popup. Renders nothing when `searchable` is off,
 * which is what makes the same component a plain select, or when `searchIn`
 * is `"trigger"`, where the input inside the trigger searches instead.
 */
export function AutocompleteSearch(props: Record<string, unknown> = {}) {
  const { components: C, labels, slotProps, searchable, searchIn, searchRef, getSearchProps } = useAutocompleteContext();
  if (!searchable || searchIn === "trigger") return null;

  return (
    <C.Search
      {...mergeProps(
        mergeProps({ ...getSearchProps(), placeholder: labels.search, "aria-label": labels.search }, slotProps.search),
        { ...props, ref: searchRef },
      )}
    />
  );
}

/**
 * Autocomplete.Option
 *
 * One option row, by its position in the rendered list. Windowing renderers
 * use it to draw only the rows in view.
 *
 * @param props - The option and the index it is being rendered at.
 *
 * @example
 * ```tsx
 * {virtualItems.map((item) => (
 *   <AutocompleteOptionView key={item.key} option={options[item.index]!} index={item.index} />
 * ))}
 * ```
 */
export function AutocompleteOptionView({ option, index }: { option: unknown; index: number }) {
  const {
    components: C,
    slotProps,
    values,
    highlightedIndex,
    getOptionValue,
    getOptionLabel,
    isOptionDisabled,
    getOptionProps,
  } = useAutocompleteContext();

  const value = getOptionValue(option);
  const selected = values.includes(value);
  const disabled = isOptionDisabled(option);

  return (
    <C.Option {...mergeProps(getOptionProps(option, index), slotProps.option?.(option, index))}>
      <C.OptionLabel
        option={option}
        label={getOptionLabel(option)}
        selected={selected}
        highlighted={index === highlightedIndex}
        disabled={disabled}
      />
      <C.Check selected={selected} />
    </C.Option>
  );
}

/**
 * Autocomplete.Group
 *
 * The `Group` part around one named section: `role="group"`, labelled by its
 * `GroupLabel`. Windowing renderers use it to wrap the rows in view.
 *
 * @param props - The section, and the rows to put inside it.
 *
 * @example
 * ```tsx
 * <AutocompleteGroupView section={section}>
 *   <AutocompleteGroupLabelView section={section} />
 *   {rows}
 * </AutocompleteGroupView>
 * ```
 */
export function AutocompleteGroupView({ section, children }: { section: AutocompleteSection<unknown>; children?: ReactNode }) {
  const { components: C, getGroupProps } = useAutocompleteContext();

  return (
    <C.Group {...getGroupProps(section)} label={section.group ?? ""} labelId={section.labelId ?? ""}>
      {children}
    </C.Group>
  );
}

/**
 * Autocomplete.GroupLabel
 *
 * The `GroupLabel` part: the heading row a group is labelled by.
 *
 * @param props - The section it heads, and whether to render it hidden: a
 *   windowed list keeps a hidden copy for a group whose label row has
 *   scrolled away, so the group is still named the same way.
 */
export function AutocompleteGroupLabelView({ section, hidden }: { section: AutocompleteSection<unknown>; hidden?: boolean }) {
  const { components: C, getGroupLabelProps } = useAutocompleteContext();
  const props = getGroupLabelProps(section) as { id: string; role: "presentation" };

  return <C.GroupLabel {...props} label={section.group ?? ""} {...(hidden ? { hidden: true } : {})} />;
}

/**
 * Autocomplete.Separator
 *
 * The `Separator` part between two sections, presentational and hidden from
 * assistive technology.
 */
export function AutocompleteSeparatorView() {
  const { components: C, getSeparatorProps } = useAutocompleteContext();

  return <C.Separator {...getSeparatorProps()} />;
}

/**
 * Section key
 *
 * A React key for a section that cannot collide between a group and the
 * ungrouped options.
 *
 * @param section - The section.
 * @returns Its key.
 */
export const sectionKey = (section: AutocompleteSection<unknown>) =>
  section.group === undefined ? "ungrouped" : `group:${section.group}`;

/**
 * Autocomplete.Options
 *
 * Every option row, without the listbox around them. Use it when the list
 * needs a wrapper of its own. With `getOptionGroup` set, the rows come in
 * their groups, each with its label, and a separator between sections.
 */
export function AutocompleteOptions() {
  const { options, sections, grouped, getOptionValue } = useAutocompleteContext();

  if (!grouped) {
    return (
      <>
        {options.map((option, index) => (
          <AutocompleteOptionView key={String(getOptionValue(option))} option={option} index={index} />
        ))}
      </>
    );
  }

  return (
    <>
      {sections.map((section, sectionIndex) => {
        const rows = section.options.map((option, offset) => (
          <AutocompleteOptionView
            key={String(getOptionValue(option))}
            option={option}
            index={section.start + offset}
          />
        ));
        return (
          <Fragment key={sectionKey(section)}>
            {sectionIndex > 0 ? <AutocompleteSeparatorView /> : null}
            {section.group === undefined ? (
              rows
            ) : (
              <AutocompleteGroupView section={section}>
                <AutocompleteGroupLabelView section={section} />
                {rows}
              </AutocompleteGroupView>
            )}
          </Fragment>
        );
      })}
    </>
  );
}

/**
 * Autocomplete.StatusRows
 *
 * The one row that stands in for the options when there are none: the error,
 * the loading message, or the empty message. An error replaces the list
 * entirely, so a failed request never reads as "no results".
 */
export function AutocompleteStatusRows() {
  const { components: C, labels, status, query, error, onRetry, minChars } = useAutocompleteContext();

  if (status === "error") {
    return <C.Error error={error ?? ""} onRetry={onRetry} retryLabel={labels.retry} />;
  }
  if (status === "loading") return <C.Loading message={labels.loading} />;
  if (status === "min-chars") {
    return <C.Empty query={query} status={status} message={labels.minChars(minChars)} />;
  }
  if (status === "empty") return <C.Empty query={query} status={status} message={labels.empty} />;
  return null;
}

/**
 * Autocomplete.List
 *
 * The `role="listbox"` and everything in it: the options or the status row,
 * then the create and load-more rows.
 *
 * @param props - Extra DOM props for the list element.
 */
export function AutocompleteList(props: Record<string, unknown> = {}) {
  const {
    components: C,
    labels,
    slotProps,
    status,
    query,
    canCreate,
    create,
    createLoading,
    hasMore,
    loadMore,
    loadingMore,
    listRef,
    sentinelRef,
    getListProps,
  } = useAutocompleteContext();

  return (
    <C.List {...mergeProps(mergeProps(getListProps(), slotProps.list), { ...props, ref: listRef })}>
      {status === "ready" ? <AutocompleteOptions /> : canCreate ? null : <AutocompleteStatusRows />}

      {canCreate ? (
        <C.Create
          query={query.trim()}
          label={createLoading ? labels.creating : labels.create(query.trim())}
          loading={createLoading}
          onCreate={create}
        />
      ) : null}

      {hasMore && status !== "error" ? (
        <C.LoadMore
          ref={sentinelRef as Ref<HTMLLIElement>}
          onLoadMore={loadMore}
          loading={loadingMore}
          label={loadingMore ? labels.loading : labels.loadMore}
        />
      ) : null}
    </C.List>
  );
}

/**
 * Autocomplete.Popup
 *
 * The floating surface: the search box and the list, positioned against the
 * trigger. Renders nothing while closed.
 *
 * @param props - Extra DOM props for the popup element.
 */
export function AutocompletePopup(props: Record<string, unknown> = {}) {
  const { components: C, slotProps, open, position, getPopupProps } = useAutocompleteContext();
  if (!open) return null;

  return (
    <C.Popup
      {...mergeProps(mergeProps({ ...getPopupProps(), style: position.style, "data-placement": position.placement }, slotProps.popup), {
        ...props,
        ref: position.setPopup,
      })}
    >
      <AutocompleteSearch />
      <AutocompleteList />
    </C.Popup>
  );
}

/**
 * Autocomplete.LiveRegion
 *
 * Announces how many options are available, so a screen-reader user learns
 * that typing changed the list. Visually hidden.
 */
export function AutocompleteLiveRegion() {
  const { labels, options, open, status } = useAutocompleteContext();
  const message = !open || status !== "ready" ? "" : labels.results(options.length);

  return (
    <span className={classes.srOnly} role="status" aria-live="polite">
      {message}
    </span>
  );
}
