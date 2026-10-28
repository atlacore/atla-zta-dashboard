"use client";

import ActionTooltip from "@components/ActionTooltip";
import Badge from "@components/Badge";
import Button from "@components/Button";
import CheckboxField from "@components/CheckboxField";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import FormModal from "@components/modal/FormModal";
import { notify } from "@components/Notification";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import NoResults from "@components/ui/NoResults";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { useApiCall } from "@utils/api";
import dayjs from "dayjs";
import { Copy, KeySquare, Pencil, PlusCircle, Trash2 } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  SetupKey,
  SetupKeyCreateRequest,
  SetupKeyCreateResponse,
  SetupKeyState,
} from "@/interfaces/AtlaSetupKey";

const listURL = "/ui/setup-keys";

const stateBadges: Record<SetupKeyState, { label: string; variant: "green" | "gray" | "red" | "yellow" }> = {
  valid: { label: "Valid", variant: "green" },
  exhausted: { label: "Used up", variant: "gray" },
  expired: { label: "Expired", variant: "yellow" },
  revoked: { label: "Revoked", variant: "red" },
};

// Groups are typed as a comma-separated list; empty entries are dropped
const parseGroups = (value: string) =>
  value
    .split(",")
    .map((g) => g.trim())
    .filter((g) => g !== "");

// ── Create / edit modal ───────────────────────────────────────────────────────

type KeyModalProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
  // set to edit a key's name and groups; absent to create one
  editing?: SetupKey;
};

