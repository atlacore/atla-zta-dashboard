"use client";

import { reportError } from "@/contexts/SentryProvider";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div style={{ textAlign: "center", marginTop: "4rem" }}>
          <h1>Something went wrong</h1>
          <p>The team has been notified. Please reload the page.</p>
        </div>
      </body>
    </html>
  );
}
