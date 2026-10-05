"use client";

import Button from "@components/Button";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import { notify } from "@components/Notification";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { cn } from "@utils/helpers";
import { useApiCall } from "@utils/api";
import dayjs from "dayjs";
import { Copy, PlusCircle, Settings2, Trash2 } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import { idpIcon } from "@/assets/icons/IdentityProviderIcons";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  IdentityProvider,
  IdentityProviderCreateRequest,
  IdentityProviderType,
  IdentityProviderUpdateRequest,
  LDAP_PORTS,
  LDAP_TLS_MODES,
  LDAPTLSMode,
  providerIconType,
} from "@/interfaces/IdentityProvider";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/Dialog";
import { Label } from "@components/Label";
import { Input } from "@components/Input";
import { ToggleSwitch } from "@components/ToggleSwitch";
import { SegmentedTabs } from "@components/SegmentedTabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/Select";
import { useDialog } from "@/contexts/DialogProvider";

const DEFAULT_SCOPE = "openid profile email groups offline_access";
const DEFAULT_GROUPS_CLAIM = "groups";
const DEFAULT_LDAP_TLS_MODE: LDAPTLSMode = "starttls";
const DEFAULT_LDAP_EMAIL_ATTR = "mail";
const DEFAULT_LDAP_USERNAME_ATTR = "sAMAccountName";

// ── Copy field ───────────────────────────────────────────────────────────────

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className={"flex flex-col gap-2"}>
      <Label>{label}</Label>
      <Input
        readOnly
        value={value}
        className={"font-mono text-xs"}
        customSuffix={
          <button
            type={"button"}
            onClick={handleCopy}
            className={"text-nb-gray-400 hover:text-white transition-colors"}
          >
            <Copy size={14} />
          </button>
        }
      />
      {copied && <p className={"text-xs text-green-400"}>Copied!</p>}
    </div>
  );
}

// ── Create Modal ─────────────────────────────────────────────────────────────

type CreateModalProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
};

