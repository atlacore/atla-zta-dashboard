"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { usePortalElement } from "@hooks/usePortalElement";
import useFetchApi from "@utils/api";
import { ServerIcon } from "lucide-react";
import React, { lazy, Suspense } from "react";
import DNSIcon from "@/assets/icons/DNSIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { DNSNameserverGroup } from "@/interfaces/DNSNameserverGroup";
import PageContainer from "@/layouts/PageContainer";

const NameserverGroupsTable = lazy(
  () => import("@/modules/dns/nameservers/NameserverGroupsTable"),
);

export default function NameserversPage() {
  const { permission } = usePermissions();
  const { data: groups, isLoading } =
    useFetchApi<DNSNameserverGroup[]>("/ui/dns/nameservers");
  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item label={"DNS"} icon={<DNSIcon size={13} />} />
          <Breadcrumbs.Item
            href={"/dns/nameservers"}
            label={"Nameservers"}
            active
            icon={<ServerIcon size={14} />}
          />
        </Breadcrumbs>
        <h1 ref={headingRef}>Nameservers</h1>
        <Paragraph>
          Nameserver groups back the authoritative DNS zones served to
          devices on the overlay.
        </Paragraph>
      </div>

      <RestrictedAccess page={"Nameservers"} hasAccess={permission?.nameservers?.read}>
        <Suspense fallback={<SkeletonTable />}>
          <NameserverGroupsTable
            isLoading={isLoading}
            headingTarget={portalTarget}
            groups={groups}
          />
        </Suspense>
      </RestrictedAccess>
    </PageContainer>
  );
}
