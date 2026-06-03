"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import useFetchApi from "@utils/api";
import { NetworkIcon } from "lucide-react";
import React, { lazy, Suspense } from "react";
import { AtlaNetwork } from "@/interfaces/AtlaNetwork";
import PageContainer from "@/layouts/PageContainer";

const AtlaNetworksTable = lazy(
  () => import("@/modules/atla-networks/AtlaNetworksTable"),
);

export default function AtlaNetworksPage() {
  const { data: networks, isLoading } = useFetchApi<AtlaNetwork[]>(
    "/ui/networks",
  );

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/atla-networks"}
            label={"Networks"}
            icon={<NetworkIcon size={13} />}
          />
        </Breadcrumbs>
        <h1>Networks</h1>
        <Paragraph>
          Networks map a tenant resource to a CIDR. Reachability is delivered to
          devices through WireGuard; per-network routing rules live under{" "}
          <a className={"underline"} href={"/atla-routes"}>
            Network Routes
          </a>
          .
        </Paragraph>
      </div>
      <Suspense fallback={<SkeletonTable />}>
        <AtlaNetworksTable data={networks} isLoading={isLoading} />
      </Suspense>
    </PageContainer>
  );
}