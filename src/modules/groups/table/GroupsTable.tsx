import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { removeAllSpaces } from "@utils/helpers";
import { usePathname } from "next/navigation";
import React from "react";
import { AddGroupButton } from "@/components/ui/AddGroupButton";
import { GroupProvider } from "@/contexts/GroupProvider";
import { useGroups } from "@/contexts/GroupsProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Group } from "@/interfaces/Group";
import GroupsActionCell from "@/modules/groups/table/GroupsActionCell";
import GroupsNameCell from "@/modules/groups/table/GroupsNameCell";

export const GroupsTableColumns: ColumnDef<Group>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Name</DataTableHeader>;
    },
    cell: ({ row }) => (
      <GroupsNameCell
        active={true}
        group={{ id: row.original.id, name: row.original.name }}
      />
    ),
    sortingFn: "text",
  },
  {
    accessorKey: "id",
    header: "",
    cell: ({ row }) => (
      <GroupProvider group={row.original} isDetailPage={false}>
        <GroupsActionCell group={row.original} />
      </GroupProvider>
    ),
  },
  {
    accessorKey: "search",
    accessorFn: (row) => removeAllSpaces(row.name),
    filterFn: "fuzzy",
  },
];

type Props = {
  headingTarget?: HTMLHeadingElement | null;
};

export default function GroupsTable({ headingTarget }: Readonly<Props>) {
  const { groups, isLoading } = useGroups();
  const path = usePathname();

  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [{ id: "name", desc: false }],
  );

  return (
    <DataTable
      headingTarget={headingTarget}
      text={"Groups"}
      sorting={sorting}
      isLoading={isLoading}
      setSorting={setSorting}
      columns={GroupsTableColumns}
      data={groups ?? []}
      searchPlaceholder={"Search group by name..."}
      rightSide={() => <AddGroupButton />}
      columnVisibility={{ search: false }}
    >
      {(table) => (
        <DataTableRowsPerPage table={table} disabled={!groups?.length} />
      )}
    </DataTable>
  );
}
