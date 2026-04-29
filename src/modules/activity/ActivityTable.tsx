import { DatePickerWithRange } from "@components/DatePickerWithRange";
import InlineLink from "@components/InlineLink";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import AddPeerButton from "@components/ui/AddPeerButton";
import GetStartedTest from "@components/ui/GetStartedTest";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import dayjs from "dayjs";
import { uniqBy } from "lodash";
import { ExternalLinkIcon } from "lucide-react";
import React, { useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import PeerIcon from "@/assets/icons/PeerIcon";
import { ActivityEvent } from "@/interfaces/ActivityEvent";
import { ActivityEntryRow } from "@/modules/activity/ActivityEntryRow";
import { ActivityEventCodeSelector } from "@/modules/activity/ActivityEventCodeSelector";
import {
  UsersDropdownSelector,
  UserSelectOption,
} from "@/modules/activity/UsersDropdownSelector";

type Props = {
  events?: ActivityEvent[];
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
  /** Controlled date range — server-side filtering is done by the parent. */
  dateRange?: DateRange;
  /** Called when the user picks a new date range in the DatePicker. */
  onDateRangeChange?: (range: DateRange | undefined) => void;
  /** Called when the user clicks the refresh button. */
  onRefresh?: () => void;
};

const ActivityFeedColumnsTable: ColumnDef<ActivityEvent>[] = [
  {
    accessorKey: "activity_code",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Code</DataTableHeader>;
    },
    sortingFn: "text",
    filterFn: "arrIncludesSomeExact",
    cell: ({ row }) => <ActivityEntryRow event={row.original} />,
  },
  {
    id: "activity_text",
    accessorFn: (event) => {
      try {
        if (event.meta) {
          return Object.keys(event.meta)
            .map((key) => {
              return `${event?.meta[key]}`;
            })
            .join(" ");
        }
      } catch (error) {
        return "";
      }
    },
  },
  {
    accessorKey: "timestamp",
    id: "timestamp",
  },
  {
    accessorKey: "activity",
    id: "name",
  },
  {
    id: "initiator_email",
    accessorFn: (row) => row.initiator_email || "System",
    filterFn: "exactMatch",
  },
];

const defaultFromDate = dayjs().subtract(14, "day").toDate();
const defaultToDate = dayjs().toDate();

export default function ActivityTable({
  events,
  isLoading,
  headingTarget,
  dateRange,
  onDateRangeChange,
  onRefresh,
}: Props) {
  // Default sorting state of the table
  const [sorting, setSorting] = useState<SortingState>([
    {
      id: "timestamp",
      desc: true,
    },
  ]);

  // Local display state for the DatePicker (synced from controlled prop)
  const pickerValue = useMemo<DateRange | undefined>(() => {
    if (dateRange) {
      return {
        from: dayjs(dateRange.from).toDate(),
        to: dayjs(dateRange.to).toDate(),
      };
    }
    return { from: defaultFromDate, to: defaultToDate };
  }, [dateRange]);

  const userSelectOptions = useMemo(() => {
    const uniqueUsers = uniqBy(events, (event) => event.initiator_email);
    return uniqueUsers.map((event) => {
      return {
        name: event.initiator_name,
        id: event.initiator_id,
        email: event.initiator_email || "System",
        external: !!event?.meta?.external,
      } as UserSelectOption;
    });
  }, [events]);

  return (
    <DataTable
      headingTarget={headingTarget}
      paginationClassName={"max-w-[800px]"}
      as={"div"}
      text={"Audit Events"}
      sorting={sorting}
      setSorting={setSorting}
      wrapperClassName={"gap-0 flex flex-col"}
      tableClassName={"px-8 pt-4"}
      columns={ActivityFeedColumnsTable}
      data={events}
      searchPlaceholder={"Search by audit name, user, peer, meta..."}
      isLoading={isLoading}
      columnVisibility={{
        timestamp: false,
        name: false,
        activity_text: false,
        initiator_email: false,
      }}
      getStartedCard={
        <GetStartedTest
          icon={
            <SquareIcon
              icon={<PeerIcon className={"fill-nb-gray-200"} size={20} />}
              color={"gray"}
              size={"large"}
            />
          }
          title={"Get Started with Atla ZTA"}
          description={
            "It looks like you don't have any audit events yet.\n" +
            "Events will appear here as actions are performed."
          }
          button={<AddPeerButton />}
          learnMore={
            <>
              Learn more in our{" "}
              <InlineLink
                href={"https://docs.netbird.io/how-to/getting-started"}
                target={"_blank"}
              >
                Getting Started Guide
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </>
          }
        />
      }
      onFilterReset={() => {
        const date = { from: defaultFromDate, to: defaultToDate };
        onDateRangeChange?.(date);
      }}
    >
      {(table) => {
        return (
          <>
            <DatePickerWithRange
              value={pickerValue}
              onChange={(range) => {
                onDateRangeChange?.(range);
                table.setPageIndex(0);
              }}
            />
            {events && (
              <ActivityEventCodeSelector
                events={events}
                values={
                  (table
                    .getColumn("activity_code")
                    ?.getFilterValue() as string[]) || []
                }
                onChange={(items) => {
                  table.setPageIndex(0);
                  if (items.length == 0) {
                    table.getColumn("activity_code")?.setFilterValue(undefined);
                    return;
                  } else {
                    table.getColumn("activity_code")?.setFilterValue(items);
                  }
                }}
              />
            )}
            {events && (
              <UsersDropdownSelector
                options={userSelectOptions}
                value={
                  (table
                    .getColumn("initiator_email")
                    ?.getFilterValue() as string) || ""
                }
                onChange={(item) => {
                  table.setPageIndex(0);
                  table.getColumn("initiator_email")?.setFilterValue(item);
                }}
              />
            )}
            <DataTableRowsPerPage
              table={table}
              disabled={events?.length == 0}
            />
            <DataTableRefreshButton
              isDisabled={events?.length == 0}
              onClick={() => onRefresh?.()}
            />
          </>
        );
      }}
    </DataTable>
  );
}
