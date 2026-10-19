"use client";

import useRedirect from "@hooks/useRedirect";
import FullScreenLoading from "@components/ui/FullScreenLoading";

// Identity Providers moved under Integrations; keeps old bookmarks working.
export default function LegacyIdentityProvidersRedirect() {
  useRedirect("/integrations/identity-providers", true);
  return <FullScreenLoading />;
}
