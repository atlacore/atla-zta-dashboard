"use client";

import Button from "@components/Button";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import { notify } from "@components/Notification";
import FormModal from "@components/modal/FormModal";
import HelpText from "@components/HelpText";
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
import useFetchApi, { useApiCall } from "@utils/api";
import dayjs from "dayjs";
import {
  BoxIcon,
  PenSquare,
  PlusCircle,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { usePermissions } from "@/contexts/PermissionsProvider";
import CopyToClipboardText from "@components/CopyToClipboardText";
import { buildResourceArn } from "@/utils/arn";
import { DNSZone } from "@/interfaces/DNSZone";
import {
  DatabasePlugin,
  DatabasePrivileges,
  DatabaseSSLMode,
  Resource,
  ResourceConfig,
  ResourceCreateRequest,
  ResourceCredProfile,
  ResourceKind,
  ResourceUpdateRequest,
} from "@/interfaces/Resource";
import CredentialCAsModal from "@/modules/resources/CredentialCAsModal";

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

const DATABASE_PLUGIN_OPTIONS: { value: DatabasePlugin; label: string }[] = [
  { value: "postgres", label: "PostgreSQL" },
  { value: "mysql", label: "MySQL" },
];

const DATABASE_PRIVILEGE_OPTIONS: {
  value: DatabasePrivileges;
  label: string;
}[] = [
  { value: "readonly", label: "Read only (SELECT)" },
  {
    value: "readwrite",
    label: "Read and write (SELECT, INSERT, UPDATE, DELETE)",
  },
];

const SSL_MODE_OPTIONS: DatabaseSSLMode[] = [
  "require",
  "verify-full",
  "disable",
];

// Logins are POSIX names, the same check the control plane runs
const SSH_PRINCIPAL_PATTERN = /^[a-z_][a-z0-9_.-]{0,31}$/;
const DATABASE_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]{0,62}$/;

const parsePrincipals = (value: string) =>
  value
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

// ── Create Modal ──────────────────────────────────────────────────────────────

type CreateResourceModalProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
};

