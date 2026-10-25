"use client";

import Button from "@components/Button";
import Code from "@components/Code";
import FormModal from "@components/modal/FormModal";
import HelpText from "@components/HelpText";
import { Label } from "@components/Label";
import useFetchApi from "@utils/api";
import { ShieldCheck } from "lucide-react";
import React from "react";
import { CredentialCAs } from "@/interfaces/Resource";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

const SSHD_SNIPPET = [
  "sudo tee /etc/ssh/atla_user_ca.pub <<< '<SSH CA public key>'",
  "echo 'TrustedUserCAKeys /etc/ssh/atla_user_ca.pub' | sudo tee /etc/ssh/sshd_config.d/atla.conf",
  "sudo sshd -t && sudo systemctl reload ssh",
].join("\n");

// Shows the tenant's CAs that ssh_cert servers and mtls_cert services must trust
export default function CredentialCAsModal({ open, onOpenChange }: Props) {
  const { data, isLoading } = useFetchApi<CredentialCAs>(
    "/ui/credential-cas",
    false,
    false,
    open,
  );

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      icon={<ShieldCheck size={20} />}
      title={"Server Trust"}
      description={
        "Your servers trust these CAs to accept the SSH and client certificates issued on connect."
      }
      maxWidthClass={"max-w-2xl"}
      footer={
        <Button variant={"secondary"} onClick={() => onOpenChange(false)}>
          Close
        </Button>
      }
    >
      <div className={"px-8 pb-6 flex flex-col gap-6"}>
        <div>
          <Label>SSH user CA (ssh_cert resources)</Label>
          <HelpText>
            Put this key in sshd&apos;s{" "}
            <span className={"font-mono"}>TrustedUserCAKeys</span>. Certificates
            are valid for the resource&apos;s SSH logins and expire with the
            session.
          </HelpText>
          <Code
            codeToCopy={data?.sshCaPublicKey}
            message={"SSH CA public key copied"}
          >
            <span className={"break-all whitespace-pre-wrap"}>
              {isLoading ? "Loading..." : data?.sshCaPublicKey}
            </span>
          </Code>
          <div className={"mt-3"}>
            <Code
              codeToCopy={SSHD_SNIPPET}
              message={"Commands copied"}
              dark={true}
            >
              <span className={"whitespace-pre-wrap"}>{SSHD_SNIPPET}</span>
            </Code>
          </div>
        </div>
        <div>
          <Label>Client certificate CA (mtls_cert resources)</Label>
          <HelpText>
            Services trust this CA for client certificates. The
            certificate&apos;s CN is the user&apos;s ID.
          </HelpText>
          <Code codeToCopy={data?.clientCaPem} message={"Client CA copied"}>
            <span className={"whitespace-pre-wrap text-xs"}>
              {isLoading ? "Loading..." : data?.clientCaPem}
            </span>
          </Code>
        </div>
      </div>
    </FormModal>
  );
}
