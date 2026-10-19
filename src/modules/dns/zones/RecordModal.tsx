"use client";

import Button from "@components/Button";
import FormModal from "@components/modal/FormModal";
import HelpText from "@components/HelpText";
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
import { useApiCall } from "@utils/api";
import { ClockIcon, GlobeIcon } from "lucide-react";
import React, { useState } from "react";
import {
  DNSRecord,
  DNSRecordCreateRequest,
  DNSRecordType,
  DNSRecordUpdateRequest,
  DNSZone,
} from "@/interfaces/DNSZone";

const RECORDS_URL = "/ui/dns/records";
const APEX_NAME = "@";
const TYPE_OPTIONS: DNSRecordType[] = ["A", "AAAA", "CNAME", "TXT"];
const TTL_OPTIONS = [
  { value: "60", label: "1 Min." },
  { value: "300", label: "5 Min." },
  { value: "900", label: "15 Min." },
  { value: "3600", label: "1 Hour" },
  { value: "14400", label: "4 Hours" },
  { value: "86400", label: "1 Day" },
];

const VALUE_FIELD: Record<
  DNSRecordType,
  { label: string; placeholder: string }
> = {
  A: { label: "IPv4 Address", placeholder: "10.100.0.5" },
  AAAA: { label: "IPv6 Address", placeholder: "fd00::5" },
  CNAME: { label: "Target", placeholder: "app.example.com" },
  TXT: { label: "Text", placeholder: "v=spf1 -all" },
};

type Props = {
  zone: DNSZone;
  /** When set the modal edits this record (only value and TTL are mutable). */
  record?: DNSRecord;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
};

export default function RecordModal({
  zone,
  record,
  open,
  onOpenChange,
  onSaved,
}: Readonly<Props>) {
  const recordRequest = useApiCall<DNSRecord>(RECORDS_URL);
  const isEdit = !!record;

  const [type, setType] = useState<DNSRecordType>(record?.type ?? "A");
  const [name, setName] = useState(
    record && record.name !== APEX_NAME ? record.name : "",
  );
  const [value, setValue] = useState(record?.value ?? "");
  const [ttl, setTtl] = useState(String(record?.ttl ?? 300));

  const ttlOptions = TTL_OPTIONS.some((o) => o.value === ttl)
    ? TTL_OPTIONS
    : [...TTL_OPTIONS, { value: ttl, label: `${ttl} sec.` }];
  const valueField = VALUE_FIELD[type];
  const isValid = value.trim().length > 0;

  const handleSave = () => {
    const ttlSeconds = parseInt(ttl);
    const request = record
      ? recordRequest.put(
          { value: value.trim(), ttl: ttlSeconds } as DNSRecordUpdateRequest,
          `/${record.id}`,
        )
      : recordRequest.post({
          zoneId: zone.id,
          name: name.trim() || APEX_NAME,
          type,
          value: value.trim(),
          ttl: ttlSeconds,
        } as DNSRecordCreateRequest);

    notify({
      title: isEdit ? "Update Record" : "Add Record",
      description: isEdit ? "DNS record updated." : "DNS record added.",
      promise: request.then(() => {
        onSaved();
        onOpenChange(false);
      }),
      loadingMessage: "Saving...",
    });
  };

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      maxWidthClass={"max-w-xl"}
      icon={<GlobeIcon size={20} />}
      title={isEdit ? "Update DNS Record" : "Add DNS Record"}
      description={
        isEdit
          ? `Update record of '${zone.domain}' zone`
          : `Add a record to '${zone.domain}' zone`
      }
      footer={
        <>
          <Button variant={"secondary"} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant={"primary"} onClick={handleSave} disabled={!isValid}>
            {isEdit ? "Save Changes" : "Add Record"}
          </Button>
        </>
      }
    >
      <div className={"px-8 py-6 flex flex-col gap-6"}>
        <div className={"flex items-center justify-between gap-6"}>
          <div>
            <Label>Record Type</Label>
            <HelpText margin={false}>
              {isEdit
                ? "The type of an existing record cannot be changed."
                : "Select the type of record you want to add"}
            </HelpText>
          </div>
          <Select
            value={type}
            onValueChange={(v) => setType(v as DNSRecordType)}
            disabled={isEdit}
          >
            <SelectTrigger className={"w-[130px]"}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Hostname</Label>
          <HelpText>
            Enter a subdomain, or leave empty or use @ for the primary domain.
          </HelpText>
          <div className={"flex"}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={"www"}
              disabled={isEdit}
              className={"!rounded-r-none"}
            />
            <div
              className={
                "flex h-[42px] items-center whitespace-nowrap rounded-r-md border border-l-0 border-nb-gray-700 bg-nb-gray-900 px-3 text-sm text-nb-gray-300"
              }
            >
              .{zone.domain}
            </div>
          </div>
        </div>

        <div className={"grid grid-cols-5 gap-4"}>
          <div className={"col-span-3"}>
            <Label>{valueField.label}</Label>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={valueField.placeholder}
              className={"font-mono"}
            />
          </div>
          <div className={"col-span-2"}>
            <Label>TTL (Time to Live)</Label>
            <Select value={ttl} onValueChange={setTtl}>
              <SelectTrigger>
                <div className={"flex items-center gap-2"}>
                  <ClockIcon size={14} />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {ttlOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </FormModal>
  );
}
