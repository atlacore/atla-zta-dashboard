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
import {
  ArrowUpRightIcon,
  BookOpen,
  BookText,
  CircleQuestionMark,
  LifeBuoy,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Button from "@components/Button";
import { cn } from "@utils/helpers";
import loadConfig from "@utils/config";
import { useSupportEnabled } from "@/hooks/useSupportEnabled";

const config = loadConfig();

export default function HelpAndSupportButton() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const supportEnabled = useSupportEnabled();
  const router = useRouter();

  return (
    <DropdownMenu
      modal={false}
      open={dropdownOpen}
      onOpenChange={setDropdownOpen}
    >
      <DropdownMenuTrigger asChild={true}>
        <Button
          size={"xs"}
          variant={"default-outline"}
          className={cn(
            "!rounded-full h-[38px] w-[38px] !p-0",
            dropdownOpen && "text-white",
          )}
        >
          <CircleQuestionMark size={18} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1 px-1">
            <div className="text-sm font-normal leading-none text-nb-gray-200 py-1">
              Help and Support
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {supportEnabled && (
          <DropdownMenuItem onClick={() => router.push("/help")}>
            <div className={"flex gap-3 items-center"}>
              <BookOpen size={14} />
              FAQ
            </div>
          </DropdownMenuItem>
        )}
        {supportEnabled && (
          <DropdownMenuItem onClick={() => router.push("/tickets")}>
            <div className={"flex gap-3 items-center"}>
              <LifeBuoy size={14} />
              My tickets
            </div>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          href={config.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          asChild
        >
          <div className={"flex gap-3 items-center"}>
            <BookText size={14} />
            Documentation
          </div>
          <DropdownMenuShortcut>
            <ArrowUpRightIcon size={16} />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
