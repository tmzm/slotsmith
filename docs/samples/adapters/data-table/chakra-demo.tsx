import { DataTable } from "slotsmith/data-table";
import { columns, people } from "../../shared/people";
import { chakraComponents } from "./chakra";

export default function ChakraTable() {
  return (
    <DataTable
      data={people}
      columns={columns}
      enableRowSelection
      defaultPagination={{ pageIndex: 0, pageSize: 5 }}
      pageSizeOptions={[5, 10, 25]}
      components={chakraComponents}
    />
  );
}
