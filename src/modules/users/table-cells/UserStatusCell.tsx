import { cn } from "@utils/helpers";
import React from "react";
import { User } from "@/interfaces/User";

type Props = {
  user: User;
};

export default function UserStatusCell({ user }: Readonly<Props>) {
  const getStatusDisplay = () => {
    if (user.isBlocked) return { text: "Blocked", color: "bg-red-500" };
    return { text: "Active", color: "bg-green-500" };
  };

  const { text, color } = getStatusDisplay();

  return (
    <div
      className={cn("flex gap-2.5 items-center text-nb-gray-300 text-sm")}
      data-cy={"user-status-cell"}
    >
      <span className={cn("h-2 w-2 rounded-full", color)} />
      {text}
      {user.scimUserName && (
        <span
          className={
            "rounded-full border border-nb-gray-800 px-2 py-0.5 text-xs text-nb-gray-400"
          }
          title={
            "Provisioned over SCIM: the identity provider blocks, unblocks and deletes this user"
          }
        >
          SCIM
        </span>
      )}
      {user.kind === "service" && (
        <span
          className={
            "rounded-full border border-nb-gray-800 px-2 py-0.5 text-xs text-nb-gray-400"
          }
          title={
            "Service user of a setup key: its devices act as it. It cannot sign in; block or delete it to cut all of them off"
          }
        >
          Service
        </span>
      )}
    </div>
  );
}
