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
import useFetchApi, { useApiCall } from "@utils/api";
import {
  CheckCircle2,
  PenSquare,
  PlusCircle,
  RouteIcon,
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
  AtlaNetworkRoute,
  CreateAtlaRouteRequest,
  UpdateAtlaRouteRequest,
} from "@/interfaces/AtlaNetwork";

type EditorProps = {
  route?: AtlaNetworkRoute;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
};

function AtlaRouteEditor({ route, open, onOpenChange, onSaved }: EditorProps) {
  const isEdit = !!route;
  const { data: networks } = useFetchApi<AtlaNetwork[]>("/ui/networks");
  const hasNetworks = (networks?.length ?? 0) > 0;

  const [networkId, setNetworkId] = useState(route?.networkId ?? "");
  const [cidr, setCidr] = useState(route?.cidr ?? "");
  const [via, setVia] = useState(route?.via ?? "");
  const [metric, setMetric] = useState<string>(
    route?.metric !== undefined ? String(route.metric) : "100",
  );
  const [description, setDescription] = useState(route?.description ?? "");
  const [isActive, setIsActive] = useState<boolean>(route?.isActive ?? false);

  const createCall = useApiCall<AtlaNetworkRoute>("/ui/routes");
  const updateCall = useApiCall<AtlaNetworkRoute>(
    `/ui/routes/${route?.id ?? ""}`,
  );

  const close = () => {
    if (!isEdit) {
      setNetworkId("");
      setCidr("");
      setVia("");
      setMetric("100");
      setDescription("");
      setIsActive(false);
    }
    onOpenChange(false);
  };

  const save = () => {
    const m = metric.trim() ? parseInt(metric, 10) : undefined;
    let promise: Promise<unknown>;
    if (isEdit) {
      const body: UpdateAtlaRouteRequest = {
        networkId, // immutable but required to locate the row
        cidr: cidr.trim() || undefined,
        via: via.trim() || undefined,
        metric: Number.isFinite(m) ? m : undefined,
        description: description.trim() || undefined,
        isActive,
      };
      promise = updateCall.put(body);
    } else {
      const body: CreateAtlaRouteRequest = {
        networkId,
        cidr: cidr.trim(),
        via: via.trim() || undefined,
        metric: Number.isFinite(m) ? m : undefined,
        description: description.trim() || undefined,
      };
      promise = createCall.post(body);
    }

    notify({
      title: isEdit ? "Update route" : "Create route",
      description: isEdit ? "Route updated." : "Route created.",
      loadingMessage: isEdit ? "Saving..." : "Creating...",
      promise: promise.then(() => {
        onSaved();
        close();
      }),
    });
  };

  const isValid = (isEdit || hasNetworks) && networkId && cidr.trim();

  return (
    <FormModal
      open={open}
      onOpenChange={(v) => (v ? onOpenChange(true) : close())}
      icon={<RouteIcon size={20} />}
      title={isEdit ? "Edit Route" : "Create Route"}
      description={
        isEdit
          ? "Change the route's destination, gateway or state."
          : "Add a routing rule to a network."
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
        {!hasNetworks && !isEdit && (
          <div
            className={
              "rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200"
            }
          >
            You need to create a{" "}
            <a className={"underline"} href={"/atla-networks"}>
              network
            </a>{" "}
            before you can add routes to it.
          </div>
        )}
        <div>
          <Label>Network</Label>
          <Select
            value={networkId}
            onValueChange={setNetworkId}
            disabled={isEdit || !hasNetworks}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  hasNetworks ? "Select network" : "No networks available"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {(networks ?? []).map((n) => (
                <SelectItem key={n.id} value={n.id}>
                  {n.name} ({n.cidr})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Destination CIDR</Label>
          <Input
            value={cidr}
            onChange={(e) => setCidr(e.target.value)}
            placeholder={"10.0.0.0/24"}
          />
        </div>
        <div>
          <Label>Via (gateway, optional)</Label>
          <Input
            value={via}
            onChange={(e) => setVia(e.target.value)}
            placeholder={"10.0.0.1"}
          />
        </div>
        <div>
          <Label>Metric</Label>
          <Input
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            placeholder={"100"}
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

type TableProps = {
  data?: AtlaNetworkRoute[];
  networks?: AtlaNetwork[];
  isLoading: boolean;
};

export default function AtlaRoutesTable({
  data,
  networks,
  isLoading,
}: Readonly<TableProps>) {
  const { mutate } = useSWRConfig();
  const { confirm } = useDialog();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AtlaNetworkRoute | null>(null);

  const hasNetworks = (networks?.length ?? 0) > 0;
  const deleteCall = useApiCall("/ui/routes").del;

  const networkName = (id: string) =>
    networks?.find((n) => n.id === id)?.name ?? id;

  const onDelete = async (r: AtlaNetworkRoute) => {
    const choice = await confirm({
      title: `Delete route ${r.cidr}?`,
      description: "This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!choice) return;
    const promise = deleteCall({}, `/${r.id}`).then(() => mutate("/ui/routes"));
    notify({
      title: r.cidr,
      description: "Route deleted.",
      loadingMessage: "Deleting...",
      promise,
    });
  };

  const refresh = () => mutate("/ui/routes");

  const path = usePathname();
  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [{ id: "network", desc: false }],
  );

  const columns: ColumnDef<AtlaNetworkRoute>[] = useMemo(
    () => [
      {
        id: "network",
        accessorFn: (r) => networkName(r.networkId),
        header: ({ column }) => (
          <DataTableHeader column={column}>Network</DataTableHeader>
        ),
        sortingFn: "text",
        cell: ({ row }) => (
          <div className={"flex items-center gap-2 px-2 py-1"}>
            <RouteIcon size={14} className={"text-nb-gray-400 shrink-0"} />
            <span className={"text-sm font-medium"}>
              {networkName(row.original.networkId)}
            </span>
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
        accessorKey: "via",
        header: ({ column }) => (
          <DataTableHeader column={column}>Via</DataTableHeader>
        ),
        sortingFn: "text",
        cell: ({ row }) =>
          row.original.via ? (
            <span className={"font-mono text-sm text-nb-gray-300"}>
              {row.original.via}
            </span>
          ) : (
            <span className={"text-sm text-nb-gray-500"}>—</span>
          ),
      },
      {
        accessorKey: "metric",
        header: ({ column }) => (
          <DataTableHeader column={column}>Metric</DataTableHeader>
        ),
        cell: ({ row }) => (
          <span className={"text-sm text-nb-gray-300"}>
            {row.original.metric}
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
    [networks],
  );

  return (
    <>
      {!hasNetworks && (
        <p className={"p-default pb-3 text-xs text-amber-300"}>
          Create a{" "}
          <a className={"underline"} href={"/atla-networks"}>
            network
          </a>{" "}
          first — a route must belong to one.
        </p>
      )}

      <DataTable
        isLoading={isLoading}
        text={"Routes"}
        sorting={sorting}
        setSorting={setSorting}
        columns={columns}
        data={data ?? []}
        searchPlaceholder={"Search by network, CIDR or gateway..."}
        rightSide={() => (
          <Button
            variant={"primary"}
            onClick={() => setCreateOpen(true)}
            disabled={!hasNetworks}
            className={"ml-auto"}
          >
            <PlusCircle size={16} />
            Add Route
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

      <AtlaRouteEditor
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={refresh}
      />
      {editing && (
        <AtlaRouteEditor
          route={editing}
          open={!!editing}
          onOpenChange={(v) => !v && setEditing(null)}
          onSaved={refresh}
        />
      )}
    </>
  );
}
