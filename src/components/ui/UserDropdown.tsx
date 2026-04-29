"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import TextWithTooltip from "@components/ui/TextWithTooltip";
import { UserAvatar } from "@components/ui/UserAvatar";
import { KeyRound, LogOutIcon, User2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import useOSDetection from "@/hooks/useOperatingSystem";
import { Modal } from "@components/modal/Modal";
import { ChangePasswordModalContent } from "@/modules/users/ChangePasswordModal";

export default function UserDropdown() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const { loggedInUser, logout } = useLoggedInUser();
  const isMac = useOSDetection();
  const router = useRouter();

  useHotkeys("shift+mod+l", () => logout(), []);

  const displayName = loggedInUser?.displayName || loggedInUser?.email || "User";
  const email = loggedInUser?.email;

  return (
    <DropdownMenu modal={false} open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <DropdownMenuTrigger>
        <UserAvatar size="medium" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-0.5 px-1">
            <div className="text-sm font-medium leading-none dark:text-gray-300">
              <TextWithTooltip text={displayName} maxChars={20} hideTooltip={true} />
            </div>
            {email && (
              <div className="text-xs leading-none dark:text-gray-400">
                <TextWithTooltip text={email} maxChars={28} hideTooltip={true} />
              </div>
            )}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => {
            setDropdownOpen(false);
            if (loggedInUser) router.push(`/team/user?id=${loggedInUser.id}`);
          }}
        >
          <div className="flex gap-3 items-center">
            <User2 size={14} />
            Profile Settings
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => {
            setDropdownOpen(false);
            setPasswordModal(true);
          }}
        >
          <div className="flex gap-3 items-center">
            <KeyRound size={14} />
            Change Password
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={logout}>
          <div className="flex gap-3 items-center">
            <LogOutIcon size={14} />
            Log out
          </div>
          <DropdownMenuShortcut>{isMac ? "⇧⌘L" : "⇧ ⊞ L"}</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>

      <Modal open={passwordModal} onOpenChange={setPasswordModal}>
        <ChangePasswordModalContent
          onSuccess={() => setPasswordModal(false)}
        />
      </Modal>
    </DropdownMenu>
  );
}