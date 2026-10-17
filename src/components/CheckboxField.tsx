"use client";

import { Checkbox } from "@components/Checkbox";
import { Label } from "@components/Label";
import React, { useId } from "react";

type Props = {
  label: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: React.ReactNode;
  disabled?: boolean;
};

// Activation flag rendered as a checkbox with its label, used in forms instead of a toggle.
export default function CheckboxField({
  label,
  checked,
  onChange,
  description,
  disabled,
}: Readonly<Props>) {
  const id = useId();
  return (
    <div className={"flex items-start gap-3"}>
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onChange(value === true)}
      />
      <div>
        {/* leading-5 gives the label the checkbox's 20px height, so the first line centers on it */}
        <Label htmlFor={id} className={"mb-0 leading-5"}>
          {label}
        </Label>
        {description && (
          <p className={"mt-0.5 text-xs text-nb-gray-400"}>{description}</p>
        )}
      </div>
    </div>
  );
}
