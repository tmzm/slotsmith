/**
 * Get option group
 *
 * Reads the name of the group an option belongs to, or `undefined` for an
 * option outside every group. The name is also the group's visible label.
 *
 * @typeParam TOption - The option type.
 */
export type GetOptionGroup<TOption> = (option: TOption) => string | undefined;

/**
 * Autocomplete section
 *
 * One run of options in the rendered list: a named group, or the options that
 * belong to none.
 *
 * @typeParam TOption - The option type.
 */
export interface AutocompleteSection<TOption> {
  /** The group's name, which is also its label. `undefined` for the ungrouped options. */
  group: string | undefined;
  /** The section's options, in render order. */
  options: TOption[];
  /** Where the section's first option sits in the flat `options` list. */
  start: number;
  /** The id of the group's label element, which the group is labelled by. `undefined` without a group. */
  labelId: string | undefined;
}

/**
 * Group options
 *
 * Gathers a flat option list into sections. Groups appear in the order their
 * first option does, and an option joins its group wherever it sits in the
 * list, so a group whose options arrive across several pages stays in one
 * piece. The options outside every group form one unlabelled section, placed
 * where the first of them appeared. Within a section the original order is
 * kept.
 *
 * The returned `options` is the same list in section order, so an index into
 * it is the option's position on screen and the keyboard follows what is
 * shown.
 *
 * @typeParam TOption - The option type.
 * @param options - The options, already filtered.
 * @param getOptionGroup - Reads an option's group. Without it there is one ungrouped section.
 * @param labelId - Builds the id of a group's label from its name.
 * @returns The options in render order and the sections they form.
 *
 * @example
 * ```ts
 * const { options, sections } = groupOptions(cities, (city) => city.country, (group) => `group-${group}`);
 * ```
 */
export function groupOptions<TOption>(
  options: TOption[],
  getOptionGroup: GetOptionGroup<TOption> | undefined,
  labelId: (group: string) => string,
): { options: TOption[]; sections: AutocompleteSection<TOption>[] } {
  if (!getOptionGroup) {
    return { options, sections: [{ group: undefined, options, start: 0, labelId: undefined }] };
  }

  /** `undefined` is a bucket too, so ungrouped options keep their first position. */
  const buckets = new Map<string | undefined, TOption[]>();
  for (const option of options) {
    const group = getOptionGroup(option);
    const bucket = buckets.get(group);
    if (bucket) bucket.push(option);
    else buckets.set(group, [option]);
  }

  const ordered: TOption[] = [];
  const sections: AutocompleteSection<TOption>[] = [];
  for (const [group, members] of buckets) {
    sections.push({
      group,
      options: members,
      start: ordered.length,
      labelId: group === undefined ? undefined : labelId(group),
    });
    ordered.push(...members);
  }
  return { options: ordered, sections };
}
