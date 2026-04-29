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
import { PenSquare, PlusCircle, ShieldCheck, Trash2 } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { usePermissions } from "@/contexts/PermissionsProvider";
import {
  AccessPolicy,
  AccessPolicyCreateRequest,
  AccessPolicyUpdateRequest,
  PolicyRuleRequest,
} from "@/interfaces/AccessPolicy";
import HelpText from "@components/HelpText";

// ── Default rule template ─────────────────────────────────────────────────────

const DEFAULT_RULES: PolicyRuleRequest[] = [
  {
    users: [],
    resources: [],
    action: "allow",
    protocol: "all",
    ports: [],
  },
];

// ── Create Modal ──────────────────────────────────────────────────────────────

type CreateModalProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
};

function CreateAccessPolicyModal({ open, onOpenChange, onCreated }: CreateModalProps) {
  const [name, setName] = useState("");
  const [rulesJson, setRulesJson] = useState(
    JSON.stringify(DEFAULT_RULES, null, 2),
  );
  const [jsonError, setJsonError] = useState("");
  const policyRequest = useApiCall<AccessPolicy>("/ui/access-policies");

  const handleCreate = () => {
    let rules: PolicyRuleRequest[];
    try {
      rules = JSON.parse(rulesJson);
      setJsonError("");
    } catch {
      setJsonError("Invalid JSON");
      return;
    }

    const body: AccessPolicyCreateRequest = { name: name.trim(), rules };
    const promise = policyRequest.post(body).then(() => {
      onCreated();
      handleClose();
    });
    notify({
      title: "Create Access Policy",
      description: "Access policy created.",
      promise,
      loadingMessage: "Creating...",
    });
  };

  const handleClose = () => {
    setName("");
    setRulesJson(JSON.stringify(DEFAULT_RULES, null, 2));
    setJsonError("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className={"max-w-xl"}>
        <DialogHeader>
          <DialogTitle>
            <div className={"flex items-center gap-2"}>
              <ShieldCheck size={16} />
              Create Access Policy
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className={"px-8 pb-4 flex flex-col gap-4"}>
          <div>
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={"e.g. dev-ssh-access"}
            />
          </div>
          <div>
            <Label>Rules (JSON)</Label>
            <HelpText>
              Each rule specifies users (UUIDs), resources (ARNs), action, protocol, and ports.
              Use <code className={"font-mono text-xs"}>[]</code> for ports to allow all.
            </HelpText>
            <textarea
              className={
                "w-full bg-nb-gray-900/30 border border-nb-gray-900 rounded-md px-3 py-2 font-mono text-xs text-nb-gray-100 resize-y min-h-[160px] focus:outline-none"
              }
              value={rulesJson}
              onChange={(e) => setRulesJson(e.target.value)}
            />
            {jsonError && (
              <p className={"text-xs text-red-400 mt-1"}>{jsonError}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant={"secondary"} onClick={handleClose}>Cancel</Button>
          <Button variant={"primary"} onClick={handleCreate} disabled={!name.trim()}>
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
  policy: AccessPolicy;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
};

function EditAccessPolicyModal({ policy, open, onOpenChange, onSaved }: EditModalProps) {
  const [name, setName] = useState(policy.name);
  const [description, setDescription] = useState(policy.description ?? "");
  const policyRequest = useApiCall<AccessPolicy>(`/ui/access-policies/${policy.id}`);

  const handleSave = () => {
    const body: AccessPolicyUpdateRequest = {};
    if (name.trim()) body.name = name.trim();
    if (description.trim()) body.description = description.trim();

    const promise = policyRequest.put(body).then(() => {
      onSaved();
      onOpenChange(false);
    });
    notify({
      title: "Update Access Policy",
      description: "Access policy updated.",
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
              Edit Access Policy
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className={"px-8 pb-4 flex flex-col gap-4"}>
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={"Optional"}
            />
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
  policies?: AccessPolicy[];
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
};

export default function AccessPoliciesTable({
  policies,
  isLoading,
  headingTarget,
}: Readonly<Props>) {
  const { mutate } = useSWRConfig();
  const path = usePathname();
  const { permission } = usePermissions();
  const { confirm } = useDialog();
  const [createOpen, setCreateOpen] = useState(false);
  const [editPolicy, setEditPolicy] = useState<AccessPolicy | null>(null);
  const policyRequest = useApiCall<AccessPolicy>("/ui/access-policies");

  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [{ id: "createdAt", desc: true }],
  );

  const deletePolicy = async (policy: AccessPolicy) => {
    const choice = await confirm({
      title: `Delete '${policy.name}'?`,
      description:
        "This access policy will be permanently deleted and Rego will be rebuilt.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!choice) return;

    const promise = policyRequest.del(undefined, `/${policy.id}`).then(() =>
      mutate("/ui/access-policies"),
    );
    notify({
      title: "Delete Access Policy",
      description: `Policy '${policy.name}' deleted.`,
      promise,
      loadingMessage: "Deleting...",
    });
  };

  const columns: ColumnDef<AccessPolicy>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableHeader column={column}>Name</DataTableHeader>
      ),
      sortingFn: "text",
      cell: ({ row }) => (
        <div className={"flex items-center gap-2"}>
          <ShieldCheck size={14} className={"text-nb-gray-400 shrink-0"} />
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
      accessorKey: "updatedAt",
      header: ({ column }) => (
        <DataTableHeader column={column}>Updated</DataTableHeader>
      ),
      sortingFn: "datetime",
      cell: ({ row }) => (
        <span className={"text-sm text-nb-gray-300"}>
          {dayjs(row.original.updatedAt).format("MMM D, YYYY")}
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
            onClick={() => setEditPolicy(row.original)}
          >
            <PenSquare size={14} />
          </Button>
          <Button
            variant={"danger-outline"}
            size={"sm"}
            onClick={() => deletePolicy(row.original)}
            disabled={!permission.policies?.delete}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <CreateAccessPolicyModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => mutate("/ui/access-policies")}
      />
      {editPolicy && (
        <EditAccessPolicyModal
          policy={editPolicy}
          open={true}
          onOpenChange={(v) => { if (!v) setEditPolicy(null); }}
          onSaved={() => mutate("/ui/access-policies")}
        />
      )}
      <DataTable
        headingTarget={headingTarget}
        isLoading={isLoading}
        text={"Access Policies"}
        sorting={sorting}
        setSorting={setSorting}
        columns={columns}
        data={policies ?? []}
        searchPlaceholder={"Search by name..."}
        rightSide={() =>
          permission.policies?.create ? (
            <Button variant={"primary"} onClick={() => setCreateOpen(true)}>
              <PlusCircle size={16} />
              New Policy
            </Button>
          ) : null
        }
      >
        {(table) => (
          <>
            <DataTableRowsPerPage table={table} disabled={!policies?.length} />
            <DataTableRefreshButton
              isDisabled={!policies?.length}
              onClick={() => mutate("/ui/access-policies")}
            />
          </>
        )}
      </DataTable>
    </>
  );
}
