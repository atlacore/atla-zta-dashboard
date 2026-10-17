"use client";

import { notify } from "@components/Notification";
import { ToggleSwitch } from "@components/ToggleSwitch";
import useFetchApi, { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import { ShieldCheckIcon, ShieldOffIcon } from "lucide-react";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import { SWGPolicy } from "@/interfaces/DNSSWG";

const SWG_POLICY_URL = "/ui/dns/swg";

export default function SWGPolicyToggle() {
  const { mutate } = useSWRConfig();
  const { data: policy, isLoading } = useFetchApi<SWGPolicy>(SWG_POLICY_URL);
  const policyRequest = useApiCall<SWGPolicy>(SWG_POLICY_URL);
  // Shown while the save is in flight so the switch moves immediately; cleared when it settles.
  const [pending, setPending] = useState<boolean | null>(null);

  const enabled = pending ?? policy?.enabled ?? false;
  const busy = isLoading || pending !== null;

  const setEnabled = (next: boolean) => {
    if (busy) return;
    setPending(next);
    const promise = policyRequest
      .put({ enabled: next })
      .then(() => mutate(SWG_POLICY_URL))
      .finally(() => setPending(null));
    notify({
      title: "Secure Web Gateway",
      description: next ? "SWG enabled." : "SWG disabled.",
      promise,
      loadingMessage: "Saving...",
    });
  };

  const Icon = enabled ? ShieldCheckIcon : ShieldOffIcon;

  return (
    <div
      className={cn(
        "flex w-full max-w-xl items-center justify-between gap-6 rounded-lg border px-5 py-4 transition-colors",
        enabled
          ? "border-green-500/20 bg-green-500/5"
          : "border-nb-gray-900 bg-nb-gray-930/60",
      )}
    >
      <div className={"flex min-w-0 items-center gap-4"}>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
            enabled
              ? "bg-green-500/10 text-green-400"
              : "bg-nb-gray-900 text-nb-gray-400",
          )}
        >
          <Icon size={20} />
        </div>
        <div className={"min-w-0"}>
          <div className={"flex items-center gap-3"}>
            <span className={"text-sm font-medium text-nb-gray-100"}>
              Secure Web Gateway
            </span>
            <span
              className={cn(
                "rounded-md border px-2 py-0.5 text-xs",
                enabled
                  ? "border-green-500/20 bg-green-500/10 text-green-400"
                  : "border-nb-gray-800 bg-nb-gray-900/70 text-nb-gray-400",
              )}
            >
              {enabled ? "Enabled" : "Disabled"}
            </span>
          </div>
          <p className={"mt-1 text-xs text-nb-gray-400"}>
            Blocks DNS resolution of domains on the blocklist below for all
            devices on the overlay.
          </p>
        </div>
      </div>

      <ToggleSwitch
        checked={enabled}
        onCheckedChange={setEnabled}
        disabled={busy}
        aria-label={"Enable Secure Web Gateway"}
      />
    </div>
  );
}
