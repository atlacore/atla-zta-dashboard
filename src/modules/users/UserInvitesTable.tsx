"use client";

import Badge from "@components/Badge";
import Button from "@components/Button";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import dayjs from "dayjs";
import { Cog, EyeIcon, MailPlus, ShieldIcon, User2 } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Invite } from "@/interfaces/Invite";
import { Role } from "@/interfaces/User";
import UserInviteModal from "@/modules/users/UserInviteModal";

// ── Status / role cells ───────────────────────────────────────────────────────

function InviteStatusCell({ invite }: Readonly<{ invite: Invite }>) {
  if (invite.acceptedAt) return <Badge variant={"green"}>Accepted</Badge>;
  if (dayjs(invite.expiresAt).isBefore(dayjs())) return <Badge variant={"red"}>Expired</Badge>;
  return <Badge variant={"yellow"}>Pending</Badge>;
}

const ROLE_ICON: Record<Role, React.ReactNode> = {
  [Role.Owner]: <ShieldIcon size={14} />,
  [Role.Admin]: <Cog size={14} />,
  [Role.Auditor]: <EyeIcon size={14} />,
  [Role.Member]: <User2 size={14} />,
};

function InviteRoleCell({ role }: Readonly<{ role: Role }>) {
  return (
    <Badge variant={role === Role.Owner ? "netbird" : "gray"}>
      {ROLE_ICON[role]}
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </Badge>
  );
}

// ── Invite button (trigger + modal) ──────────────────────────────────────────

export function InviteUserButton() {
  const { mutate } = useSWRConfig();
  const { permission } = usePermissions();
  const [open, setOpen] = useState(false);

  if (!permission.users?.create) return null;

  return (
    <>
      <UserInviteModal
        open={open}
        onOpenChange={setOpen}
        onCreated={() => mutate("/ui/users/invites")}
      />
      <Button variant={"primary"} onClick={() => setOpen(true)}>
        <MailPlus size={16} />
        Invite User
      </Button>
    </>
  );
}

// ── Table ────────────────────────────────────────────────────────────────────

type Props = {
  invites?: Invite[];
  isLoading?: boolean;
  headingTarget?: HTMLHeadingElement | null;
};

export default function UserInvitesTable({ invites, isLoading, headingTarget }: Readonly<Props>) {
  const { mutate } = useSWRConfig();
  const path = usePathname();

  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path + "-invites",
    [{ id: "createdAt", desc: true }],
  );

  const columns: ColumnDef<Invite>[] = [
    {
      accessorKey: "extSub",
      header: ({ column }) => (
        <DataTableHeader column={column}>Identifier</DataTableHeader>
      ),
      sortingFn: "text",
      cell: ({ row }) => (
        <span className={"text-sm font-medium"}>{row.original.extSub}</span>
      ),
    },
    {
      accessorKey: "role",
      header: ({ column }) => (
        <DataTableHeader column={column}>Role</DataTableHeader>
      ),
      sortingFn: "text",
      cell: ({ row }) => <InviteRoleCell role={row.original.role} />,
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableHeader column={column}>Status</DataTableHeader>
      ),
      cell: ({ row }) => <InviteStatusCell invite={row.original} />,
    },
    {
      accessorKey: "expiresAt",
      header: ({ column }) => (
        <DataTableHeader column={column}>Expires</DataTableHeader>
      ),
      sortingFn: "datetime",
      cell: ({ row }) => (
        <span className={"text-sm text-nb-gray-300"}>
          {dayjs(row.original.expiresAt).format("MMM D, YYYY")}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableHeader column={column}>Created</DataTableHeader>
      ),
      sortingFn: "datetime",
      cell: ({ row }) => (
        <span className={"text-sm text-nb-gray-300"}>
          {dayjs(row.original.createdAt).format("MMM D, YYYY")}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      headingTarget={headingTarget}
      isLoading={isLoading}
      text={"Invites"}
      sorting={sorting}
      setSorting={setSorting}
      columns={columns}
      data={invites ?? []}
      searchPlaceholder={"Search by identifier..."}
    >
      {(table) => (
        <>
          <DataTableRowsPerPage table={table} disabled={!invites?.length} />
          <DataTableRefreshButton
            isDisabled={!invites?.length}
            onClick={() => mutate("/ui/users/invites")}
          />
        </>
      )}
    </DataTable>
  );
}
