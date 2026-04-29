"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import { usePortalElement } from "@hooks/usePortalElement";
import useFetchApi from "@utils/api";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { cn } from "@utils/helpers";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { ActivityIcon, ServerIcon } from "lucide-react";
import React, { Suspense } from "react";
import { useSWRConfig } from "swr";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import PageContainer from "@/layouts/PageContainer";

dayjs.extend(relativeTime);

// ── Types ─────────────────────────────────────────────────────────────────────
// Matches schemas.EdgeNode JSON output (snake_case field tags).

interface EdgeNode {
  id: string;
  edge_id: string;
  region: string;
  host: string;
  pubkey: string;
  wg_port: number;
  cpu_usage: number;
  mem_usage: number;
  latency_ms: number;
  last_seen: string;
  created_at: string;
}

// ── Metric bar ────────────────────────────────────────────────────────────────

function MetricBar({ value, warn = 70, danger = 90 }: { value: number; warn?: number; danger?: number }) {
  const color =
    value >= danger
      ? "bg-red-500"
      : value >= warn
        ? "bg-yellow-400"
        : "bg-green-400";

  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 rounded-full bg-nb-gray-900 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className="text-xs text-nb-gray-300 tabular-nums w-10 text-right">
        {value.toFixed(1)}%
      </span>
    </div>
  );
}

// ── Status dot ────────────────────────────────────────────────────────────────

function EdgeStatusDot({ lastSeen }: { lastSeen: string }) {
  // Consider edge stale if last heartbeat > 3 min ago
  const isOnline = dayjs().diff(dayjs(lastSeen), "minute") < 3;
  return (
    <span
      title={isOnline ? "Online" : "Stale"}
      className={cn(
        "inline-block h-2 w-2 rounded-full shrink-0",
        isOnline ? "bg-green-400 shadow-[0_0_6px_1px] shadow-green-500/50" : "bg-nb-gray-700",
      )}
    />
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────

function EdgeNodesTable({
  edges,
  isLoading,
  headingTarget,
}: {
  edges?: EdgeNode[];
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
}) {
  const { mutate } = useSWRConfig();
  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort-edges",
    [{ id: "last_seen", desc: true }],
  );

  const columns: ColumnDef<EdgeNode>[] = [
    {
      accessorKey: "host",
      header: ({ column }) => (
        <DataTableHeader column={column}>Node</DataTableHeader>
      ),
      sortingFn: "text",
      cell: ({ row }) => (
        <div className="flex items-center gap-3 py-1">
          <EdgeStatusDot lastSeen={row.original.last_seen} />
          <div>
            <p className="font-medium text-sm text-nb-gray-100">
              {row.original.edge_id || row.original.id}
            </p>
            <p className="text-xs text-nb-gray-500 font-mono mt-0.5">
              {row.original.host}:{row.original.wg_port}
            </p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "region",
      header: ({ column }) => (
        <DataTableHeader column={column}>Region</DataTableHeader>
      ),
      sortingFn: "text",
      cell: ({ row }) => (
        <span className="text-sm text-nb-gray-300">{row.original.region}</span>
      ),
    },
    {
      accessorKey: "cpu_usage",
      header: ({ column }) => (
        <DataTableHeader column={column}>CPU</DataTableHeader>
      ),
      sortingFn: "basic",
      cell: ({ row }) => <MetricBar value={row.original.cpu_usage} />,
    },
    {
      accessorKey: "mem_usage",
      header: ({ column }) => (
        <DataTableHeader column={column}>Memory</DataTableHeader>
      ),
      sortingFn: "basic",
      cell: ({ row }) => <MetricBar value={row.original.mem_usage} />,
    },
    {
      accessorKey: "latency_ms",
      header: ({ column }) => (
        <DataTableHeader column={column}>Latency</DataTableHeader>
      ),
      sortingFn: "basic",
      cell: ({ row }) => {
        const ms = row.original.latency_ms;
        const color =
          ms > 200 ? "text-red-400" : ms > 80 ? "text-yellow-400" : "text-green-400";
        return (
          <span className={cn("text-sm font-mono tabular-nums", color)}>
            {ms.toFixed(1)} ms
          </span>
        );
      },
    },
    {
      accessorKey: "last_seen",
      header: ({ column }) => (
        <DataTableHeader column={column}>Last Seen</DataTableHeader>
      ),
      sortingFn: "datetime",
      cell: ({ row }) => (
        <span
          className="text-sm text-nb-gray-400"
          title={dayjs(row.original.last_seen).format("MMM D, YYYY HH:mm:ss")}
        >
          {dayjs(row.original.last_seen).fromNow()}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      headingTarget={headingTarget}
      isLoading={isLoading}
      text={"Edge Nodes"}
      sorting={sorting}
      setSorting={setSorting}
      columns={columns}
      data={edges ?? []}
      searchPlaceholder={"Search by host or region…"}
    >
      {(table) => (
        <>
          <DataTableRowsPerPage table={table} disabled={!edges?.length} />
          <DataTableRefreshButton
            isDisabled={!edges?.length}
            onClick={() => mutate("/ui/edges")}
          />
        </>
      )}
    </DataTable>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EdgesPage() {
  const { data: edges, isLoading } = useFetchApi<EdgeNode[]>("/ui/edges");
  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <PageContainer>
      <div className="p-default py-6">
        <Breadcrumbs>
          <Breadcrumbs.Item
            href="/edges"
            label="Edge Nodes"
            icon={<ServerIcon size={13} />}
          />
        </Breadcrumbs>
        <h1 ref={headingRef}>Edge Nodes</h1>
        <Paragraph>
          Edge nodes receive Signed Edge Instructions (SEIs) from the control
          plane and enforce WireGuard sessions in real time. Nodes are
          considered online when their last heartbeat is under 3 minutes old.
        </Paragraph>
      </div>
      <Suspense fallback={<SkeletonTable />}>
        <EdgeNodesTable
          headingTarget={portalTarget}
          edges={edges}
          isLoading={isLoading}
        />
      </Suspense>
    </PageContainer>
  );
}
