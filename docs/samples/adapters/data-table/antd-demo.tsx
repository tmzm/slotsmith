import { DataTable } from "slotsmith/data-table";
import { columns, people } from "../../shared/people";
import { antdComponents } from "./antd";

export default function AntdTable() {
  return (
    <DataTable
      data={people}
      columns={columns}
      enableRowSelection
      defaultPagination={{ pageIndex: 0, pageSize: 5 }}
      pageSizeOptions={[5, 10, 25]}
      components={antdComponents}
    />
  );
}
