"use client";

import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import { notify } from "@components/Notification";
import Button from "@components/Button";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { useApiCall } from "@utils/api";
import dayjs from "dayjs";
import { Laptop, Trash2 } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useMemo } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useUsers } from "@/contexts/UsersProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Device } from "@/interfaces/Device";

type Props = {
  devices?: Device[];
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
};

export default function DevicesTable({ devices, isLoading, headingTarget }: Readonly<Props>) {
  const { mutate } = useSWRConfig();
  const path = usePathname();
  const { permission } = usePermissions();
  const { users } = useUsers();
  const { confirm } = useDialog();
  const deviceRequest = useApiCall<{ status: string }>("/ui/devices");

  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [{ id: "enrolledAt", desc: true }],
  );

  const userLabel = (userId: string) => {
    const user = users?.find((u) => u.id === userId);
    return user?.displayName || user?.email || userId;
  };

  const revoke = async (device: Device) => {
    const choice = await confirm({
      title: `Revoke device '${device.deviceId}'?`,
      description:
        "This device will no longer be able to claim signed posture. Any active session it holds is not affected.",
      confirmText: "Revoke",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!choice) return;

    const promise = deviceRequest
      .del(undefined, `/${device.id}`)
      .then(() => mutate("/ui/devices"));
    notify({
      title: "Revoke Device",
      description: `Device '${device.deviceId}' successfully revoked.`,
      promise,
      loadingMessage: "Revoking device...",
    });
  };

  const columns: ColumnDef<Device>[] = useMemo(
    () => [
      {
        accessorKey: "deviceId",
        header: ({ column }) => (
          <DataTableHeader column={column}>Device ID</DataTableHeader>
        ),
        sortingFn: "text",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Laptop size={14} className="text-nb-gray-400 shrink-0" />
            <span className="font-medium text-sm">{row.original.deviceId}</span>
          </div>
        ),
      },
      {
        accessorKey: "userId",
        header: ({ column }) => (
          <DataTableHeader column={column}>Owner</DataTableHeader>
        ),
        sortingFn: "text",
        cell: ({ row }) => (
          <span className="text-sm text-nb-gray-300">
            {userLabel(row.original.userId)}
          </span>
        ),
      },
      {
        accessorKey: "enrolledAt",
        header: ({ column }) => (
          <DataTableHeader column={column}>Enrolled</DataTableHeader>
        ),
        sortingFn: "datetime",
        cell: ({ row }) => (
          <span className="text-sm text-nb-gray-300">
            {dayjs(row.original.enrolledAt).format("MMM D, YYYY")}
          </span>
        ),
      },
      {
        accessorKey: "lastSeenAt",
        header: ({ column }) => (
          <DataTableHeader column={column}>Last Seen</DataTableHeader>
        ),
        sortingFn: "datetime",
        cell: ({ row }) =>
          row.original.lastSeenAt ? (
            <span className="text-sm text-nb-gray-300">
              {dayjs(row.original.lastSeenAt).format("MMM D, YYYY HH:mm")}
            </span>
          ) : (
            <span className="text-sm text-nb-gray-500">Never</span>
          ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) =>
          permission.devices?.delete ? (
            <div className="flex justify-end pr-4">
              <Button
                variant={"danger-outline"}
                className={"!px-3"}
                onClick={() => revoke(row.original)}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ) : null,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [users, permission.devices?.delete],
  );

  return (
    <DataTable
      headingTarget={headingTarget}
      isLoading={isLoading}
      text={"Devices"}
      sorting={sorting}
      setSorting={setSorting}
      columns={columns}
      data={devices ?? []}
      searchPlaceholder={"Search by device ID..."}
    >
      {(table) => (
        <>
          <DataTableRowsPerPage table={table} disabled={!devices?.length} />
          <DataTableRefreshButton
            isDisabled={!devices?.length}
            onClick={() => mutate("/ui/devices")}
          />
        </>
      )}
    </DataTable>
  );
}
