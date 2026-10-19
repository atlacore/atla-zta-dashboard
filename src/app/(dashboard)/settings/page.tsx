"use client";

import useRedirect from "@hooks/useRedirect";
import FullScreenLoading from "@components/ui/FullScreenLoading";

export default function SettingsIndex() {
  useRedirect("/settings/billing", true);
  return <FullScreenLoading />;
}
