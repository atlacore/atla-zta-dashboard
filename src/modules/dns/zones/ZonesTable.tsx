"use client";

import Button from "@components/Button";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import { notify } from "@components/Notification";
import FormModal from "@components/modal/FormModal";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import CheckboxField from "@components/CheckboxField";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { useApiCall } from "@utils/api";
import dayjs from "dayjs";
import {
  CheckCircle2,
  DatabaseZapIcon,
  FileTextIcon,
  PenSquare,
  PlusCircle,
  Trash2,
  XCircle,
} from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { usePermissions } from "@/contexts/PermissionsProvider";
import {
  DNSZone,
  DNSZoneCreateRequest,
  DNSZoneUpdateRequest,
} from "@/interfaces/DNSZone";
import RecordsModal from "@/modules/dns/zones/RecordsModal";

const ZONES_URL = "/ui/dns/zones";

// ── Create Modal ──────────────────────────────────────────────────────────────

type CreateModalProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
};

function CreateZoneModal({ open, onOpenChange, onCreated }: CreateModalProps) {
  const [domain, setDomain] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const request = useApiCall<DNSZone>(ZONES_URL);

  const handleCreate = () => {
    const body: DNSZoneCreateRequest = {
      domain: domain.trim(),
      adminEmail: adminEmail.trim() || undefined,
    };
    const promise = request.post(body).then(() => {
      onCreated();
      handleClose();
    });
    notify({
      title: "Create DNS Zone",
      description: "DNS zone created — starts inactive until you enable it.",
      promise,
      loadingMessage: "Creating...",
    });
  };

  const handleClose = () => {
    setDomain("");
    setAdminEmail("");
    onOpenChange(false);
  };

  return (
    <FormModal
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
      icon={<DatabaseZapIcon size={20} />}
      title={"Create DNS Zone"}
      description={"Add an authoritative zone for this tenant."}
      footer={
        <>
          <Button variant={"secondary"} onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant={"primary"}
            onClick={handleCreate}
            disabled={!domain.trim()}
          >
            <PlusCircle size={16} />
            Create
          </Button>
        </>
      }
    >
      <div className={"px-8 pb-6 flex flex-col gap-5"}>
        <div>
          <Label>Domain</Label>
          <Input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder={"e.g. tenant.internal"}
          />
        </div>
        <div>
          <Label>Admin email</Label>
          <Input
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            placeholder={"Optional — used in the zone's SOA record"}
          />
        </div>
      </div>
    </FormModal>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

type EditModalProps = {
  zone: DNSZone;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
};

function EditZoneModal({ zone, open, onOpenChange, onSaved }: EditModalProps) {
  const [adminEmail, setAdminEmail] = useState(zone.adminEmail);
  const [isActive, setIsActive] = useState(zone.isActive);
  const request = useApiCall<DNSZone>(`${ZONES_URL}/${zone.id}`);

  const handleSave = () => {
    const body: DNSZoneUpdateRequest = {
      adminEmail: adminEmail.trim() || undefined,
      isActive,
    };
    const promise = request.put(body).then(() => {
      onSaved();
      onOpenChange(false);
    });
    notify({
      title: "Update DNS Zone",
      description: "DNS zone updated.",
      promise,
      loadingMessage: "Saving...",
    });
  };

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      icon={<PenSquare size={20} />}
      title={<>Edit {zone.domain}</>}
      description={"Change the zone's contact or whether it is served."}
      footer={
        <>
          <Button variant={"secondary"} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant={"primary"} onClick={handleSave}>
            Save
          </Button>
        </>
      }
    >
      <div className={"px-8 pb-6 flex flex-col gap-5"}>
        <div>
          <Label>Admin email</Label>
          <Input
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
          />
        </div>
        <CheckboxField
          label={"Active"}
          checked={isActive}
          onChange={setIsActive}
          description={"Inactive zones are not served"}
        />
      </div>
    </FormModal>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────

type Props = {
  zones?: DNSZone[];
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
};

export default function ZonesTable({
  zones,
  isLoading,
  headingTarget,
}: Readonly<Props>) {
  const { mutate } = useSWRConfig();
  const path = usePathname();
  const { permission } = usePermissions();
  const { confirm } = useDialog();
  const [createOpen, setCreateOpen] = useState(false);
  const [editZone, setEditZone] = useState<DNSZone | null>(null);
  const [recordsZone, setRecordsZone] = useState<DNSZone | null>(null);
  const request = useApiCall<DNSZone>(ZONES_URL);

  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [{ id: "createdAt", desc: true }],
  );

  const deleteZone = async (zone: DNSZone) => {
    const choice = await confirm({
      title: `Delete '${zone.domain}'?`,
      description: "This zone and its records will be permanently deleted.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!choice) return;

    const promise = request
      .del(undefined, `/${zone.id}`)
      .then(() => mutate(ZONES_URL));
    notify({
      title: "Delete DNS Zone",
      description: `Zone '${zone.domain}' deleted.`,
      promise,
      loadingMessage: "Deleting...",
    });
  };

  const columns: ColumnDef<DNSZone>[] = [
    {
      accessorKey: "domain",
      header: ({ column }) => (
        <DataTableHeader column={column}>Domain</DataTableHeader>
      ),
      sortingFn: "text",
      cell: ({ row }) => (
        <div className={"flex items-center gap-2"}>
          <DatabaseZapIcon size={14} className={"text-nb-gray-400 shrink-0"} />
          <span className={"font-medium text-sm"}>{row.original.domain}</span>
        </div>
      ),
    },
    {
      accessorKey: "isActive",
      header: ({ column }) => (
        <DataTableHeader column={column}>Active</DataTableHeader>
      ),
      cell: ({ row }) =>
        row.original.isActive ? (
          <CheckCircle2
            size={18}
            className={"text-green-500"}
            aria-label={"Active"}
          />
        ) : (
          <XCircle
            size={18}
            className={"text-nb-gray-500"}
            aria-label={"Inactive"}
          />
        ),
    },
    {
      accessorKey: "adminEmail",
      header: ({ column }) => (
        <DataTableHeader column={column}>Admin Email</DataTableHeader>
      ),
      cell: ({ row }) => (
        <span className={"text-sm text-nb-gray-300"}>
          {row.original.adminEmail}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableHeader column={column}>Created</DataTableHeader>
      ),
      sortingFn: "datetime",
      cell: ({ row }) => (
        <span className={"text-sm text-nb-gray-300"}>
          {dayjs(row.original.createdAt).format("MMM D, YYYY")}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className={"flex justify-end pr-4 gap-2"}>
          <Button
            variant={"default-outline"}
            size={"sm"}
            onClick={() => setRecordsZone(row.original)}
            tooltip={"Records"}
          >
            <FileTextIcon size={14} />
          </Button>
          <Button
            variant={"default-outline"}
            size={"sm"}
            onClick={() => setEditZone(row.original)}
            tooltip={"Edit"}
          >
            <PenSquare size={14} />
          </Button>
          <Button
            variant={"danger-outline"}
            size={"sm"}
            onClick={() => deleteZone(row.original)}
            tooltip={"Delete"}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <CreateZoneModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => mutate(ZONES_URL)}
      />
      {editZone && (
        <EditZoneModal
          zone={editZone}
          open={true}
          onOpenChange={(v) => {
            if (!v) setEditZone(null);
          }}
          onSaved={() => mutate(ZONES_URL)}
        />
      )}
      {recordsZone && (
        <RecordsModal
          zone={recordsZone}
          open={true}
          onOpenChange={(v) => {
            if (!v) setRecordsZone(null);
          }}
        />
      )}
      <DataTable
        headingTarget={headingTarget}
        isLoading={isLoading}
        text={"Zones"}
        sorting={sorting}
        setSorting={setSorting}
        columns={columns}
        data={zones ?? []}
        searchPlaceholder={"Search by domain..."}
        rightSide={() =>
          permission?.dns?.create ? (
            <Button variant={"primary"} onClick={() => setCreateOpen(true)}>
              <PlusCircle size={16} />
              Add Zone
            </Button>
          ) : null
        }
      >
        {(table) => (
          <>
            <DataTableRowsPerPage table={table} disabled={!zones?.length} />
            <DataTableRefreshButton
              isDisabled={!zones?.length}
              onClick={() => mutate(ZONES_URL)}
            />
          </>
        )}
      </DataTable>
    </>
  );
}
