"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { usePortalElement } from "@hooks/usePortalElement";
import React, { lazy, Suspense } from "react";
import PeerIcon from "@/assets/icons/PeerIcon";
import PeersProvider, { usePeers } from "@/contexts/PeersProvider";
import PageContainer from "@/layouts/PageContainer";

const PeersTable = lazy(() => import("@/modules/peers/PeersTable"));

export default function Peers() {
  return (
    <PageContainer>
      <PeersProvider>
        <PeersView />
      </PeersProvider>
    </PageContainer>
  );
}

function PeersView() {
  const { peers, isLoading } = usePeers();
  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/peers"}
            label={"Peers"}
            icon={<PeerIcon size={13} />}
          />
        </Breadcrumbs>
        <h1 ref={headingRef}>Peers</h1>
        <Paragraph>
          Active WireGuard sessions connected to your network. Revoke any
          session to disconnect a device immediately.
        </Paragraph>
      </div>
      <Suspense fallback={<SkeletonTable />}>
        <PeersTable
          isLoading={isLoading}
          peers={peers}
          headingTarget={portalTarget}
        />
      </Suspense>
    </>
  );
}
