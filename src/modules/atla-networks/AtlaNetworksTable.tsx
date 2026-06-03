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
import { useApiCall } from "@utils/api";
import { NetworkIcon, PenSquare, PlusCircle, Trash2 } from "lucide-react";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
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

function AtlaNetworkEditor({ network, open, onOpenChange, onSaved }: EditorProps) {
  const isEdit = !!network;
  const { data: resources } = useFetchApi<Resource[]>("/ui/resources");
  const hasResources = (resources?.length ?? 0) > 0;

  const [name, setName] = useState(network?.name ?? "");
  const [resourceId, setResourceId] = useState(network?.resourceId ?? "");
  const [cidr, setCidr] = useState(network?.cidr ?? "");
  const [description, setDescription] = useState(network?.description ?? "");
  const [isActive, setIsActive] = useState<boolean>(network?.isActive ?? false);

  const createCall = useApiCall<AtlaNetwork>("/ui/networks");
  const updateCall = useApiCall<AtlaNetwork>(`/ui/networks/${network?.id ?? ""}`);

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
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
      <DialogContent className={"max-w-lg"}>
        <DialogHeader>
          <DialogTitle>
            <div className={"flex items-center gap-2"}>
              <NetworkIcon size={16} />
              {isEdit ? "Edit Network" : "Create Network"}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className={"px-8 pb-4 flex flex-col gap-4"}>
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
            <div className={"flex items-center gap-2"}>
              <input
                id={"atla-net-active"}
                type={"checkbox"}
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <Label htmlFor={"atla-net-active"}>Active</Label>
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

// ── Table ────────────────────────────────────────────────────────────────────

type TableProps = {
  data?: AtlaNetwork[];
  isLoading: boolean;
};

export default function AtlaNetworksTable({ data, isLoading }: Readonly<TableProps>) {
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
    const promise = deleteCall({}, `/${n.id}`).then(() => mutate("/ui/networks"));
    notify({
      title: n.name,
      description: "Network deleted.",
      loadingMessage: "Deleting...",
      promise,
    });
  };

  const refresh = () => mutate("/ui/networks");

  return (
    <div className={"p-default pb-8"}>
      <div className={"flex items-center justify-between mb-3 gap-3"}>
        {!hasResources && (
          <p className={"text-xs text-amber-300"}>
            Create a{" "}
            <a className={"underline"} href={"/resources"}>
              resource
            </a>{" "}
            first — a network must reference one.
          </p>
        )}
        <Button
          variant={"primary"}
          onClick={() => setCreateOpen(true)}
          disabled={!hasResources}
          className={"ml-auto"}
        >
          <PlusCircle size={16} />
          Add Network
        </Button>
      </div>

      <div className={"border border-nb-gray-900 rounded-md overflow-hidden"}>
        <table className={"w-full text-sm"}>
          <thead className={"bg-nb-gray-940 text-nb-gray-300"}>
            <tr>
              <th className={"text-left px-3 py-2"}>Name</th>
              <th className={"text-left px-3 py-2"}>CIDR</th>
              <th className={"text-left px-3 py-2"}>Resource ID</th>
              <th className={"text-left px-3 py-2"}>Active</th>
              <th className={"text-left px-3 py-2"}>Created</th>
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
                  No networks yet.
                </td>
              </tr>
            )}
            {(data ?? []).map((n) => (
              <tr key={n.id} className={"border-t border-nb-gray-900"}>
                <td className={"px-3 py-2 font-medium text-nb-gray-100"}>{n.name}</td>
                <td className={"px-3 py-2 font-mono"}>{n.cidr}</td>
                <td className={"px-3 py-2 font-mono text-xs text-nb-gray-300"}>
                  {n.resourceId}
                </td>
                <td className={"px-3 py-2"}>{n.isActive ? "yes" : "no"}</td>
                <td className={"px-3 py-2 text-nb-gray-300"}>
                  {new Date(n.createdAt).toLocaleString()}
                </td>
                <td className={"px-3 py-2"}>
                  <div className={"flex items-center gap-1 justify-end"}>
                    <button
                      onClick={() => setEditing(n)}
                      className={"text-nb-gray-300 hover:text-white p-1"}
                      title={"Edit"}
                    >
                      <PenSquare size={14} />
                    </button>
                    <button
                      onClick={() => onDelete(n)}
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
    </div>
  );
}