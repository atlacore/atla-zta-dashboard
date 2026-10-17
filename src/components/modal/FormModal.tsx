"use client";

import { Modal, ModalContent, ModalFooter } from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import React from "react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon: React.ReactNode;
  title: React.ReactNode;
  description: React.ReactNode;
  /** Buttons for the footer, right-aligned (typically Cancel + the primary action). */
  footer: React.ReactNode;
  maxWidthClass?: string;
  children: React.ReactNode;
};

// Standard form dialog: icon header, body, and a separated footer with the actions.
export default function FormModal({
  open,
  onOpenChange,
  icon,
  title,
  description,
  footer,
  maxWidthClass = "max-w-lg",
  children,
}: Readonly<Props>) {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent maxWidthClass={maxWidthClass} className={"top-12"}>
        <ModalHeader
          icon={icon}
          title={title}
          description={description}
          color={"netbird"}
        />
        {children}
        <ModalFooter className={"items-center"}>
          <div />
          <div className={"flex gap-3"}>{footer}</div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
