/**
 * ThemePreview
 *
 * Tries the library's ready-made themes on a small table, date picker and
 * autocomplete. The picked theme's CSS, scoped to `.theme-preview` at build
 * (`lib/preview-themes.ts`), goes in a `<style>` inside the island, so it
 * restyles the preview only, never the site, and is gone once the page is
 * left: nothing is stored. The dark palette follows the site's theme.
 */
import "slotsmith/styles.css";
import "@/styles/theme-preview.css";
import { useId, useState } from "react";
import { Autocomplete, type OptionValue } from "slotsmith/autocomplete";
import { DataTable, type DataTableColumnDef } from "slotsmith/data-table";
import { DatePicker, type ISODate } from "slotsmith/date-picker";

export interface ThemePreviewProps {
  /** Theme name → its CSS scoped to `.theme-preview`. */
  themes: Record<string, string>;
  /** The components' token rules scoped to `.theme-preview`, so they read the theme there. */
  base: string;
}

type Book = { id: string; title: string; year: number };

const books: Book[] = [
  { id: "1", title: "Things Fall Apart", year: 1958 },
  { id: "2", title: "Season of Migration to the North", year: 1966 },
  { id: "3", title: "Beloved", year: 1987 },
];

const columns: DataTableColumnDef<Book>[] = [
  { accessorKey: "title", header: "Title" },
  { accessorKey: "year", header: "Year" },
];

const genres = [
  { value: "novel", label: "Novel" },
  { value: "poetry", label: "Poetry" },
  { value: "essay", label: "Essay" },
  { value: "drama", label: "Drama" },
];

const NONE = "none";

export default function ThemePreview({ themes, base }: ThemePreviewProps) {
  const name = useId();
  const [theme, setTheme] = useState(NONE);
  const [genre, setGenre] = useState<OptionValue | null>("novel");
  const [date, setDate] = useState<ISODate | null>("2026-09-29");
  const options = [NONE, ...Object.keys(themes)];

  return (
    <div className="panel theme-preview-demo" data-theme-preview={theme}>
      <style dangerouslySetInnerHTML={{ __html: `${base}\n${themes[theme] ?? ""}` }} />
      <fieldset className="theme-picker">
        <legend className="visually-hidden">Theme</legend>
        {options.map((option) => (
          <label key={option} className="theme-picker__option mono">
            <input type="radio" name={name} value={option} checked={theme === option} onChange={() => setTheme(option)} />
            {option}
          </label>
        ))}
      </fieldset>
      <div className="theme-preview">
        <DataTable data={books} columns={columns} getRowId={(book) => book.id} enableRowSelection defaultSelection={[books[1]!]} hidePagination />
        <div className="theme-preview__fields">
          <DatePicker value={date} onChange={setDate} aria-label="Published" />
          <Autocomplete options={genres} value={genre} onChange={setGenre} aria-label="Genre" />
        </div>
      </div>
    </div>
  );
}
