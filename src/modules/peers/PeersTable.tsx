import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import { notify } from "@components/Notification";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { useApiCall } from "@utils/api";
import { removeAllSpaces } from "@utils/helpers";
import dayjs from "dayjs";
import { ShieldX, Wifi } from "lucide-react";
import { usePathname } from "next/navigation";
import React from "react";
import Button from "@components/Button";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { PeerSession } from "@/interfaces/Peer";
import { usePeers } from "@/contexts/PeersProvider";
import { useUsers } from "@/contexts/UsersProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";

function RevokeButton({
  peer,
  onRevoked,
}: {
  peer: PeerSession;
  onRevoked: () => void;
}) {
  const { permission } = usePermissions();
  const peerRequest = useApiCall<{ status: string }>("/ui/peers/" + peer.id);

  const revoke = () => {
    const promise = peerRequest.del().then(() => onRevoked());
    notify({
      title: "Revoke Session",
      description: "Session successfully revoked.",
      promise,
      loadingMessage: "Revoking session...",
    });
  };

  if (!permission.peers?.delete) return null;

  return (
    <Button variant={"danger-outline"} className={"!px-3"} onClick={revoke}>
      <ShieldX size={14} />
    </Button>
  );
}

type Props = {
  peers?: PeerSession[];
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
};

export default function PeersTable({
  peers,
  isLoading,
  headingTarget,
}: Readonly<Props>) {
  const { refresh } = usePeers();
  const { users } = useUsers();
  const path = usePathname();

  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [{ id: "createdAt", desc: true }],
  );

  const columns: ColumnDef<PeerSession>[] = [
    {
      accessorKey: "allocatedIp",
      header: ({ column }) => (
        <DataTableHeader column={column}>Allocated IP</DataTableHeader>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Wifi size={14} className="text-nb-gray-400 shrink-0" />
          <span className="font-mono text-sm">{row.original.allocatedIp}</span>
        </div>
      ),
      sortingFn: "text",
    },
    {
      accessorKey: "clientIp",
      header: ({ column }) => (
        <DataTableHeader column={column}>Client IP</DataTableHeader>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm text-nb-gray-300">
          {row.original.clientIp}
        </span>
      ),
      sortingFn: "text",
    },
    {
      accessorKey: "userId",
      header: ({ column }) => (
        <DataTableHeader column={column}>User</DataTableHeader>
      ),
      cell: ({ row }) => {
        const user = users?.find((u) => u.id === row.original.userId);
        return (
          <span className="text-sm">
            {user?.displayName || user?.email || row.original.userId}
          </span>
        );
      },
      sortingFn: "text",
    },
    {
      accessorKey: "region",
      header: ({ column }) => (
        <DataTableHeader column={column}>Region</DataTableHeader>
      ),
      cell: ({ row }) => (
        <span className="text-sm text-nb-gray-300">
          {row.original.region || "—"}
        </span>
      ),
      sortingFn: "text",
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableHeader column={column}>Created</DataTableHeader>
      ),
      sortingFn: "datetime",
      cell: ({ row }) => (
        <span className="text-sm text-nb-gray-300">
          {dayjs(row.original.createdAt).format("MMM D, YYYY HH:mm")}
        </span>
      ),
    },
    {
      accessorKey: "expiresAt",
      header: ({ column }) => (
        <DataTableHeader column={column}>Expires</DataTableHeader>
      ),
      sortingFn: "datetime",
      cell: ({ row }) => {
        const expired = dayjs(row.original.expiresAt).isBefore(dayjs());
        return (
          <span
            className={`text-sm ${expired ? "text-red-400" : "text-nb-gray-300"}`}
          >
            {dayjs(row.original.expiresAt).format("MMM D, YYYY HH:mm")}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end pr-4">
          <RevokeButton peer={row.original} onRevoked={refresh} />
        </div>
      ),
    },
    {
      accessorKey: "search",
      accessorFn: (row) =>
        removeAllSpaces(`${row.allocatedIp}${row.clientIp}${row.region}`),
      filterFn: "fuzzy",
    },
  ];

  return (
    <DataTable
      headingTarget={headingTarget}
      text={"Sessions"}
      sorting={sorting}
      setSorting={setSorting}
      columns={columns}
      data={peers ?? []}
      searchPlaceholder={"Search by IP or region..."}
      columnVisibility={{ search: false }}
      isLoading={isLoading}
    >
      {(table) => (
        <>
          <DataTableRowsPerPage table={table} disabled={!peers?.length} />
          <DataTableRefreshButton
            isDisabled={!peers?.length}
            onClick={refresh}
          />
        </>
      )}
    </DataTable>
  );
}
