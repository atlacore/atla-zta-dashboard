"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { usePortalElement } from "@hooks/usePortalElement";
import useFetchApi from "@utils/api";
import { Laptop } from "lucide-react";
import React, { lazy, Suspense } from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Device } from "@/interfaces/Device";
import PageContainer from "@/layouts/PageContainer";

const ThisBrowserDevice = lazy(() => import("@/modules/devices/ThisBrowserDevice"));
const DevicesTable = lazy(() => import("@/modules/devices/DevicesTable"));
const DeviceApprovalSwitch = lazy(() => import("@/modules/devices/DeviceApprovalSwitch"));

export default function Devices() {
  const { data: devices, isLoading, mutate } = useFetchApi<Device[]>("/ui/devices");
  const { permission } = usePermissions();

  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/devices"}
            label={"Devices"}
            icon={<Laptop size={13} />}
          />
        </Breadcrumbs>
        <h1 ref={headingRef}>Devices</h1>
        <Paragraph>
          Devices enrolled to claim signed posture for this tenant. Revoking a
          device blocks future posture claims for it — it does not affect any
          session already established.
        </Paragraph>
      </div>
      {permission.devices.update && (
        <Suspense fallback={null}>
          <DeviceApprovalSwitch />
        </Suspense>
      )}
      <Suspense fallback={null}>
        <ThisBrowserDevice onChanged={() => mutate()} />
      </Suspense>
      <RestrictedAccess page={"Devices"} hasAccess={permission.devices.read}>
        <Suspense fallback={<SkeletonTable />}>
          <DevicesTable
            headingTarget={portalTarget}
            devices={devices}
            isLoading={isLoading}
          />
        </Suspense>
      </RestrictedAccess>
    </PageContainer>
  );
}
