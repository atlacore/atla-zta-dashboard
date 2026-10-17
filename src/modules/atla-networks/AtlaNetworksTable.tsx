"use client";

import Button from "@components/Button";
import CheckboxField from "@components/CheckboxField";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import FormModal from "@components/modal/FormModal";
import { notify } from "@components/Notification";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/Select";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { useApiCall } from "@utils/api";
import dayjs from "dayjs";
import {
  CheckCircle2,
  NetworkIcon,
  PenSquare,
  PlusCircle,
  Trash2,
  XCircle,
} from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  AtlaNetwork,
  CreateAtlaNetworkRequest,
  UpdateAtlaNetworkRequest,
} from "@/interfaces/AtlaNetwork";
import { Resource } from "@/interfaces/Resource";
import useFetchApi from "@utils/api";

// ── Create / Edit modal ──────────────────────────────────────────────────────

type EditorProps = {
  network?: AtlaNetwork; // present → edit, absent → create
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
};

function AtlaNetworkEditor({
  network,
  open,
  onOpenChange,
  onSaved,
}: EditorProps) {
  const isEdit = !!network;
  const { data: resources } = useFetchApi<Resource[]>("/ui/resources");
  const hasResources = (resources?.length ?? 0) > 0;

  const [name, setName] = useState(network?.name ?? "");
  const [resourceId, setResourceId] = useState(network?.resourceId ?? "");
  const [cidr, setCidr] = useState(network?.cidr ?? "");
  const [description, setDescription] = useState(network?.description ?? "");
  const [isActive, setIsActive] = useState<boolean>(network?.isActive ?? false);

  const createCall = useApiCall<AtlaNetwork>("/ui/networks");
  const updateCall = useApiCall<AtlaNetwork>(
    `/ui/networks/${network?.id ?? ""}`,
  );

  const close = () => {
    if (!isEdit) {
      setName("");
      setResourceId("");
      setCidr("");
      setDescription("");
      setIsActive(false);
    }
    onOpenChange(false);
  };

  const save = () => {
    let promise: Promise<unknown>;
    if (isEdit) {
      const body: UpdateAtlaNetworkRequest = {
        name: name.trim() || undefined,
        resourceId: resourceId || undefined,
        cidr: cidr.trim() || undefined,
        description: description.trim() || undefined,
        isActive,
      };
      promise = updateCall.put(body);
    } else {
      const body: CreateAtlaNetworkRequest = {
        name: name.trim(),
        resourceId,
        cidr: cidr.trim(),
        description: description.trim() || undefined,
      };
      promise = createCall.post(body);
    }

    notify({
      title: isEdit ? "Update network" : "Create network",
      description: isEdit ? "Network updated." : "Network created.",
      loadingMessage: isEdit ? "Saving..." : "Creating...",
      promise: promise.then(() => {
        onSaved();
        close();
      }),
    });
  };

  const isValid = hasResources && name.trim() && resourceId && cidr.trim();

  return (
    <FormModal
      open={open}
      onOpenChange={(v) => (v ? onOpenChange(true) : close())}
      icon={<NetworkIcon size={20} />}
      title={isEdit ? "Edit Network" : "Create Network"}
      description={
        isEdit
          ? "Change the network's range, owner resource or state."
          : "Attach a network range to a resource."
      }
      footer={
        <>
          <Button variant={"secondary"} onClick={close}>
            Cancel
          </Button>
          <Button variant={"primary"} onClick={save} disabled={!isValid}>
            <PlusCircle size={16} />
            {isEdit ? "Save" : "Create"}
          </Button>
        </>
      }
    >
      <div className={"px-8 pb-6 flex flex-col gap-5"}>
        {!hasResources && (
          <div
            className={
              "rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200"
            }
          >
            You need to create a{" "}
            <a className={"underline"} href={"/resources"}>
              resource
            </a>{" "}
            before you can attach a network to it.
          </div>
        )}
        <div>
          <Label>Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={"e.g. prod-lan"}
            disabled={!hasResources}
          />
        </div>
        <div>
          <Label>Resource</Label>
          <Select
            value={resourceId}
            onValueChange={setResourceId}
            disabled={!hasResources}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  hasResources ? "Select resource" : "No resources available"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {(resources ?? []).map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>CIDR</Label>
          <Input
            value={cidr}
            onChange={(e) => setCidr(e.target.value)}
            placeholder={"192.168.0.0/24"}
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
        {isEdit && (
          <CheckboxField
            label={"Active"}
            checked={isActive}
            onChange={setIsActive}
          />
        )}
      </div>
    </FormModal>
  );
}

// ── Table ────────────────────────────────────────────────────────────────────

type TableProps = {
  data?: AtlaNetwork[];
  isLoading: boolean;
};

export default function AtlaNetworksTable({
  data,
  isLoading,
}: Readonly<TableProps>) {
  const { mutate } = useSWRConfig();
  const { confirm } = useDialog();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AtlaNetwork | null>(null);

  const { data: resources } = useFetchApi<Resource[]>("/ui/resources");
  const hasResources = (resources?.length ?? 0) > 0;

  const deleteCall = useApiCall("/ui/networks").del;

  const onDelete = async (n: AtlaNetwork) => {
    const choice = await confirm({
      title: `Delete '${n.name}'?`,
      description:
        "All routes belonging to this network will also be removed. This cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!choice) return;
    const promise = deleteCall({}, `/${n.id}`).then(() =>
      mutate("/ui/networks"),
    );
    notify({
      title: n.name,
      description: "Network deleted.",
      loadingMessage: "Deleting...",
      promise,
    });
  };

  const refresh = () => mutate("/ui/networks");

  const path = usePathname();
  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [{ id: "createdAt", desc: true }],
  );

  const columns: ColumnDef<AtlaNetwork>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableHeader column={column}>Name</DataTableHeader>
        ),
        sortingFn: "text",
        cell: ({ row }) => (
          <div className={"flex items-center gap-2 px-2 py-1"}>
            <NetworkIcon size={14} className={"text-nb-gray-400 shrink-0"} />
            <span className={"text-sm font-medium"}>{row.original.name}</span>
          </div>
        ),
      },
      {
        accessorKey: "cidr",
        header: ({ column }) => (
          <DataTableHeader column={column}>CIDR</DataTableHeader>
        ),
        sortingFn: "text",
        cell: ({ row }) => (
          <span className={"font-mono text-sm"}>{row.original.cidr}</span>
        ),
      },
      {
        id: "resource",
        accessorFn: (n) =>
          resources?.find((r) => r.id === n.resourceId)?.name ?? n.resourceId,
        header: ({ column }) => (
          <DataTableHeader column={column}>Resource</DataTableHeader>
        ),
        sortingFn: "text",
        cell: ({ row }) => (
          <span
            className={"text-sm text-nb-gray-300"}
            title={row.original.resourceId}
          >
            {resources?.find((r) => r.id === row.original.resourceId)?.name ??
              row.original.resourceId}
          </span>
        ),
      },
      {
        accessorKey: "isActive",
        header: ({ column }) => (
          <DataTableHeader column={column}>Active</DataTableHeader>
        ),
        cell: ({ row }) =>
          row.original.isActive ? (
            <CheckCircle2
              size={18}
              className={"text-green-500"}
              aria-label={"Active"}
            />
          ) : (
            <XCircle
              size={18}
              className={"text-nb-gray-500"}
              aria-label={"Inactive"}
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
          <div className={"flex items-center justify-end gap-2 pr-4"}>
            <Button
              variant={"secondary"}
              className={"!px-3"}
              onClick={() => setEditing(row.original)}
              tooltip={"Edit"}
            >
              <PenSquare size={14} />
            </Button>
            <Button
              variant={"danger-outline"}
              className={"!px-3"}
              onClick={() => onDelete(row.original)}
              tooltip={"Delete"}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resources],
  );

  return (
    <>
      {!hasResources && (
        <p className={"p-default pb-3 text-xs text-amber-300"}>
          Create a{" "}
          <a className={"underline"} href={"/resources"}>
            resource
          </a>{" "}
          first — a network must reference one.
        </p>
      )}

      <DataTable
        isLoading={isLoading}
        text={"Networks"}
        sorting={sorting}
        setSorting={setSorting}
        columns={columns}
        data={data ?? []}
        searchPlaceholder={"Search by name or CIDR..."}
        rightSide={() => (
          <Button
            variant={"primary"}
            onClick={() => setCreateOpen(true)}
            disabled={!hasResources}
            className={"ml-auto"}
          >
            <PlusCircle size={16} />
            Add Network
          </Button>
        )}
      >
        {(table) => (
          <>
            <DataTableRowsPerPage table={table} disabled={!data?.length} />
            <DataTableRefreshButton
              isDisabled={!data?.length}
              onClick={refresh}
            />
          </>
        )}
      </DataTable>

      <AtlaNetworkEditor
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={refresh}
      />
      {editing && (
        <AtlaNetworkEditor
          network={editing}
          open={!!editing}
          onOpenChange={(v) => !v && setEditing(null)}
          onSaved={refresh}
        />
      )}
    </>
  );
}