function CreateIdentityProviderModal({ open, onOpenChange, onCreated }: CreateModalProps) {
  const providerRequest = useApiCall<IdentityProvider>("/ui/identity-providers");
  const [type, setType] = useState<IdentityProviderType>("oidc");
  const [name, setName] = useState("");
  const [issuer, setIssuer] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [ldapHost, setLdapHost] = useState("");
  const [ldapPort, setLdapPort] = useState<number>(389);
  const [ldapTlsMode, setLdapTlsMode] = useState<LDAPTLSMode>(DEFAULT_LDAP_TLS_MODE);
  const [ldapBindDn, setLdapBindDn] = useState("");
  const [ldapBindPassword, setLdapBindPassword] = useState("");
  const [ldapBaseDn, setLdapBaseDn] = useState("");
  const [ldapUserFilter, setLdapUserFilter] = useState("");
  const [ldapGroupBaseDn, setLdapGroupBaseDn] = useState("");
  const [ldapGroupFilter, setLdapGroupFilter] = useState("");
  const [autoProvision, setAutoProvision] = useState(false);
  const [created, setCreated] = useState<IdentityProvider | null>(null);
  const [error, setError] = useState("");

  const canSubmit =
    type === "ldap"
      ? !!(name.trim() && ldapHost.trim() && ldapBindDn.trim() && ldapBindPassword.trim() &&
          ldapBaseDn.trim() && ldapUserFilter.trim())
      : !!(name.trim() && issuer.trim() && clientId.trim() && clientSecret.trim());

  const handleCreate = () => {
    if (!canSubmit) return;
    setError("");
    const req: IdentityProviderCreateRequest =
      type === "ldap"
        ? {
            type: "ldap",
            name: name.trim(),
            ldapHost: ldapHost.trim(),
            ldapPort,
            ldapTlsMode,
            ldapBindDn: ldapBindDn.trim(),
            ldapBindPassword: ldapBindPassword.trim(),
            ldapBaseDn: ldapBaseDn.trim(),
            ldapUserFilter: ldapUserFilter.trim(),
            ldapGroupBaseDn: ldapGroupBaseDn.trim() || undefined,
            ldapGroupFilter: ldapGroupFilter.trim() || undefined,
            ldapEmailAttr: DEFAULT_LDAP_EMAIL_ATTR,
            ldapUsernameAttr: DEFAULT_LDAP_USERNAME_ATTR,
            autoProvision,
          }
        : {
            type: "oidc",
            name: name.trim(),
            issuer: issuer.trim(),
            clientId: clientId.trim(),
            clientSecret: clientSecret.trim(),
            scope: DEFAULT_SCOPE,
            groupsClaim: DEFAULT_GROUPS_CLAIM,
            autoProvision,
          };
    const promise = providerRequest.post(req).then((res) => {
      setCreated(res);
      onCreated();
      return res;
    });
    promise.catch((err) => setError(err?.message ?? "Failed to create connection"));
    notify({
      title: "Add Identity Provider",
      description: type === "ldap" ? "AD/LDAP connection successfully created." : "OIDC connection successfully created.",
      promise,
      loadingMessage: type === "ldap" ? "Binding to the directory..." : "Running discovery against the issuer...",
    });
  };

  const handleClose = () => {
    setType("oidc");
    setName("");
    setIssuer("");
    setClientId("");
    setClientSecret("");
    setLdapHost("");
    setLdapPort(389);
    setLdapTlsMode(DEFAULT_LDAP_TLS_MODE);
    setLdapBindDn("");
    setLdapBindPassword("");
    setLdapBaseDn("");
    setLdapUserFilter("");
    setLdapGroupBaseDn("");
    setLdapGroupFilter("");
    setAutoProvision(false);
    setCreated(null);
    setError("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className={"max-w-lg"}>
        <DialogHeader>
          <DialogTitle>
            <div className={"flex items-center gap-2"}>
              {created ? idpIcon(providerIconType(created)) : <Settings2 size={16} />}
              {created ? "Connection Created" : "Add Identity Provider"}
            </div>
          </DialogTitle>
        </DialogHeader>

        {!created ? (
          <>
            <div className={"px-8 pb-4 flex flex-col gap-4"}>
              <SegmentedTabs value={type} onChange={(v) => setType(v as IdentityProviderType)}>
                <SegmentedTabs.List>
                  <SegmentedTabs.Trigger value={"oidc"}>OIDC</SegmentedTabs.Trigger>
                  <SegmentedTabs.Trigger value={"ldap"}>Active Directory / LDAP</SegmentedTabs.Trigger>
                </SegmentedTabs.List>
              </SegmentedTabs>
              <div className={"flex flex-col gap-2"}>
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={type === "ldap" ? "e.g. Corporate AD" : "e.g. Okta"}
                  autoComplete={"off"}
                />
              </div>

              {type === "oidc" ? (
                <>
                  <div className={"flex flex-col gap-2"}>
                    <Label>Issuer URL</Label>
                    <Input
                      value={issuer}
                      onChange={(e) => setIssuer(e.target.value)}
                      placeholder={"https://example.okta.com"}
                      autoComplete={"off"}
                    />
                  </div>
                  <div className={"flex flex-col gap-2"}>
                    <Label>Client ID</Label>
                    <Input
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      autoComplete={"off"}
                    />
                  </div>
                  <div className={"flex flex-col gap-2"}>
                    <Label>Client Secret</Label>
                    <Input
                      type={"password"}
                      showPasswordToggle
                      autoComplete={"new-password"}
                      value={clientSecret}
                      onChange={(e) => setClientSecret(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className={"flex gap-4"}>
                    <div className={"flex flex-col gap-2 flex-1"}>
                      <Label>Host</Label>
                      <Input
                        value={ldapHost}
                        onChange={(e) => setLdapHost(e.target.value)}
                        placeholder={"ad.corp.example.com"}
                        autoComplete={"off"}
                      />
                    </div>
                    <div className={"flex flex-col gap-2 w-32"}>
                      <Label>Port</Label>
                      <Select value={String(ldapPort)} onValueChange={(v) => setLdapPort(Number(v))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {LDAP_PORTS.map((p) => (
                            <SelectItem key={p} value={String(p)}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className={"flex flex-col gap-2"}>
                    <Label>Transport</Label>
                    <Select value={ldapTlsMode} onValueChange={(v) => setLdapTlsMode(v as LDAPTLSMode)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LDAP_TLS_MODES.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className={"flex flex-col gap-2"}>
                    <Label>Bind DN</Label>
                    <Input
                      value={ldapBindDn}
                      onChange={(e) => setLdapBindDn(e.target.value)}
                      placeholder={"CN=svc-atla,OU=Service Accounts,DC=corp,DC=example,DC=com"}
                      autoComplete={"off"}
                    />
                  </div>
                  <div className={"flex flex-col gap-2"}>
                    <Label>Bind Password</Label>
                    <Input
                      type={"password"}
                      showPasswordToggle
                      autoComplete={"new-password"}
                      value={ldapBindPassword}
                      onChange={(e) => setLdapBindPassword(e.target.value)}
                    />
                  </div>
                  <div className={"flex flex-col gap-2"}>
                    <Label>Base DN</Label>
                    <Input
                      value={ldapBaseDn}
                      onChange={(e) => setLdapBaseDn(e.target.value)}
                      placeholder={"DC=corp,DC=example,DC=com"}
                      autoComplete={"off"}
                    />
                  </div>
                  <div className={"flex flex-col gap-2"}>
                    <Label>User Filter</Label>
                    <Input
                      value={ldapUserFilter}
                      onChange={(e) => setLdapUserFilter(e.target.value)}
                      placeholder={"(sAMAccountName=%s)"}
                      autoComplete={"off"}
                      className={"font-mono text-xs"}
                    />
                  </div>
                  <div className={"flex flex-col gap-2"}>
                    <Label>Group Base DN (optional)</Label>
                    <Input
                      value={ldapGroupBaseDn}
                      onChange={(e) => setLdapGroupBaseDn(e.target.value)}
                      placeholder={"defaults to Base DN"}
                      autoComplete={"off"}
                    />
                  </div>
                  <div className={"flex flex-col gap-2"}>
                    <Label>Group Filter (optional)</Label>
                    <Input
                      value={ldapGroupFilter}
                      onChange={(e) => setLdapGroupFilter(e.target.value)}
                      placeholder={"(&(objectClass=group)(member=%s))"}
                      autoComplete={"off"}
                      className={"font-mono text-xs"}
                    />
                  </div>
                </>
              )}

              <div className={"flex items-center justify-between"}>
                <div>
                  <Label>Auto-provision users</Label>
                  <p className={"text-xs text-nb-gray-400"}>
                    Create a new user on first login instead of requiring one
                    to already exist.
                  </p>
                </div>
                <ToggleSwitch
                  checked={autoProvision}
                  onCheckedChange={setAutoProvision}
                />
              </div>
              {error && <p className={"text-xs text-red-400"}>{error}</p>}
            </div>
            <DialogFooter>
              <Button variant={"secondary"} onClick={handleClose}>Cancel</Button>
              <Button variant={"primary"} onClick={handleCreate} disabled={!canSubmit}>
                <PlusCircle size={16} />
                Create
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className={"px-8 pb-4 flex flex-col gap-4"}>
              {created.type === "ldap" ? (
                <p className={"text-sm text-nb-gray-300"}>
                  Share the dashboard login link with your users — they&apos;ll
                  sign in with their AD username and password.
                </p>
              ) : (
                <p className={"text-sm text-nb-gray-300"}>
                  Paste the redirect URI into your IdP&apos;s app registration,
                  then share the dashboard login link with your users.
                </p>
              )}
              {created.type === "oidc" && (
                <CopyField label={"Redirect URI"} value={created.redirectUri ?? ""} />
              )}
              <CopyField label={"Dashboard Login Link"} value={created.dashboardLoginUrl} />
              <CopyField label={"Direct Login URL"} value={created.loginUrl} />
            </div>
            <DialogFooter>
              <Button variant={"primary"} onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Modal ───────────────────────────────────────────────────────────────

type EditModalProps = {
  provider: IdentityProvider | null;
  onOpenChange: (v: boolean) => void;
  onUpdated: () => void;
};

function EditIdentityProviderModal({ provider, onOpenChange, onUpdated }: EditModalProps) {
  const providerRequest = useApiCall<IdentityProvider>("/ui/identity-providers");
  const [name, setName] = useState(provider?.name ?? "");
  const [clientSecret, setClientSecret] = useState("");
  const [ldapHost, setLdapHost] = useState(provider?.ldapHost ?? "");
  const [ldapBindDn, setLdapBindDn] = useState(provider?.ldapBindDn ?? "");
  const [ldapBindPassword, setLdapBindPassword] = useState("");
  const [ldapBaseDn, setLdapBaseDn] = useState(provider?.ldapBaseDn ?? "");
  const [ldapUserFilter, setLdapUserFilter] = useState(provider?.ldapUserFilter ?? "");
  const [autoProvision, setAutoProvision] = useState(provider?.autoProvision ?? false);
  const [isActive, setIsActive] = useState(provider?.isActive ?? true);

  // Re-seed local state whenever a different row is opened.
  React.useEffect(() => {
    if (!provider) return;
    setName(provider.name);
    setClientSecret("");
    setLdapHost(provider.ldapHost ?? "");
    setLdapBindDn(provider.ldapBindDn ?? "");
    setLdapBindPassword("");
    setLdapBaseDn(provider.ldapBaseDn ?? "");
    setLdapUserFilter(provider.ldapUserFilter ?? "");
    setAutoProvision(provider.autoProvision);
    setIsActive(provider.isActive);
  }, [provider]);

  if (!provider) return null;
  const isLdap = provider.type === "ldap";

  const handleSave = () => {
    const req: IdentityProviderUpdateRequest = {
      name: name.trim(),
      autoProvision,
      isActive,
      ...(isLdap
        ? {
            ldapHost: ldapHost.trim(),
            ldapBindDn: ldapBindDn.trim(),
            ldapBaseDn: ldapBaseDn.trim(),
            ldapUserFilter: ldapUserFilter.trim(),
            ...(ldapBindPassword.trim() ? { ldapBindPassword: ldapBindPassword.trim() } : {}),
          }
        : clientSecret.trim()
          ? { clientSecret: clientSecret.trim() }
          : {}),
    };
    const promise = providerRequest.put(req, `/${provider.id}`).then(() => onUpdated());
    notify({
      title: "Update Identity Provider",
      description: "Connection successfully updated.",
      promise,
      loadingMessage: "Saving...",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={!!provider} onOpenChange={onOpenChange}>
      <DialogContent className={"max-w-lg"}>
        <DialogHeader>
          <DialogTitle>
            <div className={"flex items-center gap-2"}>
              {idpIcon(providerIconType(provider))}
              Edit {provider.name}
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className={"px-8 pb-4 flex flex-col gap-4"}>
          <div className={"flex flex-col gap-2"}>
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete={"off"}
            />
          </div>
          {isLdap ? (
            <>
              <div className={"flex flex-col gap-2"}>
                <Label>Host</Label>
                <Input value={ldapHost} onChange={(e) => setLdapHost(e.target.value)} autoComplete={"off"} />
              </div>
              <div className={"flex flex-col gap-2"}>
                <Label>Bind DN</Label>
                <Input value={ldapBindDn} onChange={(e) => setLdapBindDn(e.target.value)} autoComplete={"off"} />
              </div>
              <div className={"flex flex-col gap-2"}>
                <Label>Base DN</Label>
                <Input value={ldapBaseDn} onChange={(e) => setLdapBaseDn(e.target.value)} autoComplete={"off"} />
              </div>
              <div className={"flex flex-col gap-2"}>
                <Label>User Filter</Label>
                <Input
                  value={ldapUserFilter}
                  onChange={(e) => setLdapUserFilter(e.target.value)}
                  autoComplete={"off"}
                  className={"font-mono text-xs"}
                />
              </div>
            </>
          ) : (
            <CopyField label={"Issuer"} value={provider.issuer ?? ""} />
          )}
          {!isLdap && <CopyField label={"Redirect URI"} value={provider.redirectUri ?? ""} />}
          <CopyField label={"Dashboard Login Link"} value={provider.dashboardLoginUrl} />
          <CopyField label={"Direct Login URL"} value={provider.loginUrl} />
          <div className={"flex flex-col gap-2"}>
            <Label>{isLdap ? "New Bind Password" : "New Client Secret"}</Label>
            <Input
              type={"password"}
              showPasswordToggle
              autoComplete={"new-password"}
              placeholder={"Leave blank to keep the current secret"}
              value={isLdap ? ldapBindPassword : clientSecret}
              onChange={(e) => (isLdap ? setLdapBindPassword(e.target.value) : setClientSecret(e.target.value))}
            />
          </div>
          <div className={"flex items-center justify-between"}>
            <div>
              <Label>Auto-provision users</Label>
              <p className={"text-xs text-nb-gray-400"}>
                Create a new user on first login instead of requiring one to
                already exist.
              </p>
            </div>
            <ToggleSwitch
              checked={autoProvision}
              onCheckedChange={setAutoProvision}
            />
          </div>
          <div className={"flex items-center justify-between"}>
            <div>
              <Label>Active</Label>
              <p className={"text-xs text-nb-gray-400"}>
                Disable to hide the login button without deleting the
                connection.
              </p>
            </div>
            <ToggleSwitch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant={"secondary"} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant={"primary"} onClick={handleSave} disabled={!name.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        isActive
          ? "bg-green-500/10 text-green-400 border-green-500/20"
          : "bg-nb-gray-900/60 text-nb-gray-500 border-nb-gray-800",
      )}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

// ── Table ────────────────────────────────────────────────────────────────────

type Props = {
  providers?: IdentityProvider[];
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
};

export default function IdentityProvidersTable({ providers, isLoading, headingTarget }: Readonly<Props>) {
  const { mutate } = useSWRConfig();
  const path = usePathname();
  const { permission } = usePermissions();
  const { confirm } = useDialog();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<IdentityProvider | null>(null);
  const providerRequest = useApiCall<{ status: string }>("/ui/identity-providers");

  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [{ id: "createdAt", desc: true }],
  );

  const remove = async (provider: IdentityProvider) => {
    const choice = await confirm({
      title: `Delete '${provider.name}'?`,
      description:
        "Users can no longer sign in through this connection. Users already provisioned through it are left in place.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!choice) return;

    const promise = providerRequest
      .del(undefined, `/${provider.id}`)
      .then(() => mutate("/ui/identity-providers"));
    notify({
      title: "Delete Identity Provider",
      description: `Connection '${provider.name}' successfully deleted.`,
      promise,
      loadingMessage: "Deleting connection...",
    });
  };

  const columns: ColumnDef<IdentityProvider>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableHeader column={column}>Name</DataTableHeader>
      ),
      sortingFn: "text",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {idpIcon(providerIconType(row.original))}
          <span className="font-medium text-sm">{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: "issuer",
      header: ({ column }) => (
        <DataTableHeader column={column}>Issuer / Host</DataTableHeader>
      ),
      sortingFn: "text",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-nb-gray-400">
          {row.original.type === "ldap"
            ? `${row.original.ldapHost}:${row.original.ldapPort}`
            : row.original.issuer}
        </span>
      ),
    },
    {
      accessorKey: "isActive",
      header: ({ column }) => (
        <DataTableHeader column={column}>Status</DataTableHeader>
      ),
      cell: ({ row }) => <StatusBadge isActive={row.original.isActive} />,
    },
    {
      accessorKey: "autoProvision",
      header: ({ column }) => (
        <DataTableHeader column={column}>Auto-provision</DataTableHeader>
      ),
      cell: ({ row }) => (
        <span className="text-sm text-nb-gray-300">
          {row.original.autoProvision ? "Enabled" : "Disabled"}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableHeader column={column}>Created</DataTableHeader>
      ),
      sortingFn: "datetime",
      cell: ({ row }) => (
        <span className="text-sm text-nb-gray-400">
          {dayjs(row.original.createdAt).format("MMM D, YYYY")}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end gap-2 pr-4">
          {permission.identity_providers?.update && (
            <Button
              variant={"secondary"}
              className={"!px-3"}
              onClick={() => setEditing(row.original)}
            >
              <Settings2 size={14} />
            </Button>
          )}
          {permission.identity_providers?.delete && (
            <Button
              variant={"danger-outline"}
              className={"!px-3"}
              onClick={() => remove(row.original)}
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <CreateIdentityProviderModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => mutate("/ui/identity-providers")}
      />
      <EditIdentityProviderModal
        provider={editing}
        onOpenChange={(v) => !v && setEditing(null)}
        onUpdated={() => mutate("/ui/identity-providers")}
      />
      <DataTable
        headingTarget={headingTarget}
        isLoading={isLoading}
        text={"Identity Providers"}
        sorting={sorting}
        setSorting={setSorting}
        columns={columns}
        data={providers ?? []}
        searchPlaceholder={"Search by name or issuer..."}
        rightSide={() =>
          permission.identity_providers?.create ? (
            <Button variant={"primary"} onClick={() => setCreateOpen(true)}>
              <PlusCircle size={16} />
              Add Identity Provider
            </Button>
          ) : null
        }
      >
        {(table) => (
          <>
            <DataTableRowsPerPage table={table} disabled={!providers?.length} />
            <DataTableRefreshButton
              isDisabled={!providers?.length}
              onClick={() => mutate("/ui/identity-providers")}
            />
          </>
        )}
      </DataTable>
    </>
  );
}
