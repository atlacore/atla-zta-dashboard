"use client";

import ActionTooltip from "@components/ActionTooltip";
import Button from "@components/Button";
import CheckboxField from "@components/CheckboxField";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import FormModal from "@components/modal/FormModal";
import { notify } from "@components/Notification";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/Select";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import NoResults from "@components/ui/NoResults";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  Copy,
  KeyRound,
  PlusCircle,
  RadioTower,
  Send,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  EventStream,
  EventStreamCreateRequest,
  EventStreamKind,
  EventStreamTestResult,
  EventStreamUpdateRequest,
  EventStreamWithSecret,
} from "@/interfaces/EventStream";

dayjs.extend(relativeTime);

const STREAMS_URL = "/ui/event-streams";

const KIND_OPTIONS: { value: EventStreamKind; label: string }[] = [
  { value: "webhook", label: "Webhook" },
  { value: "splunk_hec", label: "Splunk HEC" },
];

// The same checks the control plane runs, so a form error shows before the request
const PREFIX_PATTERN = /^[a-z][a-z0-9_.]{0,99}$/;
const HEADER_NAME_PATTERN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]{1,100}$/;
const SPLUNK_FIELD_PATTERN = /^[A-Za-z0-9_][A-Za-z0-9_:.-]{0,99}$/;
const RESERVED_HEADERS = [
  "content-type",
  "content-length",
  "host",
  "transfer-encoding",
  "connection",
];

type HeaderRow = { name: string; value: string };

const parsePrefixes = (value: string) =>
  value
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

function httpsURL(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}

function headerProblem(rows: HeaderRow[]): string | undefined {
  const filled = rows.filter((r) => r.name.trim() || r.value);
  if (filled.length > 10) return "At most 10 headers";
  for (const row of filled) {
    const name = row.name.trim();
    if (!HEADER_NAME_PATTERN.test(name))
      return `"${name}" is not a header name`;
    const lower = name.toLowerCase();
    if (RESERVED_HEADERS.includes(lower) || lower.startsWith("x-atla-"))
      return `${name} is set by Atla`;
    if (!row.value || row.value.length > 1024 || /[\r\n]/.test(row.value))
      return `The value of ${name} must be 1-1024 characters on one line`;
  }
  return undefined;
}

function formatLag(seconds: number) {
  if (seconds < 120) return `${seconds} s`;
  if (seconds < 7200) return `${Math.round(seconds / 60)} min`;
  if (seconds < 172800) return `${Math.round(seconds / 3600)} h`;
  return `${Math.round(seconds / 86400)} d`;
}

// ── Copy field ───────────────────────────────────────────────────────────────

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className={"flex flex-col gap-2"}>
      <Label>{label}</Label>
      <Input
        readOnly
        value={value}
        className={"font-mono text-xs"}
        customSuffix={
          <ActionTooltip label={"Copy"}>
            <button
              type={"button"}
              onClick={handleCopy}
              className={"text-nb-gray-400 hover:text-white transition-colors"}
            >
              <Copy size={14} />
            </button>
          </ActionTooltip>
        }
      />
      {copied && <p className={"text-xs text-green-400"}>Copied!</p>}
    </div>
  );
}

// ── Signing secret, shown once ───────────────────────────────────────────────

