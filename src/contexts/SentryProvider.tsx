"use client";

import loadConfig from "@utils/config";
import * as Sentry from "@sentry/nextjs";
import React, { useEffect } from "react";

const config = loadConfig();

type Props = {
  children: React.ReactNode;
};

// DSN is only known at container start (envsubst into config.json's
// placeholder, see dashboard/docker/init_react_envs.sh) - this is a static
// export with no server runtime, so Sentry.init can't happen at build time.
export default function SentryProvider({ children }: Readonly<Props>) {
  useEffect(() => {
    if (!config.sentryDsn) return;
    Sentry.init({ dsn: config.sentryDsn, tracesSampleRate: 0 });
  }, []);

  return <>{children}</>;
}

export function reportError(error: unknown) {
  if (!config.sentryDsn) return;
  Sentry.captureException(error);
}
