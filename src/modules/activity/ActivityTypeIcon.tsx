import { cn } from "@utils/helpers";
import {
  ArrowLeftRight,
  Blocks,
  Building2,
  Cog,
  CreditCardIcon,
  FingerprintIcon,
  FolderGit2,
  Globe,
  HelpCircleIcon,
  KeyRound,
  Layers3Icon,
  LinkIcon,
  LogIn,
  MonitorSmartphoneIcon,
  NetworkIcon,
  RefreshCcw,
  Server,
  Shield,
  ShieldCheck,
  User,
} from "lucide-react";
import React from "react";
import ReverseProxyIcon from "@/assets/icons/ReverseProxyIcon";

type Props = {
  code: string;
  size?: number;
  className?: string;
};

const DEFAULT_CLASSES = "shrink-0";

type ActivityTypeKey = keyof typeof ActivityTypeMappings;

const ActivityTypeMappings = {
  peer: MonitorSmartphoneIcon,
  user: User,
  account: Cog,
  rule: ArrowLeftRight,
  policy: Shield,
  setupkey: KeyRound,
  group: FolderGit2,
  route: NetworkIcon,
  dns: Globe,
  nameserver: Server,
  dashboard: LogIn,
  integration: Blocks,
  personal: User,
  "service.user": Cog,
  billing: CreditCardIcon,
  integrated: ShieldCheck,
  posture: ShieldCheck,
  transferred: RefreshCcw,
  resource: Layers3Icon,
  network: NetworkIcon,
  identityprovider: FingerprintIcon,
  service: ReverseProxyIcon,
  // ZTA-specific
  session: LinkIcon,
  tenant: Building2,
  sdk_key: KeyRound,
  access_policy: Shield,
  policy_rule: Shield,
  policy_revision: Shield,
  edge_node: Server,
  posture_check: ShieldCheck,
} as const;

export default function ActivityTypeIcon({
  code,
  size = 18,
  className,
}: Props) {
  const parts = code?.split(".") || [];
  const twoPartKey = parts.slice(0, 2).join(".").toLowerCase();
  const onePartKey = (parts[0] || "").toLowerCase();

  const key = (
    twoPartKey in ActivityTypeMappings ? twoPartKey : onePartKey
  ) as ActivityTypeKey;

  const Icon =
    key in ActivityTypeMappings ? ActivityTypeMappings[key] : HelpCircleIcon;

  return <Icon size={size} className={cn(DEFAULT_CLASSES, className)} />;
}
