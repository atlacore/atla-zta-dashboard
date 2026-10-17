"use client";

import Button from "@components/Button";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { Modal, ModalContent, ModalFooter } from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { notify } from "@components/Notification";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/Select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import {
  AlignLeftIcon,
  Copy,
  LockIcon,
  MailPlus,
  UserPlus2Icon,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { buildPermissions } from "@/contexts/PermissionsProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { InviteCreateResponse } from "@/interfaces/Invite";
import { Permission, Permissions } from "@/interfaces/Permission";
import { Role } from "@/interfaces/User";

type RoleOption = { value: Role; label: string; description: string };

const ROLE_OPTIONS: RoleOption[] = [
  {
    value: Role.Member,
    label: "Member",
    description:
      "Connects to resources allowed by access policies. No dashboard management.",
  },
  {
    value: Role.Auditor,
    label: "Auditor",
    description: "Read-only access to the dashboard, including audit events.",
  },
  {
    value: Role.Admin,
    label: "Admin",
    description:
      "Manages users, resources, policies and the rest of the tenant, except owner-only actions.",
  },
  {
    value: Role.Owner,
    label: "Owner",
    description: "Full control of the tenant, including other owners.",
  },
];

const EXPIRY_OPTIONS = [
  { value: "default", label: "Server default", hours: 0 },
  { value: "1d", label: "1 day", hours: 24 },
  { value: "7d", label: "7 days", hours: 24 * 7 },
  { value: "30d", label: "30 days", hours: 24 * 30 },
];

// Modules shown in the permission summary, in display order.
const SUMMARY_MODULES: { key: keyof Permissions["modules"]; label: string }[] =
  [
    { key: "peers", label: "Peers" },
    { key: "devices", label: "Devices" },
    { key: "policies", label: "Access policies" },
    { key: "networks", label: "Networks" },
    { key: "dns", label: "DNS" },
    { key: "users", label: "Users" },
    { key: "events", label: "Audit events" },
    { key: "identity_providers", label: "Identity providers" },
    { key: "settings", label: "Settings" },
  ];

// An inviter can only hand out roles up to their own: owners any, admins everything but owner.
function grantableRoles(inviterRole: Role | undefined): Role[] {
  if (inviterRole === Role.Owner) return Object.values(Role);
  if (inviterRole === Role.Admin)
    return [Role.Admin, Role.Auditor, Role.Member];
  return [];
}

function accessLabel(permission: Permission): {
  text: string;
  tone: string;
} {
  if (permission.create || permission.update || permission.delete)
    return { text: "Full access", tone: "text-green-400 bg-green-500/10" };
  if (permission.read)
    return { text: "Read only", tone: "text-sky-400 bg-sky-500/10" };
  return { text: "No access", tone: "text-nb-gray-500 bg-nb-gray-900" };
}

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
};

