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
import HelpText from "@components/HelpText";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { useApiCall } from "@utils/api";
import dayjs from "dayjs";
import { PenSquare, PlusCircle, ServerIcon, Trash2 } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { usePermissions } from "@/contexts/PermissionsProvider";
import {
  DNSNameserverGroup,
  DNSNameserverGroupCreateRequest,
  DNSNameserverGroupUpdateRequest,
} from "@/interfaces/DNSNameserverGroup";

const NAMESERVERS_URL = "/ui/dns/nameservers";

const parseNameservers = (s: string) =>
  s.split(",").map((v) => v.trim()).filter(Boolean);

// ── Create Modal ──────────────────────────────────────────────────────────────

type CreateModalProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
};

function CreateNameserverGroupModal({ open, onOpenChange, onCreated }: CreateModalProps) {
  const [name, setName] = useState("");
  const [nameservers, setNameservers] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const request = useApiCall<DNSNameserverGroup>(NAMESERVERS_URL);

  const handleCreate = () => {
    const body: DNSNameserverGroupCreateRequest = {
      name: name.trim(),
      nameservers: parseNameservers(nameservers),
      isPrimary,
    };
    const promise = request.post(body).then(() => {
      onCreated();
      handleClose();
    });
    notify({
      title: "Create Nameserver Group",
      description: "Nameserver group successfully created.",
      promise,
      loadingMessage: "Creating...",
    });
  };

  const handleClose = () => {
    setName("");
    setNameservers("");
    setIsPrimary(false);
    onOpenChange(false);
  };

  const isValid = name.trim() && parseNameservers(nameservers).length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className={"max-w-md"}>
        <DialogHeader>
          <DialogTitle>
            <div className={"flex items-center gap-2"}>
              <ServerIcon size={16} />
              Create Nameserver Group
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className={"px-8 pb-4 flex flex-col gap-4"}>
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={"e.g. Cloudflare"} />
          </div>
          <div>
            <Label>Nameservers</Label>
            <HelpText>Comma-separated IP:port list, e.g. 1.1.1.1:53, 1.0.0.1:53</HelpText>
            <Input
              value={nameservers}
              onChange={(e) => setNameservers(e.target.value)}
              placeholder={"1.1.1.1:53, 1.0.0.1:53"}
            />
          </div>
          <FancyToggleSwitch
            value={isPrimary}
            onChange={setIsPrimary}
            label={"Primary"}
            helpText={"The primary group is used unless a zone specifies another"}
          />
        </div>
        <DialogFooter>
          <Button variant={"secondary"} onClick={handleClose}>Cancel</Button>
          <Button variant={"primary"} onClick={handleCreate} disabled={!isValid}>
            <PlusCircle size={16} />
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

type EditModalProps = {
  group: DNSNameserverGroup;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
};

function EditNameserverGroupModal({ group, open, onOpenChange, onSaved }: EditModalProps) {
  const [name, setName] = useState(group.name);
  const [nameservers, setNameservers] = useState(group.nameservers.join(", "));
  const [isPrimary, setIsPrimary] = useState(group.isPrimary);
  const request = useApiCall<DNSNameserverGroup>(`${NAMESERVERS_URL}/${group.id}`);

  const handleSave = () => {
    const body: DNSNameserverGroupUpdateRequest = {
      name: name.trim() || undefined,
      nameservers: parseNameservers(nameservers),
      isPrimary,
    };
    const promise = request.put(body).then(() => {
      onSaved();
      onOpenChange(false);
    });
    notify({
      title: "Update Nameserver Group",
      description: "Nameserver group updated.",
      promise,
      loadingMessage: "Saving...",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={"max-w-md"}>
        <DialogHeader>
          <DialogTitle>
            <div className={"flex items-center gap-2"}>
              <PenSquare size={16} />
              Edit Nameserver Group
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className={"px-8 pb-4 flex flex-col gap-4"}>
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Nameservers</Label>
            <Input value={nameservers} onChange={(e) => setNameservers(e.target.value)} />
          </div>
          <FancyToggleSwitch value={isPrimary} onChange={setIsPrimary} label={"Primary"} />
        </div>
        <DialogFooter>
          <Button variant={"secondary"} onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant={"primary"} onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────

type Props = {
  groups?: DNSNameserverGroup[];
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
};

export default function NameserverGroupsTable({ groups, isLoading, headingTarget }: Readonly<Props>) {
  const { mutate } = useSWRConfig();
  const path = usePathname();
  const { permission } = usePermissions();
  const { confirm } = useDialog();
  const [createOpen, setCreateOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<DNSNameserverGroup | null>(null);
  const request = useApiCall<DNSNameserverGroup>(NAMESERVERS_URL);

  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [{ id: "createdAt", desc: true }],
  );

  const deleteGroup = async (group: DNSNameserverGroup) => {
    const choice = await confirm({
      title: `Delete '${group.name}'?`,
      description: "This nameserver group will be permanently deleted.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!choice) return;

    const promise = request.del(undefined, `/${group.id}`).then(() => mutate(NAMESERVERS_URL));
    notify({
      title: "Delete Nameserver Group",
      description: `'${group.name}' deleted.`,
      promise,
      loadingMessage: "Deleting...",
    });
  };

  const columns: ColumnDef<DNSNameserverGroup>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableHeader column={column}>Name</DataTableHeader>,
      sortingFn: "text",
      cell: ({ row }) => (
        <div className={"flex items-center gap-2"}>
          <ServerIcon size={14} className={"text-nb-gray-400 shrink-0"} />
          <span className={"font-medium text-sm"}>{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: "nameservers",
      header: ({ column }) => <DataTableHeader column={column}>Nameservers</DataTableHeader>,
      cell: ({ row }) => (
        <span className={"font-mono text-xs text-nb-gray-300"}>
          {row.original.nameservers.join(", ")}
        </span>
      ),
    },
    {
      accessorKey: "isPrimary",
      header: ({ column }) => <DataTableHeader column={column}>Primary</DataTableHeader>,
      cell: ({ row }) => (
        <span className={"text-sm text-nb-gray-300"}>{row.original.isPrimary ? "Yes" : "No"}</span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => <DataTableHeader column={column}>Created</DataTableHeader>,
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
        <div className={"flex justify-end pr-4 gap-2"}>
          <Button variant={"default-outline"} size={"sm"} onClick={() => setEditGroup(row.original)}>
            <PenSquare size={14} />
          </Button>
          <Button variant={"danger-outline"} size={"sm"} onClick={() => deleteGroup(row.original)}>
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <CreateNameserverGroupModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => mutate(NAMESERVERS_URL)}
      />
      {editGroup && (
        <EditNameserverGroupModal
          group={editGroup}
          open={true}
          onOpenChange={(v) => { if (!v) setEditGroup(null); }}
          onSaved={() => mutate(NAMESERVERS_URL)}
        />
      )}
      <DataTable
        headingTarget={headingTarget}
        isLoading={isLoading}
        text={"Nameserver Groups"}
        sorting={sorting}
        setSorting={setSorting}
        columns={columns}
        data={groups ?? []}
        searchPlaceholder={"Search by name..."}
        rightSide={() =>
          permission.nameservers?.create ? (
            <Button variant={"primary"} onClick={() => setCreateOpen(true)}>
              <PlusCircle size={16} />
              Add Nameserver Group
            </Button>
          ) : null
        }
      >
        {(table) => (
          <>
            <DataTableRowsPerPage table={table} disabled={!groups?.length} />
            <DataTableRefreshButton isDisabled={!groups?.length} onClick={() => mutate(NAMESERVERS_URL)} />
          </>
        )}
      </DataTable>
    </>
  );
}
