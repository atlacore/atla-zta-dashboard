"use client";

import FancyToggleSwitch from "@components/FancyToggleSwitch";
import { notify } from "@components/Notification";
import useFetchApi, { useApiCall } from "@utils/api";
import { ShieldCheck } from "lucide-react";
import React from "react";
import { useSWRConfig } from "swr";
import { useLoggedInUser } from "@/contexts/UsersProvider";

type Tenant = { id: string; requireDeviceApproval?: boolean };

// The tenant switch for admin approval of devices users register; setup-key devices never wait
export default function DeviceApprovalSwitch() {
  const { loggedInUser } = useLoggedInUser();
  const { mutate } = useSWRConfig();
  const { data: tenants } = useFetchApi<Tenant[]>("/ui/tenants");
  const tenant = tenants?.find((t) => t.id === loggedInUser?.tenantId);
  const tenantRequest = useApiCall<Tenant>("/ui/tenants/" + loggedInUser?.tenantId);

  if (!tenant) return null;

  const change = (requireDeviceApproval: boolean) => {
    const promise = tenantRequest.put({ requireDeviceApproval }).then(() => mutate("/ui/tenants"));
    notify({
      title: "Device approval",
      description: requireDeviceApproval
        ? "New devices now wait for an admin before they can connect."
        : "New devices can connect right after they register.",
      promise,
      loadingMessage: "Saving...",
    });
  };

  return (
    <div className={"px-default pb-6 max-w-3xl"}>
      <FancyToggleSwitch
        value={!!tenant.requireDeviceApproval}
        onChange={change}
        label={
          <>
            <ShieldCheck size={15} />
            Require approval for new devices
          </>
        }
        helpText={
          "A device a user registers cannot connect until an admin approves it here; admins get an email. Devices enrolled with a setup key are approved by the key, and devices already registered stay approved."
        }
      />
    </div>
  );
}
