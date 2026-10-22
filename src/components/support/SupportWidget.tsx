"use client";

import Button from "@components/Button";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { notify } from "@components/Notification";
import { Popover, PopoverContent, PopoverTrigger } from "@components/Popover";
import { Textarea } from "@components/Textarea";
import { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import { LifeBuoy, X } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import AttachmentPicker, { pastedImages } from "@components/support/AttachmentPicker";
import { buildSupportBody, useAttachments } from "@/hooks/useAttachments";
import { useSupportEnabled } from "@/hooks/useSupportEnabled";
import { NewTicket, Ticket, TicketCategory } from "@/interfaces/Support";

const SUBJECT_MAX_LENGTH = 200;
const DESCRIPTION_MAX_LENGTH = 5000;

const CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: "question", label: "Question" },
  { value: "bug", label: "Bug" },
  { value: "suggestion", label: "Suggestion" },
];

export default function SupportWidget() {
  const enabled = useSupportEnabled();
  const pathname = usePathname();
  const { mutate } = useSWRConfig();
  const ticketRequest = useApiCall<Ticket>("/ui/support/tickets", true);

  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<TicketCategory>("question");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const attachments = useAttachments();

  if (!enabled) return null;

  const canSend =
    subject.trim().length > 0 && description.trim().length > 0 && !sending;

  const submit = async () => {
    setSending(true);
    setFailure(null);
    const fields: NewTicket = {
      category,
      subject: subject.trim(),
      description: description.trim(),
      page: pathname,
    };
    try {
      const ticket = await ticketRequest.post(
        buildSupportBody({ ...fields }, attachments.files),
      );
      attachments.clear();
      setSubject("");
      setDescription("");
      setCategory("question");
      setOpen(false);
      notify({
        title: "Ticket created",
        description: `Ticket #${ticket.id} was sent to support. Follow it in Tickets.`,
        promise: Promise.resolve(ticket),
        loadingMessage: "Sending...",
      });
      mutate("/ui/support/tickets");
    } catch (error) {
      // The draft stays in the form so the user can retry; a 4xx message is ours and safe to show.
      const { code, message } = (error ?? {}) as { code?: number; message?: string };
      setFailure(
        code === 400 || code === 413
          ? (message ?? "The request was rejected.")
          : "Could not reach support. Your text is kept, try again.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={"fixed bottom-6 right-6 z-40"}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild={true}>
          <Button
            variant={"primary"}
            className={"!rounded-full h-12 w-12 !p-0 shadow-lg"}
            aria-label={"Contact support"}
          >
            {open ? <X size={20} /> : <LifeBuoy size={20} />}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side={"top"}
          align={"end"}
          sideOffset={12}
          className={"w-[24rem] max-w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto !p-4"}
        >
          <h3 className={"text-base font-medium text-nb-gray-100"}>
            Contact support
          </h3>
          <div className={"mt-4 flex flex-col gap-4"}>
            <div>
              <Label>Category</Label>
              <div className={"flex gap-2 mt-2"}>
                {CATEGORIES.map((item) => (
                  <button
                    key={item.value}
                    type={"button"}
                    onClick={() => setCategory(item.value)}
                    className={cn(
                      "flex-1 rounded-md border px-2 py-2 text-xs transition-colors",
                      category === item.value
                        ? "border-nb-gray-600 bg-nb-gray-800 text-white"
                        : "border-nb-gray-800 text-nb-gray-300 hover:bg-nb-gray-900",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Subject</Label>
              <Input
                className={"mt-2"}
                value={subject}
                maxLength={SUBJECT_MAX_LENGTH}
                placeholder={"Short summary"}
                onChange={(event) => setSubject(event.target.value)}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                className={"mt-2 min-h-[110px]"}
                value={description}
                maxLength={DESCRIPTION_MAX_LENGTH}
                placeholder={"What happened, what did you expect?"}
                onChange={(event) => setDescription(event.target.value)}
                onPaste={(event) => {
                  const images = pastedImages(event);
                  if (images.length > 0) attachments.add(images);
                }}
              />
            </div>
            <AttachmentPicker
              files={attachments.files}
              error={attachments.error}
              disabled={sending}
              onAdd={attachments.add}
              onRemove={attachments.remove}
            />
            {failure && <p className={"text-xs text-red-500"}>{failure}</p>}
            <Button
              variant={"primary"}
              disabled={!canSend}
              onClick={submit}
              className={"w-full"}
            >
              {sending ? "Sending..." : "Send"}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
