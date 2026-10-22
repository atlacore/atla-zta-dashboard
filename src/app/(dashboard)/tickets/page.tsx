"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Button from "@components/Button";
import Badge from "@components/Badge";
import { notify } from "@components/Notification";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import { Textarea } from "@components/Textarea";
import FullScreenLoading from "@components/ui/FullScreenLoading";
import { usePortalElement } from "@hooks/usePortalElement";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import useFetchApi, { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { CheckCheck, LifeBuoy } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useState } from "react";
import { useSWRConfig } from "swr";
import AttachmentPicker, { pastedImages } from "@components/support/AttachmentPicker";
import AttachmentView from "@components/support/AttachmentView";
import { buildSupportBody, useAttachments } from "@/hooks/useAttachments";
import { useSupportStatus } from "@/hooks/useSupportEnabled";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  Ticket,
  TicketCategory,
  TicketStatus,
  TicketThread,
} from "@/interfaces/Support";
import PageContainer from "@/layouts/PageContainer";

dayjs.extend(relativeTime);

const REPLY_MAX_LENGTH = 5000;
const LIST_REFRESH_MS = 60_000;
const THREAD_REFRESH_MS = 15_000;

const STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Open",
  pending: "Pending",
  snoozed: "Snoozed",
  resolved: "Resolved",
};

const CATEGORY_LABEL: Record<TicketCategory, string> = {
  bug: "Bug",
  question: "Question",
  suggestion: "Suggestion",
};

