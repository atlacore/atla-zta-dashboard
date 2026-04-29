import Button from "@components/Button";
import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import { Trash2 } from "lucide-react";
import * as React from "react";
import { useMemo } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { User } from "@/interfaces/User";

type Props = {
  user: User;
};

export default function UserActionCell({ user }: Readonly<Props>) {
  const { confirm } = useDialog();
  const { permission } = usePermissions();
  const { loggedInUser } = useLoggedInUser();
  const userRequest = useApiCall<User>("/ui/user");
  const { mutate } = useSWRConfig();

  const isSelf = loggedInUser?.id === user.id;

  const deleteUser = async () => {
    const name = user.displayName || user.email || user.id;
    const choice = await confirm({
      title: `Delete '${name}'?`,
      description:
        "Deleting this user will remove their dashboard access. This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      maxWidthClass: "max-w-md",
      type: "danger",
    });
    if (!choice) return;

    notify({
      title: `'${name}' deleted`,
      description: "User was successfully deleted.",
      promise: userRequest.del(undefined, `/${user.id}`).then(() => {
        mutate("/ui/users");
      }),
      loadingMessage: "Deleting the user...",
    });
  };

  const disabled = useMemo(() => {
    if (!permission.users.delete) return true;
    return isSelf;
  }, [permission.users.delete, isSelf]);

  return (
    <div className={"flex justify-end pr-4 items-center gap-2"}>
      <Button
        variant={"danger-outline"}
        size={"sm"}
        onClick={deleteUser}
        data-cy={"delete-user"}
        disabled={disabled}
      >
        <Trash2 size={16} />
        Delete
      </Button>
    </div>
  );
}
