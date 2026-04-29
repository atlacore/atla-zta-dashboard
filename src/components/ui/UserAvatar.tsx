import { cn, generateColorFromUser } from "@utils/helpers";
import * as React from "react";
import { useLoggedInUser } from "@/contexts/UsersProvider";

type Props = {
  size?: "default" | "small" | "large" | "medium";
};

export const UserAvatar = ({ size = "default" }: Props) => {
  const { loggedInUser } = useLoggedInUser();

  const label =
    loggedInUser?.displayName?.charAt(0) ||
    loggedInUser?.email?.charAt(0) ||
    loggedInUser?.id?.charAt(0) ||
    "?";

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center bg-nb-gray-900 text-netbird uppercase",
        size === "small" && "w-8 h-8",
        size === "medium" && "w-[2.2rem] h-[2.2rem]",
        size === "default" && "w-10 h-10",
        size === "large" && "w-12 h-12",
      )}
      style={{ color: generateColorFromUser(loggedInUser) }}
    >
      {label}
    </div>
  );
};
