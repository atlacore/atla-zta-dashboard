"use client";

import InlineLink from "@components/InlineLink";
import { ModalContent, ModalFooter } from "@components/modal/Modal";
import Paragraph from "@components/Paragraph";
import SmallParagraph from "@components/SmallParagraph";
import Separator from "@components/Separator";
import TabsContentPadding, {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@components/Tabs";
import loadConfig from "@utils/config";
import { cn } from "@utils/helpers";
import {
  ExternalLinkIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  LockIcon,
  NetworkIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
} from "lucide-react";
import React from "react";
import AppleIcon from "@/assets/icons/AppleIcon";
import ShellIcon from "@/assets/icons/ShellIcon";
import useOperatingSystem from "@/hooks/useOperatingSystem";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import ClientTab from "@/modules/setup-client-modal/ClientTab";

const config = loadConfig();

type OidcUserInfo = {
  given_name?: string;
};

type Props = {
  showClose?: boolean;
  user?: OidcUserInfo;
  className?: string;
};

export default function SetupModal({
  showClose = true,
  user,
  className,
}: Readonly<Props>) {
  return (
    <ModalContent showClose={showClose} className={className}>
      <SetupModalContent user={user} />
    </ModalContent>
  );
}

type SetupModalContentProps = {
  user?: OidcUserInfo;
  header?: boolean;
  footer?: boolean;
  tabAlignment?: "center" | "start" | "end";
  title?: string;
};

// What the user gets once the client is running, in the order it happens.
const OUTCOMES = [
  {
    icon: KeyRoundIcon,
    title: "The device is enrolled",
    text: "The client creates an EC key for this device (encrypted with your passphrase, kept in your user config directory under atla/devices) and the control plane signs a certificate for it. From then on every request is signed by the device and every answer is verified against the pinned CA.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Posture is claimed",
    text: "The device facts are signed server-side and sent with the connect request, so posture-based policies can take them into account.",
  },
  {
    icon: NetworkIcon,
    title: "Access is decided and the tunnel comes up",
    text: "The policy engine checks your access to the ARN. If allowed, the client brings up an atla0 interface (WireGuard by default, REALITY with --transport reality) with routes to the resource or network.",
  },
  {
    icon: RefreshCwIcon,
    title: "It keeps the session healthy",
    text: "The client stays running: it follows a change of edge node without dropping the tunnel and reconnects from scratch if the session was revoked or the tunnel stops responding. Ctrl+C disconnects cleanly.",
  },
  {
    icon: LockIcon,
    title: "Optional kill switch",
    text: "Add --kill-switch to block all traffic outside the tunnel while connected (Linux and macOS).",
  },
  {
    icon: LayoutDashboardIcon,
    title: "Everything is visible in the dashboard",
    text: "The device appears under Devices, the live session under Peers, and the connection events under Activity. An admin can revoke the device or the session at any time.",
  },
] as const;

export function SetupModalContent({
  user,
  header = true,
  footer = true,
  tabAlignment = "center",
  title,
}: Readonly<SetupModalContentProps>) {
  const os = useOperatingSystem();
  const defaultTab =
    os === OperatingSystem.APPLE
      ? OperatingSystem.APPLE
      : OperatingSystem.LINUX;

  return (
    <>
      {header && (
        <div className={"text-center pb-5 pt-4 px-8"}>
          <h2 className={"text-3xl"}>
            {title ??
              (user?.given_name
                ? `Hello ${user.given_name}! Connect your first device`
                : "Connect with the ATLA console client")}
          </h2>
          <Paragraph className={"mt-3"}>
            Install the console client on a Linux or macOS machine and connect
            it to your resources with one command.
          </Paragraph>
        </div>
      )}

      <Tabs defaultValue={String(defaultTab)}>
        <TabsList justify={tabAlignment} className={"pt-2 px-3"}>
          <TabsTrigger value={String(OperatingSystem.LINUX)}>
            <ShellIcon
              className={
                "fill-nb-gray-500 group-data-[state=active]/trigger:fill-netbird transition-all"
              }
            />
            Linux
          </TabsTrigger>
          <TabsTrigger value={String(OperatingSystem.APPLE)}>
            <AppleIcon
              className={
                "fill-nb-gray-500 group-data-[state=active]/trigger:fill-netbird transition-all"
              }
            />
            macOS
          </TabsTrigger>
        </TabsList>

        <ClientTab os={OperatingSystem.LINUX} />
        <ClientTab os={OperatingSystem.APPLE} />
      </Tabs>

      <Separator />
      <TabsContentPadding>
        <p className={"font-medium text-base"}>What you get</p>
        <ul className={"mt-4 flex flex-col gap-4"}>
          {OUTCOMES.map(({ icon: Icon, title: outcomeTitle, text }) => (
            <li key={outcomeTitle} className={"flex gap-3"}>
              <div
                className={cn(
                  "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                  "bg-nb-gray-900 text-nb-gray-300",
                )}
              >
                <Icon size={14} />
              </div>
              <div>
                <div className={"text-sm font-medium text-nb-gray-100"}>
                  {outcomeTitle}
                </div>
                <p
                  className={"mt-0.5 text-xs leading-relaxed text-nb-gray-400"}
                >
                  {text}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </TabsContentPadding>

      {footer && (
        <ModalFooter variant={"setup"}>
          <div>
            <SmallParagraph>
              The console client runs on Unix systems today; Windows and mobile
              clients are not available yet. See{" "}
              <InlineLink
                href={`${config.docsUrl}/installation#connecting-a-device`}
                target={"_blank"}
              >
                Connecting a device
                <ExternalLinkIcon size={12} />
              </InlineLink>{" "}
              and{" "}
              <InlineLink
                href={`${config.docsUrl}/flows/connect`}
                target={"_blank"}
              >
                How it works
                <ExternalLinkIcon size={12} />
              </InlineLink>{" "}
              in the documentation.
            </SmallParagraph>
          </div>
        </ModalFooter>
      )}
    </>
  );
}