function SigningSecretModal({
  secret,
  onClose,
}: {
  secret: string | null;
  onClose: () => void;
}) {
  return (
    <FormModal
      open={!!secret}
      onOpenChange={(v) => !v && onClose()}
      icon={<KeyRound size={20} />}
      title={"Signing secret"}
      description={
        "Copy it now: it is not shown again. Your receiver uses it to check every batch."
      }
      footer={
        <Button variant={"primary"} onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className={"px-8 pb-6 flex flex-col gap-4"}>
        <CopyField label={"Signing secret"} value={secret ?? ""} />
        <HelpText>
          Each request carries{" "}
          <span className={"font-mono"}>X-Atla-Timestamp</span> and{" "}
          <span className={"font-mono"}>X-Atla-Signature: v1=&lt;hex&gt;</span>,
          the HMAC-SHA256 of{" "}
          <span className={"font-mono"}>
            &lt;timestamp&gt;.&lt;raw body&gt;
          </span>{" "}
          under this secret. Refuse a request whose signature does not match or
          whose timestamp is more than 5 minutes old.
        </HelpText>
      </div>
    </FormModal>
  );
}

// ── Headers editor ───────────────────────────────────────────────────────────

function HeadersEditor({
  rows,
  onChange,
}: {
  rows: HeaderRow[];
  onChange: (rows: HeaderRow[]) => void;
}) {
  const update = (index: number, patch: Partial<HeaderRow>) =>
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  return (
    <div className={"flex flex-col gap-2"}>
      {rows.map((row, index) => (
        <div key={index} className={"flex gap-2 items-center"}>
          <Input
            value={row.name}
            onChange={(e) => update(index, { name: e.target.value })}
            placeholder={"Authorization"}
          />
          <Input
            value={row.value}
            onChange={(e) => update(index, { value: e.target.value })}
            placeholder={"Bearer …"}
            type={"password"}
          />
          <Button
            variant={"secondary"}
            className={"!px-3"}
            onClick={() => onChange(rows.filter((_, i) => i !== index))}
            tooltip={"Remove"}
          >
            <X size={14} />
          </Button>
        </div>
      ))}
      <div>
        <Button
          variant={"secondary"}
          size={"xs"}
          onClick={() => onChange([...rows, { name: "", value: "" }])}
        >
          <PlusCircle size={14} />
          Add header
        </Button>
      </div>
    </div>
  );
}

// ── Create / edit form ───────────────────────────────────────────────────────

type FormModalProps = {
  open: boolean;
  stream: EventStream | null;
  onOpenChange: (v: boolean) => void;
  onSaved: (secret?: string) => void;
};

function EventStreamFormModal({
  open,
  stream,
  onOpenChange,
  onSaved,
}: FormModalProps) {
  const editing = !!stream;
  const [name, setName] = useState("");
  const [kind, setKind] = useState<EventStreamKind>("webhook");
  const [url, setURL] = useState("");
  const [prefixes, setPrefixes] = useState("");
  const [includeDecisions, setIncludeDecisions] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [headers, setHeaders] = useState<HeaderRow[]>([]);
  // headers are replaced as a whole, so they are sent only once the operator touched them
  const [headersTouched, setHeadersTouched] = useState(false);
  const [splunkToken, setSplunkToken] = useState("");
  const [splunkIndex, setSplunkIndex] = useState("");
  const [splunkSourcetype, setSplunkSourcetype] = useState("");
  const request = useApiCall<EventStreamWithSecret>(STREAMS_URL);

  useEffect(() => {
    if (!open) return;
    setName(stream?.name ?? "");
    setKind(stream?.kind ?? "webhook");
    setURL(stream?.url ?? "");
    setPrefixes(stream?.eventPrefixes.join(", ") ?? "");
    setIncludeDecisions(stream?.includeDecisions ?? true);
    setEnabled(stream?.enabled ?? true);
    setHeaders([]);
    setHeadersTouched(false);
    setSplunkToken("");
    setSplunkIndex(stream?.splunkIndex ?? "");
    setSplunkSourcetype(stream?.splunkSourcetype ?? "");
  }, [open, stream]);

  const prefixList = parsePrefixes(prefixes);
  const problems = [
    !name.trim() && "Name is required",
    !httpsURL(url.trim()) && "The URL must be https, without credentials",
    prefixList.length > 50 && "At most 50 prefixes",
    prefixList.find((p) => !PREFIX_PATTERN.test(p)) &&
      "Prefixes are lowercase event names or their beginnings, e.g. session.",
    kind === "webhook" && headersTouched && headerProblem(headers),
    kind === "splunk_hec" &&
      !editing &&
      !splunkToken &&
      "The HEC token is required",
    kind === "splunk_hec" &&
      splunkIndex &&
      !SPLUNK_FIELD_PATTERN.test(splunkIndex) &&
      "The index is not a Splunk name",
    kind === "splunk_hec" &&
      splunkSourcetype &&
      !SPLUNK_FIELD_PATTERN.test(splunkSourcetype) &&
      "The sourcetype is not a Splunk name",
  ].filter(Boolean) as string[];

  const headerMap = () =>
    Object.fromEntries(
      headers.filter((r) => r.name.trim()).map((r) => [r.name.trim(), r.value]),
    );

  const save = () => {
    let promise: Promise<EventStreamWithSecret | void>;
    if (editing && stream) {
      const body: EventStreamUpdateRequest = {
        name: name.trim(),
        url: url.trim(),
        eventPrefixes: prefixList,
        includeDecisions,
        enabled,
      };
      if (kind === "webhook" && headersTouched) body.headers = headerMap();
      if (kind === "splunk_hec") {
        if (splunkToken) body.splunkToken = splunkToken;
        body.splunkIndex = splunkIndex.trim();
        body.splunkSourcetype = splunkSourcetype.trim();
      }
      promise = request.patch(body, `/${stream.id}`).then(() => {
        onSaved();
        onOpenChange(false);
      });
    } else {
      const body: EventStreamCreateRequest = {
        name: name.trim(),
        kind,
        url: url.trim(),
        eventPrefixes: prefixList,
        includeDecisions,
        enabled,
      };
      if (kind === "webhook" && headersTouched) body.headers = headerMap();
      if (kind === "splunk_hec") {
        body.splunkToken = splunkToken;
        if (splunkIndex.trim()) body.splunkIndex = splunkIndex.trim();
        if (splunkSourcetype.trim())
          body.splunkSourcetype = splunkSourcetype.trim();
      }
      promise = request.post(body).then((created) => {
        onSaved(created.signingSecret);
        onOpenChange(false);
      });
    }
    notify({
      title: editing ? "Update Event Stream" : "Create Event Stream",
      description: editing
        ? "Event stream updated."
        : "Event stream created. It exports events from now on.",
      promise,
      loadingMessage: "Saving event stream...",
    });
  };

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      icon={<RadioTower size={20} />}
      title={editing ? "Edit Event Stream" : "Add Event Stream"}
      description={
        "Where your tenant's events go. Secrets are stored in Vault and never shown again."
      }
      maxWidthClass={"max-w-2xl"}
      footer={
        <>
          <Button variant={"secondary"} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={"primary"}
            onClick={save}
            disabled={problems.length > 0}
          >
            {editing ? "Save" : "Add"}
          </Button>
        </>
      }
    >
      <div className={"px-8 pb-6 flex flex-col gap-5"}>
        <div className={"grid grid-cols-2 gap-4"}>
          <div>
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={"e.g. siem"}
            />
          </div>
          <div>
            <Label>Destination</Label>
            <Select
              value={kind}
              onValueChange={(v) => setKind(v as EventStreamKind)}
              disabled={editing}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KIND_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>URL</Label>
          <Input
            value={url}
            onChange={(e) => setURL(e.target.value)}
            placeholder={
              kind === "splunk_hec"
                ? "https://splunk.example.com:8088/services/collector/event"
                : "https://siem.example.com/ingest/atla"
            }
          />
          <HelpText>
            Must resolve to a public address; private and cloud metadata
            addresses are refused unless your operator allows them.
          </HelpText>
        </div>

        {kind === "webhook" && (
          <div>
            <Label>Custom headers</Label>
            {editing && !headersTouched && (
              <HelpText>
                {stream?.headerNames.length
                  ? `Current: ${stream.headerNames.join(
                      ", ",
                    )} (values hidden). Adding a header replaces all of them.`
                  : "No custom headers."}
              </HelpText>
            )}
            <HeadersEditor
              rows={headers}
              onChange={(rows) => {
                setHeaders(rows);
                setHeadersTouched(true);
              }}
            />
          </div>
        )}

        {kind === "splunk_hec" && (
          <div className={"grid grid-cols-3 gap-4"}>
            <div>
              <Label>HEC token</Label>
              <Input
                value={splunkToken}
                onChange={(e) => setSplunkToken(e.target.value)}
                type={"password"}
                placeholder={editing ? "Unchanged" : ""}
              />
            </div>
            <div>
              <Label>Index</Label>
              <Input
                value={splunkIndex}
                onChange={(e) => setSplunkIndex(e.target.value)}
                placeholder={"Token default"}
              />
            </div>
            <div>
              <Label>Sourcetype</Label>
              <Input
                value={splunkSourcetype}
                onChange={(e) => setSplunkSourcetype(e.target.value)}
                placeholder={"atla:event"}
              />
            </div>
          </div>
        )}

        <div>
          <Label>Event name prefixes</Label>
          <Input
            value={prefixes}
            onChange={(e) => setPrefixes(e.target.value)}
            placeholder={"All events, or e.g. session., user.login_failed"}
          />
          <HelpText>Comma-separated. Empty exports every audit event.</HelpText>
        </div>

        <CheckboxField
          label={"Include access decisions"}
          checked={includeDecisions}
          onChange={setIncludeDecisions}
          description={
            "Every allow and deny of the PDP: connects, evaluations and WAF requests."
          }
        />
        <CheckboxField
          label={"Enabled"}
          checked={enabled}
          onChange={setEnabled}
          description={
            "A disabled stream keeps its position and catches up within 7 days."
          }
        />

        {problems.length > 0 && (
          <p className={"text-xs text-red-400"}>{problems[0]}</p>
        )}
      </div>
    </FormModal>
  );
}

