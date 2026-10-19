"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Badge from "@components/Badge";
import Button from "@components/Button";
import { Callout } from "@components/Callout";
import Paragraph from "@components/Paragraph";
import SquareIcon, { IconVariant } from "@components/SquareIcon";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import useFetchApi from "@utils/api";
import { cn } from "@utils/helpers";
import {
  CheckIcon,
  CreditCardIcon,
  LaptopIcon,
  LayersIcon,
  UserIcon,
} from "lucide-react";
import React from "react";
import SettingsIcon from "@/assets/icons/SettingsIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { BillingOverview, BillingPlan } from "@/interfaces/Billing";
import PageContainer from "@/layouts/PageContainer";
import { formatMoney } from "@/modules/settings/formatMoney";

const PERIOD_LABEL: Record<string, string> = {
  MONTHLY: "month",
  QUARTERLY: "quarter",
  BIANNUAL: "6 months",
  ANNUAL: "year",
};

type PlanView = Omit<BillingPlan, "price"> & {
  price?: number;
  // Catalog prices per currency, only known for the placeholder plans.
  prices?: Record<string, number>;
};

// Mirrors killbill/catalog.xml; shown until Kill Bill returns the live catalog.
const PLACEHOLDER_PLANS: PlanView[] = [
  {
    name: "starter-monthly",
    product: "Starter",
    billingPeriod: "MONTHLY",
    prices: { USD: 29, KGS: 2500 },
  },
  {
    name: "pro-monthly",
    product: "Pro",
    billingPeriod: "MONTHLY",
    prices: { USD: 99, KGS: 8500 },
  },
  {
    name: "enterprise-monthly",
    product: "Enterprise",
    billingPeriod: "MONTHLY",
    prices: { USD: 299, KGS: 25500 },
  },
];

// Catalog-wide rules from killbill/catalog.xml: IN_ADVANCE billing, IMMEDIATE
// change and cancel policies, evergreen phase with no trial.
const CATALOG_TERMS = [
  "Billed monthly, in advance",
  "Plan changes apply immediately",
  "Cancel anytime, effective immediately",
];

const PLAN_COLORS: IconVariant["color"][] = ["blue", "netbird", "purple"];

