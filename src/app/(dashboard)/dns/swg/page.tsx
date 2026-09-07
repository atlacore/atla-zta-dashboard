"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { usePortalElement } from "@hooks/usePortalElement";
import useFetchApi from "@utils/api";
import { ShieldIcon } from "lucide-react";
import React, { lazy, Suspense } from "react";
import DNSIcon from "@/assets/icons/DNSIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { SWGBlockedDomain } from "@/interfaces/DNSSWG";
import PageContainer from "@/layouts/PageContainer";
import SWGPolicyToggle from "@/modules/dns/swg/SWGPolicyToggle";

const SWGBlocklistTable = lazy(
  () => import("@/modules/dns/swg/SWGBlocklistTable"),
);

export default function SWGPage() {
  const { permission } = usePermissions();
  const { data: domains, isLoading } = useFetchApi<SWGBlockedDomain[]>(
    "/ui/dns/swg/blocklist",
  );
  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item label={"DNS"} icon={<DNSIcon size={13} />} />
          <Breadcrumbs.Item
            href={"/dns/swg"}
            label={"Secure Web Gateway"}
            active
            icon={<ShieldIcon size={14} />}
          />
        </Breadcrumbs>
        <h1 ref={headingRef}>Secure Web Gateway</h1>
        <Paragraph>
          Block DNS resolution of specific domains for every device on the
          overlay.
        </Paragraph>
      </div>

      <RestrictedAccess page={"Secure Web Gateway"} hasAccess={permission?.dns?.read}>
        <div className={"px-default mb-6"}>
          <SWGPolicyToggle />
        </div>
        <Suspense fallback={<SkeletonTable />}>
          <SWGBlocklistTable
            isLoading={isLoading}
            headingTarget={portalTarget}
            domains={domains}
          />
        </Suspense>
      </RestrictedAccess>
    </PageContainer>
  );
}
