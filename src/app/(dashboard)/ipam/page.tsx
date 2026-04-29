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
import { NetworkIcon } from "lucide-react";
import React, { Suspense } from "react";
import { useSWRConfig } from "swr";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import PageContainer from "@/layouts/PageContainer";

// ── Types ─────────────────────────────────────────────────────────────────────
// Matches schemas.IpamAddress JSON output with preloaded Pool and Resource.

type IpamStatus = "pending" | "active" | "released" | "error";

interface IpamPool {
  id: number;
  region: string;
  cidr: string;
  createdAt: string;
}

interface IpamResource {
  id: string;
  name: string;
  kind: string;
  region: string;
  arn: string;
}

interface IpamAddress {
  id: number;
  tenantID: string;
  region: string;
  ip: string;
  pool: IpamPool;
  resource: IpamResource;
  status: IpamStatus;
  createdAt: string;
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<IpamStatus, string> = {
  active:   "bg-green-500/10 text-green-400 border-green-500/20",
  pending:  "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  released: "bg-nb-gray-900/60 text-nb-gray-500 border-nb-gray-800",
  error:    "bg-red-500/10 text-red-400 border-red-500/20",
};

function StatusBadge({ status }: { status: IpamStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
        STATUS_STYLES[status] ?? STATUS_STYLES.pending,
      )}
    >
      {status}
    </span>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────

function IpamTable({
  addresses,
  isLoading,
  headingTarget,
}: {
  addresses?: IpamAddress[];
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
}) {
  const { mutate } = useSWRConfig();
  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort-ipam",
    [{ id: "createdAt", desc: true }],
  );

  const columns: ColumnDef<IpamAddress>[] = [
    {
      accessorKey: "ip",
      header: ({ column }) => (
        <DataTableHeader column={column}>IP Address</DataTableHeader>
      ),
      sortingFn: "text",
      cell: ({ row }) => (
        <span className="font-mono text-sm text-nb-gray-100 tabular-nums">
          {row.original.ip}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableHeader column={column}>Status</DataTableHeader>
      ),
      sortingFn: "text",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "resource.name",
      header: ({ column }) => (
        <DataTableHeader column={column}>Resource</DataTableHeader>
      ),
      sortingFn: "text",
      cell: ({ row }) => {
        const { resource } = row.original;
        if (!resource?.name) return <span className="text-nb-gray-600 text-sm">—</span>;
        return (
          <div>
            <p className="text-sm text-nb-gray-100">{resource.name}</p>
            <p className="text-xs text-nb-gray-500 font-mono mt-0.5">{resource.kind}</p>
          </div>
        );
      },
    },
    {
      accessorKey: "pool.cidr",
      header: ({ column }) => (
        <DataTableHeader column={column}>Pool (CIDR)</DataTableHeader>
      ),
      sortingFn: "text",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-nb-gray-400">
          {row.original.pool?.cidr ?? "—"}
        </span>
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
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableHeader column={column}>Allocated</DataTableHeader>
      ),
      sortingFn: "datetime",
      cell: ({ row }) => (
        <span className="text-sm text-nb-gray-400">
          {dayjs(row.original.createdAt).format("MMM D, YYYY HH:mm")}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      headingTarget={headingTarget}
      isLoading={isLoading}
      text={"IPAM Addresses"}
      sorting={sorting}
      setSorting={setSorting}
      columns={columns}
      data={addresses ?? []}
      searchPlaceholder={"Search by IP, resource or region…"}
    >
      {(table) => (
        <>
          <DataTableRowsPerPage table={table} disabled={!addresses?.length} />
          <DataTableRefreshButton
            isDisabled={!addresses?.length}
            onClick={() => mutate("/ui/ipam-addresses")}
          />
        </>
      )}
    </DataTable>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function IpamPage() {
  const { data: addresses, isLoading } =
    useFetchApi<IpamAddress[]>("/ui/ipam-addresses");
  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <PageContainer>
      <div className="p-default py-6">
        <Breadcrumbs>
          <Breadcrumbs.Item
            href="/ipam"
            label="IPAM"
            icon={<NetworkIcon size={13} />}
          />
        </Breadcrumbs>
        <h1 ref={headingRef}>IP Address Management</h1>
        <Paragraph>
          Allocated IP addresses from the per-tenant IPAM pool. Each active
          WireGuard session is assigned a{" "}
          <span className="font-mono">/32</span> from the pool and a VRF host
          route on the edge node.
        </Paragraph>
      </div>
      <Suspense fallback={<SkeletonTable />}>
        <IpamTable
          headingTarget={portalTarget}
          addresses={addresses}
          isLoading={isLoading}
        />
      </Suspense>
    </PageContainer>
  );
}
