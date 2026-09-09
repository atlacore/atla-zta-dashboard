"use client";

import useFetchApi from "@utils/api";
import { CheckCircle2, ShieldAlertIcon, ShieldCheckIcon, XCircle } from "lucide-react";
import React from "react";
import { PostureCacheEntry } from "@/interfaces/PostureCache";

type Props = {
  deviceId?: string;
};

function Yes() {
  return (
    <span className={"inline-flex items-center gap-1 text-emerald-400"}>
      <CheckCircle2 size={12} /> yes
    </span>
  );
}
function No() {
  return (
    <span className={"inline-flex items-center gap-1 text-red-400"}>
      <XCircle size={12} /> no
    </span>
  );
}
function Bool({ v }: { v?: boolean }) {
  if (v === undefined) return <span className={"text-nb-gray-500"}>—</span>;
  return v ? <Yes /> : <No />;
}

function ProviderScore({ entry }: Readonly<{ entry: PostureCacheEntry }>) {
  const score = entry.score;
  const Icon = score?.compliant ? ShieldCheckIcon : ShieldAlertIcon;
  const iconColor = score?.compliant ? "text-emerald-400" : "text-amber-400";

  return (
    <div className={"border-t border-nb-gray-900 first:border-t-0 pt-3 first:pt-0 mt-3 first:mt-0"}>
      <div className={"flex items-center gap-2 mb-2"}>
        <Icon size={16} className={iconColor} />
        <span className={"font-medium capitalize"}>{entry.provider}</span>
      </div>
      <dl className={"grid grid-cols-2 gap-x-6 gap-y-2"}>
        <dt className={"text-nb-gray-300"}>Compliant</dt>
        <dd>
          <Bool v={score?.compliant} />
        </dd>
        <dt className={"text-nb-gray-300"}>OS</dt>
        <dd className={"font-mono text-xs"}>
          {score?.os_platform ?? "—"} {score?.os_version ?? ""}
        </dd>
        <dt className={"text-nb-gray-300"}>Disk encryption</dt>
        <dd>
          <Bool v={score?.disk_encryption} />
        </dd>
        <dt className={"text-nb-gray-300"}>MDM enrolled</dt>
        <dd>
          <Bool v={score?.mdm_enrolled} />
        </dd>
        <dt className={"text-nb-gray-300"}>Online</dt>
        <dd>
          <Bool v={score?.online} />
        </dd>
        <dt className={"text-nb-gray-300"}>Fetched</dt>
        <dd className={"text-xs text-nb-gray-300"}>
          {entry.fetchedAt ? new Date(entry.fetchedAt).toLocaleString() : "—"}
        </dd>
      </dl>
    </div>
  );
}

/**
 * Read-only posture-cache widget for a device. Calls
 * `GET /api/ui/posture-cache/:device_id`, which returns one entry per
 * external provider (fleet/crowdstrike/intune) that has synced this device.
 * Returns null when deviceId is empty, so callers can drop it on any peer
 * detail page without a guard.
 */
export default function PostureCacheCard({ deviceId }: Props) {
  const url = deviceId ? `/ui/posture-cache/${encodeURIComponent(deviceId)}` : "";
  const { data, isLoading } = useFetchApi<PostureCacheEntry[]>(url, true, false, !!deviceId);

  if (!deviceId) return null;

  return (
    <div
      className={
        "border border-nb-gray-900 rounded-md bg-nb-gray-940/40 p-4 text-sm"
      }
    >
      <div className={"flex items-center gap-2 mb-1"}>
        <ShieldCheckIcon size={16} className={"text-nb-gray-300"} />
        <span className={"font-medium"}>Device posture</span>
      </div>

      {isLoading && <div className={"text-nb-gray-300 mt-2"}>Loading…</div>}
      {!isLoading && !data?.length && (
        <div className={"text-nb-gray-300 mt-2"}>
          No external posture data — the worker may not have synced this device
          yet.
        </div>
      )}
      {!isLoading &&
        data?.map((entry) => <ProviderScore key={entry.id} entry={entry} />)}
    </div>
  );
}
