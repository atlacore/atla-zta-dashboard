import Badge from "@components/Badge";
import { cn } from "@utils/helpers";
import { Cog, EyeIcon, ShieldIcon, User2 } from "lucide-react";
import React from "react";
import { Role, User } from "@/interfaces/User";

type Props = {
  user: User;
};

export default function UserRoleCell({ user }: Readonly<Props>) {
  const role = user.role;

  return (
    <div className={cn("flex gap-3 items-center text-nb-gray-200")}>
      <Badge variant={role === Role.Owner ? "netbird" : "gray"}>
        {role === Role.Owner && (
          <>
            <ShieldIcon size={14} />
            Owner
          </>
        )}
        {role === Role.Admin && (
          <>
            <Cog size={14} />
            Admin
          </>
        )}
        {role === Role.Auditor && (
          <>
            <EyeIcon size={14} />
            Auditor
          </>
        )}
        {role === Role.Member && (
          <>
            <User2 size={14} />
            Member
          </>
        )}
        {/* fallback for any unrecognized role */}
        {![Role.Owner, Role.Admin, Role.Auditor, Role.Member].includes(role as (typeof Role)[keyof typeof Role]) && (
          <>{role}</>
        )}
      </Badge>
    </div>
  );
}