function StatusBadge({ status }: Readonly<{ status: TicketStatus }>) {
  return (
    <Badge variant={status === "resolved" ? "green" : "yellow"} size={"xs"}>
      {STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

// ── List ──────────────────────────────────────────────────────────────────────

function TicketsTable({
  tickets,
  isLoading,
  headingTarget,
}: Readonly<{
  tickets?: Ticket[];
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
}>) {
  const { mutate } = useSWRConfig();
  const router = useRouter();
  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "atla-table-sort-tickets",
    [{ id: "updatedAt", desc: true }],
  );

  const columns: ColumnDef<Ticket>[] = [
    {
      accessorKey: "subject",
      header: ({ column }) => (
        <DataTableHeader column={column}>Subject</DataTableHeader>
      ),
      sortingFn: "text",
      cell: ({ row }) => (
        <button
          type={"button"}
          className={"text-left py-1"}
          onClick={() => router.push(`/tickets?id=${row.original.id}`)}
        >
          <p className={"flex items-baseline gap-2 text-sm"}>
            <span className={"font-mono text-xs text-nb-gray-500"}>
              #{row.original.id}
            </span>
            <span className={"font-medium text-nb-gray-100"}>
              {row.original.subject || "Untitled ticket"}
            </span>
          </p>
        </button>
      ),
    },
    {
      accessorKey: "category",
      header: ({ column }) => (
        <DataTableHeader column={column}>Category</DataTableHeader>
      ),
      sortingFn: "text",
      meta: { className: "w-[12%] whitespace-nowrap" },
      cell: ({ row }) => (
        <span className={"text-sm text-nb-gray-300"}>
          {row.original.category
            ? (CATEGORY_LABEL[row.original.category] ?? row.original.category)
            : "—"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableHeader column={column}>Status</DataTableHeader>
      ),
      sortingFn: "text",
      meta: { className: "w-[12%] whitespace-nowrap" },
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => (
        <DataTableHeader column={column}>Updated</DataTableHeader>
      ),
      sortingFn: "datetime",
      meta: { className: "w-[14%] whitespace-nowrap" },
      cell: ({ row }) => (
        <span
          className={"text-sm text-nb-gray-400"}
          title={dayjs(row.original.updatedAt).format("MMM D, YYYY HH:mm")}
        >
          {dayjs(row.original.updatedAt).fromNow()}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      headingTarget={headingTarget}
      isLoading={isLoading}
      text={"Tickets"}
      sorting={sorting}
      setSorting={setSorting}
      columns={columns}
      data={tickets ?? []}
      searchPlaceholder={"Search by subject…"}
    >
      {(table) => (
        <>
          <DataTableRowsPerPage table={table} disabled={!tickets?.length} />
          <DataTableRefreshButton
            isDisabled={!tickets?.length}
            onClick={() => mutate("/ui/support/tickets")}
          />
        </>
      )}
    </DataTable>
  );
}

function TicketsList() {
  const { data: tickets, isLoading } = useFetchApi<Ticket[]>(
    "/ui/support/tickets",
    false,
    false,
    true,
    { refreshInterval: LIST_REFRESH_MS },
  );
  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/tickets"}
            label={"Tickets"}
            icon={<LifeBuoy size={13} />}
          />
        </Breadcrumbs>
        <h1 ref={headingRef}>Tickets</h1>
        <Paragraph>
          Your conversations with support. Open a new ticket with the support
          button in the bottom-right corner.
        </Paragraph>
      </div>
      <Suspense fallback={<SkeletonTable />}>
        <TicketsTable
          headingTarget={portalTarget}
          tickets={tickets}
          isLoading={isLoading}
        />
      </Suspense>
    </PageContainer>
  );
}

// ── Detail ────────────────────────────────────────────────────────────────────

function TicketDetail({ ticketId }: Readonly<{ ticketId: string }>) {
  const { mutate } = useSWRConfig();
  const threadKey = `/ui/support/tickets/${ticketId}`;
  const { data: thread, isLoading, error } = useFetchApi<TicketThread>(
    threadKey,
    true,
    false,
    true,
    {
      // A resolved ticket cannot change from the user's side (no reopen), so it is read once.
      refreshInterval: (data?: TicketThread) =>
        data?.ticket.status === "resolved" ? 0 : THREAD_REFRESH_MS,
    },
  );
  const ticketRequest = useApiCall<unknown>(threadKey);

  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const attachments = useAttachments();

  if (isLoading) return <FullScreenLoading />;

  if (error || !thread) {
    return (
      <PageContainer>
        <div className={"p-default py-6"}>
          <h1>Ticket not found</h1>
          <Paragraph>
            This ticket does not exist or belongs to another account.
          </Paragraph>
        </div>
      </PageContainer>
    );
  }

  const { ticket, messages } = thread;
  const isResolved = ticket.status === "resolved";
  const canSend =
    (reply.trim().length > 0 || attachments.files.length > 0) && !sending;

  const refresh = () => Promise.all([mutate(threadKey), mutate("/ui/support/tickets")]);

  const send = async () => {
    setSending(true);
    try {
      await ticketRequest.post(
        buildSupportBody({ content: reply.trim() }, attachments.files),
        "/messages",
      );
      setReply("");
      attachments.clear();
      await refresh();
    } catch (error) {
      const { code, message } = (error ?? {}) as { code?: number; message?: string };
      notify({
        title: "Reply failed",
        description:
          code === 400 || code === 413
            ? (message ?? "The message was rejected.")
            : "The message was not sent. Your text is kept, try again.",
        promise: Promise.reject(new Error("send failed")),
        loadingMessage: "Sending...",
      });
    } finally {
      setSending(false);
    }
  };

  const resolve = () => {
    const promise = ticketRequest.post(undefined, "/resolve").then(refresh);
    notify({
      title: "Resolve ticket",
      description: "Ticket marked as resolved.",
      promise,
      loadingMessage: "Resolving...",
    });
  };

  return (
    <PageContainer>
      <div className={"p-default py-6 max-w-5xl"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/tickets"}
            label={"Tickets"}
            icon={<LifeBuoy size={13} />}
          />
          <Breadcrumbs.Item
            href={`/tickets?id=${ticket.id}`}
            label={`#${ticket.id}`}
            active
          />
        </Breadcrumbs>

        <h1>{ticket.subject || `Ticket #${ticket.id}`}</h1>
        <div className={"flex flex-wrap items-center gap-3 mt-3"}>
          <StatusBadge status={ticket.status} />
          {ticket.category && (
            <span className={"text-xs text-nb-gray-400"}>
              {CATEGORY_LABEL[ticket.category] ?? ticket.category}
            </span>
          )}
          <span className={"text-xs text-nb-gray-500"}>
            Opened {dayjs(ticket.createdAt).fromNow()}
          </span>
          {!isResolved && (
            <Button
              variant={"secondaryLighter"}
              size={"xs"}
              className={"ml-2"}
              onClick={resolve}
            >
              <CheckCheck size={14} />
              Resolve
            </Button>
          )}
        </div>

        <ul className={"mt-8 flex flex-col gap-3"}>
          {messages.map((message) => (
            <li
              key={message.id}
              className={cn(
                "flex flex-col max-w-[85%]",
                message.fromStaff ? "self-start" : "self-end items-end",
              )}
            >
              <span className={"text-xs text-nb-gray-500 mb-1"}>
                {message.fromStaff ? message.sender || "Support" : "You"} ·{" "}
                {dayjs(message.createdAt).fromNow()}
              </span>
              {/* Plain text on purpose: Chatwoot content can carry markup. */}
              {message.content && (
                <div
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm whitespace-pre-wrap break-words",
                    message.fromStaff
                      ? "border-nb-gray-800 bg-nb-gray-930 text-nb-gray-100"
                      : "border-nb-gray-700 bg-nb-gray-900 text-nb-gray-100",
                  )}
                >
                  {message.content}
                </div>
              )}
              {message.attachments && message.attachments.length > 0 && (
                <div
                  className={cn(
                    "mt-2 flex flex-wrap items-start gap-2",
                    !message.fromStaff && "justify-end",
                  )}
                >
                  {message.attachments.map((attachment) => (
                    <AttachmentView
                      key={attachment.id}
                      ticketId={ticket.id}
                      attachment={attachment}
                    />
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>

        {isResolved ? (
          <Paragraph className={"mt-8 text-sm"}>
            This ticket is resolved. Open a new ticket for a follow-up question.
          </Paragraph>
        ) : (
          <div className={"mt-8 flex flex-col gap-3"}>
            <Textarea
              value={reply}
              maxLength={REPLY_MAX_LENGTH}
              placeholder={"Write a reply…"}
              onChange={(event) => setReply(event.target.value)}
              onPaste={(event) => {
                const images = pastedImages(event);
                if (images.length > 0) attachments.add(images);
              }}
            />
            <AttachmentPicker
              files={attachments.files}
              error={attachments.error}
              disabled={sending}
              onAdd={attachments.add}
              onRemove={attachments.remove}
              actions={
                <Button
                  variant={"primary"}
                  size={"xs"}
                  disabled={!canSend}
                  onClick={send}
                >
                  Send reply
                </Button>
              }
            />
          </div>
        )}
      </div>
    </PageContainer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function TicketsRoute() {
  const ticketId = useSearchParams().get("id");
  const { enabled, isLoading } = useSupportStatus();

  if (isLoading) return <FullScreenLoading />;

  if (!enabled) {
    return (
      <PageContainer>
        <div className={"p-default py-6"}>
          <h1>Support is not available</h1>
          <Paragraph>
            Support has not been set up for this installation.
          </Paragraph>
        </div>
      </PageContainer>
    );
  }

  return ticketId ? <TicketDetail ticketId={ticketId} /> : <TicketsList />;
}

export default function TicketsPage() {
  return (
    <Suspense fallback={<FullScreenLoading />}>
      <TicketsRoute />
    </Suspense>
  );
}
