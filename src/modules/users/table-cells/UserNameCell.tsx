import { cn, generateColorFromString } from "@utils/helpers";
import { Cog } from "lucide-react";
import React from "react";
import { User } from "@/interfaces/User";
import { useLoggedInUser } from "@/contexts/UsersProvider";

type Props = {
  user: User;
};

export default function UserNameCell({ user }: Readonly<Props>) {
  const { loggedInUser } = useLoggedInUser();
  const isCurrent = loggedInUser?.id === user.id;
  const displayName = user.displayName || user.email || user.id;

  return (
    <div
      className={cn("flex gap-4 px-2 py-1 items-center")}
      data-cy={"user-name-cell"}
    >
      <div
        className={
          "w-10 h-10 rounded-full relative flex items-center justify-center text-white uppercase text-md font-medium bg-nb-gray-900"
        }
        style={{ color: generateColorFromString(displayName) }}
      >
        {!displayName && <Cog size={12} />}
        {displayName.charAt(0)}
      </div>
      <div className={"flex flex-col justify-center"}>
        <span className={cn("text-base font-medium flex items-center gap-3")}>
          {displayName}
          {isCurrent && (
            <span
              className={
                "bg-sky-900 border border-sky-700 text-sky-200 rounded-full text-[9px] uppercase tracking-wider px-2 py-2 leading-[0]"
              }
            >
              You
            </span>
          )}
        </span>
        <span className={cn("text-sm text-nb-gray-400")}>{user.email}</span>
      </div>
    </div>
  );
}
