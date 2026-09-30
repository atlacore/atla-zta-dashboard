"use client";

import { cn } from "@utils/helpers";
import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { auth } from "@/utils/auth";

// The OIDC callback redirects here with the session token in the URL
// fragment (never the query string, so it never reaches server logs).

export default function OIDCCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get("token");
    if (!token) {
      setError("This sign-in link is missing its token — try signing in again");
      return;
    }
    auth.setToken(token);
    router.replace("/");
  }, [router]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-nb-gray-900/80 bg-nb-gray-930 shadow-lg ring-1 ring-white/[0.04]">
            <ShieldCheck size={26} className="text-netbird" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <p className="text-[22px] font-semibold tracking-tight text-nb-gray-100">
            Atla <span className="text-netbird">ZTA</span>
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-nb-gray-900/80 bg-nb-gray-930 shadow-2xl ring-1 ring-white/[0.03]">
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-netbird/40 to-transparent" />
          <div className="px-8 py-8 text-center">
            {error ? (
              <>
                <p className="text-[13px] leading-snug text-red-400">{error}</p>
                <a
                  href="/login"
                  className={cn(
                    "mt-4 inline-flex h-10 items-center justify-center rounded-lg px-4",
                    "bg-netbird text-sm font-medium text-white hover:bg-netbird-500",
                  )}
                >
                  Back to login
                </a>
              </>
            ) : (
              <p className="text-[13px] text-nb-gray-500">Signing you in…</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