export default function PlansAndBilling() {
  const { permission } = usePermissions();
  const { data, error, isLoading } = useFetchApi<BillingOverview>(
    "/ui/billing",
    true,
    false,
    permission.settings.read,
  );

  return (
    <PageContainer>
      <div className={"p-default py-6 max-w-4xl"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/settings/billing"}
            label={"Settings"}
            icon={<SettingsIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/settings/billing"}
            label={"Plans & Billing"}
            icon={<CreditCardIcon size={13} />}
            active
          />
        </Breadcrumbs>
        <h1>Plans & Billing</h1>
        <Paragraph>
          Your current plan, device usage and the plans available to your
          organization.
        </Paragraph>

        <RestrictedAccess
          page={"Plans & Billing"}
          hasAccess={permission.settings.read}
        >
          <div className={"mt-8 flex flex-col gap-8"}>
            {error && (
              <Callout variant={"error"}>
                Could not load billing information. Please try again later.
              </Callout>
            )}
            {!isLoading && !error && data && !data.enabled && (
              <Callout>
                Billing is not set up for this tenant. Ask your platform
                operator to enable it.
              </Callout>
            )}
            <CurrentPlan overview={data?.enabled ? data : undefined} />
            <PlanCatalog overview={data?.enabled ? data : undefined} />
          </div>
        </RestrictedAccess>
      </div>
    </PageContainer>
  );
}

function CurrentPlan({ overview }: Readonly<{ overview?: BillingOverview }>) {
  const suspended = overview?.billingStatus === "suspended";
  const current = overview?.plans.find((p) => p.name === overview.planName);
  const title = current?.product ?? overview?.planName ?? "No active plan";

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
          icon={<UserIcon size={20} />}
        />
        <div className={"flex-1"}>
          <div className={"text-base font-medium text-nb-gray-100"}>
            {title}
          </div>
          <div className={"text-sm text-nb-gray-400"}>
            {overview
              ? "Your organization's current subscription."
              : "Plan details will appear here once billing is set up."}
          </div>
        </div>
        {overview && (
          <Badge variant={suspended ? "red" : "green"}>
            {suspended ? "Suspended" : "Active"}
          </Badge>
        )}
      </div>
      <div
        className={
          "flex items-center gap-6 border-t border-nb-gray-900 bg-nb-gray-930/50 px-5 py-4 text-sm text-nb-gray-300"
        }
      >
        <span className={"flex items-center gap-2"}>
          <LaptopIcon size={16} />
          <b className={"text-nb-gray-100"}>{overview?.deviceCount ?? 0}</b>
          {overview?.maxDevices === undefined
            ? " devices (no limit)"
            : ` of ${overview.maxDevices} devices`}
        </span>
      </div>
      {suspended && (
        <Callout variant={"warning"} className={"m-5 mt-0"}>
          Your account has overdue invoices, access is suspended until they are
          paid.
        </Callout>
      )}
    </div>
  );
}

function PlanCatalog({ overview }: Readonly<{ overview?: BillingOverview }>) {
  const plans = overview?.plans.length ? overview.plans : PLACEHOLDER_PLANS;

  return (
    <div className={"border-t border-nb-gray-900 pt-8"}>
      <h2 className={"mb-1"}>Upgrade your plan</h2>
      <Paragraph>
        Increase your device limit by moving to a bigger plan. Plan changes are
        handled by your platform operator.
      </Paragraph>
      <div className={"mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3"}>
        {plans.map((plan, index) => (
          <PlanCard
            key={plan.name}
            plan={plan}
            currency={overview?.currency}
            current={!!overview && plan.name === overview.planName}
            color={PLAN_COLORS[index % PLAN_COLORS.length]}
          />
        ))}
      </div>
    </div>
  );
}

function PlanPro({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <li className={"flex items-center gap-2"}>
      <CheckIcon size={14} className={"text-netbird shrink-0"} />
      {children}
    </li>
  );
}

function PlanCard({
  plan,
  currency,
  current,
  color,
}: Readonly<{
  plan: PlanView;
  currency?: string;
  current: boolean;
  color: IconVariant["color"];
}>) {
  const shownCurrency = currency ?? "USD";

  return (
    <div
      className={cn(
        "rounded-md border bg-nb-gray-940 p-5 flex flex-col gap-5",
        current ? "border-netbird-500/60" : "border-nb-gray-900",
      )}
    >
      <div className={"flex items-center gap-3"}>
        <SquareIcon
          color={color}
          size={"large"}
          margin={"mt-0"}
          icon={<LayersIcon size={20} />}
        />
        <div className={"text-lg font-medium text-nb-gray-100"}>
          {plan.product}
        </div>
      </div>
      <div>
        <span className={"text-3xl font-semibold text-nb-gray-100"}>
          {formatMoney(
            plan.price ?? plan.prices?.[shownCurrency] ?? 0,
            shownCurrency,
          )}
        </span>{" "}
        <span className={"text-sm text-nb-gray-400"}>
          /{" "}
          {PERIOD_LABEL[plan.billingPeriod] ?? plan.billingPeriod.toLowerCase()}
        </span>
        {plan.prices && !currency && (
          <div className={"mt-1 text-xs text-nb-gray-400"}>
            or {formatMoney(plan.prices.KGS, "KGS")}
          </div>
        )}
      </div>
      <ul className={"flex flex-col gap-2 text-sm text-nb-gray-300"}>
        {plan.deviceQuota !== undefined && (
          <PlanPro>{`Up to ${plan.deviceQuota} devices`}</PlanPro>
        )}
        {CATALOG_TERMS.map((term) => (
          <PlanPro key={term}>{term}</PlanPro>
        ))}
      </ul>
      <Button
        variant={current ? "secondary" : "primary"}
        disabled={true}
        className={"mt-auto w-full"}
        tooltip={
          current ? undefined : "Plan changes are handled by your operator"
        }
      >
        {current ? "Current plan" : `Upgrade to ${plan.product}`}
      </Button>
    </div>
  );
}
