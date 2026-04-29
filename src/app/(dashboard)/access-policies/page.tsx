"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { usePortalElement } from "@hooks/usePortalElement";
import useFetchApi from "@utils/api";
import { ShieldCheck } from "lucide-react";
import React, { lazy, Suspense } from "react";
import { AccessPolicy } from "@/interfaces/AccessPolicy";
import PageContainer from "@/layouts/PageContainer";

const AccessPoliciesTable = lazy(
  () => import("@/modules/access-policies/AccessPoliciesTable"),
);

export default function AccessPoliciesPage() {
  const { data: policies, isLoading } = useFetchApi<AccessPolicy[]>("/ui/access-policies");

  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/access-policies"}
            label={"Access Policies"}
            icon={<ShieldCheck size={13} />}
          />
        </Breadcrumbs>
        <h1 ref={headingRef}>Access Policies</h1>
        <Paragraph>
          Declarative access policies define which users can access which
          resources, via what protocol and ports. Policies are compiled to Rego
          and evaluated at request time.
        </Paragraph>
      </div>
      <Suspense fallback={<SkeletonTable />}>
        <AccessPoliciesTable
          headingTarget={portalTarget}
          policies={policies}
          isLoading={isLoading}
        />
      </Suspense>
    </PageContainer>
  );
}
