"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { usePortalElement } from "@hooks/usePortalElement";
import useFetchApi from "@utils/api";
import { BoxIcon } from "lucide-react";
import React, { lazy, Suspense } from "react";
import { Resource } from "@/interfaces/Resource";
import PageContainer from "@/layouts/PageContainer";

const ResourcesTable = lazy(
  () => import("@/modules/resources/ResourcesTable"),
);

export default function ResourcesPage() {
  const { data: resources, isLoading } = useFetchApi<Resource[]>("/ui/resources");

  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/resources"}
            label={"Resources"}
            icon={<BoxIcon size={13} />}
          />
        </Breadcrumbs>
        <h1 ref={headingRef}>Resources</h1>
        <Paragraph>
          Resources represent protected services (WireGuard, SSH, DB, mTLS).
          Each resource gets a unique ARN used in access policies.
        </Paragraph>
      </div>
      <Suspense fallback={<SkeletonTable />}>
        <ResourcesTable
          headingTarget={portalTarget}
          resources={resources}
          isLoading={isLoading}
        />
      </Suspense>
    </PageContainer>
  );
}