function CreateResourceModal({
  open,
  onOpenChange,
  onCreated,
}: CreateResourceModalProps) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<ResourceKind>("server");
  const [credProfile, setCredProfile] = useState<ResourceCredProfile>("none");
  const [region, setRegion] = useState("");
  const [description, setDescription] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("");
  const [dnsZoneId, setDnsZoneId] = useState("");
  const [dnsLabel, setDnsLabel] = useState("");
  const [sshPrincipals, setSSHPrincipals] = useState("");
  const [dbPlugin, setDbPlugin] = useState<DatabasePlugin>("postgres");
  const [dbName, setDbName] = useState("");
  const [dbUsername, setDbUsername] = useState("");
  const [dbPassword, setDbPassword] = useState("");
  const [dbPrivileges, setDbPrivileges] =
    useState<DatabasePrivileges>("readonly");
  const [dbSSLMode, setDbSSLMode] = useState<DatabaseSSLMode>("require");
  const resourceRequest = useApiCall<Resource>("/ui/resources");
  const { data: zones } = useFetchApi<DNSZone[]>("/ui/dns/zones");
  const activeZones = useMemo(
    () => zones?.filter((z) => z.isActive) ?? [],
    [zones],
  );

  const labelPreview = useMemo(() => {
    const source = dnsLabel.trim() || name;
    return source
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }, [dnsLabel, name]);
  const selectedZone = activeZones.find((z) => z.id === dnsZoneId);

  const handleCreate = () => {
    const body: ResourceCreateRequest = {
      name: name.trim(),
      kind,
      credProfile,
      region: region.trim(),
      description: description.trim() || undefined,
    };
    // config is sealed Vault storage - only send it if the operator filled something in
    const config: ResourceConfig = {
      ...(host.trim() && { host: host.trim() }),
      ...(port.trim() && { port: Number(port) }),
    };
    if (credProfile === "ssh_cert") {
      config.ssh_principals = parsePrincipals(sshPrincipals);
    }
    if (credProfile === "db_creds") {
      config.db = {
        plugin: dbPlugin,
        database: dbName.trim(),
        username: dbUsername.trim(),
        password: dbPassword,
        privileges: dbPrivileges,
        ...(dbPlugin === "postgres" && { ssl_mode: dbSSLMode }),
      };
    }
    if (Object.keys(config).length > 0) {
      body.config = config;
    }
    if (host.trim()) {
      body.dnsZoneId = dnsZoneId || undefined;
      body.dnsLabel = dnsLabel.trim() || undefined;
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
    setDnsZoneId("");
    setDnsLabel("");
    setSSHPrincipals("");
    setDbPlugin("postgres");
    setDbName("");
    setDbUsername("");
    setDbPassword("");
    setDbPrivileges("readonly");
    setDbSSLMode("require");
    onOpenChange(false);
  };

  const principals = parsePrincipals(sshPrincipals);
  const principalsValid =
    principals.length > 0 &&
    principals.every((p) => SSH_PRINCIPAL_PATTERN.test(p));
  const databaseValid =
    host.trim() !== "" &&
    port.trim() !== "" &&
    DATABASE_NAME_PATTERN.test(dbName.trim()) &&
    dbUsername.trim() !== "" &&
    dbPassword !== "";
  const credentialsValid =
    (credProfile !== "ssh_cert" || principalsValid) &&
    (credProfile !== "db_creds" || databaseValid);
  const isValid = name.trim() && region.trim() && credentialsValid;

  return (
    <FormModal
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
      icon={<BoxIcon size={20} />}
      title={"Create Resource"}
      description={
        "Register a server, database, web app or cluster to protect."
      }
      footer={
        <>
          <Button variant={"secondary"} onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant={"primary"}
            onClick={handleCreate}
            disabled={!isValid}
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
            placeholder={"e.g. prod-db"}
          />
        </div>
        <div>
          <Label>Kind</Label>
          <Select
            value={kind}
            onValueChange={(v) => setKind(v as ResourceKind)}
          >
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
          <Select
            value={credProfile}
            onValueChange={(v) => setCredProfile(v as ResourceCredProfile)}
          >
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

        {credProfile === "ssh_cert" && (
          <div>
            <Label>SSH logins</Label>
            <Input
              value={sshPrincipals}
              onChange={(e) => setSSHPrincipals(e.target.value)}
              placeholder={"e.g. ubuntu, deploy"}
            />
            <HelpText>
              Comma-separated logins every granted user may use. The server must
              trust the tenant&apos;s SSH CA, see Server Trust.
            </HelpText>
          </div>
        )}

        {credProfile === "mtls_cert" && (
          <HelpText>
            Certificates are issued by the tenant&apos;s client CA with the
            user&apos;s ID as CN. The service must trust that CA, see Server
            Trust.
          </HelpText>
        )}

        {credProfile === "db_creds" && (
          <div className={"flex flex-col gap-4"}>
            <HelpText>
              Vault logs in with this admin account to create a database user
              per session, so host and port are required and must be reachable
              from Vault. The account is stored sealed in Vault and never shown
              again.
            </HelpText>
            <div className={"grid grid-cols-2 gap-4"}>
              <div>
                <Label>Database engine</Label>
                <Select
                  value={dbPlugin}
                  onValueChange={(v) => setDbPlugin(v as DatabasePlugin)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATABASE_PLUGIN_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Database name</Label>
                <Input
                  value={dbName}
                  onChange={(e) => setDbName(e.target.value)}
                  placeholder={"e.g. billing"}
                />
              </div>
              <div>
                <Label>Admin username</Label>
                <Input
                  value={dbUsername}
                  onChange={(e) => setDbUsername(e.target.value)}
                  placeholder={"e.g. vault_admin"}
                />
              </div>
              <div>
                <Label>Admin password</Label>
                <Input
                  value={dbPassword}
                  onChange={(e) => setDbPassword(e.target.value)}
                  type={"password"}
                />
              </div>
              <div className={dbPlugin === "postgres" ? "" : "col-span-2"}>
                <Label>Privileges</Label>
                <Select
                  value={dbPrivileges}
                  onValueChange={(v) =>
                    setDbPrivileges(v as DatabasePrivileges)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATABASE_PRIVILEGE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {dbPlugin === "postgres" && (
                <div>
                  <Label>SSL mode</Label>
                  <Select
                    value={dbSSLMode}
                    onValueChange={(v) => setDbSSLMode(v as DatabaseSSLMode)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SSL_MODE_OPTIONS.map((mode) => (
                        <SelectItem key={mode} value={mode}>
                          {mode}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        )}

        {host.trim() && (
          <div className={"grid grid-cols-2 gap-4"}>
            <div>
              <Label>DNS zone</Label>
              <Select
                value={dnsZoneId || "__auto__"}
                onValueChange={(v) => setDnsZoneId(v === "__auto__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={"__auto__"}>Auto-detect</SelectItem>
                  {activeZones.map((z) => (
                    <SelectItem key={z.id} value={z.id}>
                      {z.domain}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>DNS label</Label>
              <Input
                value={dnsLabel}
                onChange={(e) => setDnsLabel(e.target.value)}
                placeholder={"Default: resource name"}
              />
            </div>
            <div className={"col-span-2"}>
              <HelpText>
                Record preview:{" "}
                <span className={"font-mono"}>
                  {labelPreview || "?"}.
                  {selectedZone?.domain ?? "<auto-detected zone>"}
                </span>
                {!selectedZone && activeZones.length !== 1 && (
                  <>
                    {" "}
                    —{" "}
                    {activeZones.length === 0
                      ? "no active zones, no record will be created"
                      : "multiple active zones, pick one or none will be created"}
                  </>
                )}
              </HelpText>
            </div>
          </div>
        )}
      </div>
    </FormModal>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

type EditResourceModalProps = {
  resource: Resource;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
};

function EditResourceModal({
  resource,
  open,
  onOpenChange,
  onSaved,
}: EditResourceModalProps) {
  const [name, setName] = useState(resource.name);
  const [region, setRegion] = useState(resource.region);
  const [description, setDescription] = useState(resource.description ?? "");
  const [credProfile, setCredProfile] = useState<ResourceCredProfile>(
    resource.credProfile,
  );
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
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      icon={<PenSquare size={20} />}
      title={"Edit Resource"}
      description={"Change the resource's name, region or credential profile."}
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
          <Label>Region</Label>
          <Input value={region} onChange={(e) => setRegion(e.target.value)} />
        </div>
        <div>
          <Label>Description</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <Label>Credential profile</Label>
          <Select
            value={credProfile}
            onValueChange={(v) => setCredProfile(v as ResourceCredProfile)}
          >
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
          {credProfile !== resource.credProfile &&
            (credProfile === "ssh_cert" || credProfile === "db_creds") && (
              <HelpText>
                The config is set at creation: switching works only if it
                already has{" "}
                {credProfile === "ssh_cert"
                  ? "SSH logins"
                  : "the database admin account"}
                . Otherwise create a new resource.
              </HelpText>
            )}
        </div>
      </div>
    </FormModal>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────

type Props = {
  resources?: Resource[];
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
};

export default function ResourcesTable({
  resources,
  isLoading,
  headingTarget,
}: Readonly<Props>) {
  const { mutate } = useSWRConfig();
  const path = usePathname();
  const { permission } = usePermissions();
  const { confirm } = useDialog();
  const [createOpen, setCreateOpen] = useState(false);
  const [editResource, setEditResource] = useState<Resource | null>(null);
  const [trustOpen, setTrustOpen] = useState(false);
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

    const promise = resourceRequest
      .del(undefined, `/${resource.id}`)
      .then(() => mutate("/ui/resources"));
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
      header: ({ column }) => (
        <DataTableHeader column={column}>Name</DataTableHeader>
      ),
      sortingFn: "text",
      cell: ({ row }) => (
        <div className={"flex items-center gap-2"}>
          <BoxIcon size={14} className={"text-nb-gray-400 shrink-0"} />
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
      accessorKey: "kind",
      header: ({ column }) => (
        <DataTableHeader column={column}>Kind</DataTableHeader>
      ),
      sortingFn: "text",
      cell: ({ row }) => (
        <span className={"font-mono text-xs bg-nb-gray-900 rounded px-2 py-1"}>
          {row.original.kind}
        </span>
      ),
    },
    {
      accessorKey: "credProfile",
      header: ({ column }) => (
        <DataTableHeader column={column}>Cred Profile</DataTableHeader>
      ),
      sortingFn: "text",
      cell: ({ row }) => (
        <span className={"text-sm text-nb-gray-300"}>
          {CRED_PROFILE_OPTIONS.find(
            (o) => o.value === row.original.credProfile,
          )?.label ?? row.original.credProfile}
        </span>
      ),
    },
    {
      accessorKey: "region",
      header: ({ column }) => (
        <DataTableHeader column={column}>Region</DataTableHeader>
      ),
      sortingFn: "text",
      cell: ({ row }) => (
        <span className={"text-sm text-nb-gray-300"}>
          {row.original.region}
        </span>
      ),
    },
    {
      accessorKey: "hostname",
      header: ({ column }) => (
        <DataTableHeader column={column}>Hostname</DataTableHeader>
      ),
      sortingFn: "text",
      cell: ({ row }) =>
        row.original.hostname ? (
          <span className={"font-mono text-xs text-nb-gray-300"}>
            {row.original.hostname.replace(/\.$/, "")}
          </span>
        ) : (
          <span className={"text-sm text-nb-gray-500"}>—</span>
        ),
    },
    {
      id: "arn",
      header: ({ column }) => (
        <DataTableHeader column={column}>ARN</DataTableHeader>
      ),
      cell: ({ row }) => {
        const arn = buildResourceArn(row.original);
        return (
          <CopyToClipboardText
            message={arn}
            alwaysShowIcon={true}
            className={"font-mono text-xs text-nb-gray-400 max-w-[300px]"}
          >
            <span title={arn}>{arn}</span>
          </CopyToClipboardText>
        );
      },
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
        <div className={"flex justify-end pr-4 gap-2"}>
          <Button
            variant={"default-outline"}
            size={"sm"}
            onClick={() => setEditResource(row.original)}
            tooltip={"Edit"}
          >
            <PenSquare size={14} />
          </Button>
          <Button
            variant={"danger-outline"}
            size={"sm"}
            onClick={() => deleteResource(row.original)}
            tooltip={"Delete"}
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
      <CredentialCAsModal open={trustOpen} onOpenChange={setTrustOpen} />
      {editResource && (
        <EditResourceModal
          resource={editResource}
          open={true}
          onOpenChange={(v) => {
            if (!v) setEditResource(null);
          }}
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
        rightSide={() => (
          <div className={"flex gap-3"}>
            <Button variant={"secondary"} onClick={() => setTrustOpen(true)}>
              <ShieldCheck size={16} />
              Server Trust
            </Button>
            {permission.setup_keys?.create && (
              <Button variant={"primary"} onClick={() => setCreateOpen(true)}>
                <PlusCircle size={16} />
                Add Resource
              </Button>
            )}
          </div>
        )}
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
