import { cn } from "@utils/helpers";
import Image from "next/image";
import * as React from "react";
import AtlaMark from "@/assets/atla-mark.svg";

type Props = {
  size?: "default" | "large";
  /** Show only the mark on small screens. */
  mobile?: boolean;
};

const sizes = {
  default: { mark: 26, text: "text-[21px]" },
  large: { mark: 34, text: "text-[28px]" },
};

// ATLA ZTA brand: the vector hexagon mark (traced from the brand sheet) next to the product name.
export const AtlaLogo = ({ size = "default", mobile = true }: Props) => {
  const { mark, text } = sizes[size];

  return (
    <div className={cn("flex items-center gap-3", mobile && "ml-4 md:ml-0")}>
      <Image
        src={AtlaMark}
        height={mark}
        alt={"ATLA ZTA"}
        priority
        className={"w-auto shrink-0"}
        style={{ height: mark }}
      />
      <span
        className={cn(
          "font-semibold leading-none tracking-tight text-[#F2F2F2] whitespace-nowrap",
          text,
          mobile && "hidden md:inline",
        )}
      >
        ATLA <span className={"font-normal text-[#2aa4ff]"}>ZTA</span>
      </span>
    </div>
  );
};
