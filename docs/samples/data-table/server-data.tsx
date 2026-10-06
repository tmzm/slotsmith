import { keepPreviousData, QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { DataTable, type DataTablePaginationState, type DataTableSortingState } from "slotsmith/data-table";
import { fetchPeople } from "../shared/fake-api";
import { columns } from "../shared/people";

function PeopleTable() {
  const [pagination, setPagination] = useState<DataTablePaginationState>({ pageIndex: 0, pageSize: 5 });
  const [sorting, setSorting] = useState<DataTableSortingState>([]);
  const [failing, setFailing] = useState(false);

  const query = useQuery({
    // A new page or order is a new key, so it is a new request.
    queryKey: ["people", pagination, sorting],
    // `failing` is left out of the key on purpose: ticking it changes how the next request ends, not which page it asks for.
    queryFn: ({ signal }) => fetchPeople({ ...pagination, sorting }, { signal, fail: failing }),
    // The last page stays on screen while the next one loads.
    placeholderData: keepPreviousData,
    // A switch back to the tab would refetch and dim the table for no visible change.
    refetchOnWindowFocus: false,
  });

  // A failed request has no total: keep the last one, so the page count stays.
  const [lastTotal, setLastTotal] = useState(0);
  useEffect(() => {
    if (query.data) setLastTotal(query.data.total);
  }, [query.data]);
  const total = query.data?.total ?? lastTotal;

  return (
    <>
      <label style={{ display: "block", marginBlockEnd: "0.75rem" }}>
        <input type="checkbox" checked={failing} onChange={(event) => setFailing(event.target.checked)} /> Fail the next requests
      </label>
      <DataTable
        // Only the current page: the server has already sorted and cut it.
        data={query.data?.rows ?? []}
        columns={columns}
        getRowId={(person) => person.id}
        manualPagination
        manualSorting
        // The total across all pages, so the table can count them.
        rowCount={total}
        pagination={pagination}
        onPaginationChange={setPagination}
        sorting={sorting}
        onSortingChange={(next) => {
          setSorting(next);
          // A new order starts again from the first page.
          setPagination((current) => ({ ...current, pageIndex: 0 }));
        }}
        pageSizeOptions={[5, 10, 20]}
        // Skeleton rows only while there is nothing to show, as on the first load.
        loading={query.isPending}
        error={query.error}
        onRetry={() => query.refetch()}
        // Dim the rows of the last page until the new ones arrive, and tell
        // assistive technology the table is busy while any request runs.
        style={{ opacity: query.isPlaceholderData ? 0.6 : 1 }}
        aria-busy={query.isFetching || undefined}
      />
      <p dir="ltr">
        {`GET /people?page=${pagination.pageIndex + 1}&size=${pagination.pageSize}`}
        {sorting.map((sort) => `&sort=${sort.desc ? "-" : ""}${sort.id}`).join("")}
        {query.isFetching ? " · loading" : query.isError ? " · failed" : " · done"}
      </p>
    </>
  );
}

export default function ServerData() {
  // One client for the app; a real one sits at the root, next to your other providers.
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return (
    <QueryClientProvider client={client}>
      <PeopleTable />
    </QueryClientProvider>
  );
}
