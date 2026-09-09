"use client";

import Button from "@components/Button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/Dialog";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { notify } from "@components/Notification";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import { Textarea } from "@components/Textarea";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { useApiCall } from "@utils/api";
import dayjs from "dayjs";
import { FileCode, HistoryIcon, PenSquare, PlusCircle, Trash2 } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { RawPolicy, UpsertRawPolicyRequest } from "@/interfaces/RawPolicy";
import PolicyRevisionsModal from "@/modules/policies/PolicyRevisionsModal";

const DEFAULT_BODY = `package tenant

# Tenant Rego is a boolean hook: base pdp.DefaultPolicyRego evaluates it
# first and injects the result into input.ctx.ext_allow. It can only ADD
# grants — the base safety guards (subject/tenant/region/posture) still apply.
allow if {
	input.subject != ""
}
`;

// ── Editor modal (shared between create and edit) ──────────────────────────────

type EditorModalProps = {
  policy?: RawPolicy;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
};

function PolicyEditorModal({ policy, open, onOpenChange, onSaved }: EditorModalProps) {
  const isEdit = !!policy;
  const [name, setName] = useState(policy?.name ?? "");
  const [body, setBody] = useState(policy?.body ?? DEFAULT_BODY);
  const policyRequest = useApiCall<RawPolicy>("/ui/policies");

  const handleClose = () => {
    setName(policy?.name ?? "");
    setBody(policy?.body ?? DEFAULT_BODY);
    onOpenChange(false);
  };

  const handleSave = () => {
    const req: UpsertRawPolicyRequest = { name: name.trim(), body };
    const promise = policyRequest.post(req).then(() => {
      onSaved();
      handleClose();
    });
    notify({
      title: isEdit ? "Update Policy" : "Create Policy",
      description: isEdit
        ? `New revision of '${name.trim()}' saved.`
        : `Policy '${name.trim()}' created.`,
      promise,
      loadingMessage: "Validating and saving Rego...",
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className={"max-w-2xl"}>
        <DialogHeader>
          <DialogTitle>
            <div className={"flex items-center gap-2"}>
              <FileCode size={16} />
              {isEdit ? `Edit '${policy.name}'` : "Create Policy"}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className={"px-8 pb-4 flex flex-col gap-4"}>
          <div>
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={"e.g. tenant-overrides"}
              disabled={isEdit}
            />
          </div>
          <div>
            <Label>Rego body</Label>
            <HelpText>
              Saved as a new revision if the content changed (identical content
              is a no-op). Validated server-side before it is persisted.
            </HelpText>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className={"font-mono text-xs min-h-[280px]"}
              rows={16}
              spellCheck={false}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant={"secondary"} onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant={"primary"}
            onClick={handleSave}
            disabled={!name.trim() || !body.trim()}
          >
            {isEdit ? "Save new revision" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────

type Props = {
  policies?: RawPolicy[];
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
};

export default function PoliciesTable({
  policies,
  isLoading,
  headingTarget,
}: Readonly<Props>) {
  const { mutate } = useSWRConfig();
  const path = usePathname();
  const { permission } = usePermissions();
  const { confirm } = useDialog();
  const [createOpen, setCreateOpen] = useState(false);
  const [editPolicy, setEditPolicy] = useState<RawPolicy | null>(null);
  const [revisionsOf, setRevisionsOf] = useState<string | null>(null);
  const revisionRequest = useApiCall<{ status: string }>("/ui/policies/revisions");

  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [{ id: "updated_at", desc: true }],
  );

  const refresh = () => mutate("/ui/policies");

  const deletePolicy = async (policy: RawPolicy) => {
    const choice = await confirm({
      title: `Delete latest revision of '${policy.name}'?`,
      description: `Removes revision ${policy.revision}. Older revisions (if any) stay — open "Revisions" to remove all of them.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!choice) return;

    const promise = revisionRequest.del(undefined, `/${policy.id}`).then(refresh);
    notify({
      title: "Delete Revision",
      description: `Revision ${policy.revision} of '${policy.name}' deleted.`,
      promise,
      loadingMessage: "Deleting...",
    });
  };

  const columns: ColumnDef<RawPolicy>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableHeader column={column}>Name</DataTableHeader>
      ),
      sortingFn: "text",
      cell: ({ row }) => (
        <div className={"flex items-center gap-2"}>
          <FileCode size={14} className={"text-nb-gray-400 shrink-0"} />
          <span className={"font-medium text-sm"}>{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: "revision",
      header: ({ column }) => (
        <DataTableHeader column={column}>Revision</DataTableHeader>
      ),
      cell: ({ row }) => (
        <span className={"text-sm text-nb-gray-300"}>
          #{row.original.revision}
        </span>
      ),
    },
    {
      accessorKey: "hash",
      header: ({ column }) => (
        <DataTableHeader column={column}>Hash</DataTableHeader>
      ),
      cell: ({ row }) => (
        <span className={"font-mono text-xs text-nb-gray-400"}>
          {row.original.hash.slice(0, 12)}
        </span>
      ),
    },
    {
      accessorKey: "updated_at",
      header: ({ column }) => (
        <DataTableHeader column={column}>Updated</DataTableHeader>
      ),
      sortingFn: "datetime",
      cell: ({ row }) => (
        <span className={"text-sm text-nb-gray-300"}>
          {dayjs(row.original.updated_at).format("MMM D, YYYY HH:mm")}
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
            onClick={() => setRevisionsOf(row.original.name)}
          >
            <HistoryIcon size={14} />
          </Button>
          <Button
            variant={"default-outline"}
            size={"sm"}
            onClick={() => setEditPolicy(row.original)}
            disabled={!permission.policies?.update}
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
      <PolicyEditorModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={refresh}
      />
      {editPolicy && (
        <PolicyEditorModal
          policy={editPolicy}
          open={true}
          onOpenChange={(v) => !v && setEditPolicy(null)}
          onSaved={refresh}
        />
      )}
      {revisionsOf && (
        <PolicyRevisionsModal
          name={revisionsOf}
          open={true}
          onOpenChange={(v) => !v && setRevisionsOf(null)}
        />
      )}
      <DataTable
        headingTarget={headingTarget}
        isLoading={isLoading}
        text={"Policies"}
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
            <DataTableRefreshButton isDisabled={!policies?.length} onClick={refresh} />
          </>
        )}
      </DataTable>
    </>
  );
}
