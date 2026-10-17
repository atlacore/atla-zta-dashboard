"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/Tooltip";
import React from "react";

type Props = {
  label: React.ReactNode;
  children: React.ReactElement;
};

// Hover label for icon-only controls (row actions): wraps the control without changing its layout.
export default function ActionTooltip({ label, children }: Readonly<Props>) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={150}>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent className={"px-3 py-1.5 text-xs"}>
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
