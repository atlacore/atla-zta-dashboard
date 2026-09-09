"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { usePortalElement } from "@hooks/usePortalElement";
import useFetchApi from "@utils/api";
import { FileCode } from "lucide-react";
import React, { lazy, Suspense } from "react";
import { RawPolicy } from "@/interfaces/RawPolicy";
import PageContainer from "@/layouts/PageContainer";

const PoliciesTable = lazy(() => import("@/modules/policies/PoliciesTable"));

export default function PoliciesPage() {
  const { data: policies, isLoading } = useFetchApi<RawPolicy[]>("/ui/policies");

  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/policies"}
            label={"Policies"}
            icon={<FileCode size={13} />}
          />
        </Breadcrumbs>
        <h1 ref={headingRef}>Policies</h1>
        <Paragraph>
          Raw Rego policies, one per name with a full revision history. Each
          is a boolean hook in <code className={"font-mono text-xs"}>package tenant</code> — the
          PDP evaluates it before the base policy and can only add grants, never
          bypass the base safety guards.
        </Paragraph>
      </div>
      <Suspense fallback={<SkeletonTable />}>
        <PoliciesTable
          headingTarget={portalTarget}
          policies={policies}
          isLoading={isLoading}
        />
      </Suspense>
    </PageContainer>
  );
}
