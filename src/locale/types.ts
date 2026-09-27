import type { AutocompleteLabels } from "../autocomplete/slots/types";
import type { DataTableLabels } from "../data-table/slots/types";
import type { DatePickerLabels } from "../date-picker/slots/types";
import type { ValidationLabels } from "../file-uploader/core/validate";
import type { FileUploaderLabels } from "../file-uploader/slots/types";

/**
 * Locale sections
 *
 * One complete set of labels per component. The file uploader has two: the
 * text it renders and the messages its validation produces.
 */
export interface LocaleSections {
  table: DataTableLabels;
  autocomplete: AutocompleteLabels;
  datePicker: DatePickerLabels;
  fileUploader: FileUploaderLabels;
  fileValidation: ValidationLabels;
}

/** The name of a section of a locale. */
export type LocaleSectionName = keyof LocaleSections;

/**
 * Locale section
 *
 * The labels, or a function from the active BCP 47 tag to the labels. The
 * function form lets one pack serve every region of its language: the same
 * Arabic text formats its numbers for `ar-EG` or `ar-MA` depending on the tag
 * the app asked for.
 */
export type LocaleSection<K extends LocaleSectionName> =
  | LocaleSections[K]
  | ((code: string) => LocaleSections[K]);

/** The direction a language is written in. */
export type TextDirection = "ltr" | "rtl";

// TODO(server-locales): a serialisable locale form that can cross the server/client boundary.
/**
 * Locale
 *
 * A language for the components: a BCP 47 tag, a direction, and the labels of
 * each component it covers. A component missing from it renders in English.
 */
export type SlotsmithLocale = {
  /** BCP 47 tag, handed to `Intl` for dates, numbers and plurals. */
  readonly code: string;
  /** The direction the language is written in. */
  readonly dir: TextDirection;
} & { readonly [K in LocaleSectionName]?: LocaleSection<K> };

/** What {@link defineLocale} takes: a locale whose direction may be inferred. */
export type LocaleDefinition = Omit<SlotsmithLocale, "dir"> & { readonly dir?: TextDirection };

/** A locale, or the tag of one that was registered with the provider. */
export type LocaleInput = string | SlotsmithLocale;
