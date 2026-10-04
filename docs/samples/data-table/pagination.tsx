import { useState } from "react";
import { DataTable, type DataTablePaginationState } from "slotsmith/data-table";
import { columns, people } from "../shared/people";

export default function Pagination() {
  const [pagination, setPagination] = useState<DataTablePaginationState>({ pageIndex: 0, pageSize: 5 });
  const first = pagination.pageIndex * pagination.pageSize + 1;
  const last = Math.min(first + pagination.pageSize - 1, people.length);
  return (
    <>
      <DataTable
        data={people}
        columns={columns}
        getRowId={(person) => person.id}
        pagination={pagination}
        onPaginationChange={setPagination}
        // The sizes the page-size control offers.
        pageSizeOptions={[5, 10, 20]}
      />
      <p>{`Rows ${first}–${last} of ${people.length}`}</p>
    </>
  );
}
