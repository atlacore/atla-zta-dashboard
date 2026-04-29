"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { usePortalElement } from "@hooks/usePortalElement";
import useFetchApi from "@utils/api";
import dayjs from "dayjs";
import { ExternalLinkIcon, LogsIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useMemo } from "react";
import { DateRange } from "react-day-picker";
import ActivityIcon from "@/assets/icons/ActivityIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  BackendAuditEvent,
  transformAuditEvents,
} from "@/interfaces/ActivityEvent";
import PageContainer from "@/layouts/PageContainer";
import ActivityTable from "@/modules/activity/ActivityTable";

const defaultFromDate = dayjs().subtract(14, "day").toDate();
const defaultToDate = dayjs().toDate();

export default function Activity() {
  const { permission } = usePermissions();
  const path = usePathname();

  // Date range persisted in localStorage — shared with ActivityTable
  const [dateRange, setDateRange] = useLocalStorage<DateRange | undefined>(
    "netbird-table-range" + path,
    { from: defaultFromDate, to: defaultToDate },
  );

  // Build URL with server-side from/to query params
  const eventsUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (dateRange?.from)
      params.set("from", dayjs(dateRange.from).format("YYYY-MM-DD"));
    if (dateRange?.to)
      params.set("to", dayjs(dateRange.to).add(1, "day").format("YYYY-MM-DD"));
    const qs = params.toString();
    return `/ui/events${qs ? `?${qs}` : ""}`;
  }, [dateRange]);

  const { data: rawEvents, isLoading, mutate } =
    useFetchApi<BackendAuditEvent[]>(eventsUrl);

  const events = useMemo(
    () => (rawEvents ? transformAuditEvents(rawEvents) : undefined),
    [rawEvents],
  );

  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            label={"Activity"}
            disabled={true}
            icon={<ActivityIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/events/audit"}
            label={"Audit Events"}
            icon={<LogsIcon size={18} />}
          />
        </Breadcrumbs>
        <h1 ref={headingRef}>Audit Events</h1>
        <Paragraph>Here you can see all the audit activity events.</Paragraph>
        <Paragraph>
          Learn more about{" "}
          <InlineLink
            href={"https://docs.netbird.io/how-to/audit-events-logging"}
            target={"_blank"}
          >
            Audit Events
            <ExternalLinkIcon size={12} />
          </InlineLink>
          in our documentation.
        </Paragraph>
      </div>
      <RestrictedAccess page={"Activity"} hasAccess={permission.events.read}>
        <ActivityTable
          events={events}
          isLoading={isLoading}
          headingTarget={portalTarget}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          onRefresh={() => mutate()}
        />
      </RestrictedAccess>
    </PageContainer>
  );
}