// ── Status ───────────────────────────────────────────────────────────────────

function StatusBadge({ stream }: { stream: EventStream }) {
  const failing = stream.consecutiveFailures > 0;
  const label = !stream.enabled
    ? "Disabled"
    : failing
    ? `Failing (${stream.consecutiveFailures})`
    : "Healthy";
  return (
    <span
      title={failing ? stream.lastError : undefined}
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        !stream.enabled &&
          "bg-nb-gray-900/60 text-nb-gray-500 border-nb-gray-800",
        stream.enabled &&
          failing &&
          "bg-red-500/10 text-red-400 border-red-500/20",
        stream.enabled &&
          !failing &&
          "bg-green-500/10 text-green-400 border-green-500/20",
      )}
    >
      {label}
    </span>
  );
}

// ── Table ────────────────────────────────────────────────────────────────────

type Props = {
  streams?: EventStream[];
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
};

export default function EventStreamsTable({
  streams,
  isLoading,
  headingTarget,
}: Readonly<Props>) {
  const { mutate } = useSWRConfig();
  const path = usePathname();
  const { permission } = usePermissions();
  const { confirm } = useDialog();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EventStream | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const request = useApiCall<EventStreamWithSecret>(STREAMS_URL);
  const testRequest = useApiCall<EventStreamTestResult>(STREAMS_URL);

  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [{ id: "createdAt", desc: false }],
  );

  const refresh = () => mutate(STREAMS_URL);

  const remove = async (stream: EventStream) => {
    const choice = await confirm({
      title: `Delete '${stream.name}'?`,
      description:
        "Events stop flowing to this destination and its secrets are removed from Vault.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!choice) return;
    notify({
      title: "Delete Event Stream",
      description: `Event stream '${stream.name}' deleted.`,
      promise: request.del(undefined, `/${stream.id}`).then(refresh),
      loadingMessage: "Deleting event stream...",
    });
  };

  const rotate = async (stream: EventStream) => {
    const choice = await confirm({
      title: `Rotate the signing secret of '${stream.name}'?`,
      description:
        "Batches are signed with the new secret right away: update your receiver at the same time.",
      confirmText: "Rotate",
      cancelText: "Cancel",
      type: "warning",
    });
    if (!choice) return;
    notify({
      title: "Rotate Signing Secret",
      description: "New signing secret created.",
      promise: request
        .post(undefined, `/${stream.id}/rotate-secret`)
        .then((rotated) => setSecret(rotated.signingSecret ?? null)),
      loadingMessage: "Rotating...",
    });
  };

  const test = (stream: EventStream) => {
    notify({
      title: "Test Event",
      description: `The receiver of '${stream.name}' accepted the test event.`,
      promise: testRequest
        .post(undefined, `/${stream.id}/test`)
        .then((result) => {
          // notify shows a rejection's code and message as the error toast
          if (!result.delivered) {
            throw {
              code: result.statusCode || 400,
              message: result.error || "Not delivered",
            };
          }
          return result;
        }),
      loadingMessage: "Sending a test event...",
    });
  };

  const columns: ColumnDef<EventStream>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableHeader column={column}>Name</DataTableHeader>
      ),
      sortingFn: "text",
      cell: ({ row }) => (
        <div className={"flex flex-col"}>
          <span className={"font-medium text-sm"}>{row.original.name}</span>
          <span className={"text-xs text-nb-gray-400"}>
            {KIND_OPTIONS.find((o) => o.value === row.original.kind)?.label}
            {row.original.includeDecisions ? " · with decisions" : ""}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "url",
      header: ({ column }) => (
        <DataTableHeader column={column}>Destination</DataTableHeader>
      ),
      sortingFn: "text",
      cell: ({ row }) => (
        <span
          className={
            "font-mono text-xs text-nb-gray-400 max-w-[320px] truncate block"
          }
          title={row.original.url}
        >
          {row.original.url}
        </span>
      ),
    },
    {
      id: "status",
      header: ({ column }) => (
        <DataTableHeader column={column}>Status</DataTableHeader>
      ),
      cell: ({ row }) => <StatusBadge stream={row.original} />,
    },
    {
      id: "delivery",
      header: ({ column }) => (
        <DataTableHeader column={column}>Last delivery</DataTableHeader>
      ),
      cell: ({ row }) => (
        <div className={"flex flex-col text-xs text-nb-gray-400"}>
          <span>
            {row.original.lastDeliveryAt
              ? dayjs(row.original.lastDeliveryAt).fromNow()
              : "Nothing sent yet"}
          </span>
          {row.original.enabled && (
            <span>Behind by {formatLag(row.original.lagSeconds)}</span>
          )}
          {row.original.skippedEvents > 0 && (
            <span className={"text-red-400"}>
              {row.original.skippedEvents} events skipped
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableHeader column={column}>Created</DataTableHeader>
      ),
      sortingFn: "datetime",
      cell: ({ row }) => (
        <span className={"text-sm text-nb-gray-400"}>
          {dayjs(row.original.createdAt).format("MMM D, YYYY")}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className={"flex justify-end gap-2 pr-4"}>
          {permission.event_streaming.update && (
            <>
              <Button
                variant={"secondary"}
                className={"!px-3"}
                onClick={() => test(row.original)}
                tooltip={"Send a test event"}
              >
                <Send size={14} />
              </Button>
              {row.original.kind === "webhook" && (
                <Button
                  variant={"secondary"}
                  className={"!px-3"}
                  onClick={() => rotate(row.original)}
                  tooltip={"Rotate signing secret"}
                >
                  <KeyRound size={14} />
                </Button>
              )}
              <Button
                variant={"secondary"}
                className={"!px-3"}
                onClick={() => {
                  setEditing(row.original);
                  setFormOpen(true);
                }}
                tooltip={"Settings"}
              >
                <Settings2 size={14} />
              </Button>
            </>
          )}
          {permission.event_streaming.delete && (
            <Button
              variant={"danger-outline"}
              className={"!px-3"}
              onClick={() => remove(row.original)}
              tooltip={"Delete"}
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <EventStreamFormModal
        open={formOpen}
        stream={editing}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditing(null);
        }}
        onSaved={(signingSecret) => {
          refresh();
          if (signingSecret) setSecret(signingSecret);
        }}
      />
      <SigningSecretModal secret={secret} onClose={() => setSecret(null)} />
      <DataTable
        headingTarget={headingTarget}
        isLoading={isLoading}
        text={"Event Streams"}
        sorting={sorting}
        setSorting={setSorting}
        columns={columns}
        data={streams ?? []}
        searchPlaceholder={"Search by name or URL..."}
        getStartedCard={
          <NoResults
            className={"py-4"}
            title={"No event streams"}
            description={
              "Add a webhook or Splunk HEC destination to send your audit events and access decisions to your SIEM."
            }
            icon={<RadioTower size={20} className={"text-nb-gray-300"} />}
          />
        }
        rightSide={() =>
          permission.event_streaming.create ? (
            <Button
              variant={"primary"}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <PlusCircle size={16} />
              Add Event Stream
            </Button>
          ) : null
        }
      >
        {(table) => (
          <>
            <DataTableRowsPerPage table={table} disabled={!streams?.length} />
            <DataTableRefreshButton
              isDisabled={!streams?.length}
              onClick={refresh}
            />
          </>
        )}
      </DataTable>
    </>
  );
}
