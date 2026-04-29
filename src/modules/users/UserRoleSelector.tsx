import Button from "@components/Button";
import { CommandItem } from "@components/Command";
import { Popover, PopoverContent, PopoverTrigger } from "@components/Popover";
import { ScrollArea } from "@components/ScrollArea";
import { Command, CommandGroup, CommandList } from "cmdk";
import { trim } from "lodash";
import { ChevronsUpDown, Cog, EyeIcon, ShieldIcon, User2 } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { useDialog } from "@/contexts/DialogProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { useElementSize } from "@/hooks/useElementSize";
import { Role, User } from "@/interfaces/User";

interface MultiSelectProps {
  value?: Role;
  onChange: (item: Role) => void;
  disabled?: boolean;
  popoverWidth?: "auto" | number;
  hideOwner?: boolean;
  currentUser?: User;
  customTrigger?: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}

export const UserRoles = [
  { name: "Owner", value: Role.Owner, icon: ShieldIcon },
  { name: "Admin", value: Role.Admin, icon: Cog },
  { name: "Auditor", value: Role.Auditor, icon: EyeIcon },
  { name: "Member", value: Role.Member, icon: User2 },
];

export function UserRoleSelector({
  onChange,
  value,
  disabled = false,
  popoverWidth = "auto",
  hideOwner = false,
  currentUser,
  customTrigger,
  side = "bottom",
  align = "start",
}: Readonly<MultiSelectProps>) {
  const [inputRef, { width }] = useElementSize<
    HTMLButtonElement | HTMLDivElement
  >();
  const { isOwner } = useLoggedInUser();
  const { confirm } = useDialog();
  const [open, setOpen] = useState(false);

  const toggle = async (item: Role) => {
    if (item === Role.Owner) {
      const ok = await confirm({
        title: "Transfer Ownership?",
        type: "warning",
        description: (
          <div className={"inline-block"}>
            This will transfer the{" "}
            <span className={"text-netbird inline font-medium"}>Owner</span>{" "}
            role to{" "}
            {currentUser ? (
              <span className={"text-netbird inline font-medium"}>
                {currentUser.displayName || currentUser.email || currentUser.id}
              </span>
            ) : (
              "this user"
            )}{" "}
            and leave you with the{" "}
            <span className={"text-netbird inline font-medium"}>Admin</span>{" "}
            role. This can only be undone if the new owner transfers it back.
          </div>
        ),
      });
      if (!ok) return;
    }

    if (value !== item) onChange(item);
    setOpen(false);
  };

  const selectedRole = UserRoles.find((r) => r.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild={true}>
        {customTrigger ? (
          <div ref={inputRef} className={"group/user-role-selector"}>
            {customTrigger}
          </div>
        ) : (
          <Button
            variant={"input"}
            disabled={disabled}
            ref={inputRef}
            className={"w-full group/user-role-selector"}
            data-cy={"user-role-selector"}
          >
            <div className={"w-full flex justify-between items-center gap-2"}>
              {selectedRole && (
                <div className={"flex items-center gap-2.5"}>
                  <selectedRole.icon size={14} />
                  <span className={"text-nb-gray-200 whitespace-nowrap text-sm font-medium"}>
                    {selectedRole.name}
                  </span>
                </div>
              )}
              <div className={"pl-2"}>
                <ChevronsUpDown size={18} className={"shrink-0"} />
              </div>
            </div>
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-full p-0 shadow-sm shadow-nb-gray-950"
        style={{ width: popoverWidth === "auto" ? width : popoverWidth }}
        align={align}
        side={side}
        sideOffset={10}
      >
        <Command
          className={"w-full flex"}
          loop
          filter={(value, search) => {
            const fv = trim(value.toLowerCase());
            const fs = trim(search.toLowerCase());
            return fv.includes(fs) ? 1 : 0;
          }}
        >
          <CommandList className={"w-full"}>
            <ScrollArea className={"max-h-[380px] overflow-y-auto flex flex-col gap-1 pl-2 py-2 pr-3"}>
              <CommandGroup>
                <div className={"grid grid-cols-1 gap-1"}>
                  {UserRoles.map((item) => {
                    if (item.value === Role.Owner && (!isOwner || hideOwner)) return null;
                    return (
                      <CommandItem
                        key={item.value}
                        value={item.value}
                        data-cy={"user-role-selector-item"}
                        className={"py-1 px-2"}
                        onSelect={() => toggle(item.value)}
                        onClick={(e) => e.preventDefault()}
                      >
                        <div className={"flex items-center gap-2.5 p-1"}>
                          <item.icon size={14} />
                          <span className={"text-sm font-medium text-nb-gray-200 whitespace-nowrap"}>
                            {item.name}
                          </span>
                        </div>
                      </CommandItem>
                    );
                  })}
                </div>
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
