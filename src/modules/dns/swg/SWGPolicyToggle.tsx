"use client";

import Card from "@components/Card";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import { notify } from "@components/Notification";
import { ShieldIcon } from "lucide-react";
import React from "react";
import { useSWRConfig } from "swr";
import useFetchApi, { useApiCall } from "@utils/api";
import { SWGPolicy } from "@/interfaces/DNSSWG";

const SWG_POLICY_URL = "/ui/dns/swg";

export default function SWGPolicyToggle() {
  const { mutate } = useSWRConfig();
  const { data: policy, isLoading } = useFetchApi<SWGPolicy>(SWG_POLICY_URL);
  const policyRequest = useApiCall<SWGPolicy>(SWG_POLICY_URL);

  const setEnabled = (enabled: boolean) => {
    const promise = policyRequest.put({ enabled }).then(() => {
      mutate(SWG_POLICY_URL);
    });
    notify({
      title: "Secure Web Gateway",
      description: enabled ? "SWG enabled." : "SWG disabled.",
      promise,
      loadingMessage: "Saving...",
    });
  };

  return (
    <Card className={"p-6"}>
      <FancyToggleSwitch
        value={policy?.enabled ?? false}
        onChange={setEnabled}
        disabled={isLoading}
        label={
          <>
            <ShieldIcon size={15} />
            Enable Secure Web Gateway
          </>
        }
        helpText={
          "Blocks DNS resolution of domains on the blocklist below for all devices on the overlay"
        }
      />
    </Card>
  );
}
