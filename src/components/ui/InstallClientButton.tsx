import Button from "@components/Button";
import { Modal, ModalTrigger } from "@components/modal/Modal";
import { DownloadIcon } from "lucide-react";
import React, { useState } from "react";
import SetupModal from "@/modules/setup-client-modal/SetupModal";

// Opens the ATLA console client install guide.
export function InstallClientButton() {
  const [installModal, setInstallModal] = useState(false);

  return (
    <Modal open={installModal} onOpenChange={setInstallModal}>
      <ModalTrigger asChild>
        <Button variant={"primary"}>
          <DownloadIcon size={16} />
          Install ATLA client
        </Button>
      </ModalTrigger>
      <SetupModal />
    </Modal>
  );
}
