"use client";

import "reflect-metadata"; // must precede @peculiar/x509 (tsyringe needs the polyfill)
import Button from "@components/Button";
import Card from "@components/Card";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { X509Certificate } from "@peculiar/x509";
import { LaptopIcon } from "lucide-react";
import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { randomDeviceId, useSignedApiCall } from "@/hooks/useSignedApiCall";
import { useLoggedInUser } from "@/contexts/UsersProvider";

const DEVICE_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,62}$/;

const SUPPORT_HINT = {
  "insecure-context": "Device signing needs HTTPS (or localhost).",
  unsupported: "This browser lacks Ed25519 support, so signed responses cannot be verified.",
} as const;

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <p className={"font-mono text-xs break-all text-nb-gray-300"}>{value}</p>
    </div>
  );
}

export default function ThisBrowserDevice({ onChanged }: { onChanged?: () => void }) {
  const { identity, support, enrollThisBrowser, forget } = useSignedApiCall();
  const { loggedInUser } = useLoggedInUser();
  const [busy, setBusy] = useState(false);
  const [deviceName, setDeviceName] = useState(randomDeviceId);
  const nameValid = DEVICE_ID_PATTERN.test(deviceName);

  const certificate = useMemo(() => {
    if (!identity) return undefined;
    try {
      return new X509Certificate(identity.certificatePem);
    } catch {
      return undefined;
    }
  }, [identity]);

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await action();
      toast.success(success);
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className={"mx-8 mb-6 p-6 flex flex-col gap-4 max-w-[900px]"}>
      <div className={"flex items-center gap-2"}>
        <LaptopIcon size={16} />
        <span className={"font-medium"}>This browser</span>
      </div>

      {support !== "checking" && support !== "supported" && (
        <p className={"text-sm text-nb-gray-400"}>{SUPPORT_HINT[support]}</p>
      )}

      {support === "supported" && !identity && (
        <>
          <p className={"text-sm text-nb-gray-400"}>
            Not enrolled. Enrolling generates a non-exportable P-256 key in this browser and
            sends a certificate request; the issued certificate lives until an admin deletes the
            device.
          </p>
          <div>
            <Label>Device name</Label>
            <Input
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value.trim())}
              className={"font-mono text-xs"}
              placeholder={"my-laptop"}
            />
            {!nameValid && (
              <p className={"text-xs text-red-400 mt-1"}>
                Letters, digits, dot, dash and underscore; up to 63 characters.
              </p>
            )}
          </div>
          <div className={"rounded-md bg-nb-gray-900/40 p-3 flex flex-col gap-2"}>
            <Label>Certificate preview</Label>
            <Field label={"Subject (CN)"} value={"device-<id>, assigned by the control plane"} />
            <Field label={"Email SAN"} value={loggedInUser?.email || "—"} />
            <p className={"text-xs text-nb-gray-400"}>
              The CSR carries only the public key. The control plane sets the subject and the email
              from your account and ignores any name or SAN in the request; the device name above
              is only the identifier it is registered under.
            </p>
          </div>
          <div>
            <Button
              variant={"primary"}
              disabled={busy || !nameValid}
              onClick={() => run(() => enrollThisBrowser(deviceName), "Browser enrolled")}
            >
              {busy ? "Enrolling…" : "Enroll this browser"}
            </Button>
          </div>
        </>
      )}

      {identity && (
        <>
          <div className={"grid gap-3 sm:grid-cols-2"}>
            <Field label={"Device ID"} value={identity.deviceId} />
            <Field label={"Enrolled"} value={new Date(identity.enrolledAt).toLocaleString()} />
            {certificate && (
              <>
                <Field label={"Certificate subject"} value={certificate.subject} />
                <Field label={"Serial"} value={certificate.serialNumber} />
                <Field label={"Valid from"} value={certificate.notBefore.toLocaleString()} />
                <Field label={"Valid until"} value={certificate.notAfter.toLocaleString()} />
              </>
            )}
          </div>
          <p className={"text-sm text-nb-gray-400"}>
            Forgetting removes the key from this browser only; the device stays registered until
            an admin deletes it, and the next signed request enrolls a new one.
          </p>
          <div>
            <Button
              variant={"secondary"}
              disabled={busy}
              onClick={() => run(forget, "Local device identity removed")}
            >
              Forget this device
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
