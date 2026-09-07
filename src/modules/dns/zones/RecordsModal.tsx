"use client";

import Button from "@components/Button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/Dialog";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/Select";
import { notify } from "@components/Notification";
import useFetchApi, { useApiCall } from "@utils/api";
import { FileTextIcon, PlusCircle, Trash2 } from "lucide-react";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import {
  DNSRecord,
  DNSRecordCreateRequest,
  DNSRecordType,
  DNSZone,
} from "@/interfaces/DNSZone";

const RECORDS_URL = "/ui/dns/records";
const TYPE_OPTIONS: DNSRecordType[] = ["A", "AAAA", "CNAME", "TXT"];

type Props = {
  zone: DNSZone;
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export default function RecordsModal({ zone, open, onOpenChange }: Readonly<Props>) {
  const { mutate } = useSWRConfig();
  const { confirm } = useDialog();
  const listUrl = `${RECORDS_URL}?zone_id=${zone.id}`;
  const { data: records, isLoading } = useFetchApi<DNSRecord[]>(listUrl, false, false, open);
  const recordRequest = useApiCall<DNSRecord>(RECORDS_URL);

  const [name, setName] = useState("");
  const [type, setType] = useState<DNSRecordType>("A");
  const [value, setValue] = useState("");
  const [ttl, setTtl] = useState("3600");

  const handleAdd = () => {
    const body: DNSRecordCreateRequest = {
      zoneId: zone.id,
      name: name.trim(),
      type,
      value: value.trim(),
      ttl: parseInt(ttl || "3600"),
    };
    const promise = recordRequest.post(body).then(() => {
      mutate(listUrl);
      setName("");
      setValue("");
    });
    notify({
      title: "Add Record",
      description: "DNS record added.",
      promise,
      loadingMessage: "Adding...",
    });
  };

  const handleDelete = async (record: DNSRecord) => {
    const choice = await confirm({
      title: `Delete record '${record.name}'?`,
      description: "This record will be permanently deleted.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!choice) return;

    const promise = recordRequest.del(undefined, `/${record.id}`).then(() => mutate(listUrl));
    notify({
      title: "Delete Record",
      description: `Record '${record.name}' deleted.`,
      promise,
      loadingMessage: "Deleting...",
    });
  };

  const isValid = name.trim() && value.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={"max-w-xl"}>
        <DialogHeader>
          <DialogTitle>
            <div className={"flex items-center gap-2"}>
              <FileTextIcon size={16} />
              Records for {zone.domain}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className={"px-8 pb-4 flex flex-col gap-4"}>
          <div className={"grid grid-cols-4 gap-3 items-end"}>
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={"www"} />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as DNSRecordType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Value</Label>
              <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder={"10.100.0.5"} />
            </div>
            <div>
              <Label>TTL</Label>
              <Input value={ttl} onChange={(e) => setTtl(e.target.value)} type={"number"} />
            </div>
          </div>
          <Button variant={"secondary"} onClick={handleAdd} disabled={!isValid}>
            <PlusCircle size={16} />
            Add Record
          </Button>

          <div className={"flex flex-col gap-2 mt-2"}>
            {isLoading && <p className={"text-sm text-nb-gray-400"}>Loading records...</p>}
            {!isLoading && (records?.length ?? 0) === 0 && (
              <p className={"text-sm text-nb-gray-400"}>No records yet.</p>
            )}
            {records?.map((r) => (
              <div
                key={r.id}
                className={"flex items-center justify-between bg-nb-gray-900/40 border border-nb-gray-800 rounded-md px-3 py-2"}
              >
                <div className={"font-mono text-xs"}>
                  <span className={"text-nb-gray-500"}>{r.type}</span>{" "}
                  <span className={"text-nb-gray-100"}>{r.name}</span>{" "}
                  <span className={"text-nb-gray-400"}>→ {r.value}</span>{" "}
                  <span className={"text-nb-gray-500"}>({r.ttl}s)</span>
                </div>
                <Button variant={"danger-outline"} size={"sm"} onClick={() => handleDelete(r)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant={"primary"} onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
