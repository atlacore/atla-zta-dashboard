"use client";

import Button from "@components/Button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/Dialog";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { notify } from "@components/Notification";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/Select";
import useFetchApi, { useApiCall } from "@utils/api";
import { PenSquare, PlusCircle, RouteIcon, Trash2 } from "lucide-react";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
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
  const updateCall = useApiCall<AtlaNetworkRoute>(`/ui/routes/${route?.id ?? ""}`);

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
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
      <DialogContent className={"max-w-lg"}>
        <DialogHeader>
          <DialogTitle>
            <div className={"flex items-center gap-2"}>
              <RouteIcon size={16} />
              {isEdit ? "Edit Route" : "Create Route"}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className={"px-8 pb-4 flex flex-col gap-4"}>
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
            <div className={"flex items-center gap-2"}>
              <input
                id={"atla-route-active"}
                type={"checkbox"}
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <Label htmlFor={"atla-route-active"}>Active</Label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant={"secondary"} onClick={close}>
            Cancel
          </Button>
          <Button variant={"primary"} onClick={save} disabled={!isValid}>
            <PlusCircle size={16} />
            {isEdit ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

  return (
    <div className={"p-default pb-8"}>
      <div className={"flex items-center justify-between mb-3 gap-3"}>
        {!hasNetworks && (
          <p className={"text-xs text-amber-300"}>
            Create a{" "}
            <a className={"underline"} href={"/atla-networks"}>
              network
            </a>{" "}
            first — a route must belong to one.
          </p>
        )}
        <Button
          variant={"primary"}
          onClick={() => setCreateOpen(true)}
          disabled={!hasNetworks}
          className={"ml-auto"}
        >
          <PlusCircle size={16} />
          Add Route
        </Button>
      </div>

      <div className={"border border-nb-gray-900 rounded-md overflow-hidden"}>
        <table className={"w-full text-sm"}>
          <thead className={"bg-nb-gray-940 text-nb-gray-300"}>
            <tr>
              <th className={"text-left px-3 py-2"}>Network</th>
              <th className={"text-left px-3 py-2"}>CIDR</th>
              <th className={"text-left px-3 py-2"}>Via</th>
              <th className={"text-left px-3 py-2"}>Metric</th>
              <th className={"text-left px-3 py-2"}>Active</th>
              <th className={"px-3 py-2"} />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className={"px-3 py-2 text-nb-gray-300"} colSpan={6}>
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && (data ?? []).length === 0 && (
              <tr>
                <td className={"px-3 py-2 text-nb-gray-300"} colSpan={6}>
                  No routes yet.
                </td>
              </tr>
            )}
            {(data ?? []).map((r) => (
              <tr key={r.id} className={"border-t border-nb-gray-900"}>
                <td className={"px-3 py-2 font-medium text-nb-gray-100"}>
                  {networkName(r.networkId)}
                </td>
                <td className={"px-3 py-2 font-mono"}>{r.cidr}</td>
                <td className={"px-3 py-2 font-mono text-nb-gray-300"}>
                  {r.via ?? <span className={"text-nb-gray-500"}>—</span>}
                </td>
                <td className={"px-3 py-2"}>{r.metric}</td>
                <td className={"px-3 py-2"}>{r.isActive ? "yes" : "no"}</td>
                <td className={"px-3 py-2"}>
                  <div className={"flex items-center gap-1 justify-end"}>
                    <button
                      onClick={() => setEditing(r)}
                      className={"text-nb-gray-300 hover:text-white p-1"}
                      title={"Edit"}
                    >
                      <PenSquare size={14} />
                    </button>
                    <button
                      onClick={() => onDelete(r)}
                      className={"text-nb-gray-300 hover:text-red-400 p-1"}
                      title={"Delete"}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
    </div>
  );
}