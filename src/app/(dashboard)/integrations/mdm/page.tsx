"use client";

import Badge from "@components/Badge";
import Breadcrumbs from "@components/Breadcrumbs";
import { Callout } from "@components/Callout";
import Code from "@components/Code";
import Paragraph from "@components/Paragraph";
import SquareIcon from "@components/SquareIcon";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import useFetchApi from "@utils/api";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  CheckIcon,
  ClockIcon,
  HardDriveIcon,
  MonitorSmartphone,
  ShieldCheckIcon,
} from "lucide-react";
import React from "react";
import IntegrationIcon from "@/assets/icons/IntegrationIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { MDMOverview, MDMProvider } from "@/interfaces/MDM";
import PageContainer from "@/layouts/PageContainer";

dayjs.extend(relativeTime);

const CONFIG_SNIPPET = `[posture.fleet]
base_url = "https://fleet.example.com"
api_token = "<Fleet UI > My account > Get API token>"
timeout = "10s"`;

// What Fleet reports per device, see posture.Score.
const SIGNALS = [
  "OS platform and version",
  "Disk encryption",
  "MDM enrollment",
  "Online (recent check-in)",
];

// Mirrors the posture flow: on-demand seed in core/posture.go, the 5 minute posture_sync worker, the
// posture gate in pdp/policy.rego.
const HOW_IT_WORKS = [
  {
    title: "Device matching",
    text: "A device is looked up in Fleet by its ATLA device ID, so it has to match one of the device's Fleet identifiers: hostname, serial number, UUID or osquery host id.",
  },
  {
    title: "Score collection",
    text: "The score is requested from Fleet when a device connects for the first time, and refreshed every 5 minutes after that.",
  },
  {
    title: "Access decision",
    text: "A device that Fleet reports as non-compliant is denied access. A device Fleet has no score for yet is let through. Custom policies can read the same data as input.ctx.posture.ext.fleet.",
  },
  {
    title: "Active sessions",
    text: "If a connected device turns non-compliant, its session is revoked on the next refresh.",
  },
  {
    title: "If Fleet is unreachable",
    text: "The last known score is kept and the failure is reported separately. It is not treated as a non-compliant device.",
  },
];

export default function MDMPage() {
  const { permission } = usePermissions();
  const { data, error, isLoading } = useFetchApi<MDMOverview>(
    "/ui/mdm",
    true,
    false,
    permission.settings.read,
  );
  const fleet = data?.providers.find((p) => p.name === "fleet");

  return (
    <PageContainer>
      <div className={"p-default py-6 max-w-4xl"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/integrations/identity-providers"}
            label={"Integrations"}
            icon={<IntegrationIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/integrations/mdm"}
            label={"MDM"}
            icon={<MonitorSmartphone size={13} />}
            active
          />
        </Breadcrumbs>
        <h1>MDM</h1>
        <Paragraph>
          Bring device health from your MDM into access decisions. Policies can
          require, for example, an encrypted disk or an enrolled device before a
          connection is allowed.
        </Paragraph>

        <RestrictedAccess page={"MDM"} hasAccess={permission.settings.read}>
          <div className={"mt-8 flex flex-col gap-8"}>
            {error && (
              <Callout variant={"error"}>
                Could not load the MDM status. Please try again later.
              </Callout>
            )}
            <FleetCard fleet={fleet} isLoading={isLoading} />
            <HowItWorks />
            {fleet && !fleet.configured && <HowToEnable />}
          </div>
        </RestrictedAccess>
      </div>
    </PageContainer>
  );
}

function FleetCard({
  fleet,
  isLoading,
}: Readonly<{ fleet?: MDMProvider; isLoading: boolean }>) {
  return (
    <div
      className={
        "rounded-md border border-nb-gray-900 bg-nb-gray-940 overflow-hidden"
      }
    >
      <div className={"flex items-center gap-4 p-5"}>
        <SquareIcon
          color={"gray"}
          size={"large"}
          margin={"mt-0"}
          icon={<MonitorSmartphone size={20} />}
        />
        <div className={"flex-1"}>
          <div className={"text-base font-medium text-nb-gray-100"}>Fleet</div>
          <div className={"text-sm text-nb-gray-400"}>
            {fleet?.configured && fleet.baseHost
              ? fleet.baseHost
              : "Open-source device management and osquery."}
          </div>
        </div>
        {!isLoading && fleet && (
          <Badge variant={fleet.configured ? "green" : "gray"}>
            {fleet.configured ? "Connected" : "Not configured"}
          </Badge>
        )}
      </div>

      <div
        className={
          "grid grid-cols-1 gap-4 border-t border-nb-gray-900 bg-nb-gray-930/50 px-5 py-4 text-sm text-nb-gray-300 sm:grid-cols-3"
        }
      >
        <Stat
          icon={<HardDriveIcon size={16} />}
          value={fleet?.devices ?? 0}
          label={"devices with a score"}
        />
        <Stat
          icon={<ShieldCheckIcon size={16} />}
          value={fleet?.compliant ?? 0}
          label={`compliant of ${fleet?.devices ?? 0}`}
        />
        <div className={"flex items-center gap-2"}>
          <ClockIcon size={16} />
          <span>
            {fleet?.lastSyncAt
              ? `Last sync ${dayjs(fleet.lastSyncAt).fromNow()}`
              : "Not synced yet"}
          </span>
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
}: Readonly<{ icon: React.ReactNode; value: number; label: string }>) {
  return (
    <div className={"flex items-center gap-2"}>
      {icon}
      <span>
        <b className={"text-nb-gray-100"}>{value}</b> {label}
      </span>
    </div>
  );
}

function HowItWorks() {
  return (
    <div>
      <h2 className={"mb-1"}>What Fleet provides</h2>
      <ul className={"mt-3 flex flex-col gap-2 text-sm text-nb-gray-300"}>
        {SIGNALS.map((signal) => (
          <li key={signal} className={"flex items-center gap-2"}>
            <CheckIcon size={14} className={"text-netbird shrink-0"} />
            {signal}
          </li>
        ))}
      </ul>

      <h2 className={"mt-8 mb-1"}>How it works</h2>
      <ul className={"mt-3 flex flex-col gap-4"}>
        {HOW_IT_WORKS.map(({ title, text }) => (
          <li key={title}>
            <div className={"text-sm font-medium text-nb-gray-100"}>
              {title}
            </div>
            <p className={"mt-0.5 text-sm text-nb-gray-400"}>{text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HowToEnable() {
  return (
    <div>
      <h2 className={"mb-1"}>Enable Fleet</h2>
      <Paragraph>
        Fleet is connected once for the whole deployment by whoever operates the
        control plane. Add this section to its configuration and restart it,
        there is nothing to switch on here.
      </Paragraph>
      <div className={"mt-4"}>
        <Code codeToCopy={CONFIG_SNIPPET}>
          <pre className={"text-xs"}>{CONFIG_SNIPPET}</pre>
        </Code>
      </div>
    </div>
  );
}
