"use client";

import { KeyRound, MonitorSmartphone } from "lucide-react";
import React from "react";
import SectionLayout, { SectionLink } from "@/layouts/SectionLayout";

const sections: SectionLink[] = [
  {
    label: "Identity Providers",
    href: "/integrations/identity-providers",
    icon: KeyRound,
  },
  { label: "MDM", href: "/integrations/mdm", icon: MonitorSmartphone },
];

export default function IntegrationsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <SectionLayout sections={sections}>{children}</SectionLayout>;
}
