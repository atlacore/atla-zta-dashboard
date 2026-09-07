"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { usePortalElement } from "@hooks/usePortalElement";
import useFetchApi from "@utils/api";
import React, { lazy, Suspense } from "react";
import SetupKeysIcon from "@/assets/icons/SetupKeysIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { SDKKey } from "@/interfaces/SetupKey";
import PageContainer from "@/layouts/PageContainer";

const SetupKeysTable = lazy(
  () => import("@/modules/setup-keys/SetupKeysTable"),
);

export default function SetupKeys() {
  const { data: sdkKeys, isLoading } = useFetchApi<SDKKey[]>("/ui/sdk-keys");
  const { permission } = usePermissions();

  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/sdk-keys"}
            label={"SDK Keys"}
            icon={<SetupKeysIcon size={13} />}
          />
        </Breadcrumbs>
        <h1 ref={headingRef}>SDK Keys</h1>
        <Paragraph>
          SDK keys allow programmatic access to the Atla ZTA API. The raw key
          is shown only once on creation — store it securely.
        </Paragraph>
      </div>
      <RestrictedAccess
        page={"SDK Keys"}
        hasAccess={permission.setup_keys.read}
      >
        <Suspense fallback={<SkeletonTable />}>
          <SetupKeysTable
            headingTarget={portalTarget}
            setupKeys={sdkKeys}
            isLoading={isLoading}
          />
        </Suspense>
      </RestrictedAccess>
    </PageContainer>
  );
}
