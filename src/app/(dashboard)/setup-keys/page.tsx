"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { usePortalElement } from "@hooks/usePortalElement";
import useFetchApi from "@utils/api";
import { KeySquare } from "lucide-react";
import React, { lazy, Suspense } from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { SetupKey } from "@/interfaces/AtlaSetupKey";
import PageContainer from "@/layouts/PageContainer";

const SetupKeysTable = lazy(() => import("@/modules/atla-setup-keys/SetupKeysTable"));

export default function SetupKeysPage() {
  const { permission } = usePermissions();
  const { data: keys, isLoading } = useFetchApi<SetupKey[]>(
    "/ui/setup-keys",
    false,
    true,
    permission.setup_keys.read,
  );
  const { ref: headingRef, portalTarget } = usePortalElement<HTMLHeadingElement>();

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item href={"/setup-keys"} label={"Setup Keys"} icon={<KeySquare size={13} />} />
        </Breadcrumbs>
        <h1 ref={headingRef}>Setup Keys</h1>
        <Paragraph>
          Setup keys enroll servers, CI runners and other headless devices without a user login. Each key has its own
          service user and groups; its devices are approved on enrollment and then authenticate with their own token.
        </Paragraph>
      </div>
      <RestrictedAccess page={"Setup Keys"} hasAccess={permission.setup_keys.read}>
        <Suspense fallback={<SkeletonTable />}>
          <SetupKeysTable headingTarget={portalTarget} setupKeys={keys} isLoading={isLoading} />
        </Suspense>
      </RestrictedAccess>
    </PageContainer>
  );
}