export default function UserInviteModal({
  open,
  onOpenChange,
  onCreated,
}: Readonly<Props>) {
  const { loggedInUser } = useLoggedInUser();
  const [tab, setTab] = useState("general");
  const [extSub, setExtSub] = useState("");
  const [role, setRole] = useState<Role>(Role.Member);
  const [expiry, setExpiry] = useState("default");
  const [created, setCreated] = useState<InviteCreateResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const inviteRequest = useApiCall<InviteCreateResponse>("/ui/users/invites");

  const grantable = useMemo(
    () => grantableRoles(loggedInUser?.role),
    [loggedInUser?.role],
  );
  const selectedRole = ROLE_OPTIONS.find((o) => o.value === role);
  const rolePermissions = useMemo(
    () => buildPermissions(role).permission,
    [role],
  );

  const inviteLink =
    created && loggedInUser
      ? `${window.location.origin}/invite?token=${encodeURIComponent(
          created.token,
        )}&tenantId=${encodeURIComponent(
          loggedInUser.tenantId,
        )}&extSub=${encodeURIComponent(created.extSub)}`
      : "";

  const handleCreate = () => {
    if (!extSub.trim() || !grantable.includes(role)) return;
    const hours = EXPIRY_OPTIONS.find((o) => o.value === expiry)?.hours ?? 0;
    const promise = inviteRequest
      .post({
        extSub: extSub.trim(),
        role,
        ...(hours > 0
          ? { expiresAt: new Date(Date.now() + hours * 3600_000).toISOString() }
          : {}),
      })
      .then((res) => {
        setCreated(res);
        onCreated();
      });
    notify({
      title: "Create Invite",
      description: "Invite successfully created.",
      promise,
      loadingMessage: "Creating invite...",
    });
  };

  const handleCopy = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleClose = () => {
    setTab("general");
    setExtSub("");
    setRole(Role.Member);
    setExpiry("default");
    setCreated(null);
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
    >
      <ModalContent maxWidthClass={"max-w-xl"}>
        <ModalHeader
          icon={<UserPlus2Icon size={20} />}
          title={created ? "Invite Created" : "Invite User"}
          description={
            created
              ? "Share the link below with the new user."
              : "Invite a new user to join this tenant."
          }
          color={"netbird"}
        />

        {created ? (
          <>
            <div className={"px-8 pb-6 flex flex-col gap-4"}>
              <p className={"text-sm text-nb-gray-300"}>
                Copy this link now — it will not be shown again.
              </p>
              <div
                className={
                  "flex items-center gap-2 bg-nb-gray-900 border border-nb-gray-800 rounded-md px-3 py-2 font-mono text-xs break-all"
                }
              >
                <span className={"flex-1 select-all"}>{inviteLink}</span>
                <button
                  onClick={handleCopy}
                  className={
                    "text-nb-gray-400 hover:text-white transition-colors shrink-0"
                  }
                >
                  <Copy size={14} />
                </button>
              </div>
              {copied && <p className={"text-xs text-green-400"}>Copied!</p>}
              <div className={"text-xs text-nb-gray-400"}>
                Invited{" "}
                <span className={"text-nb-gray-200"}>{created.extSub}</span> as{" "}
                <span className={"text-nb-gray-200"}>{created.role}</span>,
                valid until {new Date(created.expiresAt).toLocaleString()}.
              </div>
            </div>
            <ModalFooter className={"items-center"}>
              <div />
              <Button variant={"primary"} onClick={handleClose}>
                Done
              </Button>
            </ModalFooter>
          </>
        ) : (
          <>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList justify={"start"} className={"px-8"}>
                <TabsTrigger value={"general"}>
                  <AlignLeftIcon size={16} />
                  General
                </TabsTrigger>
                <TabsTrigger value={"permissions"}>
                  <LockIcon size={16} />
                  Permissions
                </TabsTrigger>
              </TabsList>

              <TabsContent value={"general"} className={"px-8 py-6"}>
                <div className={"flex flex-col gap-5"}>
                  <div>
                    <Label>Identifier</Label>
                    <p className={"text-xs text-nb-gray-400 mb-2"}>
                      The email or login the user will register with.
                    </p>
                    <Input
                      value={extSub}
                      onChange={(e) => setExtSub(e.target.value)}
                      placeholder={"e.g. jane@example.com"}
                      onKeyDown={(e) =>
                        e.key === "Enter" && setTab("permissions")
                      }
                    />
                  </div>
                  <div>
                    <Label>Invite validity</Label>
                    <p className={"text-xs text-nb-gray-400 mb-2"}>
                      The link stops working after this period if unused.
                    </p>
                    <Select value={expiry} onValueChange={setExpiry}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPIRY_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value={"permissions"} className={"px-8 py-6"}>
                <div className={"flex flex-col gap-5"}>
                  <div>
                    <Label>Role</Label>
                    <p className={"text-xs text-nb-gray-400 mb-2"}>
                      You are{" "}
                      <span className={"text-nb-gray-200"}>
                        {loggedInUser?.role ?? "unknown"}
                      </span>
                      {grantable.length > 0
                        ? ", so you can grant " + grantable.join(", ") + "."
                        : ", so you cannot invite users."}
                    </p>
                    <Select
                      value={role}
                      onValueChange={(v) => setRole(v as Role)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((o) => (
                          <SelectItem
                            key={o.value}
                            value={o.value}
                            disabled={!grantable.includes(o.value)}
                          >
                            {o.label}
                            {!grantable.includes(o.value) &&
                              " — above your role"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className={"text-xs text-nb-gray-400 mt-2"}>
                      {selectedRole?.description}
                    </p>
                  </div>

                  <div
                    className={
                      "rounded-lg border border-nb-gray-900 bg-nb-gray-930/60 divide-y divide-nb-gray-900"
                    }
                  >
                    {SUMMARY_MODULES.map(({ key, label }) => {
                      const access = accessLabel(rolePermissions[key]);
                      return (
                        <div
                          key={key}
                          className={
                            "flex items-center justify-between px-4 py-2.5 text-sm"
                          }
                        >
                          <span className={"text-nb-gray-200"}>{label}</span>
                          <span
                            className={cn(
                              "rounded-md px-2 py-0.5 text-xs",
                              access.tone,
                            )}
                          >
                            {access.text}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <p className={"text-xs text-nb-gray-400"}>
                    Access to resources is granted separately by access
                    policies. A new user has none until a policy includes them.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <ModalFooter className={"items-center"}>
              <div />
              <div className={"flex gap-3"}>
                {tab === "general" ? (
                  <>
                    <Button variant={"secondary"} onClick={handleClose}>
                      Cancel
                    </Button>
                    <Button
                      variant={"primary"}
                      onClick={() => setTab("permissions")}
                      disabled={!extSub.trim()}
                    >
                      Next
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant={"secondary"}
                      onClick={() => setTab("general")}
                    >
                      Back
                    </Button>
                    <Button
                      variant={"primary"}
                      onClick={handleCreate}
                      disabled={!extSub.trim() || !grantable.includes(role)}
                    >
                      <MailPlus size={16} />
                      Create Invite
                    </Button>
                  </>
                )}
              </div>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
