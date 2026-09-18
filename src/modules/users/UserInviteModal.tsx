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
import { Copy, MailPlus } from "lucide-react";
import React, { useState } from "react";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { Role } from "@/interfaces/User";
import { InviteCreateResponse } from "@/interfaces/Invite";

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: Role.Member, label: "Member" },
  { value: Role.Admin, label: "Admin" },
  { value: Role.Auditor, label: "Auditor" },
  { value: Role.Owner, label: "Owner" },
];

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
};

export default function UserInviteModal({ open, onOpenChange, onCreated }: Readonly<Props>) {
  const [extSub, setExtSub] = useState("");
  const [role, setRole] = useState<Role>(Role.Member);
  const [created, setCreated] = useState<InviteCreateResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const { loggedInUser } = useLoggedInUser();
  const inviteRequest = useApiCall<InviteCreateResponse>("/ui/users/invites");

  const inviteLink = created && loggedInUser
    ? `${window.location.origin}/invite?token=${encodeURIComponent(created.token)}&tenantId=${encodeURIComponent(loggedInUser.tenantId)}`
    : "";

  const handleCreate = () => {
    if (!extSub.trim()) return;
    const promise = inviteRequest
      .post({ extSub: extSub.trim(), role })
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
    setExtSub("");
    setRole(Role.Member);
    setCreated(null);
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className={"max-w-md"}>
        <DialogHeader>
          <DialogTitle>
            <div className={"flex items-center gap-2"}>
              <MailPlus size={16} />
              {created ? "Invite Created" : "Invite User"}
            </div>
          </DialogTitle>
        </DialogHeader>

        {!created ? (
          <>
            <div className={"px-8 pb-4 flex flex-col gap-4"}>
              <div>
                <Label>Identifier</Label>
                <Input
                  value={extSub}
                  onChange={(e) => setExtSub(e.target.value)}
                  placeholder={"e.g. jane@example.com"}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant={"secondary"} onClick={handleClose}>Cancel</Button>
              <Button variant={"primary"} onClick={handleCreate} disabled={!extSub.trim()}>
                <MailPlus size={16} />
                Create Invite
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className={"px-8 pb-4 flex flex-col gap-4"}>
              <p className={"text-sm text-nb-gray-300"}>
                Copy this link now — it will not be shown again
              </p>
              <div
                className={
                  "flex items-center gap-2 bg-nb-gray-900 border border-nb-gray-800 rounded-md px-3 py-2 font-mono text-xs break-all"
                }
              >
                <span className={"flex-1 select-all"}>{inviteLink}</span>
                <button
                  onClick={handleCopy}
                  className={"text-nb-gray-400 hover:text-white transition-colors shrink-0"}
                >
                  <Copy size={14} />
                </button>
              </div>
              {copied && <p className={"text-xs text-green-400"}>Copied!</p>}
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