function SetupKeyModal({ open, onOpenChange, onSaved, editing }: Readonly<KeyModalProps>) {
  const [name, setName] = useState(editing?.name ?? "");
  const [groups, setGroups] = useState((editing?.autoGroups ?? []).join(", "));
  const [reusable, setReusable] = useState(false);
  const [usageLimit, setUsageLimit] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const createCall = useApiCall<SetupKeyCreateResponse>(listURL);
  const updateCall = useApiCall<SetupKey>(listURL);

  const close = () => {
    setName(editing?.name ?? "");
    setGroups((editing?.autoGroups ?? []).join(", "));
    setReusable(false);
    setUsageLimit("");
    setExpiresOn("");
    setRawKey(null);
    setCopied(false);
    onOpenChange(false);
  };

  const save = () => {
    if (!name.trim()) return;
    if (editing) {
      const promise = updateCall
        .patch({ name: name.trim(), autoGroups: parseGroups(groups) }, `/${editing.id}`)
        .then(() => {
          onSaved();
          close();
        });
      notify({ title: "Update setup key", description: "Setup key updated.", promise, loadingMessage: "Saving..." });
      return;
    }

    const body: SetupKeyCreateRequest = {
      name: name.trim(),
      reusable,
      autoGroups: parseGroups(groups),
    };
    if (reusable && usageLimit.trim() !== "") body.usageLimit = Number(usageLimit);
    // the key works through the whole chosen day
    if (expiresOn) body.expiresAt = dayjs(expiresOn).endOf("day").toISOString();

    const promise = createCall.post(body).then((res) => {
      setRawKey(res.key);
      onSaved();
    });
    notify({ title: "Create setup key", description: "Setup key created.", promise, loadingMessage: "Creating..." });
  };

  const copy = () => {
    if (!rawKey) return;
    navigator.clipboard.writeText(rawKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <FormModal
      open={open}
      onOpenChange={(v) => {
        if (!v) close();
      }}
      icon={<KeySquare size={20} />}
      title={rawKey ? "Setup key created" : editing ? "Edit setup key" : "Create setup key"}
      description={
        rawKey
          ? "Store the key somewhere safe."
          : "Enrolls devices without a login. They act as the key's service user, with its groups, and are approved at once."
      }
      footer={
        rawKey ? (
          <Button variant={"primary"} onClick={close}>
            Done
          </Button>
        ) : (
          <>
            <Button variant={"secondary"} onClick={close}>
              Cancel
            </Button>
            <Button variant={"primary"} onClick={save} disabled={!name.trim()}>
              {editing ? <Pencil size={16} /> : <PlusCircle size={16} />}
              {editing ? "Save" : "Create"}
            </Button>
          </>
        )
      }
    >
      {rawKey ? (
        <div className={"px-8 pb-6 flex flex-col gap-5"}>
          <p className={"text-sm text-nb-gray-300"}>Copy this key now — it will not be shown again.</p>
          <div
            className={
              "flex items-center gap-2 bg-nb-gray-900 border border-nb-gray-800 rounded-md px-3 py-2 font-mono text-xs break-all"
            }
          >
            <span className={"flex-1 select-all"}>{rawKey}</span>
            <ActionTooltip label={"Copy"}>
              <button onClick={copy} className={"text-nb-gray-400 hover:text-white transition-colors shrink-0"}>
                <Copy size={14} />
              </button>
            </ActionTooltip>
          </div>
          {copied && <p className={"text-xs text-green-400"}>Copied!</p>}
          <HelpText>
            On the device: <code className={"font-mono text-xs"}>ATLA_SETUP_KEY=… atla-client --device-id … --arn …</code>.
            After its first run the device uses its own token and no longer needs the key.
          </HelpText>
        </div>
      ) : (
        <div className={"px-8 pb-6 flex flex-col gap-5"}>
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={"e.g. ci-runners"} />
          </div>
          <div>
            <Label>Auto-groups</Label>
            <HelpText>
              Groups of the key&apos;s devices, matched by access policies. Comma-separated.
              {editing && " Changes apply to devices already enrolled."}
            </HelpText>
            <Input value={groups} onChange={(e) => setGroups(e.target.value)} placeholder={"e.g. servers, ci"} />
          </div>
          {!editing && (
            <>
              <CheckboxField
                label={"Reusable"}
                description={"Enroll several devices with the same key. Off: the key enrolls exactly one device."}
                checked={reusable}
                onChange={setReusable}
              />
              {reusable && (
                <div>
                  <Label>Usage limit</Label>
                  <HelpText>How many devices it may enroll. Empty or 0 means unlimited.</HelpText>
                  <Input
                    type={"number"}
                    min={0}
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value)}
                    placeholder={"Unlimited"}
                  />
                </div>
              )}
              <div>
                <Label>Expires</Label>
                <HelpText>Optional. After this day the key can no longer enroll; enrolled devices keep working.</HelpText>
                <Input
                  type={"date"}
                  value={expiresOn}
                  min={dayjs().format("YYYY-MM-DD")}
                  onChange={(e) => setExpiresOn(e.target.value)}
                />
              </div>
            </>
          )}
        </div>
      )}
    </FormModal>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────

type Props = {
  setupKeys?: SetupKey[];
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
};

export default function SetupKeysTable({ setupKeys, isLoading, headingTarget }: Readonly<Props>) {
  const { mutate } = useSWRConfig();
  const path = usePathname();
  const { permission } = usePermissions();
  const { confirm } = useDialog();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<SetupKey | undefined>();
  const keyRequest = useApiCall<SetupKey>(listURL);
  const refresh = () => mutate(listURL);

  const [sorting, setSorting] = useLocalStorage<SortingState>("netbird-table-sort" + path, [
    { id: "createdAt", desc: true },
  ]);

  const revoke = async (key: SetupKey) => {
    const choice = await confirm({
      title: `Revoke '${key.name}'?`,
      description:
        "The key can no longer enroll devices. Devices it already enrolled keep working: delete them, or block the key's service user, to cut them off.",
      confirmText: "Revoke",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!choice) return;
    const promise = keyRequest.del(undefined, `/${key.id}`).then(() => refresh());
    notify({
      title: "Revoke setup key",
      description: `Key '${key.name}' revoked.`,
      promise,
      loadingMessage: "Revoking...",
    });
  };

  const columns: ColumnDef<SetupKey>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableHeader column={column}>Name</DataTableHeader>,
      sortingFn: "text",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <KeySquare size={14} className="text-nb-gray-400 shrink-0" />
          <span className="font-medium text-sm">{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: "state",
      header: ({ column }) => <DataTableHeader column={column}>State</DataTableHeader>,
      cell: ({ row }) => {
        const badge = stateBadges[row.original.state];
        return (
          <Badge variant={badge.variant} size={"xs"}>
            {badge.label}
          </Badge>
        );
      },
    },
    {
      id: "usage",
      header: "Usage",
      cell: ({ row }) => {
        const k = row.original;
        // usageLimit 0 on a reusable key means unlimited
        const limit = k.reusable && k.usageLimit === 0 ? "∞" : String(k.usageLimit);
        return (
          <span className="text-sm text-nb-gray-300">
            {k.usedCount} / {limit}
            {!k.reusable && <span className="text-nb-gray-500"> · one-off</span>}
          </span>
        );
      },
    },
    {
      accessorKey: "autoGroups",
      header: "Groups",
      cell: ({ row }) =>
        row.original.autoGroups.length ? (
          <div className="flex flex-wrap gap-1">
            {row.original.autoGroups.map((g) => (
              <Badge key={g} variant={"gray"} size={"xs"}>
                {g}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-sm text-nb-gray-500">—</span>
        ),
    },
    {
      accessorKey: "expiresAt",
      header: ({ column }) => <DataTableHeader column={column}>Expires</DataTableHeader>,
      sortingFn: "datetime",
      cell: ({ row }) =>
        row.original.expiresAt ? (
          <span className="text-sm text-nb-gray-300">{dayjs(row.original.expiresAt).format("MMM D, YYYY")}</span>
        ) : (
          <span className="text-sm text-nb-gray-500">Never</span>
        ),
    },
    {
      accessorKey: "lastUsedAt",
      header: ({ column }) => <DataTableHeader column={column}>Last used</DataTableHeader>,
      sortingFn: "datetime",
      cell: ({ row }) =>
        row.original.lastUsedAt ? (
          <span className="text-sm text-nb-gray-300">{dayjs(row.original.lastUsedAt).format("MMM D, YYYY")}</span>
        ) : (
          <span className="text-sm text-nb-gray-500">Never</span>
        ),
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => <DataTableHeader column={column}>Created</DataTableHeader>,
      sortingFn: "datetime",
      cell: ({ row }) => (
        <span className="text-sm text-nb-gray-300">{dayjs(row.original.createdAt).format("MMM D, YYYY")}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end gap-2 pr-4">
          {permission.setup_keys?.update && (
            <Button variant={"secondary"} className={"!px-3"} onClick={() => setEditing(row.original)} tooltip={"Edit name and groups"}>
              <Pencil size={14} />
            </Button>
          )}
          {permission.setup_keys?.delete && row.original.state !== "revoked" && (
            <Button variant={"danger-outline"} className={"!px-3"} onClick={() => revoke(row.original)} tooltip={"Revoke key"}>
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <SetupKeyModal open={createOpen} onOpenChange={setCreateOpen} onSaved={refresh} />
      {editing && (
        <SetupKeyModal
          key={editing.id}
          open={true}
          editing={editing}
          onOpenChange={(v) => !v && setEditing(undefined)}
          onSaved={refresh}
        />
      )}
      <DataTable
        headingTarget={headingTarget}
        isLoading={isLoading}
        text={"Setup Keys"}
        sorting={sorting}
        setSorting={setSorting}
        columns={columns}
        data={setupKeys ?? []}
        searchPlaceholder={"Search by name..."}
        getStartedCard={
          <NoResults
            className={"py-4"}
            title={"No setup keys"}
            description={"Setup keys enroll servers and other headless devices without a user login."}
            icon={<KeySquare size={20} className={"text-nb-gray-300"} />}
          />
        }
        rightSide={() =>
          permission.setup_keys?.create ? (
            <Button variant={"primary"} onClick={() => setCreateOpen(true)}>
              <PlusCircle size={16} />
              Create Setup Key
            </Button>
          ) : null
        }
      >
        {(table) => (
          <>
            <DataTableRowsPerPage table={table} disabled={!setupKeys?.length} />
            <DataTableRefreshButton isDisabled={!setupKeys?.length} onClick={refresh} />
          </>
        )}
      </DataTable>
    </>
  );
}
