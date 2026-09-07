"use client";

import Button from "@components/Button";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import { notify } from "@components/Notification";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/Dialog";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { useApiCall } from "@utils/api";
import dayjs from "dayjs";
import { BanIcon, PlusCircle, Trash2 } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { SWGBlockedDomain, SWGBlockedDomainCreateRequest } from "@/interfaces/DNSSWG";

const BLOCKLIST_URL = "/ui/dns/swg/blocklist";

// ── Create Modal ──────────────────────────────────────────────────────────────

type CreateModalProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
};

function CreateBlockedDomainModal({ open, onOpenChange, onCreated }: CreateModalProps) {
  const [domain, setDomain] = useState("");
  const request = useApiCall<SWGBlockedDomain>(BLOCKLIST_URL);

  const handleCreate = () => {
    const body: SWGBlockedDomainCreateRequest = { domain: domain.trim() };
    const promise = request.post(body).then(() => {
      onCreated();
      handleClose();
    });
    notify({
      title: "Block Domain",
      description: "Domain added to the blocklist.",
      promise,
      loadingMessage: "Adding domain...",
    });
  };

  const handleClose = () => {
    setDomain("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className={"max-w-md"}>
        <DialogHeader>
          <DialogTitle>
            <div className={"flex items-center gap-2"}>
              <BanIcon size={16} />
              Block Domain
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className={"px-8 pb-4 flex flex-col gap-4"}>
          <div>
            <Label>Domain</Label>
            <Input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder={"e.g. ads.example.com"}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant={"secondary"} onClick={handleClose}>Cancel</Button>
          <Button variant={"primary"} onClick={handleCreate} disabled={!domain.trim()}>
            <PlusCircle size={16} />
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────

type Props = {
  domains?: SWGBlockedDomain[];
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
};

export default function SWGBlocklistTable({ domains, isLoading, headingTarget }: Readonly<Props>) {
  const { mutate } = useSWRConfig();
  const path = usePathname();
  const { permission } = usePermissions();
  const { confirm } = useDialog();
  const [createOpen, setCreateOpen] = useState(false);
  const request = useApiCall<{ status: string }>(BLOCKLIST_URL);

  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [{ id: "createdAt", desc: true }],
  );

  const deleteDomain = async (entry: SWGBlockedDomain) => {
    const choice = await confirm({
      title: `Unblock '${entry.domain}'?`,
      description: "This domain will be removed from the SWG blocklist.",
      confirmText: "Remove",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!choice) return;

    const promise = request.del(undefined, `/${entry.id}`).then(() => mutate(BLOCKLIST_URL));
    notify({
      title: "Unblock Domain",
      description: `'${entry.domain}' removed from the blocklist.`,
      promise,
      loadingMessage: "Removing...",
    });
  };

  const columns: ColumnDef<SWGBlockedDomain>[] = [
    {
      accessorKey: "domain",
      header: ({ column }) => <DataTableHeader column={column}>Domain</DataTableHeader>,
      sortingFn: "text",
      cell: ({ row }) => (
        <div className={"flex items-center gap-2"}>
          <BanIcon size={14} className={"text-nb-gray-400 shrink-0"} />
          <span className={"font-mono text-sm"}>{row.original.domain}</span>
        </div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => <DataTableHeader column={column}>Added</DataTableHeader>,
      sortingFn: "datetime",
      cell: ({ row }) => (
        <span className={"text-sm text-nb-gray-300"}>
          {dayjs(row.original.createdAt).format("MMM D, YYYY")}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className={"flex justify-end pr-4"}>
          <Button
            variant={"danger-outline"}
            size={"sm"}
            onClick={() => deleteDomain(row.original)}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <CreateBlockedDomainModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => mutate(BLOCKLIST_URL)}
      />
      <DataTable
        headingTarget={headingTarget}
        isLoading={isLoading}
        text={"Blocklist"}
        sorting={sorting}
        setSorting={setSorting}
        columns={columns}
        data={domains ?? []}
        searchPlaceholder={"Search by domain..."}
        rightSide={() =>
          permission.dns?.create ? (
            <Button variant={"primary"} onClick={() => setCreateOpen(true)}>
              <PlusCircle size={16} />
              Block Domain
            </Button>
          ) : null
        }
      >
        {(table) => (
          <>
            <DataTableRowsPerPage table={table} disabled={!domains?.length} />
            <DataTableRefreshButton
              isDisabled={!domains?.length}
              onClick={() => mutate(BLOCKLIST_URL)}
            />
          </>
        )}
      </DataTable>
    </>
  );
}
