"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { usePortalElement } from "@hooks/usePortalElement";
import useFetchApi from "@utils/api";
import { RadioTower } from "lucide-react";
import React, { lazy, Suspense } from "react";
import IntegrationIcon from "@/assets/icons/IntegrationIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { EventStream } from "@/interfaces/EventStream";
import PageContainer from "@/layouts/PageContainer";

const EventStreamsTable = lazy(
  () => import("@/modules/event-streams/EventStreamsTable"),
);

export default function EventStreamingPage() {
  const { permission } = usePermissions();
  const { data: streams, isLoading } = useFetchApi<EventStream[]>(
    "/ui/event-streams",
    false,
    true,
    permission.event_streaming.read,
  );

  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/integrations/identity-providers"}
            label={"Integrations"}
            icon={<IntegrationIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/integrations/event-streaming"}
            label={"Event Streaming"}
            icon={<RadioTower size={13} />}
            active
          />
        </Breadcrumbs>
        <h1 ref={headingRef}>Event Streaming</h1>
        <Paragraph>
          Send your audit events and access decisions to your SIEM as they
          happen, over a signed HTTPS webhook or Splunk HTTP Event Collector.
          Events arrive 30 to 40 seconds after they happen, at least once;
          deduplicate on the event id.
        </Paragraph>
      </div>
      <RestrictedAccess
        page={"Event Streaming"}
        hasAccess={permission.event_streaming.read}
      >
        <Suspense fallback={<SkeletonTable />}>
          <EventStreamsTable
            headingTarget={portalTarget}
            streams={streams}
            isLoading={isLoading}
          />
        </Suspense>
      </RestrictedAccess>
    </PageContainer>
  );
}
