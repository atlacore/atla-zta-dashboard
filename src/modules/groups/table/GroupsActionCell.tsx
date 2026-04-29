import Button from "@components/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import React, { useState } from "react";
import { useGroupContext } from "@/contexts/GroupProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Group } from "@/interfaces/Group";
import { EditGroupNameModal } from "@/modules/groups/EditGroupNameModal";

type Props = {
  group: Group;
};

export default function GroupsActionCell({ group }: Readonly<Props>) {
  const { permission } = usePermissions();
  const { deleteGroup, renameGroup } = useGroupContext();
  const [renameOpen, setRenameOpen] = useState(false);

  return (
    <>
      <EditGroupNameModal
        initialName={group.name}
        open={renameOpen}
        onOpenChange={setRenameOpen}
        onSuccess={(newName) =>
          renameGroup(newName).then(() => setRenameOpen(false))
        }
      />
      <div className={"flex justify-end pr-4 gap-3"}>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger
            asChild
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          >
            <Button variant={"secondary"} className={"!px-3"}>
              <MoreVertical size={16} className={"shrink-0"} />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-auto" align="end">
            {permission?.groups?.update && (
              <>
                <DropdownMenuItem onClick={() => setRenameOpen(true)}>
                  <div className="flex gap-3 items-center">
                    <Pencil size={14} className="shrink-0" />
                    Rename
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {permission?.groups?.delete && (
              <DropdownMenuItem onClick={deleteGroup} variant={"danger"}>
                <div className="flex gap-3 items-center">
                  <Trash2 size={14} className="shrink-0" />
                  Delete
                </div>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
