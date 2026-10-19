"use client";

import useRedirect from "@hooks/useRedirect";
import FullScreenLoading from "@components/ui/FullScreenLoading";

export default function IntegrationsIndex() {
  useRedirect("/integrations/identity-providers", true);
  return <FullScreenLoading />;
}
