import { DataTable } from "slotsmith/data-table";
import { muiComponents } from "../adapters/data-table/mui";
import { columns, people } from "../shared/people";

export default function Swap() {
  return <DataTable data={people} columns={columns} defaultPagination={{ pageIndex: 0, pageSize: 12 }} components={muiComponents} />;
}
