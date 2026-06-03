"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import useFetchApi from "@utils/api";
import { RouteIcon } from "lucide-react";
import React, { lazy, Suspense } from "react";
import { AtlaNetwork, AtlaNetworkRoute } from "@/interfaces/AtlaNetwork";
import PageContainer from "@/layouts/PageContainer";

const AtlaRoutesTable = lazy(
  () => import("@/modules/atla-routes/AtlaRoutesTable"),
);

export default function AtlaRoutesPage() {
  const { data: routes, isLoading } = useFetchApi<AtlaNetworkRoute[]>(
    "/ui/routes",
  );
  const { data: networks } = useFetchApi<AtlaNetwork[]>("/ui/networks");

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/atla-routes"}
            label={"Network Routes"}
            icon={<RouteIcon size={13} />}
          />
        </Breadcrumbs>
        <h1>Network Routes</h1>
        <Paragraph>
          Per-network routing entries pushed to edge VRF tables. Optional via
          gateway — leave empty for a connected route. CIDRs are sanitised
          server-side (no default route / loopback / multicast).
        </Paragraph>
      </div>
      <Suspense fallback={<SkeletonTable />}>
        <AtlaRoutesTable
          data={routes}
          networks={networks}
          isLoading={isLoading}
        />
      </Suspense>
    </PageContainer>
  );
}