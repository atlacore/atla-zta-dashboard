"use client";

import Badge from "@components/Badge";
import Breadcrumbs from "@components/Breadcrumbs";
import Paragraph from "@components/Paragraph";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import NoResults from "@components/ui/NoResults";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { usePortalElement } from "@hooks/usePortalElement";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import useFetchApi from "@utils/api";
import dayjs from "dayjs";
import { ReceiptTextIcon } from "lucide-react";
import React, { useState } from "react";
import SettingsIcon from "@/assets/icons/SettingsIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { BillingInvoice } from "@/interfaces/Billing";
import PageContainer from "@/layouts/PageContainer";
import { formatMoney } from "@/modules/settings/formatMoney";

const columns: ColumnDef<BillingInvoice>[] = [
  {
    accessorKey: "number",
    header: ({ column }) => (
      <DataTableHeader column={column}>Invoice</DataTableHeader>
    ),
    cell: ({ row }) => (
      <span className={"font-medium text-sm"}>
        {row.original.number ? `#${row.original.number}` : "-"}
      </span>
    ),
  },
  {
    accessorKey: "date",
    header: ({ column }) => (
      <DataTableHeader column={column}>Date</DataTableHeader>
    ),
    sortingFn: "datetime",
    cell: ({ row }) => (
      <span className={"text-sm text-nb-gray-300"}>
        {dayjs(row.original.date).format("MMM D, YYYY")}
      </span>
    ),
  },
  {
    accessorKey: "amount",
    header: ({ column }) => (
      <DataTableHeader column={column}>Amount</DataTableHeader>
    ),
    cell: ({ row }) => (
      <span className={"text-sm text-nb-gray-300"}>
        {formatMoney(row.original.amount, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableHeader column={column}>Status</DataTableHeader>
    ),
    cell: ({ row }) => <InvoiceStatus invoice={row.original} />,
  },
];

function InvoiceStatus({ invoice }: Readonly<{ invoice: BillingInvoice }>) {
  if (invoice.status === "VOID") return <Badge variant={"gray"}>Void</Badge>;
  if (invoice.balance > 0) {
    return (
      <Badge variant={"yellow"}>
        Due {formatMoney(invoice.balance, invoice.currency)}
      </Badge>
    );
  }
  return <Badge variant={"green"}>Paid</Badge>;
}

export default function Invoices() {
  const { permission } = usePermissions();
  const { data, isLoading, mutate } = useFetchApi<BillingInvoice[]>(
    "/ui/billing/invoices",
    true,
    false,
    permission.settings.read,
  );
  const [sorting, setSorting] = useState<SortingState>([
    { id: "date", desc: true },
  ]);
  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/settings/billing"}
            label={"Settings"}
            icon={<SettingsIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/settings/invoices"}
            label={"Invoices"}
            icon={<ReceiptTextIcon size={13} />}
            active
          />
        </Breadcrumbs>
        <h1 ref={headingRef}>Invoices</h1>
        <Paragraph>Invoices issued to your organization.</Paragraph>
      </div>
      <RestrictedAccess page={"Invoices"} hasAccess={permission.settings.read}>
        <DataTable
          headingTarget={portalTarget}
          isLoading={isLoading}
          text={"Invoices"}
          sorting={sorting}
          setSorting={setSorting}
          columns={columns}
          data={data ?? []}
          searchPlaceholder={"Search by invoice number..."}
          getStartedCard={
            <NoResults
              className={"py-4"}
              title={"No invoices yet"}
              description={
                "Invoices issued to your organization will appear here."
              }
              icon={
                <ReceiptTextIcon size={20} className={"text-nb-gray-300"} />
              }
            />
          }
        >
          {(table) => (
            <>
              <DataTableRowsPerPage table={table} disabled={!data?.length} />
              <DataTableRefreshButton
                isDisabled={!data?.length}
                onClick={() => mutate()}
              />
            </>
          )}
        </DataTable>
      </RestrictedAccess>
    </PageContainer>
  );
}
