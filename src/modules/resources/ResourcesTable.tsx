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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/Select";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { useApiCall } from "@utils/api";
import dayjs from "dayjs";
import { BoxIcon, PenSquare, PlusCircle, Trash2 } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { buildResourceArn } from "@/utils/arn";
import {
  Resource,
  ResourceCreateRequest,
  ResourceCredProfile,
  ResourceKind,
  ResourceUpdateRequest,
} from "@/interfaces/Resource";

// ── Helpers ──────────────────────────────────────────────────────────────────

const KIND_OPTIONS: { value: ResourceKind; label: string }[] = [
  { value: "server", label: "Server" },
  { value: "db", label: "Database" },
  { value: "web", label: "Web" },
  { value: "k8s", label: "Kubernetes" },
];

const CRED_PROFILE_OPTIONS: { value: ResourceCredProfile; label: string }[] = [
  { value: "none", label: "None" },
  { value: "ssh_cert", label: "SSH certificate" },
  { value: "mtls_cert", label: "mTLS certificate" },
  { value: "db_creds", label: "Database credentials" },
];

// ── Create Modal ──────────────────────────────────────────────────────────────

type CreateResourceModalProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
};

function CreateResourceModal({ open, onOpenChange, onCreated }: CreateResourceModalProps) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<ResourceKind>("server");
  const [credProfile, setCredProfile] = useState<ResourceCredProfile>("none");
  const [region, setRegion] = useState("");
  const [description, setDescription] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("");
  const resourceRequest = useApiCall<Resource>("/ui/resources");

  const handleCreate = () => {
    const body: ResourceCreateRequest = {
      name: name.trim(),
      kind,
      credProfile,
      region: region.trim(),
      description: description.trim() || undefined,
    };
    // config is opaque Vault storage - only send it if the operator filled something in
    if (host.trim() || port.trim()) {
      body.config = {
        ...(host.trim() && { host: host.trim() }),
        ...(port.trim() && { port: Number(port) }),
      };
    }

    const promise = resourceRequest.post(body).then(() => {
      onCreated();
      handleClose();
    });
    notify({
      title: "Create Resource",
      description: "Resource successfully created.",
      promise,
      loadingMessage: "Creating resource...",
    });
  };

  const handleClose = () => {
    setName("");
    setKind("server");
    setCredProfile("none");
    setRegion("");
    setDescription("");
    setHost("");
    setPort("");
    onOpenChange(false);
  };

  const isValid = name.trim() && region.trim();

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className={"max-w-lg"}>
        <DialogHeader>
          <DialogTitle>
            <div className={"flex items-center gap-2"}>
              <BoxIcon size={16} />
              Create Resource
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className={"px-8 pb-4 flex flex-col gap-4"}>
          <div>
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={"e.g. prod-db"}
            />
          </div>
          <div>
            <Label>Kind</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as ResourceKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KIND_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Credential profile</Label>
            <Select value={credProfile} onValueChange={(v) => setCredProfile(v as ResourceCredProfile)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CRED_PROFILE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Region</Label>
            <Input
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder={"e.g. us-east-1"}
            />
          </div>
          <div>
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={"Optional"}
            />
          </div>
          <div className={"grid grid-cols-2 gap-4"}>
            <div>
              <Label>Host</Label>
              <Input
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder={"Optional — stored in Vault"}
              />
            </div>
            <div>
              <Label>Port</Label>
              <Input
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder={"Optional"}
                type={"number"}
              />
            </div>
          </div>
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

type EditResourceModalProps = {
  resource: Resource;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
};

function EditResourceModal({ resource, open, onOpenChange, onSaved }: EditResourceModalProps) {
  const [name, setName] = useState(resource.name);
  const [region, setRegion] = useState(resource.region);
  const [description, setDescription] = useState(resource.description ?? "");
  const [credProfile, setCredProfile] = useState<ResourceCredProfile>(resource.credProfile);
  const resourceRequest = useApiCall<Resource>(`/ui/resources/${resource.id}`);

  const handleSave = () => {
    const body: ResourceUpdateRequest = { credProfile };
    if (name.trim()) body.name = name.trim();
    if (region.trim()) body.region = region.trim();
    if (description.trim()) body.description = description.trim();

    const promise = resourceRequest.put(body).then(() => {
      onSaved();
      onOpenChange(false);
    });
    notify({
      title: "Update Resource",
      description: "Resource updated.",
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
              Edit Resource
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className={"px-8 pb-4 flex flex-col gap-4"}>
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Region</Label>
            <Input value={region} onChange={(e) => setRegion(e.target.value)} />
          </div>
          <div>
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label>Credential profile</Label>
            <Select value={credProfile} onValueChange={(v) => setCredProfile(v as ResourceCredProfile)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CRED_PROFILE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
  resources?: Resource[];
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
};

export default function ResourcesTable({ resources, isLoading, headingTarget }: Readonly<Props>) {
  const { mutate } = useSWRConfig();
  const path = usePathname();
  const { permission } = usePermissions();
  const { confirm } = useDialog();
  const [createOpen, setCreateOpen] = useState(false);
  const [editResource, setEditResource] = useState<Resource | null>(null);
  const resourceRequest = useApiCall<Resource>("/ui/resources");

  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [{ id: "createdAt", desc: true }],
  );

  const deleteResource = async (resource: Resource) => {
    const choice = await confirm({
      title: `Delete '${resource.name}'?`,
      description:
        "This resource will be permanently deleted and its Vault config removed.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!choice) return;

    const promise = resourceRequest.del(undefined, `/${resource.id}`).then(() =>
      mutate("/ui/resources"),
    );
    notify({
      title: "Delete Resource",
      description: `Resource '${resource.name}' deleted.`,
      promise,
      loadingMessage: "Deleting...",
    });
  };

  const columns: ColumnDef<Resource>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableHeader column={column}>Name</DataTableHeader>,
      sortingFn: "text",
      cell: ({ row }) => (
        <div className={"flex items-center gap-2"}>
          <BoxIcon size={14} className={"text-nb-gray-400 shrink-0"} />
          <div>
            <p className={"font-medium text-sm"}>{row.original.name}</p>
            {row.original.description && (
              <p className={"text-xs text-nb-gray-400"}>{row.original.description}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "kind",
      header: ({ column }) => <DataTableHeader column={column}>Kind</DataTableHeader>,
      sortingFn: "text",
      cell: ({ row }) => (
        <span className={"font-mono text-xs bg-nb-gray-900 rounded px-2 py-1"}>
          {row.original.kind}
        </span>
      ),
    },
    {
      accessorKey: "credProfile",
      header: ({ column }) => <DataTableHeader column={column}>Cred Profile</DataTableHeader>,
      sortingFn: "text",
      cell: ({ row }) => (
        <span className={"text-sm text-nb-gray-300"}>
          {CRED_PROFILE_OPTIONS.find((o) => o.value === row.original.credProfile)?.label ??
            row.original.credProfile}
        </span>
      ),
    },
    {
      accessorKey: "region",
      header: ({ column }) => <DataTableHeader column={column}>Region</DataTableHeader>,
      sortingFn: "text",
      cell: ({ row }) => (
        <span className={"text-sm text-nb-gray-300"}>{row.original.region}</span>
      ),
    },
    {
      id: "arn",
      header: ({ column }) => <DataTableHeader column={column}>ARN</DataTableHeader>,
      cell: ({ row }) => {
        const arn = buildResourceArn(row.original);
        return (
          <span
            className={"font-mono text-xs text-nb-gray-400 truncate max-w-[260px] block"}
            title={arn}
          >
            {arn}
          </span>
        );
      },
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
          <Button
            variant={"default-outline"}
            size={"sm"}
            onClick={() => setEditResource(row.original)}
          >
            <PenSquare size={14} />
          </Button>
          <Button
            variant={"danger-outline"}
            size={"sm"}
            onClick={() => deleteResource(row.original)}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <CreateResourceModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => mutate("/ui/resources")}
      />
      {editResource && (
        <EditResourceModal
          resource={editResource}
          open={true}
          onOpenChange={(v) => { if (!v) setEditResource(null); }}
          onSaved={() => mutate("/ui/resources")}
        />
      )}
      <DataTable
        headingTarget={headingTarget}
        isLoading={isLoading}
        text={"Resources"}
        sorting={sorting}
        setSorting={setSorting}
        columns={columns}
        data={resources ?? []}
        searchPlaceholder={"Search by name or ARN..."}
        rightSide={() =>
          permission.setup_keys?.create ? (
            <Button variant={"primary"} onClick={() => setCreateOpen(true)}>
              <PlusCircle size={16} />
              Add Resource
            </Button>
          ) : null
        }
      >
        {(table) => (
          <>
            <DataTableRowsPerPage table={table} disabled={!resources?.length} />
            <DataTableRefreshButton
              isDisabled={!resources?.length}
              onClick={() => mutate("/ui/resources")}
            />
          </>
        )}
      </DataTable>
    </>
  );
}
