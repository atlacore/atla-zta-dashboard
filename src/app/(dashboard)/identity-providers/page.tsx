"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { usePortalElement } from "@hooks/usePortalElement";
import useFetchApi from "@utils/api";
import { KeyRound } from "lucide-react";
import React, { lazy, Suspense } from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { IdentityProvider } from "@/interfaces/IdentityProvider";
import PageContainer from "@/layouts/PageContainer";

const IdentityProvidersTable = lazy(
  () => import("@/modules/identity-providers/IdentityProvidersTable"),
);

export default function IdentityProvidersPage() {
  const { data: providers, isLoading } = useFetchApi<IdentityProvider[]>(
    "/ui/identity-providers",
  );
  const { permission } = usePermissions();

  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/identity-providers"}
            label={"Identity Providers"}
            icon={<KeyRound size={13} />}
          />
        </Breadcrumbs>
        <h1 ref={headingRef}>Identity Providers</h1>
        <Paragraph>
          Let your users sign in with an external OIDC provider (Okta, Entra,
          Google, or any standards-compliant IdP) instead of, or in addition
          to, a local password.
        </Paragraph>
      </div>
      <RestrictedAccess
        page={"Identity Providers"}
        hasAccess={permission.identity_providers.read}
      >
        <Suspense fallback={<SkeletonTable />}>
          <IdentityProvidersTable
            headingTarget={portalTarget}
            providers={providers}
            isLoading={isLoading}
          />
        </Suspense>
      </RestrictedAccess>
    </PageContainer>
  );
}
