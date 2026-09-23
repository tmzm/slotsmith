"use client";

import type { CSSProperties, Ref } from "react";
import { useAutocompleteContext } from "./slots/context";

/**
 * Merge props
 *
 * Combines the props a part sets itself with the ones a caller passed through
 * `slotProps`: class names are joined, styles are merged, and event handlers
 * are chained so neither is lost.
 *
 * Keys whose value is `undefined` are dropped, so passing
 * `{ className: undefined }` leaves a replacement component's own class
 * intact instead of erasing it.
 *
 * @param base - What the part sets.
 * @param extra - What the caller passed.
 * @returns The merged props.
 *
 * @example
 * ```tsx
 * <C.Option {...mergeProps(model.getOptionProps(option, index), slotProps.option?.(option, index))} />
 * ```
 */
export function mergeProps<A extends Record<string, any>, B extends Record<string, any> | undefined>(
  base: A,
  extra: B,
): A & NonNullable<B> {
  if (!extra) return base as A & NonNullable<B>;

  const merged: Record<string, any> = { ...base };

  for (const [key, value] of Object.entries(extra)) {
    if (value === undefined) continue;

    const current = merged[key];
    if (key === "className") {
      merged[key] = [current, value].filter(Boolean).join(" ") || undefined;
    } else if (key === "style") {
      merged[key] = { ...(current as CSSProperties), ...(value as CSSProperties) };
    } else if (key.startsWith("on") && typeof current === "function" && typeof value === "function") {
      merged[key] = (...args: unknown[]) => {
        current(...args);
        value(...args);
      };
    } else {
      merged[key] = value;
    }
  }

  return merged as A & NonNullable<B>;
}

/**
 * Merge refs
 *
 * Points several refs at one element. The trigger needs it: the engine keeps
 * a ref to focus it, and the positioner keeps its own.
 *
 * @typeParam E - The element type.
 * @param refs - The refs to fill.
 * @returns A callback ref.
 */
export function mergeRefs<E>(...refs: (Ref<E> | ((element: E | null) => void) | undefined)[]) {
  return (element: E | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(element);
      else if (ref && typeof ref === "object") (ref as { current: E | null }).current = element;
    }
  };
}

/**
 * Autocomplete.Trigger
 *
 * The `Trigger` part with what it contains: the selected value or its tags,
 * the clear control, and the indicator. Carries `role="combobox"`.
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
    getTriggerProps,
  } = useAutocompleteContext();

  const shown = selected.slice(0, maxTags);
  const overflow = values.length - shown.length;
  const first = selected[0];

  const triggerProps = getTriggerProps();

  return (
    <C.Trigger
      {...mergeProps(
        mergeProps(triggerProps, slotProps.trigger),
        { ...props, ref: mergeRefs(triggerRef, position.setTrigger) },
      )}
    >
      <span className="sac__body">
        {multiple ? (
          values.length === 0 ? (
            <C.Value placeholder={placeholder} empty />
          ) : (
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
              {overflow > 0 ? <span className="sac__overflow">{labels.more(overflow)}</span> : null}
            </>
          )
        ) : (
          <C.Value
            label={first?.option ? getOptionLabel(first.option) : first ? String(first.value) : undefined}
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
 * which is what makes the same component a plain select.
 */
export function AutocompleteSearch(props: Record<string, unknown> = {}) {
  const { components: C, labels, slotProps, searchable, searchRef, getSearchProps } = useAutocompleteContext();
  if (!searchable) return null;

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
 * Autocomplete.Options
 *
 * Every option row, without the listbox around them. Use it when the list
 * needs a wrapper of its own.
 */
export function AutocompleteOptions() {
  const { options, getOptionValue } = useAutocompleteContext();

  return (
    <>
      {options.map((option, index) => (
        <AutocompleteOptionView key={String(getOptionValue(option))} option={option} index={index} />
      ))}
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
  const { components: C, slotProps, open, position } = useAutocompleteContext();
  if (!open) return null;

  return (
    <C.Popup
      {...mergeProps(mergeProps({ style: position.style, "data-placement": position.placement }, slotProps.popup), {
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
    <span className="sac__sr-only" role="status" aria-live="polite">
      {message}
    </span>
  );
}
