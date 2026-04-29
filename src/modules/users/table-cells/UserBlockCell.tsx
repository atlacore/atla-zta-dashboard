import { notify } from "@components/Notification";
import { ToggleSwitch } from "@components/ToggleSwitch";
import { useApiCall } from "@utils/api";
import React from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { User } from "@/interfaces/User";

type Props = {
  user: User;
  isUserPage?: boolean;
};

export default function UserBlockCell({ user, isUserPage = false }: Props) {
  const userRequest = useApiCall<User>("/ui/user");
  const { mutate } = useSWRConfig();
  const { confirm } = useDialog();
  const { permission } = usePermissions();

  const isChecked = user.isBlocked;
  const disabled = user.role === "owner";

  const update = async (blocked: boolean) => {
    const name = user.displayName || user.email || "User";

    if (blocked) {
      const choice = await confirm({
        title: `Block '${name}'?`,
        description:
          "This action will immediately revoke the user's access.",
        confirmText: "Block",
        cancelText: "Cancel",
        type: "danger",
      });
      if (!choice) return;
    }

    notify({
      title: blocked ? "User blocked" : "User unblocked",
      description: name + " was successfully " + (blocked ? "blocked." : "unblocked."),
      promise: userRequest
        .patch({ isBlocked: blocked }, `/${user.id}`)
        .then(() => {
          mutate("/ui/users");
          if (isUserPage) mutate("/ui/user");
        }),
      loadingMessage: blocked ? "Blocking the user..." : "Unblocking the user...",
    });
  };

  if (disabled) return null;

  return (
    <div className={"flex"}>
      <ToggleSwitch
        disabled={!permission.users.update}
        variant={"red"}
        checked={isChecked}
        size={"small"}
        onClick={() => update(!isChecked)}
      />
    </div>
  );
}
