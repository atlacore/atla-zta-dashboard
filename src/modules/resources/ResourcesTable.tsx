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
import { Resource, ResourceCreateRequest, ResourceKind, ResourceUpdateRequest } from "@/interfaces/Resource";
import HelpText from "@components/HelpText";

// ── Helpers ──────────────────────────────────────────────────────────────────

const KIND_OPTIONS: { value: ResourceKind; label: string }[] = [
  { value: "wg", label: "WireGuard (wg)" },
  { value: "ssh", label: "SSH" },
  { value: "db", label: "Database (db)" },
  { value: "mtls", label: "mTLS" },
];

// ── Create Modal ──────────────────────────────────────────────────────────────

type CreateResourceModalProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
};

function CreateResourceModal({ open, onOpenChange, onCreated }: CreateResourceModalProps) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<ResourceKind>("wg");
  const [region, setRegion] = useState("");
  const [description, setDescription] = useState("");
  const [configJson, setConfigJson] = useState("{}");
  const [jsonError, setJsonError] = useState("");
  const resourceRequest = useApiCall<Resource>("/ui/resources");

  const handleCreate = () => {
    let config: Record<string, unknown>;
    try {
      config = JSON.parse(configJson);
      setJsonError("");
    } catch {
      setJsonError("Invalid JSON");
      return;
    }

    const body: ResourceCreateRequest = {
      name: name.trim(),
      kind,
      region: region.trim(),
      description: description.trim() || undefined,
      config,
    };

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
    setKind("wg");
    setRegion("");
    setDescription("");
    setConfigJson("{}");
    setJsonError("");
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
          <div>
            <Label>Config (JSON)</Label>
            <HelpText>
              Resource-specific config stored in Vault (host, port, etc.).
            </HelpText>
            <textarea
              className={
                "w-full bg-nb-gray-900/30 border border-nb-gray-900 rounded-md px-3 py-2 font-mono text-xs text-nb-gray-100 resize-y min-h-[80px] focus:outline-none"
              }
              value={configJson}
              onChange={(e) => setConfigJson(e.target.value)}
            />
            {jsonError && <p className={"text-xs text-red-400 mt-1"}>{jsonError}</p>}
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
  const resourceRequest = useApiCall<Resource>(`/ui/resources/${resource.id}`);

  const handleSave = () => {
    const body: ResourceUpdateRequest = {};
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
      accessorKey: "region",
      header: ({ column }) => <DataTableHeader column={column}>Region</DataTableHeader>,
      sortingFn: "text",
      cell: ({ row }) => (
        <span className={"text-sm text-nb-gray-300"}>{row.original.region}</span>
      ),
    },
    {
      accessorKey: "arn",
      header: ({ column }) => <DataTableHeader column={column}>ARN</DataTableHeader>,
      sortingFn: "text",
      cell: ({ row }) => (
        <span
          className={"font-mono text-xs text-nb-gray-400 truncate max-w-[260px] block"}
          title={row.original.arn}
        >
          {row.original.arn}
        </span>
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
