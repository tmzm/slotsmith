import { DataTable, type DataTableColumnDef } from "slotsmith/data-table";
import { createNumber, defineLocale } from "slotsmith/locale";

// The direction is inferred from the code: "ltr" here, "rtl" for ar, fa, he, ur…
// Every section is optional, but one that is present must have every key:
// leaving one out is a type error, not an English word in a Dutch screen.
export const nl = defineLocale({
  code: "nl",
  // A section can be a function of the active tag, so numbers follow it.
  table: (code) => {
    const number = createNumber(code);
    return {
      empty: "Geen gegevens",
      error: "Er ging iets mis bij het laden.",
      retry: "Opnieuw proberen",
      rowsPerPage: "Rijen per pagina",
      pageInfo: (page, pageCount) => `Pagina ${number(page)} van ${number(pageCount)}`,
      pagination: "Paginering",
      previousPage: "Vorige pagina",
      nextPage: "Volgende pagina",
      selectAll: "Alle rijen op deze pagina selecteren",
      selectRow: "Rij selecteren",
      expandRow: "Rij uitklappen",
      collapseRow: "Rij inklappen",
      reorderRow: "Rij verplaatsen",
      reorderInstructions:
        "Druk op spatie om de rij op te pakken, gebruik de pijltjestoetsen om te verplaatsen, spatie om neer te zetten en Escape om te annuleren.",
      reorderLifted: (position, total) => `Rij opgepakt. Positie ${number(position)} van ${number(total)}.`,
      reorderMoved: (position, total) => `Positie ${number(position)} van ${number(total)}.`,
      reorderDropped: (position, total) => `Rij neergezet op positie ${number(position)} van ${number(total)}.`,
      reorderCancelled: "Verplaatsen geannuleerd.",
    };
  },
  // autocomplete, datePicker, fileUploader and fileValidation are left out:
  // those components stay in English.
});

type City = { id: string; name: string; province: string };

const cities: City[] = [
  { id: "1", name: "Amsterdam", province: "Noord-Holland" },
  { id: "2", name: "Rotterdam", province: "Zuid-Holland" },
  { id: "3", name: "Utrecht", province: "Utrecht" },
  { id: "4", name: "Groningen", province: "Groningen" },
  { id: "5", name: "Maastricht", province: "Limburg" },
];

const columns: DataTableColumnDef<City>[] = [
  { accessorKey: "name", header: "Stad" },
  { accessorKey: "province", header: "Provincie" },
];

export default function CustomPack() {
  return (
    <div lang="nl">
      <DataTable locale={nl} data={cities} columns={columns} enableRowSelection defaultPagination={{ pageIndex: 0, pageSize: 2 }} pageSizeOptions={[2, 5]} />
    </div>
  );
}
