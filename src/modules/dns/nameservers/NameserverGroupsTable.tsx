"use client";

import Button from "@components/Button";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import { notify } from "@components/Notification";
import FormModal from "@components/modal/FormModal";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import HelpText from "@components/HelpText";
import CheckboxField from "@components/CheckboxField";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { useApiCall } from "@utils/api";
import dayjs from "dayjs";
import {
  CheckCircle2,
  PenSquare,
  PlusCircle,
  ServerIcon,
  Trash2,
  XCircle,
} from "lucide-react";
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
  s
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

// ── Create Modal ──────────────────────────────────────────────────────────────

type CreateModalProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
};

function CreateNameserverGroupModal({
  open,
  onOpenChange,
  onCreated,
}: CreateModalProps) {
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
    <FormModal
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
      icon={<ServerIcon size={20} />}
      title={"Create Nameserver Group"}
      description={"Define the nameservers zones will delegate to."}
      footer={
        <>
          <Button variant={"secondary"} onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant={"primary"}
            onClick={handleCreate}
            disabled={!isValid}
          >
            <PlusCircle size={16} />
            Create
          </Button>
        </>
      }
    >
      <div className={"px-8 pb-6 flex flex-col gap-5"}>
        <div>
          <Label>Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={"e.g. Cloudflare"}
          />
        </div>
        <div>
          <Label>Nameservers</Label>
          <HelpText>
            Comma-separated hostnames, not IPs — this becomes the NS record
            target and RFC 1035 requires a domain name there, e.g.
            ns1.example.com, ns2.example.com
          </HelpText>
          <Input
            value={nameservers}
            onChange={(e) => setNameservers(e.target.value)}
            placeholder={"ns1.example.com, ns2.example.com"}
          />
        </div>
        <CheckboxField
          label={"Primary"}
          checked={isPrimary}
          onChange={setIsPrimary}
          description={
            "The primary group is used unless a zone specifies another"
          }
        />
      </div>
    </FormModal>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

type EditModalProps = {
  group: DNSNameserverGroup;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
};

function EditNameserverGroupModal({
  group,
  open,
  onOpenChange,
  onSaved,
}: EditModalProps) {
  const [name, setName] = useState(group.name);
  const [nameservers, setNameservers] = useState(group.nameservers.join(", "));
  const [isPrimary, setIsPrimary] = useState(group.isPrimary);
  const request = useApiCall<DNSNameserverGroup>(
    `${NAMESERVERS_URL}/${group.id}`,
  );

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
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      icon={<PenSquare size={20} />}
      title={"Edit Nameserver Group"}
      description={"Change the group's name, nameservers or primary flag."}
      footer={
        <>
          <Button variant={"secondary"} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant={"primary"} onClick={handleSave}>
            Save
          </Button>
        </>
      }
    >
      <div className={"px-8 pb-6 flex flex-col gap-5"}>
        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Nameservers</Label>
          <HelpText>
            Comma-separated hostnames, not IPs — e.g. ns1.example.com,
            ns2.example.com
          </HelpText>
          <Input
            value={nameservers}
            onChange={(e) => setNameservers(e.target.value)}
          />
        </div>
        <CheckboxField
          label={"Primary"}
          checked={isPrimary}
          onChange={setIsPrimary}
        />
      </div>
    </FormModal>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────

type Props = {
  groups?: DNSNameserverGroup[];
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
};

export default function NameserverGroupsTable({
  groups,
  isLoading,
  headingTarget,
}: Readonly<Props>) {
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

    const promise = request
      .del(undefined, `/${group.id}`)
      .then(() => mutate(NAMESERVERS_URL));
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
      header: ({ column }) => (
        <DataTableHeader column={column}>Name</DataTableHeader>
      ),
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
      header: ({ column }) => (
        <DataTableHeader column={column}>Nameservers</DataTableHeader>
      ),
      cell: ({ row }) => (
        <span className={"font-mono text-xs text-nb-gray-300"}>
          {row.original.nameservers.join(", ")}
        </span>
      ),
    },
    {
      accessorKey: "isPrimary",
      header: ({ column }) => (
        <DataTableHeader column={column}>Primary</DataTableHeader>
      ),
      cell: ({ row }) =>
        row.original.isPrimary ? (
          <CheckCircle2
            size={18}
            className={"text-green-500"}
            aria-label={"Primary"}
          />
        ) : (
          <XCircle
            size={18}
            className={"text-nb-gray-500"}
            aria-label={"Not primary"}
          />
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
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className={"flex justify-end pr-4 gap-2"}>
          <Button
            variant={"default-outline"}
            size={"sm"}
            onClick={() => setEditGroup(row.original)}
            tooltip={"Edit"}
          >
            <PenSquare size={14} />
          </Button>
          <Button
            variant={"danger-outline"}
            size={"sm"}
            onClick={() => deleteGroup(row.original)}
            tooltip={"Delete"}
          >
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
          onOpenChange={(v) => {
            if (!v) setEditGroup(null);
          }}
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
            <DataTableRefreshButton
              isDisabled={!groups?.length}
              onClick={() => mutate(NAMESERVERS_URL)}
            />
          </>
        )}
      </DataTable>
    </>
  );
}
