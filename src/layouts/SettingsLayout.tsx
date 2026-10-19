"use client";

import { CreditCardIcon, ReceiptTextIcon } from "lucide-react";
import React from "react";
import SectionLayout, { SectionLink } from "@/layouts/SectionLayout";

const sections: SectionLink[] = [
  { label: "Plans & Billing", href: "/settings/billing", icon: CreditCardIcon },
  { label: "Invoices", href: "/settings/invoices", icon: ReceiptTextIcon },
];

export default function SettingsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <SectionLayout sections={sections}>{children}</SectionLayout>;
}
