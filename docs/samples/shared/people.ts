import type { DataTableColumnDef } from "slotsmith/data-table";

export type Person = { id: string; name: string; role: string; team: string; status: string; joined: string };

export const people: Person[] = [
  { id: "1", name: "Lena Park", role: "Engineer", team: "Platform", status: "Active", joined: "2021-03-08" },
  { id: "2", name: "Omar Haddad", role: "Designer", team: "Product", status: "Active", joined: "2020-11-16" },
  { id: "3", name: "Sofia Reyes", role: "Engineer", team: "Payments", status: "Away", joined: "2022-01-24" },
  { id: "4", name: "Yuki Tanaka", role: "Manager", team: "Platform", status: "Active", joined: "2019-06-03" },
  { id: "5", name: "Amir Nasser", role: "Analyst", team: "Growth", status: "Active", joined: "2023-02-13" },
  { id: "6", name: "Chloe Martin", role: "Engineer", team: "Payments", status: "On leave", joined: "2021-09-27" },
  { id: "7", name: "Jonas Weber", role: "Support", team: "Care", status: "Active", joined: "2022-07-11" },
  { id: "8", name: "Priya Nair", role: "Designer", team: "Product", status: "Away", joined: "2020-04-20" },
  { id: "9", name: "Diego Alvarez", role: "Engineer", team: "Growth", status: "Active", joined: "2023-05-30" },
  { id: "10", name: "Hana Kim", role: "Manager", team: "Care", status: "Active", joined: "2018-10-01" },
  { id: "11", name: "Tomas Novak", role: "Analyst", team: "Payments", status: "On leave", joined: "2022-12-05" },
  { id: "12", name: "Nadia Farouk", role: "Support", team: "Care", status: "Active", joined: "2024-01-15" },
];

export const columns: DataTableColumnDef<Person>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "role", header: "Role" },
  { accessorKey: "team", header: "Team" },
  { accessorKey: "status", header: "Status" },
  { accessorKey: "joined", header: "Joined" },
];
