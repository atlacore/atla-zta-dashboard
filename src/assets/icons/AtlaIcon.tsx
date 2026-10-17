import Image from "next/image";
import * as React from "react";
import { memo } from "react";
import AtlaMark from "@/assets/atla-mark.svg";

type Props = {
  size?: number;
  className?: string;
};
function AtlaIcon({ size = 16, className }: Props) {
  return (
    <Image src={AtlaMark} alt={"ATLA ZTA"} width={size} className={className} />
  );
}

export default memo(AtlaIcon);
