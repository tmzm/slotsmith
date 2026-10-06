import { DataTable, type PaginationSlotProps } from "slotsmith/data-table";
import { columns, people } from "../shared/people";

// A widget part is told what is true (the page, the page count, what can
// happen next) and decides the markup itself.
function Pager({ pageIndex, pageCount, canPreviousPage, canNextPage, previousPage, nextPage, labels }: PaginationSlotProps) {
  return (
    <nav aria-label="Pages" className="app-pager">
      <button type="button" onClick={previousPage} disabled={!canPreviousPage} aria-label={labels.previousPage}>
        ←
      </button>
      <span>{labels.pageInfo(pageIndex + 1, pageCount)}</span>
      <button type="button" onClick={nextPage} disabled={!canNextPage} aria-label={labels.nextPage}>
        →
      </button>
    </nav>
  );
}

export default function WidgetPart() {
  return <DataTable data={people} columns={columns} components={{ Pagination: Pager }} />;
}
