"use client";

import Button from "@components/Button";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import { notify } from "@components/Notification";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { useApiCall } from "@utils/api";
import dayjs from "dayjs";
import { Copy, KeyRound, PlusCircle, Trash2 } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { SDKKey, SDKKeyCreateResponse } from "@/interfaces/SetupKey";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/Dialog";
import { Label } from "@components/Label";
import { Input } from "@components/Input";
import { useDialog } from "@/contexts/DialogProvider";

// ── Create Modal ────────────────────────────────────────────────────────────

type CreateSDKKeyModalProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
};

function CreateSDKKeyModal({ open, onOpenChange, onCreated }: CreateSDKKeyModalProps) {
  const [name, setName] = useState("");
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const sdkKeyRequest = useApiCall<SDKKeyCreateResponse>("/ui/sdk-keys");

  const handleCreate = () => {
    if (!name.trim()) return;
    const promise = sdkKeyRequest.post({ name: name.trim() }).then((res) => {
      setRawKey(res.key);
      onCreated();
    });
    notify({
      title: "Create SDK Key",
      description: "SDK key successfully created.",
      promise,
      loadingMessage: "Creating SDK key...",
    });
  };

  const handleCopy = () => {
    if (!rawKey) return;
    navigator.clipboard.writeText(rawKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleClose = () => {
    setName("");
    setRawKey(null);
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className={"max-w-md"}>
        <DialogHeader>
          <DialogTitle>
            <div className={"flex items-center gap-2"}>
              <KeyRound size={16} />
              {rawKey ? "SDK Key Created" : "Create SDK Key"}
            </div>
          </DialogTitle>
        </DialogHeader>

        {!rawKey ? (
          <>
            <div className={"px-8 pb-4 flex flex-col gap-4"}>
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={"e.g. CI/CD Pipeline"}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <DialogFooter>
              <Button variant={"secondary"} onClick={handleClose}>Cancel</Button>
              <Button variant={"primary"} onClick={handleCreate} disabled={!name.trim()}>
                <PlusCircle size={16} />
                Create
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className={"px-8 pb-4 flex flex-col gap-4"}>
              <p className={"text-sm text-nb-gray-300"}>
                Copy this key now — it will not be shown again.
              </p>
              <div
                className={
                  "flex items-center gap-2 bg-nb-gray-900 border border-nb-gray-800 rounded-md px-3 py-2 font-mono text-xs break-all"
                }
              >
                <span className={"flex-1 select-all"}>{rawKey}</span>
                <button
                  onClick={handleCopy}
                  className={"text-nb-gray-400 hover:text-white transition-colors shrink-0"}
                >
                  <Copy size={14} />
                </button>
              </div>
              {copied && <p className={"text-xs text-green-400"}>Copied!</p>}
            </div>
            <DialogFooter>
              <Button variant={"primary"} onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Table ────────────────────────────────────────────────────────────────────

type Props = {
  setupKeys?: SDKKey[];
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
};

export default function SetupKeysTable({ setupKeys, isLoading, headingTarget }: Readonly<Props>) {
  const { mutate } = useSWRConfig();
  const path = usePathname();
  const { permission } = usePermissions();
  const { confirm } = useDialog();
  const [createOpen, setCreateOpen] = useState(false);
  const sdkKeyRequest = useApiCall<{ status: string }>("/ui/sdk-keys");

  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [{ id: "createdAt", desc: true }],
  );

  const revoke = async (key: SDKKey) => {
    const choice = await confirm({
      title: `Revoke '${key.name}'?`,
      description: "This key will be permanently revoked and can no longer be used.",
      confirmText: "Revoke",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!choice) return;

    const promise = sdkKeyRequest.del(undefined, `/${key.id}`).then(() => mutate("/ui/sdk-keys"));
    notify({
      title: "Revoke SDK Key",
      description: `Key '${key.name}' successfully revoked.`,
      promise,
      loadingMessage: "Revoking key...",
    });
  };

  const columns: ColumnDef<SDKKey>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableHeader column={column}>Name</DataTableHeader>
      ),
      sortingFn: "text",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <KeyRound size={14} className="text-nb-gray-400 shrink-0" />
          <span className="font-medium text-sm">{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: "lastUsedAt",
      header: ({ column }) => (
        <DataTableHeader column={column}>Last Used</DataTableHeader>
      ),
      sortingFn: "datetime",
      cell: ({ row }) =>
        row.original.lastUsedAt ? (
          <span className="text-sm text-nb-gray-300">
            {dayjs(row.original.lastUsedAt).format("MMM D, YYYY")}
          </span>
        ) : (
          <span className="text-sm text-nb-gray-500">Never</span>
        ),
    },
    {
      accessorKey: "expiresAt",
      header: ({ column }) => (
        <DataTableHeader column={column}>Expires</DataTableHeader>
      ),
      sortingFn: "datetime",
      cell: ({ row }) => {
        if (!row.original.expiresAt) {
          return <span className="text-sm text-nb-gray-500">Never</span>;
        }
        const expired = dayjs(row.original.expiresAt).isBefore(dayjs());
        return (
          <span className={`text-sm ${expired ? "text-red-400" : "text-nb-gray-300"}`}>
            {dayjs(row.original.expiresAt).format("MMM D, YYYY")}
          </span>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableHeader column={column}>Created</DataTableHeader>
      ),
      sortingFn: "datetime",
      cell: ({ row }) => (
        <span className="text-sm text-nb-gray-300">
          {dayjs(row.original.createdAt).format("MMM D, YYYY")}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) =>
        permission.setup_keys?.delete ? (
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
  ];

  return (
    <>
      <CreateSDKKeyModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => mutate("/ui/sdk-keys")}
      />
      <DataTable
        headingTarget={headingTarget}
        isLoading={isLoading}
        text={"SDK Keys"}
        sorting={sorting}
        setSorting={setSorting}
        columns={columns}
        data={setupKeys ?? []}
        searchPlaceholder={"Search by name..."}
        rightSide={() =>
          permission.setup_keys?.create ? (
            <Button variant={"primary"} onClick={() => setCreateOpen(true)}>
              <PlusCircle size={16} />
              Create SDK Key
            </Button>
          ) : null
        }
      >
        {(table) => (
          <>
            <DataTableRowsPerPage table={table} disabled={!setupKeys?.length} />
            <DataTableRefreshButton
              isDisabled={!setupKeys?.length}
              onClick={() => mutate("/ui/sdk-keys")}
            />
          </>
        )}
      </DataTable>
    </>
  );
}
