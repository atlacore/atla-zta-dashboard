"use client";

import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import { notify } from "@components/Notification";
import Badge from "@components/Badge";
import Button from "@components/Button";
import CheckboxField from "@components/CheckboxField";
import { InstallClientButton } from "@components/ui/InstallClientButton";
import NoResults from "@components/ui/NoResults";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { useApiCall } from "@utils/api";
import dayjs from "dayjs";
import { CheckCircle2, Laptop, Trash2 } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useMemo, useState } from "react";
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

export default function DevicesTable({
  devices,
  isLoading,
  headingTarget,
}: Readonly<Props>) {
  const { mutate } = useSWRConfig();
  const path = usePathname();
  const { permission } = usePermissions();
  const { users } = useUsers();
  const { confirm } = useDialog();
  const deviceRequest = useApiCall<{ status: string }>("/ui/devices");
  // Also refreshes filtered lists such as /ui/devices?user_id=<id>.
  const refreshDevices = () =>
    mutate((key) => typeof key === "string" && key.startsWith("/ui/devices"));

  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [{ id: "enrolledAt", desc: true }],
  );

  const userLabel = (userId: string) => {
    const user = users?.find((u) => u.id === userId);
    return user?.displayName || user?.email || userId;
  };

  const revoke = async (device: Device) => {
    const options = { revokeSessions: false };
    const choice = await confirm({
      title: `Revoke device '${device.deviceId}'?`,
      description:
        "This device will no longer be able to claim signed posture.",
      confirmText: "Revoke",
      cancelText: "Cancel",
      type: "danger",
      children: (
        <RevokeSessionsField
          onChange={(checked) => (options.revokeSessions = checked)}
        />
      ),
    });
    if (!choice) return;

    const query = options.revokeSessions ? "?revoke_sessions=true" : "";
    const promise = deviceRequest
      .del(undefined, `/${device.id}${query}`)
      .then(refreshDevices);
    notify({
      title: "Revoke Device",
      description: options.revokeSessions
        ? `Device '${device.deviceId}' and its session successfully revoked.`
        : `Device '${device.deviceId}' successfully revoked.`,
      promise,
      loadingMessage: "Revoking device...",
    });
  };

  const approve = (device: Device) => {
    const promise = deviceRequest
      .post(undefined, `/${device.id}/approve`)
      .then(refreshDevices);
    notify({
      title: "Approve Device",
      description: `Device '${device.deviceId}' can connect now.`,
      promise,
      loadingMessage: "Approving device...",
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
        id: "status",
        accessorFn: (d) => (d.approvedAt ? (d.setupKeyId ? "setup key" : "approved") : "pending"),
        header: ({ column }) => (
          <DataTableHeader column={column}>Status</DataTableHeader>
        ),
        cell: ({ row }) =>
          !row.original.approvedAt ? (
            <Badge variant={"yellow"} size={"xs"}>
              Waiting for approval
            </Badge>
          ) : row.original.setupKeyId ? (
            <Badge variant={"gray"} size={"xs"}>
              Setup key
            </Badge>
          ) : (
            <Badge variant={"green"} size={"xs"}>
              Approved
            </Badge>
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
        cell: ({ row }) => (
          <div className="flex justify-end gap-2 pr-4">
            {permission.devices?.update && !row.original.approvedAt && (
              <Button
                variant={"primary"}
                className={"!px-3"}
                onClick={() => approve(row.original)}
                tooltip={"Approve device"}
              >
                <CheckCircle2 size={14} />
                Approve
              </Button>
            )}
            {permission.devices?.delete && (
              <Button
                variant={"danger-outline"}
                className={"!px-3"}
                onClick={() => revoke(row.original)}
                tooltip={row.original.approvedAt ? "Revoke device" : "Refuse device"}
              >
                <Trash2 size={14} />
              </Button>
            )}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [users, permission.devices?.delete, permission.devices?.update],
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
      getStartedCard={
        <NoResults
          className={"py-4"}
          title={"No enrolled devices"}
          description={
            "Devices appear here once the ATLA client is installed and registers on a machine."
          }
          icon={<Laptop size={20} className={"text-nb-gray-300"} />}
        />
      }
      rightSide={() => <InstallClientButton />}
    >
      {(table) => (
        <>
          <DataTableRowsPerPage table={table} disabled={!devices?.length} />
          <DataTableRefreshButton
            isDisabled={!devices?.length}
            onClick={refreshDevices}
          />
        </>
      )}
    </DataTable>
  );
}

// The confirm dialog renders its children once, so the checkbox keeps its own state.
function RevokeSessionsField({
  onChange,
}: Readonly<{ onChange: (checked: boolean) => void }>) {
  const [checked, setChecked] = useState(false);
  return (
    <CheckboxField
      label={"Also revoke its active session"}
      description={
        "Tears down the device's tunnel and revokes the credentials issued to it. Otherwise the session runs until it expires."
      }
      checked={checked}
      onChange={(value) => {
        setChecked(value);
        onChange(value);
      }}
    />
  );
}
