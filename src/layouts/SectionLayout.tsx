"use client";

import { cn } from "@utils/helpers";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

export type SectionLink = {
  label: string;
  href: string;
  icon: LucideIcon;
};

type Props = {
  sections: SectionLink[];
  children: React.ReactNode;
};

// Page layout with a secondary navigation column, shared by Settings and Integrations.
export default function SectionLayout({ sections, children }: Readonly<Props>) {
  const path = usePathname();

  return (
    <div className={"flex flex-row flex-auto min-w-0"}>
      <nav
        className={
          "hidden md:flex flex-col gap-1 w-[15rem] min-w-[15rem] shrink-0 border-r dark:border-zinc-700/40 bg-nb-gray p-3"
        }
      >
        {sections.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
              path === href
                ? "bg-nb-gray-900 text-nb-gray-100"
                : "text-nb-gray-300 hover:bg-nb-gray-920 hover:text-nb-gray-100",
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>
      <div className={"flex flex-auto min-w-0"}>{children}</div>
    </div>
  );
}
