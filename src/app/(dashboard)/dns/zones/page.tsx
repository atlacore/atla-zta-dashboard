"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { usePortalElement } from "@hooks/usePortalElement";
import useFetchApi from "@utils/api";
import React, { lazy, Suspense } from "react";
import DNSIcon from "@/assets/icons/DNSIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { DNSZone } from "@/interfaces/DNSZone";
import PageContainer from "@/layouts/PageContainer";
import DNSZoneIcon from "@/assets/icons/DNSZoneIcon";

const ZonesTable = lazy(() => import("@/modules/dns/zones/ZonesTable"));

export default function DNSZonePage() {
  const { permission } = usePermissions();

  const { data: zones, isLoading } = useFetchApi<DNSZone[]>("/ui/dns/zones");

  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item label={"DNS"} icon={<DNSIcon size={13} />} />
          <Breadcrumbs.Item
            href={"/dns/zones"}
            label={"Zones"}
            active
            icon={<DNSZoneIcon size={16} />}
          />
        </Breadcrumbs>
        <h1 ref={headingRef}>Zones</h1>
        <Paragraph>
          Manage the authoritative DNS zones served to devices on your
          tenant's overlay.
        </Paragraph>
      </div>

      <RestrictedAccess page={"DNS Zones"} hasAccess={permission?.dns?.read}>
        <Suspense fallback={<SkeletonTable />}>
          <ZonesTable isLoading={isLoading} headingTarget={portalTarget} zones={zones} />
        </Suspense>
      </RestrictedAccess>
    </PageContainer>
  );
}
