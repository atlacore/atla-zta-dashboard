"use client";

import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import { ColumnDef, Row, RowSelectionState, SortingState, Table } from "@tanstack/react-table";
import dayjs from "dayjs";
import { usePathname, useRouter } from "next/navigation";
import React from "react";
import { useSWRConfig } from "swr";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { User } from "@/interfaces/User";
import UserActionCell from "@/modules/users/table-cells/UserActionCell";
import UserBlockCell from "@/modules/users/table-cells/UserBlockCell";
import UserNameCell from "@/modules/users/table-cells/UserNameCell";
import UserRoleCell from "@/modules/users/table-cells/UserRoleCell";
import UserStatusCell from "@/modules/users/table-cells/UserStatusCell";

export const UsersTableColumns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableHeader column={column}>Name</DataTableHeader>
    ),
    accessorFn: (row) => (row.displayName || "") + " " + (row.email || ""),
    sortingFn: "text",
    cell: ({ row }) => <UserNameCell user={row.original} />,
  },
  {
    accessorKey: "role",
    header: ({ column }) => (
      <DataTableHeader column={column}>Role</DataTableHeader>
    ),
    sortingFn: "text",
    cell: ({ row }) => <UserRoleCell user={row.original} />,
  },
  {
    accessorKey: "isBlocked",
    header: ({ column }) => (
      <DataTableHeader column={column}>Status</DataTableHeader>
    ),
    sortingFn: "text",
    cell: ({ row }) => <UserStatusCell user={row.original} />,
  },
  {
    accessorKey: "block_user",
    header: ({ column }) => (
      <DataTableHeader column={column}>Block</DataTableHeader>
    ),
    cell: ({ row }) => <UserBlockCell user={row.original} />,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableHeader column={column}>Joined</DataTableHeader>
    ),
    sortingFn: "datetime",
    cell: ({ row }) => (
      <span className="text-sm text-nb-gray-300">
        {dayjs(row.original.createdAt).format("MMM D, YYYY")}
      </span>
    ),
  },
  {
    accessorKey: "id",
    header: "",
    cell: ({ row }) => <UserActionCell user={row.original} />,
  },
];

type Props = {
  users?: User[];
  isLoading?: boolean;
  headingTarget?: HTMLHeadingElement | null;
  minimal?: boolean;
  rightSide?: (table: Table<User>) => React.ReactNode;
  getStartedCard?: React.ReactNode;
  columns?: ColumnDef<User>[];
  selectedRows?: RowSelectionState;
  setSelectedRows?: (updater: React.SetStateAction<RowSelectionState>) => void;
  onRowClick?: (row: Row<User>) => void;
  keepStateInLocalStorage?: boolean;
};

export default function UsersTable({
  users,
  isLoading,
  headingTarget,
  minimal,
  rightSide,
  getStartedCard,
  columns = UsersTableColumns,
  selectedRows,
  setSelectedRows,
  onRowClick,
  keepStateInLocalStorage = true,
}: Readonly<Props>) {
  const { mutate } = useSWRConfig();
  const path = usePathname();
  const router = useRouter();

  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [{ id: "createdAt", desc: true }],
    keepStateInLocalStorage,
  );

  return (
    <DataTable
      headingTarget={headingTarget}
      isLoading={isLoading}
      keepStateInLocalStorage={keepStateInLocalStorage}
      text={"Users"}
      sorting={sorting}
      setSorting={setSorting}
      columns={columns}
      data={users}
      rowSelection={selectedRows}
      setRowSelection={setSelectedRows}
      onRowClick={
        !onRowClick
          ? (row) => router.push(`/team/user?id=${row.original.id}`)
          : onRowClick
      }
      searchPlaceholder={"Search by name or email..."}
    >
      {(table) => (
        <>
          <DataTableRowsPerPage table={table} disabled={!users?.length} />
          <DataTableRefreshButton
            isDisabled={!users?.length}
            onClick={() => mutate("/ui/users")}
          />
        </>
      )}
    </DataTable>
  );
}
