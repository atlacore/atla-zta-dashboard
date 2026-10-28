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
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { useApiCall } from "@utils/api";
import dayjs from "dayjs";
import { PenSquare, PlusCircle, ScanSearch, ShieldCheck, Trash2 } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useSWRConfig } from "swr";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import PolicySimulationResult, { usePolicySimulation } from "@/modules/access-policies/PolicySimulation";
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

function CreateAccessPolicyModal({
  open,
  onOpenChange,
  onCreated,
}: CreateModalProps) {
  const [name, setName] = useState("");
  const [rulesJson, setRulesJson] = useState(
    JSON.stringify(DEFAULT_RULES, null, 2),
  );
  const [jsonError, setJsonError] = useState("");
  const policyRequest = useApiCall<AccessPolicy>("/ui/access-policies");
  const simulation = usePolicySimulation();

  const parseRules = (): PolicyRuleRequest[] | undefined => {
    try {
      const rules = JSON.parse(rulesJson);
      setJsonError("");
      return rules;
    } catch {
      setJsonError("Invalid JSON");
      return undefined;
    }
  };

  const checkImpact = () => {
    const rules = parseRules();
    if (rules) simulation.run({ add: [{ name: name.trim() || "draft", rules }] });
  };

  const handleCreate = () => {
    const rules = parseRules();
    if (!rules) return;

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
    simulation.reset();
    onOpenChange(false);
  };

  return (
    <FormModal
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
      maxWidthClass={"max-w-xl"}
      icon={<ShieldCheck size={20} />}
      title={"Create Access Policy"}
      description={"Grant users access to resources and networks."}
      footer={
        <>
          <Button variant={"secondary"} onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant={"default-outline"}
            onClick={checkImpact}
            disabled={simulation.running}
          >
            <ScanSearch size={16} />
            Check impact
          </Button>
          <Button
            variant={"primary"}
            onClick={handleCreate}
            disabled={!name.trim()}
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
            placeholder={"e.g. dev-ssh-access"}
          />
        </div>
        <div>
          <Label>Rules (JSON)</Label>
          <HelpText>
            Each rule specifies users (UUIDs), resources (ARNs), action,
            protocol, and ports. Use{" "}
            <code className={"font-mono text-xs"}>[]</code> for ports to allow
            all.
          </HelpText>
          <textarea
            className={
              "w-full bg-nb-gray-900/30 border border-nb-gray-900 rounded-md px-3 py-2 font-mono text-xs text-nb-gray-100 resize-y min-h-[160px] focus:outline-none"
            }
            value={rulesJson}
            onChange={(e) => {
              setRulesJson(e.target.value);
              simulation.reset();
            }}
          />
          {jsonError && (
            <p className={"text-xs text-red-400 mt-1"}>{jsonError}</p>
          )}
        </div>
        <PolicySimulationResult
          result={simulation.result}
          error={simulation.error}
          running={simulation.running}
        />
      </div>
    </FormModal>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

type EditModalProps = {
  policy: AccessPolicy;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
};

function EditAccessPolicyModal({
  policy,
  open,
  onOpenChange,
  onSaved,
}: EditModalProps) {
  const [name, setName] = useState(policy.name);
  const [description, setDescription] = useState(policy.description ?? "");
  const policyRequest = useApiCall<AccessPolicy>(
    `/ui/access-policies/${policy.id}`,
  );

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
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      icon={<PenSquare size={20} />}
      title={"Edit Access Policy"}
      description={"Change the policy's name or description."}
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
          <Label>Description</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={"Optional"}
          />
        </div>
      </div>
    </FormModal>
  );
}

// ── Delete Modal ──────────────────────────────────────────────────────────────

type DeleteModalProps = {
  policy: AccessPolicy;
  onClose: () => void;
  onDeleted: () => void;
};

// Shows who would lose access before the policy goes, from a dry run of its removal
function DeleteAccessPolicyModal({ policy, onClose, onDeleted }: Readonly<DeleteModalProps>) {
  const policyRequest = useApiCall<AccessPolicy>("/ui/access-policies");
  const simulation = usePolicySimulation();

  useEffect(() => {
    simulation.run({ remove: [policy.id] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policy.id]);

  const handleDelete = () => {
    const promise = policyRequest.del(undefined, `/${policy.id}`).then(() => {
      onDeleted();
      onClose();
    });
    notify({
      title: "Delete Access Policy",
      description: `Policy '${policy.name}' deleted.`,
      promise,
      loadingMessage: "Deleting...",
    });
  };

  return (
    <FormModal
      open={true}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
      maxWidthClass={"max-w-xl"}
      icon={<Trash2 size={20} />}
      title={`Delete '${policy.name}'?`}
      description={
        "The policy is deleted and the tenant's Rego is rebuilt. Sessions that already hold access keep it until they reconnect or are re-checked."
      }
      footer={
        <>
          <Button variant={"secondary"} onClick={onClose}>
            Cancel
          </Button>
          <Button variant={"danger"} onClick={handleDelete}>
            <Trash2 size={16} />
            Delete
          </Button>
        </>
      }
    >
      <div className={"px-8 pb-6"}>
        <PolicySimulationResult
          result={simulation.result}
          error={simulation.error}
          running={simulation.running}
        />
      </div>
    </FormModal>
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
  const [createOpen, setCreateOpen] = useState(false);
  const [editPolicy, setEditPolicy] = useState<AccessPolicy | null>(null);
  const [deletingPolicy, setDeletingPolicy] = useState<AccessPolicy | null>(null);

  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [{ id: "createdAt", desc: true }],
  );

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
              <p className={"text-xs text-nb-gray-400"}>
                {row.original.description}
              </p>
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
            tooltip={"Edit"}
          >
            <PenSquare size={14} />
          </Button>
          <Button
            variant={"danger-outline"}
            size={"sm"}
            onClick={() => setDeletingPolicy(row.original)}
            tooltip={"Delete"}
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
          onOpenChange={(v) => {
            if (!v) setEditPolicy(null);
          }}
          onSaved={() => mutate("/ui/access-policies")}
        />
      )}
      {deletingPolicy && (
        <DeleteAccessPolicyModal
          key={deletingPolicy.id}
          policy={deletingPolicy}
          onClose={() => setDeletingPolicy(null)}
          onDeleted={() => mutate("/ui/access-policies")}
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
